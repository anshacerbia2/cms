import { Controller, Get, Post, Body, Query, UseGuards, Param, ParseIntPipe, Patch, Delete, Res } from '@nestjs/common';
import type { Response } from 'express';
import { generateExcelBuffer } from '../../common/utils/excel.util';
import { generatePdfBuffer } from '../../common/utils/pdf.util';
import { DepreciationService } from './depreciation.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

const DEPRECIATION_COLUMN_MAPPING = {
  type: 'Category',
  colA: 'Purchase Date (Date)',
  colB: 'Source',
  colC: 'Description',
  colD: 'Purchase Price|accounting',
  colE: 'Useful Life (Months)|num',
  colF: 'S/D 2024|accounting',
  colG: 'JAN|accounting',
  colH: 'FEB|accounting',
  colI: 'MAR|accounting',
  colJ: 'APR|accounting',
  colK: 'MAY|accounting',
  colL: 'JUN|accounting',
  colM: 'JUL|accounting',
  colN: 'AUG|accounting',
  colO: 'SEP|accounting',
  colP: 'OCT|accounting',
  colQ: 'NOV|accounting',
  colR: 'DEC|accounting',
  colS: 'Total 2025|accounting',
  colT: 'S/D 2025|accounting',
  colU: 'Book Value|accounting',
};

@Controller('finance/depreciation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DepreciationController {
  constructor(private readonly depreciationService: DepreciationService) {}

  @Get()
  @Permissions('depreciation.index')
  async getPaginatedDepreciations(@Query() query: any) {
    return this.depreciationService.getPaginatedDepreciations(query);
  }

  @Get('all')
  @Permissions('depreciation.index')
  async getAllDepreciations(@Query('year') year?: string) {
    return this.depreciationService.getAllDepreciations(year ? Number(year) : undefined);
  }

  @Get('export/excel')
  @Permissions('depreciation.index')
  async exportDepreciation(@Query('year') year: string, @Res() res: Response) {
    const data = await this.depreciationService.getAllDepreciations(year ? Number(year) : undefined);
    const cleanData = data.map(item => {
      const { id, tagYear, createdAt, updatedAt, ...rest } = item;
      return rest;
    });
    const buffer = generateExcelBuffer(cleanData, 'Depreciation', DEPRECIATION_COLUMN_MAPPING);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Depreciation_${year || 'All'}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('export/pdf')
  @Permissions('depreciation.index')
  async exportDepreciationPdf(@Query('year') year: string, @Res() res: Response) {
    const data = await this.depreciationService.getAllDepreciations(year ? Number(year) : undefined);
    const cleanData = data.map(item => {
      const { id, tagYear, createdAt, updatedAt, ...rest } = item;
      return rest;
    });
    const buffer = await generatePdfBuffer(cleanData, `Depreciation Report ${year || 'All'}`, DEPRECIATION_COLUMN_MAPPING);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Depreciation_${year || 'All'}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post()
  @Permissions('depreciation.create')
  async createDepreciation(@Body() data: any) {
    return this.depreciationService.createDepreciation(data);
  }

  @Post('bulk')
  @Permissions('depreciation.bulk')
  async createBulk(@Body() body: { data: any[], tagYear: number }) {
    return this.depreciationService.createBulkDepreciations(body.data, body.tagYear);
  }

  @Get(':id')
  @Permissions('depreciation.index')
  async getDepreciationById(@Param('id', ParseIntPipe) id: number) {
    return this.depreciationService.getDepreciationById(id);
  }

  @Patch(':id')
  @Permissions('depreciation.update')
  async updateDepreciation(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    return this.depreciationService.updateDepreciation(id, data);
  }

  @Delete(':id')
  @Permissions('depreciation.delete')
  async deleteDepreciation(@Param('id', ParseIntPipe) id: number) {
    return this.depreciationService.deleteDepreciation(id);
  }
}
