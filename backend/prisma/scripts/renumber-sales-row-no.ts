/**
 * Menomori `row_no` Sales jadi 1, 2, 3, ... per tahun.
 *
 *   pnpm renumber:sales-row-no            # jalankan
 *   pnpm renumber:sales-row-no --dry-run  # hitung saja, lalu batalkan
 *
 * Dijalankan sekali sesudah migrasi yang menambah kolom row_no ke Sales: baris
 * yang sudah ada mendapat nomor menurut urutannya di layar selama ini (id).
 * Aman diulang: yang sudah 1..n tidak ditulis lagi.
 *
 * Hanya nomornya yang berubah. Urutan tiap tahun dipertahankan persis
 * (row_no, lalu id - urutan yang dipakai aplikasi) dan DIPERIKSA sebelum
 * disimpan; kalau ada satu saja yang beda, seluruh perubahan dibatalkan.
 *
 * Setiap tahun dikunci selama berjalan (kunci yang sama dengan yang diambil
 * aplikasi saat menambah/menyisip/menghapus), jadi aman walau aplikasi sedang
 * dipakai. Activity log tidak mencatatnya: perubahan row_no diabaikan trigger.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { lockSalesYear } from '../../src/finance/common/ledger-lock';

const DRY_RUN = process.argv.includes('--dry-run');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, application_name: 'cms-maintenance' });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type Order = { year: number; ids: string };

class Rollback extends Error {}

const readOrder = (tx: any): Promise<Order[]> =>
  tx.$queryRaw`
    SELECT "tagYear" AS year,
           string_agg(id::text, ',' ORDER BY row_no ASC NULLS LAST, id ASC) AS ids
      FROM sales_records
     GROUP BY 1
     ORDER BY 1`;

(async () => {
  const db = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
  console.log(`Database: ${db[0].name}${DRY_RUN ? '  (dry run - tidak ada yang disimpan)' : ''}`);

  let changed = 0;
  let years = 0;
  try {
    await prisma.$transaction(
      async (tx) => {
        const yearList = await tx.$queryRaw<{ year: number }[]>`SELECT DISTINCT "tagYear" AS year FROM sales_records ORDER BY 1`;
        // Berurutan naik, sama seperti kunci banyak rekening di Bank Statement.
        for (const { year } of yearList) await lockSalesYear(tx, year);

        const before = await readOrder(tx);
        years = before.length;

        changed = await tx.$executeRaw`
          UPDATE sales_records s
             SET row_no = x.n
            FROM (
                   SELECT id,
                          row_number() OVER (PARTITION BY "tagYear" ORDER BY row_no ASC NULLS LAST, id ASC) AS n
                     FROM sales_records
                 ) x
           WHERE s.id = x.id
             AND s.row_no IS DISTINCT FROM x.n`;

        // Urutan harus identik, dan tiap tahun harus tepat 1..n.
        const after = await readOrder(tx);
        const beforeKey = new Map(before.map((g) => [g.year, g.ids]));
        const moved = after.filter((g) => beforeKey.get(g.year) !== g.ids);
        if (moved.length || after.length !== before.length) {
          throw new Error(`Urutan berubah di ${moved.length} tahun - dibatalkan, tidak ada yang disimpan.`);
        }
        const [{ untidy }] = await tx.$queryRaw<{ untidy: bigint }[]>`
          SELECT count(*) AS untidy FROM (
            SELECT 1 FROM sales_records
             GROUP BY "tagYear"
            HAVING min(row_no) <> 1 OR max(row_no) <> count(*)
                OR count(distinct row_no) <> count(*) OR count(row_no) <> count(*)
          ) t`;
        if (untidy > 0n) {
          throw new Error(`${untidy} tahun tidak 1..n sesudah penomoran - dibatalkan.`);
        }

        if (DRY_RUN) throw new Rollback();
      },
      { timeout: 120_000, maxWait: 10_000 },
    );
    console.log(`✅ ${changed} baris Sales dinomori di ${years} tahun. Urutan identik, semuanya 1..n.`);
  } catch (e) {
    if (e instanceof Rollback) {
      console.log(`Dry run: ${changed} baris Sales akan dinomori di ${years} tahun. Urutan terverifikasi identik. Dibatalkan.`);
    } else {
      console.error('❌', (e as Error).message);
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
