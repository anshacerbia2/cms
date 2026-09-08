import { IsOptional, IsNumber, IsEnum, IsBooleanString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { InvoiceStatus, InvoicePaymentStatus } from './create-invoice.dto';

export class InvoiceQueryDto extends PaginationQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber() customerId?: number;
  @IsOptional() @Type(() => Number) @IsNumber() projectId?: number;
  @IsOptional() @Type(() => Number) @IsNumber() proposalId?: number;

  @IsOptional() @IsEnum(InvoiceStatus) status?: InvoiceStatus;
  @IsOptional() @IsEnum(InvoicePaymentStatus) paymentStatus?: InvoicePaymentStatus;

  /** "true" returns everything that is not FULLY_PAID — the RV allocation picker. */
  @IsOptional() @IsBooleanString() unpaid?: string;
}
