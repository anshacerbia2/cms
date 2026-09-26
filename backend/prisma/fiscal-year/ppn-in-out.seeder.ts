import { PrismaClient, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { cleanString } from '../utils/excel';
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

/** Penanda asal baris: yang ditulis seeder boleh dihapus seeder, yang lain tidak. */
const SEEDED = { source: 'SEED' as const };

const ANCHOR = 'nofaktur';

/**
 * Unlike receivable and payable, this sheet has no per-bank columns: every
 * heading names a tax figure or a ledger, so one flat pass is enough.
 *
 * The 2025 and 2026 books share the same nineteen columns in the same order,
 * but some headings changed and so did what sits under them. Columns are found
 * by heading, so each book lands in the right slot on its own:
 *
 *   - "Client / Supplier" became "CUSTOMER / VENDOR" (same data).
 *   - "SALES" held a year in 2025; 2026 put "DPP PPN", an amount, in its
 *     place. They are different figures, so they have different slots.
 *   - STATUS says WAPU / Non WAPU / Masukan / Pembayaran in 2025 and
 *     Paid / UnPaid / CLAIMED in 2026. Stored as written, both.
 *   - PAID is negative in 2025 and positive in 2026; see paidSign().
 */
const SLOTS: SlotSpec[] = [
  { slot: 'colA', headers: ['masa'], kind: 'date' },
  { slot: 'colC', headers: ['nofaktur'], kind: 'text' },
  {
    slot: 'colD',
    headers: ['clientsupplier', 'customervendor', 'client', 'customer', 'supplier', 'vendor'],
    kind: 'text',
  },
  { slot: 'colF', headers: ['sales'], kind: 'int' },
  { slot: 'dpp', headers: ['dppppn', 'dpp'], kind: 'money' },
  { slot: 'status', headers: ['status'], kind: 'text' },
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

/** Selisih pembulatan yang masih dianggap sama saat mencocokkan rumus K. */
const TOLERANCE = 1;

/**
 * Which way round this book writes PAID.
 *
 * Both books mean the same thing - a payment lowers AP PPN WAPU - but put the
 * minus in different cells: 2025 has PAID = -WAPU and K = WAPU + PAID, 2026
 * has PAID = WAPU and K = WAPU - PAID. The table keeps the 2026 way, so a
 * 2025 book has its PAID flipped.
 *
 * The heading is PAID in both, so the only thing that tells them apart is the
 * figure in K. Each row with a payment is checked against both formulas; a
 * book that answers to both is refused rather than guessed at.
 */
function paidSign(records: any[]): { sign: 1 | -1 } | { error: string } {
  let positive = 0;
  let negative = 0;
  for (const r of records) {
    if (!r.colJ || r.colJ.isZero()) continue;
    const wapu = r.colI ?? new Prisma.Decimal(0);
    const k = r.colK ?? new Prisma.Decimal(0);
    if (wapu.minus(r.colJ).minus(k).abs().lte(TOLERANCE)) positive++;
    else if (wapu.plus(r.colJ).minus(k).abs().lte(TOLERANCE)) negative++;
  }
  if (positive > 0 && negative > 0) {
    return {
      error:
        `PAID is written both ways in this book: ${positive} rows with AP PPN WAPU = WAPU - PAID, ` +
        `${negative} with AP PPN WAPU = WAPU + PAID.`,
    };
  }
  return { sign: negative > 0 ? -1 : 1 };
}

export async function seedPpnInOut(prisma: PrismaClient) {
  console.log(`🧾 Seeding ${FISCAL_YEAR} PPN in/out...`);

  const filePath = findWorkbook(['ppn']);
  if (!filePath) {
    console.warn(
      `⏭️  No PPN in/out workbook in prisma/${DATA_DIR} — skipped, ${FISCAL_YEAR} rows left as they are.`,
    );
    return;
  }

  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets['PPN In and Out'] ?? wb.Sheets['PpnInOut'] ?? wb.Sheets[wb.SheetNames[0]];
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

  // Two columns had no heading in 2025: the one before the invoice number says
  // whether the entry is PPN Keluaran or Masukan, and the one after it holds
  // our own invoice number. 2026 named them (JENIS PPN, INVOICE NO) but kept
  // them in place, so both are still read as the anchor's neighbours.
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

  // The column saying which side of PPN a row is, is read as the neighbour of
  // "No Faktur". Every value names PPN one way or another, so a column that
  // does not is the wrong one.
  const kinds = records
    .map((r: any) => String(r.colB ?? '').trim())
    .filter((v: string) => v !== '' && v !== '-');
  const mentionsPpn = kinds.filter((v: string) => /ppn/i.test(v)).length;
  if (kinds.length > 0 && mentionsPpn < kinds.length / 2) {
    const sample = [...new Set(kinds)].slice(0, 5).join(', ');
    console.error(
      `❌ Column ${String.fromCharCode(65 + kindIndex)} should say which side of PPN but holds: ${sample}.` +
        `\n   Only ${mentionsPpn} of ${kinds.length} mention PPN. Nothing seeded.`,
    );
    return;
  }

  const paid = paidSign(records);
  if ('error' in paid) {
    console.error(`❌ ${paid.error} Nothing seeded.`);
    return;
  }
  if (paid.sign < 0) {
    for (const r of records as any[]) if (r.colJ && !r.colJ.isZero()) r.colJ = r.colJ.negated();
    console.log('↔️  PAID is negative in this book; stored positive like 2026.');
  }

  const removed = await prisma.ppnInOut.deleteMany({ where: { tagYear: FISCAL_YEAR, source: 'SEED' } });
  if (removed.count > 0) console.log(`🧹 Cleared ${removed.count} existing ${FISCAL_YEAR} rows.`);

  await prisma.ppnInOut.createMany({ data: records.map((r) => ({ ...r, ...SEEDED })) });
  console.log(`✅ Seeded ${records.length} PPN in/out rows for ${FISCAL_YEAR}.`);

  reportLayout([map], SLOTS, ['jenisppn', 'invoiceno', 'blank']);
  reportTail(rows, stoppedAt);
}
