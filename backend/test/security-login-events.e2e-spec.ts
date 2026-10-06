/**
 * Pentest retest 2026-10-02, finding N-04 (failed logins logged without IP or
 * email, and nobody alerted).
 *
 * Runs the real AuthController, LoginRateLimiter, SecurityEvents, ValidationPipe
 * and exception filter; AuthService is stubbed so no database is needed. Checks
 * that every failure, lockout and throttle is logged as one JSON line with IP
 * and email, that lockouts raise an alert once, and that the alert reaches every
 * active notification channel (Google Chat and Telegram) without leaking their
 * credentials.
 *
 * The cookie session and the activity-log sign-in records are stubbed; they are
 * not what this suite checks.
 */
import { Test } from '@nestjs/testing';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { LoginRateLimiter } from '../src/auth/login-rate-limiter';
import { SecurityEvents } from '../src/auth/security-events';
import { SessionService } from '../src/auth/session.service';
import { AuthEventsService } from '../src/auth/auth-events.service';
import { UsersService } from '../src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationChannelsService } from '../src/notification-channels/notification-channels.service';
import { encryptSecret } from '../src/notification-channels/notification-secret';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

const GOOD = { email: 'admin@pcmi.com', password: 'right-password' };
const WEBHOOK_URL = 'https://chat.googleapis.com/v1/spaces/TEST/messages?key=test-key&token=test-token';
const BOT_TOKEN = '123456789:AAtest-bot-token-0123456789abcdefghijk';
const TELEGRAM_URL = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

describe('Login security events (N-04)', () => {
  let app: INestApplication;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;
  let fetchMock: jest.Mock;

  const events = () =>
    warn.mock.calls
      .map(([line]) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((e) => e?.event);
  const alerts = () => error.mock.calls.map(([line]) => String(line)).filter((l) => l.startsWith('ALERT '));

  const login = (email: string, password = 'wrong', ip = '203.0.113.7') =>
    request(app.getHttpServer()).post('/auth/login').set('X-Forwarded-For', ip).send({ email, password });

  beforeEach(async () => {
    process.env.NOTIFICATION_SECRET_KEY = Buffer.alloc(32, 7).toString('base64');
    // Dua channel aktif, tersimpan terenkripsi seperti di database.
    const channels = [
      { id: 1n, type: 'GOOGLE_CHAT', name: 'Ops chat', isActive: true, secret: encryptSecret({ webhookUrl: WEBHOOK_URL }) },
      { id: 2n, type: 'TELEGRAM', name: 'Ops telegram', isActive: true, secret: encryptSecret({ botToken: BOT_TOKEN, chatId: '-1001234567890' }) },
    ];
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as any;
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        LoginRateLimiter,
        SecurityEvents,
        {
          provide: AuthService,
          useValue: {
            validateUser: async (email: string, password: string) =>
              email === GOOD.email && password === GOOD.password ? { id: 1, email } : null,
            login: async (user: any) => ({ user }),
          },
        },
        // Sesi cookie dan catatan sign-in di activity log tidak diuji di sini.
        { provide: UsersService, useValue: { findByEmail: async () => null } },
        { provide: SessionService, useValue: { issue: () => undefined, readToken: () => null, clear: () => undefined } },
        { provide: AuthEventsService, useValue: { record: async () => undefined } },
        { provide: JwtService, useValue: { verify: () => ({}) } },
        NotificationChannelsService,
        { provide: PrismaService, useValue: { notificationChannel: { findMany: async () => channels } } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    (app as any).set('trust proxy', true);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
    delete process.env.NOTIFICATION_SECRET_KEY;
  });

  it('logs a failed login with IP and email, without alerting', async () => {
    await login('Someone@Example.com').expect(401);
    expect(events()).toEqual([
      expect.objectContaining({ event: 'login_failed', ip: '203.0.113.7', email: 'someone@example.com', failures: 1 }),
    ]);
    expect(alerts()).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('logs and alerts once when an email gets locked, then logs blocked attempts', async () => {
    for (let i = 0; i < 10; i++) await login('victim@example.com').expect(401);
    await login('victim@example.com').expect(429);
    await login('victim@example.com').expect(429);

    const kinds = events().map((e) => e.event);
    expect(kinds.filter((k) => k === 'login_failed')).toHaveLength(10);
    expect(kinds.filter((k) => k === 'login_locked')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'login_blocked')).toHaveLength(2);
    expect(events().find((e) => e.event === 'login_locked')).toEqual(
      expect.objectContaining({ ip: '203.0.113.7', email: 'victim@example.com', failures: 10 }),
    );

    expect(alerts()).toEqual([expect.stringContaining('victim@example.com locked after 10 failed attempts')]);
    await new Promise((resolve) => setImmediate(resolve));
    // Satu pesan ke setiap channel aktif.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const byUrl = Object.fromEntries(fetchMock.mock.calls.map(([url, init]) => [url, JSON.parse(init.body)]));
    expect(byUrl[WEBHOOK_URL]).toEqual({ text: expect.stringContaining('victim@example.com') });
    expect(byUrl[TELEGRAM_URL]).toEqual(
      expect.objectContaining({ chat_id: '-1001234567890', text: expect.stringContaining('victim@example.com') }),
    );
  });

  it('alerts once when an IP exceeds the per-minute limit', async () => {
    for (let i = 0; i < 30; i++) await login(`user${i}@example.com`, 'wrong', '198.51.100.9').expect(401);
    await login('user30@example.com', 'wrong', '198.51.100.9').expect(429);
    await login('user31@example.com', 'wrong', '198.51.100.9').expect(429);

    expect(events().filter((e) => e.event === 'login_ip_throttled')).toHaveLength(2);
    expect(alerts()).toEqual([expect.stringContaining('IP 198.51.100.9 exceeded the login attempt limit')]);
    await new Promise((resolve) => setImmediate(resolve));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('still answers the login when the alert channel is down', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    for (let i = 0; i < 10; i++) await login('victim@example.com').expect(401);
    await login('victim@example.com').expect(429);
    expect(alerts()).toHaveLength(1);
    await new Promise((resolve) => setImmediate(resolve));
    const logged = error.mock.calls.map(([line]) => String(line));
    expect(logged).toContain('Alert to "Ops chat" (GOOGLE_CHAT) failed: Could not reach the service.');
    expect(logged).toContain('Alert to "Ops telegram" (TELEGRAM) failed: Could not reach the service.');
    // Kredensial tidak pernah masuk log, juga saat gagal.
    expect(logged.join('\n')).not.toContain('test-token');
    expect(logged.join('\n')).not.toContain(BOT_TOKEN);
  });

  it('a correct login is not logged as a security event', async () => {
    await login(GOOD.email, GOOD.password).expect(200);
    expect(events()).toHaveLength(0);
  });
});
