export function excelDateToJSDate(excelDate: any) {
  if (!excelDate) return null;
  if (excelDate instanceof Date) return excelDate;
  if (typeof excelDate === 'number') {
    // Excel base date is 1899-12-30
    return new Date(Math.round((excelDate - 25569) * 86400 * 1000));
  }
  // For strings, attempt to parse and force to UTC 00:00:00
  const d = new Date(excelDate);
  if (isNaN(d.getTime())) return null;
  
  // Strip time and treat as UTC
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function cleanCurrency(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[Rp.\s]/g, '').replace(/,/g, '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function cleanString(val: any): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

export function isRowEmpty(row: any[]): boolean {
  if (!row || row.length === 0) return true;
  return row.every(cell => cell === null || cell === undefined || cell === '');
}

export function formatExcelDate(val: any): string {
  if (val === undefined || val === null || val === '') return '';
  // If it's a number that looks like an Excel serial date
  if (typeof val === 'number' && val > 30000 && val < 60000) {
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).replace(' ', '-');
  }
  return String(val).trim();
}
