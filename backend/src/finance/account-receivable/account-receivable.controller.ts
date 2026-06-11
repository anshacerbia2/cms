import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { AccountReceivableService } from './account-receivable.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

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
}
