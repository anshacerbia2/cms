import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(val: any, currency = 'IDR') {
  if (val === undefined || val === null) return "-";
  
  // Convert to number for Intl.NumberFormat, but handle Decimal if present
  const num = typeof val.toNumber === 'function' ? val.toNumber() : Number(val);
  
  if (isNaN(num)) return "-";
  if (num === 0) return `${currency} 0,00`; 

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
