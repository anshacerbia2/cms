import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedBanks } from '../seeders/banks.seeder';
import { FISCAL_YEAR } from './utils/layout';
import { assertSafeToReplace } from './utils/guard';
import { seedBankStatements2026 } from './bank-statements.seeder';
import { seedInterAccount2026 } from './inter-account.seeder';
import { seedDepreciation2026 } from './depreciation.seeder';
import { seedSales2026 } from './sales.seeder';
import { seedAccountReceivable2026 } from './account-receivable.seeder';
import { seedAccountPayable2026 } from './account-payable.seeder';
import { seedPpnInOut2026 } from './ppn-in-out.seeder';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Each workbook, the tables it writes, and the name you can select it by.
 *
 * The workbooks do not all arrive together: receivable and payable came weeks
 * after the rest. Naming them lets a new one be loaded without the loaded ones
 * being cleared and rebuilt around it.
 */
const SEEDERS = [
  {
    name: 'bank-statements',
    tables: ['financial_transactions', 'fiscal_periods'],
    run: seedBankStatements2026,
  },
  { name: 'inter-account', tables: ['inter_account'], run: seedInterAccount2026 },
  { name: 'depreciation', tables: ['depreciation'], run: seedDepreciation2026 },
  { name: 'sales', tables: ['sales_records'], run: seedSales2026 },
  { name: 'receivable', tables: ['account_receivables'], run: seedAccountReceivable2026 },
  { name: 'payable', tables: ['account_payables'], run: seedAccountPayable2026 },
  { name: 'ppn', tables: ['ppn_in_out'], run: seedPpnInOut2026 },
];

/**
 * Reads a setting from either the command line or the environment.
 *
 * `SEED_ONLY=x pnpm ...` is not a thing on Windows cmd, where it is read as a
 * command name, so everything can also be given as a flag.
 */
function option(flag: string, variable: string): string {
  const prefix = `--${flag}=`;
  const arg = process.argv.slice(2).find((a) => a.startsWith(prefix));
  if (arg) return arg.slice(prefix.length).trim();
  if (process.argv.slice(2).includes(`--${flag}`)) return '1';
  return (process.env[variable] ?? '').trim();
}

/** --only=receivable,payable restricts the run to those workbooks. */
function selected() {
  const only = option('only', 'SEED_ONLY');
  if (only === '') return SEEDERS;

  const wanted = only.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const chosen = SEEDERS.filter((s) => wanted.includes(s.name));
  const unknown = wanted.filter((w) => !SEEDERS.some((s) => s.name === w));

  if (unknown.length > 0) {
    console.error(`❌ No seeder called: ${unknown.join(', ')}`);
    console.error(`   Pick from: ${SEEDERS.map((s) => s.name).join(', ')}`);
    console.error(`   For example: pnpm seed:${FISCAL_YEAR} --only=receivable,payable`);
    return null;
  }
  return chosen;
}

async function main() {
  const chosen = selected();
  if (!chosen) {
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  }

  console.log(
    chosen.length === SEEDERS.length
      ? `🌱 Starting ${FISCAL_YEAR} seeding...`
      : `🌱 Starting ${FISCAL_YEAR} seeding — only ${chosen.map((s) => s.name).join(', ')}.`,
  );

  try {
    // Checked before anything is written, so a refusal changes nothing.
    const tables = chosen.flatMap((s) => s.tables);
    const replace = option('replace', 'SEED_REPLACE_EXISTING') === '1';
    if (!(await assertSafeToReplace(prisma, tables, replace))) {
      await prisma.$disconnect();
      await pool.end();
      process.exit(1);
    }

    // Bank master and internal accounts are not year-specific, and the 2026
    // ledger needs them to resolve each sheet. Upserts, so re-running is safe.
    await seedBanks(prisma);

    for (const seeder of chosen) {
      await seeder.run(prisma);
    }

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
