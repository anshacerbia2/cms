import { IsString, IsOptional, IsNotEmpty, IsEnum, Length, IsBoolean, IsInt, Min, MaxLength, ValidateIf } from 'class-validator';
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
  /**
   * Hanya rekening bank yang punya bank induk. Kas dan Non Cash & Bank tidak,
   * dan form mengirimnya kosong - dulu keduanya ditolak "bankId should not be
   * empty" padahal kolomnya memang boleh kosong.
   */
  @ValidateIf((o) => o.type === InternalAccountType.BANK)
  @IsString()
  @IsNotEmpty()
  bankId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsEnum(InternalAccountType)
  type: InternalAccountType;

  /** Boleh kosong: kas, Non CB, dan beberapa rekening bank memang tidak punya nomor. */
  @IsOptional()
  @IsString()
  accountNo?: string;

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
