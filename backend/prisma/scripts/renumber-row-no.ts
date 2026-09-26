/**
 * Menomori ulang `row_no` Bank Statement jadi 1, 2, 3, ... per rekening-tahun.
 *
 *   pnpm renumber:row-no            # jalankan
 *   pnpm renumber:row-no --dry-run  # hitung saja, lalu batalkan
 *
 * Dijalankan sekali saat men-deploy perubahan row_no tanpa pengali (sebelumnya
 * disimpan berjarak 1000). Aman diulang: yang sudah 1..n tidak ditulis lagi.
 *
 * Hanya nomornya yang berubah. Urutan tiap rekening-tahun dipertahankan persis
 * (row_no, lalu id - urutan yang dipakai aplikasi), dan itu DIPERIKSA sebelum
 * disimpan: urutan id tiap rekening-tahun direkam, dinomori ulang, direkam lagi,
 * dan kalau ada satu saja yang beda seluruh perubahan dibatalkan.
 *
 * Semua rekening dikunci selama berjalan (kunci yang sama dengan yang dipakai
 * aplikasi saat menyisip/menghapus/menghitung saldo), jadi aman dijalankan walau
 * aplikasi sedang dipakai. Activity log tidak mencatatnya: perubahan row_no
 * diabaikan trigger.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { lockAccounts } from '../../src/finance/common/ledger-lock';

const DRY_RUN = process.argv.includes('--dry-run');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, application_name: 'cms-maintenance' });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type Order = { acc: string; year: number; ids: string };

class Rollback extends Error {}

const readOrder = (tx: any): Promise<Order[]> =>
  tx.$queryRaw`
    SELECT coalesce(internal_account_id, 0)::text AS acc, "tagYear" AS year,
           string_agg(id::text, ',' ORDER BY row_no ASC NULLS LAST, id ASC) AS ids
      FROM financial_transactions
     GROUP BY 1, 2
     ORDER BY 1, 2`;

(async () => {
  const db = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
  console.log(`Database: ${db[0].name}${DRY_RUN ? '  (dry run - tidak ada yang disimpan)' : ''}`);

  let changed = 0;
  let groups = 0;
  try {
    await prisma.$transaction(
      async (tx) => {
        const before = await readOrder(tx);
        groups = before.length;

        // Kunci setiap rekening - kunci yang sama dengan yang diambil aplikasi
        // sebelum menyisip, menghapus, atau menghitung ulang saldo.
        await lockAccounts(tx, [...new Set(before.map((g) => g.acc))].map(BigInt));

        changed = await tx.$executeRaw`
          UPDATE financial_transactions f
             SET row_no = x.n
            FROM (
                   SELECT id,
                          row_number() OVER (
                            PARTITION BY internal_account_id, "tagYear"
                            ORDER BY row_no ASC NULLS LAST, id ASC
                          ) AS n
                     FROM financial_transactions
                 ) x
           WHERE f.id = x.id
             AND f.row_no IS DISTINCT FROM x.n`;

        // Urutan harus identik, dan tiap rekening-tahun harus tepat 1..n.
        const after = await readOrder(tx);
        const beforeKey = new Map(before.map((g) => [`${g.acc}/${g.year}`, g.ids]));
        const moved = after.filter((g) => beforeKey.get(`${g.acc}/${g.year}`) !== g.ids);
        if (moved.length || after.length !== before.length) {
          throw new Error(`Urutan berubah di ${moved.length} rekening-tahun - dibatalkan, tidak ada yang disimpan.`);
        }
        const [{ untidy }] = await tx.$queryRaw<{ untidy: bigint }[]>`
          SELECT count(*) AS untidy FROM (
            SELECT 1 FROM financial_transactions
             GROUP BY internal_account_id, "tagYear"
            HAVING min(row_no) <> 1 OR max(row_no) <> count(*)
                OR count(distinct row_no) <> count(*) OR count(row_no) <> count(*)
          ) t`;
        if (untidy > 0n) {
          throw new Error(`${untidy} rekening-tahun tidak 1..n sesudah penomoran - dibatalkan.`);
        }

        if (DRY_RUN) throw new Rollback();
      },
      { timeout: 120_000, maxWait: 10_000 },
    );
    console.log(`✅ ${changed} baris dinomori ulang di ${groups} rekening-tahun. Urutan identik, semuanya 1..n.`);
  } catch (e) {
    if (e instanceof Rollback) {
      console.log(`Dry run: ${changed} baris akan dinomori ulang di ${groups} rekening-tahun. Urutan terverifikasi identik. Dibatalkan.`);
    } else {
      console.error('❌', (e as Error).message);
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();
