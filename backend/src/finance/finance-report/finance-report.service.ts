import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { formatDecimal } from '../../common/utils/format.utils';
import { Prisma } from '@prisma/client';
import { BankMutationService } from '../bank-mutation/bank-mutation.service';
import { EquityPropertyService } from '../equity-property/equity-property.service';
import { LEDGER_CODE, LEDGER_NAMES_INCLUDE, SUB_LEDGER_CODE, withLedgerNames } from '../common/ledger-refs';

/**
 * Label kategori P&L yang dikirim UI ke drill-down, ke code Ledger-nya.
 * Laporan menyaring lewat code, bukan nama - nama bisa diganti di halaman master,
 * dan menyaring lewat nama berarti mengganti "Cost of Goods" jadi "HPP" akan
 * menghilangkan seluruh COGS dari P&L tanpa ada yang sadar.
 */
const PL_LABEL_CODES: Record<string, string> = {
  'cost of goods': LEDGER_CODE.COGS,
  'personnel expense': LEDGER_CODE.PERSONNEL_EXPENSE,
  'office expense': LEDGER_CODE.OFFICE_EXPENSE,
  'marketing expense': LEDGER_CODE.MARKETING_EXPENSE,
  'financial expense': LEDGER_CODE.FINANCIAL_EXPENSE,
  'other income': LEDGER_CODE.OTHER_INCOME_EXPENSE,
  'other income (expense)': LEDGER_CODE.OTHER_INCOME_EXPENSE,
  'income tax': LEDGER_CODE.INCOME_TAX,
};

/**
 * Dividen bersih: yang dibayar (debit) dikurangi yang kembali (kredit).
 * Dulu hanya debit yang dijumlah, jadi dividen yang diretur tetap terhitung -
 * 2026 keluar 840 juta padahal yang benar 600 juta (240 juta diretur).
 */
const netDividend = (rows: { colC: Prisma.Decimal | null; colD: Prisma.Decimal | null }[]) =>
  rows.reduce(
    (acc, r) => acc.plus(new Prisma.Decimal(r.colC || 0)).minus(new Prisma.Decimal(r.colD || 0)),
    new Prisma.Decimal(0),
  );

/** Urutan nama A-Z: tanpa beda huruf besar-kecil, dan angka di dalam nama diurutkan sebagai angka. */
const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });

/** Code Ledger sebuah transaksi, untuk memilah beban tanpa membandingkan nama. */
const withLedgerCode = { ledger: { select: { code: true } } } as const;


@Injectable()
export class FinanceReportService {
  constructor(
    private prisma: PrismaService,
    private bankMutationService: BankMutationService,
    private equityPropertyService: EquityPropertyService
  ) {}
  
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
      where.tagYear = year;
      salesWhere.tagYear = year;
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999Z`);
        where.OR = [{ colA: { lte: end } }, { colA: null }];
        salesWhere.OR = [{ colC: { lte: end } }, { colC: null }];
      }
    } else if (endDate) {
      const end = new Date(`${endDate}T23:59:59.999Z`);
      where.tagYear = yearNum;
      salesWhere.tagYear = yearNum;
      where.OR = [{ colA: { lte: end } }, { colA: null }];
      salesWhere.OR = [{ colC: { lte: end } }, { colC: null }];
    }

    // 1. Calculate Dynamic COGS (Cost of Goods Sold)
    // Sourced from FinancialTransaction whose Ledger is COGS.
    // We sum Credit minus Debit to get the net impact on profitability.
    const cogsTransactions = await this.prisma.financialTransaction.findMany({
      where: {
        AND: [
          where,
          { ledger: { code: LEDGER_CODE.COGS } }
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
    
    const netSales = grossSales.plus(vatAdj);

    // 3. Calculate Operating Expenses from Bank Mutations (FinancialTransaction)
    // Filtered by the ledger code - see LEDGER_CODE.
    const expenseTransactions = await this.prisma.financialTransaction.findMany({
      include: withLedgerCode,
      where: {
        AND: [
          where,
          {
            ledger: {
              code: {
                in: [
                  LEDGER_CODE.PERSONNEL_EXPENSE,
                  LEDGER_CODE.OFFICE_EXPENSE,
                  LEDGER_CODE.MARKETING_EXPENSE,
                  LEDGER_CODE.FINANCIAL_EXPENSE,
                ],
              },
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
      const code = trx.ledger?.code;

      if (code === LEDGER_CODE.PERSONNEL_EXPENSE) personnelExpense = personnelExpense.plus(net);
      else if (code === LEDGER_CODE.OFFICE_EXPENSE) officeExpense = officeExpense.plus(net);
      else if (code === LEDGER_CODE.MARKETING_EXPENSE) marketingExpense = marketingExpense.plus(net);
      else if (code === LEDGER_CODE.FINANCIAL_EXPENSE) financialExpense = financialExpense.plus(net);
    }

    // Expense overrides removed for pure calculation
    // 4. Calculate Other Income from Bank Mutations
    const otherIncomeTransactions = await this.prisma.financialTransaction.findMany({
      where: {
        AND: [
          where,
          { ledger: { code: LEDGER_CODE.OTHER_INCOME_EXPENSE } }
        ]
      }
    });
 
    let otherIncomeTotal = new Prisma.Decimal(0);
    for (const trx of otherIncomeTransactions) {
      const debit = new Prisma.Decimal(trx.colC || 0);
      const credit = new Prisma.Decimal(trx.colD || 0);
      otherIncomeTotal = otherIncomeTotal.plus(credit).minus(debit);
    }

    // Other Income override removed for pure calculation
    // 5. Calculate Depreciation Expense (Summary Only)
    const totalDepreciation = await this.processDepreciationSummary(year, endDate);
    
    const depreciation = totalDepreciation.negated();
    
    // 6. Income Tax — the corporate tax charge, from its own ledger.
    //
    // This used to sum the PPh-23 bukti potong instead: entries under ledger
    // "Account Receivable" / "AR Prepaid Tax". Those are tax the customer
    // withholds from an invoice — a prepayment PCMI can credit later, carried
    // as a receivable. They are not the tax charge, and nothing the accountant
    // did could change them, because they accumulate one certificate at a time.
    //
    // The charge is the figure from the SPT, posted as a single entry on the
    // "Income Tax" ledger of the Non Cash & Bank account. Debit less credit, so
    // a correction posted as a credit is honoured rather than ignored.
    //
    // No entry means no charge, which is the mid-year case: income tax is nil
    // and profit after tax equals profit before tax.
    const incomeTaxTransactions = await this.prisma.financialTransaction.findMany({
      where: {
        AND: [
          where,
          { ledger: { code: LEDGER_CODE.INCOME_TAX } },
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
      const credit = new Prisma.Decimal(trx.colD || 0);
      incomeTax = incomeTax.minus(debit).plus(credit);
    }

    // Income Tax override removed for pure calculation
    // 7. Final Financial Logic
    const grossProfit = netSales.plus(cogsTotal); 
    // Other income is reported among the expenses at the client's request, so
    // it is counted in their total and operating profit is struck after it.
    // Profit before tax is unchanged either way: the same terms, regrouped.
    const operatingExpenses = personnelExpense
      .plus(officeExpense)
      .plus(marketingExpense)
      .plus(financialExpense)
      .plus(otherIncomeTotal);
    const operatingProfit = grossProfit.plus(operatingExpenses);
    const profitBeforeTax = operatingProfit.plus(depreciation);
    
    const netProfit = profitBeforeTax.plus(incomeTax);

    // Temporal filter for sub-item fetching
    const subWhere: any = {};
    if (year && year > 0) {
      subWhere.tagYear = year;
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999Z`);
        subWhere.OR = [{ colA: { lte: end } }, { colA: null }];
      }
    } else if (endDate) {
      const end = new Date(`${endDate}T23:59:59.999Z`);
      subWhere.tagYear = yearNum;
      subWhere.OR = [{ colA: { lte: end } }, { colA: null }];
    }

    // 8. Construct Response
    const initialTableData = [
      { account: "REVENUE", total: 0, isHeader: true, level: 0 },
      { account: "Sales", gross: formatDecimal(grossSales), vatAdj: formatDecimal(vatAdj), total: formatDecimal(netSales), level: 1 },
      { account: "Cost of Goods", total: formatDecimal(cogsTotal), isSubItem: true, level: 2 /*, ledgerFilter: { contains: 'cost of goods', mode: 'insensitive' }*/ },
      { account: "GROSS PROFIT", total: formatDecimal(grossProfit), isTotal: true, level: 1 },
      
      { account: "EXPENSES", total: 0, isHeader: true, level: 0 },
      { account: "Personnel Expense", total: formatDecimal(personnelExpense), hasInfo: true, isSubItem: true, level: 2, ledgerCode: LEDGER_CODE.PERSONNEL_EXPENSE },
      { account: "Office Expense", total: formatDecimal(officeExpense), isSubItem: true, level: 2, ledgerCode: LEDGER_CODE.OFFICE_EXPENSE },
      { account: "Marketing Expense", total: formatDecimal(marketingExpense), isSubItem: true, level: 2, ledgerCode: LEDGER_CODE.MARKETING_EXPENSE },
      { account: "Financial Expense", total: formatDecimal(financialExpense), isSubItem: true, level: 2, ledgerCode: LEDGER_CODE.FINANCIAL_EXPENSE },
      // Breaks down by sub-ledger like the expenses it sits with. The filter is
      // the same one its total is computed from, so the parts add up to it.
      { account: "Other Income", total: formatDecimal(otherIncomeTotal), isSubItem: true, level: 2, ledgerCode: LEDGER_CODE.OTHER_INCOME_EXPENSE },
      { account: "Total Expense", total: formatDecimal(operatingExpenses), isTotal: true, level: 1 },
      
      { account: "PROFITABILITY", total: 0, isHeader: true, level: 0 },
      { account: "Operating Profit", total: formatDecimal(operatingProfit), level: 1 },
      { account: "Depreciation", total: formatDecimal(depreciation), hasInfo: true, isSubItem: true, level: 2 },
      { account: "PROFIT BEFORE TAX", total: formatDecimal(profitBeforeTax), isTotal: true, level: 1 },
      { account: "Income Tax", total: formatDecimal(incomeTax), isSubItem: true, level: 1 },
      { account: "PROFIT AFTER TAX", total: formatDecimal(netProfit), isTotal: true, level: 1 },
    ];

    const tableData: any[] = [];
    for (const row of initialTableData) {
      tableData.push(row);
      
      if ((row as any).ledgerCode) {
        const subTrxs = await this.prisma.financialTransaction.findMany({
          where: {
            AND: [subWhere, { ledger: { code: (row as any).ledgerCode } }]
          },
          select: { subLedger: { select: { name: true } }, colC: true, colD: true }
        });

        // Grouped on the trimmed, lower-cased name, so "Other expense" and
        // "Other Expense" are one sub-ledger rather than two. The first
        // spelling seen is the one shown.
        const groups = new Map<string, Prisma.Decimal>();
        const labels = new Map<string, string>();
        subTrxs.forEach(t => {
          const name = (t.subLedger?.name || 'Other').trim();
          const key = name.toLowerCase();
          if (!labels.has(key)) labels.set(key, name);

          const debit = new Prisma.Decimal(t.colC || 0);
          const credit = new Prisma.Decimal(t.colD || 0);
          const net = credit.minus(debit);
          
          groups.set(key, (groups.get(key) || new Prisma.Decimal(0)).plus(net));
        });

        const subItems = Array.from(groups.entries())
          .map(([key, total]) => ({
            account: labels.get(key) ?? key,
            total: formatDecimal(total),
            isSubItem: true,
            level: 3,
            parentLedger: row.account
          }))
          .filter(s => s.total !== "0.0000");

        tableData.push(...subItems);
      }
    }

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
          title: "PROFIT AFTER TAX",
          value: formatDecimal(netProfit),
          netMargin: netSales.isZero() ? "0.0000" : netProfit.div(netSales).times(100).toFixed(4),
          color: "text-indigo-500"
        },
        {
          // Kelima kelompok beban: personnel, office, marketing, financial,
          // dan other income (expense) - sama dengan baris Total Expense.
          title: "TOTAL EXPENSES",
          value: formatDecimal(operatingExpenses),
          netShare: netSales.isZero() ? "0.0000" : operatingExpenses.div(netSales).times(100).abs().toFixed(4),
          color: "text-amber-600"
        }
      ],
      tableData,

      /**
       * The same figures the rows above display, addressable without matching a
       * label. The balance sheet needs net profit, and finding it by scanning
       * tableData for the text "PROFIT AFTER TAX" would silently yield nothing
       * the day that label is reworded.
       */
      figures: {
        netSales: formatDecimal(netSales),
        grossProfit: formatDecimal(grossProfit),
        operatingProfit: formatDecimal(operatingProfit),
        profitBeforeTax: formatDecimal(profitBeforeTax),
        incomeTax: formatDecimal(incomeTax),
        netProfit: formatDecimal(netProfit),
      },
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
    
    // Construct temporal filter for sub-item fetching
    const where: any = {};
    const yearNum = year || (date ? new Date(date).getFullYear() : 0);

    if (year && year > 0) {
      where.tagYear = year;
      if (date) {
        const end = new Date(`${date}T23:59:59.999Z`);
        where.OR = [{ colA: { lte: end } }, { colA: null }];
      }
    } else if (date) {
      const end = new Date(`${date}T23:59:59.999Z`);
      where.tagYear = yearNum;
      where.OR = [{ colA: { lte: end } }, { colA: null }];
    }

    // Categories to extract from the P&L statement for the summary view
    const categories = [
      { key: "NET SALES", label: "NET SALES" },
      { key: "COGS", label: "COGS" /*, ledgerFilter: { contains: 'cost of goods', mode: 'insensitive' }*/ },
      { key: "GROSS PROFIT", label: "GROSS PROFIT" },
      { key: "Personnel Expense", label: "Personnel Expense", ledgerCode: LEDGER_CODE.PERSONNEL_EXPENSE },
      { key: "Office Expense", label: "Office Expense", ledgerCode: LEDGER_CODE.OFFICE_EXPENSE },
      { key: "Marketing Expense", label: "Marketing Expense", ledgerCode: LEDGER_CODE.MARKETING_EXPENSE },
      { key: "Financial Expense", label: "Financial Expense", ledgerCode: LEDGER_CODE.FINANCIAL_EXPENSE },
      { key: "Other Income", label: "Other Income (Expense)" },
      { key: "OPERATING PROFIT", label: "OPERATING PROFIT" },
      { key: "PROFIT BEFORE TAX", label: "PROFIT BEFORE TAX" },
      { key: "INCOME TAX", label: "INCOME TAX" },
      { key: "PROFIT AFTER TAX", label: "PROFIT AFTER TAX" }
    ];

    const results: any[] = [];
    for (const cat of categories) {
      const row = plData.tableData.find(r => 
        r.account.toUpperCase() === cat.key.toUpperCase() || 
        (cat.key === 'COGS' && r.account.toUpperCase() === 'COST OF GOODS') ||
        // Barisnya bernama "Sales"; tanpa ini NET SALES di ringkasan selalu 0.
        (cat.key === 'NET SALES' && r.account.toUpperCase() === 'SALES')
      );
      const val = row ? row.total : 0;
      
      let subItems: { label: string; total: string }[] = [];
      if (cat.ledgerCode) {
        const subTrxs = await this.prisma.financialTransaction.findMany({
          where: {
            AND: [where, { ledger: { code: cat.ledgerCode } }]
          },
          select: { subLedger: { select: { name: true } }, colC: true, colD: true }
        });

        // Grouped on the trimmed, lower-cased name, so "Other expense" and
        // "Other Expense" are one sub-ledger rather than two. The first
        // spelling seen is the one shown.
        const groups = new Map<string, Prisma.Decimal>();
        const labels = new Map<string, string>();
        subTrxs.forEach(t => {
          const name = (t.subLedger?.name || 'Other').trim();
          const key = name.toLowerCase();
          if (!labels.has(key)) labels.set(key, name);

          const debit = new Prisma.Decimal(t.colC || 0);
          const credit = new Prisma.Decimal(t.colD || 0);
          const net = credit.minus(debit);
          
          groups.set(key, (groups.get(key) || new Prisma.Decimal(0)).plus(net));
        });

        subItems = Array.from(groups.entries())
          .map(([key, total]) => ({
            label: labels.get(key) ?? key,
            total: formatDecimal(total)
          }))
          .filter(s => s.total !== "0.0000");
      }

      results.push({
        category: cat.key,
        label: cat.label,
        total: formatDecimal(val),
        subItems
      });
    }

    return results;
  }



  /**
   * Calculates a breakdown of Retained Earnings (RE) components for a given year.
   * Components include Previous years' net RE, current year dividends, and current year profit.
   * 
   * @param targetYear The fiscal year to calculate the breakdown for.
   * @returns Object containing prevYearsVal, dividendVal, profitLossVal, sharedCapitalVal, and totalEquity.
   */
  private async getRetainedEarningsBreakdown(targetYear?: string | number, endDate?: string) {
    const yearNum = targetYear ? Number(targetYear) : (endDate ? new Date(endDate).getFullYear() : null);
    const endOfDate = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;
    
    // 1. Fetch properties for this year
    let props = yearNum ? await this.equityPropertyService.getProperties(yearNum) : {};
    const hasProps = Object.keys(props).length > 0;

    // 2. Profit (Loss) for the target year
    const plCurrentData = await this.getProfitLossStatement(yearNum || undefined, endDate);
    let profitLossVal = new Prisma.Decimal(0);
    
    if (props && props['PL_NET_PROFIT'] !== undefined && props['PL_NET_PROFIT'] !== null) {
      profitLossVal = new Prisma.Decimal(props['PL_NET_PROFIT']);
    } else {
      // Profit AFTER tax, not before.
      //
      // Corporate income tax payable (HUTANG PAJAK BADAN) is now carried on the
      // Payable side of the balance sheet. Taking profit before tax into equity
      // while the same tax sits in liabilities counts it once and deducts it
      // never, so the sheet fails to balance by exactly the tax — which is the
      // discrepancy this was reported as.
      //
      // This holds all year. Mid-year the tax payable is simply nil, and
      // after-tax profit equals before-tax profit, so nothing moves.
      profitLossVal = new Prisma.Decimal(plCurrentData.figures.netProfit);
    }

    // 3. Previous Years Net RE (Opening balance of RE for the year)
    let prevYearsVal = new Prisma.Decimal(0);
    if (props && props['RE_PREV_YEARS'] !== undefined && props['RE_PREV_YEARS'] !== null) {
       prevYearsVal = new Prisma.Decimal(props['RE_PREV_YEARS']);
    } else if (yearNum !== null) {
      let prevProps = await this.equityPropertyService.getProperties(yearNum - 1);

      let prevProfit = new Prisma.Decimal(0);
      if (prevProps && prevProps['PL_NET_PROFIT'] !== undefined && prevProps['PL_NET_PROFIT'] !== null) {
        prevProfit = new Prisma.Decimal(prevProps['PL_NET_PROFIT']);
      } else {
        const plUpToPrevYear = await this.getProfitLossStatement(yearNum - 1);
        // Deliberately before tax, unlike the current year above: this is the
        // opening balance of retained earnings, and moving it would restate
        // prior years. Read from `figures` all the same, so neither path
        // depends on a row label.
        prevProfit = new Prisma.Decimal(plUpToPrevYear.figures.profitBeforeTax);
      }

      let prevDividend = new Prisma.Decimal(0);
      if (prevProps && prevProps['DIVIDENDS'] !== undefined && prevProps['DIVIDENDS'] !== null) {
        prevDividend = new Prisma.Decimal(prevProps['DIVIDENDS']);
      } else {
        const legacyWhere: any = {
          ledger: { code: LEDGER_CODE.RETAINED_EARNINGS },
          subLedger: { code: SUB_LEDGER_CODE.DIVIDEND },
          tagYear: yearNum - 1
        };
  
        if (endOfDate) {
          legacyWhere.OR = [{ colA: { lte: endOfDate } }, { colA: null }];
        }
  
        const dividendTrxLegacy = await this.prisma.financialTransaction.findMany({
          where: legacyWhere
        });
        prevDividend = netDividend(dividendTrxLegacy);
      }

      prevYearsVal = prevProfit.minus(prevDividend);
    }

    // 4. Current Year Dividends
    let dividendVal = new Prisma.Decimal(0);
    if (props && props['DIVIDENDS'] !== undefined && props['DIVIDENDS'] !== null) {
      dividendVal = new Prisma.Decimal(props['DIVIDENDS']);
    } else {
      const currentWhere: any = {
        subLedger: { code: SUB_LEDGER_CODE.DIVIDEND }
      };
      
      if (yearNum !== null && yearNum > 0) {
        currentWhere.tagYear = yearNum;
      }
      
      if (endOfDate) {
        currentWhere.OR = [{ colA: { lte: endOfDate } }, { colA: null }];
      }

      const dividendTrxCurrent = await this.prisma.financialTransaction.findMany({
        where: currentWhere
      });
      dividendVal = netDividend(dividendTrxCurrent).mul(-1);
    }

    // 5. Shared Capital
    const sharedCapitalVal = new Prisma.Decimal(props['SHARED_CAPITAL'] || "0");

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
  async getPLDetails(year?: number, ledger?: string, date?: string, subItem?: string, salesCode?: string) {
    if (ledger && ledger.toLowerCase() === 'sales') {
      const salesWhere: any = { AND: [] };
      const yearNum = year || (date ? new Date(date).getFullYear() : 0);

      if (year && year > 0) {
        salesWhere.tagYear = year;
        if (date) {
          const end = new Date(`${date}T23:59:59.999Z`);
          salesWhere.AND.push({ OR: [{ colC: { lte: end } }, { colC: null }] });
        }
      } else if (date) {
        const end = new Date(`${date}T23:59:59.999Z`);
        salesWhere.tagYear = yearNum;
        salesWhere.AND.push({ OR: [{ colC: { lte: end } }, { colC: null }] });
      }

      if (salesCode) {
        const trimmedCode = salesCode.trim();
        if (trimmedCode === '-' || trimmedCode === '') {
          salesWhere.AND.push({
            OR: [
              { colF: null },
              { colF: '' },
              { colF: '-' }
            ]
          });
        } else {
          salesWhere.colF = {
            equals: trimmedCode,
            mode: 'insensitive'
          };
        }

        // Clean up empty AND array
        if (salesWhere.AND.length === 0) delete salesWhere.AND;

        const salesData = await this.prisma.salesRecord.findMany({
          where: salesWhere,
          orderBy: { colC: 'asc' }
        });

        return salesData.map(row => {
          const gross = new Prisma.Decimal(row.colK || 0);
          const vat = new Prisma.Decimal(row.colJ || 0);
          const net = gross.minus(vat);

          return {
            id: row.id.toString(),
            date: row.colC,
            invoiceNo: row.colB || '-',
            invoiceType: row.colA || '-',
            clientName: row.colE || '-',
            description: row.colG || '-',
            salesCode: row.colF || '-',
            gross: formatDecimal(gross),
            vat: formatDecimal(vat),
            amount: formatDecimal(net),
            ledger: 'Sales',
            subItem: row.colA || ''
          };
        });
      }

      const salesData = await this.prisma.salesRecord.findMany({
        where: salesWhere,
        orderBy: { colC: 'asc' }
      });

      const groupedMap = new Map<string, {
        salesCode: string;
        gross: Prisma.Decimal;
        vat: Prisma.Decimal;
        net: Prisma.Decimal;
      }>();

      for (const row of salesData) {
        const rawSalesCode = (row.colF || '-').trim();
        const salesCodeKey = rawSalesCode === '' ? '-' : rawSalesCode.toLowerCase();
        const salesCodeDisplay = rawSalesCode === '' ? '-' : rawSalesCode;

        const gross = new Prisma.Decimal(row.colK || 0);
        const vat = new Prisma.Decimal(row.colJ || 0);
        const net = gross.minus(vat);

        const existing = groupedMap.get(salesCodeKey);
        if (existing) {
          existing.gross = existing.gross.plus(gross);
          existing.vat = existing.vat.plus(vat);
          existing.net = existing.net.plus(net);
        } else {
          groupedMap.set(salesCodeKey, {
            salesCode: salesCodeDisplay,
            gross,
            vat,
            net
          });
        }
      }

      // Urutan default: Sales Code A-Z.
      return Array.from(groupedMap.values()).sort((a, b) => byName(a.salesCode, b.salesCode)).map((group, idx) => {
        return {
          id: `grouped-sales-${idx}`,
          date: null,
          invoiceNo: '-',
          invoiceType: '-',
          clientName: '-',
          description: '-',
          salesCode: group.salesCode,
          gross: formatDecimal(group.gross),
          vat: formatDecimal(group.vat),
          amount: formatDecimal(group.net),
          ledger: 'Sales',
          subItem: ''
        };
      });
    }

    const isCogsLedger = ledger && (
      ledger.toUpperCase() === 'COGS' || 
      ledger.toLowerCase() === 'cost of goods'
    );

    const where: any = { AND: [] };
    const yearNum = year || (date ? new Date(date).getFullYear() : 0);

    if (year && year > 0) {
      where.tagYear = year;
      if (date) {
        const end = new Date(`${date}T23:59:59.999Z`);
        where.AND.push({ OR: [{ colA: { lte: end } }, { colA: null }] });
      }
    } else if (date) {
      const end = new Date(`${date}T23:59:59.999Z`);
      where.tagYear = yearNum;
      where.AND.push({ OR: [{ colA: { lte: end } }, { colA: null }] });
    }

    if (where.AND.length === 0) delete where.AND;
    
    // Use contains instead of equals to capture sub-categories and generic matches (e.g., 'Other Income - Interest')
    if (ledger) {
      if (isCogsLedger) {
        where.ledger = { code: LEDGER_CODE.COGS };
      } else {
        // Label kategori dari UI dipetakan ke code. Label yang tidak dikenal
        // jatuh ke pencocokan nama, supaya drill-down lain tetap jalan seperti dulu.
        const code = PL_LABEL_CODES[ledger.toLowerCase().trim()];
        where.ledger = code ? { code } : { name: { contains: ledger, mode: 'insensitive' } };
      }
    }

    if (subItem) {
      if (isCogsLedger) {
        where.colH = { equals: subItem, mode: 'insensitive' };
      } else {
        where.subLedger = { name: { equals: subItem, mode: 'insensitive' } };
      }
    }

    const data = await this.prisma.financialTransaction.findMany({
      where,
      include: {
        ...LEDGER_NAMES_INCLUDE,
        internalAccount: {
          include: { bank: true }
        }
      },
      orderBy: { colA: 'asc' }
    });

    return data.map(withLedgerNames).map(trx => {
      const debit = new Prisma.Decimal(trx.colC || 0);
      const credit = new Prisma.Decimal(trx.colD || 0);
      const net = credit.minus(debit);

      return {
        id: trx.id,
        date: trx.colA,
        description: trx.colB,
        debit: formatDecimal(debit),
        credit: formatDecimal(credit),
        amount: formatDecimal(net),
        bankBrand: trx.internalAccount?.bank?.bankBrand || '',
        bankName: trx.internalAccount?.bank?.bankName || 'Unknown',
        accountNo: trx.internalAccount?.accountNo || '',
        branch: trx.internalAccount?.branch || '',
        holderName: trx.internalAccount?.holderName || '',
        accountType: trx.internalAccount?.type,
        ledger: trx.colF,
        subItem: isCogsLedger ? (trx.colH || '') : (trx.colG || '')
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
  async getBSDetails(category: string, subItem?: string, year?: string | number, date?: string, accountId?: string) {
    const yearNum = year ? Number(year) : (date ? new Date(`${date}T00:00:00.000Z`).getUTCFullYear() : null);
    const endOfDate = date ? new Date(`${date}T23:59:59.999Z`) : null;

    // 1. CASH & BANK
    if (category === 'Cash' || category === 'Bank Accounts') {
      let account;
      
      if (accountId && accountId !== 'undefined') {
        account = await this.prisma.internalAccount.findUnique({
          where: { id: BigInt(accountId) }
        });
      }

      if (!account) return [];

      const transactions = await this.prisma.financialTransaction.findMany({
        where: {
          internalAccountId: account.id,
          ...(yearNum ? { tagYear: yearNum } : {}),
          ...(endOfDate ? {
            OR: [
              { colA: { lte: endOfDate } },
              { colA: null }
            ]
          } : {})
        },
        orderBy: [{ colA: 'asc' }, { id: 'asc' }],
        include: LEDGER_NAMES_INCLUDE,
      });

      return transactions.map(withLedgerNames).map(t => ({
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
        const year = r.tagYear ?? 0;

        // 1. Date Filtering (Strict Per Year - Non-Cumulative)
        if (yearNum && year !== yearNum) return false;

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
        colC: r.colC || '-', // Year
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
        if (targetType && r.type?.toUpperCase() !== String(targetType).toUpperCase()) return false;
        
        // 2. Filter by Year (Match getBalanceSheet)
        if (yearNum) {
          const y = r.tagYear ?? 0;
          if (y !== yearNum) return false;
        }
        
        // 3. Filter by date
        if (endOfDate && r.colA) {
          return r.colA <= endOfDate;
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
        // Compare directly as a year number.
        const recordYear = r.tagYear ?? 0;

        // Date filtering: strictly match year (non-cumulative)
        if (yearNum && recordYear !== yearNum) return false;

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
        colR: formatDecimal(r.colU), // Outstanding (colU)
      }));
    }

    return [];
  }

  /**
   * Fetches the dynamic depreciation audit trail for all registered assets.
   * [SPECIFICALLY USED FOR PROFIT & LOSS DETAILS]
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
  async getDepreciationDetails(year?: number, endDate?: string) {
    const where: any = {};
    const yearNum = year || (endDate ? new Date(endDate).getFullYear() : 0);
    
    if (year && year > 0) {
      where.tagYear = year;
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999Z`);
        where.OR = [{ colA: { lte: end } }, { colA: null }];
      }
    } else if (endDate) {
      const end = new Date(`${endDate}T23:59:59.999Z`);
      where.tagYear = yearNum;
      where.OR = [{ colA: { lte: end } }, { colA: null }];
    }

    const raw = await this.prisma.depreciation.findMany({
      where,
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
    const where: any = {};
    const yearNum = year || (endDate ? new Date(endDate).getFullYear() : 0);
    
    if (year && year > 0) {
      where.tagYear = year;
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999Z`);
        where.OR = [{ colA: { lte: end } }, { colA: null }];
      }
    } else if (endDate) {
      const end = new Date(`${endDate}T23:59:59.999Z`);
      where.tagYear = yearNum;
      where.OR = [{ colA: { lte: end } }, { colA: null }];
    }

    const raw = await this.prisma.depreciation.findMany({ where });

    const monthCols = ['colG', 'colH', 'colI', 'colJ', 'colK', 'colL', 'colM', 'colN', 'colO', 'colP', 'colQ', 'colR'];
    const dMonth = endDate ? new Date(endDate).getMonth() + 1 : 12;
    
    let totalDepreciation = new Prisma.Decimal(0);
    
    raw.forEach(record => {
      let rowDepr = new Prisma.Decimal(0);

      if (!endDate) {
        rowDepr = new Prisma.Decimal(record.colS ? String(record.colS) : 0);
      } else {
        for (let i = 0; i < dMonth; i++) {
          const val = record[monthCols[i] as keyof typeof record];
          rowDepr = rowDepr.plus(new Prisma.Decimal(val ? String(val) : 0));
        }
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
  /**
   * Gross Profit per project: Net Sales dari tabel Sales ditambah COGS dari bank
   * statement, dicocokkan lewat nama project tanpa beda huruf besar-kecil.
   *
   * Dibangun dari dua breakdown yang sudah ada, jadi angkanya sama persis
   * dengan yang tampil di layar dan totalnya sama dengan baris GROSS PROFIT.
   * Project yang hanya ada di salah satu sisi tetap muncul dengan sisi lainnya
   * nol - kalau dibuang, totalnya tidak lagi cocok.
   */
  async getGrossProfitByProject(year?: number, date?: string) {
    const [sales, cogs] = await Promise.all([
      this.getPLDetails(year, 'Sales', date),
      this.getSalesCogsDetails(year, date),
    ]);

    const key = (name: any) => String(name ?? '').trim().toLowerCase();
    const rows = new Map<string, { project: string; netSales: Prisma.Decimal; cogs: Prisma.Decimal; inSales: boolean; inCogs: boolean }>();
    const get = (name: string) => {
      const k = key(name);
      if (!rows.has(k)) rows.set(k, { project: name, netSales: new Prisma.Decimal(0), cogs: new Prisma.Decimal(0), inSales: false, inCogs: false });
      return rows.get(k)!;
    };

    for (const row of sales as any[]) {
      const entry = get(row.salesCode || '-');
      entry.project = row.salesCode || '-';
      entry.netSales = entry.netSales.plus(new Prisma.Decimal(row.amount || 0));
      entry.inSales = true;
    }
    for (const row of (cogs as any).rows as any[]) {
      const entry = get(row.cogs || 'Other');
      entry.cogs = entry.cogs.plus(new Prisma.Decimal(row.rowTotal || 0));
      entry.inCogs = true;
    }

    return Array.from(rows.values())
      .sort((a, b) => a.project.localeCompare(b.project, undefined, { sensitivity: 'base', numeric: true }))
      .map((r) => {
        const grossProfit = r.netSales.plus(r.cogs);
        return {
          project: r.project,
          netSales: formatDecimal(r.netSales),
          cogs: formatDecimal(r.cogs),
          grossProfit: formatDecimal(grossProfit),
          margin: r.netSales.isZero() ? null : grossProfit.div(r.netSales).times(100).toFixed(2),
          source: r.inSales && r.inCogs ? 'Sales & COGS' : r.inSales ? 'Sales only' : 'COGS only',
        };
      });
  }

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
    const yearNum = year || (date ? new Date(date).getFullYear() : 0);
    
    if (year && year > 0) {
      where.tagYear = year;
      if (date) {
        const end = new Date(`${date}T23:59:59.999Z`);
        where.OR = [{ colA: { lte: end } }, { colA: null }];
      }
    } else if (date) {
      const end = new Date(`${date}T23:59:59.999Z`);
      where.tagYear = yearNum;
      where.OR = [{ colA: { lte: end } }, { colA: null }];
    }

    where.ledger = { code: LEDGER_CODE.COGS };

    const trxs = await this.prisma.financialTransaction.findMany({
      where,
      include: { internalAccount: true },
      orderBy: { colA: 'asc' }
    });

    // 3. Group transactions by colH (Sub Ledger 2)
    const groupedData = new Map<string, any>();

    trxs.forEach(trx => {
      const rawKey = (trx.colH || 'Other').trim();
      const groupKey = rawKey.toLowerCase();

      if (!groupedData.has(groupKey)) {
        const initialRow: any = {
          id: groupKey,
          cogs: rawKey, // Keep original case for rendering
          date: null,
          rowTotal: new Prisma.Decimal(0)
        };
        // Initialize all bank keys & arApOthers with 0 as Decimal
        headers.forEach(h => {
          if (h.key !== 'rowTotal') {
            initialRow[h.key] = new Prisma.Decimal(0);
          }
        });
        groupedData.set(groupKey, initialRow);
      }

      const row = groupedData.get(groupKey);
      const debit = new Prisma.Decimal(trx.colC || 0);
      const credit = new Prisma.Decimal(trx.colD || 0);
      const amount = credit.minus(debit);

      if (trx.internalAccountId) {
        const key = `acc_${trx.internalAccountId}`;
        if (row[key] !== undefined) {
          row[key] = row[key].plus(amount);
        }
      } else {
        if (row['arApOthers'] !== undefined) {
          row['arApOthers'] = row['arApOthers'].plus(amount);
        }
      }
      
      row.rowTotal = row.rowTotal.plus(amount);
    });

    // Convert Decimals to strings for the response
    // Urutan default: project A-Z.
    const rows = Array.from(groupedData.values()).sort((a, b) => byName(a.cogs, b.cogs)).map(row => {
      const finalRow: any = { ...row };
      headers.forEach(h => {
        if (h.key !== 'rowTotal') {
          finalRow[h.key] = row[h.key].toString();
        }
      });
      finalRow.rowTotal = row.rowTotal.toString();
      return finalRow;
    });

    return { headers, rows };
  }
  
  /**
   * Saldo satu rekening bank/kas: saldo awal ditambah seluruh mutasinya.
   *
   * Dulu ini diambil dari `colE` baris terakhir menurut tanggal, dan itu salah
   * dalam dua cara. `colE` adalah saldo berjalan sepanjang urutan baris ledger,
   * bukan saldo per tanggal - jadi memfilter baris lalu memungut `colE` salah
   * satunya tidak menghasilkan saldo per tanggal itu. Dan "terakhir menurut
   * tanggal" belum tentu baris terakhir: di BNI 2026 baris bertanggal 31 Des
   * justru baris PERTAMA sheet-nya, sehingga neraca menampilkan 1.256.227
   * padahal ledgernya menutup di 1.000.000.
   *
   * Dijumlah begini hasilnya tidak bergantung urutan sama sekali, cocok dengan
   * `fiscal_periods.closing_balance` saat tanpa batas tanggal, dan tetap benar
   * saat ada batas tanggal - termasuk di Non CB, yang 1.383 barisnya bertanggal
   * sebelum pertengahan tahun tapi duduk di bawah baris yang bertanggal sesudahnya.
   *
   * Tidak bergantung pada `colE` juga berarti angka neraca tetap benar kalau
   * perantaian saldo belum sempat dijalankan ulang.
   */
  private async bankBalanceAsOf(
    accountId: bigint,
    yearNum: number | null,
    endOfDate?: Date | null,
  ): Promise<Prisma.Decimal> {
    // Tanpa tahun, mutasinya dijumlah lintas tahun, jadi titik berangkatnya
    // saldo awal periode paling awal yang dipunyai rekening itu.
    const period = yearNum
      ? await this.prisma.fiscalPeriod.findUnique({
          where: { internalAccountId_year: { internalAccountId: accountId, year: yearNum } },
        })
      : await this.prisma.fiscalPeriod.findFirst({
          where: { internalAccountId: accountId },
          orderBy: { year: 'asc' },
        });

    const movement = await this.prisma.financialTransaction.aggregate({
      where: {
        internalAccountId: accountId,
        ...(yearNum ? { tagYear: yearNum } : {}),
        ...(endOfDate
          ? { OR: [{ colA: { lte: endOfDate } }, { colA: null }] }
          : {}),
      },
      _sum: { colC: true, colD: true },
    });

    const opening = period
      ? new Prisma.Decimal(period.openingBalance)
      : await this.openingBalanceFor(accountId, yearNum);

    return opening
      .plus(movement._sum.colD ?? 0)
      .minus(movement._sum.colC ?? 0);
  }

  /**
   * Saldo awal sebuah tahun ketika baris `fiscal_periods` tahun itu tidak ada.
   *
   * Jatuh ke penutup tahun terakhir yang punya catatan: saldo penutupnya kalau
   * sudah tersimpan, kalau belum dijumlah dari mutasinya. Sengaja tidak melihat
   * status CLOSED - tahun yang belum ditutup tetap punya penutup yang benar,
   * dan memakai 0 di situ memberi angka kekecilan tanpa ada yang menyadarinya.
   *
   * Rantainya utuh di seluruh data sekarang: saldo awal tiap tahun sama dengan
   * penutup tahun sebelumnya di sembilan dari sembilan rekening, jadi jalur ini
   * belum pernah terpakai. Ia ada untuk rekening yang periodenya belum dibuat.
   */
  private async openingBalanceFor(
    accountId: bigint,
    yearNum: number | null,
  ): Promise<Prisma.Decimal> {
    if (!yearNum) return new Prisma.Decimal(0);

    const earlier = await this.prisma.fiscalPeriod.findFirst({
      where: { internalAccountId: accountId, year: { lt: yearNum } },
      orderBy: { year: 'desc' },
    });
    if (!earlier) return new Prisma.Decimal(0);

    if (earlier.closingBalance !== null) return new Prisma.Decimal(earlier.closingBalance);

    const movement = await this.prisma.financialTransaction.aggregate({
      where: { internalAccountId: accountId, tagYear: earlier.year },
      _sum: { colC: true, colD: true },
    });

    return new Prisma.Decimal(earlier.openingBalance)
      .plus(movement._sum.colD ?? 0)
      .minus(movement._sum.colC ?? 0);
  }

  async getBalanceSheet(year?: string | number, date?: string) {
    const yearNum = year ? Number(year) : (date ? new Date(`${date}T00:00:00.000Z`).getUTCFullYear() : null);
    const endOfDate = date ? new Date(`${date}T23:59:59.999Z`) : null;
    
    // 1. Fetch Dynamic Data in Parallel (Fetch all to handle messy legacy strings)
    
    const [accounts, arRecordsRawAll, apRecordsRawAll, depreciationRawAll] = await Promise.all([
      this.prisma.internalAccount.findMany({ 
        where: { type: { in: ['BANK', 'CASH'] } },
        include: { bank: true } 
      }),
      this.prisma.accountReceivable.findMany(),
      this.prisma.accountPayable.findMany(),
      this.prisma.depreciation.findMany()
    ]);


    const arRecordsRaw = arRecordsRawAll.filter(r => {
      const recordYear = r.tagYear ?? null; 
      if (yearNum && recordYear !== yearNum) return false;
      return true;
    });

    const apRecordsRaw = apRecordsRawAll.filter(r => {
      const recordYear = r.tagYear ?? null;
      if (yearNum && recordYear !== yearNum) return false;
      return true;
    });

    const depreciationRaw = depreciationRawAll.filter(r => {
      const y = r.tagYear ?? 0;
      if (yearNum && y !== yearNum) return false;
      if (endOfDate && r.colA && new Date(r.colA).getTime() > endOfDate.getTime()) return false;
      return true;
    });


    // BANK AND CASH
    const bankItems = [];
    const cashItems = [];
    let bankTotal = new Prisma.Decimal(0);
    let cashTotal = new Prisma.Decimal(0);
    
    for (const acc of accounts) {
      const balanceDecimal = await this.bankBalanceAsOf(acc.id, yearNum, endOfDate);

      const balance = formatDecimal(balanceDecimal);


      const txCount = await this.prisma.financialTransaction.count({ 
        where: { 
          internalAccountId: acc.id,
          ...(yearNum ? { tagYear: yearNum } : {}),
          ...(date ? {
            OR: [
              { colA: { lte: endOfDate! } },
              { colA: null }
            ]
          } : {})
        } 
      });

      const isCash = acc.type === 'CASH';
      const items: any[] = isCash ? cashItems : bankItems;
      const prefix = isCash ? '11' : '12';
      let label = acc.holderName || 'Unknown';
    
      if (acc.type === 'BANK') {
        const brand = acc.bank?.bankBrand || '';
        const branch = acc.branch || '';
        label = `${brand} ${branch}`.trim();
      } else if (acc.type === 'CASH') {
        label = 'CASH';
      }

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


    
    // AR
    // colB -> Receiveable (AR Type)
    // colC -> Year
    // colR -> Outstanding IDR
    const arItems = [];
    const arCategories = [
      "AR Cash Advance", "AR Others", 
      "AR Refund", "AR Staff Loan", "AR Temporary Notes", "AR Trade"
    ];

    const processedArIds = new Set<bigint>();
    for (const cat of arCategories) {
      const searchTerm = cat.toLowerCase();
      const records = arRecordsRaw.filter(r => 
        !processedArIds.has(r.id) && 
        r.colB?.toLowerCase().includes(searchTerm)
      );
      
      // AR Items Amount
      const total = records.reduce((acc, r) => {
        processedArIds.add(r.id);
        return acc.plus(new Prisma.Decimal(r.colR || 0));
      }, new Prisma.Decimal(0));
      
      // AR Items
      arItems.push({
        accountName: cat,
        idr: formatDecimal(total),
        code: '14' + (arItems.length + 1).toString().padStart(2, '0'),
        tx: records.length
      });
    }

    // AR TOTAL SUMARIZE
    const arTotal = arItems.reduce((acc, c) => acc.plus(new Prisma.Decimal(c.idr)), new Prisma.Decimal(0));
    const finalArItems = [...arItems];


    // AR Deposit
    const depositItems = [];
    const depositRecords = arRecordsRaw.filter(r => 
      !processedArIds.has(r.id) && 
      r.colB?.toLowerCase().includes('ar deposit to vendor')
    );

    // AR Deposit Amount
    const depositTotal = depositRecords.reduce((acc, r) => {
      processedArIds.add(r.id);
      return acc.plus(new Prisma.Decimal(r.colR || 0));
    }, new Prisma.Decimal(0));

    // AR Deposit Item
    depositItems.push({
      accountName: 'Deposit to vendor',
      idr: formatDecimal(depositTotal),
      code: '1301',
      tx: depositRecords.length
    });

    // Time deposits are the other kind of deposit held, and are read the same
    // way: their own receivable type, taken at its outstanding balance.
    const timeDepositRecords = arRecordsRaw.filter(r =>
      !processedArIds.has(r.id) &&
      r.colB?.toLowerCase().includes('ar time deposit')
    );

    const timeDepositTotal = timeDepositRecords.reduce((acc, r) => {
      processedArIds.add(r.id);
      return acc.plus(new Prisma.Decimal(r.colR || 0));
    }, new Prisma.Decimal(0));

    depositItems.push({
      accountName: 'Time Deposit',
      idr: formatDecimal(timeDepositTotal),
      code: '1302',
      tx: timeDepositRecords.length
    });


    // AR Prepaid Tax
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

      // AR Prepaid Tax Items Amount
      const total = records.reduce((acc, r) => {
        processedArIds.add(r.id);
        return acc.plus(new Prisma.Decimal(r.colR || 0));
      }, new Prisma.Decimal(0));

      // AR Prepaid Tax Items
      prepaidTaxTotal = prepaidTaxTotal.plus(total);
      prepaidTaxItems.push({
        accountName: group.name,
        idr: formatDecimal(total),
        code: group.code,
        tx: records.length
      });
    }


    // Depreciation (Fixed Assets)
    // colD -> Buy Price
    const fixedAssetItems = [];
    const fixedAssetTypes = [
      { name: 'Office Equipment', type: 'OFFICE_EQUIPMENT', code: '1601' },
      { name: 'Vehicle', type: 'VEHICLE', code: '1602' },
      { name: 'Intangible Assets', type: 'INTANGIBLE_ASSET', code: '1603' }
    ];

    let totalBookValue = new Prisma.Decimal(0);
    for (const item of fixedAssetTypes) {
      const records = depreciationRaw.filter(r => r.type === item.type);
      
      // Depreciation (Fixed Assets) Items Amount
      const subTotal = records.reduce((acc, r) => {
        return acc.plus(new Prisma.Decimal(r.colD ? String(r.colD) : 0));
      }, new Prisma.Decimal(0));
      
      // Depreciation (Fixed Assets) Items
      totalBookValue = totalBookValue.plus(subTotal);
      fixedAssetItems.push({
        accountName: item.name,
        idr: formatDecimal(subTotal),
        code: item.code,
        tx: records.length
      });
    }


    // Accumulated depreciation, as a contra-asset: what has been written off
    // these assets to the end of this year. It was a constant in the code -
    // 2025's figure, copied from a report and left there, so every later year
    // understated the write-off by exactly its own year's depreciation.
    //
    // colF carries the accumulation to the end of last year and colS this
    // year's charge, which is the same column the P&L reads for its
    // Depreciation line. The two reports therefore cannot disagree.
    const deprAmortVal = depreciationRaw
      .reduce(
        (acc, r) => acc.plus(new Prisma.Decimal(r.colF || 0)).plus(new Prisma.Decimal(r.colS || 0)),
        new Prisma.Decimal(0),
      )
      .negated();
    totalBookValue = totalBookValue.plus(deprAmortVal);
    fixedAssetItems.push({
      accountName: 'Depreciation & Amortization',
      idr: formatDecimal(deprAmortVal),
      code: '1604',
      tx: depreciationRaw.length
    });


    // ASSETS TOTAL
    const totalAssets = bankTotal.plus(cashTotal).plus(arTotal).plus(depositTotal).plus(timeDepositTotal).plus(prepaidTaxTotal).plus(totalBookValue);


    // Liabilities & Equity
    const processedApIds = new Set<bigint>();

    // AP
    // colA -> Payable (AP Type)
    // colU -> Outstanding IDR
    const apItems = [];
    const apCategories = [
      "AP Credit Card", "AP Expense",
      "AP Leasing", "AP Tax", "AP Trade", "AP Others"
    ];

    for (const cat of apCategories) {
      const searchTerm = cat.toLowerCase();
      const records = apRecordsRaw.filter(r => 
        !processedApIds.has(r.id) && 
        r.colA?.toLowerCase().includes(searchTerm)
      );
      
      // AP Items Amount
      const total = records.reduce((acc, r) => {
        processedApIds.add(r.id);
        return acc.plus(new Prisma.Decimal(r.colU || 0));
      }, new Prisma.Decimal(0));
      
      // AP Items
      apItems.push({
        accountName: cat,
        idr: formatDecimal(total),
        code: '21' + (apItems.length + 1).toString().padStart(2, '0'),
        tx: records.length
      });
    }

    // AP TOTAL SUMARIZE
    const apTotal = apItems.reduce((acc, c) => acc.plus(new Prisma.Decimal(c.idr.replace(/,/g, ''))), new Prisma.Decimal(0));
    const finalApItems = [...apItems];


    // AP Deposit
    const apDepositItems = [];
    const apDepositRecords = apRecordsRaw.filter(r => 
      !processedApIds.has(r.id) && 
      r.colA?.toLowerCase().includes('ap deposit from customer')
    );

    // AP Deposit Item Amount
    const apDepositTotal = apDepositRecords.reduce((acc, r) => {
      processedApIds.add(r.id);
      return acc.plus(new Prisma.Decimal(r.colU || 0));
    }, new Prisma.Decimal(0));

    // AP Deposit Item 
    apDepositItems.push({
      accountName: 'Deposit from customer',
      idr: formatDecimal(apDepositTotal),
      code: '2101',
      tx: apDepositRecords.length
    });


    // AP Short Term Loan
    const apShortTermLoanItems = [];
    const apShortTermLoanRecords = apRecordsRaw.filter(r => 
      !processedApIds.has(r.id) && 
      r.colA?.toLowerCase().includes('ap temporary loan')
    );

    // AP Short Term Loan Item Amount
    const apShortTermLoanTotal = apShortTermLoanRecords.reduce((acc, r) => {
      processedApIds.add(r.id);
      return acc.plus(new Prisma.Decimal(r.colU || 0));
    }, new Prisma.Decimal(0));

    // AP Short Term Loan Item
    apShortTermLoanItems.push({
      accountName: 'Temporary Working Capital loan',
      idr: formatDecimal(apShortTermLoanTotal),
      code: '2102',
      tx: apShortTermLoanRecords.length
    });

    
    // LIABILITIES TOTAL
    const totalLiabilities = apTotal.plus(apDepositTotal).plus(apShortTermLoanTotal);
  
    
    // EQUITY
    const reBreakdown = await this.getRetainedEarningsBreakdown(year, date);
    const { prevYearsVal, dividendVal, profitLossVal, totalRE, sharedCapitalVal, totalEquity } = reBreakdown;



    // 8. Final Response Construction
    return {
      version: "AR-DEPOSIT-TAX-V9",
      summary: {
        totalAssets: formatDecimal(totalAssets),
        totalLiabilities: formatDecimal(totalLiabilities),
        totalEquity: formatDecimal(totalEquity),
        workingCapital: formatDecimal(totalAssets.minus(totalLiabilities)),
        currentRatio: totalLiabilities.isZero() ? "0.00" : totalAssets.div(totalLiabilities).toFixed(2),
        deRatio: totalEquity.isZero() ? "0.00" : totalLiabilities.div(totalEquity).toFixed(2),
        isBalanced: totalAssets.toFixed(2) === totalEquity.plus(totalLiabilities).toFixed(2)
      },
      assets: {
        total: formatDecimal(totalAssets),
        categories: [
          { name: 'Cash', isOpen: true, total: formatDecimal(cashTotal), items: cashItems.map(i => ({ ...i, idr: i.idr, tx: i.tx })) },
          { name: 'Bank Accounts', isOpen: true, total: formatDecimal(bankTotal), items: bankItems.map(i => ({ ...i, idr: i.idr, tx: i.tx })) },
          // Subtotal = kedua item di bawahnya. Dulu hanya Deposit to vendor, jadi
          // Time Deposit tampil sebagai item tapi tidak ikut di "Total Deposit" -
          // padahal Total Assets menghitungnya.
          { name: 'Deposit', isOpen: true, total: formatDecimal(depositTotal.plus(timeDepositTotal)), items: depositItems.map(i => ({ ...i, idr: i.idr })) },
          { name: 'Account Receivable', total: formatDecimal(arTotal), items: finalArItems.map(i => ({ ...i, idr: i.idr })) },
          { name: 'Prepaid Tax', total: formatDecimal(prepaidTaxTotal), items: prepaidTaxItems.map(i => ({ ...i, idr: i.idr })) },
          { name: 'Fixed Assets', total: formatDecimal(totalBookValue), items: fixedAssetItems.map(i => ({ ...i, idr: i.idr })) }
        ]
      },
      liabilities: {
        total: formatDecimal(totalLiabilities),
        categories: [
          { name: 'Deposit', isOpen: true, total: formatDecimal(apDepositTotal), items: apDepositItems.map(i => ({ ...i, idr: i.idr })) },
          { name: 'Account Payable', isOpen: true, total: formatDecimal(apTotal), items: finalApItems.map(i => ({ ...i, idr: i.idr })) },
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
              { accountName: `Profit (Loss) ${yearNum ?? 'All Time'}`, idr: formatDecimal(profitLossVal), code: '3103', tx: 1 }
            ] 
          }
        ]
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
        amount: formatDecimal(new Prisma.Decimal(String(r.colU || 0))),
        status: Number(r.colU) > 0 ? 'Pending' : 'Paid',
        // colB is Int (Year) — construct Jan 1 of that year as the date
        date: r.colB ? new Date(r.colB, 0, 1) : new Date()
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


