import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreatePaymentVoucherDto {
  @IsString()
  @IsNotEmpty()
  pvNumber: string;

  @IsDateString()
  issuingDate: string;

  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() currency?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  /** Free-form payee kind (Employee, Supplier, Internal, Others) — no FK in the legacy schema. */
  @IsString()
  @IsNotEmpty()
  payableType: string;

  @IsOptional() @Type(() => Number) @IsNumber() payableId?: number;
  @IsOptional() @IsString() payableNameManual?: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsOptional() @Type(() => Number) @IsNumber() purchaseOrderId?: number;
  @IsOptional() @IsString() expenseType?: string;
  @IsOptional() @IsString() description?: string;

  @IsString()
  @IsNotEmpty()
  sourcePaymentForm: string;

  @IsOptional() @Type(() => Number) @IsNumber() internalAccountId?: number;
  @IsOptional() @IsDateString() paymentDate?: string;
}

export class PaymentVoucherQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() payableType?: string;
}
