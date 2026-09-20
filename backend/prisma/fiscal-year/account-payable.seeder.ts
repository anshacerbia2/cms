import { PrismaClient, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { cleanCurrency, cleanString } from '../utils/excel';
import {
  DATA_DIR,
  FISCAL_YEAR,
  buildColumnMapInRange,
  findWorkbook,
  isBlankRow,
  normalizeLabel,
  rateColumnAfter,
  reportLayout,
  reportTail,
  type ColumnMap,
  readCell,
  type SlotSpec,
} from './utils/layout';
import {
  linkAccountAmounts,
  readAccountColumns,
  readRowAmounts,
  type RowAmounts,
} from './utils/accounts';

/** Penanda asal baris: yang ditulis seeder boleh dihapus seeder, yang lain tidak. */
const SEEDED = { source: 'SEED' as const };

const ANCHOR = 'bcasahardjo';

const OPENING: SlotSpec[] = [
  { slot: 'colA', headers: ['payable'], kind: 'text' },
  { slot: 'colB', headers: ['year'], kind: 'int' },
  { slot: 'colC', headers: ['vendor'], kind: 'text' },
  { slot: 'colD', headers: ['keterangan', 'description'], kind: 'text' },
  { slot: 'colE', headers: ['idr'], kind: 'money' },
  { slot: 'colF', headers: ['usd'], kind: 'money' },
];

/**
 * Payable carries two more channels than receivable does - BTN and BRI Tebet -
 * so the two tables cannot share one list even though they look alike.
 */
const CHANNELS: SlotSpec[] = [
  { slot: 'colK', headers: ['bcasahardjo', 'bcasho'], kind: 'money' },
  { slot: 'colL', headers: ['bcajuanda'], kind: 'money' },
  { slot: 'colM', headers: ['mandirimidplaza', 'mandirimp'], kind: 'money' },
  { slot: 'colN', headers: ['btn'], kind: 'money' },
  { slot: 'colO', headers: ['brisahardjo', 'brisho'], kind: 'money' },
  { slot: 'colP', headers: ['britebet'], kind: 'money' },
  { slot: 'colQ', headers: ['cashidr'], kind: 'money' },
  { slot: 'colR', headers: ['noncb', 'noncashbank'], kind: 'money' },
  { slot: 'colS', headers: ['apinandout', 'ppninandout'], kind: 'money' },
];

const OUTSTANDING: SlotSpec[] = [
  { slot: 'colU', headers: ['idr'], kind: 'money' },
  { slot: 'colV', headers: ['usd'], kind: 'money' },
];

export async function seedAccountPayable(prisma: PrismaClient) {
  console.log(`🧾 Seeding ${FISCAL_YEAR} account payable...`);

  const filePath = findWorkbook(['ap', 'payable']);
  if (!filePath) {
    console.warn(
      `⏭️  No account payable workbook in prisma/${DATA_DIR} — skipped, ${FISCAL_YEAR} rows left as they are.`,
    );
    return;
  }

  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets['AP'] ?? wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const headerIndex = rows.findIndex((row) =>
    (row || []).some((cell) => normalizeLabel(cell) === ANCHOR),
  );
  if (headerIndex < 0) {
    console.error(`❌ No header row naming "BCA Sahardjo" in ${filePath} — nothing seeded.`);
    return;
  }

  const labels: any[] = rows[headerIndex] ?? [];
  const groups: any[] = rows[headerIndex - 1] ?? [];
  // Built by index rather than with map: sheet_to_json leaves a hole where a
  // cell is empty, and map skips holes, which would silently lose every label
  // that lives on the row above its column.
  const width = Math.max(labels.length, groups.length);
  const header: any[] = [];
  for (let i = 0; i < width; i++) {
    header[i] = String(labels[i] ?? '').trim() ? labels[i] : (groups[i] ?? '');
  }

  const anchor = header.findIndex((cell) => normalizeLabel(cell) === ANCHOR);
  let outstanding = groups.findIndex((cell) => normalizeLabel(cell) === 'outstanding');
  if (outstanding < 0) {
    outstanding = header.length;
    console.warn('⚠️  No "OUTSTANDING" heading found — outstanding balances will be null.');
  }

  // The payment block a second time, read as accounts rather than as slots, so
  // a column this table has no slot for still lands.
  const accounts = readAccountColumns(header, anchor, outstanding - 1);
  if (accounts.unknown.length > 0) {
    console.error(
      `❌ Heading(s) that name no account we know: ${accounts.unknown.join(', ')}.` +
        ' Add the account under Account & Bank first — nothing seeded.',
    );
    return;
  }

  const opening = buildColumnMapInRange(header, OPENING, 0, anchor - 1);
  const channels = buildColumnMapInRange(header, CHANNELS, anchor, outstanding - 1);
  const closing = buildColumnMapInRange(header, OUTSTANDING, outstanding, header.length);
  const rateIndex = rateColumnAfter(header, opening.indexes['colF']);

  // The two columns before the payment block hold the ledger the payable
  // belongs to ("COGS", "AP Expense") and the project it was spent on. Neither
  // has ever had a heading, so they are read as the anchor's left-hand
  // neighbours: an inserted column on the far left moves them along with it.
  // The ledger and the project it was spent on have never had a heading, so
  // they are placed as the bank block's left-hand neighbours. A book that
  // leaves them out entirely puts figures there instead, and those are not the
  // columns we meant: better an empty ledger than a ledger full of amounts.
  let ledgerIndex = anchor - 3;
  let projectIndex = anchor - 2;
  const sample = rows
    .slice(headerIndex + 1, headerIndex + 60)
    .map((row) => String((row || [])[ledgerIndex] ?? '').trim())
    .filter((v) => v !== '' && v !== '-');
  const wordy = sample.filter((v) => /[a-z]/i.test(v)).length;
  if (ledgerIndex < 0 || (sample.length > 0 && wordy < sample.length / 2)) {
    console.warn(
      `⚠️  No ledger or project column in this workbook — both stored as null.` +
        (sample.length > 0 ? ` Column ${String.fromCharCode(65 + ledgerIndex)} holds figures.` : ''),
    );
    ledgerIndex = -1;
    projectIndex = -1;
  }

  const records: Prisma.AccountPayableCreateManyInput[] = [];
  const perRow: RowAmounts[] = [];
  let stoppedAt = -1;

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (isBlankRow(row)) {
      stoppedAt = i;
      break;
    }

    const record: any = {
      colG: rateIndex === undefined ? null : cleanCurrency(row[rateIndex]),
      colH: ledgerIndex < 0 ? null : cleanString(row[ledgerIndex]),
      colI: projectIndex < 0 ? null : cleanString(row[projectIndex]),
      colJ: '',
      colT: '',
      tagYear: FISCAL_YEAR,
    };
    for (const [map, specs] of [
      [opening, OPENING],
      [channels, CHANNELS],
      [closing, OUTSTANDING],
    ] as [ColumnMap, SlotSpec[]][]) {
      for (const spec of specs) {
        const index = map.indexes[spec.slot];
        record[spec.slot] = index === undefined ? null : readCell(row[index], spec.kind);
      }
    }
    records.push(record);
    perRow.push(readRowAmounts(row, accounts.columns));
  }

  if (records.length === 0) {
    console.warn('⚠️  No payable rows found — nothing seeded.');
    return;
  }

  const removed = await prisma.accountPayable.deleteMany({ where: { tagYear: FISCAL_YEAR, source: 'SEED' } });
  if (removed.count > 0) console.log(`🧹 Cleared ${removed.count} existing ${FISCAL_YEAR} rows.`);

  await prisma.accountPayable.createMany({ data: records.map((r) => ({ ...r, ...SEEDED })) });
  console.log(`✅ Seeded ${records.length} account payable rows for ${FISCAL_YEAR}.`);

  await linkAccountAmounts({
    prisma,
    amountModel: prisma.accountPayableAmount,
    parentModel: prisma.accountPayable,
    parentKey: 'accountPayableId',
    tagYear: FISCAL_YEAR,
    perRow,
  });

  reportLayout(
    [opening, channels, closing],
    [...OPENING, ...CHANNELS, ...OUTSTANDING],
    rateIndex === undefined ? [] : [String(header[rateIndex] ?? '')],
    {
      header,
      rows,
      firstDataRow: headerIndex + 1,
      keptAsRelation: accounts.columns.map((c) => c.header),
    },
  );
  reportTail(rows, stoppedAt);
}
