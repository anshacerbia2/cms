import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

const formatDecimal = (val: any): string => {
  if (val == null) return "0.0000";
  if (typeof val.toFixed === 'function') {
    try {
      const formatted = val.toFixed(4);
      if (formatted !== 'NaN') return formatted;
    } catch (e) {}
  }
  const num = Number(val.toString());
  if (isNaN(num)) return "0.0000";
  return num.toFixed(4);
};

@Injectable()
export class BankMutationService {
  constructor(private prisma: PrismaService) {}

  async getTransactions(query: PaginationQueryDto & { accountId?: string, year?: string }): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search || '';
    const accountIdFilter = query.accountId ? BigInt(query.accountId) : undefined;
    const yearFilter = query.year ? Number(query.year) : undefined;

    const where: any = {
      AND: [
        accountIdFilter ? { internalAccountId: accountIdFilter } : {},
        {
          OR: [
            { colB: { contains: search, mode: 'insensitive' } }, // description
          ],
        },
      ],
    };

    if (yearFilter) {
      const start = new Date(`${yearFilter}-01-01T00:00:00.000Z`);
      const end = new Date(`${yearFilter}-12-31T23:59:59.999Z`);
      where.AND.push({
        colA: {
          gte: start,
          lte: end
        }
      });
    }

    const [data, total] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        skip,
        take: limit,
        where,
        orderBy: [{ id: 'asc' }],
      }),
      this.prisma.financialTransaction.count({ where }),
    ]);

    return {
      data: data.map(t => ({
        ...t,
        id: Number(t.id),
        colC: formatDecimal(t.colC),
        colD: formatDecimal(t.colD),
        colE: formatDecimal(t.colE),
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async getAllTransactions(accountId?: string, year?: number): Promise<any[]> {
    const where: any = {};
    if (accountId) {
      where.internalAccountId = BigInt(accountId);
    }
    
    if (year) {
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${year}-12-31T23:59:59.999Z`);
      where.colA = {
        gte: start,
        lte: end
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

  async createBulkTransactions(data: any[], accountId: string, year: number, startingBalance?: string) {
    // 1. Find Account & Audit Protection
    const accountIdBig = BigInt(accountId);
    const [account, currentFiscal] = await Promise.all([
      this.prisma.internalAccount.findUnique({
        where: { id: accountIdBig }
      }),
      this.prisma.fiscalPeriod.findUnique({
        where: { internalAccountId_year: { internalAccountId: accountIdBig, year } }
      })
    ]);

    if (!account) throw new NotFoundException(`Account ${accountId} not found`);

    // 2. Validate that all dates match the target year
    for (const item of data) {
      if (item.colA) {
        const txDate = new Date(item.colA);
        if (txDate.getFullYear() !== year) {
          throw new Error(`Transaction date ${item.colA} does not match the target year ${year}.`);
        }
      }
    }

    // 3. Handle Starting Balance ONLY if explicitly provided (Initial Migration)
    if (startingBalance) {
      await this.updateOpeningBalance(accountId, year, startingBalance);
    }

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
        colJ: item.colJ || "",
      })),
    });

    // 5. If saving to an OPEN period, change status to ONGOING
    if (currentFiscal && currentFiscal.status === 'OPEN' && data.length > 0) {
      await this.prisma.fiscalPeriod.update({
        where: { id: currentFiscal.id },
        data: { status: 'ONGOING' }
      });
    }

    // 6. Mark current and future years as STALE if we are modifying a CLOSED period OR changing Starting Balance
    if (currentFiscal?.status === 'CLOSED' || startingBalance) {
      await this.prisma.fiscalPeriod.updateMany({
        where: {
          internalAccountId: account.id,
          year: { gte: year }
        },
        data: { isStale: true }
      });
    }

    // 7. Trigger Cascading Recalculation
    await this.recalculateLedger(accountId, year);

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
          balance: currentFiscal.closingBalance?.toString() || "0", 
          canEdit: false,
          isStale: currentFiscal.isStale,
          message: `Fiscal year ${year} is already ${currentFiscal.status}.`
        };
      }

      if (currentFiscal.status === 'OPEN') {
        return {
          status: currentFiscal.status,
          balance: currentFiscal.openingBalance.toString(),
          canEdit: true,
          isStale: currentFiscal.isStale,
          message: `Fiscal year ${year} is ${currentFiscal.status} with no transactions yet.`
        };
      }
      
      // ONGOING: Find latest transaction of CURRENT year
      const lastTrans = await this.prisma.financialTransaction.findFirst({
        where: { internalAccountId: accountIdBig, colA: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } },
        orderBy: [{ colA: 'desc' }, { id: 'desc' }],
      });

      const balance = lastTrans ? lastTrans.colE!.toString() : null;

      return { 
        status: currentFiscal.status, 
        balance, 
        canEdit: false,
        isStale: currentFiscal.isStale,
        message: lastTrans 
          ? `Using current running balance of ${year} (${currentFiscal.status}).`
          : `Warning: Period is ONGOING but no transactions found for ${year}.`
      };
    }

    // 2. Dynamic Discovery: Find the LATEST year with any data before the target year
    const [lastFiscal, lastTransaction] = await Promise.all([
      this.prisma.fiscalPeriod.findFirst({
        where: { internalAccountId: accountIdBig, year: { lt: year } },
        orderBy: { year: 'desc' }
      }),
      this.prisma.financialTransaction.findFirst({
        where: { internalAccountId: accountIdBig, colA: { lt: new Date(`${year}-01-01`) } },
        orderBy: [{ colA: 'desc' }, { id: 'desc' }]
      })
    ]);

    const fiscalYear = lastFiscal?.year || 0;
    const transYear = lastTransaction?.colA ? new Date(lastTransaction.colA).getFullYear() : 0;
    const searchYear = Math.max(fiscalYear, transYear);

    if (searchYear > 0) {
      // Re-fetch data for the discovered searchYear to apply logic
      const prevFiscal = lastFiscal?.year === searchYear ? lastFiscal : await this.prisma.fiscalPeriod.findUnique({
        where: { internalAccountId_year: { internalAccountId: accountIdBig, year: searchYear } }
      });

      const lastTransInYear = lastTransaction?.colA && new Date(lastTransaction.colA).getFullYear() === searchYear 
        ? lastTransaction 
        : await this.prisma.financialTransaction.findFirst({
            where: { internalAccountId: accountIdBig, colA: { gte: new Date(`${searchYear}-01-01`), lte: new Date(`${searchYear}-12-31`) } },
            orderBy: [{ colA: 'desc' }, { id: 'desc' }],
          });

      if (prevFiscal) {
        const openingBalance = prevFiscal.closingBalance !== null
          ? prevFiscal.closingBalance.toString()
          : (lastTransInYear ? lastTransInYear.colE!.toString() : prevFiscal.openingBalance.toString());

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
          balance: lastTransInYear.colE!.toString(),
          canEdit: false,
          referredYear: searchYear,
          message: `Auto-referred to latest transaction balance of year ${searchYear} (Lazy Registration)`
        };
      }
    }

    // 3. No previous record found at all
    return { 
      status: 'OPEN', 
      balance: "0", 
      canEdit: true,
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
 
    return this.prisma.fiscalPeriod.upsert({
      where: {
        internalAccountId_year: {
          internalAccountId: accountIdBig,
          year: year
        }
      },
      update: { openingBalance: amount },
      create: {
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

    // 2. Snapshot the current year as CLOSED
    await this.prisma.fiscalPeriod.upsert({
      where: { internalAccountId_year: { internalAccountId: accountIdBig, year } },
      update: {
        status: 'CLOSED',
        closingBalance: closingBalance,
        closedAt: new Date(),
        closedById: BigInt(userId)
      },
      create: {
        internalAccountId: accountIdBig,
        year,
        openingBalance: 0,
        status: 'CLOSED',
        closingBalance: closingBalance,
        closedAt: new Date(),
        closedById: BigInt(userId)
      }
    });

    // 3. Automatically carry forward to next year's OPENING balance
    await this.prisma.fiscalPeriod.upsert({
      where: { internalAccountId_year: { internalAccountId: accountIdBig, year: year + 1 } },
      update: { openingBalance: closingBalance },
      create: {
        internalAccountId: accountIdBig,
        year: year + 1,
        openingBalance: closingBalance,
        status: 'OPEN'
      }
    });

    // 4. Trigger cascading recalculation for the next year to ensure continuity
    await this.recalculateLedger(accountId, year + 1);

    return { success: true, closingBalance: formatDecimal(closingBalance) };
  }

  async recalculateLedger(accountId: string, year: number) {
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
        colA: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`)
        }
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
        data: { closingBalance: runningBalance }
      });
    }

    // 4. CASCADING UPDATE: Find the NEXT year that has ANY data (Fiscal OR Transactions)
    const [nextFiscal, nextTrans] = await Promise.all([
      this.prisma.fiscalPeriod.findFirst({
        where: { internalAccountId: accountIdBig, year: { gt: year } },
        orderBy: { year: 'asc' }
      }),
      this.prisma.financialTransaction.findFirst({
        where: { internalAccountId: accountIdBig, colA: { gte: new Date(`${year + 1}-01-01`) } },
        orderBy: [{ colA: 'asc' }, { id: 'asc' }]
      })
    ]);

    const nextFiscalYear = nextFiscal?.year || Infinity;
    const nextTransYear = nextTrans?.colA ? new Date(nextTrans.colA).getFullYear() : Infinity;
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
      if (period?.status === 'CLOSED') {
        await this.recalculateLedger(accountId, nextDataYear);
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
