export const parseIntSafe = (val: any): number | null => {
  if (!val) return null;
  const parsed = parseInt(String(val), 10);
  return isNaN(parsed) ? null : parsed;
};

export const parseDateSafe = (val: any): Date | null => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};
