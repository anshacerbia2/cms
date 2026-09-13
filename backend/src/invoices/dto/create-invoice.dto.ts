import { IsString, IsOptional, IsEnum, IsNumber, IsInt, IsIn, IsArray, IsDateString, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { VAT_RATES, VAT_RATE_MESSAGE } from '../../common/constants/vat';

export enum InvoiceBillingType {
  PARTLY_PAYMENT = 'PARTLY_PAYMENT',
  FULL_AMOUNT = 'FULL_AMOUNT',
}

export enum InvoiceTaxType {
  NO_TAX = 'NO_TAX',
  TAX_NON_WAPU = 'TAX_NON_WAPU',
  TAX_WAPU = 'TAX_WAPU',
}

export enum InvoiceStatus {
  VOID = 'VOID',
  REVISED = 'REVISED',
  PREPARED = 'PREPARED',
  SENT = 'SENT',
}

export enum InvoicePaymentStatus {
  UNPAID = 'UNPAID',
  PARTLY_PAID = 'PARTLY_PAID',
  FULLY_PAID = 'FULLY_PAID',
}

export enum ManagementFeeType {
  NOMINAL = 'NOMINAL',
  PERCENT = 'PERCENT',
}

export class CreateInvoiceDto {
  /** Regular flow bills a won proposal; FIT flow bills the project directly. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  proposalId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  projectId?: number;

  @Type(() => Number)
  @IsNumber()
  customerId: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  billingOptionId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  internalAccountId?: number;

  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(InvoiceBillingType)
  billingType: InvoiceBillingType;

  @IsEnum(InvoiceTaxType)
  taxType: InvoiceTaxType;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsEnum(InvoicePaymentStatus)
  paymentStatus?: InvoicePaymentStatus;

  /** Regular flow: the proposal sales items to bill on this invoice. */
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  itemIds?: number[];

  /** FIT flow only — the Regular flow derives these from the proposal. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsEnum(ManagementFeeType)
  managementFeeType?: ManagementFeeType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  managementFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(VAT_RATES as unknown as number[], { message: VAT_RATE_MESSAGE })
  vatRate?: number;
}
