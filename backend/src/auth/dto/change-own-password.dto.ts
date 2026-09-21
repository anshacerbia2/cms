import { IsNotEmpty, IsString } from 'class-validator';
import { StrongPassword } from '../../common/validators/strong-password';

export class ChangeOwnPasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @StrongPassword()
  newPassword: string;
}
