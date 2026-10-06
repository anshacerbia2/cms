import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
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

  // CORS: hanya frontend sendiri (pentest F-02). Token dikirim lewat header
  // Bearer, bukan cookie, jadi `*` tidak langsung bisa dieksploitasi - tapi tak
  // ada alasan origin lain boleh memanggil API ini. CORS_ORIGINS (dipisah koma)
  // menimpa daftar bawaan; di luar production semua origin diizinkan supaya
  // Vite dev server di localhost tetap jalan.
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length
      ? corsOrigins
      : process.env.NODE_ENV === 'production'
        ? ['https://pcmi-admin.online', 'https://www.pcmi-admin.online']
        : true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: false,
  });

  const port = process.env.PORT || 3000;
  // Loopback only: nginx proxies from localhost, so nothing needs to reach this
  // port over eth0. Binding 0.0.0.0 exposed the API directly over plain HTTP,
  // bypassing the TLS the reverse proxy terminates.
  const host = process.env.HOST || '127.0.0.1';
  await app.listen(port, host);
  console.log(`Application is running on ${host}:${port}`);
}
bootstrap();
