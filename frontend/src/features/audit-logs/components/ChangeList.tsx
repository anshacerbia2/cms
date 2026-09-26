import { cn } from "@/lib/utils";
import { columnLabel, isHidden, visibleChanges } from "../labels";
import type { AuditEntry } from "../hooks/useAuditLogs";

const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 });

/** Kolom `source` di tabel finance: dari mana baris itu berasal. */
const ORIGIN: Record<string, string> = { APP: "App", SEED: "Workbook" };

/** Nilai mentah dari log, ditulis seperti di layar. */
export function formatAuditValue(value: any, column?: string): string {
  if (column === "source" && typeof value === "string") return ORIGIN[value] ?? value;
  // Nomor baris dan ID ditulis polos, bukan "1.500".
  if (column === "row_no" || column?.endsWith("_id")) return value === null || value === undefined ? "—" : String(value);
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" || (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value))) {
    const n = Number(value);
    // Tahun ditulis polos, bukan "2.026".
    if (Number.isInteger(n) && n >= 1900 && n <= 2100) return String(n);
    return numberFormat.format(n);
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      const midnight = /T00:00:00(\.0+)?(Z|[+-]00:?00)?$/.test(value);
      return d.toLocaleString("en-GB", midnight
        ? { day: "2-digit", month: "short", year: "numeric" }
        : { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Kolom yang diisi pada baris itu, untuk catatan Created dan Deleted. */
function filledColumns(table: string, data: Record<string, any> | null) {
  if (!data) return [];
  return Object.keys(data).filter((k) => !isHidden(table, k) && data[k] !== null && data[k] !== "");
}

/**
 * Isi satu catatan: kolom yang berubah (Edited), atau nilai-nilai baris itu
 * saat dibuat (Created) atau tepat sebelum dihapus (Deleted).
 */
export function ChangeList({ entry }: { entry: AuditEntry }) {
  const isAmount = entry.table.endsWith("_amounts");

  if (isAmount) {
    // Baris rincian per rekening cukup ditulis sebagai satu angka rekening.
    return (
      <div className="text-[12px] text-primary/80">
        <span className="font-bold">{entry.accountLabel ?? `Account #${(entry.after ?? entry.before)?.internal_account_id}`}</span>
        {": "}
        <span className="tabular-nums">{formatAuditValue(entry.before?.amount)}</span>
        {" → "}
        <span className="tabular-nums font-bold">{entry.action === "DELETE" ? "—" : formatAuditValue(entry.after?.amount)}</span>
      </div>
    );
  }

  if (entry.action === "UPDATE") {
    const columns = visibleChanges(entry.table, entry.changedColumns);
    return (
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
            <th className="py-1 pr-3 font-bold">Field</th>
            <th className="py-1 pr-3 font-bold">Before</th>
            <th className="py-1 font-bold">After</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((c) => (
            <tr key={c} className="border-t border-primary/5 align-top">
              <td className="py-1 pr-3 font-bold text-primary/80 whitespace-nowrap">{columnLabel(entry.table, c)}</td>
              <td className="py-1 pr-3 text-rose-700/80 line-through decoration-rose-300 break-all">{formatAuditValue(entry.before?.[c], c)}</td>
              <td className="py-1 text-emerald-700 font-bold break-all">{formatAuditValue(entry.after?.[c], c)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const data = entry.action === "DELETE" ? entry.before : entry.after;
  const columns = filledColumns(entry.table, data);
  return (
    <dl className={cn("grid grid-cols-[max-content_1fr] gap-x-4 gap-y-0.5 text-[12px]", entry.action === "DELETE" && "opacity-80")}>
      {columns.map((c) => (
        <div key={c} className="contents">
          <dt className="font-bold text-primary/70 whitespace-nowrap">{columnLabel(entry.table, c)}</dt>
          <dd className="text-primary break-all">{formatAuditValue(data?.[c], c)}</dd>
        </div>
      ))}
    </dl>
  );
}
