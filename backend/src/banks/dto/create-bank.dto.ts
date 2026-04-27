import { IsString, IsOptional, IsNotEmpty, IsEnum, Length } from 'class-validator';
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
}

export class UpdateInternalAccountDto extends PartialType(CreateInternalAccountDto) {}
