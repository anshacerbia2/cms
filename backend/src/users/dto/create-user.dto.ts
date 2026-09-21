import { IsString, IsEmail, IsOptional, IsInt, MaxLength, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { StrongPassword } from '../../common/validators/strong-password';

export enum UserStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export class CreateUserDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @StrongPassword()
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsEnum(UserStatusDto)
  status?: UserStatusDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roleId?: number;
}
