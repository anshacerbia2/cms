import { PrismaClient, Prisma } from '@prisma/client';
import { cleanCurrency } from '../../seeders/utils/excel';
import { normalizeLabel } from './layout';

/**
 * Every name a workbook has used for one of our accounts.
 *
 * The same account is written differently from sheet to sheet - "Mandiri MP",
 * "MANDIRI Mid Plaza", "Mandiri Mid Plaza" - and the display name is what ties
 * those together to one row in internal_accounts.
 */
export const ACCOUNT_ALIASES: { display: string; headers: string[] }[] = [
  { display: 'BCA Sahardjo', headers: ['bcasahardjo', 'bcasho'] },
  { display: 'BCA Juanda', headers: ['bcajuanda'] },
  { display: 'Mandiri Mid Plaza', headers: ['mandirimidplaza', 'mandirimp'] },
  { display: 'Mandiri Plasa Mandiri', headers: ['mandiriplasamandiri', 'manidiriplazamandiri', 'mandiripm'] },
  { display: 'BRI Sahardjo', headers: ['brisahardjo', 'brisho'] },
  { display: 'BRI Tebet', headers: ['britebet'] },
  { display: 'BTN', headers: ['btn'] },
  { display: 'Bank Raya', headers: ['bankraya', 'raya'] },
  { display: 'BNI', headers: ['bni'] },
  { display: 'Cash IDR', headers: ['cashidr'] },
  { display: 'Non CB', headers: ['noncb', 'noncashbank'] },
  // Present as a column in older books, never used. It has no account of its
  // own, so a book that starts putting figures here will stop the seeder.
  { display: 'BJB', headers: ['bjb'] },
];

/**
 * Headings in the account block that are not accounts.
 *
 * PPn In and Out is a VAT clearing position, not an account anyone holds, so it
 * keeps its own column and is skipped here rather than stopping the seeder as
 * an unknown heading would.
 */
const NOT_ACCOUNTS = new Set([
  'ppninandout',
  // What the payable sheet calls it.
  'apinandout',
  // And what the 2026 receivable sheet calls the same column.
  'apppnnonwapu',
  'apppnwapu',
]);

const BY_HEADER = new Map<string, string>();
for (const alias of ACCOUNT_ALIASES) {
  for (const header of alias.headers) BY_HEADER.set(header, alias.display);
}

export type AccountColumn = { index: number; display: string; header: string };

/**
 * Reads the account block as a list of accounts rather than a list of columns.
 *
 * This is what lifts the ceiling: a column the table has no slot for is still
 * an account here, so its figures are kept instead of being reported as
 * dropped. A heading we have never seen is refused outright - inventing an
 * account from a mistyped header would split a real one in two.
 */
export function readAccountColumns(header: any[], from: number, to: number) {
  const columns: AccountColumn[] = [];
  const unknown: string[] = [];

  for (let i = from; i <= to && i < header.length; i++) {
    const text = String(header[i] ?? '').trim();
    if (text === '') continue;
    const key = normalizeLabel(text);
    if (NOT_ACCOUNTS.has(key)) continue;
    const display = BY_HEADER.get(key);
    if (display === undefined) unknown.push(text);
    else columns.push({ index: i, display, header: text });
  }

  return { columns, unknown };
}

/** Looks the accounts up by the name they are shown under. */
export async function loadAccountIds(prisma: PrismaClient, displays: string[]) {
  const accounts = await prisma.internalAccount.findMany({
    where: { displayName: { in: displays } },
  });
  const byDisplay = new Map(accounts.map((a) => [a.displayName as string, a.id]));
  const missing = displays.filter((d) => !byDisplay.has(d));
  return { byDisplay, missing };
}

export type RowAmounts = { display: string; amount: Prisma.Decimal }[];

/** Pulls the account figures out of one sheet row. */
export function readRowAmounts(row: any[], columns: AccountColumn[]): RowAmounts {
  const amounts: RowAmounts = [];
  for (const column of columns) {
    const amount = cleanCurrency(row[column.index]);
    // Nothing moved through that account on this row.
    if (amount === null || amount.isZero()) continue;
    amounts.push({ display: column.display, amount });
  }
  return amounts;
}

/**
 * Writes the account figures against the rows that were just inserted.
 *
 * createMany gives back a count and no ids, so the parents are read back in
 * insertion order. That holds because the seeder clears the fiscal year and
 * inserts it in one pass, so these are the only rows the year has.
 */
export async function linkAccountAmounts(opts: {
  prisma: PrismaClient;
  /** e.g. prisma.salesRecordAmount */
  amountModel: any;
  /** e.g. prisma.salesRecord */
  parentModel: any;
  /** e.g. 'salesRecordId' */
  parentKey: string;
  tagYear: number;
  /** One entry per inserted row, in the order they were inserted. */
  perRow: RowAmounts[];
}) {
  const { prisma, amountModel, parentModel, parentKey, tagYear, perRow } = opts;

  const displays = [...new Set(perRow.flatMap((r) => r.map((a) => a.display)))];
  const { byDisplay, missing } = await loadAccountIds(prisma, displays);
  if (missing.length > 0) {
    throw new Error(
      `No internal account named: ${missing.join(', ')}.` +
        ' Add it under Account & Bank, or with pnpm seed:accounts, then run this again.',
    );
  }

  const parents = await parentModel.findMany({
    where: { tagYear },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  if (parents.length !== perRow.length) {
    throw new Error(
      `Expected ${perRow.length} rows for ${tagYear} but found ${parents.length}; accounts not linked.`,
    );
  }

  const lines: any[] = [];
  perRow.forEach((amounts, i) => {
    for (const { display, amount } of amounts) {
      lines.push({ [parentKey]: parents[i].id, internalAccountId: byDisplay.get(display)!, amount });
    }
  });

  await amountModel.deleteMany({ where: { [parentKey]: { in: parents.map((p: any) => p.id) } } });
  for (let i = 0; i < lines.length; i += 1000) {
    await amountModel.createMany({ data: lines.slice(i, i + 1000) });
  }

  console.log(`🔗 Linked ${lines.length} account amount(s) across ${displays.length} account(s).`);
  return lines.length;
}
