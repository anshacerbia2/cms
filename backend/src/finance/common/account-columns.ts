import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { formatDecimal } from '../../common/utils/format.utils';

/** One account column of a finance table, as the server decides it. */
export interface AccountColumn {
  id: number;
  name: string;
  order: number | null;
}

/**
 * The accounts a year's rows were actually posted against, in the order they
 * should be shown.
 *
 * Finance tables used to declare their bank columns by hand, which fixed the
 * accounts a year could use and left dead columns behind for accounts nobody
 * had touched in years. Asking the data instead means an account that turns up
 * in a new workbook appears without anyone editing a component, and one with no
 * movement takes up no width.
 */
export async function findAccountColumns(
  prisma: PrismaService,
  opts: {
    /** e.g. prisma.salesRecordAmount */
    amountModel: any;
    /** What the amount row calls its parent, e.g. 'salesRecord'. */
    parentRelation: string;
    year?: number;
  },
): Promise<AccountColumn[]> {
  const where: any = {};
  if (opts.year && !isNaN(opts.year)) {
    where[opts.parentRelation] = { tagYear: opts.year };
  }

  const used = await opts.amountModel.groupBy({ by: ['internalAccountId'], where });
  if (used.length === 0) return [];

  const accounts = await prisma.internalAccount.findMany({
    where: { id: { in: used.map((u: any) => u.internalAccountId) } },
    // An account with no position set falls to the end rather than the front.
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
  });

  return accounts.map((a) => ({
    id: Number(a.id),
    // Falls back to the holder only so a new account is never a blank header.
    name: a.displayName ?? a.holderName,
    order: a.displayOrder,
  }));
}

/** The per-account figures of one row, in the shape the tables read. */
export function serializeAmounts(amounts: { internalAccountId: bigint; amount: any }[]) {
  return (amounts ?? []).map((a) => ({
    accountId: Number(a.internalAccountId),
    amount: formatDecimal(a.amount),
  }));
}

/**
 * Which account each fixed column of the finance tables stands for, by the name
 * the account is shown under.
 *
 * The columns are not in the same order twice - receivable has no BTN at all,
 * payable no Bank Raya, and sales puts Mandiri Plasa Mandiri where
 * inter-account puts BTN - so the mapping is written out per table.
 */
export type ColumnAccountMap = Record<string, string>;

export const INTER_ACCOUNT_COLUMNS: ColumnAccountMap = {
  colC: 'BCA Sahardjo',
  colD: 'BCA Juanda',
  colE: 'Mandiri Mid Plaza',
  colF: 'BRI Sahardjo',
  colG: 'BTN',
  colH: 'BJB',
  colI: 'Bank Raya',
  colJ: 'BRI Tebet',
  colK: 'Mandiri Plasa Mandiri',
  colL: 'BNI',
  colM: 'Cash IDR',
  colN: 'Non CB',
  colO: 'PPn In and Out',
};

export const SALES_RECORD_COLUMNS: ColumnAccountMap = {
  colM: 'BCA Sahardjo',
  colN: 'BCA Juanda',
  colO: 'Mandiri Mid Plaza',
  colP: 'Mandiri Plasa Mandiri',
  colQ: 'BRI Tebet',
  colR: 'BRI Sahardjo',
  colS: 'BTN',
  colT: 'Bank Raya',
  colU: 'BNI',
  colV: 'Cash IDR',
  colW: 'Non CB',
};

export const ACCOUNT_RECEIVABLE_COLUMNS: ColumnAccountMap = {
  colJ: 'BCA Sahardjo',
  colK: 'BCA Juanda',
  colL: 'Mandiri Mid Plaza',
  colM: 'BRI Sahardjo',
  colN: 'Cash IDR',
  colO: 'Non CB',
  colP: 'PPn In and Out',
};

export const ACCOUNT_PAYABLE_COLUMNS: ColumnAccountMap = {
  colK: 'BCA Sahardjo',
  colL: 'BCA Juanda',
  colM: 'Mandiri Mid Plaza',
  colN: 'BTN',
  colO: 'BRI Sahardjo',
  colP: 'BRI Tebet',
  colQ: 'Cash IDR',
  colR: 'Non CB',
  // The payable sheet calls it "AP In and Out"; it is the same control account.
  colS: 'PPn In and Out',
};

/**
 * Mirrors a row's per-account columns into the rows that name their account.
 *
 * The tables read the accounts now, so a row saved through the application has
 * to write them as well as the columns, or a payment entered by hand would
 * simply not appear. Called after the row itself is written, with whatever
 * column values were saved.
 */
export async function syncAccountAmounts(
  prisma: PrismaService,
  opts: {
    /** e.g. prisma.salesRecordAmount */
    amountModel: any;
    /** What the amount row calls its parent, e.g. 'salesRecordId'. */
    parentKey: string;
    parentId: bigint | number;
    columns: ColumnAccountMap;
    /** The row as written, holding the colX values. */
    row: Record<string, any>;
  },
) {
  const { amountModel, parentKey, parentId, columns, row } = opts;

  const wanted: { name: string; amount: any }[] = [];
  for (const [column, name] of Object.entries(columns)) {
    const value = row[column];
    if (value === null || value === undefined || value === '') continue;
    const amount = new Prisma.Decimal(value);
    // A column left empty and one holding nothing mean the same here: no money
    // moved through that account on this row.
    if (amount.isZero()) continue;
    wanted.push({ name, amount });
  }

  const id = BigInt(parentId);
  // Rewritten wholesale: an edit that clears a column has to remove its row,
  // and there are at most a dozen of them.
  await amountModel.deleteMany({ where: { [parentKey]: id } });
  if (wanted.length === 0) return;

  const accounts = await prisma.internalAccount.findMany({
    where: { displayName: { in: wanted.map((w) => w.name) } },
  });
  const byName = new Map(accounts.map((a) => [a.displayName as string, a.id]));

  const missing = wanted.filter((w) => !byName.has(w.name)).map((w) => w.name);
  if (missing.length > 0) {
    throw new BadRequestException(
      `No internal account named: ${[...new Set(missing)].join(', ')}.` +
        ' Add it under Account & Bank first.',
    );
  }

  await amountModel.createMany({
    data: wanted.map((w) => ({
      [parentKey]: id,
      internalAccountId: byName.get(w.name)!,
      amount: w.amount,
    })),
  });
}
