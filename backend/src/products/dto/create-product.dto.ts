import { IsString, IsOptional, IsNotEmpty, IsNumberString, IsNumber, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

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

/**
 * Body PATCH /products/:id. Dulu controller menerima `any` dan meneruskannya ke
 * database, jadi kolom seperti deletedAt atau createdAt ikut bisa diubah
 * (pentest N-03); kini hanya field form produk yang lolos. Kategori/supplier
 * kosong ("") tetap berarti "tidak diubah", sama seperti sebelumnya.
 */
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  unit?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsNumberString()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsNumberString()
  supplierId?: string;

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
