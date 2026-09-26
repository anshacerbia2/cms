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
import { formatRowNo, rowNoCell } from './LedgerDisplayRow';
import { type LedgerMaster, canonicalLedger, ledgerProblem, withLedger } from '../hooks/useLedgers';
import { parsePastedAmount } from '@/lib/utils';

/** Draf setelah satu sel berubah. Mengganti Ledger mengosongkan SL1 yang bukan miliknya. */
const changed = (d: LedgerDraft, field: DraftField, value: string, master: LedgerMaster | null) =>
  field === 'colF' ? withLedger(d, value, master) : { ...d, [field]: value };

/** Ledger yang ditempel dari Excel tapi tidak ada di master, untuk disebutkan - tidak dibuang diam-diam. */
function warnUnknownLedgers(drafts: LedgerDraft[], master: LedgerMaster | null) {
  const problems = drafts.map((d) => ledgerProblem(d, master)).filter(Boolean);
  if (problems.length > 0) {
    toast.warning(`${problems.length} row(s): Ledger / Sub Ledger 1 not in the master list (marked red). ${problems[0]}`);
  }
}

/** Nomor baris pertama yang Ledger/SL1-nya tidak ada di master, beserta alasannya. */
function firstLedgerProblem(drafts: LedgerDraft[], master: LedgerMaster | null) {
  for (const [i, d] of drafts.entries()) {
    const problem = ledgerProblem(d, master);
    if (problem) return `Row ${i + 1}: ${problem}`;
  }
  return null;
}

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
  master: LedgerMaster | null;
  /** Kolom "No" ditampilkan (Non CB) - baris ini ikut mengisi selnya. */
  showRowNo?: boolean;
  saving: boolean;
  onSave: (draft: LedgerDraft) => void;
  onCancel: () => void;
};

/** Baris yang sedang disunting, di tempatnya sendiri. Enter simpan, Esc batal. */
export function InlineEditRow({ raw, master, showRowNo, saving, onSave, onCancel }: EditProps) {
  const [draft, setDraft] = useState<LedgerDraft>(() => draftFrom(raw));
  // Nilai terbaru untuk handler keyboard. Menyimpan dari dalam updater setState
  // akan menyimpan dua kali, karena React boleh memanggil updater lebih dari sekali.
  const latest = useRef(draft);
  latest.current = draft;

  const onChange = useCallback(
    (_: number, field: DraftField, value: string) => setDraft((d) => changed(d, field, value, master)),
    [master],
  );

  const save = useCallback(
    (d: LedgerDraft) => {
      const problem = ledgerProblem(d, master);
      if (problem) toast.error(problem);
      else onSave(d);
    },
    [master, onSave],
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
        save(latest.current);
      }
    },
    [onCancel, save],
  );

  // Satu baris saja; sisanya disebutkan, tidak diam-diam dibuang.
  const onPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>, _: number, field: DraftField) => {
    const text = e.clipboardData.getData('text/plain');
    if (!isGridPaste(text)) {
      // Satu nilai ke Debit/Kredit: aturan tempel, bukan aturan ketik.
      if (field === 'colC' || field === 'colD') {
        e.preventDefault();
        const v = parsePastedAmount(text);
        setDraft((d) => changed(d, field, v, master));
      }
      return;
    }
    e.preventDefault();
    const lines = pastedLines(text);
    if (lines.length === 0) return;
    const next = canonicalLedger(fillFromPastedLine(latest.current, lines[0], field), master);
    setDraft(next);
    warnUnknownLedgers([next], master);
    if (lines.length > 1) {
      toast.info(`Only the first row was used. To paste the other ${lines.length - 1} row(s), use the insert button.`);
    }
  }, [master]);

  return (
    <TableRow className="whitespace-nowrap">
      {showRowNo && <TableCell className={`${rowNoCell} bg-amber-50/60`}>{formatRowNo(raw?.rowNo)}</TableCell>}
      <LedgerRowEditor
        index={0}
        draft={draft}
        saldo={saldo}
        rowKey="edit"
        master={master}
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
            title="Save (Enter)"
            disabled={saving}
            className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 rounded-sm"
            onClick={() => save(draft)}
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
  /** Saldo baris tempat menyisip; saldo tiap draf berjalan dari sini. */
  anchorSaldo: number;
  master: LedgerMaster | null;
  /** Kolom "No" ditampilkan (Non CB). */
  showRowNo?: boolean;
  /** row_no baris tempat menyisip; draf diberi nomor lanjutannya. */
  anchorRowNo?: number | null;
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
export function InlineInsertRows({ anchorSaldo, master, showRowNo, anchorRowNo, saving, onSave, onCancel }: InsertProps) {
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
    const ledgerIssue = firstLedgerProblem(filled, master);
    if (filled.length === 0) toast.error('No rows filled in yet.');
    else if (incomplete >= 0) toast.error(`Row ${incomplete + 1}: a description and an amount (debit or credit) are required.`);
    else if (ledgerIssue) toast.error(ledgerIssue);
    else onSave(filled);
  }, [master, onSave]);

  const onChange = useCallback(
    (index: number, field: DraftField, value: string) =>
      setDrafts((all) => all.map((d, i) => (i === index ? changed(d, field, value, master) : d))),
    [master],
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
    if (!isGridPaste(text)) {
      // Satu nilai ke Debit/Kredit: aturan tempel, bukan aturan ketik.
      if (field === 'colC' || field === 'colD') {
        e.preventDefault();
        const v = parsePastedAmount(text);
        setDrafts((all) => all.map((d, i) => (i === index ? changed(d, field, v, master) : d)));
      }
      return; // nilai teks: biarkan tempel biasa
    }
    e.preventDefault();
    const lines = pastedLines(text);
    const next = [...latest.current];
    lines.forEach((line, li) => {
      const at = index + li;
      while (next.length <= at) next.push(emptyDraft());
      next[at] = canonicalLedger(fillFromPastedLine(next[at], line, field), master);
    });
    setDrafts(next);
    toast.success(`${lines.length} row(s) pasted from Excel.`);
    warnUnknownLedgers(next.slice(index, index + lines.length), master);
  }, [master]);

  return (
    <>
      {drafts.map((draft, i) => (
        <TableRow key={`ins-${i}`} className="whitespace-nowrap">
          {showRowNo && (
            // Nomor yang akan didapat setelah disimpan: lanjutan baris di atasnya.
            <TableCell className={`${rowNoCell} bg-amber-50/60`}>
              {anchorRowNo ? formatRowNo(anchorRowNo + i + 1) : '-'}
            </TableCell>
          )}
          <LedgerRowEditor
            index={i}
            draft={draft}
            saldo={saldos[i]}
            rowKey={`ins-${i}`}
            master={master}
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
        <TableCell colSpan={showRowNo ? 11 : 10} className="py-2 px-4">
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
              Enter = new row · Ctrl+Enter = save · Esc = cancel · paste from Excel supported
            </span>
          </div>
        </TableCell>
      </TableRow>
    </>
  );
}
