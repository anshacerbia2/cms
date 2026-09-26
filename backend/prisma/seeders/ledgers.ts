/**
 * Master Ledger / Sub Ledger 1 - aman untuk produksi.
 *
 *   pnpm seed:ledgers
 *
 * Mengisi master, menghubungkan transaksi yang belum punya Ledger ke master,
 * dan memasang permission + menu Finance > Ledgers. Semuanya upsert; boleh
 * dijalankan berkali-kali. Dijalankan sesudah `prisma migrate deploy`.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedLedgers } from './ledgers.seeder';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Trigger activity log melewati tulisan seeder: isinya dimuat ulang dari workbook.
  application_name: 'cms-seeder',
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

seedLedgers(prisma)
  .then(() => console.log('🚀 Ledger seeding completed.'))
  .catch((e) => {
    console.error('❌ Ledger seeding failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
