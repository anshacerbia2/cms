/**
 * Settings > Notification Channels: where security alerts go.
 *
 * Runs the real controller, service, ValidationPipe and exception filter over
 * an in-memory table (no database), with the permission guard opened and fetch
 * mocked. Checks that credentials are validated, stored encrypted, never sent
 * back to the browser, kept when an edit leaves them blank, and never leaked by
 * a failed test message.
 */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationChannelsController } from '../src/notification-channels/notification-channels.controller';
import { NotificationChannelsService } from '../src/notification-channels/notification-channels.service';
import { decryptSecret } from '../src/notification-channels/notification-secret';

const BOT_TOKEN = '123456789:AAtest-bot-token-0123456789abcdefghijk';
const WEBHOOK_URL = 'https://chat.googleapis.com/v1/spaces/AAAAspace/messages?key=key-abcd&token=secret-token';

describe('Notification channels', () => {
  let app: INestApplication;
  let rows: any[];
  let fetchMock: jest.Mock;

  const prismaStub = {
    notificationChannel: {
      findMany: async ({ where }: any = {}) => rows.filter((r) => !where?.isActive || r.isActive),
      findUnique: async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null,
      create: async ({ data }: any) => {
        const row = { id: BigInt(rows.length + 1), createdAt: new Date(), updatedAt: new Date(), ...data };
        rows.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = rows.find((r) => r.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
      delete: async ({ where }: any) => {
        rows = rows.filter((r) => r.id !== where.id);
      },
    },
  };

  const http = () => request(app.getHttpServer());
  const telegram = { type: 'TELEGRAM', name: 'IT group', telegramBotToken: BOT_TOKEN, telegramChatId: '-1001234567890' };

  beforeEach(async () => {
    rows = [];
    process.env.NOTIFICATION_SECRET_KEY = Buffer.alloc(32, 9).toString('base64');
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as any;

    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationChannelsController],
      providers: [NotificationChannelsService, { provide: PrismaService, useValue: prismaStub }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (ctx: any) => ((ctx.switchToHttp().getRequest().user = { email: 'admin@pcmi.com' }), true) })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
    delete process.env.NOTIFICATION_SECRET_KEY;
  });

  it('stores credentials encrypted and never returns them', async () => {
    const res = await http().post('/notification-channels').send(telegram).expect(201);
    expect(res.body).toEqual(expect.objectContaining({ type: 'TELEGRAM', name: 'IT group', isActive: true }));
    expect(res.body.hint).toBe('chat -1001234567890 · bot ••••hijk');
    expect(JSON.stringify(res.body)).not.toContain(BOT_TOKEN);
    expect(res.body.secret).toBeUndefined();

    expect(rows[0].secret).toMatch(/^v1:/);
    expect(rows[0].secret).not.toContain(BOT_TOKEN);
    expect(decryptSecret(rows[0].secret)).toEqual({ botToken: BOT_TOKEN, chatId: '-1001234567890' });

    const list = await http().get('/notification-channels').expect(200);
    expect(JSON.stringify(list.body)).not.toContain(BOT_TOKEN);
  });

  it('validates credentials per type', async () => {
    await http().post('/notification-channels').send({ ...telegram, telegramBotToken: 'not-a-token' }).expect(400);
    await http().post('/notification-channels').send({ type: 'TELEGRAM', name: 'x', telegramBotToken: BOT_TOKEN }).expect(400);
    await http()
      .post('/notification-channels')
      .send({ type: 'GOOGLE_CHAT', name: 'x', googleChatWebhookUrl: 'https://evil.example/hook?key=1' })
      .expect(400);
    await http()
      .post('/notification-channels')
      .send({ type: 'GOOGLE_CHAT', name: 'x', googleChatWebhookUrl: WEBHOOK_URL, telegramChatId: '-100123' })
      .expect(400);
    const ok = await http()
      .post('/notification-channels')
      .send({ type: 'GOOGLE_CHAT', name: 'Ops', googleChatWebhookUrl: WEBHOOK_URL })
      .expect(201);
    expect(ok.body.hint).toBe('space AAAAspace · key ••••abcd');
    expect(rows).toHaveLength(1);
  });

  it('keeps the stored token when an edit leaves it blank', async () => {
    await http().post('/notification-channels').send(telegram).expect(201);
    await http().patch('/notification-channels/1').send({ telegramChatId: '@pcmi_alerts', name: 'Renamed' }).expect(200);
    expect(decryptSecret(rows[0].secret)).toEqual({ botToken: BOT_TOKEN, chatId: '@pcmi_alerts' });
    expect(rows[0].name).toBe('Renamed');
    await http().patch('/notification-channels/1').send({ type: 'GOOGLE_CHAT' }).expect(400);
  });

  it('sends a test message, and reports a failure without the credentials', async () => {
    await http().post('/notification-channels').send(telegram).expect(201);
    await http().post('/notification-channels/1/test').expect(201);
    expect(fetchMock).toHaveBeenCalledWith(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, expect.anything());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({ chat_id: '-1001234567890', text: expect.stringContaining('admin@pcmi.com') }),
    );

    fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ description: 'Bad Request: chat not found' }) });
    const failed = await http().post('/notification-channels/1/test').expect(502);
    expect(failed.body.message).toBe('The message was not delivered: HTTP 400: Bad Request: chat not found');

    fetchMock.mockRejectedValue(new Error(`request to https://api.telegram.org/bot${BOT_TOKEN}/sendMessage failed`));
    const down = await http().post('/notification-channels/1/test').expect(502);
    expect(down.body.message).toBe('The message was not delivered: Could not reach the service.');
    expect(JSON.stringify(down.body)).not.toContain(BOT_TOKEN);
  });

  it('broadcasts only to active channels, and picks up changes at once', async () => {
    const service = app.get(NotificationChannelsService);
    await http().post('/notification-channels').send(telegram).expect(201);
    await http()
      .post('/notification-channels')
      .send({ type: 'GOOGLE_CHAT', name: 'Ops', googleChatWebhookUrl: WEBHOOK_URL, isActive: false })
      .expect(201);

    await service.broadcast('hello');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await http().patch('/notification-channels/2').send({ isActive: true }).expect(200);
    fetchMock.mockClear();
    await service.broadcast('hello');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refuses to save without an encryption key on the server', async () => {
    delete process.env.NOTIFICATION_SECRET_KEY;
    const res = await http().post('/notification-channels').send(telegram).expect(400);
    expect(res.body.message).toBe('NOTIFICATION_SECRET_KEY is not set on the server.');
    expect(rows).toHaveLength(0);
  });
});
