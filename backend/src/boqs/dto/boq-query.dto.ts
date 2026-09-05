import { IsOptional, IsNumber, IsBooleanString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class BoqQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  proposalId?: number;

  /** "true" lists only BoQs not yet bound to a proposal. */
  @IsOptional()
  @IsBooleanString()
  unbound?: string;
}
