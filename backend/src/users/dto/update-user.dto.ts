import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

/**
 * Password is excluded on purpose: changing it goes through the dedicated
 * endpoint, so an ordinary profile edit can never reset someone's credentials
 * as a side effect of a stray field in the payload.
 */
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {}
