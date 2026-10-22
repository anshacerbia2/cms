/**
 * Two-factor sign-in with Google Authenticator (TOTP) - after the 19 Oct 2026
 * incident, where finance@'s leaked password was used from outside.
 *
 * Runs the real AuthController, TwoFactorService, JwtService, LoginRateLimiter
 * and SecurityEvents against one in-memory user; the database, the cookie
 * session and the activity log are stubbed.
 */
import { Test } from '@nestjs/testing';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { LoginRateLimiter } from '../src/auth/login-rate-limiter';
import { SecurityEvents } from '../src/auth/security-events';
import { SessionService } from '../src/auth/session.service';
import { AuthEventsService } from '../src/auth/auth-events.service';
import { TwoFactorService } from '../src/auth/two-factor.service';
import { currentStep, totpAt } from '../src/auth/totp';
import { UsersService } from '../src/users/users.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationChannelsService } from '../src/notification-channels/notification-channels.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

const EMAIL = 'finance@example.com';
const PASSWORD = 'right-password';
const BROWSER = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

describe('Two-factor sign-in (Google Authenticator)', () => {
  let app: INestApplication;
  let user: any;
  let issued: number;
  let recorded: { event: string; detail: any }[];
  let error: jest.SpyInstance;
  let env: Record<string, string>;

  const alerts = () => error.mock.calls.map(([line]) => String(line)).filter((l) => l.startsWith('ALERT '));
  const post = (path: string, body: object) =>
    request(app.getHttpServer()).post(path).set('X-Forwarded-For', '203.0.113.7').set('User-Agent', BROWSER).send(body);
  const login = () => post('/auth/login', { email: EMAIL, password: PASSWORD });
  const codeFor = (secret: string, offset = 0) => totpAt(secret, currentStep() + offset);

  async function start() {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        LoginRateLimiter,
        SecurityEvents,
        TwoFactorService,
        { provide: JwtService, useValue: new JwtService({ secret: 'session-secret' }) },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 'session-secret', get: (k: string, d?: string) => env[k] ?? d },
        },
        {
          provide: AuthService,
          useValue: {
            validateUser: async (email: string, password: string) =>
              email === EMAIL && password === PASSWORD ? { ...user } : null,
            login: async (u: any) => ({ user: { id: u.id.toString(), email: u.email } }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findByEmail: async (email: string) => (email === EMAIL ? { ...user } : null),
            findById: async (id: number) => (BigInt(id) === user.id ? { ...user } : null),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            notificationChannel: { findMany: async () => [] },
            user: {
              findUnique: async () => ({ ...user }),
              update: async ({ data }: any) => Object.assign(user, data),
            },
            // UPDATE ... SET two_factor_last_step = step WHERE id = ... AND last_step < step
            $executeRaw: async (_sql: TemplateStringsArray, step: number) => {
              if (user.twoFactorLastStep != null && user.twoFactorLastStep >= step) return 0;
              user.twoFactorLastStep = step;
              return 1;
            },
          },
        },
        NotificationChannelsService,
        { provide: SessionService, useValue: { issue: () => issued++, readToken: () => null, clear: () => undefined } },
        {
          provide: AuthEventsService,
          useValue: {
            record: async (event: string, _req: unknown, _who: unknown, detail: any = {}) => recorded.push({ event, detail }),
            recentSignInIps: async () => ['203.0.113.20'],
          },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    (app as any).set('trust proxy', true);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  }

  beforeEach(async () => {
    process.env.NOTIFICATION_SECRET_KEY = Buffer.alloc(32, 9).toString('base64');
    env = {};
    user = { id: 6n, email: EMAIL, status: 'ACTIVE', tokenVersion: 3, twoFactorSecret: null, twoFactorEnabledAt: null, twoFactorLastStep: null };
    issued = 0;
    recorded = [];
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    await start();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
    delete process.env.NOTIFICATION_SECRET_KEY;
  });

  /** Mendaftar lewat langkah setup; mengembalikan kunci rahasianya. */
  async function enroll() {
    const first = await login().expect(200);
    await post('/auth/login/setup', { challenge: first.body.challenge, code: codeFor(first.body.secret) }).expect(200);
    return first.body.secret as string;
  }

  it('a password alone gives no session: an account without 2FA is asked to set it up', async () => {
    const res = await login().expect(200);
    expect(res.body).toEqual({
      twoFactor: 'setup',
      challenge: expect.any(String),
      secret: expect.stringMatching(/^[A-Z2-7]{32}$/),
      qrCode: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
    });
    expect(res.body.user).toBeUndefined();
    expect(issued).toBe(0);
    expect(Buffer.from(res.body.qrCode.split(',')[1], 'base64').toString()).toContain('<svg');
  });

  it('setup: a wrong code is refused, the right one enables 2FA, signs in and alerts', async () => {
    const first = await login().expect(200);
    const { challenge, secret } = first.body;

    await post('/auth/login/setup', { challenge, code: codeFor(secret, 5) }).expect(401);
    expect(user.twoFactorEnabledAt).toBeNull();
    expect(recorded.at(-1)).toEqual({ event: 'LOGIN_FAILED', detail: { reason: 'Wrong authenticator code' } });

    const done = await post('/auth/login/setup', { challenge, code: codeFor(secret) }).expect(200);
    expect(done.body.user).toEqual({ id: '6', email: EMAIL });
    expect(issued).toBe(1);
    expect(user.twoFactorEnabledAt).toBeInstanceOf(Date);
    // Tersimpan terenkripsi, bukan kunci aslinya.
    expect(user.twoFactorSecret).toMatch(/^v1:/);
    expect(user.twoFactorSecret).not.toContain(secret);
    expect(recorded.map((r) => r.event)).toEqual(['LOGIN_FAILED', 'TWO_FACTOR_ENABLED', 'LOGIN']);
    expect(alerts()).toEqual([expect.stringContaining(`${EMAIL} set up Google Authenticator from IP 203.0.113.7`)]);
  });

  it('verify: an enrolled account needs the current code, and a code works only once', async () => {
    const secret = await enroll();
    issued = 0;

    const first = await login().expect(200);
    expect(first.body).toEqual({ twoFactor: 'verify', challenge: expect.any(String) });
    expect(issued).toBe(0);

    // Kode yang sama dengan saat mendaftar sudah terpakai.
    await post('/auth/login/verify', { challenge: first.body.challenge, code: codeFor(secret) }).expect(401);
    // Kode langkah berikutnya (jam HP sedikit di depan) diterima - sekali.
    const next = codeFor(secret, 1);
    await post('/auth/login/verify', { challenge: first.body.challenge, code: next.slice(0, 3) + ' ' + next.slice(3) }).expect(200);
    expect(issued).toBe(1);

    const again = await login().expect(200);
    const replay = await post('/auth/login/verify', { challenge: again.body.challenge, code: next }).expect(401);
    expect(replay.body.message).toBe('The code is incorrect or has already been used.');
    expect(issued).toBe(1);
  });

  it('ten wrong codes lock the account and alert, like ten wrong passwords', async () => {
    await enroll();
    const first = await login().expect(200);
    for (let i = 0; i < 10; i++) {
      await post('/auth/login/verify', { challenge: first.body.challenge, code: '000000' }).expect(401);
    }
    await post('/auth/login/verify', { challenge: first.body.challenge, code: '000000' }).expect(429);
    await login().expect(429);
    expect(alerts()).toEqual([
      expect.stringContaining('set up Google Authenticator'),
      expect.stringContaining(`login for ${EMAIL} locked after 10 failed attempts`),
    ]);
  });

  it('a challenge only works for its own step, its own account version, and cannot be forged', async () => {
    const setup = await login().expect(200);
    await post('/auth/login/verify', { challenge: setup.body.challenge, code: '123456' }).expect(401);

    const forged = new JwtService({ secret: 'session-secret' }).sign({ sub: '6', email: EMAIL, tv: 3, purpose: 'setup', secret: 'A'.repeat(32) });
    await post('/auth/login/setup', { challenge: forged, code: totpAt('A'.repeat(32), currentStep()) }).expect(401);

    // Logout di perangkat lain / ganti password sesudah password diterima.
    user.tokenVersion = 4;
    await post('/auth/login/setup', { challenge: setup.body.challenge, code: codeFor(setup.body.secret) }).expect(401);
    expect(user.twoFactorEnabledAt).toBeNull();
    expect(issued).toBe(0);
  });

  it('a second QR cannot replace an authenticator that was already set up', async () => {
    const stale = await login().expect(200);
    await enroll();
    await post('/auth/login/setup', { challenge: stale.body.challenge, code: codeFor(stale.body.secret) }).expect(401);
  });

  it('rejects malformed codes before touching anything', async () => {
    const first = await login().expect(200);
    await post('/auth/login/setup', { challenge: first.body.challenge, code: '12345' }).expect(400);
    await post('/auth/login/setup', { challenge: 'not-a-jwt', code: '123456' }).expect(400);
  });

  it('with TWO_FACTOR_REQUIRED=0, an account without 2FA signs in with its password only', async () => {
    await app.close();
    env = { TWO_FACTOR_REQUIRED: '0' };
    await start();
    const res = await login().expect(200);
    expect(res.body.user).toEqual({ id: '6', email: EMAIL });
    expect(issued).toBe(1);
  });

  it('with TWO_FACTOR_REQUIRED=0, an account that has 2FA still needs its code', async () => {
    await enroll();
    await app.close();
    env = { TWO_FACTOR_REQUIRED: '0' };
    await start();
    issued = 0;
    expect((await login().expect(200)).body.twoFactor).toBe('verify');
    expect(issued).toBe(0);
  });
});
