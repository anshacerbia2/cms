import { Controller, Get, Post, Body, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { EquityPropertyService } from './equity-property.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('finance/equity-properties')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class EquityPropertyController {
  constructor(private readonly equityPropertyService: EquityPropertyService) {}

  @Get()
  @Roles('admin', 'finance_manager')
  @Permissions('finance.reports')
  async getProperties(@Query('year', ParseIntPipe) year: number) {
    return this.equityPropertyService.getProperties(year);
  }

  @Post()
  @Roles('admin', 'finance_manager')
  @Permissions('finance.reports')
  async setProperties(
    @Body('year', ParseIntPipe) year: number,
    @Body('properties') properties: Record<string, string | null>,
  ) {
    return this.equityPropertyService.setProperties(year, properties);
  }
}
