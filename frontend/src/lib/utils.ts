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

/** Sel yang seluruh isinya angka atau nominal: "12", "Rp 1.516.305,00", "-Rp 5.000", "(1,234.00)". */
const NUMERIC_CELL = /^\(?\s*-?\s*(?:rp|idr|us\$|usd|\$)?\s*-?\s*\d[\d.,\s]*\)?$/i;

type CellSortKey = { rank: number; num: number; text: string };

function cellSortKey(value: unknown): CellSortKey {
  if (typeof value === 'number') return { rank: 1, num: value, text: String(value) };
  const text = String(value ?? '').trim().replace(/−/g, '-');
  if (text === '' || text === '(Blanks)') return { rank: 0, num: 0, text: '' };
  // "-" adalah nol yang ditampilkan formatCurrency.
  if (text === '-') return { rank: 1, num: 0, text };
  if (NUMERIC_CELL.test(text)) {
    const num = Number(parseAmountInput(text));
    if (!Number.isNaN(num)) return { rank: 1, num, text };
  }
  return { rank: 2, num: 0, text };
}

/**
 * Urutan naik dua nilai sel tabel, untuk sort kolom dan daftar di filter kolom.
 *
 * Nilai dibaca sebagai angka hanya kalau SELURUH isinya angka atau nominal.
 * Dulu huruf dibuang lebih dulu, sehingga "XL Smart Booth DTI-CX 2026 JICC"
 * terbaca −2026 dan terselip di tengah daftar nama, sementara "Rp 2.000.000"
 * tidak dikenali sebagai angka dan kalah dari "Rp 13.000".
 *
 * Urutannya: kosong, lalu angka (menurut nilainya), lalu teks menurut abjad
 * dengan angka di dalamnya dibaca wajar ("Inv 2" sebelum "Inv 10").
 */
export function compareCellValues(a: unknown, b: unknown): number {
  const ka = cellSortKey(a);
  const kb = cellSortKey(b);
  if (ka.rank !== kb.rank) return ka.rank - kb.rank;
  if (ka.rank === 1 && ka.num !== kb.num) return ka.num - kb.num;
  return ka.text.localeCompare(kb.text, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Angka dari state form yang siap dikirim ke server.
 *
 * State form Edit sudah berbentuk mesin ("1234.56") - diisi dari record atau
 * dari `cleanInputAmount`. Bentuk itu dikirim apa adanya. Jangan dilewatkan
 * `parseAmountInput`: fungsi itu membaca TEKS TAMPILAN gaya Indonesia, di
 * mana titik adalah pemisah ribuan, sehingga "1234.56" terbaca 123456.
 * Kesalahan persis itu sempat ada di prod (24 Sep 2026, 7f24851) sebelum
 * ada baris yang terlanjur disunting.
 *
 * Hanya yang belum berbentuk mesin yang dibaca ulang.
 */
export function toSubmitAmount(val: any): string {
  const s = String(val ?? '').trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return s;
  return parseAmountInput(s);
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

/**
 * Angka yang DITEMPEL - dari Excel, Google Sheets, web, atau PDF.
 *
 * Beda dengan ketikan, teks tempelan bisa bergaya Indonesia atau Inggris
 * tergantung setelan mesin sumbernya, jadi bentuknya yang dibaca:
 *
 *   1. Ada titik DAN koma  -> yang terakhir desimal   (1.234,56 / 1,234.56)
 *   2. Satu jenis, berulang -> pemisah ribuan         (56,981,982 / 56.981.982)
 *   3. Satu jenis, sekali, 1-3 angka di depan dan tepat 3 di belakang -> ribuan
 *      (6,500 / 6.500 = 6500; tapi 0,125 dan 1234,567 tetap desimal)
 *   4. Selain itu -> desimal                          (6,5 / 12.75 / 1234.56)
 *
 * Aturan 3 yang membedakannya dari ketikan: "6,500" yang diketik berarti 6,5,
 * tapi yang ditempel hampir pasti 6.500 dari spreadsheet berbahasa Inggris -
 * angka rupiah bertiga desimal praktis tidak ada.
 */
export function parsePastedAmount(val: any): string {
  if (val === undefined || val === null) return '';
  const raw = String(val).trim();
  if (raw === '') return '';

  const negative = raw.includes('-') || (raw.startsWith('(') && raw.endsWith(')'));
  const body = raw.replace(/[^0-9.,]/g, '');
  if (body === '') return '';

  const dots = (body.match(/\./g) || []).length;
  const commas = (body.match(/,/g) || []).length;
  let decimalAt = -1;
  if (dots > 0 && commas > 0) {
    decimalAt = Math.max(body.lastIndexOf('.'), body.lastIndexOf(','));
  } else if (dots + commas === 1) {
    // Ribuan hanya kalau bentuknya memang bisa ribuan: 1-3 angka di depan
    // (bukan diawali 0) dan tepat 3 angka di belakang. "0,125" dan
    // "1234,567" tidak mungkin ribuan, jadi desimal.
    const at = Math.max(body.indexOf('.'), body.indexOf(','));
    const looksGrouped = /^[1-9]\d{0,2}$/.test(body.slice(0, at)) && body.length - at - 1 === 3;
    if (!looksGrouped) decimalAt = at;
  }

  const digitsOnly = (text: string) => text.replace(/[.,]/g, '');
  let intPart = digitsOnly(decimalAt >= 0 ? body.slice(0, decimalAt) : body).replace(/^0+(?=\d)/, '');
  const decPart = decimalAt >= 0 ? digitsOnly(body.slice(decimalAt + 1)) : '';
  if (intPart === '') intPart = '0';
  const out = decPart !== '' ? `${intPart}.${decPart}` : intPart;
  return negative && out !== '0' ? '-' + out : out;
}

/**
 * Tangkap tempelan SATU nilai ke input angka dan baca dengan aturan tempel.
 * Tanpa ini, tempelan satu sel jatuh ke jalur ketik, yang membaca "6,500"
 * sebagai 6,5. Blok banyak sel (ada tab atau baris baru di tengah)
 * dikembalikan null, supaya penangan tempel-tabel yang mengurusnya.
 */
export function singlePastedAmount(e: { clipboardData: DataTransfer; preventDefault: () => void }): string | null {
  const text = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text');
  const trimmed = text.replace(/[\r\n]+$/, '');
  if (/[\t\r\n]/.test(trimmed)) return null;
  e.preventDefault();
  return parsePastedAmount(trimmed);
}

/**
 * Ketikan di kolom angka (form Edit, editor baris Bank Statement).
 * Aturan bacanya ada di `parseAmountInput`. Satu sel "56,981,982" yang
 * ditempel dulu jadi "56.981982" - tersimpan diam-diam sebagai 56,98.
 */
export function cleanInputAmount(val: string) {
  if (!val) return '';
  if (val === '-') return '-';
  return parseAmountInput(val);
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
/**
 * Angka dari baris yang ditempel (Bank Statement). Sel kosong jadi '0'.
 * Aturan bacanya ada di `parsePastedAmount`.
 */
export function cleanNumber(val: string): string {
  const parsed = parsePastedAmount(val);
  return parsed === '' ? '0' : parsed;
}
