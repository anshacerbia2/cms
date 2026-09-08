import { PartialType } from '@nestjs/mapped-types';
import { CreateReceiveVoucherDto } from './receive-voucher.dto';
import { CreatePaymentVoucherDto } from './payment-voucher.dto';

export class UpdateReceiveVoucherDto extends PartialType(CreateReceiveVoucherDto) {}
export class UpdatePaymentVoucherDto extends PartialType(CreatePaymentVoucherDto) {}
