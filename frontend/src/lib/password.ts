import * as z from "zod";

/**
 * Aturan password untuk semua password baru: minimal 8 karakter, dengan huruf
 * besar, huruf kecil, angka, dan karakter spesial. Sama dengan
 * `StrongPassword` di backend (`common/validators/strong-password.ts`).
 */
export const PASSWORD_RULE_MESSAGE =
  "Minimal 8 karakter, dengan huruf besar, huruf kecil, angka, dan karakter spesial.";

export const isStrongPassword = (value: string) =>
  value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);

export const strongPassword = z.string().refine(isStrongPassword, PASSWORD_RULE_MESSAGE);
