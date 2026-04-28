import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AccountPayableService } from './account-payable.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('finance/ap')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountPayableController {
  constructor(private readonly accountPayableService: AccountPayableService) {}

  @Get()
  @Permissions('finance.index')
  async getPaginatedAccountPayables(@Query() query: any) {
    return this.accountPayableService.getPaginatedAccountPayables(query);
  }

  @Get('all')
  @Permissions('finance.index')
  async getAllAccountPayables() {
    return this.accountPayableService.getAllAccountPayables();
  }
}
