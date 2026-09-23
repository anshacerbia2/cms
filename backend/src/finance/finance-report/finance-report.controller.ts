import { Controller, Get, Post, Body, UseGuards, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { generateExcelBuffer } from '../../common/utils/excel.util';
import { generatePdfBuffer } from '../../common/utils/pdf.util';
import { FinanceReportService } from './finance-report.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

/** Kolom unduhan P&L. Net Sales, COGS, dan Margin hanya terisi di bagian project. */
const PL_COLUMN_MAPPING = {
  account: 'Account/Description',
  total: 'Amount|accounting',
  netSales: 'Net Sales|accounting',
  cogs: 'COGS|accounting',
  margin: 'Margin',
  source: 'Source',
};

@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceReportController {
  constructor(private readonly financeService: FinanceReportService) {}

  /**
   * Baris laporan P&L untuk diunduh, ditambah rincian Gross Profit per project
   * di bawahnya - bagian yang sama dengan yang bisa dibuka di layar.
   *
   * Kolom Amount dipakai bersama: untuk baris P&L isinya nilai baris itu, untuk
   * baris project isinya Gross Profit project tersebut. Net Sales, COGS, dan
   * Margin hanya terisi di bagian project.
   */
  private async plRowsWithGrossProfit(year?: string, date?: string) {
    const [data, projects] = await Promise.all([
      this.financeService.getProfitLossStatement(year ? Number(year) : undefined, date),
      this.financeService.getGrossProfitByProject(year ? Number(year) : undefined, date),
    ]);

    const rows: any[] = data.tableData.map((row) => ({
      ...row,
      account: row.level >= 2 ? `${'    '.repeat(row.level - 1)}${row.account}` : row.account,
      _style: row.isHeader || row.isTotal ? { bold: true } : undefined,
    }));

    if (projects.length > 0) {
      const sum = (field: 'netSales' | 'cogs' | 'grossProfit') =>
        projects.reduce((total, p) => total + Number((p as any)[field] || 0), 0);
      const netSales = sum('netSales');
      const grossProfit = sum('grossProfit');

      rows.push({ account: '' });
      rows.push({ account: 'GROSS PROFIT PER PROJECT', _style: { bold: true } });
      for (const p of projects) {
        rows.push({
          account: `    ${p.project}`,
          netSales: p.netSales,
          cogs: p.cogs,
          total: p.grossProfit,
          margin: p.margin === null ? '' : `${p.margin}%`,
          source: p.source,
        });
      }
      rows.push({
        account: 'TOTAL',
        netSales: String(netSales),
        cogs: String(sum('cogs')),
        total: String(grossProfit),
        margin: netSales === 0 ? '' : `${((grossProfit / netSales) * 100).toFixed(2)}%`,
        _style: { bold: true },
      });
    }

    return rows;
  }



  // Depreciation endpoints are handled by DepreciationController

  @Get('recent-activities')
  @Permissions('finance.reports')
  async getDashboardActivities() {
    return this.financeService.getDashboardActivities();
  }

  @Get('revenue')
  @Permissions('finance.reports')
  async getRevenue(@Query() query: PaginationQueryDto) {
    return this.financeService.getRevenue(query);
  }

  @Post('revenue/bulk')
  @Permissions('finance.reports')
  async createBulkRevenue(@Body() data: any[]) {
    return this.financeService.createBulkRevenue(data);
  }

  @Get('expenses')
  @Permissions('finance.reports')
  async getExpenses(@Query() query: PaginationQueryDto) {
    return this.financeService.getExpenses(query);
  }

  @Post('expenses/bulk')
  @Permissions('finance.reports')
  async createBulkExpenses(@Body() data: any[]) {
    return this.financeService.createBulkExpenses(data);
  }

  @Get('pl-summary')
  @Permissions('finance.reports')
  async getPLSummary(
    @Query('year') year?: string,
    @Query('date') date?: string
  ) {
    return this.financeService.getPLSummary(
      year ? Number(year) : undefined,
      date
    );
  }

  @Get('pl-statement')
  @Permissions('finance.reports')
  async getPLStatement(
    @Query('year') year?: string,
    @Query('date') date?: string
  ) {
    return this.financeService.getProfitLossStatement(
      year ? Number(year) : undefined,
      date
    );
  }

  @Get('pl-details')
  @Permissions('finance.reports')
  async getPLDetails(
    @Query('year') year?: string,
    @Query('ledger') ledger?: string,
    @Query('date') date?: string,
    @Query('subItem') subItem?: string,
    @Query('salesCode') salesCode?: string
  ) {
    return this.financeService.getPLDetails(
      year ? Number(year) : undefined, 
      ledger,
      date,
      subItem,
      salesCode
    );
  }

  @Get('depreciation-details')
  @Permissions('finance.reports')
  async getDepreciationDetails(
    @Query('year') year?: string,
    @Query('date') date?: string
  ) {
    return this.financeService.getDepreciationDetails(
      year ? Number(year) : undefined,
      date
    );
  }

  @Get('sales-cogs-details')
  @Permissions('finance.reports')
  async getSalesCogsDetails(
    @Query('year') year?: string,
    @Query('date') date?: string,
  ) {
    return this.financeService.getSalesCogsDetails(
      year ? Number(year) : undefined,
      date
    );
  }

  @Get('balance-sheet-details')
  @Permissions('finance.reports')
  async getBSDetails(
    @Query('category') category: string,
    @Query('subItem') subItem?: string,
    @Query('date') date?: string,
    @Query('accountId') accountId?: string,
    @Query('year') year?: string
  ) {
    return this.financeService.getBSDetails(category, subItem, year, date, accountId);
  }

  @Get('balance-sheet')
  @Permissions('finance.reports')
  async getBalanceSheet(
    @Query('date') date?: string,
    @Query('year') year?: string
  ) {
    return this.financeService.getBalanceSheet(year, date);
  }

  @Get('pl-statement/export/excel')
  @Permissions('finance.reports')
  async exportPLStatementExcel(
    @Query('year') year: string,
    @Query('date') date: string,
    @Res() res: Response
  ) {
    const rows = await this.plRowsWithGrossProfit(year, date);
    const buffer = generateExcelBuffer(rows, 'Profit Loss', PL_COLUMN_MAPPING);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Profit_Loss_${year || 'All'}.xlsx`);
    res.send(buffer);
  }

  @Get('pl-statement/export/pdf')
  @Permissions('finance.reports')
  async exportPLStatementPdf(
    @Query('year') year: string,
    @Query('date') date: string,
    @Res() res: Response
  ) {
    const rows = await this.plRowsWithGrossProfit(year, date);
    const buffer = await generatePdfBuffer(rows, `Profit Loss Statement ${year || 'All Time'}`, PL_COLUMN_MAPPING);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Profit_Loss_${year || 'All'}.pdf`);
    res.send(buffer);
  }

  private flattenBalanceSheet(data: any) {
    const rows: any[] = [];
    
    // ASSETS
    rows.push({ description: 'ASSETS', amount: null, _style: { bold: true } });
    if (data.assets && data.assets.categories) {
      data.assets.categories.forEach((cat: any) => {
        rows.push({ description: cat.name, amount: null, _style: { bold: true } });
        if (cat.items) {
          cat.items.forEach((item: any) => {
            rows.push({ description: `    ${item.accountName}`, amount: item.idr });
          });
        }
        rows.push({ description: `        Total ${cat.name}`, amount: cat.total, _style: { bold: true } });
        rows.push({ description: '', amount: null });
      });
    }
    rows.push({ description: '        A S S E T S', amount: data.assets?.total, _style: { bold: true, fill: 'EEEEEE' } });
    rows.push({ description: '', amount: null });

    // LIABILITIES
    rows.push({ description: 'LIABILITIES', amount: null, _style: { bold: true } });
    if (data.liabilities && data.liabilities.categories) {
      data.liabilities.categories.forEach((cat: any) => {
        rows.push({ description: cat.name, amount: null, _style: { bold: true } });
        if (cat.items) {
          cat.items.forEach((item: any) => {
            rows.push({ description: `    ${item.accountName}`, amount: item.idr });
          });
        }
        rows.push({ description: `        Total ${cat.name}`, amount: cat.total, _style: { bold: true } });
        rows.push({ description: '', amount: null });
      });
    }

    // EQUITY
    rows.push({ description: 'EQUITY', amount: null, _style: { bold: true } });
    if (data.equity && data.equity.categories) {
      data.equity.categories.forEach((cat: any) => {
        rows.push({ description: cat.name, amount: null, _style: { bold: true } });
        if (cat.items) {
          cat.items.forEach((item: any) => {
            rows.push({ description: `    ${item.accountName}`, amount: item.idr });
          });
        }
        rows.push({ description: `        Total ${cat.name}`, amount: cat.total, _style: { bold: true } });
        rows.push({ description: '', amount: null });
      });
    }

    const totalLE = Number((data.liabilities?.total || "0").toString().replace(/,/g, '')) + 
                    Number((data.equity?.total || "0").toString().replace(/,/g, ''));

    rows.push({ description: '        L I A B I L I T I E S   &   E Q U I T Y', amount: totalLE, _style: { bold: true, fill: 'EEEEEE' } });

    return rows;
  }

  @Get('balance-sheet/export/excel')
  @Permissions('finance.reports')
  async exportBalanceSheetExcel(
    @Query('year') year: string,
    @Query('date') date: string,
    @Res() res: Response
  ) {
    const data = await this.financeService.getBalanceSheet(year, date);
    const rows = this.flattenBalanceSheet(data);
    const BS_COLUMN_MAPPING = {
      description: 'Account/Description',
      amount: 'Amount'
    };
    const buffer = generateExcelBuffer(rows, 'Balance Sheet', BS_COLUMN_MAPPING);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Balance_Sheet_${year || 'All'}.xlsx`);
    res.send(buffer);
  }

  @Get('balance-sheet/export/pdf')
  @Permissions('finance.reports')
  async exportBalanceSheetPdf(
    @Query('year') year: string,
    @Query('date') date: string,
    @Res() res: Response
  ) {
    const data = await this.financeService.getBalanceSheet(year, date);
    const rows = this.flattenBalanceSheet(data);
    const BS_COLUMN_MAPPING = {
      description: 'Account/Description',
      amount: 'Amount'
    };
    const buffer = await generatePdfBuffer(rows, `Balance Sheet ${year || 'All Time'}`, BS_COLUMN_MAPPING);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Balance_Sheet_${year || 'All'}.pdf`);
    res.send(buffer);
  }
}
