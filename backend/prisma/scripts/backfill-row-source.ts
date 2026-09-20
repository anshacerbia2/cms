import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Menandai baris mana yang datang dari workbook dan mana yang diketik orang.
 *
 * Kolom `source` defaultnya 'APP', jadi setelah migrasi SEMUA baris lama
 * berlabel APP - termasuk belasan ribu yang sebenarnya hasil seed. Skrip ini
 * yang membetulkannya, sekali, sebelum seeder dijalankan lagi.
 *
 * Cara membedakannya: satu kali muat workbook menulis ribuan baris dalam menit
 * yang sama, sedangkan orang mengetik beberapa baris di menit yang berbeda.
 * Jadi per (tabel, tahun), batch `created_at` terbesar adalah hasil seed dan
 * sisanya input aplikasi.
 *
 * Default-nya cuma melaporkan. Tambahkan --apply untuk benar-benar menulis.
 */

type TableSpec = { table: string; label: string };

const TABLES: TableSpec[] = [
  { table: 'financial_transactions', label: 'Bank statements' },
  { table: 'sales_records', label: 'Sales' },
  { table: 'depreciation', label: 'Depreciation' },
  { table: 'inter_account', label: 'Inter account' },
  { table: 'account_receivables', label: 'Account receivable' },
  { table: 'account_payables', label: 'Account payable' },
  { table: 'ppn_in_out', label: 'PPn in/out' },
];

type Batch = { tagYear: number; minute: string; n: number };

async function batchesOf(prisma: PrismaClient, table: string): Promise<Batch[]> {
  return prisma.$queryRawUnsafe<Batch[]>(`
    SELECT "tagYear"                                  AS "tagYear",
           to_char(created_at, 'YYYY-MM-DD HH24:MI')  AS minute,
           count(*)::int                              AS n
      FROM ${table}
     GROUP BY 1, 2
     ORDER BY 1, 3 DESC
  `);
}

export async function backfillRowSource(prisma: PrismaClient, apply: boolean) {
  console.log(apply ? '🏷️  Menandai asal baris...\n' : '🔎 Laporan saja — tambahkan --apply untuk menulis.\n');

  let seedTotal = 0;
  let appTotal = 0;

  for (const { table, label } of TABLES) {
    const batches = await batchesOf(prisma, table);
    if (batches.length === 0) continue;

    // Batch terbesar per tahun adalah pemuatan workbook.
    const seedMinute = new Map<number, string>();
    for (const b of batches) {
      if (!seedMinute.has(b.tagYear)) seedMinute.set(b.tagYear, b.minute);
    }

    const appBatches = batches.filter((b) => seedMinute.get(b.tagYear) !== b.minute);
    const seedRows = batches.filter((b) => seedMinute.get(b.tagYear) === b.minute)
      .reduce((a, b) => a + b.n, 0);
    const appRows = appBatches.reduce((a, b) => a + b.n, 0);
    seedTotal += seedRows;
    appTotal += appRows;

    console.log(`   ${label.padEnd(20)} ${String(seedRows).padStart(6)} SEED  ${String(appRows).padStart(4)} APP`);
    for (const b of appBatches) {
      console.log(`      ${b.tagYear}  ${b.minute}  ${b.n} baris diketik lewat aplikasi`);
    }

    if (!apply) continue;

    // Semuanya SEED dulu, lalu batch kecil dikembalikan ke APP. Dua pernyataan,
    // bukan satu dengan NOT IN, supaya tabel tanpa batch APP tetap sederhana.
    await prisma.$executeRawUnsafe(`UPDATE ${table} SET source = 'SEED'`);
    for (const b of appBatches) {
      await prisma.$executeRawUnsafe(
        `UPDATE ${table} SET source = 'APP'
          WHERE "tagYear" = $1
            AND to_char(created_at, 'YYYY-MM-DD HH24:MI') = $2`,
        b.tagYear,
        b.minute,
      );
    }
  }

  console.log(`\n   Total: ${seedTotal} SEED, ${appTotal} APP.`);
  if (!apply) {
    console.log('   Tidak ada yang ditulis. Jalankan `pnpm backfill:row-source --apply`.');
  } else {
    console.log('✅ Selesai. Seeder sekarang hanya akan menghapus barisnya sendiri.');
  }
}

/** Dijalankan sendiri: `pnpm backfill:row-source [--apply]`. */
if (require.main === module) {
  const apply = process.argv.slice(2).includes('--apply');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  backfillRowSource(prisma, apply)
    .catch((e) => {
      console.error('❌ Backfill source gagal:', e);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
