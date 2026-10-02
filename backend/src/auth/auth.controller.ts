import { Controller, Post, Patch, Body, UnauthorizedException, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ChangeOwnPasswordDto } from './dto/change-own-password.dto';
import { LoginDto } from './dto/login.dto';
import { LoginRateLimiter } from './login-rate-limiter';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private loginLimiter: LoginRateLimiter,
  ) {}

  @Post('login')
  async login(@Body() body: LoginDto, @Request() req: any) {
    // Dibatasi per email (percobaan gagal) dan per IP - lihat LoginRateLimiter.
    this.loginLimiter.check(req.ip ?? 'unknown', body.email);
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      this.loginLimiter.recordFailure(body.email);
      throw new UnauthorizedException('Invalid credentials');
    }
    this.loginLimiter.recordSuccess(body.email);
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }

  /**
   * Ganti password akun sendiri. Tidak butuh permission apa pun selain login -
   * user view-only juga harus bisa mengganti password yang dibuatkan admin.
   */
  @UseGuards(JwtAuthGuard)
  @Patch('password')
  changeOwnPassword(@Request() req: any, @Body() dto: ChangeOwnPasswordDto) {
    return this.authService.changeOwnPassword(req.user.userId, dto.currentPassword, dto.newPassword);
  }
}
