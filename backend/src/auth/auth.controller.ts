import {
  Controller,
  Post,
  Patch,
  Body,
  UnauthorizedException,
  ForbiddenException,
  Get,
  UseGuards,
  Req,
  Res,
  HttpCode,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ChangeOwnPasswordDto } from './dto/change-own-password.dto';
import { LoginDto } from './dto/login.dto';
import { LoginCodeDto } from './dto/login-code.dto';
import { LoginRateLimiter } from './login-rate-limiter';
import { SessionService, type SessionPayload } from './session.service';
import { AuthEventsService } from './auth-events.service';
import { UsersService } from '../users/users.service';
import { SecurityEvents } from './security-events';
import { TwoFactorService, type LoginChallenge } from './two-factor.service';
import { isNewNetwork, isNonBrowserAgent } from './sign-in-risk';

const userAgentOf = (req: Request) => String(req.headers['user-agent'] ?? '').slice(0, 300);

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private loginLimiter: LoginRateLimiter,
    private session: SessionService,
    private events: AuthEventsService,
    private jwt: JwtService,
    private twoFactor: TwoFactorService,
    private security: SecurityEvents,
  ) {}

  /**
   * Login langkah pertama: email dan password.
   *
   * Sesi baru diberikan sesudah kode Google Authenticator (lihat
   * TwoFactorService). Kalau 2FA tidak diwajibkan (TWO_FACTOR_REQUIRED=0) dan
   * akunnya belum mendaftar, sesi langsung dipasang di sini seperti dulu:
   * cookie HttpOnly, body hanya berisi profil user.
   */
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Dibatasi per email (percobaan gagal) dan per IP - lihat LoginRateLimiter.
    const ip = req.ip ?? 'unknown';
    this.loginLimiter.check(ip, body.email);
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      const locked = this.loginLimiter.recordFailure(ip, body.email);
      const account = await this.usersService.findByEmail(body.email);
      await this.events.record(locked ? 'LOGIN_LOCKED' : 'LOGIN_FAILED', req, {
        email: body.email,
        accountId: account?.id ?? null,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Akun nonaktif ditolak di sini, bukan sesudah cookie dipasang: dulu login
    // "berhasil" lalu setiap request ditolak 401, dan user-nya terus mengulang
    // login. Statusnya hanya terungkap kepada yang tahu password-nya.
    if (user.status !== 'ACTIVE') {
      this.security.record('login_inactive', { ip, email: user.email, status: user.status, userAgent: userAgentOf(req) });
      await this.events.record('LOGIN_FAILED', req, { email: user.email, accountId: user.id }, {
        reason: `Account is ${user.status}`,
      });
      throw new ForbiddenException('This account is not active. Contact your administrator.');
    }

    if (this.twoFactor.isEnabled(user)) {
      return { twoFactor: 'verify', challenge: this.twoFactor.issueChallenge(user, 'verify') };
    }
    if (this.twoFactor.required) {
      const enrollment = await this.twoFactor.newEnrollment(user.email);
      return {
        twoFactor: 'setup',
        challenge: this.twoFactor.issueChallenge(user, 'setup', enrollment.secret),
        secret: enrollment.secret,
        qrCode: enrollment.qrCode,
      };
    }
    return this.completeLogin(req, res, user);
  }

  /** Login langkah kedua: kode dari Google Authenticator yang sudah terdaftar. */
  @Post('login/verify')
  @HttpCode(200)
  async verifyCode(@Body() body: LoginCodeDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = await this.challengeUser(this.twoFactor.readChallenge(body.challenge, 'verify'), req);
    if (!(await this.twoFactor.verifyLogin(user.id, body.code))) await this.rejectCode(req, user);
    return this.completeLogin(req, res, user);
  }

  /** Login langkah kedua untuk akun yang baru mendaftarkan Google Authenticator. */
  @Post('login/setup')
  @HttpCode(200)
  async setupCode(@Body() body: LoginCodeDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const challenge = this.twoFactor.readChallenge(body.challenge, 'setup');
    const user = await this.challengeUser(challenge, req);
    // Sudah didaftarkan dari tempat lain sejak QR ini dibuat: jangan ditimpa.
    if (this.twoFactor.isEnabled(user) || !challenge.secret) {
      throw new UnauthorizedException('This sign-in step has expired. Please sign in again.');
    }
    if (!(await this.twoFactor.enable(user.id, challenge.secret, body.code))) await this.rejectCode(req, user);

    // Penyerang yang tahu password bisa saja mendaftar lebih dulu - karena itu selalu dikabarkan.
    this.security.record('two_factor_enabled', { ip: req.ip ?? 'unknown', email: user.email, userAgent: userAgentOf(req) });
    await this.events.record('TWO_FACTOR_ENABLED', req, { email: user.email, accountId: user.id, signedIn: true });
    return this.completeLogin(req, res, user);
  }

  /** Akun di balik challenge, kalau masih boleh masuk. Ikut batas percobaan login. */
  private async challengeUser(challenge: LoginChallenge, req: Request) {
    this.loginLimiter.check(req.ip ?? 'unknown', challenge.email);
    const user = await this.usersService.findById(Number(challenge.sub));
    // Dinonaktifkan, logout di mana-mana, atau ganti password sejak password diterima.
    if (!user || user.status !== 'ACTIVE' || user.tokenVersion !== challenge.tv) {
      throw new UnauthorizedException('This sign-in step has expired. Please sign in again.');
    }
    return user;
  }

  /** Kode salah dihitung sebagai login gagal: 10 kali, akunnya terkunci (dan ada alert). */
  private async rejectCode(req: Request, user: { id: bigint; email: string }): Promise<never> {
    const locked = this.loginLimiter.recordFailure(req.ip ?? 'unknown', user.email);
    await this.events.record(locked ? 'LOGIN_LOCKED' : 'LOGIN_FAILED', req, { email: user.email, accountId: user.id }, {
      reason: 'Wrong authenticator code',
    });
    throw new UnauthorizedException('The code is incorrect or has already been used.');
  }

  /** Password (dan kode, kalau diminta) sudah benar: pasang sesi. */
  private async completeLogin(req: Request, res: Response, user: any) {
    this.loginLimiter.recordSuccess(user.email);
    await this.flagUnusualSignIn(req, user);
    this.session.issue(req, res, user);
    await this.events.record('LOGIN', req, { email: user.email, accountId: user.id, signedIn: true });
    return this.authService.login(user);
  }

  /** Alert kalau login berhasil dari jaringan baru atau dari tool non-browser. */
  private async flagUnusualSignIn(req: Request, user: { id: bigint; email: string }) {
    const ip = req.ip ?? 'unknown';
    const userAgent = userAgentOf(req);
    const reasons: string[] = [];
    if (isNonBrowserAgent(userAgent)) reasons.push('a non-browser tool');
    try {
      if (isNewNetwork(ip, await this.events.recentSignInIps(user.id))) reasons.push('a new IP address');
    } catch {
      // Riwayat tidak terbaca: jangan menggagalkan login karenanya.
    }
    if (reasons.length) this.security.record('login_suspicious', { ip, email: user.email, reasons, userAgent });
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
