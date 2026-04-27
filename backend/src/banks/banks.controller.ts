import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  Query 
} from '@nestjs/common';
import { BanksService } from './banks.service';
import { CreateBankDto, CreateInternalAccountDto, UpdateInternalAccountDto } from './dto/create-bank.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Controller('banks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  // --- MASTER BANKS ---

  @Post()
  @Permissions('banks.create')
  createBank(@Body() dto: CreateBankDto) {
    return this.banksService.createBank(dto);
  }

  @Get()
  @Permissions('banks.index')
  findAllBanks(@Query() query: PaginationQueryDto) {
    return this.banksService.findAllBanks(query);
  }

  // --- INTERNAL ACCOUNTS ---

  @Post('internal-accounts')
  @Permissions('internal-accounts.create')
  createInternalAccount(@Body() dto: CreateInternalAccountDto) {
    return this.banksService.createInternalAccount(dto);
  }

  @Get('internal-accounts')
  @Permissions('internal-accounts.index')
  findAllInternalAccounts(@Query() query: PaginationQueryDto) {
    return this.banksService.findAllInternalAccounts(query);
  }

  @Get('internal-accounts/:id')
  @Permissions('internal-accounts.show')
  findOneInternalAccount(@Param('id') id: string) {
    return this.banksService.findOneInternalAccount(+id);
  }

  @Patch('internal-accounts/:id')
  @Permissions('internal-accounts.update')
  updateInternalAccount(@Param('id') id: string, @Body() dto: UpdateInternalAccountDto) {
    return this.banksService.updateInternalAccount(+id, dto);
  }

  @Delete('internal-accounts/:id')
  @Permissions('internal-accounts.delete')
  removeInternalAccount(@Param('id') id: string) {
    return this.banksService.removeInternalAccount(+id);
  }

  // --- FISCAL PERIODS ---

  @Get('fiscal-periods')
  @Permissions('internal-accounts.index')
  findAllFiscalPeriods(@Query() query: PaginationQueryDto) {
    return this.banksService.findAllFiscalPeriods(query);
  }
}
