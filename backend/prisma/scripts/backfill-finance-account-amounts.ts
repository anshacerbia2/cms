import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  ACCOUNT_PAYABLE_COLUMNS,
  ACCOUNT_RECEIVABLE_COLUMNS,
  INTER_ACCOUNT_COLUMNS,
  SALES_RECORD_COLUMNS,
  type ColumnAccountMap,
} from '../../src/finance/common/account-columns';

/**
 * Copies the per-account columns of the four finance tables into the rows that
 * name their account.
 *
 * Nothing is removed: the columns stay exactly as they are and stay the source
 * of truth until the reports read the new rows instead. This only adds the same
 * figures in a shape that can hold an account the table has no column for.
 */
export type BackfillOptions = {
  /**
   * Rebuild rows that are already linked. The full seed does this for the year
   * it has just rewritten, because it rewrote the columns underneath them.
   */
  replace?: boolean;
  /**
   * Restrict to one fiscal year. Rebuilding every year would be wrong: a year
   * loaded by the 2026 seeders can hold figures for an account this table has
   * no column for, and those cannot be derived from the columns again.
   */
  tagYear?: number;
};

type TableSpec = {
  label: string;
  columns: ColumnAccountMap;
  /** Reads the parent rows, returning id plus the mapped columns. */
  read: (tagYear?: number) => Promise<any[]>;
  /** The amounts table that hangs off it. */
  amounts: any;
  /** What the amount row calls its parent. */
  parentKey: string;
};

function tablesFor(prisma: PrismaClient): TableSpec[] {
  return [
  {
    label: 'inter_account',
    columns: INTER_ACCOUNT_COLUMNS,
    read: (tagYear?: number) =>
      prisma.interAccount.findMany({ where: tagYear ? { tagYear } : {} }),
    amounts: () => prisma.interAccountAmount,
    parentKey: 'interAccountId',
  } as any,
  {
    label: 'sales_records',
    columns: SALES_RECORD_COLUMNS,
    read: (tagYear?: number) =>
      prisma.salesRecord.findMany({ where: tagYear ? { tagYear } : {} }),
    amounts: () => prisma.salesRecordAmount,
    parentKey: 'salesRecordId',
  } as any,
  {
    label: 'account_receivables',
    columns: ACCOUNT_RECEIVABLE_COLUMNS,
    read: (tagYear?: number) =>
      prisma.accountReceivable.findMany({ where: tagYear ? { tagYear } : {} }),
    amounts: () => prisma.accountReceivableAmount,
    parentKey: 'accountReceivableId',
  } as any,
  {
    label: 'account_payables',
    columns: ACCOUNT_PAYABLE_COLUMNS,
    read: (tagYear?: number) =>
      prisma.accountPayable.findMany({ where: tagYear ? { tagYear } : {} }),
    amounts: () => prisma.accountPayableAmount,
    parentKey: 'accountPayableId',
  } as any,
  ];
}

/** Turns a column's account name into the account it stands for. */
async function resolveAccounts(prisma: PrismaClient, labels: string[]) {
  const accounts = await prisma.internalAccount.findMany({
    where: { displayName: { in: labels } },
  });
  const byLabel = new Map(accounts.map((a) => [a.displayName as string, a.id]));
  const unknown = labels.filter((l) => !byLabel.has(l));
  return { byLabel, unknown };
}

export async function backfillAccountAmounts(prisma: PrismaClient, options: BackfillOptions = {}) {
  const replace = options.replace ?? process.env.BACKFILL_REPLACE_EXISTING === '1';
  const { tagYear } = options;
  const scope = tagYear ? ` for ${tagYear}` : '';
  console.log(`🔗 Linking finance columns to internal accounts${scope}...\n`);

  const TABLES = tablesFor(prisma);
  const labels = [...new Set(TABLES.flatMap((t) => Object.values(t.columns)))];
  const { byLabel, unknown } = await resolveAccounts(prisma, labels);

  let failed = false;

  for (const table of TABLES) {
    const amounts = (table as any).amounts();
    const parents = await table.read(tagYear);
    const parentIds = parents.map((p: any) => p.id);
    const scoped = tagYear ? { [table.parentKey]: { in: parentIds } } : {};

    const existing = await amounts.count({ where: scoped });
    if (existing > 0 && !replace) {
      console.log(
        `⏭️  ${table.label}: ${existing} linked row(s) already there, left alone.` +
          ' Use BACKFILL_REPLACE_EXISTING=1 to rebuild them.',
      );
      continue;
    }

    const rows = parents;
    const lines: any[] = [];
    const missingWithData = new Set<string>();

    for (const row of rows) {
      for (const [column, label] of Object.entries(table.columns)) {
        const value = row[column] as Prisma.Decimal | null;
        // A column left empty and a column holding nothing are the same thing
        // here: no money moved through that account on this row.
        if (value === null || value === undefined || value.isZero()) continue;

        const internalAccountId = byLabel.get(label);
        if (internalAccountId === undefined) {
          missingWithData.add(`${label} (${table.label}.${column})`);
          continue;
        }
        lines.push({ [table.parentKey]: row.id, internalAccountId, amount: value });
      }
    }

    if (missingWithData.size > 0) {
      failed = true;
      console.error(
        `❌ ${table.label}: these columns hold figures but name no account we have:\n     ` +
          [...missingWithData].join('\n     '),
      );
      continue;
    }

    if (existing > 0) {
      // Only the accounts this table has a column for. A row pointing at an
      // account with no column - a bank a new workbook brought in - cannot be
      // derived from the columns again, so rebuilding must not take it.
      const derivable = [...new Set(Object.values(table.columns))]
        .map((name) => byLabel.get(name))
        .filter((id): id is bigint => id !== undefined);
      const removed = await amounts.deleteMany({
        where: { ...scoped, internalAccountId: { in: derivable } },
      });
      const kept = existing - removed.count;
      if (kept > 0) {
        console.log(`   ${kept} row(s) kept: their account has no column to rebuild from.`);
      }
    }
    for (let i = 0; i < lines.length; i += 1000) {
      await amounts.createMany({ data: lines.slice(i, i + 1000) });
    }
    console.log(`✅ ${table.label}: ${lines.length} amount(s) linked from ${rows.length} row(s)${scope}.`);
  }

  if (unknown.length > 0) {
    console.log(`\nℹ️  No internal account for: ${unknown.join(', ')} — no figures use them.`);
  }

  await verify(prisma, tagYear);
  if (failed) throw new Error('Some columns name an account that does not exist.');
}

/**
 * Adds the columns up one way and the linked rows up the other. The two totals
 * have to agree per account, or the copy lost something.
 */
async function verify(prisma: PrismaClient, tagYear?: number) {
  console.log('\n🔍 Checking the totals match, account by account:');
  let bad = 0;

  for (const table of tablesFor(prisma)) {
    const amounts = (table as any).amounts();
    const rows = await table.read(tagYear);
    const fromColumns = new Map<string, Prisma.Decimal>();

    for (const row of rows) {
      for (const [column, label] of Object.entries(table.columns)) {
        const value = row[column] as Prisma.Decimal | null;
        if (value === null || value === undefined) continue;
        fromColumns.set(label, (fromColumns.get(label) ?? new Prisma.Decimal(0)).plus(value));
      }
    }

    const grouped = await amounts.groupBy({
      by: ['internalAccountId'],
      _sum: { amount: true },
      where: tagYear ? { [table.parentKey]: { in: rows.map((r: any) => r.id) } } : {},
    });
    const accounts = await prisma.internalAccount.findMany();
    const nameById = new Map(accounts.map((a) => [a.id.toString(), a.holderName + (a.branch ? ` ${a.branch}` : '')]));

    const fromLines = new Map<string, Prisma.Decimal>();
    for (const g of grouped) {
      fromLines.set(g.internalAccountId.toString(), g._sum.amount ?? new Prisma.Decimal(0));
    }

    for (const [label, total] of fromColumns) {
      const id = (await resolveAccounts(prisma, [label])).byLabel.get(label);
      const linked = id === undefined ? new Prisma.Decimal(0) : (fromLines.get(id.toString()) ?? new Prisma.Decimal(0));
      const agrees = total.equals(linked);
      if (!agrees) bad++;
      if (!agrees || !total.isZero()) {
        console.log(
          `   ${agrees ? '✓' : '✗'} ${table.label.padEnd(20)} ${label.padEnd(16)} ` +
            `kolom=${total.toFixed(2).padStart(20)}  relasi=${linked.toFixed(2).padStart(20)}` +
            (id === undefined ? `  [${nameById.size ? 'no account' : ''}]` : ''),
        );
      }
    }
  }

  console.log(bad === 0 ? '\n✅ Every total agrees.' : `\n❌ ${bad} account total(s) disagree.`);
  if (bad > 0) process.exitCode = 1;
}

/** Run on its own: `pnpm backfill:account-amounts`. */
if (require.main === module) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  backfillAccountAmounts(prisma)
    .catch((e) => {
      console.error('❌ Backfill failed:', e);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
