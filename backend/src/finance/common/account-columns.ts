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
