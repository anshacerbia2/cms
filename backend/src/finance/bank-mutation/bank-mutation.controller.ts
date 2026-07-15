import { Controller, Get, Post, Put, Delete, Body, UseGuards, Query, ParseIntPipe, Param } from '@nestjs/common';
import { BankMutationService } from './bank-mutation.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { generateExcelBuffer } from '../../common/utils/excel.util';
import { generatePdfBuffer } from '../../common/utils/pdf.util';
import type { Response } from 'express';
import { Res } from '@nestjs/common';

const BANK_MUTATION_COLUMN_MAPPING = {
  colA: 'Date',
  colB: 'Keterangan',
  colC: 'Debit|accounting',
  colD: 'Credit|accounting',
  colE: 'Balance|accounting',
  colF: 'Tag 1',
  colG: 'Tag 2',
  colH: 'Tag 3',
  colI: 'Notes',
};

@Controller('bank-mutation')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin', 'finance_manager')
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
    @Res() res: Response
  ) {
    const data = await this.bankMutationService.getAllTransactions(accountId, year ? Number(year) : undefined, startDate, endDate);
    const cleanData = data.map(item => {
      const { id, tagYear, internalAccountId, createdAt, updatedAt, ...rest } = item;
      return rest;
    });
    const buffer = generateExcelBuffer(cleanData, 'Bank Statement', BANK_MUTATION_COLUMN_MAPPING);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Bank_Statement_${year || 'All'}.xlsx`);
    res.send(buffer);
  }

  @Get('export/pdf')
  @Permissions('bank-mutation.index')
  async exportPdf(
    @Query('accountId') accountId: string,
    @Query('year') year: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response
  ) {
    const data = await this.bankMutationService.getAllTransactions(accountId, year ? Number(year) : undefined, startDate, endDate);
    const cleanData = data.map(item => {
      const { id, tagYear, internalAccountId, createdAt, updatedAt, ...rest } = item;
      return rest;
    });
    const buffer = await generatePdfBuffer(cleanData, 'Bank Statement', BANK_MUTATION_COLUMN_MAPPING);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Bank_Statement_${year || 'All'}.pdf`);
    res.send(buffer);
  }

  @Post('transactions/bulk')
  @Permissions('bank-mutation.bulk')
  async createBulkTransactions(@Body() body: { data: any[]; accountId: string; tagYear: number; startingBalance?: string }) {
    return this.bankMutationService.createBulkTransactions(body.data, body.accountId, body.tagYear, body.startingBalance);
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
