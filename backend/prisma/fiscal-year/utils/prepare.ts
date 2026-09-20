import { PrismaClient } from '@prisma/client';
import { FISCAL_YEAR } from './layout';

/**
 * Merapikan baris lama supaya seeder bisa bekerja, tanpa perintah terpisah.
 *
 * Dua kolom ditambahkan setelah data ini terlanjur ada, jadi baris lama tidak
 * punya isinya: `row_no` (urutan tampilan) dan `source` (siapa yang menaruh
 * baris itu). Dulu keduanya diisi lewat skrip backfill sendiri-sendiri, yang
 * artinya seed ulang bergantung pada seseorang ingat menjalankan dua perintah
 * lebih dulu. Sekarang dikerjakan di sini, sekali, saat pertama kali dibutuhkan.
 *
 * Keduanya hanya menyentuh yang masih kosong, jadi aman dipanggil setiap kali.
 */

/** Tabel yang ditulis seeder, dipetakan ke nama tabel di database. */
const TABLES: Record<string, string> = {
  financial_transactions: 'financial_transactions',
  sales_records: 'sales_records',
  depreciation: 'depreciation',
  inter_account: 'inter_account',
  account_receivables: 'account_receivables',
  account_payables: 'account_payables',
  ppn_in_out: 'ppn_in_out',
};

/** Jarak antar nomor baris, sama dengan yang dipakai seeder dan aplikasi. */
const ROW_NO_GAP = 1000;

/**
 * Menandai baris lama sebagai SEED, supaya seeder tahu mana miliknya.
 *
 * Hanya jalan kalau tahun ini belum punya satu pun baris SEED - keadaan yang
 * cuma terjadi sekali, tepat setelah kolomnya ditambahkan. Kalau dibiarkan,
 * seed ulang tidak akan menghapus apa pun dan tahun itu jadi ganda.
 *
 * Pembedanya: satu kali muat workbook menulis ribuan baris dalam menit yang
 * sama, sedangkan orang mengetik beberapa baris di menit yang berbeda. Jadi
 * batch terbesar adalah hasil seed, sisanya input aplikasi.
 */
async function markExistingRows(prisma: PrismaClient, table: string): Promise<string | null> {
  const [{ total, seeded }] = await prisma.$queryRawUnsafe<{ total: number; seeded: number }[]>(`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE source = 'SEED')::int AS seeded
      FROM ${table}
     WHERE "tagYear" = ${FISCAL_YEAR}
  `);

  if (total === 0 || seeded > 0) return null;

  const batches = await prisma.$queryRawUnsafe<{ minute: string; n: number }[]>(`
    SELECT to_char(created_at, 'YYYY-MM-DD HH24:MI') AS minute, count(*)::int AS n
      FROM ${table}
     WHERE "tagYear" = ${FISCAL_YEAR}
     GROUP BY 1
     ORDER BY 2 DESC
  `);

  const seedMinute = batches[0].minute;
  await prisma.$executeRawUnsafe(
    `UPDATE ${table} SET source = 'SEED' WHERE "tagYear" = ${FISCAL_YEAR}`,
  );
  await prisma.$executeRawUnsafe(
    `UPDATE ${table} SET source = 'APP'
      WHERE "tagYear" = ${FISCAL_YEAR}
        AND to_char(created_at, 'YYYY-MM-DD HH24:MI') <> $1`,
    seedMinute,
  );

  const app = total - batches.filter((b) => b.minute === seedMinute).reduce((a, b) => a + b.n, 0);
  return `${table}: ${total - app} baris dari workbook, ${app} diketik lewat aplikasi`;
}

/** Memberi nomor urut pada baris yang belum punya, mengikuti urutan `id`. */
async function numberExistingRows(prisma: PrismaClient): Promise<string | null> {
  const missing = await prisma.financialTransaction.count({
    where: { tagYear: FISCAL_YEAR, rowNo: null },
  });
  if (missing === 0) return null;

  await prisma.$executeRawUnsafe(`
    UPDATE financial_transactions f
       SET row_no = x.n * ${ROW_NO_GAP}
      FROM (
             SELECT id,
                    row_number() OVER (
                      PARTITION BY internal_account_id, "tagYear" ORDER BY id
                    ) AS n
               FROM financial_transactions
              WHERE "tagYear" = ${FISCAL_YEAR}
           ) x
     WHERE f.id = x.id
       AND f.row_no IS NULL
  `);
  return `financial_transactions: ${missing} baris diberi nomor urut`;
}

/** Dipanggil seeder sebelum menulis apa pun. Diam kalau tidak ada yang perlu dirapikan. */
export async function prepareExistingRows(prisma: PrismaClient, tables: string[]) {
  const notes: string[] = [];

  if (tables.includes('financial_transactions')) {
    const note = await numberExistingRows(prisma);
    if (note) notes.push(note);
  }

  for (const table of tables) {
    if (!TABLES[table]) continue;
    const note = await markExistingRows(prisma, TABLES[table]);
    if (note) notes.push(note);
  }

  if (notes.length === 0) return;

  console.log(`🧭 Merapikan baris ${FISCAL_YEAR} yang dimuat sebelum kolom ini ada:`);
  for (const note of notes) console.log(`   ${note}`);
}
