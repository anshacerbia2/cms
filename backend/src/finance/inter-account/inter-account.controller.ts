import { Controller, Get, Query, UseGuards, Param, ParseIntPipe, Patch, Delete, Body } from '@nestjs/common';
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

  @Get(':id')
  async getInterAccountById(@Param('id', ParseIntPipe) id: number) {
    return this.interAccountService.getInterAccountById(id);
  }

  @Patch(':id')
  async updateInterAccount(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    return this.interAccountService.updateInterAccount(id, data);
  }

  @Delete(':id')
  async deleteInterAccount(@Param('id', ParseIntPipe) id: number) {
    return this.interAccountService.deleteInterAccount(id);
  }
}
