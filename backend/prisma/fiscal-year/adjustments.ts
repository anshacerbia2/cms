import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { FISCAL_YEAR } from './utils/layout';
import { LedgerDirectory } from '../../src/finance/common/ledger-refs';

/**
 * Menerapkan kembali suntingan yang dibuat lewat aplikasi pada baris milik seeder.
 *
 * Baris yang DITAMBAH lewat aplikasi tidak lewat sini - kolom `source` sudah
 * menjaganya, dan itu yang menangani sebagian besar kasus. Yang tersisa adalah
 * nilai yang diubah pada baris yang berasal dari workbook: baris itu dihapus dan
 * dimuat ulang setiap seed, jadi suntingannya selalu kembali ke angka workbook.
 *
 * Barisnya dikenali dari POSISI di dalam tahun itu, karena seeder memasukkan
 * menurut urutan workbook dan `id` berubah setiap seed ulang. Posisi saja rapuh
 * kalau workbook-nya bergeser, jadi setiap suntingan membawa `match`: beberapa
 * nilai yang harus dipunyai baris itu sebelum disentuh. Kalau tidak cocok,
 * suntingan dilewati dengan peringatan - lebih baik satu angka tertinggal
 * daripada menimpa baris yang salah tanpa ada yang tahu.
 */

type Edit = {
  table: string;
  why?: string;
  /** Nilai yang harus dipunyai baris itu. Harus menunjuk tepat satu baris. */
  match: Record<string, string | null>;
  /** Barisnya memang kembar dan semuanya disunting sama. */
  all?: boolean;
  set: Record<string, string | null>;
};

type Insert = {
  table: string;
  /** Hanya untuk financial_transactions: nama rekening, karena id-nya bisa berbeda. */
  account?: string;
  data: Record<string, unknown>;
};

type Overlay = { year: number; note?: string; inserts?: Insert[]; edits?: Edit[] };

/** Tabel yang boleh disentuh, dipetakan ke model Prisma-nya. */
const MODELS: Record<string, (p: PrismaClient) => any> = {
  financial_transactions: (p) => p.financialTransaction,
  account_receivables: (p) => p.accountReceivable,
  account_payables: (p) => p.accountPayable,
  sales_records: (p) => p.salesRecord,
  inter_account: (p) => p.interAccount,
  depreciation: (p) => p.depreciation,
  ppn_in_out: (p) => p.ppnInOut,
};

/** Angka dibandingkan sebagai angka; sisanya sebagai teks. Null cocok dengan kosong. */
function same(actual: unknown, expected: string | null): boolean {
  if (expected === null) return actual === null || actual === undefined || actual === '';
  if (actual === null || actual === undefined) return false;
  const a = Number(String(actual));
  const b = Number(expected);
  if (!Number.isNaN(a) && !Number.isNaN(b)) return Math.abs(a - b) < 0.005;
  return String(actual).trim() === expected.trim();
}

/**
 * Mengutip nilai untuk SQL.
 *
 * Hanya angka sungguhan yang ditulis telanjang. String yang kebetulan berisi
 * angka tetap dikutip: kolomnya mungkin bertipe teks, dan `kolom_teks = 243000`
 * ditolak Postgres. Literal berkutip aman untuk keduanya - Postgres mengecornya
 * ke tipe kolom itu sendiri.
 */
function literal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

/**
 * Menaruh kembali baris yang diketik lewat aplikasi ke database yang baru dibangun.
 *
 * Di database yang sudah berisi, baris ini tidak perlu diapa-apakan - kolom
 * `source` sudah menjaganya dari penghapusan. Yang membutuhkan ini adalah
 * database yang dibangun dari nol: baris itu tidak ada di workbook manapun,
 * jadi tanpa dicatat di sini ia tidak akan pernah ada di sana.
 *
 * Dilewati kalau barisnya sudah ada, jadi aman dipanggil setiap seed.
 */
async function applyInserts(prisma: PrismaClient, inserts: Insert[], ledgers: LedgerDirectory) {
  let added = 0;
  let present = 0;

  for (const ins of inserts) {
    const cols: Record<string, unknown> = { ...ins.data, tagYear: FISCAL_YEAR };

    if (ins.account) {
      const account = await prisma.internalAccount.findFirst({
        where: { displayName: ins.account },
        select: { id: true },
      });
      if (!account) {
        console.warn(`   ⚠️  dilewati: rekening "${ins.account}" tidak ada`);
        continue;
      }
      cols.internal_account_id = Number(account.id);
    }

    if (ins.table === 'financial_transactions') {
      // Ledger ke master: nama dikanonkan dan FK ikut terisi.
      const ref = await ledgers.resolve(
        { colF: cols.col_f as string, colG: cols.col_g as string },
        { create: true },
      );
      cols.col_f = ref.colF ?? '';
      cols.col_g = ref.colG ?? '';
      cols.ledger_id = ref.ledgerId === null ? null : Number(ref.ledgerId);
      cols.sub_ledger_id = ref.subLedgerId === null ? null : Number(ref.subLedgerId);
    }

    // Sudah ada? Dicocokkan dari isinya, karena id berubah tiap seed ulang.
    const where = Object.entries(cols)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${/[A-Z]/.test(k) ? `"${k}"` : k} = ${literal(v)}`)
      .join(' AND ');
    const [{ n }] = await prisma.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM ${ins.table} WHERE ${where}`,
    );
    if (n > 0) {
      present++;
      continue;
    }

    if (ins.table === 'financial_transactions') {
      // Ditaruh di ujung rekeningnya, meneruskan nomor baris terakhir.
      const [{ tail }] = await prisma.$queryRawUnsafe<{ tail: number }[]>(
        `SELECT coalesce(max(row_no), 0)::int AS tail FROM financial_transactions
          WHERE internal_account_id = ${cols.internal_account_id} AND "tagYear" = ${FISCAL_YEAR}`,
      );
      cols.row_no = tail + 1;
    }

    const names = Object.keys(cols).map((k) => (/[A-Z]/.test(k) ? `"${k}"` : k));
    const values = Object.values(cols).map(literal);
    await prisma.$executeRawUnsafe(
      `INSERT INTO ${ins.table} (${names.join(', ')}, source, created_at, updated_at)
       VALUES (${values.join(', ')}, 'APP', now(), now())`,
    );
    added++;
  }

  if (added > 0) console.log(`   ✅ ${added} baris aplikasi ditaruh kembali`);
  if (present > 0) console.log(`   ℹ️  ${present} baris aplikasi sudah ada, dilewati`);
}

export async function applyAdjustments(prisma: PrismaClient, tables: string[]) {
  const file = path.join(__dirname, '..', 'adjustments', `${FISCAL_YEAR}.json`);
  if (!fs.existsSync(file)) return;

  const overlay: Overlay = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Hanya untuk tabel yang barusan ditulis ulang. Menjalankan seeder untuk satu
  // workbook tidak boleh menyentuh suntingan pada tabel yang tidak ikut dimuat.
  const inserts = (overlay.inserts ?? []).filter((i) => tables.includes(i.table));
  const edits = (overlay.edits ?? []).filter((e) => tables.includes(e.table));
  if (inserts.length === 0 && edits.length === 0) return;

  console.log(`🩹 adjustments/${FISCAL_YEAR}.json — ${inserts.length} baris aplikasi, ${edits.length} suntingan...`);

  const ledgers = await LedgerDirectory.load(prisma);
  await applyInserts(prisma, inserts, ledgers);

  let applied = 0;
  const skipped: string[] = [];

  for (const edit of edits) {
    const model = MODELS[edit.table]?.(prisma);
    if (!model) {
      skipped.push(`${edit.table}: tabel tidak dikenal`);
      continue;
    }

    // Dicari dari isinya, bukan dari posisi. Posisi bergeser begitu satu baris
    // ditambahkan di atasnya, dan suntingan yang meleset satu baris menulis ke
    // baris yang salah tanpa ada yang tahu.
    const candidates = (
      await model.findMany({ where: { tagYear: FISCAL_YEAR }, orderBy: { id: 'asc' } })
    ).filter((row: any) => Object.entries(edit.match).every(([k, v]) => same(row[k], v)));

    const shown = JSON.stringify(edit.match);
    if (candidates.length === 0) {
      skipped.push(`${edit.table}: tidak ada baris yang cocok dengan ${shown}`);
      continue;
    }
    if (candidates.length > 1 && !edit.all) {
      skipped.push(`${edit.table}: ${candidates.length} baris cocok dengan ${shown}, terlalu samar`);
      continue;
    }

    for (const row of edit.all ? candidates : [candidates[0]]) {
      let data: Record<string, unknown> = edit.set;
      if (edit.table === 'financial_transactions' && ('colF' in edit.set || 'colG' in edit.set)) {
        // Suntingan Ledger lewat master, supaya FK-nya ikut pindah, bukan cuma teksnya.
        const ref = await ledgers.resolve(
          {
            colF: 'colF' in edit.set ? edit.set.colF : row.colF,
            colG: 'colG' in edit.set ? edit.set.colG : row.colG,
          },
          { create: true },
        );
        data = { ...edit.set, ...ref, colF: ref.colF ?? '', colG: ref.colG ?? '' };
      }
      await model.update({ where: { id: row.id }, data });
    }
    applied++;
    const many = candidates.length > 1 ? ` (${candidates.length} baris kembar)` : '';
    console.log(`   ✅ ${edit.table}${many}${edit.why ? ` — ${edit.why}` : ''}`);
  }

  for (const s of skipped) console.warn(`   ⚠️  dilewati: ${s}`);
  if (applied < edits.length) {
    console.warn(`   ${applied} dari ${edits.length} suntingan diterapkan.`);
  }
}
