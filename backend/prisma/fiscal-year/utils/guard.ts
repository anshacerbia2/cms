import { PrismaClient } from '@prisma/client';
import { FISCAL_YEAR } from './layout';

/** Set this to 1 to allow the seeders to replace data that is already there. */
const OVERRIDE = 'SEED_REPLACE_EXISTING';

/** Berapa baris tahun ini yang memang ditulis seeder. */
const SEED_COUNTERS: Record<string, (p: PrismaClient) => Promise<number>> = {
  financial_transactions: (p) =>
    p.financialTransaction.count({ where: { tagYear: FISCAL_YEAR, source: 'SEED' } }),
  sales_records: (p) => p.salesRecord.count({ where: { tagYear: FISCAL_YEAR, source: 'SEED' } }),
  depreciation: (p) => p.depreciation.count({ where: { tagYear: FISCAL_YEAR, source: 'SEED' } }),
  inter_account: (p) => p.interAccount.count({ where: { tagYear: FISCAL_YEAR, source: 'SEED' } }),
  account_receivables: (p) =>
    p.accountReceivable.count({ where: { tagYear: FISCAL_YEAR, source: 'SEED' } }),
  account_payables: (p) =>
    p.accountPayable.count({ where: { tagYear: FISCAL_YEAR, source: 'SEED' } }),
  ppn_in_out: (p) => p.ppnInOut.count({ where: { tagYear: FISCAL_YEAR, source: 'SEED' } }),
};

/** How to count a year's rows in each table a seeder writes. */
const COUNTERS: Record<string, (p: PrismaClient) => Promise<number>> = {
  financial_transactions: (p) => p.financialTransaction.count({ where: { tagYear: FISCAL_YEAR } }),
  fiscal_periods: (p) => p.fiscalPeriod.count({ where: { year: FISCAL_YEAR } }),
  sales_records: (p) => p.salesRecord.count({ where: { tagYear: FISCAL_YEAR } }),
  depreciation: (p) => p.depreciation.count({ where: { tagYear: FISCAL_YEAR } }),
  inter_account: (p) => p.interAccount.count({ where: { tagYear: FISCAL_YEAR } }),
  account_receivables: (p) => p.accountReceivable.count({ where: { tagYear: FISCAL_YEAR } }),
  account_payables: (p) => p.accountPayable.count({ where: { tagYear: FISCAL_YEAR } }),
  ppn_in_out: (p) => p.ppnInOut.count({ where: { tagYear: FISCAL_YEAR } }),
};

/**
 * Every seeder in this folder clears its fiscal year before loading the
 * workbook, which is what makes a re-run reproducible. That is harmless while
 * the year holds nothing but seeded rows, and destructive the moment somebody
 * has entered a transaction for it through the application.
 *
 * So the first run, into an empty year, proceeds silently. A later run stops
 * and says what it would delete, because by then the rows may not be ours.
 *
 * Only the tables this run will actually write are checked. Loading a workbook
 * that has just arrived must not be blocked by a table it never touches.
 */
export async function assertSafeToReplace(
  prisma: PrismaClient,
  tables: string[],
  replace = process.env[OVERRIDE] === '1',
): Promise<boolean> {
  const counts: [string, number][] = [];
  for (const table of tables) {
    const count = COUNTERS[table];
    if (count) counts.push([table, await count(prisma)]);
  }

  const existing = counts.filter(([, n]) => n > 0);
  if (existing.length === 0) return true;

  // Kolom `source` defaultnya 'APP', jadi sebelum backfill dijalankan SEMUA
  // baris lama berlabel APP. Kalau seeder jalan dalam keadaan itu, ia tidak
  // menghapus apa pun lalu memuat ulang workbook di atasnya - tahun itu jadi
  // ganda. Ditolak di sini, sebelum ada yang ditulis.
  const unmarked: string[] = [];
  for (const [table] of existing) {
    const count = SEED_COUNTERS[table];
    if (count && (await count(prisma)) === 0) unmarked.push(table);
  }
  if (unmarked.length > 0) {
    console.error(`\n🛑 Asal baris belum ditandai. Nothing has been changed.\n`);
    console.error(`   Tabel ini punya baris ${FISCAL_YEAR} tapi tidak satu pun berlabel SEED:`);
    for (const t of unmarked) console.error(`     ${t}`);
    console.error(
      `\n   Tanpa penandaan itu, seed ulang tidak menghapus apa pun dan akan` +
        `\n   menggandakan tahun ini. Jalankan dulu:\n` +
        `\n     pnpm backfill:row-source --apply\n`,
    );
    return false;
  }

  if (replace) {
    console.log(`♻️  Replacing existing ${FISCAL_YEAR} data:`);
    for (const [table, n] of existing) console.log(`     ${table}: ${n} rows`);
    return true;
  }

  console.error(`\n🛑 ${FISCAL_YEAR} data is already loaded. Nothing has been changed.\n`);
  console.error('   Re-running would delete these rows and reload them from the workbooks:');
  for (const [table, n] of existing) console.error(`     ${table}: ${n} rows`);
  console.error(
    `\n   Any ${FISCAL_YEAR} transaction entered through the application would be lost.` +
      `\n   To load only what is new, name it:\n` +
      `\n     pnpm seed:year --year=${FISCAL_YEAR} --only=receivable,payable\n` +
      `\n   If the workbooks are the source of truth for everything above:\n` +
      `\n     pnpm seed:year --year=${FISCAL_YEAR} --replace\n`,
  );
  return false;
}
