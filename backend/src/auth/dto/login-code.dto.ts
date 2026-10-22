import { IsJWT, IsString, Matches, MaxLength } from 'class-validator';

/** Langkah kedua login: challenge dari POST /auth/login dan kode 6 digit dari Google Authenticator. */
export class LoginCodeDto {
  @IsString()
  @IsJWT()
  @MaxLength(2000)
  challenge!: string;

  // Boleh dengan spasi di tengah ("123 456"), seperti yang ditampilkan aplikasinya.
  @IsString()
  @Matches(/^\s*\d{3}\s?\d{3}\s*$/, { message: 'Enter the 6-digit code from Google Authenticator.' })
  code!: string;
}
