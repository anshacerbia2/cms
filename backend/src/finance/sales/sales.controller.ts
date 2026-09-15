import { Controller, Get, Post, Body, UseGuards, Query, Param, ParseIntPipe, Patch, Delete, Res } from '@nestjs/common';
import type { Response } from 'express';
import { generateExcelBuffer } from '../../common/utils/excel.util';
import { generatePdfBuffer } from '../../common/utils/pdf.util';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

const SALES_COLUMN_MAPPING = {
  colA: 'No',
  colB: 'Invoice No',
  colC: 'Date',
  colD: 'Year|num',
  colE: 'Billing To',
  colF: 'Sales Code',
  colG: 'Description',
  colH: 'Basic Price|accounting',
  colI: 'Management Fee|accounting',
  colJ: 'PPN|accounting',
  colK: 'Account Receivable IDR|accounting',
  colL: 'Date Received',
  colM: 'BCA Sahardjo|accounting',
  colN: 'BCA Juanda|accounting',
  colO: 'Mandiri Mid Plaza|accounting',
  colP: 'Mandiri Plaza Mandiri|accounting',
  colQ: 'BRI Tebet|accounting',
  colR: 'BRI Sahardjo|accounting',
  colS: 'BTN|accounting',
  colT: 'Bank Raya|accounting',
  colU: 'BNI|accounting',
  colV: 'Cash IDR|accounting',
  colW: 'Non CB|accounting',
  colX: 'Outstanding IDR|accounting',
  colY: 'Blank',
  colZ: 'AP PPn|accounting',
  colAA: 'PPh-23|accounting',
  colAB: 'WAPU|accounting',
  colAC: 'Non WAPU|accounting',
  colAD: 'Remarks',
};

@Controller('finance/sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @Permissions('sales.index')
  async getSales(@Query() query: PaginationQueryDto) {
    return this.salesService.getSales(query);
  }

  @Get('all')
  @Permissions('sales.index')
  async getAllSales(@Query('year') year?: string) {
    return this.salesService.getAllSales(year ? Number(year) : undefined);
  }

  /** The accounts this year's invoices were settled through, in display order. */
  @Get('accounts')
  @Permissions('sales.index')
  async getSalesAccounts(@Query('year') year?: string) {
    return this.salesService.getSalesAccounts(year ? Number(year) : undefined);
  }

  @Get('export/excel')
  @Permissions('sales.index')
  async exportSales(@Query('year') year: string, @Res() res: Response) {
    const data = await this.salesService.getAllSales(year ? Number(year) : undefined);
    const cleanData = data.map(item => {
      const { id, tagYear, createdAt, updatedAt, ...rest } = item;
      return rest;
    });
    const buffer = generateExcelBuffer(cleanData, 'Sales', SALES_COLUMN_MAPPING);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Sales_${year || 'All'}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('export/pdf')
  @Permissions('sales.index')
  async exportSalesPdf(@Query('year') year: string, @Res() res: Response) {
    const data = await this.salesService.getAllSales(year ? Number(year) : undefined);
    const cleanData = data.map(item => {
      const { id, tagYear, createdAt, updatedAt, ...rest } = item;
      return rest;
    });
    const buffer = await generatePdfBuffer(cleanData, `Sales Report ${year || 'All'}`, SALES_COLUMN_MAPPING);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Sales_${year || 'All'}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post('bulk')
  @Permissions('sales.create')
  async createBulkSales(@Body() body: { data: any[], tagYear: number }) {
    return this.salesService.createBulkSales(body.data, body.tagYear);
  }

  @Get(':id')
  @Permissions('sales.index')
  async getSalesById(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.getSalesById(id);
  }

  @Patch(':id')
  @Permissions('sales.update')
  async updateSales(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    return this.salesService.updateSales(id, data);
  }

  @Delete(':id')
  @Permissions('sales.delete')
  async deleteSales(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.deleteSales(id);
  }
}
