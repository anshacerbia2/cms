import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { formatDecimal } from '../../common/utils/format.utils';


/**
 * Urutan ledger, dipakai di mana pun baris dibaca berderet: daftar di layar,
 * export Excel dan PDF, dan perantaian ulang kolom saldo.
 *
 * `rowNo` yang menentukan; `id` cuma pemecah seri, untuk baris yang belum
 * sempat di-backfill dan untuk dua orang yang menyisip di titik yang sama.
 * Postgres menaruh NULL di belakang pada ASC, jadi baris tanpa `rowNo` jatuh
 * di ujung - persis perilaku "ditambahkan paling bawah" yang lama.
 */
const LEDGER_ORDER: Prisma.FinancialTransactionOrderByWithRelationInput[] = [
  { rowNo: 'asc' },
  { id: 'asc' },
];

/** Jarak antar baris, menyisakan ruang untuk menyisip tanpa menyentuh tetangganya. */
const ROW_NO_GAP = 1000;

@Injectable()
export class BankMutationService {
  constructor(private prisma: PrismaService) {}

  async getAllTransactions(accountId?: string, year?: number, startDate?: string, endDate?: string): Promise<any[]> {
    const where: any = {};
    if (accountId) {
      where.internalAccountId = BigInt(accountId);
    }
    
    if (year && !isNaN(year)) {
      where.tagYear = year;
    }

    let finalStart: Date | undefined;
    let finalEnd: Date | undefined;

    if (startDate && startDate !== 'null' && startDate !== 'undefined') {
      finalStart = new Date(`${startDate}T00:00:00.000Z`);
    }

    if (endDate && endDate !== 'null' && endDate !== 'undefined') {
      finalEnd = new Date(`${endDate}T23:59:59.999Z`);
    }

    if (finalStart || finalEnd) {
      where.colA = {
        ...(finalStart && { gte: finalStart }),
        ...(finalEnd && { lte: finalEnd })
      };
    }
    
    const data = await this.prisma.financialTransaction.findMany({
      where,
      orderBy: LEDGER_ORDER,
    });

    return data.map(t => ({
      ...t,
      id: Number(t.id),
      colC: formatDecimal(t.colC),
      colD: formatDecimal(t.colD),
      colE: formatDecimal(t.colE),
    }));
  }

  async createBulkTransactions(data: any[], accountId: string, tagYear: number, startingBalance?: string) {
    // 1. Find Account & Audit Protection
    const accountIdBig = BigInt(accountId);
    const [account] = await Promise.all([
      this.prisma.internalAccount.findUnique({
        where: { id: accountIdBig }
      })
    ]);

    if (!account) throw new NotFoundException(`Account ${accountId} not found`);

    // 2. Validate that all dates match the target year
    for (const item of data) {
      if (item.colA) {
        const txDate = new Date(item.colA);
        if (txDate.getFullYear() !== tagYear) {
          throw new Error(`Transaction date ${item.colA} does not match the target year ${tagYear}.`);
        }
      }
    }

    // 3. Handle Starting Balance ONLY if explicitly provided (Initial Migration)
    if (startingBalance) {
      await this.updateOpeningBalance(accountId, tagYear, startingBalance);
    }

    const currentFiscal = await this.prisma.fiscalPeriod.findUnique({
      where: { internalAccountId_year: { internalAccountId: accountIdBig, year: tagYear } }
    });

    // 4. Insert transactions with LINKING to internalAccountId.
    // Ditambahkan di ujung, meneruskan nomor urut terakhir - sama seperti sebelum
    // ada row_no, waktu urutan masih menumpang pada id yang menaik.
    const tail = await this.lastRowNo(accountIdBig, tagYear);
    await this.prisma.financialTransaction.createMany({
      data: data.map((item, index) => ({
        internalAccountId: account.id,
        colA: item.colA ? new Date(item.colA) : null,
        colB: item.colB || "",
        colC: item.colC?.toString() || "0",
        colD: item.colD?.toString() || "0",
        colE: 0,
        colF: item.colF || "",
        colG: item.colG || "",
        colH: item.colH || "",
        colI: item.colI || "",
        tagYear: tagYear,
        rowNo: tail + (index + 1) * ROW_NO_GAP,
      })),
    });

    // 5. If saving to an OPEN period, change status to ONGOING because transactions now exist
    if (currentFiscal && currentFiscal.status === 'OPEN' && data.length > 0) {
      await this.prisma.fiscalPeriod.update({
        where: { id: currentFiscal.id },
        data: { status: 'ONGOING' }
      });
    }

    // 6. Mark current and future years as STALE (Chain reaction: current changes affect all futures)
    await this.prisma.fiscalPeriod.updateMany({
      where: {
        internalAccountId: accountIdBig,
        year: { gte: tagYear }
      },
      data: { isStale: true }
    });

    // 7. Trigger Cascading Recalculation (FORCE recursion for bulk imports to auto-heal future years)
    await this.recalculateLedger(accountId, tagYear, true);

    return { success: true, count: data.length };
  }

  async getTransaction(id: number) {
    const trxId = BigInt(id);
    const existing = await this.prisma.financialTransaction.findUnique({
      where: { id: trxId }
    });
    if (!existing) throw new NotFoundException(`Transaction ${id} not found`);
    return {
      ...existing,
      id: existing.id.toString(),
      internalAccountId: existing.internalAccountId?.toString(),
      colC: existing.colC?.toString() || '0',
      colD: existing.colD?.toString() || '0',
      colE: existing.colE?.toString() || '0',
    };
  }

  async updateTransaction(id: number, data: any) {
    const trxId = BigInt(id);
    const existing = await this.prisma.financialTransaction.findUnique({
      where: { id: trxId }
    });
    if (!existing) throw new NotFoundException(`Transaction ${id} not found`);

    const accountIdBig = existing.internalAccountId;
    if (!accountIdBig) throw new BadRequestException(`Transaction ${id} has no associated account`);
    const tagYear = existing.tagYear;

    // Tanggal boleh dikosongkan. Dulu string kosong berarti "biarkan", karena form
    // edit selalu mewajibkan tanggal; sekarang baris bisa disunting langsung di
    // tabelnya, dan baris Non CB yang memang tak bertanggal harus bisa tetap begitu.
    let newDate = existing.colA;
    if ('colA' in data) {
      newDate = data.colA ? new Date(data.colA) : null;
    }

    // Check if year is CLOSED
    const fiscal = await this.prisma.fiscalPeriod.findUnique({
      where: { internalAccountId_year: { internalAccountId: accountIdBig, year: tagYear } }
    });

    await this.prisma.financialTransaction.update({
      where: { id: trxId },
      data: {
        colA: newDate,
        colB: data.colB ?? existing.colB,
        colC: data.colC !== undefined ? data.colC.toString() : existing.colC,
        colD: data.colD !== undefined ? data.colD.toString() : existing.colD,
        colF: data.colF ?? existing.colF,
        colG: data.colG ?? existing.colG,
        colH: data.colH ?? existing.colH,
        colI: data.colI ?? existing.colI,
      }
    });

    // Mark years as stale
    await this.prisma.fiscalPeriod.updateMany({
      where: {
        internalAccountId: accountIdBig,
        year: { gte: tagYear }
      },
      data: { isStale: true }
    });

    // Trigger recalculation starting from the affected year
    await this.recalculateLedger(accountIdBig.toString(), tagYear, true);

    return { success: true };
  }

  async deleteTransaction(id: number) {
    const trxId = BigInt(id);
    const existing = await this.prisma.financialTransaction.findUnique({
      where: { id: trxId }
    });
    if (!existing) throw new NotFoundException(`Transaction ${id} not found`);

    const accountIdBig = existing.internalAccountId;
    if (!accountIdBig) throw new BadRequestException(`Transaction ${id} has no associated account`);
    const tagYear = existing.tagYear;

    const fiscal = await this.prisma.fiscalPeriod.findUnique({
      where: { internalAccountId_year: { internalAccountId: accountIdBig, year: tagYear } }
    });

    await this.prisma.financialTransaction.delete({
      where: { id: trxId }
    });

    await this.prisma.fiscalPeriod.updateMany({
      where: {
        internalAccountId: accountIdBig,
        year: { gte: tagYear }
      },
      data: { isStale: true }
    });

    await this.recalculateLedger(accountIdBig.toString(), tagYear, true);

    return { success: true };
  }

  /**
   * Saldo akhir satu rekening-tahun: saldo awal ditambah seluruh mutasinya.
   *
   * Dipakai menggantikan cara lama, yang memungut `colE` baris terakhir menurut
   * tanggal. `colE` itu saldo berjalan menuruti urutan baris ledger, dan baris
   * paling akhir menurut tanggal belum tentu baris paling bawah - di BNI 2026
   * baris bertanggal 31 Des justru baris pertama sheet-nya. Dijumlah begini
   * hasilnya tidak bergantung urutan, dan tetap benar meski perantaian `colE`
   * belum sempat dijalankan ulang.
   */
  private async closingBalanceOf(accountId: bigint, year: number): Promise<Prisma.Decimal | null> {
    const [period, movement] = await Promise.all([
      this.prisma.fiscalPeriod.findUnique({
        where: { internalAccountId_year: { internalAccountId: accountId, year } },
      }),
      this.prisma.financialTransaction.aggregate({
        where: { internalAccountId: accountId, tagYear: year },
        _sum: { colC: true, colD: true },
      }),
    ]);

    if (!period && movement._sum.colC === null && movement._sum.colD === null) return null;

    return new Prisma.Decimal(period?.openingBalance ?? 0)
      .plus(movement._sum.colD ?? 0)
      .minus(movement._sum.colC ?? 0);
  }

  // --- Menyisip baris di tengah ledger ---

  /** Nomor urut terakhir yang terpakai di satu rekening-tahun, 0 kalau belum ada. */
  private async lastRowNo(accountId: bigint, year: number): Promise<number> {
    const last = await this.prisma.financialTransaction.findFirst({
      // Baris yang row_no-nya masih kosong sengaja dilewati: pada ASC ia jatuh di
      // ujung daftar, tapi pada DESC Postgres menaruhnya paling depan, dan
      // membacanya di sini akan membuat baris berikutnya menumpuk di nomor kecil.
      where: { internalAccountId: accountId, tagYear: year, rowNo: { not: null } },
      orderBy: [{ rowNo: 'desc' }],
      select: { rowNo: true },
    });
    return last?.rowNo ?? 0;
  }

  /**
   * Nomor urut untuk `count` baris baru tepat di bawah `afterId`; `null` = paling atas.
   *
   * Dibagi rata di celah antara baris itu dan baris sesudahnya, jadi menyisip
   * berapa pun baris tetap satu INSERT - tidak ada tetangga yang digeser, `id`
   * dan nilainya tetap. Mengembalikan `null` kalau celahnya tidak cukup untuk
   * semuanya, artinya perlu dirapatkan dulu.
   */
  private async rowNosAfter(
    accountId: bigint,
    year: number,
    afterId: bigint | null,
    count: number,
  ): Promise<number[] | null> {
    let floor = 0;

    if (afterId !== null) {
      const anchorRow = await this.prisma.financialTransaction.findUnique({
        where: { id: afterId },
        select: { internalAccountId: true, tagYear: true, rowNo: true },
      });
      if (!anchorRow) throw new NotFoundException(`Transaction ${afterId} not found`);
      if (anchorRow.internalAccountId !== accountId || anchorRow.tagYear !== year) {
        throw new BadRequestException(
          `Transaction ${afterId} belongs to another account or year`,
        );
      }
      if (anchorRow.rowNo === null) return null;
      floor = anchorRow.rowNo;
    }

    const next = await this.prisma.financialTransaction.findFirst({
      where: { internalAccountId: accountId, tagYear: year, rowNo: { gt: floor } },
      orderBy: [{ rowNo: 'asc' }],
      select: { rowNo: true },
    });

    // Tanpa baris sesudahnya, berarti menyisip di ujung: satu langkah penuh per baris.
    const ceiling = next?.rowNo ?? floor + (count + 1) * ROW_NO_GAP;
    const step = (ceiling - floor) / (count + 1);
    if (step < 1) return null;

    const numbers = Array.from({ length: count }, (_, i) => Math.floor(floor + step * (i + 1)));
    // Pembulatan ke bawah bisa membuat dua nomor kembar kalau celahnya sempit;
    // kalau begitu, rapatkan dulu daripada menaruh dua baris di nomor yang sama.
    const distinct = new Set(numbers).size === count && numbers[0] > floor;
    return distinct ? numbers : null;
  }

  /**
   * Menulis ulang nomor urut satu rekening-tahun jadi kelipatan ROW_NO_GAP lagi.
   *
   * Dipanggil saat celah antara dua baris habis. Urutannya tidak berubah sama
   * sekali - cuma direnggangkan kembali, dan baris yang row_no-nya masih kosong
   * ikut mendapat nomor di ujung, sesuai posisi tampilnya sekarang.
   */
  private async repackRowNo(accountId: bigint, year: number): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE financial_transactions f
         SET row_no = x.n * ${ROW_NO_GAP}
        FROM (
               SELECT id,
                      row_number() OVER (ORDER BY row_no ASC NULLS LAST, id ASC) AS n
                 FROM financial_transactions
                WHERE internal_account_id = ${accountId}
                  AND "tagYear" = ${year}
             ) x
       WHERE f.id = x.id
    `;
  }

  /**
   * Menggeser semua baris sesudah `afterId` sejauh `count` langkah, supaya ada
   * ruang untuk menyisip sebanyak itu sekaligus. Dipanggil sesudah repack, jadi
   * jaraknya sudah rata ROW_NO_GAP. Tanpa ini, menempel blok besar dari Excel
   * gagal begitu barisnya lebih banyak dari satu celah.
   */
  private async makeRoomAfter(
    accountId: bigint,
    year: number,
    afterId: bigint | null,
    count: number,
  ): Promise<void> {
    let floor = 0;
    if (afterId !== null) {
      const anchorRow = await this.prisma.financialTransaction.findUnique({
        where: { id: afterId },
        select: { rowNo: true },
      });
      floor = anchorRow?.rowNo ?? 0;
    }
    await this.prisma.$executeRaw`
      UPDATE financial_transactions
         SET row_no = row_no + ${count * ROW_NO_GAP}
       WHERE internal_account_id = ${accountId}
         AND "tagYear" = ${year}
         AND row_no > ${floor}
    `;
  }

  /**
   * Menambah satu atau lebih baris tepat di bawah `afterId` (atau paling atas kalau null).
   *
   * Baris-baris baru masuk berurutan sesuai urutan kirimnya, dan baris di bawahnya
   * turun tanpa disentuh: yang menentukan posisi adalah row_no, bukan banyaknya
   * baris di atasnya. Sesudahnya kolom saldo dirantai ulang sekali untuk semuanya.
   */
  async insertTransactions(rows: any[], accountId: string, tagYear: number, afterId?: number | null) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('Tidak ada baris untuk disimpan.');
    }

    const accountIdBig = BigInt(accountId);
    const after = afterId === undefined || afterId === null ? null : BigInt(afterId);

    const account = await this.prisma.internalAccount.findUnique({ where: { id: accountIdBig } });
    if (!account) throw new NotFoundException(`Account ${accountId} not found`);

    let rowNos = await this.rowNosAfter(accountIdBig, tagYear, after, rows.length);
    if (rowNos === null) {
      await this.repackRowNo(accountIdBig, tagYear);
      await this.makeRoomAfter(accountIdBig, tagYear, after, rows.length);
      rowNos = await this.rowNosAfter(accountIdBig, tagYear, after, rows.length);
    }
    if (rowNos === null) {
      // Sesudah diberi ruang, ini hanya terjadi kalau ada yang menyisip di titik
      // yang sama pada detik yang sama. Ditolak dengan jelas, bukan diam-diam
      // mendarat di tempat lain.
      throw new BadRequestException('Gagal menentukan posisi baris, coba lagi.');
    }

    await this.prisma.financialTransaction.createMany({
      data: rows.map((data, i) => ({
        internalAccountId: accountIdBig,
        // Tanggal boleh kosong: buku non-kas memang tidak memberi tanggal pada
        // sebagian besar barisnya, dan seeder menyimpannya kosong juga.
        colA: data.colA ? new Date(data.colA) : null,
        colB: data.colB || '',
        colC: data.colC !== undefined && data.colC !== '' ? data.colC.toString() : '0',
        colD: data.colD !== undefined && data.colD !== '' ? data.colD.toString() : '0',
        colE: 0,
        colF: data.colF || '',
        colG: data.colG || '',
        colH: data.colH || '',
        colI: data.colI || '',
        tagYear,
        rowNo: rowNos![i],
      })),
    });

    await this.prisma.fiscalPeriod.updateMany({
      where: { internalAccountId: accountIdBig, year: { gte: tagYear } },
      data: { isStale: true },
    });

    await this.recalculateLedger(accountId, tagYear, true);

    return { success: true, count: rows.length };
  }

  // --- Opening Balance & Anchor Logic ---

  async getLatestAnchor(accountId: string, year: number) {
    const accountIdBig = BigInt(accountId);

    // 1. Check current year first
    const currentFiscal = await this.prisma.fiscalPeriod.findUnique({
      where: { internalAccountId_year: { internalAccountId: accountIdBig, year } },
    });

    // `balance` dan `tailBalance` sengaja dua angka berbeda. `balance` adalah
    // saldo awal - halaman Bank Statement memakainya sebagai "Fiscal Opening".
    // `tailBalance` adalah saldo sesudah baris terakhir, titik mulai baris yang
    // ditambahkan di ujung. Form create dulu memakai `balance` untuk keduanya,
    // jadi di periode CLOSED pratinjau saldonya mulai dari saldo awal tahun -
    // meleset sebesar seluruh mutasi tahun itu, 3,47 miliar di Mandiri MP 2026.
    if (currentFiscal) {
      if (currentFiscal.status === 'CLOSED') {
        const tail = await this.closingBalanceOf(accountIdBig, year);
        return { 
          status: currentFiscal.status, 
          balance: formatDecimal(currentFiscal.openingBalance), // Use openingBalance for the "Opening Balance" card
          tailBalance: formatDecimal(tail ?? currentFiscal.openingBalance),
          canEdit: false,
          referredYear: year,
          isStale: currentFiscal.isStale,
          message: `Fiscal year ${year} is already ${currentFiscal.status.toLowerCase()}. will automatically synchronize balances for all subsequent years.`
        };
      }

      if (currentFiscal.status === 'OPEN') {
        return {
          status: currentFiscal.status,
          balance: formatDecimal(currentFiscal.openingBalance),
          // Belum ada transaksi, jadi saldo awal dan saldo sesudah baris terakhir sama.
          tailBalance: formatDecimal(currentFiscal.openingBalance),
          canEdit: true,
          referredYear: year,
          isStale: currentFiscal.isStale,
          message: `Fiscal year ${year} is ${currentFiscal.status.toLowerCase()} with no transactions yet.`
        };
      }
      
      // ONGOING: saldo tahun berjalan, dijumlah dari mutasinya.
      const running = await this.closingBalanceOf(accountIdBig, year);
      const balance = running !== null ? formatDecimal(running) : null;

      return { 
        status: currentFiscal.status, 
        balance, 
        tailBalance: balance,
        canEdit: false,
        referredYear: year,
        isStale: currentFiscal.isStale,
        message: running !== null
          ? `Using current running balance of ${year} (${currentFiscal.status.toLowerCase()}).`
          : `Warning: Period is ongoing but no transactions found for ${year}.`
      };
    }

    // 2. Dynamic Discovery: Find the LATEST year with any data before the target year
    const [lastFiscal, lastTransaction] = await Promise.all([
      this.prisma.fiscalPeriod.findFirst({
        where: { internalAccountId: accountIdBig, year: { lt: year } },
        orderBy: { year: 'desc' }
      }),
      this.prisma.financialTransaction.findFirst({
        where: { internalAccountId: accountIdBig, tagYear: { lt: year } },
        orderBy: [{ colA: 'desc' }, { id: 'desc' }]
      })
    ]);

    const fiscalYear = lastFiscal?.year || 0;
    const transYear = lastTransaction?.tagYear || 0;
    const searchYear = Math.max(fiscalYear, transYear);

    if (searchYear > 0) {
      // Re-fetch data for the discovered searchYear to apply logic
      const prevFiscal = lastFiscal?.year === searchYear ? lastFiscal : await this.prisma.fiscalPeriod.findUnique({
        where: { internalAccountId_year: { internalAccountId: accountIdBig, year: searchYear } }
      });

      const summedBalance = await this.closingBalanceOf(accountIdBig, searchYear);

      if (prevFiscal) {
        const openingBalance = prevFiscal.closingBalance !== null
          ? formatDecimal(prevFiscal.closingBalance)
          : (summedBalance !== null ? formatDecimal(summedBalance) : formatDecimal(prevFiscal.openingBalance));

        let source = "opening balance";
        if (prevFiscal.closingBalance !== null) {
          source = "closing balance";
        } else if (summedBalance !== null) {
          source = "summed movements";
        }

        return {
          status: prevFiscal.status, 
          balance: openingBalance,
          // Tahun ini belum punya periode maupun baris: baris pertamanya
          // meneruskan penutup tahun sebelumnya.
          tailBalance: openingBalance,
          canEdit: false,
          referredYear: searchYear,
          message: `Auto-referred to ${source} of year ${searchYear}`
        };
      } 
      
      // If no fiscal record, but we found transactions (Lazy Year)
      if (summedBalance !== null) {
        return {
          status: 'ONGOING',
          balance: formatDecimal(summedBalance),
          tailBalance: formatDecimal(summedBalance),
          canEdit: false,
          referredYear: searchYear,
          message: `Auto-referred to summed movements of year ${searchYear} (Lazy Registration)`
        };
      }
    }

    // 3. No previous record found at all (First time setup)
    return { 
      status: 'INITIAL', 
      balance: "0", 
      tailBalance: "0",
      canEdit: true,
      referredYear: year,
      message: "First Period Migration" 
    };
  }

  async getFiscalPeriods(accountId: string, year?: number) {
    const accountIdBig = BigInt(accountId);

    if (year !== undefined) {
      const period = await this.prisma.fiscalPeriod.findUnique({
        where: { internalAccountId_year: { internalAccountId: accountIdBig, year } }
      });

      if (!period) return null;

      return {
        ...period,
        id: Number(period.id),
        openingBalance: formatDecimal(period.openingBalance),
        closingBalance: period.closingBalance ? formatDecimal(period.closingBalance) : null,
      };
    }

    // If no year, return ALL for this account
    const periods = await this.prisma.fiscalPeriod.findMany({
      where: { internalAccountId: accountIdBig },
      orderBy: { year: 'asc' }
    });

    return periods.map(p => ({
      ...p,
      id: Number(p.id),
      openingBalance: formatDecimal(p.openingBalance),
      closingBalance: p.closingBalance ? formatDecimal(p.closingBalance) : null,
    }));
  }


  private async updateOpeningBalance(accountId: string, year: number, amount: string) {
    const accountIdBig = BigInt(accountId);
 
    // Create new fiscal record with OPEN status for initial setup
    return this.prisma.fiscalPeriod.create({
      data: {
        internalAccountId: accountIdBig,
        year: year,
        openingBalance: amount,
        status: 'OPEN',
        isStale: false
      }
    });
  }

  // --- Fiscal Control & Recalculation ---


  async closeYear(accountId: string, year: number, userId: string) {
    const accountIdBig = BigInt(accountId);
 
    // 0. Perform a final recalculation to ensure the closing balance is 100% accurate before snapshot
    const recalc = await this.recalculateLedger(accountId, year);
    const closingBalance = recalc.finalBalance;

    // 1. Fetch correct opening balance if we need to create the record
    const anchor = await this.getLatestAnchor(accountId, year);
    const openingBalance = anchor?.balance || "0";

    // 2. Snapshot the current year as CLOSED
    await this.prisma.fiscalPeriod.upsert({
      where: { internalAccountId_year: { internalAccountId: accountIdBig, year } },
      update: {
        status: 'CLOSED',
        closingBalance: closingBalance,
        closedAt: new Date(),
        closedById: BigInt(userId),
        isStale: false // Freshly recalculated and closed
      },
      create: {
        internalAccountId: accountIdBig,
        year,
        openingBalance: openingBalance,
        status: 'CLOSED',
        closingBalance: closingBalance,
        closedAt: new Date(),
        closedById: BigInt(userId),
        isStale: false
      }
    });

    // 3. Trigger recursive cascading recalculation for all years following the closed one
    // This will automatically handle opening balance updates and transaction re-syncs
    await this.recalculateLedger(accountId, year + 1, true);

    return { success: true, closingBalance: formatDecimal(closingBalance) };
  }

  async recalculateLedger(accountId: string, year: number, forceRecursion = false) {
    const accountIdBig = BigInt(accountId);
 
    // 1. Get Starting Point (Discovery)
    // We look for the record first, but if it doesn't exist, we discover the anchor on-the-fly.
    const period = await this.prisma.fiscalPeriod.findUnique({
      where: { internalAccountId_year: { internalAccountId: accountIdBig, year } }
    });
 
    let startingBalance = "0";
    if (period) {
      startingBalance = period.openingBalance.toString();
    } else {
      const anchor = await this.getLatestAnchor(accountId, year);
      startingBalance = anchor?.balance || "0";
    }
    
    let runningBalance = new Prisma.Decimal(startingBalance);

    // 2. Ambil seluruh transaksi rekening-tahun ini MENURUT URUTAN YANG DITAMPILKAN.
    // Dulu di sini diurutkan tanggal, padahal daftarnya tampil urut baris workbook,
    // jadi saldo di satu baris bukan hasil penjumlahan baris-baris di atasnya. Paling
    // jauh melesetnya di Non CB: 382 barisnya bertanggal di luar tahun bukunya.
    const transactions = await this.prisma.financialTransaction.findMany({
      where: {
        internalAccountId: accountIdBig,
        tagYear: year
      },
      orderBy: LEDGER_ORDER
    });

    // 3. Update each transaction's Saldo (colE) sequentially (STRICT: colE = Saldo AFTER transaction)
    for (const trx of transactions) {
      const debit = new Prisma.Decimal(trx.colC || 0);
      const credit = new Prisma.Decimal(trx.colD || 0);
      
      // FORMULA: Previous Saldo - Debit + Credit
      runningBalance = runningBalance.minus(debit).plus(credit);

      // Save the resulting balance to the database
      await this.prisma.financialTransaction.update({
        where: { id: trx.id },
        data: { colE: runningBalance }
      });
    }

    // 3.5. Update CURRENT year's fiscal record with the new closing balance
    if (period) {
      await this.prisma.fiscalPeriod.update({
        where: { id: period.id },
        data: { 
          closingBalance: runningBalance,
          isStale: false // Normalize after success
        }
      });
    }

    // 4. CASCADING UPDATE: Find the NEXT year that has ANY data (Fiscal OR Transactions)
    const [nextFiscal, nextTrans] = await Promise.all([
      this.prisma.fiscalPeriod.findFirst({
        where: { internalAccountId: accountIdBig, year: { gt: year } },
        orderBy: { year: 'asc' }
      }),
      this.prisma.financialTransaction.findFirst({
        where: { internalAccountId: accountIdBig, tagYear: { gte: year + 1 } },
        orderBy: [{ colA: 'asc' }, { id: 'asc' }]
      })
    ]);

    const nextFiscalYear = nextFiscal?.year || Infinity;
    const nextTransYear = nextTrans?.tagYear || Infinity;
    const nextDataYear = Math.min(nextFiscalYear, nextTransYear);

    if (nextDataYear !== Infinity) {
      // If the next data year has a fiscal record, update its opening balance
      if (nextFiscal && nextFiscal.year === nextDataYear) {
        await this.prisma.fiscalPeriod.update({
          where: { id: nextFiscal.id },
          data: { 
            openingBalance: runningBalance,
            // If we are NOT recursing, mark it as stale so the user knows to sync
            isStale: period?.status !== 'CLOSED' 
          }
        });
      }
 
      // ONLY Recurse if the CURRENT period being recalculated is CLOSED (Historical Correction)
      // Otherwise, we stop here to save performance and let the 'isStale' flag handle the rest
      // Recurse if the CURRENT period is CLOSED OR if we are forcing recursion (e.g. during bulk import)
      if (period?.status === 'CLOSED' || forceRecursion) {
        await this.recalculateLedger(accountId, nextDataYear, forceRecursion);
      }
    }

    // 5. Reset Stale Flag for the current year after successful recalculation
    await this.prisma.fiscalPeriod.updateMany({
      where: { internalAccountId: accountIdBig, year },
      data: { isStale: false }
    });

    return { success: true, finalBalance: formatDecimal(runningBalance) };
  }

}
