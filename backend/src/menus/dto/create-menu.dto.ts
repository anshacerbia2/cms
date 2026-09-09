import { IsString, IsOptional, IsInt, IsBoolean, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMenuDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  /**
   * The frontend turns the linked permission's route into the sidebar URL, so a
   * menu without one renders as a non-clickable group header.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  permissionId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}
