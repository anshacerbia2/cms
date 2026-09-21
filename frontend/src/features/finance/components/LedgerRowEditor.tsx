import React from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatInputAmount, cleanInputAmount, formatCurrency, parseSmartDate, cleanNumber } from '@/lib/utils';

/**
 * Satu baris ledger yang sedang diketik, langsung di tabelnya.
 *
 * Nilainya mentah: tanggal YYYY-MM-DD atau kosong, angka tanpa pemisah ribuan.
 * Tanggal boleh kosong - buku non-kas memang tidak memberi tanggal pada
 * sebagian besar barisnya.
 */
export type LedgerDraft = {
  colA: string;
  colB: string;
  colC: string;
  colD: string;
  colF: string;
  colG: string;
  colH: string;
  colI: string;
};

export type DraftField = keyof LedgerDraft;

/** Kolom yang bisa diisi, untuk mengecek draf kosong. */
export const DRAFT_COLUMNS: DraftField[] = ['colA', 'colB', 'colC', 'colD', 'colF', 'colG', 'colH', 'colI'];

/**
 * Urutan kolom saat menempel dari Excel - sama persis dengan sheet-nya dan
 * dengan form create: A tanggal, B deskripsi, C debit, D kredit, E saldo, F-I
 * ledger. Saldo tetap memakan satu posisi walau nilainya dibuang (saldo
 * dihitung, bukan diketik). Tanpa posisi itu, blok yang disalin dari sheet
 * menaruh saldo di kolom Ledger dan menggeser semua kolom sesudahnya.
 */
export const PASTE_COLUMNS: (DraftField | null)[] = [
  'colA', 'colB', 'colC', 'colD', null, 'colF', 'colG', 'colH', 'colI',
];

/**
 * Mengisi satu draf dari satu baris yang ditempel dari Excel (dipisah tab),
 * mulai dari kolom tempat kursor berada. Kolom saldo dilewati tapi tetap
 * memakan posisinya; kolom berlebih di kanan dibuang. Tidak ada yang digeser.
 */
export function fillFromPastedLine(draft: LedgerDraft, line: string, startField: DraftField): LedgerDraft {
  const start = PASTE_COLUMNS.indexOf(startField);
  const next = { ...draft };
  line.split('\t').forEach((raw, ci) => {
    const key = PASTE_COLUMNS[start + ci];
    if (!key) return;
    const v = raw.trim();
    next[key] = key === 'colA' ? parseSmartDate(v) : key === 'colC' || key === 'colD' ? cleanNumber(v) : v;
  });
  return next;
}

/** Teks tempelan dipecah jadi baris; kosong di ujung (dari Excel) dibuang. */
export const pastedLines = (text: string) => text.split(/\r?\n/).filter((l) => l.trim() !== '');

/** Tempelan satu nilai biasa dibiarkan ke browser; yang berisi tab atau baris baru ditangani sendiri. */
export const isGridPaste = (text: string) => text.includes('\t') || /\r?\n./.test(text);

export const emptyDraft = (): LedgerDraft => ({
  colA: '', colB: '', colC: '', colD: '', colF: '', colG: '', colH: '', colI: '',
});

/** Dari baris mentah API ke draf yang bisa disunting. */
export function draftFrom(raw: any): LedgerDraft {
  const amount = (v: any) => (v === null || v === undefined || Number(v) === 0 ? '' : String(Number(v)));
  return {
    colA: raw?.colA ? String(raw.colA).slice(0, 10) : '',
    colB: raw?.colB ?? '',
    colC: amount(raw?.colC),
    colD: amount(raw?.colD),
    colF: raw?.colF ?? '',
    colG: raw?.colG ?? '',
    colH: raw?.colH ?? '',
    colI: raw?.colI ?? '',
  };
}

/** Draf yang tidak diisi sama sekali - dilewati waktu menyimpan, bukan dianggap salah. */
export const isBlankDraft = (d: LedgerDraft) => DRAFT_COLUMNS.every((k) => d[k].trim() === '');

/** Siap dikirim ke API: angka kosong jadi 0, tanggal kosong tetap kosong. */
export function draftPayload(d: LedgerDraft) {
  return {
    colA: d.colA || '',
    colB: d.colB,
    colC: d.colC === '' || d.colC === '-' ? '0' : d.colC,
    colD: d.colD === '' || d.colD === '-' ? '0' : d.colD,
    colF: d.colF,
    colG: d.colG,
    colH: d.colH,
    colI: d.colI,
  };
}

const cell = 'p-0 border-r border-primary/10 bg-amber-50/60';
const input =
  'w-full h-9 border-none shadow-none focus-visible:ring-0 bg-transparent text-sm rounded-none px-3 placeholder:text-primary/25 leading-none';

type Props = {
  draft: LedgerDraft;
  /** Saldo sesudah baris ini, kalau bisa dihitung; kosong berarti belum diketahui. */
  saldo?: string | null;
  /** Penanda baris untuk navigasi Enter, unik di dalam satu kelompok draf. */
  rowKey: string;
  onChange: (field: DraftField, value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>, field: DraftField) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>, field: DraftField) => void;
  autoFocus?: boolean;
};

/**
 * Sel-sel yang bisa diketik untuk satu baris, sejajar dengan kolom tabel ledger:
 * tanggal, deskripsi, debit, kredit, saldo, ledger, sub ledger 1-3. Sel aksi di
 * ujung sengaja tidak termasuk - isinya beda antara menyunting dan menyisip.
 */
export function LedgerRowEditor({ draft, saldo, rowKey, onChange, onKeyDown, onPaste, autoFocus }: Props) {
  // Tanggal yang sedang diketik setengah jadi tidak boleh membuat kalender error.
  const parsed = draft.colA ? parseISO(draft.colA) : undefined;
  const picked = parsed && isValid(parsed) ? parsed : undefined;

  const text = (field: DraftField, placeholder: string, extra = '') => (
    <Input
      value={draft[field]}
      placeholder={placeholder}
      onChange={(e) => onChange(field, e.target.value)}
      onKeyDown={(e) => onKeyDown?.(e, field)}
      onPaste={(e) => onPaste?.(e, field)}
      data-draft-row={rowKey}
      data-draft-col={field}
      className={`${input} ${extra}`}
    />
  );

  const amount = (field: 'colC' | 'colD', tone: string) => (
    <Input
      value={formatInputAmount(draft[field])}
      placeholder="0"
      onChange={(e) => onChange(field, cleanInputAmount(e.target.value))}
      onKeyDown={(e) => onKeyDown?.(e, field)}
      onPaste={(e) => onPaste?.(e, field)}
      data-draft-row={rowKey}
      data-draft-col={field}
      className={`${input} text-right font-bold ${tone}`}
    />
  );

  return (
    <>
      <TableCell className={cell}>
        {/* Sama dengan form create: kalender di kiri, dan tetap bisa diketik. */}
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
                  if (date) onChange('colA', format(date, 'yyyy-MM-dd'));
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Input
            value={draft.colA}
            placeholder="YYYY-MM-DD"
            autoFocus={autoFocus}
            onChange={(e) => onChange('colA', e.target.value)}
            // Dirapikan waktu keluar dari sel, supaya 12/3/26 atau "12 Mar 2026"
            // tetap bisa diketik seperti di form create.
            onBlur={(e) => onChange('colA', e.target.value.trim() === '' ? '' : parseSmartDate(e.target.value))}
            onKeyDown={(e) => onKeyDown?.(e, 'colA')}
            onPaste={(e) => onPaste?.(e, 'colA')}
            data-draft-row={rowKey}
            data-draft-col="colA"
            className={`${input} pl-0`}
          />
        </div>
      </TableCell>
      <TableCell className={cell}>{text('colB', 'Deskripsi...', 'font-medium')}</TableCell>
      <TableCell className={cell}>{amount('colC', 'text-rose-600')}</TableCell>
      <TableCell className={cell}>{amount('colD', 'text-emerald-600')}</TableCell>
      <TableCell className={`${cell} text-right pr-4 text-sm font-bold text-primary/40 whitespace-nowrap`}>
        {saldo ? formatCurrency(saldo) : '—'}
      </TableCell>
      <TableCell className={cell}>{text('colF', 'Ledger')}</TableCell>
      <TableCell className={cell}>{text('colG', 'SL 1')}</TableCell>
      <TableCell className={cell}>{text('colH', 'SL 2')}</TableCell>
      <TableCell className={cell}>{text('colI', 'SL 3')}</TableCell>
    </>
  );
}
