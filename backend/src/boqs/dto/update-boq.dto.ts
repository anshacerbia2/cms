import { PartialType } from '@nestjs/mapped-types';
import { CreateBoqDto } from './create-boq.dto';

export class UpdateBoqDto extends PartialType(CreateBoqDto) {}
