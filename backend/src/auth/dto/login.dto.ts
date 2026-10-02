import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Body login. Tanpa DTO, body kosong atau field yang hilang sampai ke bcrypt
 * dan berakhir 500 (pentest F-05); kini ditolak 400 sebelum menyentuh apa pun.
 */
export class LoginDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @IsNotEmpty()
  // bcrypt hanya membaca 72 byte pertama; batas ini cuma mencegah body raksasa.
  @MaxLength(200)
  password!: string;
}
