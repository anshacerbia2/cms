import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  LedgerRowEditor,
  type LedgerDraft,
  type DraftField,
  emptyDraft,
  draftFrom,
  isBlankDraft,
  fillFromPastedLine,
  pastedLines,
  isGridPaste,
} from './LedgerRowEditor';

/*
 * Draf yang sedang diketik hidup di komponen ini, bukan di halaman.
 *
 * Kalau disimpan di halaman, setiap huruf yang diketik merender ulang seluruh
 * tabel - dan BCA Sahardjo sengaja tidak dipaginasi, jadi itu ratusan baris per
 * ketukan. Di sini yang dirender ulang cuma baris yang sedang diketik.
 */

const actionCell = 'pr-4 bg-amber-50/60';

type EditProps = {
  /** Baris mentah dari API, sebelum diformat untuk tampilan. */
  raw: any;
  saving: boolean;
  onSave: (draft: LedgerDraft) => void;
  onCancel: () => void;
};

/** Baris yang sedang disunting, di tempatnya sendiri. Enter simpan, Esc batal. */
export function InlineEditRow({ raw, saving, onSave, onCancel }: EditProps) {
  const [draft, setDraft] = useState<LedgerDraft>(() => draftFrom(raw));
  // Nilai terbaru untuk handler keyboard. Menyimpan dari dalam updater setState
  // akan menyimpan dua kali, karena React boleh memanggil updater lebih dari sekali.
  const latest = useRef(draft);
  latest.current = draft;

  const onChange = useCallback(
    (_: number, field: DraftField, value: string) => setDraft((d) => ({ ...d, [field]: value })),
    [],
  );

  // Saldo sesudah baris ini, dihitung ulang dari nilai barunya.
  const saldo = useMemo(() => {
    if (!raw) return null;
    const before = Number(raw.colE || 0) - Number(raw.colD || 0) + Number(raw.colC || 0);
    return String(before - Number(draft.colC || 0) + Number(draft.colD || 0));
  }, [raw, draft.colC, draft.colD]);

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
  const onPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>, _: number, field: DraftField) => {
    const text = e.clipboardData.getData('text/plain');
    if (!isGridPaste(text)) return;
    e.preventDefault();
    const lines = pastedLines(text);
    if (lines.length === 0) return;
    setDraft((d) => fillFromPastedLine(d, lines[0], field));
    if (lines.length > 1) {
      toast.info(`Baris pertama dipakai. ${lines.length - 1} baris lainnya: pakai tombol sisip untuk menempel banyak baris.`);
    }
  }, []);

  return (
    <TableRow className="whitespace-nowrap">
      <LedgerRowEditor
        index={0}
        draft={draft}
        saldo={saldo}
        rowKey="edit"
        autoFocus
        onChange={onChange}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
      />
      <TableCell className={actionCell}>
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="Simpan (Enter)"
            disabled={saving}
            className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 rounded-sm"
            onClick={() => onSave(draft)}
          >
            <Check size={14} strokeWidth={2.5} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Batal (Esc)"
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
  /** Saldo baris tempat menyisip; saldo tiap draf berjalan dari sini. */
  anchorSaldo: number;
  saving: boolean;
  /** Menerima draf yang sudah diisi dan lolos pemeriksaan, siap dikirim. */
  onSave: (drafts: LedgerDraft[]) => void;
  onCancel: () => void;
};

const focusCell = (rowKey: string, field: DraftField) =>
  setTimeout(() => {
    const el = document.querySelector<HTMLInputElement>(
      `input[data-draft-row="${rowKey}"][data-draft-col="${field}"]`,
    );
    el?.focus();
    el?.select();
  }, 30);

/** Draf yang disisipkan di bawah satu baris, sebanyak apa pun, plus baris tombolnya. */
export function InlineInsertRows({ anchorSaldo, saving, onSave, onCancel }: InsertProps) {
  const [drafts, setDrafts] = useState<LedgerDraft[]>(() => [emptyDraft()]);
  const latest = useRef(drafts);
  latest.current = drafts;

  const saldos = useMemo(() => {
    let running = anchorSaldo;
    return drafts.map((d) => {
      running = running - Number(d.colC || 0) + Number(d.colD || 0);
      return String(running);
    });
  }, [anchorSaldo, drafts]);

  const filledCount = useMemo(() => drafts.filter((d) => !isBlankDraft(d)).length, [drafts]);

  const submit = useCallback(() => {
    const filled = latest.current.filter((d) => !isBlankDraft(d));
    // Sama dengan form create: butuh deskripsi dan nominal. Tanggal tidak wajib,
    // dan tidak harus di tahun yang sama - buku non-kas punya ribuan baris tanpa
    // tanggal dan ratusan yang bertanggal tahun berikutnya.
    const incomplete = filled.findIndex(
      (d) => d.colB.trim() === '' || (Number(d.colC || 0) === 0 && Number(d.colD || 0) === 0),
    );
    if (filled.length === 0) toast.error('Belum ada baris yang diisi.');
    else if (incomplete >= 0) toast.error(`Baris ${incomplete + 1}: deskripsi dan nominal (debit atau kredit) wajib diisi.`);
    else onSave(filled);
  }, [onSave]);

  const onChange = useCallback(
    (index: number, field: DraftField, value: string) =>
      setDrafts((all) => all.map((d, i) => (i === index ? { ...d, [field]: value } : d))),
    [],
  );

  /** Enter turun ke baris berikutnya, dan menambah baris kalau sudah di paling bawah - seperti form create. */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, index: number, field: DraftField) => {
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
  const onPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>, index: number, field: DraftField) => {
    const text = e.clipboardData.getData('text/plain');
    if (!isGridPaste(text)) return; // satu nilai: biarkan tempel biasa
    e.preventDefault();
    const lines = pastedLines(text);
    setDrafts((all) => {
      const next = [...all];
      lines.forEach((line, li) => {
        const at = index + li;
        while (next.length <= at) next.push(emptyDraft());
        next[at] = fillFromPastedLine(next[at], line, field);
      });
      return next;
    });
    toast.success(`${lines.length} baris ditempel dari Excel.`);
  }, []);

  return (
    <>
      {drafts.map((draft, i) => (
        <TableRow key={`ins-${i}`} className="whitespace-nowrap">
          <LedgerRowEditor
            index={i}
            draft={draft}
            saldo={saldos[i]}
            rowKey={`ins-${i}`}
            autoFocus={i === 0 && drafts.length === 1}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
          />
          <TableCell className={actionCell}>
            <div className="flex items-center justify-end">
              {drafts.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Buang baris ini"
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
        <TableCell colSpan={10} className="py-2 px-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-[11px] font-bold gap-1"
              onClick={() => setDrafts((all) => [...all, emptyDraft()])}
            >
              <Plus size={12} /> Tambah baris
            </Button>
            <Button size="sm" disabled={saving} className="h-8 rounded-lg text-[11px] font-bold gap-1" onClick={submit}>
              <Check size={12} />
              {saving ? 'Menyimpan...' : `Simpan ${filledCount} baris`}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={saving}
              className="h-8 rounded-lg text-[11px] font-bold"
              onClick={onCancel}
            >
              Batal
            </Button>
            <span className="text-[11px] text-muted-foreground ml-2">
              Enter = baris baru · Ctrl+Enter = simpan · Esc = batal · bisa tempel dari Excel
            </span>
          </div>
        </TableCell>
      </TableRow>
    </>
  );
}
