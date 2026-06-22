import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
}
