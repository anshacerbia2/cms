import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedAuth } from './auth.seeder';
import { seedSalesPipelinePermissions } from './sales-pipeline.seeder';
import { seedRbacPermissions } from './rbac.seeder';
import { seedPdfTemplates } from './pdf-templates.seeder';
import { seedMasterDataPermissions } from './master-data.seeder';
import { seedLedgers } from './ledgers.seeder';
import { seedAuditLogPermissions } from './audit-logs.seeder';
import { enforceViewerScope } from './utils/access-control';
import { seedCustomers } from './customers.seeder';
import { seedSuppliers } from './suppliers.seeder';
import { seedProducts } from './products.seeder';
import { seedBanks } from './banks.seeder';
import { seedFinance } from './finance.seeder';
import { seedEquity } from './equity.seeder';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Trigger activity log melewati tulisan seeder: isinya dimuat ulang dari workbook.
  application_name: 'cms-seeder',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting Modular CMS Seeding...');
  
  try {
    // Auth must come first
    await seedAuth(prisma);
    // Depends on the roles seedAuth creates, and repoints the stub menus it ships.
    await seedSalesPipelinePermissions(prisma);
    await seedRbacPermissions(prisma);
    await seedPdfTemplates(prisma);
    await seedMasterDataPermissions(prisma);
    // Master Ledger, penghubungan transaksi, dan permission + menu-nya.
    await seedLedgers(prisma);
    await seedAuditLogPermissions(prisma);
    await enforceViewerScope(prisma);
    
    // Independent entities
    await seedCustomers(prisma);
    await seedSuppliers(prisma);
    await seedProducts(prisma);
    
    // Bank Master & Internal Accounts
    await seedBanks(prisma);

    // Comprehensive Financial Data (from Excel)
    await seedFinance(prisma);
    await seedEquity(prisma);

    // The finance tables keep their per-account columns, and this puts the
    // same figures in the rows that name their account. A database seeded
    // from scratch is then consistent without anyone remembering a second
    // command.
    // No fiscal year is loaded here any more. A year's books come from its own
    // workbooks, through `pnpm seed:year --year=YYYY`, so this can be run at
    // any time without touching a single ledger row.

    console.log('🚀 Seeding completed successfully.');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
