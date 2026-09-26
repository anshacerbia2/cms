import { Controller, Get, Post, Put, Delete, Body, UseGuards, Query, ParseIntPipe, Param } from '@nestjs/common';
import { BankMutationService } from './bank-mutation.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { generateExcelBuffer } from '../../common/utils/excel.util';
import { generatePdfBuffer } from '../../common/utils/pdf.util';
import { pickExportRows } from '../../common/utils/export-rows.util';
import type { Response } from 'express';
import { Res } from '@nestjs/common';

const BANK_MUTATION_COLUMN_MAPPING = {
  colA: 'Date',
  colB: 'Description',
  colC: 'Debit|accounting',
  colD: 'Credit|accounting',
  colE: 'Balance|accounting',
  colF: 'Ledger',
  colG: 'Sub Ledger 1',
  colH: 'Sub Ledger 2',
  colI: 'Sub Ledger 3',
};

/*
 * Akses diatur per endpoint lewat permission saja. Dulu seluruh controller juga
 * dikunci ke role admin/president_director, jadi role viewer - yang punya
 * `bank-mutation.index` - tetap ditolak 403 dan Bank Statement tidak termuat
 * sama sekali. Endpoint tulis tetap tertutup: viewer tidak punya
 * permission create/edit/delete/bulk/recalculate/close.
 */
@Controller('bank-mutation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BankMutationController {
  constructor(private readonly bankMutationService: BankMutationService) {}

  @Get('transactions/all')
  @Permissions('bank-mutation.index')
  async getAllTransactions(
    @Query('accountId') accountId?: string,
    @Query('year') year?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.bankMutationService.getAllTransactions(accountId, year ? Number(year) : undefined, startDate, endDate);
  }

  @Get('export/excel')
  @Permissions('bank-mutation.index')
  async exportExcel(
    @Query('accountId') accountId: string,
    @Query('year') year: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
    ids?: string[],
  ) {
    const data = await this.bankMutationService.getAllTransactions(accountId, year ? Number(year) : undefined, startDate, endDate);
    const cleanData = pickExportRows(data, ids).map(item => {
      const { id, tagYear, internalAccountId, createdAt, updatedAt, ...rest } = item;
      return rest;
    });
    const buffer = generateExcelBuffer(cleanData, 'Bank Statement', BANK_MUTATION_COLUMN_MAPPING);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Bank_Statement_${year || 'All'}.xlsx`);
    res.send(buffer);
  }

  /*
   * Kembaran POST dari ekspor di atas. Badannya membawa `ids`: baris yang lolos
   * filter kolom di layar. Lewat POST karena daftar id bisa ribuan - terlalu
   * panjang untuk ditaruh di URL. Tanpa `ids`, hasilnya sama persis dengan GET.
   */
  @Post('export/excel')
  @Permissions('bank-mutation.index')
  async exportExcelFiltered(
    @Query('accountId') accountId: string,
    @Query('year') year: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Body('ids') ids: string[],
    @Res() res: Response,
  ) {
    return this.exportExcel(accountId, year, startDate, endDate, res, ids);
  }

  @Get('export/pdf')
  @Permissions('bank-mutation.index')
  async exportPdf(
    @Query('accountId') accountId: string,
    @Query('year') year: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
    ids?: string[],
  ) {
    const data = await this.bankMutationService.getAllTransactions(accountId, year ? Number(year) : undefined, startDate, endDate);
    const cleanData = pickExportRows(data, ids).map(item => {
      const { id, tagYear, internalAccountId, createdAt, updatedAt, ...rest } = item;
      return rest;
    });
    const buffer = await generatePdfBuffer(cleanData, 'Bank Statement', BANK_MUTATION_COLUMN_MAPPING);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Bank_Statement_${year || 'All'}.pdf`);
    res.send(buffer);
  }

  /*
   * Kembaran POST dari ekspor di atas. Badannya membawa `ids`: baris yang lolos
   * filter kolom di layar. Lewat POST karena daftar id bisa ribuan - terlalu
   * panjang untuk ditaruh di URL. Tanpa `ids`, hasilnya sama persis dengan GET.
   */
  @Post('export/pdf')
  @Permissions('bank-mutation.index')
  async exportPdfFiltered(
    @Query('accountId') accountId: string,
    @Query('year') year: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Body('ids') ids: string[],
    @Res() res: Response,
  ) {
    return this.exportPdf(accountId, year, startDate, endDate, res, ids);
  }

  @Post('transactions/bulk')
  @Permissions('bank-mutation.bulk')
  async createBulkTransactions(@Body() body: { data: any[]; accountId: string; tagYear: number; startingBalance?: string }) {
    return this.bankMutationService.createBulkTransactions(body.data, body.accountId, body.tagYear, body.startingBalance);
  }

  /**
   * Menyisip satu atau lebih baris tepat di bawah `afterId`; `afterId` null berarti paling atas.
   *
   * Beda dengan transactions/bulk yang selalu menambah di ujung. Baris baru
   * mendapat nomor lanjutan dari baris di atasnya, dan nomor baris-baris di
   * bawahnya bergeser sebanyak baris yang disisipkan; id dan isi baris lain
   * tidak berubah.
   */
  @Post('transactions/insert')
  @Permissions('bank-mutation.create')
  async insertTransaction(
    @Body() body: { rows: any[]; accountId: string; tagYear: number; afterId?: number | null },
  ) {
    return this.bankMutationService.insertTransactions(
      body.rows,
      body.accountId,
      body.tagYear,
      body.afterId,
    );
  }

  @Get('anchor-balance/:accountId/:year')
  @Permissions('finance.anchor')
  async getAnchorBalance(
    @Param('accountId') accountId: string,
    @Param('year', ParseIntPipe) year: number
  ) {
    return this.bankMutationService.getLatestAnchor(accountId, year);
  }

  @Get('fiscal-periods')
  @Permissions('bank-mutation.index')
  async getFiscalPeriods(
    @Query('accountId') accountId: string,
    @Query('year') year?: string
  ) {
    return this.bankMutationService.getFiscalPeriods(accountId, year ? Number(year) : undefined);
  }

  @Post('recalculate')
  @Permissions('finance.recalculate')
  async recalculate(@Body() body: { accountId: string; year: number }) {
    return this.bankMutationService.recalculateLedger(body.accountId, body.year);
  }

  @Post('close-year')
  @Permissions('finance.year.close')
  async closeYear(
    @Body() body: { accountId: string; year: number; userId: string }
  ) {
    return this.bankMutationService.closeYear(body.accountId, body.year, body.userId);
  }

  @Get('transactions/:id')
  @Permissions('bank-mutation.index')
  async getTransaction(
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.bankMutationService.getTransaction(id);
  }

  @Put('transactions/:id')
  @Permissions('bank-mutation.edit')
  async updateTransaction(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any
  ) {
    return this.bankMutationService.updateTransaction(id, body);
  }

  @Delete('transactions/:id')
  @Permissions('bank-mutation.delete')
  async deleteTransaction(
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.bankMutationService.deleteTransaction(id);
  }
}
