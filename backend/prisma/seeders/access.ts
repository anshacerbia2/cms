/**
 * Permission dan menu saja - yang aman untuk produksi.
 *
 *   pnpm seed:access
 *
 * `prisma db seed` TIDAK BOLEH dijalankan di produksi: `auth.seeder.ts` menghapus
 * dan membangun ulang tabel menu dan role. Semua seeder di sini upsert-only, jadi
 * boleh dijalankan kapan saja, berapa kali pun, sesudah deploy yang menambah
 * modul atau menu baru.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedSalesPipelinePermissions } from './sales-pipeline.seeder';
import { seedRbacPermissions } from './rbac.seeder';
import { seedPdfTemplates } from './pdf-templates.seeder';
import { seedMasterDataPermissions } from './master-data.seeder';
import { seedLedgerPermissions } from './ledgers.seeder';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

(async () => {
  await seedSalesPipelinePermissions(prisma);
  await seedRbacPermissions(prisma);
  await seedPdfTemplates(prisma);
  await seedMasterDataPermissions(prisma);
  await seedLedgerPermissions(prisma);
  console.log('🚀 Access seeding completed.');
})()
  .catch((e) => {
    console.error('❌ Access seeding failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
