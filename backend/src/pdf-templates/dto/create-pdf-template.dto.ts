import { IsString, IsOptional, IsBoolean, IsEnum, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum PdfTemplateTypeDto {
  PROPOSAL = 'PROPOSAL',
  INVOICE = 'INVOICE',
}

export class TemplateVariableDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  label?: string;
}

export class CreatePdfTemplateDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsEnum(PdfTemplateTypeDto)
  type: PdfTemplateTypeDto;

  @IsString()
  htmlContent: string;

  /** Documentation for whoever edits the template; not used when rendering. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  variables?: TemplateVariableDto[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
