import React, { memo } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatInputAmount, cleanInputAmount, parseSmartDate, cleanNumber } from '@/lib/utils';
import type { AccountColumn } from '@/features/finance/hooks/useAccountColumns';

/**
 * Satu baris Sales yang sedang diketik langsung di tabel (sunting atau sisip).
 *
 * Semua kolom tabel ikut, termasuk yang tidak tampil (colA "No" dari workbook,
 * colL tanggal terima, dan rekening yang belum dipakai tahun itu): menyunting
 * mengirim draf utuh, jadi nilainya tidak boleh hilang hanya karena tidak ada
 * selnya. Nilainya mentah - tanggal YYYY-MM-DD, angka tanpa pemisah ribuan.
 */
export type SalesDraft = {
  colA: string; colB: string; colC: string; colD: string; colE: string;
  colF: string; colG: string; colH: string; colI: string; colJ: string;
  colK: string; colL: string; colM: string; colN: string; colO: string;
  colP: string; colQ: string; colR: string; colS: string; colT: string;
  colU: string; colV: string; colW: string; colX: string; colZ: string;
  colAA: string; colAB: string; colAC: string; colAD: string;
};

export type SalesField = keyof SalesDraft;

export const SALES_FIELDS: SalesField[] = [
  'colA', 'colB', 'colC', 'colD', 'colE', 'colF', 'colG', 'colH', 'colI', 'colJ',
  'colK', 'colL', 'colM', 'colN', 'colO', 'colP', 'colQ', 'colR', 'colS', 'colT',
  'colU', 'colV', 'colW', 'colX', 'colZ', 'colAA', 'colAB', 'colAC', 'colAD',
];

export const NUMERIC_FIELDS = new Set<SalesField>([
  'colH', 'colI', 'colJ', 'colK', 'colM', 'colN', 'colO', 'colP', 'colQ', 'colR',
  'colS', 'colT', 'colU', 'colV', 'colW', 'colX', 'colZ', 'colAA', 'colAB', 'colAC',
]);

const DATE_FIELDS = new Set<SalesField>(['colC', 'colL']);

/**
 * Urutan kolom saat menempel dari Excel - sama persis dengan form Add Record,
 * supaya blok yang sama bisa ditempel di keduanya: mulai Invoice No, semua
 * rekening colM..colW di posisi tetapnya, sampai Remarks.
 */
export const PASTE_FIELDS: SalesField[] = [
  'colB', 'colC', 'colD', 'colE', 'colF', 'colG', 'colH', 'colI', 'colJ',
  'colK', 'colM', 'colN', 'colO', 'colP', 'colQ', 'colR', 'colS', 'colT',
  'colU', 'colV', 'colW', 'colX', 'colZ', 'colAA', 'colAB', 'colAC', 'colAD',
];

/**
 * Kolom tetap tempat uang tiap rekening disimpan - cermin SALES_RECORD_COLUMNS
 * di backend, yang membangun rincian per rekening dari kolom-kolom ini.
 * Tabel menampilkan rekening menurut id-nya; menyunting menulis kolomnya.
 */
export const ACCOUNT_FIELD_BY_NAME: Record<string, SalesField> = {
  'BCA Sahardjo': 'colM',
  'BCA Juanda': 'colN',
  'Mandiri Mid Plaza': 'colO',
  'Mandiri Plasa Mandiri': 'colP',
  'BRI Tebet': 'colQ',
  'BRI Sahardjo': 'colR',
  BTN: 'colS',
  'Bank Raya': 'colT',
  BNI: 'colU',
  'Cash IDR': 'colV',
  'Non CB': 'colW',
};

export const emptyDraft = (): SalesDraft =>
  Object.fromEntries(SALES_FIELDS.map((f) => [f, ''])) as SalesDraft;

/** Dari baris mentah API ke draf yang bisa disunting. */
export function draftFrom(raw: any): SalesDraft {
  const draft = emptyDraft();
  for (const f of SALES_FIELDS) {
    const v = raw?.[f];
    if (v === null || v === undefined) continue;
    if (DATE_FIELDS.has(f)) draft[f] = String(v).slice(0, 10);
    else if (NUMERIC_FIELDS.has(f)) draft[f] = Number(v) === 0 ? '' : String(Number(v));
    else draft[f] = String(v);
  }
  return draft;
}

/** Sama dengan syarat form Add Record: Invoice No, Description, atau Basic Price terisi. */
export const isFilledDraft = (d: SalesDraft) =>
  d.colB.trim() !== '' || d.colG.trim() !== '' || d.colH.trim() !== '';

/** Nilai satu sel yang ditempel, dibaca menurut jenis kolomnya - sama dengan form Add Record. */
function pastedValue(field: SalesField, raw: string): string {
  const v = raw.trim();
  if (NUMERIC_FIELDS.has(field)) return cleanNumber(v);
  if (DATE_FIELDS.has(field)) return parseSmartDate(v);
  if (field === 'colD') return v.replace(/[^0-9]/g, '');
  return v;
}

/**
 * Mengisi satu draf dari satu baris tempelan Excel (dipisah tab), mulai dari
 * kolom tempat kursor berada. Kolom berlebih di kanan dibuang.
 */
export function fillFromPastedLine(draft: SalesDraft, line: string, startField: SalesField): SalesDraft {
  const start = PASTE_FIELDS.indexOf(startField);
  if (start < 0) return draft;
  const next = { ...draft };
  line.split('\t').forEach((cell, ci) => {
    const field = PASTE_FIELDS[start + ci];
    if (field) next[field] = pastedValue(field, cell);
  });
  return next;
}

/** Teks tempelan dipecah jadi baris; kosong di ujung (dari Excel) dibuang. */
export const pastedLines = (text: string) => text.split(/\r?\n/).filter((l) => l.trim() !== '');

/** Tempelan satu nilai biasa dibiarkan ke browser; yang berisi tab atau baris baru ditangani sendiri. */
export const isGridPaste = (text: string) => text.includes('\t') || /\r?\n./.test(text);

/** Siap dikirim ke API. Angka sudah mentah; "-" sendirian di kolom angka berarti nol. */
export function draftPayload(d: SalesDraft) {
  const out: Record<string, string> = {};
  for (const f of SALES_FIELDS) {
    out[f] = NUMERIC_FIELDS.has(f) && d[f] === '-' ? '' : d[f];
  }
  return out;
}


export const draftCell = 'p-0 border-r border-primary/10 bg-amber-50/60';
const input =
  'w-full h-9 border-none shadow-none focus-visible:ring-0 bg-transparent text-sm rounded-none px-3 placeholder:text-primary/25 leading-none';

type Props = {
  /** Posisi draf di kelompoknya. Diteruskan ke tiap callback, supaya callback-nya bisa tetap sama antar render. */
  index: number;
  draft: SalesDraft;
  /** Penanda baris untuk navigasi Enter, unik di dalam satu kelompok draf. */
  rowKey: string;
  /** Rekening yang tampil di tabel tahun ini - selnya harus sejajar dengan kolomnya. */
  accountColumns: AccountColumn[];
  onChange: (index: number, field: SalesField, value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>, index: number, field: SalesField) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>, index: number, field: SalesField) => void;
  autoFocus?: boolean;
};

/**
 * Sel-sel yang bisa diketik untuk satu baris Sales, sejajar dengan kolom tabel:
 * Invoice No sampai Remarks, termasuk kolom rekening yang tampil tahun itu.
 * Sel "No" di depan dan sel aksi di ujung sengaja tidak termasuk - isinya beda
 * antara menyunting dan menyisip.
 *
 * Dibungkus memo: saat menyisip banyak baris, mengetik di satu draf hanya
 * merender draf itu.
 */
export const SalesRowEditor = memo(function SalesRowEditor({
  index, draft, rowKey, accountColumns, onChange, onKeyDown, onPaste, autoFocus,
}: Props) {
  const bind = (field: SalesField) => ({
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => onKeyDown?.(e, index, field),
    onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => onPaste?.(e, index, field),
    'data-draft-row': rowKey,
    'data-draft-col': field,
  });

  const text = (field: SalesField, placeholder: string, extra = '', focus = false) => (
    <TableCell className={draftCell}>
      <Input
        value={draft[field]}
        placeholder={placeholder}
        autoFocus={focus}
        onChange={(e) => onChange(index, field, e.target.value)}
        {...bind(field)}
        className={`${input} ${extra}`}
      />
    </TableCell>
  );

  const amount = (field: SalesField, key?: string) => (
    <TableCell key={key} className={draftCell}>
      <Input
        value={formatInputAmount(draft[field])}
        placeholder="0"
        onChange={(e) => onChange(index, field, cleanInputAmount(e.target.value))}
        {...bind(field)}
        className={`${input} text-right font-bold`}
      />
    </TableCell>
  );

  // Tanggal yang sedang diketik setengah jadi tidak boleh membuat kalender error.
  const parsed = draft.colC ? parseISO(draft.colC) : undefined;
  const picked = parsed && isValid(parsed) ? parsed : undefined;

  return (
    <>
      {text('colB', 'Invoice No', 'font-medium', autoFocus)}
      <TableCell className={draftCell}>
        {/* Sama dengan form Add: kalender di kiri, dan tetap bisa diketik. */}
        <div className="flex items-center w-full h-full">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                tabIndex={-1}
                className="h-9 w-8 shrink-0 bg-transparent hover:bg-transparent text-primary/30 hover:text-primary transition-colors rounded-none cursor-pointer"
              >
                <CalendarIcon size={14} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 overflow-hidden" align="start">
              <Calendar
                mode="single"
                selected={picked}
                defaultMonth={picked}
                onSelect={(date) => {
                  if (date) onChange(index, 'colC', format(date, 'yyyy-MM-dd'));
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Input
            value={draft.colC}
            placeholder="YYYY-MM-DD"
            onChange={(e) => onChange(index, 'colC', e.target.value)}
            // Dirapikan waktu keluar dari sel, supaya 12/3/26 atau "12 Mar 2026" tetap bisa diketik.
            onBlur={(e) => onChange(index, 'colC', e.target.value.trim() === '' ? '' : parseSmartDate(e.target.value))}
            {...bind('colC')}
            className={`${input} pl-0`}
          />
        </div>
      </TableCell>
      <TableCell className={draftCell}>
        <Input
          value={draft.colD}
          placeholder="Year"
          inputMode="numeric"
          onChange={(e) => onChange(index, 'colD', e.target.value.replace(/[^0-9]/g, ''))}
          {...bind('colD')}
          className={input}
        />
      </TableCell>
      {text('colE', 'Billing To')}
      {text('colF', 'Sales Code')}
      {text('colG', 'Description')}
      {amount('colH')}
      {amount('colI')}
      {amount('colJ')}
      {amount('colK')}
      {accountColumns.map((account) => {
        const field = ACCOUNT_FIELD_BY_NAME[account.name];
        // Rekening tanpa kolom tetap di Sales tidak bisa diisi dari sini.
        return field ? amount(field, `acct-${account.id}`) : <TableCell key={`acct-${account.id}`} className={draftCell} />;
      })}
      {amount('colX')}
      {amount('colZ')}
      {amount('colAA')}
      {amount('colAB')}
      {amount('colAC')}
      {text('colAD', 'Remarks')}
    </>
  );
});
