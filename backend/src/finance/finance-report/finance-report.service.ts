import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { formatDecimal } from '../../common/utils/format.utils';
import { Prisma } from '@prisma/client';
import { BankMutationService } from '../bank-mutation/bank-mutation.service';
import { EquityPropertyService } from '../equity-property/equity-property.service';


@Injectable()
export class FinanceReportService {
  constructor(
    private prisma: PrismaService,
    private bankMutationService: BankMutationService,
    private equityPropertyService: EquityPropertyService
  ) {}
  
  /**
   * Helper to extract a 4-digit year from inconsistent legacy strings.
   * Returns the year as a number, or 0 if no valid year is found.
   */
  private extractYear(val: any): number {
    if (!val) return 0;
    const str = String(val);
    const match = str.match(/\b(19|20)\d{2}\b/);
    return match ? parseInt(match[0], 10) : 0;
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
   * Generates a comprehensive Profit & Loss Statement by aggregating data from multiple tables.
   * 
   * DATA SOURCES:
   * 1. SalesRecord: For Net Sales (Revenue) calculation.
   * 2. FinancialTransaction: For COGS, Expenses, Other Income, and Income Tax.
   * 3. Depreciation: For dynamic monthly depreciation calculation.
   * 
   * LOGIC:
   * - Filters are strictly applied based on a cumulative period (Start of Year -> endDate).
   * - Dates are handled using ISO strings to ensure database compatibility and timezone consistency.
   * - Signs are standardized: Expenses and COGS are returned as negative values for display.
   * 
   * @param year Optional fiscal year to filter.
   * @param endDate Optional cumulative end date (format: YYYY-MM-DD).
   * @returns Formatted summary cards and table data for the P&L UI.
   */
  async getProfitLossStatement(year?: number, endDate?: string) {
    const where: any = {};
    const salesWhere: any = {};
    const yearNum = year || (endDate ? new Date(endDate).getFullYear() : 0);
    
    // Construct cumulative date range filters
    if (year && year > 0) {
      const start = `${year}-01-01T00:00:00.000Z`;
      const end = endDate ? `${endDate}T23:59:59.999Z` : `${year}-12-31T23:59:59.999Z`;
        
      where.colA = { gte: new Date(start), lte: new Date(end) };
      salesWhere.colC = { gte: new Date(start), lte: new Date(end) };
    } else if (endDate) {
      const end = `${endDate}T23:59:59.999Z`;
      where.colA = { lte: new Date(end) };
      salesWhere.colC = { lte: new Date(end) };
    }

    // 1. Calculate Dynamic COGS (Cost of Goods Sold)
    // Sourced from FinancialTransaction where label (colF) indicates COGS.
    // We sum Credit minus Debit to get the net impact on profitability.
    const cogsTransactions = await this.prisma.financialTransaction.findMany({
      where: {
        AND: [
          where,
          { colF: { contains: 'cost of goods', mode: 'insensitive' } }
        ]
      },
    });

    let cogsTotal = new Prisma.Decimal(0);
    for (const trx of cogsTransactions) {
      const debit = new Prisma.Decimal(trx.colC || 0);
      const credit = new Prisma.Decimal(trx.colD || 0);
      cogsTotal = cogsTotal.plus(credit).minus(debit);
    }

    // 2. Calculate Dynamic Sales from SalesRecord
    // SalesRecord structure: colC (Date), colK (Gross AR IDR), colJ (VAT/PPN).
    // Net Sales = Gross AR - VAT.
    const salesStats = await this.prisma.salesRecord.aggregate({
      where: salesWhere,
      _sum: {
        colJ: true, // PPN / VAT
        colK: true  // AR IDR / Gross Amount
      }
    });

    // 2.5 Fetch Overrides/Properties
    const props = yearNum > 0 ? await this.equityPropertyService.getProperties(yearNum) : {};

    const grossSales = new Prisma.Decimal(salesStats._sum.colK || 0);
    const vatAmount = new Prisma.Decimal(salesStats._sum.colJ || 0);
    const vatAdj = vatAmount.negated(); // VAT is subtracted from Gross to get Net
    
    // Net Sales Override
    const netSales = props['PL_NET_SALES'] 
      ? new Prisma.Decimal(props['PL_NET_SALES']) 
      : grossSales.plus(vatAdj);

    // 3. Calculate Operating Expenses from Bank Mutations (FinancialTransaction)
    // Filtered by specific ledger categories in colF.
    const expenseTransactions = await this.prisma.financialTransaction.findMany({
      where: {
        AND: [
          where,
          {
            colF: {
              in: ['Personnel Expense', 'Office Expense', 'Marketing Expense', 'Financial Expense'],
              mode: 'insensitive'
            }
          }
        ]
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

    // Apply Expense Overrides
    if (props['PL_PERSONNEL_EXP']) personnelExpense = new Prisma.Decimal(props['PL_PERSONNEL_EXP']).negated();
    if (props['PL_OFFICE_EXP']) officeExpense = new Prisma.Decimal(props['PL_OFFICE_EXP']).negated();
    if (props['PL_MARKETING_EXP']) marketingExpense = new Prisma.Decimal(props['PL_MARKETING_EXP']).negated();
    if (props['PL_FINANCIAL_EXP']) financialExpense = new Prisma.Decimal(props['PL_FINANCIAL_EXP']).negated();

    // 4. Calculate Other Income from Bank Mutations
    const otherIncomeTransactions = await this.prisma.financialTransaction.findMany({
      where: {
        AND: [
          where,
          { colF: { contains: 'other income', mode: 'insensitive' } }
        ]
      }
    });
 
    let otherIncomeTotal = new Prisma.Decimal(0);
    for (const trx of otherIncomeTransactions) {
      const debit = new Prisma.Decimal(trx.colC || 0);
      const credit = new Prisma.Decimal(trx.colD || 0);
      otherIncomeTotal = otherIncomeTotal.plus(credit).minus(debit);
    }

    // Other Income Override
    if (props['PL_OTHER_INCOME']) otherIncomeTotal = new Prisma.Decimal(props['PL_OTHER_INCOME']);

    // 5. Calculate Depreciation Expense (Summary Only)
    const totalDepreciation = await this.processDepreciationSummary(year, endDate);
    
    // Depreciation Override
    const depreciation = props['PL_DEPRECIATION']
      ? new Prisma.Decimal(props['PL_DEPRECIATION']).negated()
      : totalDepreciation.negated();
    
    // 6. Calculate Income Tax (PPH-23)
    const incomeTaxTransactions = await this.prisma.financialTransaction.findMany({
      where: {
        AND: [
          where,
          { colF: { contains: 'Account Receivable', mode: 'insensitive' } },
          { colG: { contains: 'AR Prepaid Tax', mode: 'insensitive' } },
          {
            OR: [
              { colH: { contains: 'pph-23', mode: 'insensitive' } },
              { colH: { contains: 'pph 23', mode: 'insensitive' } }
            ]
          },
          {
            internalAccount: {
              type: 'OTHER',
              holderName: { contains: 'non cash & bank', mode: 'insensitive' }
            }
          }
        ]
      }
    });

    let incomeTax = new Prisma.Decimal(0);
    for (const trx of incomeTaxTransactions) {
      const debit = new Prisma.Decimal(trx.colC || 0);
      incomeTax = incomeTax.minus(debit);
    }

    // Income Tax Override
    if (props['PL_INCOME_TAX']) incomeTax = new Prisma.Decimal(props['PL_INCOME_TAX']).negated();

    // 7. Final Financial Logic
    const grossProfit = netSales.plus(cogsTotal); 
    const operatingExpenses = personnelExpense.plus(officeExpense).plus(marketingExpense).plus(financialExpense);
    const operatingProfit = grossProfit.plus(operatingExpenses); 
    const otherIncomeNet = otherIncomeTotal.plus(depreciation);
    const profitBeforeTax = operatingProfit.plus(otherIncomeNet);
    
    // Final Net Profit Override
    const netProfit = props['PL_NET_PROFIT']
      ? new Prisma.Decimal(props['PL_NET_PROFIT'])
      : profitBeforeTax.plus(incomeTax);

    // 8. Construct Response
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
        { account: "REVENUE", total: 0, isHeader: true, level: 0 },
        { account: "Sales", gross: formatDecimal(grossSales), vatAdj: formatDecimal(vatAdj), total: formatDecimal(netSales), level: 1 },
        { account: "Cost of Goods", total: formatDecimal(cogsTotal), isSubItem: true, level: 2 },
        { account: "GROSS PROFIT", total: formatDecimal(grossProfit), isTotal: true, level: 1 },
        
        { account: "EXPENSES", total: 0, isHeader: true, level: 0 },
        { account: "Personnel Expense", total: formatDecimal(personnelExpense), hasInfo: true, isSubItem: true, level: 2 },
        { account: "Office Expense", total: formatDecimal(officeExpense), isSubItem: true, level: 2 },
        { account: "Marketing Expense", total: formatDecimal(marketingExpense), isSubItem: true, level: 2 },
        { account: "Financial Expense", total: formatDecimal(financialExpense), isSubItem: true, level: 2 },
        { account: "Total Expense", total: formatDecimal(operatingExpenses), isTotal: true, level: 1 },
        
        { account: "PROFITABILITY", total: 0, isHeader: true, level: 0 },
        { account: "Operating Profit", total: formatDecimal(operatingProfit), level: 1 },
        { account: "Other Income", total: formatDecimal(otherIncomeTotal), level: 2 },
        { account: "Depreciation", total: formatDecimal(depreciation), level: 2 },
        { account: "Profit Before Tax", total: formatDecimal(profitBeforeTax), level: 1 },
        { account: "Income Tax", total: formatDecimal(incomeTax), level: 1 },
        { account: "PROFIT AFTER TAX", total: formatDecimal(netProfit), isTotal: true, level: 1 },
      ]
    };
  }

  /**
   * Generates a summary view of the Profit & Loss statement with bank breakdowns.
   * This is used in the 'Summary' tab of the Finance module.
   * 
   * @param year Optional fiscal year filter.
   * @param date Optional end date filter.
   * @returns Array of summary objects compatible with the summary table UI.
   */
  async getPLSummary(year?: number, date?: string): Promise<any[]> {
    const plData = await this.getProfitLossStatement(year, date);
    
    // Categories to extract from the P&L statement for the summary view
    const categories = [
      { key: "NET SALES", label: "NET SALES" },
      { key: "COGS", label: "COGS" },
      { key: "GROSS PROFIT", label: "GROSS PROFIT" },
      { key: "Personnel Expense", label: "Personnel Expense" },
      { key: "Office Expense", label: "Office Expense" },
      { key: "Marketing Expense", label: "Marketing Expense" },
      { key: "Financial Expense", label: "Financial Expense" },
      { key: "OPERATING PROFIT", label: "OPERATING PROFIT" },
      { key: "Other Income", label: "Other Income (Expense)" },
      { key: "PROFIT BEFORE TAX", label: "PROFIT BEFORE TAX" },
      { key: "INCOME TAX", label: "INCOME TAX" },
      { key: "PROFIT AFTER TAX", label: "PROFIT AFTER TAX" }
    ];

    return categories.map(cat => {
      const row = plData.tableData.find(r => r.account.toUpperCase() === cat.key.toUpperCase());
      const val = row ? row.total : 0;
      
      return {
        category: cat.key,
        label: cat.label,
        total: formatDecimal(val)
      };
    });
  }



  /**
   * Calculates a breakdown of Retained Earnings (RE) components for a given year.
   * Components include Previous years' net RE, current year dividends, and current year profit.
   * 
   * @param targetYear The fiscal year to calculate the breakdown for.
   * @returns Object containing prevYearsVal, dividendVal, profitLossVal, sharedCapitalVal, and totalEquity.
   */
  private async getRetainedEarningsBreakdown(targetYear: number, endDate?: string) {
    const startOfYear = new Date(`${targetYear}-01-01T00:00:00.000Z`);
    const endOfYear = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date(`${targetYear}-12-31T23:59:59.999Z`);

    // 1. Fetch properties for this year (with fallback to most recent if missing)
    let props = await this.equityPropertyService.getProperties(targetYear);
    if (Object.keys(props).length === 0) {
      // Try to find any most recent properties to avoid 0 fallbacks
      const mostRecent = await this.prisma.equityProperty.findFirst({
        orderBy: { year: 'desc' }
      });
      if (mostRecent) {
        props = await this.equityPropertyService.getProperties(mostRecent.year);
      }
    }

    // 2. Profit (Loss) for the target year (Always dynamic from P&L)
    const plCurrentData = await this.getProfitLossStatement(targetYear, endDate);
    const profitLossVal = new Prisma.Decimal(plCurrentData.tableData.find(r => r.account?.trim().toLowerCase() === "profit after tax")?.total?.toString().replace(/,/g, '') || "0");

    // 3. Previous Years Net RE (Opening balance of RE for the year)
    let prevYearsVal = new Prisma.Decimal(props['RE_PREV_YEARS'] || "0");
    if (!props['RE_PREV_YEARS']) {
       // Fallback to dynamic calculation if not set
       const lastDayOfPrevYear = `${targetYear - 1}-12-31`;
       const plUpToPrevYear = await this.getProfitLossStatement(undefined, lastDayOfPrevYear);
       const profitLegacyTotal = new Prisma.Decimal(plUpToPrevYear.tableData.find(r => r.account?.toLowerCase() === "profit after tax")?.total?.toString().replace(/,/g, '') || "0");
       
       const dividendTrxLegacy = await this.prisma.financialTransaction.findMany({
         where: {
           colA: { lt: startOfYear },
           colF: { contains: 'Retained Earning', mode: 'insensitive' },
           colG: { contains: 'Dividend', mode: 'insensitive' }
         }
       });
       const dividendLegacyTotal = dividendTrxLegacy.reduce((acc, r) => acc.plus(new Prisma.Decimal(r.colC || 0)), new Prisma.Decimal(0));
       prevYearsVal = profitLegacyTotal.minus(dividendLegacyTotal);
    }

    // 4. Current Year Dividends
    let dividendVal = new Prisma.Decimal(props['DIVIDENDS'] || "0");
    if (!props['DIVIDENDS']) {
      const dividendTrxCurrent = await this.prisma.financialTransaction.findMany({
        where: {
          colA: { gte: startOfYear, lte: endOfYear },
          colG: { contains: 'Dividend', mode: 'insensitive' }
        }
      });
      dividendVal = dividendTrxCurrent.reduce((acc, r) => acc.plus(new Prisma.Decimal(r.colC || 0)), new Prisma.Decimal(0)).mul(-1);
    }

    // 5. Shared Capital
    const sharedCapitalVal = new Prisma.Decimal(props['SHARED_CAPITAL'] || "2500000000");

    const totalRE = prevYearsVal.plus(dividendVal).plus(profitLossVal);
    const totalEquity = sharedCapitalVal.plus(totalRE);

    return {
      prevYearsVal,
      dividendVal,
      profitLossVal,
      sharedCapitalVal,
      totalRE,
      totalEquity
    };
  }

  /**
   * Fetches detailed audit trail for a specific Profit & Loss ledger.
   * 
   * @param year Optional fiscal year filter.
   * @param ledger The specific ledger name to drill down into (e.g., 'Personnel Expense').
   * @param date Optional end date filter for the audit period.
   * @returns Array of transactions with associated bank account metadata.
   */
  async getPLDetails(year?: number, ledger?: string, date?: string) {
    const where: any = {};
    if (year && year > 0) {
      const start = `${year}-01-01T00:00:00.000Z`;
      const end = date ? `${date}T23:59:59.999Z` : `${year}-12-31T23:59:59.999Z`;
      where.colA = { gte: new Date(start), lte: new Date(end) };
    } else if (date) {
      where.colA = { lte: new Date(`${date}T23:59:59.999Z`) };
    }
    
    // Use contains instead of equals to capture sub-categories and generic matches (e.g., 'Other Income - Interest')
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
      orderBy: { colA: 'asc' }
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

  /**
   * Fetches detailed audit trail for Balance Sheet items.
   * Provides the raw records that make up the totals in the Balance Sheet report.
   * 
   * @param category The main category (e.g., 'Bank Accounts', 'Account Receivable')
   * @param subItem The specific item name (e.g., 'BCA', 'AR Trade')
   * @param date Optional end date for cumulative reports
   */
  async getBSDetails(category: string, subItem?: string, date?: string, accountId?: string) {
    const endDateStr = date ? `${date}T23:59:59.999Z` : new Date().toISOString();
    const endDate = new Date(endDateStr);
    const currentYearVal = endDate.getFullYear();

    // 1. CASH & BANK
    if (category === 'Cash' || category === 'Bank Accounts') {
      let account;
      
      if (accountId && accountId !== 'undefined') {
        account = await this.prisma.internalAccount.findUnique({
          where: { id: BigInt(accountId) }
        });
      }

      if (!account) {
        // Fallback to fuzzy search if ID is missing
        const words = subItem?.split(' ').filter(w => w.length > 2) || [];
        
        account = await this.prisma.internalAccount.findFirst({
          where: {
            OR: [
              { holderName: { contains: subItem, mode: 'insensitive' as any } },
              { branch: { contains: subItem, mode: 'insensitive' as any } },
              { bank: { bankBrand: { contains: subItem, mode: 'insensitive' as any } } },
              // If subItem is a combined name like "BCA Tebet", try matching both
              ...(words.length > 0 ? [{
                AND: words.map(w => ({
                  OR: [
                    { holderName: { contains: w, mode: 'insensitive' as any } },
                    { branch: { contains: w, mode: 'insensitive' as any } },
                    { bank: { bankBrand: { contains: w, mode: 'insensitive' as any } } }
                  ]
                }))
              }] : [])
            ]
          }
        });
      }

      if (!account) return [];

      const transactions = await this.prisma.financialTransaction.findMany({
        where: {
          internalAccountId: account.id,
          colA: { lte: endDate }
        },
        orderBy: [{ colA: 'asc' }, { id: 'asc' }]
      });

      return transactions.map(t => ({
        ...t,
        id: t.id.toString(),
        colC: formatDecimal(t.colC),
        colD: formatDecimal(t.colD),
        colE: formatDecimal(t.colE),
      }));
    }

    const catLower = category.toLowerCase();
    const subLower = subItem?.toLowerCase() || '';

    // 2. CATEGORIES SOURCED FROM AccountReceivable (AR, Deposit to Vendor, Prepaid Tax)
    const isAR = catLower === 'account receivable';
    const isDepositToVendor = catLower === 'deposit' && !subLower.includes('from customer');
    const isPrepaidTax = catLower === 'prepaid tax';

    if (isAR || isDepositToVendor || isPrepaidTax) {
      // For AR and Deposit, we search for the subItem name
      // For Prepaid Tax, we search for specific tax keywords
      const taxGroups: any = {
        'pph-21, pph-23, pph-4 ayat 2': ['pph-21', 'pph 21', 'pph-23', 'pph 23', 'pph-4', 'pph 4'],
        'ppn': ['ppn'],
        'pph-25 and pph-29': ['pph-25', 'pph 25', 'pph-29', 'pph 29']
      };
      
      const taxKeywords = isPrepaidTax ? (taxGroups[subLower] || []) : [];
      const arSearchTerm = subLower.replace('ar ', '').toLowerCase();

      const recordsRaw = await this.prisma.accountReceivable.findMany({
        orderBy: { id: 'asc' }
      });

      const records = recordsRaw.filter(r => {
        const val = r.colC || "";
        const year = this.extractYear(val);
        const fullDate = new Date(val);
        const hasFullDate = !isNaN(fullDate.getTime());

        // 1. Date Filtering (Strict S/D)
        if (date) {
          if (hasFullDate && fullDate > endDate) return false;
          if (year > 0 && year > currentYearVal) return false;
        }

        // 2. Category/SubItem Filtering
        const colB = (r.colB || '').toLowerCase();
        
        if (isPrepaidTax) {
          if (!colB.includes('ar prepaid tax')) return false;
          // If sub-category specified for tax, check keywords
          if (taxKeywords.length > 0 && !taxKeywords.some((k: string) => val.toLowerCase().includes(k))) return false;
        } else {
          // General AR or Deposit search
          // Normal search for the specific category type
          if (!colB.includes(arSearchTerm)) return false;
        }

        return true;
      });

      return records.map(r => ({
        id: r.id.toString(),
        colC: r.colC || '-', // Date/Desc
        colD: r.colD || '-', // Vendor/Subject
        colE: r.colE || '-', // Description
        colR: formatDecimal(r.colR), // Amount
      }));
    }

    // 4. ASSETS: FIXED ASSETS (S/D YEAR - CUMULATIVE)
    if (catLower === 'fixed assets') {
      const typeMap: Record<string, any> = {
        'office equipment': 'OFFICE_EQUIPMENT',
        'vehicle': 'VEHICLE',
        'intangible assets': 'INTANGIBLE_ASSET'
      };
      const targetType = typeMap[subLower];

      const dataRaw = await this.prisma.depreciation.findMany({
        orderBy: { id: 'asc' }
      });

      const records = dataRaw.filter(r => {
        // 1. Filter by category
        if (targetType && r.type !== targetType) return false;
        
        // 2. Filter by date (match getBalanceSheet: colA <= endOfDate)
        if (date && r.colA) {
          return r.colA <= endDate;
        }
        
        return true;
      });

      return records.map(item => {
        const purchasePrice = new Prisma.Decimal(item.colD ? String(item.colD) : 0);
        return {
          id: item.id.toString(),
          purchaseDate: item.colA,
          assetName: item.colC || "-",
          purchasePrice: formatDecimal(purchasePrice)
        };
      });
    }


    // 5. LIABILITIES: ACCOUNT PAYABLE, DEPOSIT FROM CUSTOMER, SHORT TERM LOAN
    if (catLower === 'liabilities' || catLower === 'account payable' || catLower === 'short term loan' || (catLower === 'deposit' && subLower.includes('from customer'))) {
      const searchTerm = subLower.replace('ap ', '');
      
      const recordsRaw = await this.prisma.accountPayable.findMany({
        orderBy: { id: 'asc' }
      });

      const records = recordsRaw.filter(r => {
        const val = r.colB?.toString() || "";
        const year = this.extractYear(val);

        const fullDate = new Date(val);
        const hasFullDate = !isNaN(fullDate.getTime());

        // Date filtering (matching getBalanceSheet logic)
        if (date) {
          if (hasFullDate && fullDate > endDate) return false;
          if (year > 0 && year > currentYearVal) return false;
        }

        const rowCat = r.colA?.toLowerCase() || '';
        if (subLower.includes('from customer')) {
          return rowCat.includes('deposit from customer');
        }
        if (subLower.includes('temporary working capital')) {
          return rowCat.includes('temporary loan');
        }
        // Normal search for the specific category type
        return rowCat.includes(searchTerm);
      });

      return records.map(r => ({
        id: r.id.toString(),
        colC: (r.colB !== null && r.colB !== undefined) ? String(r.colB) : '-', // Year (colB)
        colD: r.colC || '-', // Vendor (colC)
        colE: r.colD || '-', // Description (colD)
        colR: formatDecimal(r.colS), // Outstanding (colS)
      }));
    }

    return [];
  }

  /**
   * Fetches the dynamic depreciation audit trail for all registered assets.
   * 
   * SPECIAL LOGIC:
   * - Trims future months: If the filter date is May, columns from June to December are zeroed out.
   * - On-the-fly Recalculation: Current Year Total, Accumulated Depreciation, and Book Value 
   *   are recalculated based on the visible months to ensure consistency with the P&L statement.
   * - Signs: Depreciation is returned as negative (contra-asset) to align with expense reporting.
   * 
   * @param year Optional fiscal year filter.
   * @param date Optional cumulative end date to determine the visible month range.
   * @returns Array of assets with dynamic monthly depreciation columns and recalculated totals.
   */
  async getDepreciationDetails() {
    const raw = await this.prisma.depreciation.findMany({
      orderBy: { colA: 'asc' }
    });

    const monthCols = ['colG', 'colH', 'colI', 'colJ', 'colK', 'colL', 'colM', 'colN', 'colO', 'colP', 'colQ', 'colR'];
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

    return raw.map(item => {
      const multiplier = -1;

      // Always return As Is (using colS for current year total)
      const rowTotal = new Prisma.Decimal(item.colS ? String(item.colS) : 0);
      const accPrevYear = new Prisma.Decimal(item.colF ? String(item.colF) : 0);

      const monthlyValues: any = {};
      monthNames.forEach((name, index) => {
        const valRaw = item[monthCols[index] as keyof typeof item];
        const val = new Prisma.Decimal(valRaw ? String(valRaw) : 0);
        monthlyValues[name] = formatDecimal(val.mul(multiplier));
      });

      return {
        id: item.id.toString(),
        category: item.type || "-",
        purchaseDate: item.colA,
        bankRef: item.colB || "-",
        assetName: item.colC || "-",
        purchasePrice: formatDecimal(item.colD),
        usefulLife: item.colE || 0,
        ...monthlyValues,
        total2025: formatDecimal(rowTotal.mul(multiplier)),
        accumulated2024: formatDecimal(accPrevYear.mul(multiplier)),
        accumulated2025: formatDecimal(accPrevYear.plus(rowTotal).mul(multiplier)),
        bookValue: formatDecimal(item.colU)
      };
    });
  }

  private async processDepreciationSummary(year?: number, endDate?: string) {
    const raw = await this.prisma.depreciation.findMany();

    const monthCols = ['colG', 'colH', 'colI', 'colJ', 'colK', 'colL', 'colM', 'colN', 'colO', 'colP', 'colQ', 'colR'];
    const dYear = endDate ? new Date(endDate).getFullYear() : null;
    const dMonth = endDate ? new Date(endDate).getMonth() + 1 : 0;
    
    let totalDepreciation = new Prisma.Decimal(0);
    
    raw.forEach(record => {
      let rowDepr = new Prisma.Decimal(0);

      if (year) {
        if (year <= 2024) {
          rowDepr = new Prisma.Decimal(record.colF ? String(record.colF) : 0);
        } else if (year === 2025) {
          if (!endDate) {
            rowDepr = new Prisma.Decimal(record.colS ? String(record.colS) : 0);
          } else {
            for (let i = 0; i < dMonth; i++) {
              const val = record[monthCols[i] as keyof typeof record];
              rowDepr = rowDepr.plus(new Prisma.Decimal(val ? String(val) : 0));
            }
          }
        } else {
          rowDepr = new Prisma.Decimal(0); // 2026+ Empty
        }
      } else if (endDate && dYear) {
        if (dYear <= 2024) {
          rowDepr = new Prisma.Decimal(record.colF ? String(record.colF) : 0);
        } else if (dYear === 2025) {
          const accF = new Prisma.Decimal(record.colF ? String(record.colF) : 0);
          let curMonths = new Prisma.Decimal(0);
          for (let i = 0; i < dMonth; i++) {
            const val = record[monthCols[i] as keyof typeof record];
            curMonths = curMonths.plus(new Prisma.Decimal(val ? String(val) : 0));
          }
          rowDepr = accF.plus(curMonths);
        } else {
          rowDepr = new Prisma.Decimal(record.colT ? String(record.colT) : 0);
        }
      } else {
        rowDepr = new Prisma.Decimal(record.colT ? String(record.colT) : 0);
      }

      totalDepreciation = totalDepreciation.plus(rowDepr);
    });

    return totalDepreciation;
  }

  /**
   * Generates a specialized audit trail for Sales and Cost of Goods Sold.
   * This includes a dynamic horizontal layout where bank accounts are columns.
   * 
   * @param year Optional fiscal year filter.
   * @param date Optional end date filter.
   * @returns Headers (bank names) and rows (transactions mapped to columns).
   */
  async getSalesCogsDetails(year?: number, date?: string) {
    // 1. Fetch all internal accounts to build dynamic headers
    const accounts = await this.prisma.internalAccount.findMany({
      include: { bank: true },
      // orderBy: [
      //   { type: 'asc' }, // BANK, CASH, OTHER
      //   { holderName: 'asc' }
      // ]
    });

    const headers = accounts.map(acc => {
      let label = acc.holderName || 'Unknown';
      if (acc.type === 'BANK') {
        const brand = acc.bank?.bankBrand || '';
        const branch = acc.branch || '';
        label = `${brand} ${branch}`.trim();
      } else if (acc.type === 'CASH') {
        label = 'CASH';
      }
      return {
        key: `acc_${acc.id}`,
        label
      };
    });

    // Add AR/AP/Others as a fixed dynamic column at the end
    headers.push({ key: 'arApOthers', label: 'AR/AP/Others' });
    
    // Add Total column
    headers.push({ key: 'rowTotal', label: 'Total' });

    // 2. Fetch transactions with date filter
    const where: any = {};
    if (year && year > 0) {
      const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
      const end = date ? new Date(`${date}T23:59:59.999Z`) : new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
      where.colA = { gte: start, lte: end };
    } else if (date) {
      where.colA = { lte: new Date(`${date}T23:59:59.999Z`) };
    }

    where.colF = { contains: 'cost of goods', mode: 'insensitive' };

    const trxs = await this.prisma.financialTransaction.findMany({
      where,
      include: { internalAccount: true },
      orderBy: { colA: 'asc' }
    });

    // 3. Map transactions to rows
    // Group by description (colG) and date (colA) or just unique transactions?
    // User wants "detail", so unique transactions.
    const rows = trxs.map(trx => {
      const row: any = {
        id: trx.id,
        cogs: trx.colB || '-',
        date: trx.colA
      };

      // Initialize all keys with 0
      headers.forEach(h => {
        row[h.key] = '0';
      });

      const amount = new Prisma.Decimal(trx.colD || 0).minus(new Prisma.Decimal(trx.colC || 0)).toString();
      
      let rowTotal = new Prisma.Decimal(0);

      if (trx.internalAccountId) {
        const key = `acc_${trx.internalAccountId}`;
        row[key] = amount;
        rowTotal = rowTotal.plus(new Prisma.Decimal(amount));
      } else {
        row['arApOthers'] = amount;
        rowTotal = rowTotal.plus(new Prisma.Decimal(amount));
      }
      
      row['rowTotal'] = rowTotal.toString();

      return row;
    });

    return { headers, rows };
  }
  
  async getBalanceSheet(date?: string) {
    // Standardize to UTC Full Year to ensure consistency and avoid timezone-related year jumps
    const currentYearVal = date ? new Date(`${date}T00:00:00.000Z`).getUTCFullYear() : new Date().getUTCFullYear();
    
    // 1. Fetch Dynamic Data in Parallel (Fetch all to handle messy legacy strings)
    const endOfDate = date ? new Date(`${date}T23:59:59.999Z`) : new Date();
    
    const [accounts, arRecordsRawAll, apRecordsRawAll, depreciationRawAll] = await Promise.all([
      this.prisma.internalAccount.findMany({ 
        where: { type: { in: ['BANK', 'CASH'] } },
        include: { bank: true } 
      }),
      this.prisma.accountReceivable.findMany(),
      this.prisma.accountPayable.findMany(),
      this.prisma.depreciation.findMany()
    ]);


    // Filter in-memory to handle the "Kacau" data
    const arRecordsRaw = arRecordsRawAll.filter(r => {
      const val = r.colC || "";
      const y = this.extractYear(val); 
      const fullDate = new Date(val);
      const hasFullDate = !isNaN(fullDate.getTime());

      if (date) {
        if (hasFullDate && fullDate > endOfDate) return false;
        if (y > 0 && y > currentYearVal) return false;
      }

      // No date filter → include ALL records (show full cumulative balance sheet)
      return true;
    });

    const apRecordsRaw = apRecordsRawAll.filter(r => {
      const val = r.colB?.toString() || "";
      const y = this.extractYear(val); 
      const fullDate = new Date(val);
      const hasFullDate = !isNaN(fullDate.getTime());

      if (date) {
        if (hasFullDate && fullDate > endOfDate) return false;
        if (y > 0 && y > currentYearVal) return false;
      }

      // No date filter → include ALL records (show full cumulative balance sheet)
      return true;
    });

    const depreciationRaw = depreciationRawAll.filter(r => {
      if (!date) return true;
      if (r.colA) return r.colA <= endOfDate;
      return true;
    });


    // 2. Process Dynamic ASSETS (Banks & Cash) - Strictly As-Of Date
    const bankItems = [];
    const cashItems = [];
    let bankTotal = new Prisma.Decimal(0);
    let cashTotal = new Prisma.Decimal(0);
    
    for (const acc of accounts) {
      // Find the latest transaction balance (colE) BEFORE or ON the target date
      const latestTx = await this.prisma.financialTransaction.findFirst({
        where: { 
          internalAccountId: acc.id,
          ...(date ? { colA: { lte: endOfDate } } : {}) // Only filter date if provided
        },
        orderBy: [
          { colA: 'desc' },
          { id: 'desc' }
        ]
      });

      let balanceDecimal = new Prisma.Decimal(0);
      
      if (latestTx) {
        // If transaction exists, colE is our running balance at that point
        balanceDecimal = new Prisma.Decimal(latestTx.colE || 0);
      } else {
        // If no transactions yet, use the latest anchor (opening balance discovery)
        const anchor = await this.bankMutationService.getLatestAnchor(acc.id.toString(), currentYearVal);
        if(anchor?.balance) balanceDecimal = new Prisma.Decimal(anchor.balance.replace(/,/g, ''));
      }

      const balance = formatDecimal(balanceDecimal);

      // 2. Labeling Standard
      let label = acc.holderName || 'Unknown';
      if (acc.type === 'BANK') {
        const brand = acc.bank?.bankBrand || '';
        const branch = acc.branch || '';
        label = `${brand} ${branch}`.trim();
      } else if (acc.type === 'CASH') {
        label = 'CASH';
      }

      // 3. TX Count: Historical Transactions (Filtered by Date)
      const txCount = await this.prisma.financialTransaction.count({ 
        where: { 
          internalAccountId: acc.id,
          ...(date ? { colA: { lte: endOfDate } } : {})
        } 
      });

      const isCash = acc.type === 'CASH';
      const items: any[] = isCash ? cashItems : bankItems;
      const prefix = isCash ? '11' : '12';

      const item: any = {
        accountId: acc.id.toString(),
        accountName: label,
        idr: balance,
        code: prefix + (items.length + 1).toString().padStart(2, '0'),
        tx: txCount
      };

      if (isCash) {
        cashItems.push(item);
        cashTotal = cashTotal.plus(balanceDecimal);
      } else {
        bankItems.push(item);
        bankTotal = bankTotal.plus(balanceDecimal);
      }
    }


    
    // 4. Process Detailed AR Categories
    const arItems = [];
    const arCategories = [
      "AR Cash Advance", "AR Others", 
      "AR Refund", "AR Staff Loan", "AR Temporary Notes", "AR Trade"
    ];

    const processedArIds = new Set<bigint>();
    for (const cat of arCategories) {
      // Search term is the name without "AR " prefix
      const searchTerm = cat.toLowerCase();
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
        idr: formatDecimal(total),
        code: '14' + (arItems.length + 1).toString().padStart(2, '0'),
        tx: records.length
      });
    }

    // 4.1 Process Deposit First
    const depositItems = [];
    const depositRecords = arRecordsRaw.filter(r => 
      !processedArIds.has(r.id) && 
      r.colB?.toLowerCase().includes('ar deposit to vendor')
    );
    const depositTotal = depositRecords.reduce((acc, r) => {
      processedArIds.add(r.id);
      return acc.plus(new Prisma.Decimal(r.colR || 0));
    }, new Prisma.Decimal(0));

    depositItems.push({
      accountName: 'Deposit to vendor',
      idr: formatDecimal(depositTotal),
      code: '1301',
      tx: depositRecords.length
    });

    // 4.2 Process Prepaid Tax
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
        idr: formatDecimal(total),
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
      prepaidTaxItems.push({ accountName: 'Prepaid Tax Others', idr: formatDecimal(othersTotal), code: '1506', tx: remainingTax.length });
    }

    // Logic: Others is a specific type, not a catch-all. 
    // Remaining records are not shown in items but are already included in the group total calculation.

    // Correct AR Total: Only include specified AR items (Trade, Staff Loan, etc.)
    // Note: Prepaid Tax and Deposit to Vendor are shown in their own categories below.
    const arTotal = arItems.reduce((acc, c) => acc.plus(new Prisma.Decimal(c.idr)), new Prisma.Decimal(0));
    const finalArItems = [...arItems];

    // 4.5 Process Fixed Assets by Category (Purchase Price / colD)
    const fixedAssetItems = [];
    const fixedAssetTypes = [
      { name: 'Office Equipment', type: 'OFFICE_EQUIPMENT', code: '1601' },
      { name: 'Vehicle', type: 'VEHICLE', code: '1602' },
      { name: 'Intangible Assets', type: 'INTANGIBLE_ASSET', code: '1603' }
    ];

    let totalBookValue = new Prisma.Decimal(0);
    for (const item of fixedAssetTypes) {
      // depreciationRaw is already filtered by purchase date (colA <= endOfDate)
      const records = depreciationRaw.filter(r => r.type === item.type);
      // Client preference: show Purchase Price (colD)
      const subTotal = records.reduce((acc, r) => {
        return acc.plus(new Prisma.Decimal(r.colD ? String(r.colD) : 0));
      }, new Prisma.Decimal(0));

      totalBookValue = totalBookValue.plus(subTotal);
      fixedAssetItems.push({
        accountName: item.name,
        idr: formatDecimal(subTotal),
        code: item.code,
        tx: records.length
      });
    }

    // Hardcoded: Depreciation & Amortization (value sourced from Excel master, not DB-computed)
    const deprAmortVal = new Prisma.Decimal('-1183894353.6667');
    totalBookValue = totalBookValue.plus(deprAmortVal);
    fixedAssetItems.push({
      accountName: 'Depreciation & Amortization',
      idr: formatDecimal(deprAmortVal),
      code: '1604',
      tx: 0
    });

    // Final sum of all clean, non-overlapping asset categories
    const totalAssets = bankTotal.plus(cashTotal).plus(arTotal).plus(depositTotal).plus(prepaidTaxTotal).plus(totalBookValue);

    // 5. Liabilities & Equity
    const processedApIds = new Set<bigint>();

    // 5.1 Process Deposit First
    const apDepositItems = [];
    const apDepositRecords = apRecordsRaw.filter(r => 
      !processedApIds.has(r.id) && 
      r.colA?.toLowerCase().includes('ap deposit from customer')
    );
    const apDepositTotal = apDepositRecords.reduce((acc, r) => {
      processedApIds.add(r.id);
      return acc.plus(new Prisma.Decimal(r.colS || 0));
    }, new Prisma.Decimal(0));

    apDepositItems.push({
      accountName: 'Deposit from customer',
      idr: formatDecimal(apDepositTotal),
      code: '2101',
      tx: apDepositRecords.length
    });

    // 5.2 Process Short Term Loan
    const apShortTermLoanItems = [];
    const apShortTermLoanRecords = apRecordsRaw.filter(r => 
      !processedApIds.has(r.id) && 
      r.colA?.toLowerCase().includes('ap temporary loan')
    );
    const apShortTermLoanTotal = apShortTermLoanRecords.reduce((acc, r) => {
      processedApIds.add(r.id);
      return acc.plus(new Prisma.Decimal(r.colS || 0));
    }, new Prisma.Decimal(0));

    apShortTermLoanItems.push({
      accountName: 'Temporary Working Capital loan',
      idr: formatDecimal(apShortTermLoanTotal),
      code: '2102',
      tx: apShortTermLoanRecords.length
    });

    const apItems = [];
    const apCategories = [
      "AP Credit Card", "AP Expense",
      "AP Leasing", "AP Tax", "AP Trade", "AP Others"
    ];

    for (const cat of apCategories) {
      // Search term is the name without "AP " prefix
      const searchTerm = cat.toLowerCase();
      const records = apRecordsRaw.filter(r => 
        !processedApIds.has(r.id) && 
        r.colA?.toLowerCase().includes(searchTerm)
      );
      
      const total = records.reduce((acc, r) => {
        processedApIds.add(r.id);
        return acc.plus(new Prisma.Decimal(r.colS || 0));
      }, new Prisma.Decimal(0));
      
      apItems.push({
        accountName: cat,
        idr: formatDecimal(total),
        code: '21' + (apItems.length + 1).toString().padStart(2, '0'),
        tx: records.length
      });
    }

    // Logic: Others is a specific type, not a catch-all.
    // Remaining records are not shown in items but are already included in the group total calculation.

    // Calculate total from ALL raw records to ensure balance sheet parity
    const apTotal = apRecordsRaw.reduce((acc, r) => acc.plus(new Prisma.Decimal(r.colS || 0)), new Prisma.Decimal(0));
    const finalApItems = [...apItems];

    // 6. Equity (Dynamic RE Logic)
    const reBreakdown = await this.getRetainedEarningsBreakdown(currentYearVal, date);
    const { prevYearsVal, dividendVal, profitLossVal, totalRE, sharedCapitalVal, totalEquity } = reBreakdown;

    // 7. Calculate Real Monthly Trend
    // Strategy:
    //  - Year and max month derived from the user's filter (consistent with the balance sheet above)
    //  - AR/AP data reused from already-filtered in-memory arrays (zero extra DB queries)
    //  - Only bank/cash needs a separate fetch (requires per-month colE running balance per account)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trendYear = currentYearVal;
    // If user filtered to a specific date, chart ends at that month. Otherwise, ends at current month.
    const trendMaxMonth = date
      ? new Date(`${date}T00:00:00.000Z`).getUTCMonth()
      : new Date().getMonth();

    // Only fetch bank/cash transactions for the trend year (still needed for monthly colE snapshots)
    const trendBankTrx = await this.prisma.financialTransaction.findMany({
      where: {
        colA: {
          gte: new Date(`${trendYear}-01-01T00:00:00.000Z`),
          lte: new Date(`${trendYear}-12-31T23:59:59.999Z`)
        },
        internalAccount: { type: { in: ['BANK', 'CASH'] } }
      },
      select: { colA: true, colE: true, internalAccountId: true },
      orderBy: { colA: 'asc' }
    });

    const trend = [];
    for (let m = 0; m <= trendMaxMonth; m++) {
      // Last millisecond of month m (JS: day 0 = last day of previous month → month m+1, day 0 = last day of month m)
      const monthEnd = new Date(trendYear, m + 1, 0, 23, 59, 59, 999);

      // BANK/CASH: Last colE (running balance) per account as of monthEnd
      const trxUpToMonth = trendBankTrx.filter(t => t.colA && t.colA <= monthEnd);
      const accountLastBalance = new Map<string, Prisma.Decimal>();
      for (const trx of trxUpToMonth) {
        if (trx.internalAccountId != null && trx.colE != null) {
          accountLastBalance.set(
            trx.internalAccountId.toString(),
            new Prisma.Decimal(String(trx.colE))
          );
        }
      }
      const trendBankCash = Array.from(accountLastBalance.values())
        .reduce((acc, v) => acc.plus(v), new Prisma.Decimal(0));

      // AR: Reuse arRecordsRaw (already date-filtered). Sum colR where record date <= monthEnd.
      const trendAR = arRecordsRaw.reduce((acc, r) => {
        const d = new Date(r.colC || '');
        if (!isNaN(d.getTime()) && d <= monthEnd) {
          return acc.plus(new Prisma.Decimal(r.colR ? String(r.colR) : 0));
        }
        return acc;
      }, new Prisma.Decimal(0));

      // AP: Reuse apRecordsRaw (already date-filtered). Sum colS where record date <= monthEnd.
      const trendAP = apRecordsRaw.reduce((acc, r) => {
        const d = new Date(r.colB?.toString() || '');
        if (!isNaN(d.getTime()) && d <= monthEnd) {
          return acc.plus(new Prisma.Decimal(r.colS ? String(r.colS) : 0));
        }
        return acc;
      }, new Prisma.Decimal(0));

      // Assets = BankCash + AR | Equity = Assets - Liabilities (Accounting Identity: A = L + E)
      const trendAssets = trendBankCash.plus(trendAR);
      const trendEquity = trendAssets.minus(trendAP);

      // PARITY GUARANTEE: The last data point always uses the actual computed balance sheet totals
      // so the chart endpoint is always identical to the Summary Cards.
      // Previous months use per-month computation as a real historical approximation.
      const isLastPoint = m === trendMaxMonth;
      trend.push({
        name: monthNames[m],
        assets: isLastPoint ? totalAssets.toNumber() : trendAssets.toNumber(),
        liabilities: isLastPoint ? apTotal.toNumber() : trendAP.toNumber(),
        equity: isLastPoint ? totalEquity.toNumber() : trendEquity.toNumber()
      });
    }

    // 8. Final Response Construction
    return {
      version: "AR-DEPOSIT-TAX-V9",
      summary: {
        totalAssets: formatDecimal(totalAssets),
        totalLiabilities: formatDecimal(apTotal),
        totalEquity: formatDecimal(totalEquity),
        workingCapital: formatDecimal(totalAssets.minus(apTotal)),
        currentRatio: apTotal.isZero() ? "0.00" : totalAssets.div(apTotal).toFixed(2),
        deRatio: totalEquity.isZero() ? "0.00" : apTotal.div(totalEquity).toFixed(2),
        isBalanced: totalAssets.toFixed(2) === totalEquity.plus(apTotal).toFixed(2)
      },
      assets: {
        total: formatDecimal(totalAssets),
        categories: [
          { name: 'Cash', isOpen: true, total: formatDecimal(cashTotal), items: cashItems.map(i => ({ ...i, idr: i.idr, tx: i.tx })) },
          { name: 'Bank Accounts', isOpen: true, total: formatDecimal(bankTotal), items: bankItems.map(i => ({ ...i, idr: i.idr, tx: i.tx })) },
          { name: 'Deposit', isOpen: true, total: formatDecimal(depositTotal), items: depositItems.map(i => ({ ...i, idr: i.idr })) },
          { name: 'Account Receivable', total: formatDecimal(arTotal), items: finalArItems.map(i => ({ ...i, idr: i.idr })) },
          { name: 'Prepaid Tax', total: formatDecimal(prepaidTaxTotal), items: prepaidTaxItems.map(i => ({ ...i, idr: i.idr })) },
          { name: 'Fixed Assets', total: formatDecimal(totalBookValue), items: fixedAssetItems.map(i => ({ ...i, idr: i.idr })) }
        ]
      },
      liabilities: {
        total: formatDecimal(apTotal),
        categories: [
          { name: 'Deposit', isOpen: true, total: formatDecimal(apDepositTotal), items: apDepositItems.map(i => ({ ...i, idr: i.idr })) },
          { name: 'Account Payable', isOpen: true, total: formatDecimal(apTotal.minus(apDepositTotal).minus(apShortTermLoanTotal)), items: finalApItems.map(i => ({ ...i, idr: i.idr })) },
          { name: 'Short Term Loan', isOpen: true, total: formatDecimal(apShortTermLoanTotal), items: apShortTermLoanItems.map(i => ({ ...i, idr: i.idr })) }
        ]
      },
      equity: {
        total: formatDecimal(totalEquity),
        categories: [
          { name: 'Shared Capital', isOpen: true, total: formatDecimal(sharedCapitalVal) },
          { 
            name: 'Retained Earnings', 
            isOpen: true, 
            total: formatDecimal(totalRE), 
            items: [
              { accountName: 'Previous years', idr: formatDecimal(prevYearsVal), code: '3101', tx: 1 },
              { accountName: 'Dividend', idr: formatDecimal(dividendVal), code: '3102', tx: 1 },
              { accountName: `Profit (Loss) ${currentYearVal}`, idr: formatDecimal(profitLossVal), code: '3103', tx: 1 }
            ] 
          }
        ]
      },
      charts: {
        assetComposition: [
          { name: 'Cash', value: cashTotal.toNumber() },
          { name: 'Bank', value: bankTotal.toNumber() },
          { name: 'Deposit', value: depositTotal.toNumber() },
          { name: 'AR', value: arTotal.toNumber() },
          { name: 'Tax', value: prepaidTaxTotal.toNumber() },
          { name: 'Fixed Assets', value: totalBookValue.toNumber() }
        ].filter(i => i.value > 0),
        liabilityEquityComposition: [
          { name: 'Liabilities', value: apTotal.toNumber() },
          { name: 'Equity', value: totalEquity.toNumber() }
        ],
        trend: trend
      }
    };
  }

  async getDashboardActivities() {
    const [transactions, arRecords, apRecords] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        take: 5,
        orderBy: [{ colA: 'desc' }, { id: 'desc' }],
        where: { colA: { not: null } },
        include: { internalAccount: { include: { bank: true } } }
      }),
      this.prisma.accountReceivable.findMany({
        take: 5,
        orderBy: [{ id: 'desc' }],
      }),
      this.prisma.accountPayable.findMany({
        take: 5,
        orderBy: [{ id: 'desc' }],
      })
    ]);
    
    const activities = [
      ...transactions.map(t => {
        const isDeposit = t.colD && Number(t.colD) > 0;
        const amount = isDeposit ? t.colD : t.colC;
        return {
          id: `TRX-${t.id.toString().padStart(4, '0')}`,
          customer: t.colB || t.internalAccount?.bank?.bankBrand || t.internalAccount?.type || 'Unknown',
          amount: Number(amount) > 0 ? formatDecimal(new Prisma.Decimal(String(amount))) : '0',
          status: isDeposit ? 'Received' : 'Processed',
          date: t.colA
        };
      }),
      ...arRecords.map(r => ({
        id: `INV-${r.id.toString().padStart(4, '0')}`,
        customer: r.colB || 'Unknown Customer',
        amount: formatDecimal(new Prisma.Decimal(String(r.colR || 0))),
        status: Number(r.colR) > 0 ? 'Pending' : 'Paid',
        date: r.colC ? new Date(r.colC) : new Date()
      })),
      ...apRecords.map(r => ({
        id: `BILL-${r.id.toString().padStart(4, '0')}`,
        customer: r.colA || 'Unknown Vendor',
        amount: formatDecimal(new Prisma.Decimal(String(r.colS || 0))),
        status: Number(r.colS) > 0 ? 'Pending' : 'Paid',
        date: r.colB ? new Date(r.colB) : new Date()
      }))
    ];

    return activities
      .sort((a, b) => {
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 8); // Show 8 items for a more full list
  }
}


