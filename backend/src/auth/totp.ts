import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * TOTP (RFC 6238) seperti yang dipakai Google Authenticator: HMAC-SHA1,
 * 6 digit, langkah 30 detik. Ditulis sendiri - cuma beberapa baris - supaya
 * tidak menambah dependency di jalur login.
 */
const STEP_SECONDS = 30;
const DIGITS = 6;
/** Kode satu langkah sebelum dan sesudahnya juga diterima: jam HP sering meleset beberapa detik. */
const DRIFT_STEPS = 1;

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.replace(/[\s=-]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx < 0) throw new Error('Invalid base32 character.');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Kunci rahasia baru: 20 byte acak (160 bit, sesuai RFC 4226), dalam base32. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function currentStep(now = Date.now()): number {
  return Math.floor(now / 1000 / STEP_SECONDS);
}

export function totpAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return code.toString().padStart(DIGITS, '0');
}

/**
 * Langkah waktu tempat `code` cocok, atau null. Langkah yang tidak lebih baru
 * dari `afterStep` ditolak, supaya kode yang sudah dipakai tidak bisa dipakai lagi.
 */
export function verifyTotp(secret: string, code: string, afterStep: number | null = null, now = Date.now()): number | null {
  const given = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(given)) return null;
  const step = currentStep(now);
  for (let s = step - DRIFT_STEPS; s <= step + DRIFT_STEPS; s++) {
    if (afterStep != null && s <= afterStep) continue;
    if (timingSafeEqual(Buffer.from(totpAt(secret, s)), Buffer.from(given))) return s;
  }
  return null;
}

/** URL yang dibaca aplikasi authenticator dari QR code. */
export function otpauthUrl(issuer: string, account: string, secret: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(STEP_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}
