import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { cleanCurrency, cleanString, excelDateToJSDate } from '../utils/excel';
import {
  findWorkbook,
  DATA_DIR,
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

/** Penanda asal baris: yang ditulis seeder boleh dihapus seeder, yang lain tidak. */
const SEEDED = { source: 'SEED' as const };

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
 * Menemukan baris judul lewat kolom "Invoice No" - bukan lewat "No" di kolom
 * pertama, karena kolom No belum tentu ada. Workbook 2025 memecah judulnya jadi
 * dua baris ("Basic Price", "Management Fee", "PPN" di baris kedua), 2026 satu
 * baris; baris kedua dikenali dari label kolom yang dikenal di dalamnya.
 * Data dimulai sesudah judul - yang bukan invoice disaring per baris.
 */
function readLayout(rows: any[][]): Layout | null {
  const known = new Set(SLOTS.flatMap((spec) => spec.headers));
  const knownCount = (row: any[] | undefined) =>
    (row || []).filter((cell) => known.has(normalizeLabel(cell))).length;

  const headerRow = rows.findIndex((row) => (row || []).some((cell) => normalizeLabel(cell) === 'invoiceno'));
  if (headerRow < 0) return null;

  const hasSubHeader = knownCount(rows[headerRow + 1]) >= 2;
  const firstDataRow = headerRow + (hasSubHeader ? 2 : 1);

  // Where a second heading row exists, its labels are the specific ones.
  const labels = [...(rows[headerRow] || [])];
  if (hasSubHeader) {
    (rows[headerRow + 1] || []).forEach((cell, index) => {
      if (String(cell ?? '').trim() !== '') labels[index] = cell;
    });
  }

  return { headerRow, firstDataRow, labels };
}

export async function seedSales(prisma: PrismaClient, workbook?: XLSX.WorkBook) {
  console.log(`🧾 Seeding ${FISCAL_YEAR} sales invoices...`);

  let wb = workbook;
  if (!wb) {
    const filePath = findWorkbook(['sales']);
    if (!filePath) {
      console.warn(
        `⏭️  No workbook matching ["sales"] in prisma/${DATA_DIR} — skipped.`,
      );
      return;
    }
    wb = XLSX.readFile(filePath);
  }

  const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  const layout = readLayout(rows);
  if (!layout) {
    console.error('❌ No "Invoice No" header found — nothing seeded.');
    return;
  }


  // The bank block a second time, read as accounts rather than as slots, so a
  // column this table has no slot for still lands. It runs from the first bank
  // up to Outstanding, which is where the payment columns stop.
  const firstBank = layout.labels.findIndex((c) => normalizeLabel(c) === 'bcasahardjo');
  // The block ends at the outstanding column, which the 2026 book heads
  // "OUTSTANDING" and the 2025 one simply "IDR".
  const ends = ['outstanding', 'idr'];
  let blockEnd = layout.labels.length;
  for (let i = firstBank + 1; i < layout.labels.length; i++) {
    if (ends.includes(normalizeLabel(layout.labels[i]))) {
      blockEnd = i;
      break;
    }
  }
  // The 2025 book heads both the receivable and the outstanding column "IDR",
  // which no name-based mapping can tell apart. Their positions around the bank
  // block do: one sits before it, the other closes it.
  const labels = [...layout.labels];
  for (let i = 0; i < firstBank; i++) {
    if (normalizeLabel(labels[i]) === 'idr') labels[i] = 'Account Receivable';
  }
  if (normalizeLabel(labels[blockEnd]) === 'idr') labels[blockEnd] = 'Outstanding';

  const map = buildColumnMap(labels, SLOTS);
  const accounts = readAccountColumns(labels, firstBank, blockEnd - 1);
  if (accounts.unknown.length > 0) {
    console.error(
      `❌ Heading(s) that name no account we know: ${accounts.unknown.join(', ')}.` +
        ' Add the account under Account & Bank first — nothing seeded.',
    );
    return;
  }

  const removed = await prisma.salesRecord.deleteMany({ where: { tagYear: FISCAL_YEAR, source: 'SEED' } });
  if (removed.count > 0) console.log(`🧹 Cleared ${removed.count} existing ${FISCAL_YEAR} rows.`);

  // Dibaca sampai baris terakhir sheet - TIDAK berhenti di baris kosong pertama,
  // dan tidak bergantung pada kolom No (belum tentu ada). Sheet 2026 menyisakan
  // nomor 19 dst. sebagai template kosong di tengah lalu datanya berlanjut;
  // berhenti di sana hanya memuat 18 dari 157 invoice.
  // Tiap baris dinilai dari isinya:
  //   - Tanpa teks pengenal sama sekali (invoice, billing to, sales code,
  //     deskripsi): blok total, sub-judul, baris kosong - dilewati. Ini tetap
  //     benar walau baris kosong pemisah sebelum total suatu saat hilang.
  //   - Tanpa nomor invoice DAN semua nominal nol: template/placeholder - dilewati.
  // Invoice bernomor dengan nominal nol tetap dimuat, seperti di workbook.
  const IDENTITY = ['colB', 'colE', 'colF', 'colG'];
  const AMOUNTS = ['colH', 'colI', 'colJ', 'colK'];
  const records: Prisma.SalesRecordCreateManyInput[] = [];
  const perRow: RowAmounts[] = [];
  let skipped = 0;
  let totalsLike = 0;
  for (let i = layout.firstDataRow; i < rows.length; i++) {
    const row = rows[i];
    if (isBlankRow(row)) continue;

    const record: any = { tagYear: FISCAL_YEAR };
    for (const spec of SLOTS) {
      const index = map.indexes[spec.slot];
      record[spec.slot] = index === undefined ? null : convert(row[index], spec.kind);
    }
    const hasText = (slot: string) => String(record[slot] ?? '').trim() !== '';
    const hasAmount = AMOUNTS.some((slot) => Number(record[slot] ?? 0) !== 0);
    if (!IDENTITY.some(hasText)) {
      skipped++;
      if (hasAmount) totalsLike++;
      continue;
    }
    if (!hasText('colB') && !hasAmount) {
      skipped++;
      continue;
    }
    records.push(record);
    perRow.push(readRowAmounts(row, accounts.columns));
  }

  if (records.length === 0) {
    console.warn('⚠️  No invoice rows found — nothing seeded.');
    return;
  }

  await prisma.salesRecord.createMany({ data: records.map((r) => ({ ...r, ...SEEDED })) });
  console.log(
    `✅ Seeded ${records.length} sales invoices for ${FISCAL_YEAR}` +
      ` (${skipped} row(s) skipped: ${totalsLike} total row(s), ${skipped - totalsLike} empty template(s)).`,
  );

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
