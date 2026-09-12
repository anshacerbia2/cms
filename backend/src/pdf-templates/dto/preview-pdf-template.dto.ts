import { IsString, IsOptional, IsObject } from 'class-validator';

export class PreviewPdfTemplateDto {
  @IsString()
  htmlContent: string;

  /** Sample values keyed by placeholder name; missing ones render as blank. */
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}
