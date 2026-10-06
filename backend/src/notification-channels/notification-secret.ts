import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const VERSION = 'v1';

/**
 * Enkripsi kredensial channel notifikasi (AES-256-GCM).
 *
 * Kuncinya NOTIFICATION_SECRET_KEY di .env: 32 byte dalam base64
 * (`openssl rand -base64 32`). Kunci tidak ikut tersimpan di database, jadi
 * dump atau backup database saja tidak cukup untuk membaca token. Kalau kunci
 * ini hilang atau diganti, channel yang ada harus diisi ulang kredensialnya.
 */
function key(): Buffer {
  const raw = process.env.NOTIFICATION_SECRET_KEY;
  if (!raw) throw new MissingSecretKeyError();
  const k = Buffer.from(raw, 'base64');
  if (k.length !== 32) throw new MissingSecretKeyError('NOTIFICATION_SECRET_KEY must be 32 bytes in base64.');
  return k;
}

export class MissingSecretKeyError extends Error {
  constructor(message = 'NOTIFICATION_SECRET_KEY is not set on the server.') {
    super(message);
    this.name = 'MissingSecretKeyError';
  }
}

export function encryptSecret(value: object): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return `${VERSION}:${Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')}`;
}

export function decryptSecret<T>(stored: string): T {
  const [version, payload] = stored.split(':');
  if (version !== VERSION || !payload) throw new Error('Unknown secret format.');
  const buf = Buffer.from(payload, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8'));
}
