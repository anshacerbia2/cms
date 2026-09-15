import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedBanks } from '../seeders/banks.seeder';

/**
 * Brings the bank master and the internal accounts up to date on their own.
 *
 * `prisma db seed` cannot be run here: it clears the menu tables and reloads
 * the finance tables from the workbooks. This calls only the part that matters
 * for accounts, which upserts and therefore changes nothing that is already
 * correct.
 */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const before = await prisma.internalAccount.count();
  await seedBanks(prisma);
  const after = await prisma.internalAccount.count();
  console.log(
    after === before
      ? `✅ ${after} internal accounts, all already present.`
      : `✅ ${after} internal accounts (${after - before} added).`,
  );
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
