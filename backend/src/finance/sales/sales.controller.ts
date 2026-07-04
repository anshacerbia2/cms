import { Controller, Get, Post, Body, UseGuards, Query, Param, ParseIntPipe, Patch, Delete } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

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
