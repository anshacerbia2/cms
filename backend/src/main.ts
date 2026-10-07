import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { randomUUID } from 'crypto';
import { auditContext } from './common/audit/audit-context';
import { AuditUserInterceptor } from './common/audit/audit-user.interceptor';
 
// BigInt & Decimal Serialization Fix
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// Handle Prisma Decimal serialization
try {
  const Decimal = require('decimal.js');
  Decimal.prototype.toJSON = function () {
    return this.toNumber();
  };
} catch (e) {
  // decimal.js might not be directly available, handled in interceptor
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // nginx di mesin yang sama meneruskan request; percayai X-Forwarded-For hanya
  // dari loopback, supaya req.ip adalah IP pengguna dan bukan 127.0.0.1 (dipakai
  // pembatas login per IP). Tanpa header itu req.ip tetap 127.0.0.1.
  app.set('trust proxy', 'loopback');
  // Jangan umumkan framework-nya (pentest F-08).
  app.disable('x-powered-by');

  // Konteks activity log untuk setiap request: id request dulu, user-nya
  // menyusul lewat AuditUserInterceptor sesudah guard JWT. Harus dipasang
  // sebelum apa pun menyentuh database.
  app.use((_req: any, _res: any, next: () => void) => auditContext.run({ requestId: randomUUID() }, next));

  // CSRF: sesi ada di cookie (SameSite=Strict), dan setiap request yang
  // mengubah data wajib membawa header X-Requested-With. Form atau gambar dari
  // situs lain tidak bisa memasang header itu, dan fetch lintas origin yang
  // memasangnya tertahan preflight CORS.
  // Pengecualiannya hanya laporan CSP dari browser, yang tidak membawa header
  // itu dan tidak mengubah apa pun.
  app.use((req: any, res: any, next: () => void) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.headers['x-requested-with']) return next();
    if (req.method === 'POST' && req.path === '/api/csp-report') return next();
    new Logger('HTTP').warn(`${req.method} ${req.originalUrl} 403 - missing X-Requested-With`);
    res.status(403).json({ statusCode: 403, message: 'Request rejected: missing X-Requested-With header.' });
  });

  // Parser JSON-nya ditulis ulang supaya juga membaca laporan CSP, yang datang
  // dengan content-type sendiri. Ini MENGGANTI parser bawaan, jadi
  // application/json dan batas bawaan 100kb harus tetap disebut.
  app.useBodyParser('json', {
    type: ['application/json', 'application/csp-report', 'application/reports+json'],
    limit: '100kb',
  });

  // Global Prefix
  app.setGlobalPrefix('api');

  // Global Pipes - Class Validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global Filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global Interceptors
  app.useGlobalInterceptors(new AuditUserInterceptor());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // CORS: hanya frontend sendiri (pentest F-02). Sesi dikirim sebagai cookie,
  // jadi credentials diizinkan - dan karena itu origin-nya wajib daftar tetap,
  // tidak boleh `*`.
  //
  // Fail closed (pentest N-07): defaultnya daftar tetap production, apa pun
  // NODE_ENV-nya. Memantulkan origin pemanggil (true) HANYA kalau diminta
  // eksplisit lewat CORS_DEV_REFLECT=1 - supaya NODE_ENV yang hilang di server
  // tidak pernah diam-diam melebarkan CORS ke semua situs. Untuk dev, set
  // CORS_DEV_REFLECT=1 (atau sebut origin-nya di CORS_ORIGINS).
  const DEFAULT_ORIGINS = ['https://pcmi-admin.online', 'https://www.pcmi-admin.online'];
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const reflectAnyOrigin = process.env.CORS_DEV_REFLECT === '1';
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : reflectAnyOrigin ? true : DEFAULT_ORIGINS,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  // Loopback only: nginx proxies from localhost, so nothing needs to reach this
  // port over eth0. Binding 0.0.0.0 exposed the API directly over plain HTTP,
  // bypassing the TLS the reverse proxy terminates.
  //
  // pentest N-08: the key in .env is APP_HOST; accept either APP_HOST or HOST so
  // the documented key actually takes effect, and keep the loopback default.
  // Leave this at 127.0.0.1 in production - the API must stay behind nginx.
  //
  // "localhost" is pinned to 127.0.0.1: Node resolves it to ::1 first on this
  // server (/etc/hosts lists both), so the API would listen on IPv6 only while
  // nginx proxies to 127.0.0.1:3000 - and every request would fail. The prod
  // and dev .env files both carry APP_HOST=localhost.
  const configuredHost = process.env.APP_HOST || process.env.HOST || '127.0.0.1';
  const host = configuredHost.toLowerCase() === 'localhost' ? '127.0.0.1' : configuredHost;
  await app.listen(port, host);
  console.log(`Application is running on ${host}:${port}`);
}
bootstrap();
