import { isValid, parseISO } from "date-fns";
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

/**
 * Angka yang diketik atau ditempel orang, jadi angka yang bisa dibaca mesin.
 *
 * Aplikasi ini menulis angka gaya Indonesia - titik ribuan, koma desimal
 * ("1.234.567,89") - jadi itulah bacaan bawaannya: titik dibuang, koma jadi
 * titik desimal. Ketikan di kolom angka selalu gaya ini, karena tampilannya
 * diformat ulang tiap tombol ditekan.
 *
 * Yang ditempel dari Excel bisa bergaya Inggris ("56,981,982" atau
 * "1,234.56"), tergantung setelan mesin pemakainya. Teks seperti itu tidak
 * mungkin angka Indonesia - koma desimal hanya boleh satu, dan tidak ada titik
 * sesudahnya - jadi hanya teks semacam itu yang dibaca gaya Inggris: koma
 * dibuang, titik terakhir jadi desimal. Selain itu bacaannya tidak berubah
 * dari sebelumnya.
 *
 * Dulu tiap koma diganti titik tanpa memeriksa apa pun. "56,981,982" jadi
 * "56.981.982" - tiga titik, bukan angka - dan penyimpanan PPN In/Out gagal
 * dengan galat 500 dari database (24 Sep 2026).
 *
 * Pemisah desimal di ujung dipertahankan ("1," jadi "1."), supaya angka yang
 * sedang diketik tidak terpenggal di tengah jalan.
 */
export function parseAmountInput(val: any): string {
  if (val === undefined || val === null) return '';
  const raw = String(val).trim();
  if (raw === '') return '';

  const negative = raw.includes('-') || (raw.startsWith('(') && raw.endsWith(')'));
  const body = raw.replace(/[^0-9.,]/g, '');
  if (body === '') return negative ? '-' : '';

  const commas = (body.match(/,/g) || []).length;
  const englishStyle = commas > 1 || (commas === 1 && body.lastIndexOf('.') > body.indexOf(','));

  let normalized: string;
  if (englishStyle) {
    // koma = ribuan; titik terakhir (kalau ada) = desimal
    const noCommas = body.replace(/,/g, '');
    const lastDot = noCommas.lastIndexOf('.');
    normalized = lastDot < 0
      ? noCommas
      : noCommas.slice(0, lastDot).replace(/\./g, '') + '.' + noCommas.slice(lastDot + 1);
  } else {
    // titik = ribuan; koma (paling banyak satu) = desimal
    normalized = body.replace(/\./g, '').replace(',', '.');
  }

  const [intRaw, decPart] = normalized.split('.');
  let intPart = intRaw.replace(/^0+(?=\d)/, '');
  if (decPart !== undefined && intPart === '') intPart = '0';
  const out = decPart !== undefined ? `${intPart}.${decPart}` : intPart;
  if (out === '' || out === '.') return negative ? '-' : '';
  return negative ? '-' + out : out;
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

/**
 * Mengubah tanggal yang diketik atau ditempel dari Excel jadi YYYY-MM-DD.
 * Menerima 12/3/2026, 12 Mar 2026, 12-maret-26, 2026-03-12. Kosong kalau tak terbaca.
 */
export function parseSmartDate(value: string): string {
  if (!value) return '';

  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', jun: '06',
    jul: '07', agt: '08', ags: '08', sep: '09', okt: '10', nov: '11', des: '12',
    januari: '01', februari: '02', maret: '03', april: '04', juni: '06',
    juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12',
    may: '05', aug: '08', oct: '10', dec: '12',
    january: '01', february: '02', march: '03', june: '06',
    july: '07', august: '08', october: '10', december: '12'
  };

  // Remove unwanted chars and split
  const parts = value.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);

  if (parts.length === 3) {
    let d = '', m = '', y = '';

    if (parts[0].length === 4) {
      y = parts[0];
      m = parts[1];
      d = parts[2];
    } else {
      d = parts[0];
      m = parts[1];
      y = parts[2];
    }

    if (months[m]) {
      m = months[m];
    } else {
      m = m.padStart(2, '0');
    }

    d = d.padStart(2, '0');

    if (y.length === 2) {
      const year = parseInt(y);
      y = year > 50 ? `19${y}` : `20${y}`;
    }

    const finalDate = `${y}-${m}-${d}`;
    return isValid(parseISO(finalDate)) ? finalDate : '';
  }

  // If it's already YYYY-MM-DD but invalid, clear it
  if (value.match(/^\d{4}-\d{2}-\d{2}$/) && !isValid(parseISO(value))) {
    return '';
  }

  return value.match(/^\d{4}-\d{2}-\d{2}$/) ? value : '';
}
/**
 * Mengubah angka yang ditempel dari Excel (1.234.567,89) jadi bentuk mentah (1234567.89).
 */
export function cleanNumber(val: string): string {
  if (!val || val.trim() === '') return '0';
  let cleaned = val.replace(/\./g, ''); // Remove thousand dots
  cleaned = cleaned.replace(/,/g, '.'); // Convert decimal comma to dot
  const hasMinus = cleaned.startsWith('-');
  cleaned = cleaned.replace(/[^0-9.]/g, ''); // Final safety strip

  if (cleaned.length > 1 && cleaned.startsWith('0') && cleaned[1] !== '.') {
    cleaned = cleaned.replace(/^0+/, '');
    if (cleaned === '' || cleaned.startsWith('.')) {
      cleaned = '0' + cleaned;
    }
  }
  if (hasMinus) cleaned = '-' + cleaned;
  if (cleaned === '-') return '0';
  return cleaned || '0';
}
