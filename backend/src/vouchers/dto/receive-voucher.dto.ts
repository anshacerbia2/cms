import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray, IsDateString, ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export enum VoucherCurrency {
  IDR = 'IDR', USD = 'USD', EUR = 'EUR', GBP = 'GBP', JPY = 'JPY',
  KRW = 'KRW', MYR = 'MYR', HKD = 'HKD', OTHERS = 'OTHERS',
}

export enum VoucherPaymentForm {
  BANK = 'BANK',
  CREDIT_CARD = 'CREDIT_CARD',
  CASH = 'CASH',
}

export enum VoucherPayerType {
  CUSTOMER = 'CUSTOMER', EMPLOYEE = 'EMPLOYEE', SUPPLIER = 'SUPPLIER',
  OTHERS = 'OTHERS', UNKNOWN = 'UNKNOWN',
}

export enum ReceiveVoucherPurpose {
  INVOICE = 'INVOICE',
  RETURN_REFUND = 'RETURN_REFUND',
  RETURNING_DEPOSIT = 'RETURNING_DEPOSIT',
  RETURNING_CASH_ADVANCE = 'RETURNING_CASH_ADVANCE',
  STAFF_LOAN = 'STAFF_LOAN',
  OTHERS = 'OTHERS',
  UNKNOWN = 'UNKNOWN',
}

export class InvoiceAllocationDto {
  @Type(() => Number)
  @IsNumber()
  invoiceId: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) amountApplied?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ppnWapuDeduction?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) pph23Deduction?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) bankCharge?: number;
  @IsOptional() @Type(() => Number) @IsNumber() othersAdjustment?: number;
  @IsOptional() @IsString() adjustmentDescription?: string;
}

export class CreateReceiveVoucherDto {
  @IsString()
  @IsNotEmpty()
  rvNumber: string;

  @IsDateString()
  rvDate: string;

  @IsOptional() @IsEnum(VoucherCurrency) currency?: VoucherCurrency;
  @IsOptional() @IsString() currencyManual?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(VoucherPaymentForm)
  paymentForm: VoucherPaymentForm;

  @IsOptional() @Type(() => Number) @IsNumber() internalAccountId?: number;
  @IsOptional() @IsString() paymentFormValue?: string;

  @IsEnum(VoucherPayerType)
  payerType: VoucherPayerType;

  @IsOptional() @Type(() => Number) @IsNumber() payerId?: number;
  @IsOptional() @IsString() payerNameManual?: string;

  @IsOptional() @IsEnum(ReceiveVoucherPurpose) purpose?: ReceiveVoucherPurpose;
  @IsOptional() @Type(() => Number) @IsNumber() paymentVoucherId?: number;
  @IsOptional() @IsString() description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceAllocationDto)
  invoiceAllocations?: InvoiceAllocationDto[];
}

export class ReceiveVoucherQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(ReceiveVoucherPurpose) purpose?: ReceiveVoucherPurpose;
  @IsOptional() @IsEnum(VoucherPayerType) payerType?: VoucherPayerType;
  @IsOptional() @Type(() => Number) @IsNumber() invoiceId?: number;
}
