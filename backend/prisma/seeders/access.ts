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
import { seedAuditLogPermissions } from './audit-logs.seeder';
import { enforceViewerScope, ensureMenuGroupOrder } from './utils/access-control';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Trigger activity log melewati tulisan seeder: isinya dimuat ulang dari workbook.
  application_name: 'cms-seeder',
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

(async () => {
  await seedSalesPipelinePermissions(prisma);
  await seedRbacPermissions(prisma);
  await seedPdfTemplates(prisma);
  await seedMasterDataPermissions(prisma);
  await seedLedgerPermissions(prisma);
  await seedAuditLogPermissions(prisma);
  const reordered = await ensureMenuGroupOrder(prisma);
  console.log(`🧭 Sidebar group order: ${reordered} group(s) moved.`);
  const viewer = await enforceViewerScope(prisma);
  console.log(`👁️  Viewer limited to Overview + Finance: withdrew ${viewer.menus} menu(s), ${viewer.permissions} permission(s).`);
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
