import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

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
 */
@Injectable()
export class LoginRateLimiter {
  private readonly failures = new Map<string, Counter>();
  private readonly attempts = new Map<string, Counter>();

  /** Melempar 429 kalau IP atau email ini sedang dibatasi; kalau tidak, mencatat satu percobaan dari IP ini. */
  check(ip: string, email: string): void {
    const now = Date.now();
    this.prune(now);

    const locked = this.failures.get(this.emailKey(email));
    if (locked && locked.count >= MAX_FAILURES_PER_EMAIL && locked.resetAt > now) {
      throw this.tooMany(locked.resetAt - now);
    }

    const byIp = this.bump(this.attempts, ip, IP_WINDOW_MS, now);
    if (byIp.count > MAX_ATTEMPTS_PER_IP) throw this.tooMany(byIp.resetAt - now);
  }

  recordFailure(email: string): void {
    this.bump(this.failures, this.emailKey(email), EMAIL_WINDOW_MS, Date.now());
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
