import { Prisma } from '@prisma/client';

export function excelDateToJSDate(excelDate: any) {
  if (!excelDate) return null;
  if (excelDate instanceof Date) return excelDate;
  
  if (typeof excelDate === 'number') {
    // Excel base date is 1899-12-30
    return new Date(Math.round((excelDate - 25569) * 86400 * 1000));
  }

  let strDate = String(excelDate).trim();

  // 1. Handle "2 0 2 5" -> treat as year start (e.g. 2025-01-01)
  if (/^[\d\s]+$/.test(strDate)) {
    const yearStr = strDate.replace(/\s+/g, '');
    if (yearStr.length === 4) {
      return new Date(Date.UTC(parseInt(yearStr), 0, 1));
    }
  }

  // 2. Manual Parser for MMM-YY with Indonesian month support (e.g. des-22, mei-25)
  const monthMap: Record<string, number> = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mei': 4, 'may': 4,
    'jun': 5, 'jul': 6, 'agu': 7, 'aug': 7, 'sep': 8, 'okt': 9, 'oct': 9,
    'nov': 10, 'des': 11, 'dec': 11
  };

  if (strDate.includes('-')) {
    const parts = strDate.replace(/\s+/g, '').split('-');
    if (parts.length === 2) {
      const m = parts[0].toLowerCase();
      let y = parts[1];
      
      if (monthMap[m] !== undefined) {
        const year = y.length === 2 ? parseInt('20' + y) : parseInt(y);
        if (!isNaN(year)) {
          return new Date(Date.UTC(year, monthMap[m], 1));
        }
      }
    }
  }

  // For strings, attempt to parse and force to UTC 00:00:00
  const d = new Date(strDate);
  if (isNaN(d.getTime())) return null;
  
  // Strip time and treat as UTC
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function cleanCurrency(val: any): Prisma.Decimal | null {
  if (val === undefined || val === null || val === '' || val === '-') return null;
  
  let strVal: string;
  if (typeof val === 'number') {
    strVal = val.toString();
  } else {
    // 1. Remove dots (Indonesian thousand separator), spaces, and Rp
    // 2. Convert comma (Indonesian decimal) to dot (system decimal)
    strVal = String(val).replace(/[Rp.\s]/g, '').replace(/,/g, '.');
    if (!strVal || strVal === '.' || strVal === '-') return null;
  }

  try {
    const d = new Prisma.Decimal(strVal);
    return d.isNaN() ? null : d;
  } catch (e) {
    return null;
  }
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
