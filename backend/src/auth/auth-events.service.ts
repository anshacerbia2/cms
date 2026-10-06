import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { auditContext } from '../common/audit/audit-context';

/** Kejadian login yang dicatat. `auth` adalah nama "tabel"-nya di activity log. */
export type AuthEvent = 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'LOGIN_LOCKED';
export const AUTH_EVENTS_TABLE = 'auth';

/**
 * Jejak login di activity log (pentest, lampiran A09: tidak ada peringatan
 * untuk login gagal berulang).
 *
 * Tidak ada tabel yang berubah saat orang login, jadi trigger audit tidak
 * pernah melihatnya - catatannya ditulis langsung ke audit_logs dengan
 * `table_name = 'auth'`. `row_id` adalah akun yang dituju (kosong kalau
 * emailnya tidak terdaftar); `user_id` hanya diisi kalau orangnya memang
 * berhasil masuk, karena percobaan yang gagal belum tentu dilakukan pemilik akun.
 *
 * Akun yang terkunci juga ditulis ke log server sebagai peringatan.
 */
@Injectable()
export class AuthEventsService {
  private readonly logger = new Logger('AuthEvents');

  constructor(private prisma: PrismaService) {}

  async record(
    event: AuthEvent,
    req: Request,
    who: { email: string; accountId?: bigint | string | null; signedIn?: boolean },
    detail: Record<string, unknown> = {},
  ) {
    const accountId = who.accountId != null ? BigInt(who.accountId) : null;
    const data = {
      email: who.email,
      ip: req.ip ?? null,
      user_agent: String(req.headers['user-agent'] ?? '').slice(0, 300) || null,
      ...detail,
    };
    if (event === 'LOGIN_LOCKED') {
      this.logger.warn(`Sign-in locked for ${who.email} after repeated failures (last from ${data.ip}).`);
    }
    try {
      await this.prisma.auditLog.create({
        data: {
          tableName: AUTH_EVENTS_TABLE,
          rowId: accountId,
          action: event,
          userId: who.signedIn ? accountId : null,
          userEmail: who.email,
          requestId: auditContext.getStore()?.requestId ?? null,
          source: 'APP',
          changedColumns: [],
          newData: data,
        },
      });
    } catch (err) {
      // Gagal mencatat tidak boleh menggagalkan login atau logout.
      this.logger.error(`Could not record ${event} for ${who.email}: ${(err as Error).message}`);
    }
  }
}
