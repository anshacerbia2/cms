import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { FISCAL_YEAR } from './utils/layout';

/**
 * Menerapkan kembali suntingan yang dibuat lewat aplikasi pada baris milik seeder.
 *
 * Baris yang DITAMBAH lewat aplikasi tidak lewat sini - kolom `source` sudah
 * menjaganya, dan itu yang menangani sebagian besar kasus. Yang tersisa adalah
 * nilai yang diubah pada baris yang berasal dari workbook: baris itu dihapus dan
 * dimuat ulang setiap seed, jadi suntingannya selalu kembali ke angka workbook.
 *
 * Barisnya dikenali dari POSISI di dalam tahun itu, karena seeder memasukkan
 * menurut urutan workbook dan `id` berubah setiap seed ulang. Posisi saja rapuh
 * kalau workbook-nya bergeser, jadi setiap suntingan membawa `match`: beberapa
 * nilai yang harus dipunyai baris itu sebelum disentuh. Kalau tidak cocok,
 * suntingan dilewati dengan peringatan - lebih baik satu angka tertinggal
 * daripada menimpa baris yang salah tanpa ada yang tahu.
 */

type Edit = {
  table: string;
  position: number;
  why?: string;
  match?: Record<string, string | null>;
  set: Record<string, string | null>;
};

type Overlay = { year: number; note?: string; edits: Edit[] };

/** Tabel yang boleh disentuh, dipetakan ke model Prisma-nya. */
const MODELS: Record<string, (p: PrismaClient) => any> = {
  account_receivables: (p) => p.accountReceivable,
  account_payables: (p) => p.accountPayable,
  sales_records: (p) => p.salesRecord,
  inter_account: (p) => p.interAccount,
  depreciation: (p) => p.depreciation,
  ppn_in_out: (p) => p.ppnInOut,
};

/** Angka dibandingkan sebagai angka; sisanya sebagai teks. Null cocok dengan kosong. */
function same(actual: unknown, expected: string | null): boolean {
  if (expected === null) return actual === null || actual === undefined || actual === '';
  if (actual === null || actual === undefined) return false;
  const a = Number(String(actual));
  const b = Number(expected);
  if (!Number.isNaN(a) && !Number.isNaN(b)) return Math.abs(a - b) < 0.005;
  return String(actual).trim() === expected.trim();
}

export async function applyAdjustments(prisma: PrismaClient, tables: string[]) {
  const file = path.join(__dirname, '..', 'adjustments', `${FISCAL_YEAR}.json`);
  if (!fs.existsSync(file)) return;

  const overlay: Overlay = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Hanya untuk tabel yang barusan ditulis ulang. Menjalankan seeder untuk satu
  // workbook tidak boleh menyentuh suntingan pada tabel yang tidak ikut dimuat.
  const edits = overlay.edits.filter((e) => tables.includes(e.table));
  if (edits.length === 0) return;

  console.log(`🩹 Menerapkan ${edits.length} suntingan ${FISCAL_YEAR} dari adjustments/${FISCAL_YEAR}.json...`);

  let applied = 0;
  const skipped: string[] = [];

  for (const edit of edits) {
    const model = MODELS[edit.table]?.(prisma);
    if (!model) {
      skipped.push(`${edit.table}: tabel tidak dikenal`);
      continue;
    }

    const rows = await model.findMany({
      where: { tagYear: FISCAL_YEAR },
      orderBy: { id: 'asc' },
      skip: edit.position - 1,
      take: 1,
    });
    const row = rows[0];

    if (!row) {
      skipped.push(`${edit.table} posisi ${edit.position}: baris tidak ada`);
      continue;
    }

    const mismatch = Object.entries(edit.match ?? {}).find(([k, v]) => !same(row[k], v));
    if (mismatch) {
      skipped.push(
        `${edit.table} posisi ${edit.position}: ${mismatch[0]} berisi ${JSON.stringify(row[mismatch[0]])}, ` +
          `diharapkan ${JSON.stringify(mismatch[1])} — workbook-nya mungkin sudah bergeser`,
      );
      continue;
    }

    await model.update({ where: { id: row.id }, data: edit.set });
    applied++;
    console.log(`   ✅ ${edit.table} posisi ${edit.position}${edit.why ? ` — ${edit.why}` : ''}`);
  }

  for (const s of skipped) console.warn(`   ⚠️  dilewati: ${s}`);
  if (applied < edits.length) {
    console.warn(`   ${applied} dari ${edits.length} suntingan diterapkan.`);
  }
}
