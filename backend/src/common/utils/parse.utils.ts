import { BadRequestException } from '@nestjs/common';

export const parseIntSafe = (val: any): number | null => {
  if (!val) return null;
  const parsed = parseInt(String(val), 10);
  return isNaN(parsed) ? null : parsed;
};

export const parseDateSafe = (val: any): Date | null => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Angka untuk kolom Decimal, dari teks yang dikirim halaman.
 *
 * Halaman seharusnya sudah mengirim angka bersih ("1234.56"), dan angka bersih
 * diteruskan apa adanya - tidak ditafsir ulang, jadi "123.456" tetap 123,456.
 *
 * Yang tidak bersih dibaca dengan aturan yang sama dengan `parseAmountInput`
 * di frontend: gaya Indonesia (titik ribuan, koma desimal), kecuali teks yang
 * tidak mungkin gaya Indonesia - lebih dari satu koma, atau titik sesudah koma
 * - yang dibaca gaya Inggris.
 *
 * Dulu nilainya diteruskan mentah ke Prisma. Baris PPN In/Out yang ditempel
 * dari Excel berbahasa Inggris gagal disimpan dengan galat 500 ("invalid digit
 * found in string") dan pemakainya tidak tahu kenapa (24 Sep 2026). Sekarang
 * yang benar-benar bukan angka ditolak dengan pesan yang menyebut kolomnya.
 */
export const parseDecimalSafe = (val: any, column?: string): string | null => {
  if (val === null || val === undefined) return null;
  const raw = String(val).trim();
  if (raw === '' || raw === '-') return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return raw;

  const reject = () =>
    new BadRequestException(`${column ? column + ': ' : ''}"${raw}" is not a number`);

  const negative = raw.includes('-') || (raw.startsWith('(') && raw.endsWith(')'));
  const body = raw.replace(/[^0-9.,]/g, '');
  if (body === '') throw reject();

  const commas = (body.match(/,/g) || []).length;
  const englishStyle = commas > 1 || (commas === 1 && body.lastIndexOf('.') > body.indexOf(','));

  let normalized: string;
  if (englishStyle) {
    const noCommas = body.replace(/,/g, '');
    const lastDot = noCommas.lastIndexOf('.');
    normalized = lastDot < 0
      ? noCommas
      : noCommas.slice(0, lastDot).replace(/\./g, '') + '.' + noCommas.slice(lastDot + 1);
  } else {
    normalized = body.replace(/\./g, '').replace(',', '.');
  }

  if (normalized.endsWith('.')) normalized = normalized.slice(0, -1);
  if (normalized.startsWith('.')) normalized = '0' + normalized;
  if (!/^\d+(\.\d+)?$/.test(normalized)) throw reject();
  return negative ? '-' + normalized : normalized;
};
