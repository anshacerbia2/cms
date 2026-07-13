import { Controller, Get, Query, UseGuards, Param, ParseIntPipe, Patch, Delete, Body, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { generateExcelBuffer } from '../../common/utils/excel.util';
import { generatePdfBuffer } from '../../common/utils/pdf.util';
import { InterAccountService } from './inter-account.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

const INTER_ACCOUNT_COLUMN_MAPPING = {
  colB: 'colB',
  colC: 'BCA Sahardjo|accounting',
  colD: 'BCA Juanda|accounting',
  colE: 'Mandiri Mid Plaza|accounting',
  colF: 'BRI Sahardjo|accounting',
  colG: 'BTN|accounting',
  colH: 'BJB|accounting',
  colI: 'Bank Raya|accounting',
  colJ: 'BRI Tebet|accounting',
  colK: 'Manidiri Plaza Mandiri|accounting',
  colL: 'BNI|accounting',
  colM: 'Cash IDR|accounting',
  colN: 'Non Cash Bank|accounting',
  colO: 'PPn In and Out|accounting',
};

@Controller('finance/inter-account')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InterAccountController {
  constructor(private readonly interAccountService: InterAccountService) {}

  @Get()
  @Permissions('inter-account.index')
  async getAll(@Query('year') year?: string) {
    return this.interAccountService.getAllInterAccount(year ? Number(year) : undefined);
  }

  @Get('export/excel')
  @Permissions('inter-account.index')
  async exportInterAccount(@Query('year') year: string, @Res() res: Response) {
    const data = await this.interAccountService.getAllInterAccount(year ? Number(year) : undefined);
    const cleanData = data.map(item => {
      const { id, tagYear, createdAt, updatedAt, ...rest } = item;
      return rest;
    });
    const buffer = generateExcelBuffer(cleanData, 'InterAccount', INTER_ACCOUNT_COLUMN_MAPPING);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="InterAccount_${year || 'All'}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('export/pdf')
  @Permissions('inter-account.index')
  async exportInterAccountPdf(@Query('year') year: string, @Res() res: Response) {
    const data = await this.interAccountService.getAllInterAccount(year ? Number(year) : undefined);
    const cleanData = data.map(item => {
      const { id, tagYear, createdAt, updatedAt, ...rest } = item;
      return rest;
    });
    const buffer = await generatePdfBuffer(cleanData, `Inter Account Report ${year || 'All'}`, INTER_ACCOUNT_COLUMN_MAPPING);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="InterAccount_${year || 'All'}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('paginated')
  @Permissions('inter-account.index')
  async getPaginated(@Query() query: any) {
    return this.interAccountService.getPaginatedInterAccount(query);
  }

  @Get(':id')
  @Permissions('inter-account.index')
  async getInterAccountById(@Param('id', ParseIntPipe) id: number) {
    return this.interAccountService.getInterAccountById(id);
  }

  @Post('bulk')
  @Permissions('inter-account.create')
  async createBulkInterAccount(@Body() body: { data: any[], tagYear: number }) {
    return this.interAccountService.createBulkInterAccount(body.data, body.tagYear);
  }

  @Post()
  @Permissions('inter-account.create')
  async createInterAccount(@Body() data: any) {
    return this.interAccountService.createInterAccount(data);
  }

  @Patch(':id')
  @Permissions('inter-account.update')
  async updateInterAccount(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    return this.interAccountService.updateInterAccount(id, data);
  }

  @Delete(':id')
  @Permissions('inter-account.delete')
  async deleteInterAccount(@Param('id', ParseIntPipe) id: number) {
    return this.interAccountService.deleteInterAccount(id);
  }
}
