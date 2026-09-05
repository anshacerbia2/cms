import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
 
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
  const app = await NestFactory.create(AppModule);

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
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // CORS
  app.enableCors();

  const port = process.env.PORT || 3000;
  // Loopback only: nginx proxies from localhost, so nothing needs to reach this
  // port over eth0. Binding 0.0.0.0 exposed the API directly over plain HTTP,
  // bypassing the TLS the reverse proxy terminates.
  const host = process.env.HOST || '127.0.0.1';
  await app.listen(port, host);
  console.log(`Application is running on ${host}:${port}`);
}
bootstrap();
