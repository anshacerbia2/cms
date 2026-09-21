import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { LedgersService } from './ledgers.service';
import { CreateLedgerDto, CreateSubLedgerDto, UpdateLedgerDto, UpdateSubLedgerDto } from './dto/ledger.dto';

@Controller('ledgers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LedgersController {
  constructor(private readonly ledgers: LedgersService) {}

  /** Juga untuk dropdown di Bank Statement, jadi cukup punya akses ke salah satunya. */
  @Get('tree')
  @Permissions('ledgers.index', 'bank-mutation.index')
  tree() {
    return this.ledgers.tree();
  }

  @Post()
  @Permissions('ledgers.create')
  createLedger(@Body() dto: CreateLedgerDto) {
    return this.ledgers.createLedger(dto);
  }

  @Patch('sub-ledgers/:id')
  @Permissions('ledgers.update')
  updateSubLedger(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSubLedgerDto) {
    return this.ledgers.updateSubLedger(id, dto);
  }

  @Delete('sub-ledgers/:id')
  @Permissions('ledgers.delete')
  deleteSubLedger(@Param('id', ParseIntPipe) id: number) {
    return this.ledgers.deleteSubLedger(id);
  }

  @Post(':id/sub-ledgers')
  @Permissions('ledgers.create')
  createSubLedger(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateSubLedgerDto) {
    return this.ledgers.createSubLedger(id, dto);
  }

  @Patch(':id')
  @Permissions('ledgers.update')
  updateLedger(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLedgerDto) {
    return this.ledgers.updateLedger(id, dto);
  }

  @Delete(':id')
  @Permissions('ledgers.delete')
  deleteLedger(@Param('id', ParseIntPipe) id: number) {
    return this.ledgers.deleteLedger(id);
  }
}
