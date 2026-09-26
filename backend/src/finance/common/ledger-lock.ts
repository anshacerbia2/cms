import { Prisma } from '@prisma/client';

/** Ruang nama kunci ledger, supaya tidak bertabrakan dengan kunci advisory lain. */
export const LEDGER_LOCK_NS = 7101;

/**
 * Mengunci satu REKENING selama transaksi berjalan - semua tahunnya sekaligus.
 * Menyisip, menghapus, mengedit, menambah, menghitung ulang saldo, dan menutup
 * tahun semuanya mengambil kunci ini sebagai langkah pertama, sebelum menyentuh
 * baris apa pun di rekening itu.
 *
 * Per rekening, bukan per rekening-tahun: simpan di 2025 ikut menulis saldo awal
 * dan penanda periode 2026. Dengan kunci per tahun, simpan 2025 memegang baris
 * periode 2026 sambil menunggu kunci 2026, sementara simpan 2026 memegang kunci
 * 2026 sambil menunggu baris itu - deadlock (terbukti di uji 8 operasi
 * bersamaan). Satu kunci per transaksi tidak bisa membentuk lingkaran.
 * Rekening yang berbeda tetap berjalan bersamaan. Kunci lepas sendiri saat
 * transaksi selesai.
 */
export async function lockAccount(db: Prisma.TransactionClient, accountId: bigint) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(${LEDGER_LOCK_NS}::int, ${Number(accountId)}::int)`;
}

/**
 * Mengunci beberapa rekening sekaligus, SELALU berurutan naik. Dipakai oleh
 * penulis yang menyentuh baris banyak rekening (ganti nama Ledger, penomoran
 * ulang). Karena urutannya selalu naik dan penyimpanan biasa hanya memegang
 * satu kunci, tidak mungkin terbentuk lingkaran tunggu.
 */
export async function lockAccounts(db: Prisma.TransactionClient, accountIds: bigint[]) {
  const sorted = [...new Set(accountIds.map(String))].map(BigInt).sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
  for (const id of sorted) await lockAccount(db, id);
}

/** Rekening-rekening yang punya baris dengan Ledger / Sub Ledger 1 ini. */
export async function accountsUsing(
  db: Prisma.TransactionClient,
  where: { ledgerId?: bigint; subLedgerId?: bigint },
): Promise<bigint[]> {
  const rows = await db.financialTransaction.findMany({
    where: { ...where, internalAccountId: { not: null } },
    distinct: ['internalAccountId'],
    select: { internalAccountId: true },
  });
  return rows.map((r) => r.internalAccountId!);
}
