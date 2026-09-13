import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsInt, IsIn, IsArray, ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VAT_RATES, VAT_RATE_MESSAGE } from '../../common/constants/vat';

export enum ProposalStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  WIN = 'WIN',
  LOSE = 'LOSE',
  CANCELLED = 'CANCELLED',
}

export enum PricingModel {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

export enum ManagementFeeType {
  NOMINAL = 'NOMINAL',
  PERCENT = 'PERCENT',
}

export class ProposalItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  productId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  productPriceVersionId?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellingPrice: number;

  /** Type B only: quantity multiplier, stored as title1. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  qty?: number;

  @IsOptional() @IsString() title1Key?: string;
  @IsOptional() @Type(() => Number) @IsInt() title1Value?: number;
  @IsOptional() @IsString() title2Key?: string;
  @IsOptional() @Type(() => Number) @IsInt() title2Value?: number;
  @IsOptional() @IsString() title3Key?: string;
  @IsOptional() @Type(() => Number) @IsInt() title3Value?: number;
  @IsOptional() @IsString() title4Key?: string;
  @IsOptional() @Type(() => Number) @IsInt() title4Value?: number;

  @IsOptional() @IsString() header?: string;
  @IsOptional() @IsString() subheader?: string;
  @IsOptional() @Type(() => Number) @IsInt() headerOrder?: number;
}

export class CreateProposalDto {
  @Type(() => Number)
  @IsNumber()
  projectId: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsEnum(ProposalStatus)
  status?: ProposalStatus;

  @IsEnum(PricingModel)
  @IsNotEmpty()
  pricingModel: PricingModel;

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

  @IsOptional()
  @IsString()
  pricingModelDescription?: string;

  /** Type A only: the proposal total is entered directly instead of built from items. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmountItems?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalItemDto)
  items?: ProposalItemDto[];
}
