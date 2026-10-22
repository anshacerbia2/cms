import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannelsService } from '../notification-channels/notification-channels.service';

export type SecurityEvent =
  /** Satu login gagal (password salah atau email tidak terdaftar). */
  | 'login_failed'
  /** Email baru saja dikunci karena terlalu banyak kegagalan. */
  | 'login_locked'
  /** Percobaan login ke email yang sedang dikunci. */
  | 'login_blocked'
  /** Sebuah IP melewati batas percobaan per menit. */
  | 'login_ip_throttled'
  /** Password benar, tapi akunnya INACTIVE/SUSPENDED. */
  | 'login_inactive'
  /** Login berhasil dari IP yang belum pernah dipakai akun ini, atau dari tool non-browser. */
  | 'login_suspicious'
  /** Sebuah akun mendaftarkan Google Authenticator. */
  | 'two_factor_enabled'
  /** Admin menghapus pendaftaran Google Authenticator sebuah akun. */
  | 'two_factor_reset';

/** Event yang juga dikirim sebagai alert, bukan hanya dicatat. */
const ALERT_EVENTS: SecurityEvent[] = [
  'login_locked',
  'login_ip_throttled',
  'login_inactive',
  'login_suspicious',
  'two_factor_enabled',
  'two_factor_reset',
];
/** Alert yang sama (event + email/IP) tidak dikirim ulang dalam jendela ini. */
const ALERT_COOLDOWN_MS = 15 * 60_000;

/**
 * Catatan dan alert untuk kejadian login (pentest N-04).
 *
 * Setiap kejadian ditulis sebagai satu baris JSON di log pm2, lengkap dengan IP
 * dan email, supaya bisa dicari (`pm2 logs | grep '"event":"login_'`).
 * Event di ALERT_EVENTS juga dikirim sebagai alert:
 *   - ke setiap channel aktif di Settings > Notification Channels (Telegram,
 *     Google Chat), lewat NotificationChannelsService;
 *   - selalu juga sebagai baris log berawalan "ALERT", untuk log watcher.
 * Pengiriman alert tidak pernah ditunggu dan tidak pernah menggagalkan login.
 */
@Injectable()
export class SecurityEvents {
  private readonly logger = new Logger('Security');
  private readonly lastAlert = new Map<string, number>();

  constructor(private readonly notifications: NotificationChannelsService) {}

  record(event: SecurityEvent, fields: { ip: string; email: string; [key: string]: unknown }): void {
    const entry = { event, at: new Date().toISOString(), ...fields };
    this.logger.warn(JSON.stringify(entry));
    if (ALERT_EVENTS.includes(event)) this.alert(entry);
  }

  private alert(entry: { event: SecurityEvent; ip: string; email: string; [key: string]: unknown }) {
    const now = Date.now();
    const key =
      entry.event === 'login_ip_throttled'
        ? `${entry.event}:${entry.ip}`
        : entry.event === 'login_locked'
          ? `${entry.event}:${entry.email}`
          : `${entry.event}:${entry.email}:${entry.ip}`;
    if ((this.lastAlert.get(key) ?? 0) > now - ALERT_COOLDOWN_MS) return;
    this.lastAlert.set(key, now);
    if (this.lastAlert.size > 1000) {
      for (const [k, t] of this.lastAlert) if (t <= now - ALERT_COOLDOWN_MS) this.lastAlert.delete(k);
    }

    const text = `PCMI Admin: ${alertText(entry)}`;
    this.logger.error(`ALERT ${text}`);
    void this.notifications.broadcast(text);
  }
}

function alertText(entry: { event: SecurityEvent; ip: string; email: string; [key: string]: unknown }): string {
  const agent = entry.userAgent ? ` using "${String(entry.userAgent).slice(0, 120)}"` : '';
  switch (entry.event) {
    case 'login_locked':
      return `login for ${entry.email} locked after ${entry.failures} failed attempts (last from IP ${entry.ip}).`;
    case 'login_ip_throttled':
      return `IP ${entry.ip} exceeded the login attempt limit (last email tried: ${entry.email}).`;
    case 'login_inactive':
      return `correct password entered for ${entry.status} account ${entry.email} from IP ${entry.ip}${agent}. Access was refused.`;
    case 'login_suspicious':
      return `${entry.email} signed in from ${(entry.reasons as string[]).join(' and ')} - IP ${entry.ip}${agent}. If this was not them, suspend the account and reset its password.`;
    case 'two_factor_enabled':
      return `${entry.email} set up Google Authenticator from IP ${entry.ip}${agent}. If this was not them, reset its two-factor and password.`;
    case 'two_factor_reset':
      return `two-factor for ${entry.email} was reset by ${entry.by} (IP ${entry.ip}). The next sign-in will ask to set it up again.`;
    default:
      return `${entry.event} for ${entry.email} from IP ${entry.ip}.`;
  }
}
