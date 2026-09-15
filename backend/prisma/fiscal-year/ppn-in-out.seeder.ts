import { PrismaClient, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { cleanString } from '../seeders/utils/excel';
import {
  DATA_DIR,
  FISCAL_YEAR,
  buildColumnMap,
  findWorkbook,
  isBlankRow,
  normalizeLabel,
  readCell,
  reportLayout,
  reportTail,
  type SlotSpec,
} from './utils/layout';

const ANCHOR = 'nofaktur';

/**
 * Unlike receivable and payable, this sheet has no per-bank columns: every
 * heading names a tax figure or a ledger, so one flat pass is enough.
 *
 * STATUS is deliberately absent. The column exists in the workbook and says
 * WAPU or non-WAPU, but colG is typed as a decimal in the database, so the
 * word cannot be stored there. The WAPU and Non WAPU amount columns already
 * carry the same distinction as numbers.
 */
const SLOTS: SlotSpec[] = [
  { slot: 'colA', headers: ['masa'], kind: 'date' },
  { slot: 'colC', headers: ['nofaktur'], kind: 'text' },
  { slot: 'colD', headers: ['clientsupplier', 'client', 'supplier'], kind: 'text' },
  { slot: 'colF', headers: ['sales'], kind: 'int' },
  { slot: 'colH', headers: ['ppn'], kind: 'money' },
  { slot: 'colI', headers: ['wapu'], kind: 'money' },
  { slot: 'colJ', headers: ['paid'], kind: 'money' },
  { slot: 'colK', headers: ['apppnwapu'], kind: 'money' },
  { slot: 'colM', headers: ['nonwapu'], kind: 'money' },
  { slot: 'colN', headers: ['masukan'], kind: 'money' },
  { slot: 'colO', headers: ['apppnnonwapu'], kind: 'money' },
  { slot: 'colP', headers: ['ledger'], kind: 'text' },
  { slot: 'colQ', headers: ['subledger1'], kind: 'text' },
  { slot: 'colR', headers: ['subledger2'], kind: 'text' },
  { slot: 'colS', headers: ['subledger3'], kind: 'text' },
];

export async function seedPpnInOut2026(prisma: PrismaClient) {
  console.log(`🧾 Seeding ${FISCAL_YEAR} PPN in/out...`);

  const filePath = findWorkbook(['ppn']);
  if (!filePath) {
    console.warn(
      `⏭️  No PPN in/out workbook in prisma/${DATA_DIR} — skipped, ${FISCAL_YEAR} rows left as they are.`,
    );
    return;
  }

  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets['PPN In and Out'] ?? wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const headerIndex = rows.findIndex((row) =>
    (row || []).some((cell) => normalizeLabel(cell) === ANCHOR),
  );
  if (headerIndex < 0) {
    console.error(`❌ No header row naming "No Faktur" in ${filePath} — nothing seeded.`);
    return;
  }

  const header: any[] = rows[headerIndex] ?? [];
  const map = buildColumnMap(header, SLOTS);

  // Two columns have never been given a heading: the one before the invoice
  // number says whether the entry is PPN Keluaran or Masukan, and the one
  // after it holds our own invoice number. Both are read as the anchor's
  // neighbours rather than by a fixed position in the sheet.
  const anchor = header.findIndex((cell) => normalizeLabel(cell) === ANCHOR);
  const kindIndex = anchor - 1;
  const invoiceIndex = anchor + 2;

  const records: Prisma.PpnInOutCreateManyInput[] = [];
  let stoppedAt = -1;

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (isBlankRow(row)) {
      stoppedAt = i;
      break;
    }

    const record: any = {
      colB: kindIndex < 0 ? null : cleanString(row[kindIndex]),
      colE: cleanString(row[invoiceIndex]),
      colG: null,
      colL: '',
      tagYear: FISCAL_YEAR,
    };
    for (const spec of SLOTS) {
      const index = map.indexes[spec.slot];
      record[spec.slot] = index === undefined ? null : readCell(row[index], spec.kind);
    }
    records.push(record);
  }

  if (records.length === 0) {
    console.warn('⚠️  No PPN rows found — nothing seeded.');
    return;
  }

  const removed = await prisma.ppnInOut.deleteMany({ where: { tagYear: FISCAL_YEAR } });
  if (removed.count > 0) console.log(`🧹 Cleared ${removed.count} existing ${FISCAL_YEAR} rows.`);

  await prisma.ppnInOut.createMany({ data: records });
  console.log(`✅ Seeded ${records.length} PPN in/out rows for ${FISCAL_YEAR}.`);

  if (header.some((cell) => normalizeLabel(cell) === 'status')) {
    console.warn('⚠️  STATUS is in the workbook but colG only holds numbers, so it is not stored.');
  }
  reportLayout([map], SLOTS, ['status']);
  reportTail(rows, stoppedAt);
}
