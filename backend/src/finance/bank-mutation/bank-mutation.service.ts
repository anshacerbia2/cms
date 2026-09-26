import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  LEDGER_NAMES_INCLUDE,
  LedgerDirectory,
  type LedgerInput,
  type LedgerRef,
  withLedgerNames,
} from '../common/ledger-refs';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { formatDecimal } from '../../common/utils/format.utils';
import { parseDecimalSafe } from '../../common/utils/parse.utils';
import { lockAccount } from '../common/ledger-lock';


/**
 * Urutan ledger, dipakai di mana pun baris dibaca berderet: daftar di layar,
 * export Excel dan PDF, dan perantaian ulang kolom saldo.
 *
 * `rowNo` yang menentukan; `id` cuma pemecah seri untuk baris yang row_no-nya
 * masih kosong. Postgres menaruh NULL di belakang pada ASC, jadi baris tanpa
 * `rowNo` jatuh di ujung - persis perilaku "ditambahkan paling bawah" yang lama.
 */
const LEDGER_ORDER: Prisma.FinancialTransactionOrderByWithRelationInput[] = [
  { rowNo: 'asc' },
  { id: 'asc' },
];

/**
 * Batas waktu transaksi ledger. Hitung ulang saldo kini satu UPDATE (sekitar
 * 0,1 detik per rekening-tahun), tapi bisa berantai ke tahun-tahun sesudahnya,
 * dan penyimpanan lain di rekening yang sama menunggu gilirannya.
 */
const LEDGER_TX = { timeout: 60_000, maxWait: 30_000 };


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
      include: LEDGER_NAMES_INCLUDE,
    });

    // Nama Ledger/SL1 dari master lewat FK - tabel, filter kolom, pencarian,
    // dan export Excel/PDF semuanya membaca dari sini.
    return data.map(withLedgerNames).map(t => ({
      ...t,
      id: Number(t.id),
      ledgerId: t.ledgerId === null ? null : Number(t.ledgerId),
      subLedgerId: t.subLedgerId === null ? null : Number(t.subLedgerId),
      colC: formatDecimal(t.colC),
      colD: formatDecimal(t.colD),
      colE: formatDecimal(t.colE),
    }));
  }

  /**
   * Ledger dan Sub Ledger 1 tiap baris dari master: FK plus cermin teksnya.
   * Semua baris di-resolve dulu sebelum ada yang ditulis, jadi satu nama yang
   * tidak dikenal menolak seluruh kiriman, bukan menyimpan separuhnya.
   */
  private async resolveLedgers(rows: LedgerInput[]): Promise<LedgerRef[]> {
    const dir = await LedgerDirectory.load(this.prisma);
    const refs: LedgerRef[] = [];
    for (const [i, row] of rows.entries()) {
      try {
        refs.push(await dir.resolve(row));
      } catch (e: any) {
        throw new BadRequestException(rows.length > 1 ? `Row ${i + 1}: ${e.message}` : e.message);
      }
    }
    return refs;
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

    // 4. Insert transactions with LINKING to internalAccountId.
    // Ditambahkan di ujung, meneruskan nomor urut terakhir - sama seperti sebelum
    // ada row_no, waktu urutan masih menumpang pada id yang menaik.
    const refs = await this.resolveLedgers(data);
    await this.prisma.$transaction(async (tx) => {
      await lockAccount(tx, accountIdBig);

      // Saldo awal hanya kalau memang dikirim (pengisian pertama).
      if (startingBalance) {
        await tx.fiscalPeriod.create({
          data: { internalAccountId: accountIdBig, year: tagYear, openingBalance: startingBalance, status: 'OPEN', isStale: false },
        });
      }
      const currentFiscal = await tx.fiscalPeriod.findUnique({
        where: { internalAccountId_year: { internalAccountId: accountIdBig, year: tagYear } },
      });

      const tail = await this.lastRowNo(tx, accountIdBig, tagYear);
      await tx.financialTransaction.createMany({
        data: data.map((item, index) => ({
          internalAccountId: account.id,
          colA: item.colA ? new Date(item.colA) : null,
          colB: item.colB || "",
          colC: parseDecimalSafe(item.colC, 'Debit') ?? '0',
          colD: parseDecimalSafe(item.colD, 'Credit') ?? '0',
          colE: 0,
          ledgerId: refs[index].ledgerId,
          subLedgerId: refs[index].subLedgerId,
          colF: refs[index].colF ?? "",
          colG: refs[index].colG ?? "",
          colH: item.colH || "",
          colI: item.colI || "",
          tagYear: tagYear,
          rowNo: tail + index + 1,
        })),
      });

      // Periode OPEN jadi ONGOING begitu punya transaksi.
      if (currentFiscal && currentFiscal.status === 'OPEN' && data.length > 0) {
        await tx.fiscalPeriod.update({ where: { id: currentFiscal.id }, data: { status: 'ONGOING' } });
      }

      // Tahun ini dan sesudahnya ditandai basi, lalu dihitung ulang di dalam
      // kunci yang sama - baris dan saldonya selesai bersamaan.
      await tx.fiscalPeriod.updateMany({
        where: { internalAccountId: accountIdBig, year: { gte: tagYear } },
        data: { isStale: true },
      });
      await this.recalcLocked(tx, accountIdBig, tagYear, true);
    }, LEDGER_TX);

    return { success: true, count: data.length };
  }

  async getTransaction(id: number) {
    const trxId = BigInt(id);
    const found = await this.prisma.financialTransaction.findUnique({
      where: { id: trxId },
      include: LEDGER_NAMES_INCLUDE,
    });
    if (!found) throw new NotFoundException(`Transaction ${id} not found`);
    const existing = withLedgerNames(found);
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

    // Ledger hanya di-resolve ulang kalau dikirim. Yang dikirim menang; yang
    // tidak dikirim tetap dari baris lama - misalnya klien lama yang mengirim
    // nama Ledger saja tanpa Sub Ledger 1.
    const touchesLedger = ['ledgerId', 'subLedgerId', 'colF', 'colG'].some((k) => k in data);
    let ledgerData = {};
    if (touchesLedger) {
      const [ref] = await this.resolveLedgers([{
        ledgerId: 'ledgerId' in data ? data.ledgerId : 'colF' in data ? undefined : existing.ledgerId,
        colF: data.colF,
        subLedgerId: 'subLedgerId' in data ? data.subLedgerId : 'colG' in data ? undefined : existing.subLedgerId,
        colG: data.colG,
      }]);
      ledgerData = {
        ledgerId: ref.ledgerId,
        subLedgerId: ref.subLedgerId,
        colF: ref.colF ?? '',
        colG: ref.colG ?? '',
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await lockAccount(tx, accountIdBig);
      await tx.financialTransaction.update({
        where: { id: trxId },
        data: {
          colA: newDate,
          colB: data.colB ?? existing.colB,
          colC: data.colC !== undefined ? parseDecimalSafe(data.colC, 'Debit') ?? '0' : existing.colC,
          colD: data.colD !== undefined ? parseDecimalSafe(data.colD, 'Credit') ?? '0' : existing.colD,
          ...ledgerData,
          colH: data.colH ?? existing.colH,
          colI: data.colI ?? existing.colI,
        }
      });

      // Tahun ini dan sesudahnya ditandai basi, lalu dihitung ulang di dalam
      // kunci yang sama - baris dan saldonya selesai bersamaan.
      await tx.fiscalPeriod.updateMany({
        where: { internalAccountId: accountIdBig, year: { gte: tagYear } },
        data: { isStale: true },
      });
      await this.recalcLocked(tx, accountIdBig, tagYear, true);
    }, LEDGER_TX);

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

    await this.prisma.$transaction(async (tx) => {
      await lockAccount(tx, accountIdBig);
      await tx.financialTransaction.delete({ where: { id: trxId } });
      // Baris-baris sesudahnya naik satu, supaya nomornya tidak bolong.
      await this.repackRowNo(tx, accountIdBig, tagYear);

      // Tahun ini dan sesudahnya ditandai basi, lalu dihitung ulang di dalam
      // kunci yang sama - baris dan saldonya selesai bersamaan.
      await tx.fiscalPeriod.updateMany({
        where: { internalAccountId: accountIdBig, year: { gte: tagYear } },
        data: { isStale: true },
      });
      await this.recalcLocked(tx, accountIdBig, tagYear, true);
    }, LEDGER_TX);

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
  private async lastRowNo(db: Prisma.TransactionClient, accountId: bigint, year: number): Promise<number> {
    const last = await db.financialTransaction.findFirst({
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
   * Menomori ulang satu rekening-tahun jadi 1, 2, 3, ... tanpa lubang, mengikuti
   * urutan yang ada sekarang (row_no, lalu id) - urutannya sendiri tidak berubah.
   * Baris yang row_no-nya masih kosong mendapat nomor di ujung. Satu UPDATE, dan
   * hanya baris yang nomornya benar-benar berubah yang ditulis.
   */
  private async repackRowNo(db: Prisma.TransactionClient, accountId: bigint, year: number): Promise<void> {
    await db.$executeRaw`
      UPDATE financial_transactions f
         SET row_no = x.n
        FROM (
               SELECT id,
                      row_number() OVER (ORDER BY row_no ASC NULLS LAST, id ASC) AS n
                 FROM financial_transactions
                WHERE internal_account_id = ${accountId}
                  AND "tagYear" = ${year}
             ) x
       WHERE f.id = x.id
         AND f.row_no IS DISTINCT FROM x.n
    `;
  }

  /**
   * Menambah satu atau lebih baris tepat di bawah `afterId` (atau paling atas kalau null).
   *
   * Baris-baris baru masuk berurutan sesuai urutan kirimnya dan mendapat nomor
   * lanjutan dari baris di atasnya; baris di bawahnya bergeser turun sebanyak
   * jumlah baris baru. Sesudahnya kolom saldo dirantai ulang sekali untuk semuanya.
   */
  async insertTransactions(rows: any[], accountId: string, tagYear: number, afterId?: number | null) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('No rows to save.');
    }

    const accountIdBig = BigInt(accountId);
    const after = afterId === undefined || afterId === null ? null : BigInt(afterId);

    const account = await this.prisma.internalAccount.findUnique({ where: { id: accountIdBig } });
    if (!account) throw new NotFoundException(`Account ${accountId} not found`);

    const refs = await this.resolveLedgers(rows);

    await this.prisma.$transaction(async (tx) => {
      await lockAccount(tx, accountIdBig);

      // Rapikan dulu jadi 1..n, supaya nomor baris tempat menyisip pasti bersih.
      await this.repackRowNo(tx, accountIdBig, tagYear);

      let floor = 0; // menyisip paling atas
      if (after !== null) {
        const anchor = await tx.financialTransaction.findUnique({
          where: { id: after },
          select: { internalAccountId: true, tagYear: true, rowNo: true },
        });
        if (!anchor) throw new NotFoundException(`Transaction ${after} not found`);
        if (anchor.internalAccountId !== accountIdBig || anchor.tagYear !== tagYear) {
          throw new BadRequestException(`Transaction ${after} belongs to another account or year`);
        }
        floor = anchor.rowNo ?? 0;
      }

      // Baris 1 2 3, menyisip dua baris di bawah baris 2: baris 3 jadi 5, dan
      // baris baru mendapat 3 dan 4.
      await tx.$executeRaw`
        UPDATE financial_transactions
           SET row_no = row_no + ${rows.length}
         WHERE internal_account_id = ${accountIdBig}
           AND "tagYear" = ${tagYear}
           AND row_no > ${floor}
      `;

      await tx.financialTransaction.createMany({
        data: rows.map((data, i) => ({
          internalAccountId: accountIdBig,
          // Tanggal boleh kosong: buku non-kas memang tidak memberi tanggal pada
          // sebagian besar barisnya, dan seeder menyimpannya kosong juga.
          colA: data.colA ? new Date(data.colA) : null,
          colB: data.colB || '',
          colC: parseDecimalSafe(data.colC, 'Debit') ?? '0',
          colD: parseDecimalSafe(data.colD, 'Credit') ?? '0',
          colE: 0,
          ledgerId: refs[i].ledgerId,
          subLedgerId: refs[i].subLedgerId,
          colF: refs[i].colF ?? '',
          colG: refs[i].colG ?? '',
          colH: data.colH || '',
          colI: data.colI || '',
          tagYear,
          rowNo: floor + i + 1,
        })),
      });

      // Tahun ini dan sesudahnya ditandai basi, lalu dihitung ulang di dalam
      // kunci yang sama - baris dan saldonya selesai bersamaan.
      await tx.fiscalPeriod.updateMany({
        where: { internalAccountId: accountIdBig, year: { gte: tagYear } },
        data: { isStale: true },
      });
      await this.recalcLocked(tx, accountIdBig, tagYear, true);
    }, LEDGER_TX);

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


  // --- Fiscal Control & Recalculation ---


  async closeYear(accountId: string, year: number, userId: string) {
    const accountIdBig = BigInt(accountId);

    const closingBalance = await this.prisma.$transaction(async (tx) => {
      await lockAccount(tx, accountIdBig);

      // Hitung ulang terakhir, supaya saldo akhir yang dibekukan benar-benar tepat.
      const closing = await this.recalcLocked(tx, accountIdBig, year, false);
      const existing = await tx.fiscalPeriod.findUnique({
        where: { internalAccountId_year: { internalAccountId: accountIdBig, year } },
      });
      const opening = existing ? existing.openingBalance : await this.openingFromPrevious(tx, accountIdBig, year);

      await tx.fiscalPeriod.upsert({
        where: { internalAccountId_year: { internalAccountId: accountIdBig, year } },
        update: { status: 'CLOSED', closingBalance: closing, closedAt: new Date(), closedById: BigInt(userId), isStale: false },
        create: {
          internalAccountId: accountIdBig, year, openingBalance: opening, status: 'CLOSED',
          closingBalance: closing, closedAt: new Date(), closedById: BigInt(userId), isStale: false,
        },
      });

      // Tahun-tahun sesudahnya mengikuti saldo akhir yang baru dibekukan.
      await this.recalcLocked(tx, accountIdBig, year + 1, true);
      return closing;
    }, LEDGER_TX);

    return { success: true, closingBalance: formatDecimal(closingBalance) };
  }

  /**
   * Menghitung ulang saldo berjalan (col_e) satu rekening-tahun, lalu saldo akhir
   * tahunnya dan saldo awal tahun berikutnya. Dipanggil oleh tombol Recalculate;
   * sisip, edit, hapus, tambah, dan tutup tahun memanggil `recalcLocked` di dalam
   * transaksinya sendiri.
   */
  async recalculateLedger(accountId: string, year: number, forceRecursion = false) {
    const accountIdBig = BigInt(accountId);
    const closing = await this.prisma.$transaction(
      async (tx) => {
        await lockAccount(tx, accountIdBig);
        return this.recalcLocked(tx, accountIdBig, year, forceRecursion);
      },
      LEDGER_TX,
    );
    return { success: true, finalBalance: formatDecimal(closing) };
  }

  /**
   * Inti hitung ulang saldo. HARUS dipanggil di dalam transaksi yang sudah
   * memegang kunci (rekening, tahun) ini - dengan begitu penyimpanan lain di
   * rekening-tahun yang sama menunggu sampai baris DAN saldonya selesai, dan
   * dua hitungan tidak bisa saling menimpa.
   *
   * Dulu saldo ditulis baris per baris di luar kunci (7-9 detik untuk 3.300
   * baris). Dua penyimpanan yang berdekatan menjalankan dua hitungan bersamaan;
   * yang mulai lebih dulu tidak tahu baris kedua, dan kalau ia selesai paling
   * akhir, saldo ribuan baris - dan saldo awal tahun berikutnya - tertinggal
   * salah. Sekarang satu UPDATE: saldo tiap baris = saldo awal + jumlah
   * (kredit - debit) sampai baris itu, menurut urutan baris. Hanya baris yang
   * saldonya berubah yang ditulis.
   *
   * Kunci rekening sudah dipegang pemanggil, jadi tahun-tahun sesudahnya ikut
   * aman ditulis di sini tanpa kunci tambahan.
   */
  private async recalcLocked(
    tx: Prisma.TransactionClient,
    accountId: bigint,
    year: number,
    forceRecursion: boolean,
  ): Promise<Prisma.Decimal> {
    const period = await tx.fiscalPeriod.findUnique({
      where: { internalAccountId_year: { internalAccountId: accountId, year } },
    });
    const opening = period ? new Prisma.Decimal(period.openingBalance) : await this.openingFromPrevious(tx, accountId, year);

    // col_e = saldo SESUDAH baris itu: saldo awal - debit + kredit, berurutan.
    await tx.$executeRaw`
      UPDATE financial_transactions f
         SET col_e = x.saldo
        FROM (
               SELECT id,
                      ${opening.toString()}::numeric
                      + SUM(COALESCE(col_d, 0) - COALESCE(col_c, 0)) OVER (
                          ORDER BY row_no ASC NULLS LAST, id ASC
                          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                        ) AS saldo
                 FROM financial_transactions
                WHERE internal_account_id = ${accountId}
                  AND "tagYear" = ${year}
             ) x
       WHERE f.id = x.id
         AND f.col_e IS DISTINCT FROM x.saldo
    `;

    const [{ movement }] = await tx.$queryRaw<{ movement: string }[]>`
      SELECT COALESCE(SUM(COALESCE(col_d, 0) - COALESCE(col_c, 0)), 0)::text AS movement
        FROM financial_transactions
       WHERE internal_account_id = ${accountId} AND "tagYear" = ${year}
    `;
    const closing = opening.plus(movement);

    if (period) {
      await tx.fiscalPeriod.update({
        where: { id: period.id },
        data: { closingBalance: closing, isStale: false },
      });
    }

    // Tahun berikutnya yang punya data - periode fiskal ATAU transaksi.
    const [nextFiscal, nextTrans] = await Promise.all([
      tx.fiscalPeriod.findFirst({
        where: { internalAccountId: accountId, year: { gt: year } },
        orderBy: { year: 'asc' },
      }),
      tx.financialTransaction.aggregate({
        where: { internalAccountId: accountId, tagYear: { gt: year } },
        _min: { tagYear: true },
      }),
    ]);
    const nextDataYear = Math.min(nextFiscal?.year ?? Infinity, nextTrans._min.tagYear ?? Infinity);

    if (nextDataYear !== Infinity) {
      if (nextFiscal && nextFiscal.year === nextDataYear) {
        await tx.fiscalPeriod.update({
          where: { id: nextFiscal.id },
          data: {
            openingBalance: closing,
            // Tanpa rekursi, tahun berikutnya ditandai perlu dihitung ulang.
            isStale: period?.status !== 'CLOSED',
          },
        });
      }
      // Diteruskan kalau tahun ini CLOSED (koreksi histori) atau diminta.
      if (period?.status === 'CLOSED' || forceRecursion) {
        await this.recalcLocked(tx, accountId, nextDataYear, forceRecursion);
      }
    }

    await tx.fiscalPeriod.updateMany({
      where: { internalAccountId: accountId, year },
      data: { isStale: false },
    });

    return closing;
  }

  /**
   * Saldo awal tahun yang belum punya periode fiskal: penutup tahun terakhir
   * sebelumnya yang punya data. Aturannya sama dengan `getLatestAnchor`, tapi
   * dibaca di dalam transaksi yang sedang berjalan - jadi ikut melihat saldo
   * yang baru saja ditulis di transaksi ini (misalnya saat tutup tahun),
   * bukan nilai lama yang belum di-commit.
   */
  private async openingFromPrevious(tx: Prisma.TransactionClient, accountId: bigint, year: number): Promise<Prisma.Decimal> {
    const [lastFiscal, lastTrans] = await Promise.all([
      tx.fiscalPeriod.findFirst({
        where: { internalAccountId: accountId, year: { lt: year } },
        orderBy: { year: 'desc' },
      }),
      tx.financialTransaction.aggregate({
        where: { internalAccountId: accountId, tagYear: { lt: year } },
        _max: { tagYear: true },
      }),
    ]);
    const searchYear = Math.max(lastFiscal?.year ?? 0, lastTrans._max.tagYear ?? 0);
    if (searchYear === 0) return new Prisma.Decimal(0);

    const prevFiscal = lastFiscal?.year === searchYear
      ? lastFiscal
      : await tx.fiscalPeriod.findUnique({
          where: { internalAccountId_year: { internalAccountId: accountId, year: searchYear } },
        });
    const movement = await tx.financialTransaction.aggregate({
      where: { internalAccountId: accountId, tagYear: searchYear },
      _sum: { colC: true, colD: true },
    });
    const hasMovement = movement._sum.colC !== null || movement._sum.colD !== null;
    const summed = prevFiscal || hasMovement
      ? new Prisma.Decimal(prevFiscal?.openingBalance ?? 0).plus(movement._sum.colD ?? 0).minus(movement._sum.colC ?? 0)
      : null;

    if (prevFiscal) {
      if (prevFiscal.closingBalance !== null) return new Prisma.Decimal(prevFiscal.closingBalance);
      return summed ?? new Prisma.Decimal(prevFiscal.openingBalance);
    }
    return summed ?? new Prisma.Decimal(0);
  }

}
