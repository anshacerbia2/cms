/**
 * Formats a value to a 4-decimal string.
 * Used primarily for Prisma Decimal types in financial modules.
 */
export const formatDecimal = (val: any): string => {
  if (val == null) return "0.0000";
  if (typeof val.toFixed === 'function') {
    try {
      const formatted = val.toFixed(4);
      if (formatted !== 'NaN') return formatted;
    } catch (e) {}
  }
  const num = Number(val.toString());
  if (isNaN(num)) return "0.0000";
  return num.toFixed(4);
};

/**
 * Ensures a value is a numeric string "0" instead of the dash "-" used for display.
 */
export const forceZero = (val: any): string => {
  const formatted = formatDecimal(val);
  return formatted === '-' ? '0' : formatted;
};
