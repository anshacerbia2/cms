import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AccountPayableService } from './account-payable.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { Response } from 'express';
import { generateExcelBuffer } from '../../common/utils/excel.util';
import { generatePdfBuffer } from '../../common/utils/pdf.util';
import { Res } from '@nestjs/common';

/**
 * Sama dengan AR (permintaan klien 2026-09-23): kolom USD dibuang karena kosong
 * di 2025 dan 2026, dan EOY / Outstanding IDR dinamai ulang. AP In and Out tetap
 * ada - masih terisi di enam baris 2025.
 */
const AP_COLUMN_MAPPING = {
  colA: 'Payable',
  colB: 'Year',
  colC: 'Vendor',
  colD: 'Keterangan',
  colE: 'Beginning Balance|accounting',
  colG: 'Col G|accounting',
  colH: 'Col H',
  colI: 'Col I',
  colK: 'BCA Shardjo|accounting',
  colL: 'BCA Juanda|accounting',
  colM: 'Mandiri Mid Plaza|accounting',
  colN: 'BTN|accounting',
  colO: 'BRI Shardjo|accounting',
  colP: 'BRI Tebet|accounting',
  colQ: 'Cash IDR|accounting',
  colR: 'Non CB|accounting',
  colS: 'AP In and Out|accounting',
  colU: 'Ending Balance|accounting',
};

@Controller('finance/account-payable')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountPayableController {
  constructor(private readonly accountPayableService: AccountPayableService) {}

  @Get()
  @Permissions('account-payable.index')
  async getPaginatedAccountPayables(@Query() query: any) {
    return this.accountPayableService.getPaginatedAccountPayables(query);
  }

  @Get('all')
  @Permissions('account-payable.index')
  async getAllAccountPayables(@Query('year') year?: string) {
    return this.accountPayableService.getAllAccountPayables(year ? Number(year) : undefined);
  }
  /** The accounts this year's rows were posted against, in display order. */
  @Get('accounts')
  @Permissions('account-payable.index')
  async getAccountColumns(@Query('year') year?: string) {
    return this.accountPayableService.getAPAccounts(year ? Number(year) : undefined);
  }

  @Get('export/excel')
  @Permissions('account-payable.index')
  async exportExcel(@Query('year') year: string, @Res() res: Response) {
    const data = await this.accountPayableService.getAllAccountPayables(year ? Number(year) : undefined);
    const cleanData = data.map(item => {
      const { id, tagYear, createdAt, updatedAt, ...rest } = item;
      return rest;
    });
    const buffer = generateExcelBuffer(cleanData, 'Account Payable', AP_COLUMN_MAPPING);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Account_Payable_${year || 'All'}.xlsx`);
    res.send(buffer);
  }

  @Get('export/pdf')
  @Permissions('account-payable.index')
  async exportPdf(@Query('year') year: string, @Res() res: Response) {
    const data = await this.accountPayableService.getAllAccountPayables(year ? Number(year) : undefined);
    const cleanData = data.map(item => {
      const { id, tagYear, createdAt, updatedAt, ...rest } = item;
      return rest;
    });
    const buffer = await generatePdfBuffer(cleanData, 'Account Payable Ledger', AP_COLUMN_MAPPING);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Account_Payable_${year || 'All'}.pdf`);
    res.send(buffer);
  }
  @Post()
  @Permissions('account-payable.create')
  async createAccountPayable(@Body() data: any) {
    return this.accountPayableService.createAccountPayable(data);
  }


  @Post('bulk')
  @Permissions('account-payable.bulk')
  async createBulk(@Body() body: { data: any[], tagYear: number }) {
    return this.accountPayableService.createBulkAccountPayables(body.data, body.tagYear);
  }


  @Put(':id')
  @Permissions('account-payable.update')
  async updateAccountPayable(@Param('id') id: string, @Body() data: any) {
    return this.accountPayableService.updateAccountPayable(Number(id), data);
  }

  @Delete(':id')
  @Permissions('account-payable.delete')
  async deleteAccountPayable(@Param('id') id: string) {
    return this.accountPayableService.deleteAccountPayable(Number(id));
  }
}
