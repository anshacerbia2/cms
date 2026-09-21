import { Fragment, useMemo, useState } from "react";
import {
  BookOpen, ChevronDown, ChevronRight, Edit2, EyeOff, Eye, Lock, MoreVertical, Plus, Search, Trash2,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/common/PageContainer";
import { ledgerKey, useLedgerMutations, useLedgerTree } from "../hooks/useLedgers";
import type { LedgerNode, SubLedgerNode } from "../services/ledgers.service";

/** Yang sedang dibuat atau diganti namanya lewat dialog. */
type NameTarget =
  | { kind: "ledger"; ledger?: LedgerNode }
  | { kind: "sub"; ledger: LedgerNode; sub?: SubLedgerNode };

const head = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60";
const menuItem = "gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors";

/**
 * Master Ledger dan Sub Ledger 1 untuk Bank Statement.
 *
 * Yang ditandai gembok dipakai laporan keuangan (P&L, neraca): namanya boleh
 * diganti, tapi tidak bisa dihapus atau dinonaktifkan. Yang masih dipakai
 * transaksi juga tidak bisa dihapus - dinonaktifkan saja, supaya hilang dari
 * dropdown tanpa mengubah baris lama.
 */
export default function LedgersPage() {
  const { can } = useAuthStore();
  const { data: tree = [], isLoading } = useLedgerTree();
  const m = useLedgerMutations();

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [target, setTarget] = useState<NameTarget | null>(null);
  const [name, setName] = useState("");

  const q = ledgerKey(search);
  // Mencari juga di SL1: Ledger-nya ikut tampil dan terbuka, dengan SL1 yang cocok saja.
  const rows = useMemo(() => {
    if (!q) return tree.map((l) => ({ ledger: l, subs: l.subLedgers }));
    return tree
      .map((l) => {
        const selfHit = ledgerKey(l.name).includes(q);
        const subs = l.subLedgers.filter((s) => ledgerKey(s.name).includes(q));
        return selfHit || subs.length > 0 ? { ledger: l, subs: selfHit && subs.length === 0 ? l.subLedgers : subs } : null;
      })
      .filter((x): x is { ledger: LedgerNode; subs: SubLedgerNode[] } => x !== null);
  }, [tree, q]);

  const isOpen = (id: number) => !!q || expanded.has(id);
  const toggle = (id: number) =>
    setExpanded((all) => {
      const next = new Set(all);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openName = (t: NameTarget) => {
    setTarget(t);
    setName(t.kind === "ledger" ? t.ledger?.name ?? "" : t.sub?.name ?? "");
  };

  const saveName = async () => {
    if (!target || name.trim() === "") return;
    const value = name.trim();
    if (target.kind === "ledger") {
      if (target.ledger) await m.updateLedger.mutateAsync({ id: target.ledger.id, name: value });
      else await m.createLedger.mutateAsync({ name: value });
    } else {
      if (target.sub) await m.updateSubLedger.mutateAsync({ id: target.sub.id, name: value });
      else {
        await m.createSubLedger.mutateAsync({ ledgerId: target.ledger.id, name: value });
        setExpanded((all) => new Set(all).add(target.ledger.id));
      }
    }
    setTarget(null);
  };

  const saving = [m.createLedger, m.updateLedger, m.createSubLedger, m.updateSubLedger].some((x) => x.isPending);

  const removeLedger = (l: LedgerNode) => {
    if (confirm(`Hapus Ledger "${l.name}"${l.subLedgers.length ? ` beserta ${l.subLedgers.length} Sub Ledger 1-nya` : ""}?`)) {
      m.deleteLedger.mutate(l.id);
    }
  };
  const removeSub = (s: SubLedgerNode) => {
    if (confirm(`Hapus Sub Ledger 1 "${s.name}"?`)) m.deleteSubLedger.mutate(s.id);
  };

  const status = (active: boolean) => (
    <Badge
      variant="outline"
      className={active ? "bg-green-50 text-green-600 border-green-100/50" : "bg-muted text-muted-foreground border-transparent"}
    >
      <span className="text-[10px] font-extrabold uppercase tracking-widest">{active ? "Active" : "Inactive"}</span>
    </Badge>
  );

  const locked = (code: string | null) =>
    code ? (
      <span title="Dipakai laporan keuangan: tidak bisa dihapus atau dinonaktifkan" className="inline-flex text-amber-600">
        <Lock size={12} />
      </span>
    ) : null;

  const actions = (items: { show: boolean; label: string; icon: any; onClick: () => void; danger?: boolean }[]) => {
    const visible = items.filter((i) => i.show);
    if (visible.length === 0) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 rounded-xl hover:bg-primary/5 text-muted-foreground">
            <MoreVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-premium border-primary/10 p-1 bg-white">
          {visible.map(({ label, icon: Icon, onClick, danger }) => (
            <DropdownMenuItem
              key={label}
              onClick={onClick}
              className={danger ? `${menuItem} text-destructive hover:bg-destructive/5` : menuItem}
            >
              <Icon size={14} />
              <span>{label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title="Ledgers"
        description="Master Ledger dan Sub Ledger 1 untuk Bank Statement."
        icon={BookOpen}
        actions={
          can("ledgers.create") && (
            <Button
              onClick={() => openName({ kind: "ledger" })}
              className="bg-primary hover:bg-primary/90 text-white font-extrabold px-6 rounded-xl shadow-premium flex items-center gap-2 h-11"
            >
              <Plus size={18} strokeWidth={3} />
              <span>ADD LEDGER</span>
            </Button>
          )
        }
      />

      <div className="bg-white/50 p-2 rounded-2xl border border-primary/5 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
          <Input
            placeholder="Cari Ledger atau Sub Ledger 1..."
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-primary/[0.02]">
              <TableRow className="hover:bg-transparent border-primary/5">
                <TableHead className={`${head} pl-6`}>Ledger / Sub Ledger 1</TableHead>
                <TableHead className={`${head} text-right`}>Sub Ledger 1</TableHead>
                <TableHead className={`${head} text-right`}>Transaksi</TableHead>
                <TableHead className={head}>Status</TableHead>
                <TableHead className={`${head} text-right pr-6`}>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i} className="border-primary/5">
                    <TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-muted-foreground text-xs uppercase tracking-widest">
                    Tidak ada yang cocok
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(({ ledger: l, subs }) => (
                  <Fragment key={l.id}>
                    <TableRow className={`border-primary/5 ${l.isActive ? "" : "opacity-60"}`}>
                      <TableCell className="pl-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggle(l.id)}
                          className="flex items-center gap-2 font-bold text-[13px] text-primary cursor-pointer"
                        >
                          {isOpen(l.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          {l.name}
                          {locked(l.code)}
                        </button>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{l.subLedgers.length}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{l.usage.toLocaleString("id-ID")}</TableCell>
                      <TableCell>{status(l.isActive)}</TableCell>
                      <TableCell className="text-right pr-6">
                        {actions([
                          { show: can("ledgers.create"), label: "Tambah Sub Ledger 1", icon: Plus, onClick: () => openName({ kind: "sub", ledger: l }) },
                          { show: can("ledgers.update"), label: "Ganti nama", icon: Edit2, onClick: () => openName({ kind: "ledger", ledger: l }) },
                          {
                            show: can("ledgers.update") && !l.code,
                            label: l.isActive ? "Nonaktifkan" : "Aktifkan",
                            icon: l.isActive ? EyeOff : Eye,
                            onClick: () => m.updateLedger.mutate({ id: l.id, isActive: !l.isActive }),
                          },
                          { show: can("ledgers.delete") && !l.code && l.usage === 0, label: "Hapus", icon: Trash2, onClick: () => removeLedger(l), danger: true },
                        ])}
                      </TableCell>
                    </TableRow>
                    {isOpen(l.id) &&
                      subs.map((s) => (
                        <TableRow key={s.id} className={`border-primary/5 bg-primary/[0.015] ${s.isActive ? "" : "opacity-60"}`}>
                          <TableCell className="pl-14 py-2 text-[13px] text-primary/80">
                            <span className="inline-flex items-center gap-2">
                              {s.name}
                              {locked(s.code)}
                            </span>
                          </TableCell>
                          <TableCell />
                          <TableCell className="text-right text-sm text-muted-foreground">{s.usage.toLocaleString("id-ID")}</TableCell>
                          <TableCell>{status(s.isActive)}</TableCell>
                          <TableCell className="text-right pr-6">
                            {actions([
                              { show: can("ledgers.update"), label: "Ganti nama", icon: Edit2, onClick: () => openName({ kind: "sub", ledger: l, sub: s }) },
                              {
                                show: can("ledgers.update") && !s.code,
                                label: s.isActive ? "Nonaktifkan" : "Aktifkan",
                                icon: s.isActive ? EyeOff : Eye,
                                onClick: () => m.updateSubLedger.mutate({ id: s.id, isActive: !s.isActive }),
                              },
                              { show: can("ledgers.delete") && !s.code && s.usage === 0, label: "Hapus", icon: Trash2, onClick: () => removeSub(s), danger: true },
                            ])}
                          </TableCell>
                        </TableRow>
                      ))}
                    {isOpen(l.id) && subs.length === 0 && (
                      <TableRow className="border-primary/5 bg-primary/[0.015]">
                        <TableCell colSpan={5} className="pl-14 py-2 text-[12px] text-muted-foreground">
                          Belum ada Sub Ledger 1.
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent className="sm:max-w-[440px] rounded-3xl border-primary/5 shadow-premium">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-primary">
              {target?.kind === "ledger"
                ? target.ledger ? "Ganti nama Ledger" : "Tambah Ledger"
                : target?.sub ? "Ganti nama Sub Ledger 1" : `Tambah Sub Ledger 1 di ${target?.ledger.name ?? ""}`}
            </DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            placeholder="Nama"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            className="h-11 rounded-xl"
          />
          {(target?.kind === "ledger" ? target.ledger : target?.kind === "sub" ? target.sub : undefined) && (
            <p className="text-[12px] text-muted-foreground">
              Nama di semua transaksi yang memakainya ikut berganti.
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={saving}>Batal</Button>
            <Button onClick={saveName} disabled={saving || name.trim() === ""}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
