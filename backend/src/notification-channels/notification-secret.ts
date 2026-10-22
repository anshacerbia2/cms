import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const VERSION = 'v1';

/** Kunci-kunci enkripsi di .env; masing-masing hanya untuk datanya sendiri. */
export type SecretKeyName =
  /** Kredensial channel notifikasi (token bot Telegram, webhook Google Chat). */
  | 'NOTIFICATION_SECRET_KEY'
  /** Kunci Google Authenticator tiap user (auth/two-factor.service.ts). */
  | 'TWO_FACTOR_SECRET_KEY';

/**
 * Enkripsi rahasia yang disimpan di database (AES-256-GCM).
 *
 * Kuncinya di .env, 32 byte dalam base64 (`openssl rand -base64 32`). Kunci
 * tidak ikut tersimpan di database, jadi dump atau backup database saja tidak
 * cukup untuk membaca isinya. Kalau sebuah kunci hilang atau diganti, data
 * yang dikunci dengannya harus diisi ulang - dan hanya itu, karena tiap jenis
 * data punya kuncinya sendiri.
 */
function key(name: SecretKeyName): Buffer {
  const raw = process.env[name];
  if (!raw) throw new MissingSecretKeyError(name);
  const k = Buffer.from(raw, 'base64');
  if (k.length !== 32) throw new MissingSecretKeyError(name, `${name} must be 32 bytes in base64.`);
  return k;
}

export class MissingSecretKeyError extends Error {
  constructor(name: SecretKeyName = 'NOTIFICATION_SECRET_KEY', message = `${name} is not set on the server.`) {
    super(message);
    this.name = 'MissingSecretKeyError';
  }
}

export function encryptSecret(value: object, keyName: SecretKeyName = 'NOTIFICATION_SECRET_KEY'): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(keyName), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return `${VERSION}:${Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')}`;
}

export function decryptSecret<T>(stored: string, keyName: SecretKeyName = 'NOTIFICATION_SECRET_KEY'): T {
  const [version, payload] = stored.split(':');
  if (version !== VERSION || !payload) throw new Error('Unknown secret format.');
  const buf = Buffer.from(payload, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key(keyName), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8'));
}
