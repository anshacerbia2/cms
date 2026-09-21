import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ledgersService, type LedgerNode, type SubLedgerNode } from "../services/ledgers.service";

const TREE_KEY = ["finance", "ledgers", "tree"];

/**
 * Kunci pembanding nama: huruf kecil, `( ) /` jadi spasi, spasi dirapatkan.
 * HARUS sama dengan `ledgerKey` di backend (`finance/common/ledger-refs.ts`),
 * supaya yang cocok di sini juga diterima di sana.
 */
export const ledgerKey = (name: string | null | undefined) =>
  String(name ?? "").toLowerCase().replace(/[()/]/g, " ").replace(/\s+/g, " ").trim();

/** Ejaan lama yang sudah disatukan. Sama dengan backend. */
const LEDGER_ALIASES: Record<string, string> = { "retained earning": "retained earnings" };
const SUB_LEDGER_ALIASES: Record<string, string> = {
  "bank charges": "bank charge",
  "meal allowance": "meals allowance",
  deviden: "dividend",
};

/** Master yang sudah diindeks, untuk dropdown, tempel dari Excel, dan pemeriksaan sebelum simpan. */
export type LedgerMaster = {
  ledgers: LedgerNode[];
  findLedger: (name: string) => LedgerNode | undefined;
  findSub: (ledger: LedgerNode | undefined, name: string) => SubLedgerNode | undefined;
  /** Nama Ledger aktif, untuk dropdown. */
  ledgerOptions: string[];
  /** Nama Sub Ledger 1 aktif di bawah Ledger itu. Kosong kalau Ledger-nya tidak dikenal. */
  subOptions: (ledgerName: string) => string[];
};

export function buildLedgerMaster(tree: LedgerNode[]): LedgerMaster {
  const byKey = new Map(tree.map((l) => [ledgerKey(l.name), l]));
  const subKey = (ledgerId: number, name: string) => `${ledgerId}|${name}`;
  const subs = new Map<string, SubLedgerNode>();
  for (const l of tree) for (const s of l.subLedgers) subs.set(subKey(l.id, ledgerKey(s.name)), s);

  const findLedger = (name: string) => {
    const key = ledgerKey(name);
    return key ? byKey.get(LEDGER_ALIASES[key] ?? key) : undefined;
  };
  const findSub = (ledger: LedgerNode | undefined, name: string) => {
    const key = ledgerKey(name);
    return ledger && key ? subs.get(subKey(ledger.id, SUB_LEDGER_ALIASES[key] ?? key)) : undefined;
  };

  return {
    ledgers: tree,
    findLedger,
    findSub,
    ledgerOptions: tree.filter((l) => l.isActive).map((l) => l.name),
    subOptions: (ledgerName) =>
      (findLedger(ledgerName)?.subLedgers ?? []).filter((s) => s.isActive).map((s) => s.name),
  };
}

type LedgerFields = { colF: string; colG: string };

/** Nama ditulis ulang ke ejaan master kalau dikenali; yang tidak dikenali dibiarkan apa adanya. */
export function canonicalLedger<T extends LedgerFields>(row: T, master: LedgerMaster | null): T {
  if (!master) return row;
  const ledger = master.findLedger(row.colF);
  const sub = master.findSub(ledger, row.colG);
  return {
    ...row,
    colF: ledger?.name ?? row.colF,
    colG: sub?.name ?? row.colG,
  };
}

/** Kenapa Ledger/SL1 baris ini tidak bisa disimpan, atau null kalau bisa. */
export function ledgerProblem(row: LedgerFields, master: LedgerMaster | null): string | null {
  if (!master) return null;
  const f = row.colF.trim();
  const g = row.colG.trim();
  const ledger = master.findLedger(f);
  if (f && !ledger) return `Ledger "${f}" tidak ada di master.`;
  if (g && !ledger) return `Sub Ledger 1 "${g}" diisi tanpa Ledger.`;
  if (g && !master.findSub(ledger, g)) return `Sub Ledger 1 "${g}" tidak ada di bawah Ledger "${ledger!.name}".`;
  return null;
}

/** FK untuk dikirim ke API. Tidak dikenali = tidak dikirim, nama teksnya yang dipakai backend. */
export function ledgerIds(row: LedgerFields, master: LedgerMaster | null) {
  if (!master) return {};
  const ledger = master.findLedger(row.colF);
  const sub = master.findSub(ledger, row.colG);
  return {
    ledgerId: row.colF.trim() === "" ? null : ledger?.id,
    subLedgerId: row.colG.trim() === "" ? null : sub?.id,
  };
}

/**
 * Ganti Ledger: Sub Ledger 1 yang bukan milik Ledger baru dikosongkan, supaya
 * tidak tersimpan pasangan yang tidak ada.
 */
export function withLedger<T extends LedgerFields>(row: T, colF: string, master: LedgerMaster | null): T {
  const next = { ...row, colF };
  if (master && next.colG && !master.findSub(master.findLedger(colF), next.colG)) next.colG = "";
  return next;
}

export function useLedgerTree() {
  return useQuery({
    queryKey: TREE_KEY,
    queryFn: ledgersService.tree,
    staleTime: 5 * 60 * 1000,
  });
}

/** Master siap pakai, atau null selama belum termuat (input lalu berlaku seperti teks biasa). */
export function useLedgerMaster(): LedgerMaster | null {
  const { data } = useLedgerTree();
  return useMemo(() => (data ? buildLedgerMaster(data) : null), [data]);
}

export function useLedgerMutations() {
  const queryClient = useQueryClient();
  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: TREE_KEY });
    // Ganti nama ikut menulis ulang kolom Ledger di transaksi.
    queryClient.invalidateQueries({ queryKey: ["finance", "bank-mutation"] });
  };
  const onError = (error: any) => toast.error(error?.response?.data?.message || "Gagal menyimpan.");
  const make = <V,>(fn: (v: V) => Promise<any>) => useMutation({ mutationFn: fn, onSuccess, onError });

  return {
    createLedger: make(ledgersService.createLedger),
    updateLedger: make(ledgersService.updateLedger),
    deleteLedger: make(ledgersService.deleteLedger),
    createSubLedger: make(ledgersService.createSubLedger),
    updateSubLedger: make(ledgersService.updateSubLedger),
    deleteSubLedger: make(ledgersService.deleteSubLedger),
  };
}
