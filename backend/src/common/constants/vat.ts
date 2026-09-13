/**
 * The only VAT rates this business bills at.
 *
 * Legacy pinned `vat_rate` to `in:[1,11]` on both the proposal and the invoice.
 * The port had loosened it to any non-negative integer, which let a rate of 500
 * through and billed it as written — so this is a restored rule, not a new one.
 * Both DTOs read it from here so the two cannot drift apart.
 */
export const VAT_RATES = [1, 11] as const;

export const VAT_RATE_MESSAGE = `vatRate must be one of: ${VAT_RATES.join(', ')}`;
