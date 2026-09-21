import { IsString } from 'class-validator';
import { StrongPassword } from '../../common/validators/strong-password';

export class ChangePasswordDto {
  @IsString()
  @StrongPassword()
  password: string;
}
