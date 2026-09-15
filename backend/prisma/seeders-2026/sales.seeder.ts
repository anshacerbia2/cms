import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { cleanCurrency, cleanString, excelDateToJSDate } from '../seeders/utils/excel';
import {
  FISCAL_YEAR,
  buildColumnMap,
  isBlankRow,
  isNumeric,
  normalizeLabel,
  type SlotSpec,
} from './utils/layout';
import {
  linkAccountAmounts,
  readAccountColumns,
  readRowAmounts,
  type RowAmounts,
} from './utils/accounts';

const WORKBOOK = 'PCMI-Sales-14Sept26.xlsx';

/**
 * Slots as the database and SalesPage already fix them. The 2026 workbook
 * drops the Mandiri Plasa Mandiri and BRI Tebet payment columns, which in the
 * 2025 layout sat in the middle of the bank block; matching by header name is
 * what stops every bank after them from shifting two columns to the left.
 *
 * colL (Date Received) and colY (a spacer) have no header in either year's
 * workbook, so they are not listed and stay null.
 */
const SLOTS: SlotSpec[] = [
  { slot: 'colA', headers: ['no'], kind: 'text' },
  { slot: 'colB', headers: ['invoiceno'], kind: 'text' },
  { slot: 'colC', headers: ['date'], kind: 'date' },
  { slot: 'colD', headers: ['year'], kind: 'int' },
  { slot: 'colE', headers: ['billingto'], kind: 'text' },
  { slot: 'colF', headers: ['salescode'], kind: 'text' },
  { slot: 'colG', headers: ['description'], kind: 'text' },
  { slot: 'colH', headers: ['basicprice'], kind: 'money' },
  { slot: 'colI', headers: ['managementfee'], kind: 'money' },
  { slot: 'colJ', headers: ['ppn'], kind: 'money' },
  { slot: 'colK', headers: ['accountreceivable'], kind: 'money' },
  { slot: 'colM', headers: ['bcasahardjo'], kind: 'money' },
  { slot: 'colN', headers: ['bcajuanda'], kind: 'money' },
  { slot: 'colO', headers: ['mandirimidplaza'], kind: 'money' },
  { slot: 'colP', headers: ['mandiriplasamandiri'], kind: 'money' },
  { slot: 'colQ', headers: ['britebet'], kind: 'money' },
  { slot: 'colR', headers: ['brisahardjo'], kind: 'money' },
  { slot: 'colS', headers: ['btn'], kind: 'money' },
  { slot: 'colT', headers: ['bankraya'], kind: 'money' },
  { slot: 'colU', headers: ['bni'], kind: 'money' },
  { slot: 'colV', headers: ['cashidr'], kind: 'money' },
  { slot: 'colW', headers: ['noncb'], kind: 'money' },
  { slot: 'colX', headers: ['outstanding'], kind: 'money' },
  { slot: 'colZ', headers: ['apppn'], kind: 'money' },
  { slot: 'colAA', headers: ['pph23'], kind: 'money' },
  { slot: 'colAB', headers: ['wapu'], kind: 'money' },
  { slot: 'colAC', headers: ['nonwapu'], kind: 'money' },
  { slot: 'colAD', headers: ['remarks'], kind: 'text' },
];

function convert(value: any, kind: SlotSpec['kind']) {
  switch (kind) {
    case 'money':
      return cleanCurrency(value);
    case 'date':
      return excelDateToJSDate(value);
    case 'int': {
      const parsed = parseInt(String(value), 10);
      return Number.isNaN(parsed) ? null : parsed;
    }
    default:
      return cleanString(value);
  }
}

type Layout = { headerRow: number; firstDataRow: number; labels: any[] };

/**
 * Finds the "No" header and the first invoice beneath it. The 2025 workbook
 * splits its headings over two rows and the 2026 one uses a single row, so the
 * data is located by the first numbered invoice rather than a fixed offset.
 */
function readLayout(rows: any[][]): Layout | null {
  const headerRow = rows.findIndex((row) => normalizeLabel((row || [])[0]) === 'no');
  if (headerRow < 0) return null;

  let firstDataRow = -1;
  for (let i = headerRow + 1; i < rows.length; i++) {
    if (isNumeric((rows[i] || [])[0])) {
      firstDataRow = i;
      break;
    }
  }
  if (firstDataRow < 0) return null;

  // Where a second heading row exists, its labels are the specific ones.
  const labels = [...(rows[headerRow] || [])];
  if (firstDataRow > headerRow + 1) {
    (rows[headerRow + 1] || []).forEach((cell, index) => {
      if (String(cell ?? '').trim() !== '') labels[index] = cell;
    });
  }

  return { headerRow, firstDataRow, labels };
}

export async function seedSales2026(prisma: PrismaClient, workbook?: XLSX.WorkBook) {
  console.log(`🧾 Seeding ${FISCAL_YEAR} sales invoices...`);

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
  const layout = readLayout(rows);
  if (!layout) {
    console.error('❌ No "No" header with numbered rows beneath it — nothing seeded.');
    return;
  }

  const map = buildColumnMap(layout.labels, SLOTS);

  // The bank block a second time, read as accounts rather than as slots, so a
  // column this table has no slot for still lands. It runs from the first bank
  // up to Outstanding, which is where the payment columns stop.
  const firstBank = layout.labels.findIndex((c) => normalizeLabel(c) === 'bcasahardjo');
  const outstanding = layout.labels.findIndex((c) => normalizeLabel(c) === 'outstanding');
  const accounts = readAccountColumns(
    layout.labels,
    firstBank,
    (outstanding < 0 ? layout.labels.length : outstanding) - 1,
  );
  if (accounts.unknown.length > 0) {
    console.error(
      `❌ Heading(s) that name no account we know: ${accounts.unknown.join(', ')}.` +
        ' Add the account under Account & Bank first — nothing seeded.',
    );
    return;
  }

  const removed = await prisma.salesRecord.deleteMany({ where: { tagYear: FISCAL_YEAR } });
  if (removed.count > 0) console.log(`🧹 Cleared ${removed.count} existing ${FISCAL_YEAR} rows.`);

  // Reads to the first fully blank row, which separates the invoices from the
  // totals block, exactly as the 2025 seeder does.
  const records: Prisma.SalesRecordCreateManyInput[] = [];
  const perRow: RowAmounts[] = [];
  for (let i = layout.firstDataRow; i < rows.length; i++) {
    const row = rows[i];
    if (isBlankRow(row)) break;

    const record: any = { tagYear: FISCAL_YEAR };
    for (const spec of SLOTS) {
      const index = map.indexes[spec.slot];
      record[spec.slot] = index === undefined ? null : convert(row[index], spec.kind);
    }
    records.push(record);
    perRow.push(readRowAmounts(row, accounts.columns));
  }

  if (records.length === 0) {
    console.warn('⚠️  No invoice rows found — nothing seeded.');
    return;
  }

  await prisma.salesRecord.createMany({ data: records });
  console.log(`✅ Seeded ${records.length} sales invoices for ${FISCAL_YEAR}.`);

  await linkAccountAmounts({
    prisma,
    amountModel: prisma.salesRecordAmount,
    parentModel: prisma.salesRecord,
    parentKey: 'salesRecordId',
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
