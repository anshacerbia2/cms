import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(val: any, currency = 'IDR') {
  const num = Number(val);
  if (isNaN(num) || num === 0) return "-";
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: currency, 
    minimumFractionDigits: 2 
  }).format(num);
}

export function formatDate(date: any) {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
