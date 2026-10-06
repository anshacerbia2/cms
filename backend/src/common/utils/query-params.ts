import { BadRequestException } from '@nestjs/common';

/**
 * Halaman terbesar yang diminta UI ("muat semua" untuk dropdown dan ekspor).
 * Permintaan di atasnya dipotong ke sini, bukan diteruskan ke database apa
 * adanya (pentest N-02).
 */
export const MAX_PAGE_LIMIT = 10_000;

/** `limit` dari query: default kalau kosong/tidak valid, dipotong ke MAX_PAGE_LIMIT. */
export function pageLimit(value: unknown, fallback = 10): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, MAX_PAGE_LIMIT);
}

/**
 * ID dari query string sebagai BigInt. Bukan bilangan bulat positif → 400
 * (sebelumnya BigInt('abc') / BigInt(1.5) melempar dan berakhir 500).
 */
export function idParam(
  value: string | number | null | undefined,
  name: string,
): bigint | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const s = String(value);
  if (!/^\d{1,19}$/.test(s))
    throw new BadRequestException(`${name} must be a positive whole number`);
  return BigInt(s);
}

/** Tanggal dari query string. Tidak bisa dibaca → 400, bukan Invalid Date ke database. */
export function dateParam(
  value: string | number | null | undefined,
  name: string,
): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime()))
    throw new BadRequestException(`${name} must be a valid date`);
  return d;
}
