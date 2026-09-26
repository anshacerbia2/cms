import { Controller, Get, Query, UseGuards, Param, ParseIntPipe, Patch, Delete, Body, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { generateExcelBuffer } from '../../common/utils/excel.util';
import { generatePdfBuffer } from '../../common/utils/pdf.util';
import { pickExportRows } from '../../common/utils/export-rows.util';
import { PpnInOutService } from './ppn-in-out.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

// Kolom 2025 dan 2026 digabung: Sales hanya ada di 2025, DPP PPN hanya di 2026.
// colG (Status lama, bertipe angka) tidak pernah terisi, jadi tidak diekspor.
const PPN_IN_OUT_COLUMN_MAPPING = {
  colA: 'Masa (Date)',
  colB: 'PPN Type',
  colC: 'No Faktur',
  colD: 'Customer/Vendor',
  colE: 'Invoice No',
  colF: 'Sales (Year)|num',
  dpp: 'DPP PPN|accounting',
  status: 'Status',
  colH: 'PPN|accounting',
  colI: 'WAPU|accounting',
  colJ: 'PAID|accounting',
  colK: 'AP PPN WAPU|accounting',
  colL: 'Blank',
  colM: 'Non WAPU|accounting',
  colN: 'Masukan|accounting',
  colO: 'AP PPN Non WAPU|accounting',
  colP: 'Ledger',
  colQ: 'Sub Ledger-1',
  colR: 'Sub Ledger-2',
  colS: 'Sub Ledger-3',
};

@Controller('finance/ppn-in-out')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PpnInOutController {
  constructor(private readonly ppnInOutService: PpnInOutService) {}

  @Get('all')
  @Permissions('ppn-in-out.index')
  async getAllPpnInOut(@Query('year') year?: string) {
    return this.ppnInOutService.getAllPpnInOut(year ? Number(year) : undefined);
  }

  @Get('export/excel')
  @Permissions('ppn-in-out.index')
  async exportPpnInOut(@Query('year') year: string, @Res() res: Response, ids?: string[]) {
    const data = await this.ppnInOutService.getAllPpnInOut(year ? Number(year) : undefined);
    const cleanData = pickExportRows(data, ids).map(item => {
      const { id, tagYear, createdAt, updatedAt, ...rest } = item;
      return rest;
    });
    const buffer = generateExcelBuffer(cleanData, 'PpnInOut', PPN_IN_OUT_COLUMN_MAPPING);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="PpnInOut_${year || 'All'}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  /*
   * Kembaran POST dari ekspor di atas. Badannya membawa `ids`: baris yang lolos
   * filter kolom di layar. Lewat POST karena daftar id bisa ribuan - terlalu
   * panjang untuk ditaruh di URL. Tanpa `ids`, hasilnya sama persis dengan GET.
   */
  @Post('export/excel')
  @Permissions('ppn-in-out.index')
  async exportPpnInOutFiltered(
    @Query('year') year: string,
    @Body('ids') ids: string[],
    @Res() res: Response,
  ) {
    return this.exportPpnInOut(year, res, ids);
  }

  @Get('export/pdf')
  @Permissions('ppn-in-out.index')
  async exportPpnInOutPdf(@Query('year') year: string, @Res() res: Response, ids?: string[]) {
    const data = await this.ppnInOutService.getAllPpnInOut(year ? Number(year) : undefined);
    const cleanData = pickExportRows(data, ids).map(item => {
      const { id, tagYear, createdAt, updatedAt, ...rest } = item;
      return rest;
    });
    const buffer = await generatePdfBuffer(cleanData, `PPN In and Out Report ${year || 'All'}`, PPN_IN_OUT_COLUMN_MAPPING);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="PpnInOut_${year || 'All'}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  /*
   * Kembaran POST dari ekspor di atas. Badannya membawa `ids`: baris yang lolos
   * filter kolom di layar. Lewat POST karena daftar id bisa ribuan - terlalu
   * panjang untuk ditaruh di URL. Tanpa `ids`, hasilnya sama persis dengan GET.
   */
  @Post('export/pdf')
  @Permissions('ppn-in-out.index')
  async exportPpnInOutPdfFiltered(
    @Query('year') year: string,
    @Body('ids') ids: string[],
    @Res() res: Response,
  ) {
    return this.exportPpnInOutPdf(year, res, ids);
  }

  @Get()
  @Permissions('ppn-in-out.index')
  async getPaginatedPpnInOut(@Query() query: any) {
    return this.ppnInOutService.getPaginatedPpnInOut(query);
  }

  @Get(':id')
  @Permissions('ppn-in-out.index')
  async getPpnInOutById(@Param('id', ParseIntPipe) id: number) {
    return this.ppnInOutService.getPpnInOutById(id);
  }

  @Post('bulk')
  @Permissions('ppn-in-out.create')
  async createBulkPpnInOut(@Body() body: { data: any[], tagYear: number }) {
    return this.ppnInOutService.createBulkPpnInOut(body.data, body.tagYear);
  }

  @Post()
  @Permissions('ppn-in-out.create')
  async createPpnInOut(@Body() data: any) {
    return this.ppnInOutService.createPpnInOut(data);
  }

  @Patch(':id')
  @Permissions('ppn-in-out.update')
  async updatePpnInOut(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    return this.ppnInOutService.updatePpnInOut(id, data);
  }

  @Delete(':id')
  @Permissions('ppn-in-out.delete')
  async deletePpnInOut(@Param('id', ParseIntPipe) id: number) {
    return this.ppnInOutService.deletePpnInOut(id);
  }
}
