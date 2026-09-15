import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { cleanCurrency, cleanString } from '../seeders/utils/excel';
import {
  FISCAL_YEAR,
  buildColumnMap,
  isBlankRow,
  normalizeLabel,
  type SlotSpec,
} from './utils/layout';
import {
  linkAccountAmounts,
  readAccountColumns,
  readRowAmounts,
  type RowAmounts,
} from './utils/accounts';

const WORKBOOK = 'PCMI-InterAccount-14Sept26.xlsx';

/**
 * The account columns, in the order the database and the UI already fix them
 * (see InterAccountTable's column list). The 2026 workbook drops BJB, Mandiri
 * Plasa Mandiri and PPn In and Out; matching on the header name keeps every
 * remaining account in the column the UI labels for it, and leaves the three
 * dropped ones null rather than shifting the rest.
 */
const SLOTS: SlotSpec[] = [
  { slot: 'colC', headers: ['bcasahardjo'], kind: 'money' },
  { slot: 'colD', headers: ['bcajuanda'], kind: 'money' },
  { slot: 'colE', headers: ['mandirimidplaza'], kind: 'money' },
  { slot: 'colF', headers: ['brisahardjo'], kind: 'money' },
  { slot: 'colG', headers: ['btn'], kind: 'money' },
  { slot: 'colH', headers: ['bjb'], kind: 'money' },
  { slot: 'colI', headers: ['bankraya'], kind: 'money' },
  { slot: 'colJ', headers: ['britebet'], kind: 'money' },
  { slot: 'colK', headers: ['mandiriplasamandiri', 'manidiriplazamandiri'], kind: 'money' },
  { slot: 'colL', headers: ['bni'], kind: 'money' },
  { slot: 'colM', headers: ['cashidr'], kind: 'money' },
  { slot: 'colN', headers: ['noncashbank'], kind: 'money' },
  { slot: 'colO', headers: ['ppninandout'], kind: 'money' },
];

/** The header row is the one naming the first account column. */
function findHeaderRow(rows: any[][]): number {
  return rows.findIndex((row) =>
    (row || []).some((cell) => normalizeLabel(cell) === 'bcasahardjo'),
  );
}

export async function seedInterAccount2026(prisma: PrismaClient, workbook?: XLSX.WorkBook) {
  console.log(`🔁 Seeding ${FISCAL_YEAR} inter-account matrix...`);

  let wb = workbook;
  if (!wb) {
    const filePath = path.join(process.cwd(), 'prisma', 'seed-data-2026', WORKBOOK);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Workbook not found at: ${filePath}`);
      return;
    }
    wb = XLSX.readFile(filePath);
  }

  const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  const headerRow = findHeaderRow(rows);
  if (headerRow < 0) {
    console.error('❌ No header row naming "BCA Sahardjo" — nothing seeded.');
    return;
  }

  const header: any[] = rows[headerRow];
  const map = buildColumnMap(header, SLOTS);

  // Read the same block a second time as a list of accounts. A column with no
  // slot still lands this way, which is the whole point of the relation.
  const anchor = header.findIndex((cell) => normalizeLabel(cell) === 'bcasahardjo');
  const accounts = readAccountColumns(header, anchor, header.length - 1);
  if (accounts.unknown.length > 0) {
    console.error(
      `❌ Heading(s) that name no account we know: ${accounts.unknown.join(', ')}.` +
        ' Add the account under Account & Bank first — nothing seeded.',
    );
    return;
  }

  const removed = await prisma.interAccount.deleteMany({ where: { tagYear: FISCAL_YEAR } });
  if (removed.count > 0) console.log(`🧹 Cleared ${removed.count} existing ${FISCAL_YEAR} rows.`);

  // A transfer row is one that names the pair, e.g. "BCA Sahardjo to BTN".
  // The totals below the matrix leave that first column empty, so they are
  // skipped without needing to guess where the data stops.
  const records: Prisma.InterAccountCreateManyInput[] = [];
  const perRow: RowAmounts[] = [];
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (isBlankRow(row)) continue;
    const label = cleanString(row[0]);
    if (label === '') continue;

    const record: any = { colA: '', colB: label, tagYear: FISCAL_YEAR };
    for (const spec of SLOTS) {
      const index = map.indexes[spec.slot];
      record[spec.slot] = index === undefined ? null : cleanCurrency(row[index]);
    }
    records.push(record);
    perRow.push(readRowAmounts(row, accounts.columns));
  }

  if (records.length === 0) {
    console.warn('⚠️  No transfer rows found — nothing seeded.');
    return;
  }

  await prisma.interAccount.createMany({ data: records });
  console.log(`✅ Seeded ${records.length} inter-account rows for ${FISCAL_YEAR}.`);

  await linkAccountAmounts({
    prisma,
    amountModel: prisma.interAccountAmount,
    parentModel: prisma.interAccount,
    parentKey: 'interAccountId',
    tagYear: FISCAL_YEAR,
    perRow,
  });

  if (map.missing.length > 0) {
    const names = map.missing
      .map((s) => `${s} (${SLOTS.find((x) => x.slot === s)!.headers[0]})`)
      .join(', ');
    console.warn(`⚠️  Not in this workbook, stored as null: ${names}`);
  }
  if (map.unclaimed.length > 0) {
    console.warn(`⚠️  Header(s) with no column mapping, ignored: ${map.unclaimed.join(', ')}`);
  }
}
