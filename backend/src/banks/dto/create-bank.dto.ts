import { IsString, IsOptional, IsNotEmpty, IsEnum, Length, IsBoolean, IsInt, Min, MaxLength } from 'class-validator';
import { InternalAccountType } from '@prisma/client';
import { PartialType } from '@nestjs/mapped-types';

export class CreateBankDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  bankCode: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  bankBrand: string;

  @IsOptional()
  @IsString()
  bankAddress?: string;
}

export class UpdateBankDto extends PartialType(CreateBankDto) {}


export class CreateInternalAccountDto {
  @IsString()
  @IsNotEmpty()
  bankId: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsEnum(InternalAccountType)
  type: InternalAccountType;

  @IsString()
  @IsNotEmpty()
  accountNo: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  swiftCode?: string;

  @IsString()
  @IsNotEmpty()
  holderName: string;

  /** The header the finance tables show this account under. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  /** Where it sits when accounts are shown side by side, lowest first. */
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  /** Marks this as the settlement account No Tax invoices must use. */
  @IsOptional()
  @IsBoolean()
  isNonVatSettlement?: boolean;
}

export class UpdateInternalAccountDto extends PartialType(CreateInternalAccountDto) {}
