import { IsString, IsOptional, MaxLength, Matches, IsIn } from 'class-validator';

export class CreatePermissionDto {
  /**
   * The guard matches on this exact string, and the sidebar derives a page URL
   * from it (`projects.index` -> `/projects`), so the shape is load-bearing.
   */
  @IsString()
  @MaxLength(150)
  @Matches(/^[a-z0-9-]+\.[a-z0-9-]+$/, {
    message: 'route must look like "module.action", lowercase (e.g. "projects.index")',
  })
  route: string;

  @IsOptional()
  @IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
