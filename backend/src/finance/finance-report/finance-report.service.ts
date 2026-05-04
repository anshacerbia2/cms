import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { formatDecimal } from '../../common/utils/format.utils';
import { Prisma } from '@prisma/client';


@Injectable()
export class FinanceReportService {
  constructor(private prisma: PrismaService) {}


  // AP methods have been moved to ApService


  async getAssets(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.depreciation.findMany({ skip, take: limit, orderBy: [{ id: 'asc' }] }),
      this.prisma.depreciation.count(),
    ]);

    return {
      data: data.map((item: any) => ({
        ...item,
        id: Number(item.id),
        colD: formatDecimal(item.colD),
        colF: formatDecimal(item.colF),
        colG: formatDecimal(item.colG),
        colH: formatDecimal(item.colH),
        colI: formatDecimal(item.colI),
        colJ: formatDecimal(item.colJ),
        colK: formatDecimal(item.colK),
        colL: formatDecimal(item.colL),
        colM: formatDecimal(item.colM),
        colN: formatDecimal(item.colN),
        colO: formatDecimal(item.colO),
        colP: formatDecimal(item.colP),
        colQ: formatDecimal(item.colQ),
        colR: formatDecimal(item.colR),
        colS: formatDecimal(item.colS),
        colT: formatDecimal(item.colT),
        colU: formatDecimal(item.colU),
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async getAllAssets(): Promise<any[]> {
    const data = await this.prisma.depreciation.findMany({
      orderBy: [{ id: 'asc' }],
    });

    return data.map((item: any) => ({
      ...item,
      id: Number(item.id),
      colD: formatDecimal(item.colD),
      colF: formatDecimal(item.colF),
      colG: formatDecimal(item.colG),
      colH: formatDecimal(item.colH),
      colI: formatDecimal(item.colI),
      colJ: formatDecimal(item.colJ),
      colK: formatDecimal(item.colK),
      colL: formatDecimal(item.colL),
      colM: formatDecimal(item.colM),
      colN: formatDecimal(item.colN),
      colO: formatDecimal(item.colO),
      colP: formatDecimal(item.colP),
      colQ: formatDecimal(item.colQ),
      colR: formatDecimal(item.colR),
      colS: formatDecimal(item.colS),
      colT: formatDecimal(item.colT),
      colU: formatDecimal(item.colU),
    }));
  }

  async getRevenue(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const data = await this.prisma.financeRevenue.findMany({ orderBy: [{ id: 'asc' }] });
    const total = data.length;

    return {
      data: data.map(i => ({
        ...i,
        colD: formatDecimal(i.colD),
        colE: formatDecimal(i.colE),
        colF: formatDecimal(i.colF),
      })),
      meta: { total, page: 1, limit: total, lastPage: 1 },
    };
  }

  async createBulkRevenue(data: any[]) {
    await this.prisma.financeRevenue.deleteMany();
    return this.prisma.financeRevenue.createMany({
      data: data.map(i => ({
        colA: i.colA,
        colB: i.colB,
        colC: i.colC,
        colD: i.colD || 0,
        colE: i.colE || 0,
        colF: i.colF || 0,
      })),
    });
  }


  async getExpenses(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const data = await this.prisma.financeExpense.findMany({ orderBy: [{ id: 'asc' }] });
    const total = data.length;

    return {
      data: data.map(i => ({
        ...i,
        colD: formatDecimal(i.colD),
        colE: formatDecimal(i.colE),
        colF: formatDecimal(i.colF),
      })),

      meta: { total, page: 1, limit: total, lastPage: 1 },
    };
  }

  async createBulkExpenses(data: any[]) {
    await this.prisma.financeExpense.deleteMany();
    return this.prisma.financeExpense.createMany({
      data: data.map(i => ({
        colA: i.colA,
        colB: i.colB,
        colC: i.colC,
        colD: i.colD || 0,
        colE: i.colE || 0,
        colF: i.colF || 0,
      })),
    });
  }


  async getBalanceSheet(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const data = await this.prisma.balanceSheetItem.findMany({ orderBy: [{ id: 'asc' }] });
    const total = data.length;

    return {
      data: data.map(item => ({
        ...item,
        idr: formatDecimal(item.idr),
        usd: formatDecimal(item.usd),
        rate: formatDecimal(item.rate),
      })),
      meta: { total, page: 1, limit: total, lastPage: 1 },
    };
  }


  async getProfitLossStatement(year?: number) {
    const where: any = {};
    if (year && year > 0) {
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${year}-12-31T23:59:59.999Z`);
      where.colA = { gte: start, lte: end };
    }

    // 1. Calculate Dynamic COGS from Bank Mutations
    const cogsTransactions = await this.prisma.financialTransaction.findMany({
      where: {
        ...where,
        colF: { contains: 'cost of goods', mode: 'insensitive' },
      },
    });

    let cogsTotal = new Prisma.Decimal(0);
    for (const trx of cogsTransactions) {
      const debit = new Prisma.Decimal(trx.colC || 0);
      const credit = new Prisma.Decimal(trx.colD || 0);
      cogsTotal = cogsTotal.plus(credit).minus(debit);
    }

    // 2. Calculate Dynamic Sales from SalesRecord
    const salesStats = await this.prisma.salesRecord.aggregate({
      where: (year && year > 0) ? { colD: year } : {},
      _sum: {
        colJ: true, // PPN
        colK: true  // AR IDR
      }
    });

    const grossSales = new Prisma.Decimal(salesStats._sum.colK || 0);
    const vatAmount = new Prisma.Decimal(salesStats._sum.colJ || 0);
    const vatAdj = vatAmount.negated();
    const netSales = grossSales.plus(vatAdj);

    // 3. Hardcoded Values (Set to 0 as requested)

    // 3. Calculate Expenses from Bank Mutations
    const expenseTransactions = await this.prisma.financialTransaction.findMany({
      where: {
        ...where,
        colF: {
          in: ['Personnel Expense', 'Office Expense', 'Marketing Expense', 'Financial Expense'],
          mode: 'insensitive'
        }
      }
    });

    let personnelExpense = new Prisma.Decimal(0);
    let officeExpense = new Prisma.Decimal(0);
    let marketingExpense = new Prisma.Decimal(0);
    let financialExpense = new Prisma.Decimal(0);

    for (const trx of expenseTransactions) {
      const debit = new Prisma.Decimal(trx.colC || 0);
      const credit = new Prisma.Decimal(trx.colD || 0);
      const net = credit.minus(debit);
      const ledger = (trx.colF || '').toLowerCase();

      if (ledger.includes('personnel')) personnelExpense = personnelExpense.plus(net);
      else if (ledger.includes('office')) officeExpense = officeExpense.plus(net);
      else if (ledger.includes('marketing')) marketingExpense = marketingExpense.plus(net);
      else if (ledger.includes('financial')) financialExpense = financialExpense.plus(net);
    }

    // 4. Calculate Other Income from Bank Mutations
    const otherIncomeTransactions = await this.prisma.financialTransaction.findMany({
      where: {
        ...where,
        colF: { contains: 'other income', mode: 'insensitive' }
      }
    });

    let otherIncome = new Prisma.Decimal(0);
    for (const trx of otherIncomeTransactions) {
      const debit = new Prisma.Decimal(trx.colC || 0);
      const credit = new Prisma.Decimal(trx.colD || 0);
      otherIncome = otherIncome.plus(credit).minus(debit);
    }

    // 5. Calculate Depreciation from Depreciation table (Total colS)
    const deprStats = await this.prisma.depreciation.aggregate({
      _sum: { colS: true }
    });
    const depreciation = new Prisma.Decimal(deprStats._sum.colS || 0).negated();
    const incomeTax = new Prisma.Decimal(0);

    // 5. Derived Totals
    const grossProfit = netSales.plus(cogsTotal);
    const operatingExpenses = personnelExpense.plus(officeExpense).plus(marketingExpense).plus(financialExpense);
    const operatingProfit = grossProfit.plus(operatingExpenses);
    const otherIncomeNet = otherIncome.plus(depreciation);
    const profitBeforeTax = operatingProfit.plus(otherIncomeNet);
    const netProfit = profitBeforeTax.plus(incomeTax);

    // 4. Construct Response
    return {
      summaryCards: [
        {
          title: "NET SALES",
          value: formatDecimal(netSales),
          grossValue: formatDecimal(grossSales),
          color: "text-primary"
        },
        {
          title: "GROSS PROFIT",
          value: formatDecimal(grossProfit),
          margin: netSales.isZero() ? "0.0000" : grossProfit.div(netSales).times(100).toFixed(4),
          color: "text-emerald-500"
        },
        {
          title: "OPERATING PROFIT",
          value: formatDecimal(operatingProfit),
          opexValue: formatDecimal(operatingExpenses),
          color: "text-blue-500"
        },
        {
          title: "PROFIT AFTER TAX",
          value: formatDecimal(netProfit),
          netMargin: netSales.isZero() ? "0.0000" : netProfit.div(netSales).times(100).toFixed(4),
          color: "text-indigo-500"
        }
      ],
      tableData: [
        { account: "REVENUE", total: 0, isHeader: true },
        { account: "Sales", gross: formatDecimal(grossSales), vatAdj: formatDecimal(vatAdj), total: formatDecimal(netSales) },
        { account: "Cost of Goods", total: formatDecimal(cogsTotal), isSubItem: true },
        { account: "GROSS PROFIT", total: formatDecimal(grossProfit), isTotal: true },
        
        { account: "EXPENSES", total: 0, isHeader: true },
        { account: "Personnel Expense", total: formatDecimal(personnelExpense), hasInfo: true, isSubItem: true },
        { account: "Office Expense", total: formatDecimal(officeExpense), isSubItem: true },
        { account: "Marketing Expense", total: formatDecimal(marketingExpense), isSubItem: true },
        { account: "Financial Expense", total: formatDecimal(financialExpense), isSubItem: true },
        { account: "Total Expense", total: formatDecimal(operatingExpenses), isTotal: true },
        
        { account: "PROFITABILITY", total: 0, isHeader: true },
        { account: "Operating Profit", total: formatDecimal(operatingProfit) },
        { account: "Other Income (Expense)", total: formatDecimal(otherIncome) },
        { account: "Depreciation", total: formatDecimal(depreciation) },
        { account: "Profit Before Tax", total: formatDecimal(profitBeforeTax) },
        { account: "Income Tax", total: formatDecimal(incomeTax) },
        { account: "PROFIT AFTER TAX", total: formatDecimal(netProfit), isTotal: true },
      ]
    };
  }

  async getPLSummary(): Promise<any[]> {
    const data = await this.prisma.profitLossSummary.findMany({
      orderBy: [{ id: 'asc' }],
    });

    return data.map(item => ({
      ...item,
      label: item.category, // Map category to label for frontend
      bca: formatDecimal(item.bca),
      mandiri: formatDecimal(item.mandiri),
      bri: formatDecimal(item.bri),
      btn: formatDecimal(item.btn),
      cashIdr: formatDecimal(item.cashIdr),
      nonCb: formatDecimal(item.nonCb),
      other: formatDecimal(item.other),
      total: formatDecimal(item.total),
    }));
  }


  async getInterAccountTransfers(query: PaginationQueryDto): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.interAccountTransfer.findMany({ skip, take: limit, orderBy: [{ id: 'asc' }] }),
      this.prisma.interAccountTransfer.count(),
    ]);

    return {
      data: data.map(t => ({
        ...t,
        bca: formatDecimal(t.bca),
        mandiri: formatDecimal(t.mandiri),
        bri: formatDecimal(t.bri),
        btn: formatDecimal(t.btn),
        cashIdr: formatDecimal(t.cashIdr),
        nonCashBank: formatDecimal(t.nonCashBank),
        checker: formatDecimal(t.checker),
      })),
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async getPLDetails(year?: number, ledger?: string) {
    const where: any = {};
    if (year && year > 0) {
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${year}-12-31T23:59:59.999Z`);
      where.colA = { gte: start, lte: end };
    }
    
    if (ledger) {
      where.colF = { contains: ledger, mode: 'insensitive' };
    }

    const data = await this.prisma.financialTransaction.findMany({
      where,
      include: {
        internalAccount: {
          include: { bank: true }
        }
      },
      orderBy: { colA: 'desc' }
    });

    return data.map(trx => {
      const debit = new Prisma.Decimal(trx.colC || 0);
      const credit = new Prisma.Decimal(trx.colD || 0);
      const net = credit.minus(debit);

      return {
        id: trx.id,
        date: trx.colA,
        description: trx.colB,
        amount: formatDecimal(net),
        bankBrand: trx.internalAccount?.bank?.bankBrand || '',
        bankName: trx.internalAccount?.bank?.bankName || 'Unknown',
        accountNo: trx.internalAccount?.accountNo || '',
        branch: trx.internalAccount?.branch || '',
        holderName: trx.internalAccount?.holderName || '',
        accountType: trx.internalAccount?.type,
        ledger: trx.colF
      };
    });
  }
}
