import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
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
}
