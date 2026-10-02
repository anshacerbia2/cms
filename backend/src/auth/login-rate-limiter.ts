import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SecurityEvents } from './security-events';

/** Percobaan gagal per email sebelum email itu dikunci sementara. */
const MAX_FAILURES_PER_EMAIL = 10;
/** Jendela hitung kegagalan, dan lama kunci sesudahnya. */
const EMAIL_WINDOW_MS = 15 * 60_000;
/** Percobaan login per IP per menit, berhasil maupun gagal. */
const MAX_ATTEMPTS_PER_IP = 30;
const IP_WINDOW_MS = 60_000;

type Counter = { count: number; resetAt: number };

/**
 * Pembatas percobaan login (pentest F-01), dua lapis:
 *
 *   - Per email: 10 percobaan GAGAL dalam 15 menit mengunci email itu sampai
 *     jendelanya habis. Hanya kegagalan yang dihitung - login yang benar tidak
 *     pernah terkena - dan login berhasil menghapus hitungannya. Email yang
 *     tidak terdaftar dihitung dengan cara yang sama, jadi kunci ini tidak
 *     membocorkan email mana yang ada.
 *   - Per IP: 30 percobaan per menit. IP diambil dari req.ip; nginx harus
 *     meneruskan X-Forwarded-For (dan main.ts mempercayai proxy loopback),
 *     kalau tidak semua orang terlihat sebagai 127.0.0.1 dan lapis ini
 *     berlaku untuk semua user bersama - tetap longgar untuk enam user.
 *
 * Disimpan di memori: backend berjalan sebagai satu proses (pm2 fork). Restart
 * menghapus hitungannya, yang tidak apa-apa untuk pembatas sependek ini.
 *
 * Setiap kegagalan, kunci, dan pembatasan dicatat lewat SecurityEvents dengan
 * IP dan email-nya; kunci dan pembatasan juga dikirim sebagai alert (N-04).
 */
@Injectable()
export class LoginRateLimiter {
  private readonly failures = new Map<string, Counter>();
  private readonly attempts = new Map<string, Counter>();

  constructor(private readonly events: SecurityEvents) {}

  /** Melempar 429 kalau IP atau email ini sedang dibatasi; kalau tidak, mencatat satu percobaan dari IP ini. */
  check(ip: string, email: string): void {
    const now = Date.now();
    this.prune(now);

    const key = this.emailKey(email);
    const locked = this.failures.get(key);
    if (locked && locked.count >= MAX_FAILURES_PER_EMAIL && locked.resetAt > now) {
      this.events.record('login_blocked', { ip, email: key, lockedUntil: new Date(locked.resetAt).toISOString() });
      throw this.tooMany(locked.resetAt - now);
    }

    const byIp = this.bump(this.attempts, ip, IP_WINDOW_MS, now);
    if (byIp.count > MAX_ATTEMPTS_PER_IP) {
      this.events.record('login_ip_throttled', { ip, email: key, attempts: byIp.count });
      throw this.tooMany(byIp.resetAt - now);
    }
  }

  recordFailure(ip: string, email: string): void {
    const key = this.emailKey(email);
    const failed = this.bump(this.failures, key, EMAIL_WINDOW_MS, Date.now());
    this.events.record('login_failed', { ip, email: key, failures: failed.count });
    if (failed.count === MAX_FAILURES_PER_EMAIL) {
      this.events.record('login_locked', {
        ip,
        email: key,
        failures: failed.count,
        lockedUntil: new Date(failed.resetAt).toISOString(),
      });
    }
  }

  recordSuccess(email: string): void {
    this.failures.delete(this.emailKey(email));
  }

  private emailKey(email: string) {
    return String(email ?? '').trim().toLowerCase();
  }

  private bump(map: Map<string, Counter>, key: string, windowMs: number, now: number): Counter {
    const current = map.get(key);
    const next = current && current.resetAt > now ? { ...current, count: current.count + 1 } : { count: 1, resetAt: now + windowMs };
    map.set(key, next);
    return next;
  }

  /** Membuang hitungan yang jendelanya sudah lewat, supaya peta tidak tumbuh tanpa batas. */
  private prune(now: number) {
    for (const map of [this.failures, this.attempts]) {
      if (map.size < 1000) continue;
      for (const [key, c] of map) if (c.resetAt <= now) map.delete(key);
    }
  }

  private tooMany(waitMs: number) {
    const minutes = Math.max(1, Math.ceil(waitMs / 60_000));
    return new HttpException(
      `Too many login attempts. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
