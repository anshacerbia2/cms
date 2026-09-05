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

/**
 * Recursively converts Prisma Decimal values inside a result object into
 * 4-decimal strings, leaving BigInt/Date to the global TransformInterceptor.
 *
 * Needed because ClassSerializerInterceptor runs before TransformInterceptor and
 * strips the Decimal prototype, after which the interceptor can only stringify it
 * as "[object Object]". Finance modules avoid this by formatting field by field;
 * the sales pipeline returns deeply nested graphs, so it formats in one pass.
 */
export const serializeDecimals = <T>(value: T): T => {
  if (value === null || value === undefined) return value;

  const type = typeof value;
  if (type === 'bigint' || type === 'number' || type === 'string' || type === 'boolean') return value;
  if (value instanceof Date) return value;

  const candidate = value as any;
  const isDecimal =
    typeof candidate.toFixed === 'function' ||
    ('d' in candidate && 's' in candidate && 'e' in candidate);
  if (isDecimal) return formatDecimal(candidate) as unknown as T;

  if (Array.isArray(value)) return value.map((item) => serializeDecimals(item)) as unknown as T;

  if (type === 'object') {
    const out: Record<string, any> = {};
    for (const key of Object.keys(candidate)) {
      out[key] = serializeDecimals(candidate[key]);
    }
    return out as T;
  }

  return value;
};
