import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Decimal } from "decimal.js";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(val: any, currency = 'IDR', showDashForZero = true) {
  if (val === undefined || val === null) return "-";
  
  // Convert to number for Intl.NumberFormat, but handle Decimal if present
  const num = typeof val.toNumber === 'function' ? val.toNumber() : Number(val);
  
  if (isNaN(num)) return "-";
  if (num === 0 && showDashForZero) return "-";

  return new Intl.NumberFormat('id-ID', { 
    style: 'currency',
    currency: currency,
    currencyDisplay: 'code',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num).replace(/\u00A0/, ' '); // Ensure space after currency symbol
}

export function formatDate(date: any) {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function cleanAmount(val: any) {
  const s = String(val || "0");
  if (s === "-" || s === "") return "0";
  // Remove currency codes (e.g., IDR)
  let cleaned = s.replace(/[A-Z]{3}\s?/g, "");
  // Remove thousand separators (dots in ID locale)
  cleaned = cleaned.replace(/\./g, "");
  // Replace decimal comma with dot
  cleaned = cleaned.replace(/,/g, ".");
  // Sanitize to keep only numbers, dots, and minus signs
  return cleaned.replace(/[^0-9.-]+/g, "") || "0";
}

export function getAmountColor(val: any, showEmerald = true) {
  try {
    const num = new Decimal(cleanAmount(val));
    if (num.gt(0)) return showEmerald ? "text-emerald-600" : "";
    if (num.lt(0)) return "text-rose-600";
    return "";
  } catch (e) {
    return "";
  }
}

export function formatInputAmount(val: string | number) {
  if (val === undefined || val === null || val === '') return '';
  let str = val.toString();
  const isNegative = str.startsWith('-');
  if (isNegative) str = str.slice(1);

  const [int, dec] = str.split('.');
  const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const result = dec !== undefined ? `${formattedInt},${dec}` : formattedInt;
  return isNegative ? `-${result}` : result;
}

export function cleanInputAmount(val: string) {
  if (!val) return '';
  if (val === '-') return '-';
  
  const isNegative = val.startsWith('-');
  let cleaned = val.replace(/[^0-9,.]/g, '');
  
  cleaned = cleaned.replace(/\./g, ''); // Remove dots
  cleaned = cleaned.replace(/,/g, '.'); // Convert comma to dot
  
  // Ensure only one dot
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = parts[0] + "." + parts.slice(1).join("");
  }
  
  // Handle leading dot
  if (cleaned.startsWith('.')) cleaned = '0' + cleaned;
  
  // Trim leading zeros (e.g. "05" -> "5", but "0.5" stays "0.5")
  if (cleaned.length > 1 && cleaned.startsWith('0') && cleaned[1] !== '.') {
    cleaned = cleaned.replace(/^0+/, '');
    if (cleaned === '' || cleaned.startsWith('.')) cleaned = '0' + cleaned;
  }
  
  return isNegative ? `-${cleaned}` : cleaned;
}
