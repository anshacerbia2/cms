import { Controller, Delete, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { UsersService } from '../users/users.service';
import { TwoFactorService } from './two-factor.service';
import { SecurityEvents } from './security-events';

/**
 * Admin menghapus pendaftaran Google Authenticator seorang user (HP hilang
 * atau ganti). Login berikutnya meminta user mendaftar ulang.
 *
 * Di modul auth, bukan users, karena butuh TwoFactorService; rutenya tetap di
 * bawah /users. Perubahannya tercatat oleh trigger audit tabel users.
 */
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TwoFactorAdminController {
  constructor(
    private users: UsersService,
    private twoFactor: TwoFactorService,
    private security: SecurityEvents,
  ) {}

  @Delete(':id/two-factor')
  @Permissions('users.update')
  async reset(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const user = await this.users.findOne(id);
    await this.twoFactor.reset(user.id);
    this.security.record('two_factor_reset', { ip: req.ip ?? 'unknown', email: user.email, by: req.user?.email });
    return { message: 'Two-factor authentication has been reset.' };
  }
}
