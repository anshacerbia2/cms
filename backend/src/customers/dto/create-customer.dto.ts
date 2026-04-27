import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class CreateBillingOptionDto {
  @IsString()
  @IsOptional()
  cpName?: string;

  @IsString()
  @IsOptional()
  cpTitleDivision?: string;

  @IsString()
  @IsOptional()
  cpEmail?: string;

  @IsString()
  @IsOptional()
  cpOfficeNumber?: string;

  @IsString()
  @IsOptional()
  cpMobileNumber?: string;

  @IsOptional()
  isOverseas?: boolean;

  @IsString()
  @IsOptional()
  address?: string;
}

export class CreateCustomerPicDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsEnum(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @IsString()
  @IsOptional()
  bankAccountName?: string;

  @IsEnum(CustomerStatus)
  @IsOptional()
  status?: CustomerStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateBillingOptionDto)
  billingOptions?: CreateBillingOptionDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerPicDto)
  pics?: CreateCustomerPicDto[];
}
