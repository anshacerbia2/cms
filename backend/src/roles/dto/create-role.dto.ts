import { IsString, IsOptional, IsArray, IsInt, MaxLength, ArrayUnique } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoleDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(150)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  /**
   * Full replacement, not a delta: whatever arrives here becomes the role's
   * permissions. Omitting the field leaves the existing grants alone, which is
   * what lets a rename skip sending the whole matrix back.
   */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  permissionIds?: number[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  menuIds?: number[];
}
