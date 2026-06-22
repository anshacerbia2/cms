import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InterAccountService } from './inter-account.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('finance/inter-account')
@UseGuards(JwtAuthGuard)
export class InterAccountController {
  constructor(private readonly interAccountService: InterAccountService) {}

  @Get()
  async getAll(@Query('year') year?: string) {
    return this.interAccountService.getAllInterAccount(year ? Number(year) : undefined);
  }

  @Get('paginated')
  async getPaginated(@Query() query: any) {
    return this.interAccountService.getPaginatedInterAccount(query);
  }
}
