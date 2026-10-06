import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions, Request, Response } from 'express';

export const SESSION_COOKIE = 'cms_session';

/** Token diperbarui paling cepat tiap 5 menit, bukan di setiap request. */
const RENEW_AFTER_MS = 5 * 60_000;

/** Isi token sesi. Role dan permission sengaja tidak ikut - JwtStrategy membacanya dari database. */
export type SessionPayload = {
  sub: string;
  email: string;
  /** Versi token akun; logout dan ganti password menaikkannya. */
  tv: number;
  /** Waktu login (epoch detik). Batas mutlak sesi dihitung dari sini. */
  at: number;
  iat?: number;
  exp?: number;
};

type SessionUser = { id: bigint | string; email: string; tokenVersion?: number | null };

/**
 * Sesi login di cookie HttpOnly (pentest F-03 dan F-04).
 *
 * Token tidak lagi dikirim ke JavaScript dan tidak disimpan di localStorage,
 * jadi XSS atau dependency yang disusupi tidak bisa mencurinya.
 *
 *   - HttpOnly: tidak terbaca oleh script.
 *   - SameSite=Strict: tidak ikut terkirim dari situs lain. Ditambah syarat
 *     header X-Requested-With di main.ts, ini menutup CSRF.
 *   - Secure: hanya lewat HTTPS (di production; dev memakai http://localhost).
 *   - Path=/api: hanya terkirim ke API.
 *
 * Umurnya bergeser: token berlaku SESSION_IDLE_MINUTES (bawaan 120) sejak
 * request terakhir, dan diperbarui selama user aktif - tapi tidak pernah
 * melewati SESSION_MAX_HOURS (bawaan 12) sejak login. Jadi sesi yang
 * ditinggal mati sendiri, dan sesi yang dipakai terus tetap harus login ulang
 * sekali sehari.
 */
@Injectable()
export class SessionService {
  private readonly idleMs: number;
  private readonly maxMs: number;

  constructor(
    private jwt: JwtService,
    config: ConfigService,
  ) {
    this.idleMs = Math.max(5, Number(config.get('SESSION_IDLE_MINUTES', 120)) || 120) * 60_000;
    this.maxMs = Math.max(1, Number(config.get('SESSION_MAX_HOURS', 12)) || 12) * 3_600_000;
  }

  /** Token dari cookie sesi, atau null. */
  readToken(req: Request): string | null {
    const header = req.headers?.cookie;
    if (!header) return null;
    for (const part of header.split(';')) {
      const eq = part.indexOf('=');
      if (eq > 0 && part.slice(0, eq).trim() === SESSION_COOKIE) {
        return decodeURIComponent(part.slice(eq + 1).trim()) || null;
      }
    }
    return null;
  }

  /** Mulai sesi (login), atau terbitkan ulang dengan waktu login yang sama (`startedAt`). */
  issue(req: Request, res: Response, user: SessionUser, startedAt?: number) {
    const now = Date.now();
    const at = startedAt ?? Math.floor(now / 1000);
    const lifetimeMs = Math.min(this.idleMs, at * 1000 + this.maxMs - now);
    if (lifetimeMs <= 0) return;

    const payload: SessionPayload = {
      sub: user.id.toString(),
      email: user.email,
      tv: user.tokenVersion ?? 0,
      at,
    };
    const token = this.jwt.sign(payload, { expiresIn: Math.floor(lifetimeMs / 1000) });
    res.cookie(SESSION_COOKIE, token, { ...this.cookieOptions(req), maxAge: lifetimeMs });
  }

  /** Dipanggil JwtStrategy pada setiap request yang lolos: geser umur sesi kalau sudah waktunya. */
  renewIfDue(req: Request, res: Response | undefined, payload: SessionPayload, user: SessionUser) {
    if (!res || res.headersSent || !payload.iat) return;
    const now = Date.now();
    if (now - payload.iat * 1000 < RENEW_AFTER_MS) return;
    if (now - payload.at * 1000 >= this.maxMs) return;
    this.issue(req, res, user, payload.at);
  }

  /** Sesi sudah melewati batas mutlaknya. */
  isPastMaxAge(payload: SessionPayload) {
    return !payload.at || Date.now() - payload.at * 1000 >= this.maxMs;
  }

  clear(req: Request, res: Response) {
    res.clearCookie(SESSION_COOKIE, this.cookieOptions(req));
  }

  private cookieOptions(req: Request): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'strict',
      // req.secure benar di balik nginx karena X-Forwarded-Proto + trust proxy.
      secure: req.secure || process.env.NODE_ENV === 'production',
      path: '/api',
    };
  }
}
