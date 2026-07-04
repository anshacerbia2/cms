import { Controller, Get, Post, Body, Query, UseGuards, Param, ParseIntPipe, Patch, Delete } from '@nestjs/common';
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
  async getAllDepreciations(@Query('year') year?: string) {
    return this.depreciationService.getAllDepreciations(year ? Number(year) : undefined);
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
