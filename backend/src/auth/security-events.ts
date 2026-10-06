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
  | 'login_ip_throttled';

/** Event yang juga dikirim sebagai alert, bukan hanya dicatat. */
const ALERT_EVENTS: SecurityEvent[] = ['login_locked', 'login_ip_throttled'];
/** Alert yang sama (event + email/IP) tidak dikirim ulang dalam jendela ini. */
const ALERT_COOLDOWN_MS = 15 * 60_000;

/**
 * Catatan dan alert untuk kejadian login (pentest N-04).
 *
 * Setiap kejadian ditulis sebagai satu baris JSON di log pm2, lengkap dengan IP
 * dan email, supaya bisa dicari (`pm2 logs | grep '"event":"login_'`).
 * Kunci email dan pembatasan IP juga dikirim sebagai alert:
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
    const key = `${entry.event}:${entry.event === 'login_ip_throttled' ? entry.ip : entry.email}`;
    if ((this.lastAlert.get(key) ?? 0) > now - ALERT_COOLDOWN_MS) return;
    this.lastAlert.set(key, now);
    if (this.lastAlert.size > 1000) {
      for (const [k, t] of this.lastAlert) if (t <= now - ALERT_COOLDOWN_MS) this.lastAlert.delete(k);
    }

    const text =
      entry.event === 'login_locked'
        ? `PCMI Admin: login for ${entry.email} locked after ${entry.failures} failed attempts (last from IP ${entry.ip}).`
        : `PCMI Admin: IP ${entry.ip} exceeded the login attempt limit (last email tried: ${entry.email}).`;
    this.logger.error(`ALERT ${text}`);
    void this.notifications.broadcast(text);
  }
}
