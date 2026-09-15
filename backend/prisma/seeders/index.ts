import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedAuth } from './auth.seeder';
import { seedSalesPipelinePermissions } from './sales-pipeline.seeder';
import { seedRbacPermissions } from './rbac.seeder';
import { seedPdfTemplates } from './pdf-templates.seeder';
import { seedMasterDataPermissions } from './master-data.seeder';
import { seedCustomers } from './customers.seeder';
import { seedSuppliers } from './suppliers.seeder';
import { seedProducts } from './products.seeder';
import { seedBankMutation, seedBanks } from './banks.seeder';
import { seedFinance } from './finance.seeder';
import { seedAccountReceivable } from './account-receivable.seeder';
import { seedPpnInOut } from './ppn-in-out.seeder';
import { seedEquity } from './equity.seeder';
import { seedAccountPayable } from './account-payable.seeder';
import { seedDepreciation } from './depreciation.seeder';
import { seedInterAccount } from './inter-account.seeder';
import { backfillAccountAmounts } from '../scripts/backfill-finance-account-amounts';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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
    
    // Independent entities
    await seedCustomers(prisma);
    await seedSuppliers(prisma);
    await seedProducts(prisma);
    
    // Bank Master & Internal Accounts
    await seedBanks(prisma);
    await seedBankMutation(prisma);

    // Comprehensive Financial Data (from Excel)
    await seedFinance(prisma);
    await seedAccountReceivable(prisma);
    await seedPpnInOut(prisma);
    await seedEquity(prisma);
    await seedInterAccount(prisma);
    // Left out until now, which meant a database built from scratch had an
    // empty Account Payable and Depreciation while every other finance table
    // was full.
    await seedAccountPayable(prisma);
    await seedDepreciation(prisma);
    // seedSales is deliberately not here. Its workbook mixes years - 39 rows
    // dated 2024, 13 dated 2026, 27 with no year at all - and the seeder tags
    // every row it reads as 2025, which would put 2026 invoices in 2025.
    // Production holds a filtered subset of 260 rows and nobody recorded what
    // the filter was, so this waits on an answer rather than guessing one.

    // The finance tables keep their per-account columns, and this puts the
    // same figures in the rows that name their account. A database seeded
    // from scratch is then consistent without anyone remembering a second
    // command.
    // Scoped to the year this seeder just rewrote. Rebuilding every year would
    // undo what the 2026 workbooks brought in that no column can hold.
    await backfillAccountAmounts(prisma, { replace: true, tagYear: 2025 });

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
