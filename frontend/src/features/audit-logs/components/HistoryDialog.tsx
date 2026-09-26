import { History } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuditLogs } from "../hooks/useAuditLogs";
import { AuditEntryHeader } from "./AuditEntryHeader";
import { ChangeList } from "./ChangeList";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nama tabel database, misalnya "account_receivables". */
  table: string;
  rowId: string | number | null | undefined;
  /** Judul yang dikenali user, misalnya nomor invoice atau nama client. */
  title?: string;
};

/**
 * Riwayat satu baris: siapa yang membuat, mengubah, atau menghapusnya, kapan,
 * dan nilai sebelum-sesudahnya. Perubahan rincian per rekening ikut tampil.
 * Riwayat hanya ada sejak activity log aktif; perubahan sebelum itu tidak tercatat.
 */
export function HistoryDialog({ open, onOpenChange, table, rowId, title }: Props) {
  const { data, isPending, isError } = useAuditLogs(
    { table, rowId: rowId != null ? String(rowId) : undefined, limit: 200 },
    open && rowId != null,
  );
  const entries = data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col rounded-3xl border-0 shadow-premium">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black text-primary">
            <History size={20} className="text-secondary" /> History
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            {title ? `${title} · ` : ""}Record #{rowId}. Changes are recorded from the moment the activity log was switched on.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto pr-1 space-y-3 custom-scrollbar">
          {isPending ? (
            <p className="py-10 text-center text-[12px] text-muted-foreground">Loading history…</p>
          ) : isError ? (
            <p className="py-10 text-center text-[12px] text-rose-600">The history could not be loaded.</p>
          ) : entries.length === 0 ? (
            <p className="py-10 text-center text-[12px] text-muted-foreground">No recorded changes for this record yet.</p>
          ) : (
            entries.map((e) => (
              <div key={e.id} className="rounded-xl border border-primary/10 bg-white/70 p-3 space-y-2">
                <AuditEntryHeader entry={e} />
                <ChangeList entry={e} />
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
