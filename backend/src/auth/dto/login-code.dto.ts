import { IsJWT, IsString, Matches, MaxLength } from 'class-validator';

const SIX_DIGITS = /^\s*\d{3}\s?\d{3}\s*$/;
const SIX_DIGITS_MESSAGE = 'Enter the 6-digit code from Google Authenticator.';

/** Langkah kedua login: challenge dari POST /auth/login dan kode 6 digit dari Google Authenticator. */
export class LoginCodeDto {
  @IsString()
  @IsJWT()
  @MaxLength(2000)
  challenge!: string;

  // Boleh dengan spasi di tengah ("123 456"), seperti yang ditampilkan aplikasinya.
  @IsString()
  @Matches(SIX_DIGITS, { message: SIX_DIGITS_MESSAGE })
  code!: string;
}

/** Kode dari Google Authenticator saja - untuk mematikan 2FA dari menu profil. */
export class TwoFactorCodeDto {
  @IsString()
  @Matches(SIX_DIGITS, { message: SIX_DIGITS_MESSAGE })
  code!: string;
}
