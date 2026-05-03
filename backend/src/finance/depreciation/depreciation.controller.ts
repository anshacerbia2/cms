import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { DepreciationService } from './depreciation.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

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
  async getAllDepreciations() {
    return this.depreciationService.getAllDepreciations();
  }

  @Post()
  @Permissions('depreciation.create')
  async createDepreciation(@Body() data: any) {
    return this.depreciationService.createDepreciation(data);
  }

  @Post('bulk')
  @Permissions('depreciation.bulk')
  async createBulk(@Body() data: any[]) {
    return this.depreciationService.createBulkDepreciations(data);
  }
}
