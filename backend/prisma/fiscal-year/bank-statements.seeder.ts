import { PrismaClient, Prisma, InternalAccountType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import {
  excelDateToJSDate,
  cleanCurrency,
  cleanString,
  isRowEmpty,
} from '../utils/excel';

/**
 * Every row lands in FISCAL_YEAR regardless of the date it carries, matching
 * how the 2025 seeder treats its own workbook.
 */
import { DATA_DIR, FISCAL_YEAR, findWorkbook } from './utils/layout';
import { LedgerDirectory } from '../../src/finance/common/ledger-refs';

/** Penanda asal baris: yang ditulis seeder boleh dihapus seeder, yang lain tidak. */
const SEEDED = { source: 'SEED' as const };

/**
 * Status periode yang ditulis seeder.
 *
 * Dulu selalu CLOSED, termasuk untuk tahun yang sedang berjalan - di produksi
 * 2026 tercatat tutup buku padahal masih dipakai. Tidak satu pun periode di sana
 * yang ditutup orang: `closed_at` dan `closed_by` kosong di kedua puluhnya.
 *
 * Sekarang: tahun yang sudah lewat CLOSED, tahun berjalan ONGOING. Kecuali
 * periodenya memang pernah ditutup lewat tombol Close Year (`closedAt` terisi) -
 * itu keputusan orang, dan seed ulang tidak boleh membukanya kembali.
 */
function periodStatus(closedAt: Date | null): 'CLOSED' | 'ONGOING' {
  if (closedAt) return 'CLOSED';
  return FISCAL_YEAR < new Date().getFullYear() ? 'CLOSED' : 'ONGOING';
}

/** Jarak antar nomor baris, menyisakan ruang untuk menyisip. */
const ROW_NO_GAP = 1000;

const WORKBOOK = 'PCMI-Bank Statements-14Sept26.xlsx';

/**
 * Sheet name -> the InternalAccount it maps to. Keyed the same way as the 2025
 * seeder so both years point at the same account rows.
 *
 * The 2026 workbook dropped the "Mandiri PM" and "BRI Tebet" sheets. They stay
 * listed here so that a sheet reappearing next year is picked up without edits,
 * and so an unknown sheet name is reported rather than silently skipped.
 */
type AccountKey = {
  type: InternalAccountType;
  branch: string;
  holderName: string;
  accountNo: string;
};

const SHEET_TO_ACCOUNT: Record<string, AccountKey> = {
  'BCA Sho': { type: 'BANK', branch: 'Sahardjo', holderName: 'RD Hidianitje', accountNo: '5750 489 666' },
  'BCA Juanda': { type: 'BANK', branch: 'Juanda', holderName: 'PT Panconvince Mitra International', accountNo: '5350 285 999' },
  'Mandiri MP': { type: 'BANK', branch: 'Mid Plaza', holderName: 'PT Panconvince Mitra International', accountNo: '122 000 487 5566' },
  'Mandiri PM': { type: 'BANK', branch: 'PM', holderName: 'PT Panconvince Mitra International', accountNo: '' },
  'BRI Sho': { type: 'BANK', branch: 'Sahardjo', holderName: 'PT Panconvince Mitra International', accountNo: '1125 0100 0255 301' },
  'BRI Tebet': { type: 'BANK', branch: 'Tebet', holderName: 'PT Panconvince Mitra International', accountNo: '' },
  'BTN': { type: 'BANK', branch: 'Sahardjo', holderName: 'PT Panconvince Mitra International', accountNo: '00001 01 30 001293 5' },
  'Raya': { type: 'BANK', branch: '', holderName: 'PT Panconvince Mitra International', accountNo: '001 001 001 907 409' },
  'BNI': { type: 'BANK', branch: '', holderName: 'PT Panconvince Mitra International', accountNo: '' },
  'Cash IDR': { type: 'CASH', branch: '', holderName: 'Meery Ferdian', accountNo: '' },
  'Non CB': { type: 'OTHER', branch: '', holderName: 'Non Cash & Bank', accountNo: '' },
};

/** Column A of the header row, which is spelled either way across sheets. */
const DATE_HEADERS = ['tanggal', 'tgl'];

type SheetLayout = {
  /** Row index holding "Tanggal"/"Tgl" and, in column E, the opening balance. */
  headerRow: number;
  /** First row index carrying a transaction. */
  firstDataRow: number;
  /** Opening balance as written in the workbook, or null when the cell is blank. */
  openingBalance: Prisma.Decimal | null;
  /** The label next to it, e.g. "Saldo Akhir Tahun 2025". Reported, never parsed. */
  openingLabel: string;
};

/**
 * Locates the header instead of assuming row 4. The 2026 workbooks shifted rows
 * on three of the four files, so every 2026 seeder finds its own anchor.
 */
function readLayout(rows: any[][]): SheetLayout | null {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const first = cleanString(rows[i]?.[0]).toLowerCase();
    if (!DATE_HEADERS.includes(first)) continue;

    return {
      headerRow: i,
      firstDataRow: i + 1,
      openingBalance: cleanCurrency(rows[i][4]),
      openingLabel: cleanString(rows[i][1]),
    };
  }
  return null;
}

type ParsedRow = {
  /** Posisi di dalam sheet. */
  seq: number;
  debit: Prisma.Decimal | null;
  credit: Prisma.Decimal | null;
  /** Running balance as the workbook itself computed it, for cross-checking. */
  sheetBalance: Prisma.Decimal | null;
  /** colE stays null until the running balance is computed below. */
  data: Omit<Prisma.FinancialTransactionCreateManyInput, 'internalAccountId'>;
};

/**
 * Reads one sheet up to the first fully blank row. In every 2026 sheet that
 * blank row is the separator before the totals block, so it is where the
 * transactions genuinely end. `endRow` is that blank row.
 */
function parseSheet(rows: any[][], layout: SheetLayout): { parsed: ParsedRow[]; endRow: number } {
  const parsed: ParsedRow[] = [];
  let endRow = rows.length;

  for (let i = layout.firstDataRow; i < rows.length; i++) {
    const row = rows[i];
    if (isRowEmpty(row)) {
      endRow = i;
      break;
    }

    // Sel tanggal yang kosong disimpan kosong. Dulu di sini tanggal baris
    // sebelumnya diwariskan turun, dan baris paling awal yang belum kebagian
    // tanggal apa pun diberi 1 Januari - dua-duanya mengarang tanggal yang
    // tidak ditulis siapa pun. Di Non CB itu 2.866 baris pada 2025 dan 1.662
    // pada 2026: transaksi yang berdiri sendiri, memang tidak diberi tanggal
    // di buku non-kas, bukan sambungan dari baris di atasnya.
    const rowDate = excelDateToJSDate(row[0]);

    const debit = cleanCurrency(row[2]);
    const credit = cleanCurrency(row[3]);

    parsed.push({
      seq: parsed.length,
      debit,
      credit,
      sheetBalance: cleanCurrency(row[4]),
      data: {
        colA: rowDate,
        colB: cleanString(row[1]),
        colC: debit,
        colD: credit,
        colE: null,
        colF: cleanString(row[5]),
        colG: cleanString(row[6]),
        colH: cleanString(row[7]),
        colI: cleanString(row[8]),
        tagYear: FISCAL_YEAR,
        // Berjarak 1000 supaya ada ruang menyisip di antara dua baris workbook
        // tanpa menyentuh baris mana pun. Sheet dibaca turun satu per satu dan
        // urutannya tidak diapa-apakan lagi di bawah, jadi ini otomatis sama
        // dengan urutan baris di file.
        rowNo: (parsed.length + 1) * ROW_NO_GAP,
      },
    });
  }

  return { parsed, endRow };
}

const TOLERANCE = new Prisma.Decimal(1);

/**
 * Cross-checks what we parsed against the two figures the workbook states for
 * itself. Neither is reliable on its own: "Non CB" zeroes its balance column on
 * the closing "Lebih Bayar" row, and "Mandiri MP" carries a stale totals row.
 * They do not fail together unless the debit/credit columns were misread, which
 * is the mistake a shifted layout actually produces.
 *
 * Returns a warning when every available check fails, or null when it passes.
 */
function verify(
  rows: any[][],
  endRow: number,
  parsed: ParsedRow[],
  closing: Prisma.Decimal,
): string | null {
  const sumDebit = parsed.reduce((a, r) => a.plus(r.debit ?? 0), new Prisma.Decimal(0));
  const sumCredit = parsed.reduce((a, r) => a.plus(r.credit ?? 0), new Prisma.Decimal(0));

  const checks: { name: string; detail: string }[] = [];

  // The totals block sits a row or two below the data, as [_, _, debit, credit].
  for (let i = endRow; i < Math.min(endRow + 4, rows.length); i++) {
    const debit = cleanCurrency(rows[i]?.[2]);
    const credit = cleanCurrency(rows[i]?.[3]);
    if (debit === null || credit === null) continue;

    if (
      sumDebit.minus(debit).abs().lessThanOrEqualTo(TOLERANCE) &&
      sumCredit.minus(credit).abs().lessThanOrEqualTo(TOLERANCE)
    ) {
      return null;
    }
    checks.push({
      name: 'totals row',
      detail: `debit ${sumDebit.toFixed(2)} vs ${debit.toFixed(2)}, credit ${sumCredit.toFixed(2)} vs ${credit.toFixed(2)}`,
    });
    break;
  }

  const lastBalance = [...parsed].reverse().find((r) => r.sheetBalance !== null)?.sheetBalance;
  if (lastBalance) {
    if (closing.minus(lastBalance).abs().lessThanOrEqualTo(TOLERANCE)) return null;
    checks.push({
      name: 'last row balance',
      detail: `closing ${closing.toFixed(2)} vs ${lastBalance.toFixed(2)}`,
    });
  }

  if (checks.length === 0) return 'nothing in the workbook to check the parsed figures against.';
  return checks.map((c) => `${c.name} disagrees (${c.detail})`).join('; ') + '.';
}

/** `workbook` overrides the file on disk, which the layout tests rely on. */
export async function seedBankStatements(prisma: PrismaClient, workbook?: XLSX.WorkBook) {
  console.log(`🏛️  Seeding ${FISCAL_YEAR} bank statements (ledger)...`);

  let wb = workbook;
  if (!wb) {
    const filePath = findWorkbook(['statements', 'mutation']);
    if (!filePath) {
      console.warn(
        `⏭️  No workbook matching ["statements", "mutation"] in prisma/${DATA_DIR} — skipped.`,
      );
      return;
    }
    wb = XLSX.readFile(filePath);
  }

  // Scoped to this fiscal year so a re-run replaces 2026 and leaves 2025 intact.
  const removed = await prisma.financialTransaction.deleteMany({ where: { tagYear: FISCAL_YEAR, source: 'SEED' } });
  if (removed.count > 0) {
    console.log(`🧹 Cleared ${removed.count} existing ${FISCAL_YEAR} transactions.`);
  }

  const warnings: string[] = [];
  // Ledger/Sub Ledger 1 dari workbook dipetakan ke master. Ejaan yang belum ada
  // dibuat - seed tidak boleh membuang data - dan disebutkan di akhir.
  const ledgers = await LedgerDirectory.load(prisma);

  for (const sheetName of wb.SheetNames) {
    const mapping = SHEET_TO_ACCOUNT[sheetName];
    if (!mapping) {
      warnings.push(`Sheet "${sheetName}" has no account mapping — not seeded.`);
      continue;
    }

    const internalAccount = await prisma.internalAccount.findUnique({
      where: {
        accountNo_type_holderName_branch: mapping,
      },
    });

    if (!internalAccount) {
      warnings.push(`Internal account for "${sheetName}" is missing — run the bank master seeder first.`);
      continue;
    }

    const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
    const layout = readLayout(rows);
    if (!layout) {
      warnings.push(`Sheet "${sheetName}" has no "Tanggal"/"Tgl" header row — not seeded.`);
      continue;
    }

    if (layout.openingBalance === null) {
      warnings.push(`Sheet "${sheetName}" has a blank opening balance — treated as 0.`);
    }
    const opening = layout.openingBalance ?? new Prisma.Decimal(0);

    const { parsed, endRow } = parseSheet(rows, layout);
    if (parsed.length === 0) {
      warnings.push(`Sheet "${sheetName}" has no transaction rows.`);
      continue;
    }

    // Kept in the order the sheet lists them, which is the order its own balance
    // column is computed in: E5 = E4 - C5 + D5, row after row. Sorting by date
    // first looked tidier and reproduced that column on 34 of Non CB's 2759
    // rows, against 2507 for the sheet's own order - and it moved every one of
    // that sheet's rows away from where the accountant put them.
    const ordered = parsed;

    let running = opening;
    for (const row of ordered) {
      running = running.plus(row.credit ?? 0).minus(row.debit ?? 0);
      row.data.colE = running;
      const ref = await ledgers.resolve({ colF: row.data.colF, colG: row.data.colG }, { create: true });
      Object.assign(row.data, {
        ledgerId: ref.ledgerId,
        subLedgerId: ref.subLedgerId,
        colF: ref.colF ?? '',
        colG: ref.colG ?? '',
      });
    }

    const mismatch = verify(rows, endRow, parsed, running);
    if (mismatch) warnings.push(`Sheet "${sheetName}": ${mismatch}`);

    await createInChunks(
      prisma,
      ordered.map((r) => ({ ...r.data, internalAccountId: internalAccount.id })),
    );

    // Baris yang diketik lewat aplikasi selamat dari penghapusan di atas, jadi
    // sekarang ia harus ditaruh kembali di belakang barisan workbook yang baru.
    // Nomor lamanya tidak bisa dipakai: kalau workbook bertambah panjang, nomor
    // itu sekarang jatuh di tengah-tengah baris yang baru dimuat.
    const appended = await prisma.financialTransaction.findMany({
      where: { internalAccountId: internalAccount.id, tagYear: FISCAL_YEAR, source: 'APP' },
      orderBy: [{ rowNo: 'asc' }, { id: 'asc' }],
    });

    let tail = ordered.length * ROW_NO_GAP;
    for (const row of appended) {
      tail += ROW_NO_GAP;
      running = running.plus(row.colD ?? 0).minus(row.colC ?? 0);
      await prisma.financialTransaction.update({
        where: { id: row.id },
        data: { rowNo: tail, colE: running },
      });
    }

    const periodKey = { internalAccountId: internalAccount.id, year: FISCAL_YEAR };
    const existingPeriod = await prisma.fiscalPeriod.findUnique({
      where: { internalAccountId_year: periodKey },
      select: { closedAt: true },
    });
    const status = periodStatus(existingPeriod?.closedAt ?? null);

    await prisma.fiscalPeriod.upsert({
      where: { internalAccountId_year: periodKey },
      // `running` sudah mencakup baris aplikasi, jadi saldo penutup di sini
      // menghitung seluruh isi rekening - bukan cuma yang ada di workbook.
      update: { openingBalance: opening, closingBalance: running, status },
      create: { ...periodKey, openingBalance: opening, closingBalance: running, status },
    });

    console.log(
      `✅ ${sheetName.padEnd(12)} ${String(ordered.length).padStart(5)} rows` +
        (appended.length > 0 ? ` +${appended.length} app` : '') +
        ` | opening ${opening.toFixed(2)} → closing ${running.toFixed(2)}` +
        ` | "${layout.openingLabel}"`,
    );
  }

  const unseeded = Object.keys(SHEET_TO_ACCOUNT).filter((name) => !wb.SheetNames.includes(name));
  if (unseeded.length > 0) {
    warnings.push(`Not present in this workbook, so unchanged for ${FISCAL_YEAR}: ${unseeded.join(', ')}.`);
  }

  if (ledgers.created.length > 0) {
    console.log(`📒 Ditambahkan ke master Ledger dari workbook: ${ledgers.created.join(', ')}.`);
  }
  for (const warning of warnings) console.warn(`⚠️  ${warning}`);
}

/** Postgres caps bind parameters per statement, and "Non CB" alone is ~2,700 rows. */
async function createInChunks(
  prisma: PrismaClient,
  data: Prisma.FinancialTransactionCreateManyInput[],
  size = 1000,
) {
  for (let i = 0; i < data.length; i += size) {
    await prisma.financialTransaction.createMany({ data: data.slice(i, i + size).map((r) => ({ ...r, ...SEEDED })) });
  }
}
