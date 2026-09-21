import { IsStrongPassword } from 'class-validator';

/**
 * Aturan password untuk semua password baru: minimal 8 karakter, dengan huruf
 * besar, huruf kecil, angka, dan karakter spesial. Sama dengan `PASSWORD_RULE`
 * di frontend (`lib/password.ts`).
 */
export const PASSWORD_RULE_MESSAGE =
  'Password minimal 8 karakter, dengan huruf besar, huruf kecil, angka, dan karakter spesial.';

export const StrongPassword = () =>
  IsStrongPassword(
    { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 },
    { message: PASSWORD_RULE_MESSAGE },
  );
