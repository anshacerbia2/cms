import { PrismaClient } from '@prisma/client';
import { FISCAL_YEAR } from './layout';

/** Set this to 1 to allow the seeders to replace data that is already there. */
const OVERRIDE = 'SEED_REPLACE_EXISTING';

/**
 * Every seeder in this folder clears its fiscal year before loading the
 * workbook, which is what makes a re-run reproducible. That is harmless while
 * the year holds nothing but seeded rows, and destructive the moment somebody
 * has entered a transaction for it through the application.
 *
 * So the first run, into an empty year, proceeds silently. A later run stops
 * and says what it would delete, because by then the rows may not be ours.
 */
export async function assertSafeToReplace(prisma: PrismaClient): Promise<boolean> {
  const counts: [string, number][] = [
    ['financial_transactions', await prisma.financialTransaction.count({ where: { tagYear: FISCAL_YEAR } })],
    ['fiscal_periods', await prisma.fiscalPeriod.count({ where: { year: FISCAL_YEAR } })],
    ['sales_records', await prisma.salesRecord.count({ where: { tagYear: FISCAL_YEAR } })],
    ['depreciation', await prisma.depreciation.count({ where: { tagYear: FISCAL_YEAR } })],
    ['inter_account', await prisma.interAccount.count({ where: { tagYear: FISCAL_YEAR } })],
  ];

  const existing = counts.filter(([, n]) => n > 0);
  if (existing.length === 0) return true;

  if (process.env[OVERRIDE] === '1') {
    console.log(`♻️  Replacing existing ${FISCAL_YEAR} data (${OVERRIDE}=1):`);
    for (const [table, n] of existing) console.log(`     ${table}: ${n} rows`);
    return true;
  }

  console.error(`\n🛑 ${FISCAL_YEAR} data is already loaded. Nothing has been changed.\n`);
  console.error('   Re-running would delete these rows and reload them from the workbooks:');
  for (const [table, n] of existing) console.error(`     ${table}: ${n} rows`);
  console.error(
    `\n   Any ${FISCAL_YEAR} transaction entered through the application would be lost.` +
      `\n   If the workbooks are the source of truth and that is what you want:\n` +
      `\n     ${OVERRIDE}=1 pnpm seed:${FISCAL_YEAR}\n`,
  );
  return false;
}
