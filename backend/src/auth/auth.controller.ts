import { Controller, Post, Patch, Body, UnauthorizedException, Get, UseGuards, Req, Res, HttpCode } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ChangeOwnPasswordDto } from './dto/change-own-password.dto';
import { LoginDto } from './dto/login.dto';
import { LoginRateLimiter } from './login-rate-limiter';
import { SessionService, type SessionPayload } from './session.service';
import { AuthEventsService } from './auth-events.service';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private loginLimiter: LoginRateLimiter,
    private session: SessionService,
    private events: AuthEventsService,
    private jwt: JwtService,
  ) {}

  /** Login: sesi dikirim sebagai cookie HttpOnly; body hanya berisi profil user. */
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Dibatasi per email (percobaan gagal) dan per IP - lihat LoginRateLimiter.
    this.loginLimiter.check(req.ip ?? 'unknown', body.email);
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      const locked = this.loginLimiter.recordFailure(body.email);
      const account = await this.usersService.findByEmail(body.email);
      await this.events.record(locked ? 'LOGIN_LOCKED' : 'LOGIN_FAILED', req, {
        email: body.email,
        accountId: account?.id ?? null,
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    this.loginLimiter.recordSuccess(body.email);
    this.session.issue(req, res, user);
    await this.events.record('LOGIN', req, { email: user.email, accountId: user.id, signedIn: true });
    return this.authService.login(user);
  }

  /**
   * Logout: token akun ini dicabut di server, lalu cookie-nya dihapus. Tidak
   * memakai guard supaya cookie tetap terhapus walaupun sesinya sudah habis.
   */
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = this.session.readToken(req);
    if (token) {
      let payload: SessionPayload | null = null;
      try {
        payload = this.jwt.verify<SessionPayload>(token);
      } catch {
        // Token kedaluwarsa atau rusak: tidak ada yang perlu dicabut.
      }
      if (payload) {
        await this.authService.logout(payload.sub);
        await this.events.record('LOGOUT', req, { email: payload.email, accountId: payload.sub, signedIn: true });
      }
    }
    this.session.clear(req, res);
    return { message: 'Signed out' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: any) {
    return req.user;
  }

  /**
   * Ganti password akun sendiri. Tidak butuh permission apa pun selain login -
   * user view-only juga harus bisa mengganti password yang dibuatkan admin.
   *
   * Semua sesi akun ini dicabut; sesi yang sedang dipakai diberi cookie baru
   * supaya tetap masuk.
   */
  @UseGuards(JwtAuthGuard)
  @Patch('password')
  async changeOwnPassword(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: ChangeOwnPasswordDto,
  ) {
    const fresh = await this.authService.changeOwnPassword(req.user.userId, dto.currentPassword, dto.newPassword);
    this.session.issue(req, res, fresh);
    return { message: 'Password updated successfully' };
  }
}
