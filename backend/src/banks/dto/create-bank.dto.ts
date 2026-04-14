import { IsString, IsOptional, IsNotEmpty, IsEnum, Length } from 'class-validator';
import { InternalAccountType } from '@prisma/client';

export class CreateBankDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  bankCode: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsOptional()
  @IsString()
  bankBrand?: string;

  @IsOptional()
  @IsString()
  bankAddress?: string;
}


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
