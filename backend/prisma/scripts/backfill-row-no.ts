import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Memberi setiap baris ledger nomor urutnya sendiri.
 *
 * Sampai sekarang urutan ledger cuma menumpang pada `id`: baris diinsert
 * menurut urutan baris workbook, jadi `id` yang menaik kebetulan sama dengan
 * urutan yang benar. Itu berhenti benar begitu orang bisa menyisip baris di
 * tengah - sisipan selalu dapat `id` terbesar.
 *
 * Jadi urutan yang selama ini tersirat dipindahkan ke `row_no`, berjarak 1000
 * supaya ada ruang di antaranya. Dijalankan SEKALI, selagi urutan `id` masih
 * merupakan urutan yang benar.
 *
 * Idempoten: hanya menyentuh baris yang `row_no`-nya masih kosong, jadi aman
 * diulang dan aman dijalankan lagi setelah ada baris baru yang masuk.
 */
export async function backfillRowNo(prisma: PrismaClient) {
  const before = await prisma.financialTransaction.count({ where: { rowNo: null } });
  if (before === 0) {
    console.log('✅ Semua baris sudah punya row_no — tidak ada yang dikerjakan.');
    return;
  }

  console.log(`🔢 Mengisi row_no untuk ${before} baris...`);

  // Satu UPDATE: row_number() per (rekening, tahun) menurut id, dikali 1000.
  const touched = await prisma.$executeRaw`
    UPDATE financial_transactions f
       SET row_no = x.n * 1000
      FROM (
             SELECT id,
                    row_number() OVER (
                      PARTITION BY internal_account_id, "tagYear"
                      ORDER BY id
                    ) AS n
               FROM financial_transactions
           ) x
     WHERE f.id = x.id
       AND f.row_no IS NULL
  `;

  const left = await prisma.financialTransaction.count({ where: { rowNo: null } });
  console.log(`   ${touched} baris terisi, ${left} masih kosong.`);

  // Dilaporkan, bukan digagalkan: row_no kembar tetap tampil benar karena setiap
  // pembacaan memakai [{ rowNo: 'asc' }, { id: 'asc' }]. Tapi kalau muncul di sini
  // - sebelum ada yang sempat menyisip - berarti ada yang salah di atas.
  const duplicates = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n
      FROM (
             SELECT internal_account_id, "tagYear", row_no
               FROM financial_transactions
              WHERE row_no IS NOT NULL
              GROUP BY 1, 2, 3
             HAVING count(*) > 1
           ) d
  `;
  const dup = Number(duplicates[0]?.n ?? 0);
  console.log(dup === 0 ? '✅ Tidak ada row_no kembar.' : `⚠️  ${dup} row_no kembar.`);
}

/** Dijalankan sendiri: `pnpm backfill:row-no`. */
if (require.main === module) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  backfillRowNo(prisma)
    .catch((e) => {
      console.error('❌ Backfill row_no gagal:', e);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
