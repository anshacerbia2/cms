import { IsOptional, IsNumber, IsInt, IsString, IsArray, ValidateNested, Min, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class BoqItemDto {
  @Type(() => Number)
  @IsNumber()
  productId: number;

  @IsOptional()
  @IsString()
  description?: string;

  /** Defaults to the product's active price version when omitted. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  qty: number;

  @IsOptional()
  @IsString()
  qtyUnit?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  freq: number;

  @IsOptional()
  @IsString()
  freqUnit?: string;
}

export class CreateBoqDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  proposalId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BoqItemDto)
  items: BoqItemDto[];
}

export class ReplicateBoqDto {
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  boqIds: number[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  proposalId?: number;
}

export class BoqIdsDto {
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  boqIds: number[];
}
