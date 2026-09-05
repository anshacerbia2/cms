import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { PaymentVouchersService } from './payment-vouchers.service';
import { CreatePaymentVoucherDto, PaymentVoucherQueryDto } from './dto/payment-voucher.dto';
import { UpdatePaymentVoucherDto } from './dto/update-voucher.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payment-vouchers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentVouchersController {
  constructor(private readonly paymentVouchersService: PaymentVouchersService) {}

  @Post()
  @Permissions('payment-vouchers.create')
  create(@Body() dto: CreatePaymentVoucherDto) {
    return this.paymentVouchersService.create(dto);
  }

  @Get()
  @Permissions('payment-vouchers.index')
  findAll(@Query() query: PaymentVoucherQueryDto) {
    return this.paymentVouchersService.findAll(query);
  }

  @Get(':id')
  @Permissions('payment-vouchers.show')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentVouchersService.findOne(id);
  }

  @Patch(':id')
  @Permissions('payment-vouchers.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePaymentVoucherDto) {
    return this.paymentVouchersService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('payment-vouchers.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paymentVouchersService.remove(id);
  }
}
