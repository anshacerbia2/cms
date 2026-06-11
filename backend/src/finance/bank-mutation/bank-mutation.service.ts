import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { formatDecimal } from '../../common/utils/format.utils';


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
      orderBy: [{ id: 'asc' }],
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

    // 4. Insert transactions with LINKING to internalAccountId
    await this.prisma.financialTransaction.createMany({
      data: data.map(item => ({
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

  // --- Opening Balance & Anchor Logic ---

  async getLatestAnchor(accountId: string, year: number) {
    const accountIdBig = BigInt(accountId);

    // 1. Check current year first
    const currentFiscal = await this.prisma.fiscalPeriod.findUnique({
      where: { internalAccountId_year: { internalAccountId: accountIdBig, year } },
    });

    if (currentFiscal) {
      if (currentFiscal.status === 'CLOSED') {
        return { 
          status: currentFiscal.status, 
          balance: formatDecimal(currentFiscal.openingBalance), // Use openingBalance for the "Opening Balance" card
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
          canEdit: true,
          referredYear: year,
          isStale: currentFiscal.isStale,
          message: `Fiscal year ${year} is ${currentFiscal.status.toLowerCase()} with no transactions yet.`
        };
      }
      
      // ONGOING: Find latest transaction of CURRENT year
      const lastTrans = await this.prisma.financialTransaction.findFirst({
        where: { internalAccountId: accountIdBig, tagYear: year },
        orderBy: [{ colA: 'desc' }, { id: 'desc' }],
      });

      const balance = lastTrans ? formatDecimal(lastTrans.colE) : null;

      return { 
        status: currentFiscal.status, 
        balance, 
        canEdit: false,
        referredYear: year,
        isStale: currentFiscal.isStale,
        message: lastTrans 
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

      const lastTransInYear = lastTransaction?.tagYear === searchYear 
        ? lastTransaction 
        : await this.prisma.financialTransaction.findFirst({
            where: { internalAccountId: accountIdBig, tagYear: searchYear },
            orderBy: [{ colA: 'desc' }, { id: 'desc' }],
          });

      if (prevFiscal) {
        const openingBalance = prevFiscal.closingBalance !== null
          ? formatDecimal(prevFiscal.closingBalance)
          : (lastTransInYear ? formatDecimal(lastTransInYear.colE) : formatDecimal(prevFiscal.openingBalance));

        let source = "opening balance";
        if (prevFiscal.closingBalance !== null) {
          source = "closing balance";
        } else if (lastTransInYear) {
          source = "latest transaction balance";
        }

        return {
          status: prevFiscal.status, 
          balance: openingBalance,
          canEdit: false,
          referredYear: searchYear,
          message: `Auto-referred to ${source} of year ${searchYear}`
        };
      } 
      
      // If no fiscal record, but we found transactions (Lazy Year)
      if (lastTransInYear) {
        return {
          status: 'ONGOING',
          balance: formatDecimal(lastTransInYear.colE),
          canEdit: false,
          referredYear: searchYear,
          message: `Auto-referred to latest transaction balance of year ${searchYear} (Lazy Registration)`
        };
      }
    }

    // 3. No previous record found at all (First time setup)
    return { 
      status: 'INITIAL', 
      balance: "0", 
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

    // 2. Fetch all transactions for this bank in this year, ordered by Date then ID
    const transactions = await this.prisma.financialTransaction.findMany({
      where: {
        internalAccountId: accountIdBig,
        tagYear: year
      },
      orderBy: [
        { colA: 'asc' },
        { id: 'asc' }
      ]
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
