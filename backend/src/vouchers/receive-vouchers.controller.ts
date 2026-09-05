import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { ReceiveVouchersService } from './receive-vouchers.service';
import { CreateReceiveVoucherDto, ReceiveVoucherQueryDto } from './dto/receive-voucher.dto';
import { UpdateReceiveVoucherDto } from './dto/update-voucher.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('receive-vouchers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReceiveVouchersController {
  constructor(private readonly receiveVouchersService: ReceiveVouchersService) {}

  @Post()
  @Permissions('receive-vouchers.create')
  create(@Body() dto: CreateReceiveVoucherDto) {
    return this.receiveVouchersService.create(dto);
  }

  @Get()
  @Permissions('receive-vouchers.index')
  findAll(@Query() query: ReceiveVoucherQueryDto) {
    return this.receiveVouchersService.findAll(query);
  }

  @Get(':id')
  @Permissions('receive-vouchers.show')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.receiveVouchersService.findOne(id);
  }

  @Patch(':id')
  @Permissions('receive-vouchers.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReceiveVoucherDto) {
    return this.receiveVouchersService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('receive-vouchers.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.receiveVouchersService.remove(id);
  }
}
