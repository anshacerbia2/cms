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
  readCell,
  reportLayout,
  reportTail,
  type ColumnMap,
  type SlotSpec,
} from './utils/layout';
import {
  linkAccountAmounts,
  readAccountColumns,
  readRowAmounts,
  type RowAmounts,
} from './utils/accounts';

/** The first account column. Everything else is placed relative to it. */
const ANCHOR = 'bcasahardjo';

/**
 * Columns left of the account block: who owes what, and the balance carried in
 * from last year. "IDR" names both this balance and the outstanding one on the
 * far right, which is why each block is matched within its own window.
 */
const OPENING: SlotSpec[] = [
  { slot: 'colE', headers: ['description'], kind: 'text' },
  { slot: 'colF', headers: ['idr'], kind: 'money' },
  { slot: 'colG', headers: ['usd'], kind: 'money' },
];

/**
 * The payment channels. Matching on the name means a workbook that drops one
 * leaves that slot null instead of shifting every channel after it by one.
 */
const CHANNELS: SlotSpec[] = [
  { slot: 'colJ', headers: ['bcasahardjo', 'bcasho'], kind: 'money' },
  { slot: 'colK', headers: ['bcajuanda'], kind: 'money' },
  { slot: 'colL', headers: ['mandirimp', 'mandirimidplaza'], kind: 'money' },
  { slot: 'colM', headers: ['brisho', 'brisahardjo'], kind: 'money' },
  { slot: 'colN', headers: ['cashidr'], kind: 'money' },
  { slot: 'colO', headers: ['noncb', 'noncashbank'], kind: 'money' },
  { slot: 'colP', headers: ['ppninandout'], kind: 'money' },
];

const OUTSTANDING: SlotSpec[] = [
  { slot: 'colR', headers: ['idr'], kind: 'money' },
  { slot: 'colS', headers: ['usd'], kind: 'money' },
];

export async function seedAccountReceivable(prisma: PrismaClient) {
  console.log(`🧾 Seeding ${FISCAL_YEAR} account receivable...`);

  const filePath = findWorkbook(['ar', 'receivable', 'receiveable']);
  if (!filePath) {
    console.warn(
      `⏭️  No account receivable workbook in prisma/${DATA_DIR} — skipped, ${FISCAL_YEAR} rows left as they are.`,
    );
    return;
  }

  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets['AR'] ?? wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const headerIndex = rows.findIndex((row) =>
    (row || []).some((cell) => normalizeLabel(cell) === ANCHOR),
  );
  if (headerIndex < 0) {
    console.error(`❌ No header row naming "BCA Sahardjo" in ${filePath} — nothing seeded.`);
    return;
  }

  // A label may sit on the row above its column ("DESCRIPTION", "OUTSTANDING")
  // rather than on the header row itself, so read the pair as one row.
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
  // "OUTSTANDING" carries no year, unlike "END OF 2024" beside it, so it is the
  // one boundary marker that survives a new book.
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
  const rateIndex = rateColumnAfter(header, opening.indexes['colG']);

  const records: Prisma.AccountReceivableCreateManyInput[] = [];
  const perRow: RowAmounts[] = [];
  let stoppedAt = -1;

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    // The sheet continues past the ledger with summary blocks; the blank row
    // between them is where the entries end.
    if (isBlankRow(row)) {
      stoppedAt = i;
      break;
    }

    const record: any = {
      colA: '',
      // These three carry no heading in any book, so they are read by position
      // from the left edge: type, year, then who owes it.
      colB: cleanString(row[1]),
      colC: cleanString(row[2]),
      colD: cleanString(row[3]),
      colI: '',
      colQ: '',
      colH: rateIndex === undefined ? null : cleanCurrency(row[rateIndex]),
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
    console.warn('⚠️  No receivable rows found — nothing seeded.');
    return;
  }

  const removed = await prisma.accountReceivable.deleteMany({ where: { tagYear: FISCAL_YEAR } });
  if (removed.count > 0) console.log(`🧹 Cleared ${removed.count} existing ${FISCAL_YEAR} rows.`);

  await prisma.accountReceivable.createMany({ data: records });
  console.log(`✅ Seeded ${records.length} account receivable rows for ${FISCAL_YEAR}.`);

  await linkAccountAmounts({
    prisma,
    amountModel: prisma.accountReceivableAmount,
    parentModel: prisma.accountReceivable,
    parentKey: 'accountReceivableId',
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
