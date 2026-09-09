import { IsString, IsEmail, IsOptional, IsInt, MinLength, MaxLength, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

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
  @MinLength(8, { message: 'password must be at least 8 characters' })
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
