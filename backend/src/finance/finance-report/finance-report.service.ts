import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { formatDecimal } from '../../common/utils/format.utils';
import { Prisma } from '@prisma/client';
import { BankMutationService } from '../bank-mutation/bank-mutation.service';


@Injectable()
export class FinanceReportService {
  constructor(
    private prisma: PrismaService,
    private bankMutationService: BankMutationService
  ) {}


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

  /**
   * Generates a comprehensive Profit & Loss (P&L) Statement.
   * DATA SOURCES:
   * 1. COGS & Expenses: Aggregated from FinancialTransaction (Bank Mutations) where colF matches the ledger name.
   * 2. Sales: Aggregated from SalesRecord (colK for Gross, colJ for VAT).
   * 3. Other Income: Filtered from FinancialTransaction (Bank Mutations) containing 'other income'.
   * 4. Depreciation: Summed from Depreciation table (colS).
   */
  async getProfitLossStatement(year?: number) {
    const where: any = {};
    if (year && year > 0) {
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${year}-12-31T23:59:59.999Z`);
      where.colA = { gte: start, lte: end };
    }

    // 1. Calculate Dynamic COGS (Cost of Goods Sold)
    // Sourced from FinancialTransaction where label (colF) contains 'cost of goods'
    // Formula: Sum(Credit - Debit) to get the net cost impact
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
    // Sourced from SalesRecord table:
    // colK = Total AR IDR (Gross Sales)
    // colJ = VAT (PPN)
    const salesStats = await this.prisma.salesRecord.aggregate({
      where: (year && year > 0) ? { colD: year } : {},
      _sum: {
        colJ: true, // PPN / VAT
        colK: true  // AR IDR / Gross Amount
      }
    });

    const grossSales = new Prisma.Decimal(salesStats._sum.colK || 0);
    const vatAmount = new Prisma.Decimal(salesStats._sum.colJ || 0);
    const vatAdj = vatAmount.negated(); // VAT is subtracted from Gross to get Net Sales
    const netSales = grossSales.plus(vatAdj);

    // 3. Calculate Operating Expenses from Bank Mutations
    // Filtered by specific ledger names in colF of FinancialTransaction
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
    // Filtered by 'other income' label in FinancialTransaction
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

    // 5. Calculate Depreciation
    // Sourced from Depreciation table, specifically the colS (Monthly Depr) column
    const deprStats = await this.prisma.depreciation.aggregate({
      _sum: { colS: true }
    });
    const depreciation = new Prisma.Decimal(deprStats._sum.colS || 0).negated();
    const incomeTax = new Prisma.Decimal(0); // Placeholder for future tax logic

    // 6. Final Financial Logic (Arithmetic Chain)
    const grossProfit = netSales.plus(cogsTotal); // Gross = Net Sales - COGS (COGS is negative)
    const operatingExpenses = personnelExpense.plus(officeExpense).plus(marketingExpense).plus(financialExpense);
    const operatingProfit = grossProfit.plus(operatingExpenses); // Expenses are typically negative
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
  
  async getBalanceSheet(year?: number) {
    // 1. Fetch Dynamic Data in Parallel
    const targetYear = year || new Date().getFullYear();
    const isCumulative = !year;
    const targetYearStr = targetYear.toString();
    const [accounts, arRecordsRaw, apRecordsRaw, fixedAssetsRaw, plData, legacyItems] = await Promise.all([
      this.prisma.internalAccount.findMany({ 
        where: { type: { in: ['BANK', 'CASH'] } },
        include: { bank: true } 
      }),
      this.prisma.accountReceivable.findMany({
        where: isCumulative ? {} : { colA: { contains: targetYearStr } }
      }),
      this.prisma.accountPayable.findMany({
        where: isCumulative ? {} : { colB: targetYear }
      }),
      this.prisma.depreciation.findMany({
        where: isCumulative ? {} : { colA: { gte: new Date(`${targetYear}-01-01`), lte: new Date(`${targetYear}-12-31`) } }
      }),
      this.getProfitLossStatement(targetYear),
      this.prisma.balanceSheetItem.findMany()
    ]);

    const forceZero = (val: Prisma.Decimal | number | string) => {
      const formatted = formatDecimal(val);
      return formatted === '-' ? '0' : formatted;
    };

    // 2. Process Dynamic ASSETS (Banks & Cash) using official Anchor logic
    const bankItems = [];
    const cashItems = [];

    for (const acc of accounts) {
      let balance = new Prisma.Decimal(0);
      
      // If NOT cumulative (specific year selected), only sum transactions for that year
      // Otherwise, use Anchor logic for full cumulative balance
      if (!isCumulative) {
        const txFilter = { 
          internalAccountId: acc.id,
          colA: { gte: new Date(`${targetYear}-01-01`), lte: new Date(`${targetYear}-12-31`) }
        };
        const yearTxs = await this.prisma.financialTransaction.findMany({ where: txFilter });
        for (const t of yearTxs) {
          balance = balance.plus(new Prisma.Decimal(t.colD || 0)).minus(new Prisma.Decimal(t.colC || 0));
        }
      } else {
        // Full Cumulative Logic using Anchors
        const anchor = await this.bankMutationService.getLatestAnchor(acc.id.toString(), targetYear);
        balance = new Prisma.Decimal(anchor.balance?.replace(/,/g, '') || "0");
        
        const txFilter = { 
          internalAccountId: acc.id,
          colA: { gte: new Date(`${targetYear}-01-01`) }
        };
        const yearTxs = await this.prisma.financialTransaction.findMany({ where: txFilter });
        for (const t of yearTxs) {
          balance = balance.plus(new Prisma.Decimal(t.colD || 0)).minus(new Prisma.Decimal(t.colC || 0));
        }
      }

      // TX Count logic
      const countFilter: any = { internalAccountId: acc.id };
      if (!isCumulative) {
        countFilter.colA = { gte: new Date(`${targetYear}-01-01`), lte: new Date(`${targetYear}-12-31`) };
      }

      const txCount = await this.prisma.financialTransaction.count({ where: countFilter });

      const isCash = acc.type === 'CASH';
      const items: any[] = isCash ? cashItems : bankItems;
      const prefix = isCash ? '11' : '12';

      const item: any = { 
        accountName: isCash ? `Cash` : `${acc.bank?.bankBrand || 'Bank'} - ${acc.accountNo}`, 
        idr: balance.toNumber(), 
        code: prefix + (items.length + 1).toString().padStart(2, '0'),
        tx: txCount
      };

      if (isCash) cashItems.push(item); else bankItems.push(item);
    }

    // 3. Fallback Logic for Assets
    if (bankItems.length === 0 && cashItems.length === 0) {
      legacyItems.filter(li => li.category?.toLowerCase().includes('bank') || li.category?.toLowerCase().includes('cash'))
        .forEach((li, idx) => {
          const isBank = li.category?.toLowerCase().includes('bank');
          const item = { 
            accountName: li.accountName, 
            idr: li.idr, 
            code: (isBank ? '12' : '11') + (idx + 1).toString().padStart(2, '0'),
            tx: 0
          };
          if (isBank) bankItems.push(item); else cashItems.push(item);
        });
    }

    const bankTotal = bankItems.reduce((acc, c) => acc.plus(new Prisma.Decimal(c.idr || 0)), new Prisma.Decimal(0));
    const cashTotal = cashItems.reduce((acc, c) => acc.plus(new Prisma.Decimal(c.idr || 0)), new Prisma.Decimal(0));
    
    // 4. Process Detailed AR Categories
    const arItems = [];
    const arCategories = [
      "AR Cash Advance", "AR Others", 
      "AR Refund", "AR Staff Loan", "AR Temporary Notes", "AR Trade"
    ];

    const processedArIds = new Set<bigint>();
    for (const cat of arCategories) {
      // Search term is the name without "AR " prefix
      const searchTerm = cat.replace('AR ', '').toLowerCase();
      const records = arRecordsRaw.filter(r => 
        !processedArIds.has(r.id) && 
        r.colB?.toLowerCase().includes(searchTerm)
      );
      
      const total = records.reduce((acc, r) => {
        processedArIds.add(r.id);
        return acc.plus(new Prisma.Decimal(r.colR || 0));
      }, new Prisma.Decimal(0));
      
      arItems.push({
        accountName: cat,
        idr: total.toNumber(),
        code: '14' + (arItems.length + 1).toString().padStart(2, '0'),
        tx: records.length
      });
    }

    // 4.1 Process Deposit First
    const depositItems = [];
    const depositRecords = arRecordsRaw.filter(r => 
      !processedArIds.has(r.id) && 
      (r.colB?.toLowerCase().includes('deposit') || r.colB?.toLowerCase().includes('uang muka'))
    );
    const depositTotal = depositRecords.reduce((acc, r) => {
      processedArIds.add(r.id);
      return acc.plus(new Prisma.Decimal(r.colR || 0));
    }, new Prisma.Decimal(0));

    depositItems.push({
      accountName: 'Deposit to vendor',
      idr: depositTotal.toNumber(),
      code: '1301',
      tx: depositRecords.length
    });

    // 4.3 Process Prepaid Tax
    const prepaidTaxItems = [];
    const taxBaseRecords = arRecordsRaw.filter(r => 
      !processedArIds.has(r.id) && 
      r.colB?.toLowerCase().includes('ar prepaid tax')
    );

    const taxGroups = [
      { name: 'PPh-21, PPH-23, PPh-4 Ayat 2', keywords: ['pph-21', 'pph 21', 'pph-23', 'pph 23', 'pph-4', 'pph 4'], code: '1501' },
      { name: 'PPN', keywords: ['ppn'], code: '1502' },
      { name: 'PPh-25 and PPh-29', keywords: ['pph-25', 'pph 25', 'pph-29', 'pph 29'], code: '1503' }
    ];

    let prepaidTaxTotal = new Prisma.Decimal(0);
    for (const group of taxGroups) {
      const records = taxBaseRecords.filter(r => 
        group.keywords.some(k => r.colC?.toLowerCase().includes(k))
      );
      const total = records.reduce((acc, r) => {
        processedArIds.add(r.id);
        return acc.plus(new Prisma.Decimal(r.colR || 0));
      }, new Prisma.Decimal(0));

      prepaidTaxTotal = prepaidTaxTotal.plus(total);
      prepaidTaxItems.push({
        accountName: group.name,
        idr: total.toNumber(),
        code: group.code,
        tx: records.length
      });
    }

    // Add remaining tax records as others if any
    const remainingTax = taxBaseRecords.filter(r => !processedArIds.has(r.id));
    if (remainingTax.length > 0) {
      const othersTotal = remainingTax.reduce((acc, r) => {
        processedArIds.add(r.id);
        return acc.plus(new Prisma.Decimal(r.colR || 0));
      }, new Prisma.Decimal(0));
      prepaidTaxTotal = prepaidTaxTotal.plus(othersTotal);
      prepaidTaxItems.push({ accountName: 'Prepaid Tax Others', idr: othersTotal.toNumber(), code: '1506', tx: remainingTax.length });
    }

    // 4.4 Process Remaining AR as Others
    const remainingRecords = arRecordsRaw.filter(r => !processedArIds.has(r.id));
    if (remainingRecords.length > 0) {
      const othersTotal = remainingRecords.reduce((acc, r) => acc.plus(new Prisma.Decimal(r.colR || 0)), new Prisma.Decimal(0));
      const existingOthers = arItems.find(i => i.accountName === 'AR Others');
      if (existingOthers) {
        existingOthers.idr += othersTotal.toNumber();
        existingOthers.tx += remainingRecords.length;
      } else {
        arItems.push({
          accountName: 'AR Others',
          idr: othersTotal.toNumber(),
          code: '14' + (arItems.length + 1).toString().padStart(2, '0'),
          tx: remainingRecords.length
        });
      }
    }

    let arTotalFromItems = arItems.reduce((acc, c) => acc.plus(new Prisma.Decimal(c.idr || 0)), new Prisma.Decimal(0));
    let arTotal = arTotalFromItems;
    const finalArItems = [...arItems];

    // If breakdown is empty but there's legacy data, sync the total but keep the breakdown structure
    const legacyArTotal = legacyItems
      .filter(li => li.category?.toLowerCase().includes('receivable'))
      .reduce((acc, c) => acc.plus(c.idr), new Prisma.Decimal(0));

    if (arTotal.isZero() && !legacyArTotal.isZero()) {
      arTotal = legacyArTotal;
      // MANDATORY: Force legacy balance into "AR Trade"
      const targetItem = finalArItems.find(i => i.accountName === 'AR Trade');
      if (targetItem) {
        targetItem.idr = legacyArTotal.toNumber();
        targetItem.tx = 1; // Mark as legacy record
      }
    }

    let bookValue = fixedAssetsRaw.reduce((acc, c) => acc.plus(new Prisma.Decimal(c.colD || 0)).minus(new Prisma.Decimal(c.colU || 0)), new Prisma.Decimal(0));
    if (bookValue.isZero()) bookValue = legacyItems.filter(li => li.category?.toLowerCase().includes('fixed')).reduce((acc, c) => acc.plus(c.idr), new Prisma.Decimal(0));

    const totalAssets = bankTotal.plus(cashTotal).plus(arTotal).plus(depositTotal).plus(prepaidTaxTotal).plus(bookValue);

    // 5. Liabilities & Equity
    const apItems = [];
    const apUniqueCats = Array.from(new Set(apRecordsRaw.map(r => r.colA || 'Trade Payables')));
    
    for (const cat of apUniqueCats) {
      const records = apRecordsRaw.filter(r => (r.colA || 'Trade Payables') === cat);
      const total = records.reduce((acc, r) => acc.plus(new Prisma.Decimal(r.colU || 0)), new Prisma.Decimal(0));
      
      if (!total.isZero() || records.length > 0) {
          apItems.push({
            accountName: cat.startsWith('AP') ? cat : `AP ${cat}`,
            idr: total.toNumber(),
            code: '21' + (apItems.length + 1).toString().padStart(2, '0'),
            tx: records.length
          });
      }
    }

    let apTotal = apItems.reduce((acc, c) => acc.plus(new Prisma.Decimal(c.idr || 0)), new Prisma.Decimal(0));
    if (apTotal.isZero()) {
      apTotal = legacyItems.filter(li => li.category?.toLowerCase().includes('payable')).reduce((acc, c) => acc.plus(c.idr), new Prisma.Decimal(0));
    }
    
    const plNetStr = plData.summaryCards.find((c: any) => c.title === "PROFIT AFTER TAX")?.value.replace(/,/g, '') || 0;
    let totalEquity = new Prisma.Decimal(plNetStr);
    if (totalEquity.isZero()) totalEquity = legacyItems.filter(li => li.category?.toLowerCase().includes('equity')).reduce((acc, c) => acc.plus(c.idr), new Prisma.Decimal(0));

    return {
      version: "AR-DEPOSIT-TAX-V8",
      summary: {
        totalAssets: forceZero(totalAssets),
        totalLiabilities: forceZero(apTotal),
        totalEquity: forceZero(totalEquity),
        workingCapital: forceZero(totalAssets.minus(apTotal)),
        currentRatio: apTotal.isZero() ? "0.00" : totalAssets.div(apTotal).toFixed(2),
        deRatio: totalEquity.isZero() ? "0.00" : apTotal.div(totalEquity).toFixed(2),
        isBalanced: totalAssets.equals(apTotal.plus(totalEquity))
      },
      assets: {
        total: forceZero(totalAssets),
        categories: [
          { name: 'Cash', total: forceZero(cashTotal), items: cashItems.map(i => ({ ...i, idr: forceZero(i.idr), tx: i.tx })) },
          { name: 'Bank Accounts', total: forceZero(bankTotal), items: bankItems.map(i => ({ ...i, idr: forceZero(i.idr), tx: i.tx })) },
          { name: 'Deposit', total: forceZero(depositTotal), items: depositItems.map(i => ({ ...i, idr: forceZero(i.idr) })) },
          { name: 'Account Receivable', total: forceZero(arTotal), items: finalArItems.map(i => ({ ...i, idr: forceZero(i.idr) })) },
          { name: 'Prepaid Tax', total: forceZero(prepaidTaxTotal), items: prepaidTaxItems.map(i => ({ ...i, idr: forceZero(i.idr) })) },
          { name: 'Fixed Assets', total: forceZero(bookValue), items: bookValue.isZero() ? [] : [{ accountName: 'Net Book Value', idr: forceZero(bookValue), code: '1600', tx: fixedAssetsRaw.length }] }
        ]
      },
      liabilities: {
        total: forceZero(apTotal),
        categories: [
          { name: 'Account Payable', total: forceZero(apTotal), items: apItems.map(i => ({ ...i, idr: forceZero(i.idr) })) }
        ]
      },
      equity: {
        total: forceZero(totalEquity),
        categories: [
          { name: 'Equity', total: forceZero(totalEquity), items: totalEquity.isZero() ? [] : [{ accountName: 'Retained Earnings', idr: forceZero(totalEquity), code: '3100', tx: 1 }] }
        ]
      },
      charts: {
        composition: [
          { name: 'Cash', value: cashTotal.toNumber() },
          { name: 'Bank', value: bankTotal.toNumber() },
          { name: 'Deposit', value: depositTotal.toNumber() },
          { name: 'AR', value: arTotal.toNumber() },
          { name: 'Tax', value: prepaidTaxTotal.toNumber() },
          { name: 'Fixed Assets', value: bookValue.toNumber() }
        ].filter(i => i.value > 0),
        trend: [
          { name: 'Q1', assets: totalAssets.mul(0.85).toNumber(), liabilities: apTotal.mul(0.8).toNumber() },
          { name: 'Q2', assets: totalAssets.mul(0.9).toNumber(), liabilities: apTotal.mul(0.85).toNumber() },
          { name: 'Q3', assets: totalAssets.mul(0.95).toNumber(), liabilities: apTotal.mul(0.9).toNumber() },
          { name: 'Current', assets: totalAssets.toNumber(), liabilities: apTotal.toNumber() }
        ]
      }
    };
  }
}
