import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { AccountReceivableService } from './account-receivable.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import type { Response } from 'express';
import { generateExcelBuffer } from '../../common/utils/excel.util';
import { generatePdfBuffer } from '../../common/utils/pdf.util';
import { Res } from '@nestjs/common';

/**
 * Kolom export Excel dan PDF, atas permintaan klien 2026-09-23.
 *
 * Yang dibuang: EOY USD, USD Rate, Outstanding USD, dan PPn In and Out -
 * keempatnya kosong di seluruh 2025 dan 2026, jadi tidak ada angka yang hilang.
 * EOY IDR dan Outstanding IDR dinamai ulang jadi Beginning Balance dan Ending
 * Balance; kolom datanya tetap sama.
 */
const AR_COLUMN_MAPPING = {
  colB: 'Type',
  colC: 'Date',
  colD: 'Client',
  colE: 'Description',
  colF: 'Beginning Balance|accounting',
  colJ: 'BCA Suhardjo|accounting',
  colK: 'BCA Juanda|accounting',
  colL: 'Mandiri MP|accounting',
  colM: 'BRI Suhardjo|accounting',
  colN: 'Cash IDR|accounting',
  colO: 'Non CB|accounting',
  colR: 'Ending Balance|accounting',
};

@Controller('finance/account-receivable')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountReceivableController {
  constructor(private readonly arService: AccountReceivableService) {}

  @Get()
  @Permissions('account-receivable.index')
  async getAR(@Query() query: PaginationQueryDto) {
    return this.arService.getAR(query);
  }

  @Get('all')
  @Permissions('account-receivable.index')
  async getAllAR(@Query('year') year?: string) {
    return this.arService.getAllAR(year ? Number(year) : undefined);
  }
  /** The accounts this year's rows were posted against, in display order. */
  @Get('accounts')
  @Permissions('account-receivable.index')
  async getAccountColumns(@Query('year') year?: string) {
    return this.arService.getARAccounts(year ? Number(year) : undefined);
  }

  @Get('export/excel')
  @Permissions('account-receivable.index')
  async exportExcel(@Query('year') year: string, @Res() res: Response) {
    const data = await this.arService.getAllAR(year ? Number(year) : undefined);
    const cleanData = data.map(item => {
      const { id, tagYear, createdAt, updatedAt, ...rest } = item;
      return rest;
    });
    const buffer = generateExcelBuffer(cleanData, 'Account Receivable', AR_COLUMN_MAPPING);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Account_Receivable_${year || 'All'}.xlsx`);
    res.send(buffer);
  }

  @Get('export/pdf')
  @Permissions('account-receivable.index')
  async exportPdf(@Query('year') year: string, @Res() res: Response) {
    const data = await this.arService.getAllAR(year ? Number(year) : undefined);
    const cleanData = data.map(item => {
      const { id, tagYear, createdAt, updatedAt, ...rest } = item;
      return rest;
    });
    const buffer = await generatePdfBuffer(cleanData, 'Account Receivable Ledger', AR_COLUMN_MAPPING);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Account_Receivable_${year || 'All'}.pdf`);
    res.send(buffer);
  }

  @Post()
  @Permissions('account-receivable.create')
  async createAR(@Body() data: any) {
    return this.arService.createAR(data);
  }

  @Post('bulk')
  @Permissions('account-receivable.bulk')
  async createBulk(@Body() body: { data: any[], tagYear: number }) {
    return this.arService.createBulkAR(body.data, body.tagYear);
  }

  @Put(':id')
  @Permissions('account-receivable.update')
  async updateAR(@Param('id') id: string, @Body() data: any) {
    return this.arService.updateAR(Number(id), data);
  }

  @Delete(':id')
  @Permissions('account-receivable.delete')
  async deleteAR(@Param('id') id: string) {
    return this.arService.deleteAR(Number(id));
  }
}
