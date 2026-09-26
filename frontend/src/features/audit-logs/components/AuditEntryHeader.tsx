import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ACTION_LABELS } from "../labels";
import type { AuditEntry } from "../hooks/useAuditLogs";

const ACTION_STYLE: Record<string, string> = {
  INSERT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  UPDATE: "bg-amber-50 text-amber-700 border-amber-200",
  DELETE: "bg-rose-50 text-rose-700 border-rose-200",
};

export function formatAuditTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

/** Siapa, kapan, apa - baris judul sebuah catatan. */
export function AuditEntryHeader({ entry }: { entry: AuditEntry }) {
  const who = entry.user?.name || entry.user?.email || (entry.source === "SQL" ? `Database user ${entry.dbUser}` : "System");
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px]">
      <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-widest rounded-md", ACTION_STYLE[entry.action])}>
        {ACTION_LABELS[entry.action] ?? entry.action}
      </Badge>
      <span className="font-bold text-primary tabular-nums">{formatAuditTime(entry.occurredAt)}</span>
      <span className="text-muted-foreground">by</span>
      <span className="font-bold text-primary">{who}</span>
      {entry.user?.name && entry.user.email && <span className="text-muted-foreground">({entry.user.email})</span>}
      {entry.source === "SQL" && (
        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest rounded-md bg-slate-50 text-slate-600 border-slate-200">
          Outside the app
        </Badge>
      )}
    </div>
  );
}
