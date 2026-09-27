import React, { memo } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatInputAmount, cleanInputAmount, formatCurrency, parseSmartDate, cleanNumber } from '@/lib/utils';

/**
 * Satu baris PPN In/Out yang sedang diketik langsung di tabel (sunting atau sisip).
 *
 * Semua kolom yang bisa diisi ikut, termasuk yang tidak tampil (Sales colF dan
 * Status lama colG dari workbook 2025): menyunting mengirim draf utuh, jadi
 * nilainya tidak boleh hilang hanya karena tidak ada selnya. AP PPN Non WAPU
 * (colO) tidak termasuk - saldo berjalan, dihitung sistem.
 * Nilainya mentah - tanggal YYYY-MM-DD, angka tanpa pemisah ribuan.
 */
export type PpnDraft = {
  colA: string; colB: string; colC: string; colD: string; colE: string;
  colF: string; colG: string; dpp: string; status: string;
  colH: string; colI: string; colJ: string; colK: string;
  colM: string; colN: string;
  colP: string; colQ: string; colR: string; colS: string;
};

export type PpnField = keyof PpnDraft;

export const PPN_FIELDS: PpnField[] = [
  'colA', 'colB', 'colC', 'colD', 'colE', 'colF', 'colG', 'dpp', 'status',
  'colH', 'colI', 'colJ', 'colK', 'colM', 'colN', 'colP', 'colQ', 'colR', 'colS',
];

export const NUMERIC_FIELDS = new Set<PpnField>(['colG', 'dpp', 'colH', 'colI', 'colJ', 'colK', 'colM', 'colN']);

/**
 * Urutan kolom saat menempel dari Excel - sama persis dengan workbook PPN 2026
 * dan form Add Record, A sampai S. `null` memakan posisinya tapi nilainya
 * dibuang: L (BLANK) kosong, dan O (AP PPN Non WAPU) dihitung, bukan diketik.
 */
export const PASTE_FIELDS: (PpnField | null)[] = [
  'colA', 'colB', 'colC', 'colD', 'colE', 'dpp', 'status', 'colH', 'colI', 'colJ',
  'colK', null, 'colM', 'colN', null, 'colP', 'colQ', 'colR', 'colS',
];

export const emptyDraft = (): PpnDraft =>
  Object.fromEntries(PPN_FIELDS.map((f) => [f, ''])) as PpnDraft;

/** Dari baris mentah API ke draf yang bisa disunting. */
export function draftFrom(raw: any): PpnDraft {
  const draft = emptyDraft();
  for (const f of PPN_FIELDS) {
    const v = raw?.[f];
    if (v === null || v === undefined) continue;
    if (f === 'colA') draft[f] = String(v).slice(0, 10);
    else if (NUMERIC_FIELDS.has(f)) draft[f] = Number(v) === 0 ? '' : String(Number(v));
    else draft[f] = String(v);
  }
  return draft;
}

/** Sama dengan syarat form Add Record: Masa, No Faktur, atau Customer/Vendor terisi. */
export const isFilledDraft = (d: PpnDraft) =>
  d.colA.trim() !== '' || d.colC.trim() !== '' || d.colD.trim() !== '';

/**
 * Mengisi satu draf dari satu baris tempelan Excel (dipisah tab), mulai dari
 * kolom tempat kursor berada. Kolom berlebih di kanan dibuang.
 */
export function fillFromPastedLine(draft: PpnDraft, line: string, startField: PpnField): PpnDraft {
  const start = PASTE_FIELDS.indexOf(startField);
  if (start < 0) return draft;
  const next = { ...draft };
  line.split('\t').forEach((cell, ci) => {
    const field = PASTE_FIELDS[start + ci];
    if (!field) return;
    const v = cell.trim();
    next[field] = NUMERIC_FIELDS.has(field) ? cleanNumber(v) : field === 'colA' ? parseSmartDate(v) : v;
  });
  return next;
}

/** Teks tempelan dipecah jadi baris; kosong di ujung (dari Excel) dibuang. */
export const pastedLines = (text: string) => text.split(/\r?\n/).filter((l) => l.trim() !== '');

/** Tempelan satu nilai biasa dibiarkan ke browser; yang berisi tab atau baris baru ditangani sendiri. */
export const isGridPaste = (text: string) => text.includes('\t') || /\r?\n./.test(text);

/** Siap dikirim ke API. Angka sudah mentah; "-" sendirian di kolom angka berarti nol. */
export function draftPayload(d: PpnDraft) {
  const out: Record<string, string> = {};
  for (const f of PPN_FIELDS) out[f] = NUMERIC_FIELDS.has(f) && d[f] === '-' ? '' : d[f];
  return out;
}

/** Saldo AP PPN Non WAPU sesudah sebuah draf: saldo sebelumnya - Non WAPU + Masukan. */
export const saldoAfter = (before: number, d: PpnDraft) => before - Number(d.colM || 0) + Number(d.colN || 0);

export const draftCell = 'p-0 border-r border-primary/10 bg-amber-50/60';
const input =
  'w-full h-9 border-none shadow-none focus-visible:ring-0 bg-transparent text-sm rounded-none px-3 placeholder:text-primary/25 leading-none';

type Props = {
  /** Posisi draf di kelompoknya. Diteruskan ke tiap callback, supaya callback-nya bisa tetap sama antar render. */
  index: number;
  draft: PpnDraft;
  /** Saldo AP PPN Non WAPU sesudah baris ini, dihitung dari nilai drafnya. */
  saldo?: number | null;
  /** Penanda baris untuk navigasi Enter, unik di dalam satu kelompok draf. */
  rowKey: string;
  onChange: (index: number, field: PpnField, value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>, index: number, field: PpnField) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>, index: number, field: PpnField) => void;
  autoFocus?: boolean;
};

/**
 * Sel-sel yang bisa diketik untuk satu baris PPN, sejajar dengan kolom tabel:
 * Masa sampai Sub Ledger-3. AP PPN Non WAPU tampil sebagai saldo hasil hitung,
 * tidak bisa diketik. Sel "No" di depan dan sel aksi di ujung sengaja tidak
 * termasuk - isinya beda antara menyunting dan menyisip.
 *
 * Dibungkus memo: saat menyisip banyak baris, mengetik di satu draf hanya
 * merender draf itu (dan yang saldonya ikut berubah).
 */
export const PpnRowEditor = memo(function PpnRowEditor({
  index, draft, saldo, rowKey, onChange, onKeyDown, onPaste, autoFocus,
}: Props) {
  const bind = (field: PpnField) => ({
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => onKeyDown?.(e, index, field),
    onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => onPaste?.(e, index, field),
    'data-draft-row': rowKey,
    'data-draft-col': field,
  });

  const text = (field: PpnField, placeholder: string, extra = '') => (
    <TableCell className={draftCell}>
      <Input
        value={draft[field]}
        placeholder={placeholder}
        onChange={(e) => onChange(index, field, e.target.value)}
        {...bind(field)}
        className={`${input} ${extra}`}
      />
    </TableCell>
  );

  const amount = (field: PpnField) => (
    <TableCell className={draftCell}>
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
  const parsed = draft.colA ? parseISO(draft.colA) : undefined;
  const picked = parsed && isValid(parsed) ? parsed : undefined;

  return (
    <>
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
                  if (date) onChange(index, 'colA', format(date, 'yyyy-MM-dd'));
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Input
            value={draft.colA}
            placeholder="YYYY-MM-DD"
            autoFocus={autoFocus}
            onChange={(e) => onChange(index, 'colA', e.target.value)}
            // Dirapikan waktu keluar dari sel, supaya "Jan-26" atau 12/3/26 tetap bisa diketik.
            onBlur={(e) => onChange(index, 'colA', e.target.value.trim() === '' ? '' : parseSmartDate(e.target.value))}
            {...bind('colA')}
            className={`${input} pl-0`}
          />
        </div>
      </TableCell>
      {text('colB', 'PPN Type')}
      {text('colC', 'No Faktur', 'font-medium')}
      {text('colD', 'Customer/Vendor')}
      {text('colE', 'Invoice No')}
      {amount('dpp')}
      {text('status', 'Status')}
      {amount('colH')}
      {amount('colI')}
      {amount('colJ')}
      {amount('colK')}
      {amount('colM')}
      {amount('colN')}
      <TableCell className={`${draftCell} text-right pr-4 text-sm font-bold text-primary/40 whitespace-nowrap`}>
        {saldo === null || saldo === undefined ? '—' : formatCurrency(saldo)}
      </TableCell>
      {text('colP', 'Ledger')}
      {text('colQ', 'SL 1')}
      {text('colR', 'SL 2')}
      {text('colS', 'SL 3')}
    </>
  );
});
