import { IsString, IsOptional, IsNotEmpty, IsNumberString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsOptional()
  @IsNumberString()
  categoryId?: string;

  @IsOptional()
  @IsNumberString()
  supplierId?: string;

  /** Selling price. Stored as a product_price_versions row, not on the product itself. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;
}

export class UpdateProductCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
