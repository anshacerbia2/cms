/**
 * Menomori `row_no` PPN In/Out jadi 1, 2, 3, ... per tahun.
 *
 *   pnpm renumber:ppn-row-no            # jalankan
 *   pnpm renumber:ppn-row-no --dry-run  # hitung saja, lalu batalkan
 *
 * Dijalankan sekali sesudah migrasi yang menambah kolom row_no ke PPN In/Out:
 * baris yang sudah ada mendapat nomor menurut urutannya di layar selama ini
 * (id). Aman diulang: yang sudah 1..n tidak ditulis lagi.
 *
 * Diperiksa sebelum disimpan, dan kalau satu saja gagal semuanya dibatalkan:
 *   - urutan tiap tahun tidak berubah dan nomornya tepat 1..n;
 *   - AP PPN Non WAPU (colO) yang tersimpan sama dengan saldo berjalan yang
 *     akan dihitung aplikasi mulai sekarang (0 - Non WAPU + Masukan, per
 *     tahun). Kalau ada yang beda, aplikasi akan menimpanya pada simpan
 *     berikutnya - itu harus diputuskan dulu, bukan terjadi diam-diam.
 *
 * Setiap tahun dikunci selama berjalan (kunci yang sama dengan aplikasi), jadi
 * aman walau aplikasi sedang dipakai. Activity log tidak mencatatnya.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { lockPpnYear } from '../../src/finance/common/ledger-lock';

const DRY_RUN = process.argv.includes('--dry-run');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, application_name: 'cms-maintenance' });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

class Rollback extends Error {}

const readOrder = (tx: any): Promise<{ year: number; ids: string }[]> =>
  tx.$queryRaw`
    SELECT "tagYear" AS year, string_agg(id::text, ',' ORDER BY row_no ASC NULLS LAST, id ASC) AS ids
      FROM ppn_in_out GROUP BY 1 ORDER BY 1`;

(async () => {
  const db = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
  console.log(`Database: ${db[0].name}${DRY_RUN ? '  (dry run - tidak ada yang disimpan)' : ''}`);

  let changed = 0;
  let years = 0;
  try {
    await prisma.$transaction(
      async (tx) => {
        const yearList = await tx.$queryRaw<{ year: number }[]>`SELECT DISTINCT "tagYear" AS year FROM ppn_in_out ORDER BY 1`;
        for (const { year } of yearList) await lockPpnYear(tx, year);

        const before = await readOrder(tx);
        years = before.length;

        changed = await tx.$executeRaw`
          UPDATE ppn_in_out s
             SET row_no = x.n
            FROM (
                   SELECT id, row_number() OVER (PARTITION BY "tagYear" ORDER BY row_no ASC NULLS LAST, id ASC) AS n
                     FROM ppn_in_out
                 ) x
           WHERE s.id = x.id
             AND s.row_no IS DISTINCT FROM x.n`;

        const after = await readOrder(tx);
        const beforeKey = new Map(before.map((g) => [g.year, g.ids]));
        const moved = after.filter((g) => beforeKey.get(g.year) !== g.ids);
        if (moved.length || after.length !== before.length) {
          throw new Error(`Urutan berubah di ${moved.length} tahun - dibatalkan, tidak ada yang disimpan.`);
        }
        const [{ untidy }] = await tx.$queryRaw<{ untidy: bigint }[]>`
          SELECT count(*) AS untidy FROM (
            SELECT 1 FROM ppn_in_out GROUP BY "tagYear"
            HAVING min(row_no) <> 1 OR max(row_no) <> count(*)
                OR count(distinct row_no) <> count(*) OR count(row_no) <> count(*)
          ) t`;
        if (untidy > 0n) throw new Error(`${untidy} tahun tidak 1..n sesudah penomoran - dibatalkan.`);

        const drift = await tx.$queryRaw<{ year: number; rows: bigint; first_row: number | null }[]>`
          SELECT "tagYear" AS year, count(*) AS rows, min(row_no) AS first_row FROM (
            SELECT "tagYear", row_no, "colO",
                   SUM(COALESCE("colN", 0) - COALESCE("colM", 0))
                     OVER (PARTITION BY "tagYear" ORDER BY row_no, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS saldo
              FROM ppn_in_out
          ) t
          WHERE "colO" IS DISTINCT FROM saldo
          GROUP BY 1 ORDER BY 1`;
        if (drift.length) {
          const where = drift.map((d) => `${d.year}: ${d.rows} baris mulai No ${d.first_row}`).join('; ');
          throw new Error(`AP PPN Non WAPU tersimpan tidak sama dengan saldo berjalan (${where}) - dibatalkan.`);
        }

        if (DRY_RUN) throw new Rollback();
      },
      { timeout: 120_000, maxWait: 10_000 },
    );
    console.log(`✅ ${changed} baris PPN dinomori di ${years} tahun. Urutan identik, semuanya 1..n, saldo AP PPN Non WAPU cocok.`);
  } catch (e) {
    if (e instanceof Rollback) {
      console.log(`Dry run: ${changed} baris PPN akan dinomori di ${years} tahun. Urutan identik, saldo AP PPN Non WAPU cocok. Dibatalkan.`);
    } else {
      console.error('❌', (e as Error).message);
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
