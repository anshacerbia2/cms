import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedBanks } from '../seeders/banks.seeder';
import { FISCAL_YEAR } from './utils/layout';
import { seedBankStatements2026 } from './bank-statements.seeder';
import { seedInterAccount2026 } from './inter-account.seeder';
import { seedDepreciation2026 } from './depreciation.seeder';
import { seedSales2026 } from './sales.seeder';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`🌱 Starting ${FISCAL_YEAR} seeding...`);

  try {
    // Bank master and internal accounts are not year-specific, and the 2026
    // ledger needs them to resolve each sheet. Upserts, so re-running is safe.
    await seedBanks(prisma);

    await seedBankStatements2026(prisma);
    await seedInterAccount2026(prisma);
    await seedDepreciation2026(prisma);
    await seedSales2026(prisma);

    console.log(`🚀 ${FISCAL_YEAR} seeding completed successfully.`);
  } catch (error) {
    console.error(`❌ ${FISCAL_YEAR} seeding failed:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
