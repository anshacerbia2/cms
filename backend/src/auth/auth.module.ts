import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { LoginRateLimiter } from './login-rate-limiter';
import { SessionService } from './session.service';
import { AuthEventsService } from './auth-events.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        // Umur token ditentukan per token oleh SessionService (sesi bergeser).
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, LoginRateLimiter, SessionService, AuthEventsService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
