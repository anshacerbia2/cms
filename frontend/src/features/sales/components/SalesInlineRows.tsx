import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { parsePastedAmount } from '@/lib/utils';
import type { AccountColumn } from '@/features/finance/hooks/useAccountColumns';
import {
  SalesRowEditor,
  type SalesDraft,
  type SalesField,
  NUMERIC_FIELDS,
  emptyDraft,
  draftFrom,
  isFilledDraft,
  fillFromPastedLine,
  pastedLines,
  isGridPaste,
} from './SalesRowEditor';
import { formatRowNo, rowNoCell } from './SalesDisplayRow';

/*
 * Draf yang sedang diketik hidup di komponen ini, bukan di halaman.
 *
 * Kalau disimpan di halaman, setiap huruf yang diketik merender ulang seluruh
 * tabel Sales. Di sini yang dirender ulang cuma baris yang sedang diketik.
 */

const actionCell = 'px-4 bg-amber-50/60';
const draftNoCell = `${rowNoCell} bg-amber-50/60`;

type EditProps = {
  /** Baris mentah dari API, sebelum diformat untuk tampilan. */
  raw: any;
  accountColumns: AccountColumn[];
  saving: boolean;
  onSave: (draft: SalesDraft) => void;
  onCancel: () => void;
};

/** Baris yang sedang disunting, di tempatnya sendiri. Enter simpan, Esc batal. */
export function SalesInlineEditRow({ raw, accountColumns, saving, onSave, onCancel }: EditProps) {
  const [draft, setDraft] = useState<SalesDraft>(() => draftFrom(raw));
  // Nilai terbaru untuk handler keyboard. Menyimpan dari dalam updater setState
  // akan menyimpan dua kali, karena React boleh memanggil updater lebih dari sekali.
  const latest = useRef(draft);
  latest.current = draft;

  const onChange = useCallback(
    (_: number, field: SalesField, value: string) => setDraft((d) => ({ ...d, [field]: value })),
    [],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') return onCancel();
      if (e.key === 'Enter') {
        e.preventDefault();
        onSave(latest.current);
      }
    },
    [onCancel, onSave],
  );

  // Satu baris saja; sisanya disebutkan, tidak diam-diam dibuang.
  const onPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>, _: number, field: SalesField) => {
    const text = e.clipboardData.getData('text/plain');
    if (!isGridPaste(text)) {
      // Satu nilai ke kolom angka: aturan tempel, bukan aturan ketik ("6,500" = 6500).
      if (NUMERIC_FIELDS.has(field)) {
        e.preventDefault();
        const v = parsePastedAmount(text);
        setDraft((d) => ({ ...d, [field]: v }));
      }
      return;
    }
    e.preventDefault();
    const lines = pastedLines(text);
    if (lines.length === 0) return;
    setDraft(fillFromPastedLine(latest.current, lines[0], field));
    if (lines.length > 1) {
      toast.info(`Only the first row was used. To paste the other ${lines.length - 1} row(s), use the insert button.`);
    }
  }, []);

  return (
    <TableRow className="whitespace-nowrap">
      <TableCell className={draftNoCell}>{formatRowNo(raw?.rowNo)}</TableCell>
      <SalesRowEditor
        index={0}
        draft={draft}
        rowKey="edit"
        accountColumns={accountColumns}
        autoFocus
        onChange={onChange}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
      />
      <TableCell className={actionCell}>
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="Save (Enter)"
            disabled={saving}
            className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 rounded-sm"
            onClick={() => onSave(latest.current)}
          >
            <Check size={14} strokeWidth={2.5} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Cancel (Esc)"
            disabled={saving}
            className="h-7 w-7 text-primary/40 hover:text-primary hover:bg-primary/5 rounded-sm"
            onClick={onCancel}
          >
            <X size={14} strokeWidth={2.5} />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

type InsertProps = {
  accountColumns: AccountColumn[];
  /** row_no baris tempat menyisip; draf diberi nomor lanjutannya. 0 = menyisip paling atas. */
  anchorRowNo?: number | null;
  /** Jumlah kolom tabel, untuk baris tombol di bawah draf. */
  colSpan: number;
  saving: boolean;
  /** Menerima draf yang sudah diisi, siap dikirim. */
  onSave: (drafts: SalesDraft[]) => void;
  onCancel: () => void;
};

const focusCell = (rowKey: string, field: SalesField) =>
  setTimeout(() => {
    const el = document.querySelector<HTMLInputElement>(
      `input[data-draft-row="${rowKey}"][data-draft-col="${field}"]`,
    );
    el?.focus();
    el?.select();
  }, 30);

/** Draf yang disisipkan di bawah satu baris, sebanyak apa pun, plus baris tombolnya. */
export function SalesInlineInsertRows({ accountColumns, anchorRowNo, colSpan, saving, onSave, onCancel }: InsertProps) {
  const [drafts, setDrafts] = useState<SalesDraft[]>(() => [emptyDraft()]);
  const latest = useRef(drafts);
  latest.current = drafts;

  const filledCount = useMemo(() => drafts.filter(isFilledDraft).length, [drafts]);

  const submit = useCallback(() => {
    // Sama dengan form Add Record: baris yang Invoice No, Description, dan Basic
    // Price-nya kosong dilewati. Baris cadangan cukup diberi "-" di Invoice No.
    const filled = latest.current.filter(isFilledDraft);
    if (filled.length === 0) toast.error('No rows filled in yet. Type "-" in Invoice No to keep a reserved row.');
    else onSave(filled);
  }, [onSave]);

  const onChange = useCallback(
    (index: number, field: SalesField, value: string) =>
      setDrafts((all) => all.map((d, i) => (i === index ? { ...d, [field]: value } : d))),
    [],
  );

  /** Enter turun ke baris berikutnya, dan menambah baris kalau sudah di paling bawah - seperti form Add. */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, index: number, field: SalesField) => {
      if (e.key === 'Escape') return onCancel();
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) return submit();
      setDrafts((all) => (index === all.length - 1 ? [...all, emptyDraft()] : all));
      focusCell(`ins-${index + 1}`, field);
    },
    [onCancel, submit],
  );

  /** Menempel blok dari Excel: tiap baris jadi satu draf, mulai dari sel yang sedang aktif. */
  const onPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>, index: number, field: SalesField) => {
    const text = e.clipboardData.getData('text/plain');
    if (!isGridPaste(text)) {
      if (NUMERIC_FIELDS.has(field)) {
        e.preventDefault();
        const v = parsePastedAmount(text);
        setDrafts((all) => all.map((d, i) => (i === index ? { ...d, [field]: v } : d)));
      }
      return; // nilai teks: biarkan tempel biasa
    }
    e.preventDefault();
    const lines = pastedLines(text);
    const next = [...latest.current];
    lines.forEach((line, li) => {
      const at = index + li;
      while (next.length <= at) next.push(emptyDraft());
      next[at] = fillFromPastedLine(next[at], line, field);
    });
    setDrafts(next);
    toast.success(`${lines.length} row(s) pasted from Excel.`);
  }, []);

  return (
    <>
      {drafts.map((draft, i) => (
        <TableRow key={`ins-${i}`} className="whitespace-nowrap">
          {/* Nomor yang akan didapat setelah disimpan: lanjutan baris di atasnya. */}
          <TableCell className={draftNoCell}>{anchorRowNo === null || anchorRowNo === undefined ? '-' : formatRowNo(anchorRowNo + i + 1)}</TableCell>
          <SalesRowEditor
            index={i}
            draft={draft}
            rowKey={`ins-${i}`}
            accountColumns={accountColumns}
            autoFocus={i === 0 && drafts.length === 1}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
          />
          <TableCell className={actionCell}>
            <div className="flex items-center justify-center">
              {drafts.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Remove this row"
                  className="h-7 w-7 text-rose-500/50 hover:text-rose-600 hover:bg-rose-50 rounded-sm"
                  onClick={() => setDrafts((all) => all.filter((_, j) => j !== i))}
                >
                  <X size={12} strokeWidth={2.5} />
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      ))}
      <TableRow className="bg-amber-50/40 hover:bg-amber-50/40">
        <TableCell colSpan={colSpan} className="py-2 px-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-[11px] font-bold gap-1"
              onClick={() => setDrafts((all) => [...all, emptyDraft()])}
            >
              <Plus size={12} /> Add Row
            </Button>
            <Button size="sm" disabled={saving} className="h-8 rounded-lg text-[11px] font-bold gap-1" onClick={submit}>
              <Check size={12} />
              {saving ? 'Saving...' : `Save ${filledCount} Row(s)`}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={saving}
              className="h-8 rounded-lg text-[11px] font-bold"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <span className="text-[11px] text-muted-foreground ml-2">
              Enter = new row · Ctrl+Enter = save · Esc = cancel · paste from Excel supported · "-" in Invoice No keeps a reserved row
            </span>
          </div>
        </TableCell>
      </TableRow>
    </>
  );
}
