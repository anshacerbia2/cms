import { PrismaClient } from '@prisma/client';
import { FISCAL_YEAR } from './layout';

/**
 * Menandai asal baris lama supaya seeder tahu mana miliknya.
 *
 * Kolom `source` ditambahkan setelah data ini terlanjur ada, jadi baris lama
 * berlabel APP semua - dan dalam keadaan itu seed ulang tidak menghapus apa pun
 * lalu memuat workbook di atasnya, menggandakan tahun itu. Dulu ini dikerjakan
 * lewat perintah backfill terpisah, yang artinya seed ulang bergantung pada
 * seseorang ingat menjalankannya dulu. Sekarang dikerjakan di sini, sekali.
 *
 * `row_no` tidak perlu diurus di sini: baris workbook mendapat nomornya saat
 * dimuat, dan baris aplikasi yang selamat dinomori ulang di ujung barisan.
 */

/** Tabel yang punya kolom `source`. `fiscal_periods` tidak, dan tidak perlu. */
const MARKED = new Set([
  'financial_transactions',
  'sales_records',
  'depreciation',
  'inter_account',
  'account_receivables',
  'account_payables',
  'ppn_in_out',
]);

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

/** Dipanggil seeder sebelum menulis apa pun. Diam kalau tidak ada yang perlu dirapikan. */
export async function prepareExistingRows(prisma: PrismaClient, tables: string[]) {
  const notes: string[] = [];

  for (const table of tables) {
    if (!MARKED.has(table)) continue;
    const note = await markExistingRows(prisma, table);
    if (note) notes.push(note);
  }

  if (notes.length === 0) return;

  console.log(`🧭 Merapikan baris ${FISCAL_YEAR} yang dimuat sebelum kolom ini ada:`);
  for (const note of notes) console.log(`   ${note}`);
}
