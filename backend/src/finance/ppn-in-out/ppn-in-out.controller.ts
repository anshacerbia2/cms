import { Controller, Get, Query, UseGuards, Param, ParseIntPipe, Patch, Delete, Body } from '@nestjs/common';
import { PpnInOutService } from './ppn-in-out.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('finance/ppn-in-out')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PpnInOutController {
  constructor(private readonly ppnInOutService: PpnInOutService) {}

  @Get('all')
  @Permissions('ppn-in-out.index')
  async getAllPpnInOut(@Query('year') year?: string) {
    return this.ppnInOutService.getAllPpnInOut(year ? Number(year) : undefined);
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
