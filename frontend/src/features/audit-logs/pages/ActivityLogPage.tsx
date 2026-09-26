import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, History, RotateCcw } from "lucide-react";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationControls } from "@/components/common/PaginationControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuditLogs, useAuditLogUsers, type AuditEntry } from "../hooks/useAuditLogs";
import { ACTION_LABELS, FILTERABLE_TABLES, TABLE_LABELS, columnLabel, visibleChanges } from "../labels";
import { AuditEntryHeader, formatAuditTime } from "../components/AuditEntryHeader";
import { ChangeList } from "../components/ChangeList";
import { HistoryDialog } from "../components/HistoryDialog";

const ALL = "all";

/** Awal hari sesudah `date` (YYYY-MM-DD) menurut jam lokal - batas akhir yang eksklusif. */
const dayAfter = (date: string) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
};

/** Ringkasan satu baris log untuk tabel: kolom apa yang berubah, atau jenis kejadiannya. */
function summary(e: AuditEntry) {
  if (e.table.endsWith("_amounts")) return `Account amount: ${e.accountLabel ?? "account"}`;
  if (e.action === "UPDATE") {
    const cols = visibleChanges(e.table, e.changedColumns).map((c) => columnLabel(e.table, c));
    return cols.length > 3 ? `${cols.slice(0, 3).join(", ")} +${cols.length - 3} more` : cols.join(", ");
  }
  return e.action === "INSERT" ? "New record" : "Record deleted";
}

/**
 * Semua perubahan data finance, terbaru di atas. Log diisi oleh database sendiri
 * sejak fitur ini aktif, jadi mencakup perubahan lewat aplikasi maupun di luarnya.
 */
export default function ActivityLogPage() {
  const [page, setPage] = useState(1);
  const [table, setTable] = useState(ALL);
  const [action, setAction] = useState(ALL);
  const [userId, setUserId] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [historyOf, setHistoryOf] = useState<AuditEntry | null>(null);

  const { data, isPending, isFetching } = useAuditLogs({
    page,
    limit: 50,
    table: table !== ALL ? table : undefined,
    action: action !== ALL ? action : undefined,
    userId: userId !== ALL ? userId : undefined,
    // Batas hari menurut jam lokal user (WIB), bukan tengah malam UTC.
    from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    to: to ? dayAfter(to) : undefined,
  });
  const { data: users = [] } = useAuditLogUsers();
  const entries = data?.data ?? [];

  const reset = () => { setTable(ALL); setAction(ALL); setUserId(ALL); setFrom(""); setTo(""); setPage(1); };
  const toggle = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const onFilter = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };
  const filtered = table !== ALL || action !== ALL || userId !== ALL || from || to;

  // Riwayat sebuah catatan rincian per rekening dibuka pada baris induknya.
  const parentOf = (e: AuditEntry) => {
    if (!e.table.endsWith("_amounts")) return { table: e.table, rowId: e.rowId };
    const data = e.after ?? e.before ?? {};
    const key = Object.keys(data).find((k) => k.endsWith("_id") && k !== "internal_account_id");
    const parentTable = { account_receivable_amounts: "account_receivables", account_payable_amounts: "account_payables", sales_record_amounts: "sales_records", inter_account_amounts: "inter_account" }[e.table] ?? e.table;
    return { table: parentTable, rowId: key ? String(data[key]) : e.rowId };
  };

  return (
    <PageContainer>
      <PageHeader
        title="Activity Log"
        description="Every insert, edit and delete on the finance data: who made it, when, and the values before and after."
        icon={History}
      />

      <div className="flex flex-col xl:flex-row flex-wrap items-stretch xl:items-center gap-3 bg-white/50 p-2 rounded-xl border border-primary/5 mb-6">
        <Select value={table} onValueChange={onFilter(setTable)}>
          <SelectTrigger className="xl:w-[220px] h-11 bg-white border-0 rounded-xl shadow-sm font-bold"><SelectValue placeholder="Module" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All modules</SelectItem>
            {FILTERABLE_TABLES.map((t) => <SelectItem key={t} value={t}>{TABLE_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={onFilter(setAction)}>
          <SelectTrigger className="xl:w-[160px] h-11 bg-white border-0 rounded-xl shadow-sm font-bold"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={userId} onValueChange={onFilter(setUserId)}>
          <SelectTrigger className="xl:w-[220px] h-11 bg-white border-0 rounded-xl shadow-sm font-bold"><SelectValue placeholder="User" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All users</SelectItem>
            {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={(e) => onFilter(setFrom)(e.target.value)} className="h-11 bg-white border-0 rounded-xl shadow-sm w-[160px]" aria-label="From date" />
          <span className="text-muted-foreground text-[12px]">to</span>
          <Input type="date" value={to} onChange={(e) => onFilter(setTo)(e.target.value)} className="h-11 bg-white border-0 rounded-xl shadow-sm w-[160px]" aria-label="To date" />
        </div>
        {filtered && (
          <Button variant="ghost" onClick={reset} className="h-11 rounded-xl text-[12px] font-bold gap-2">
            <RotateCcw size={14} /> Clear filters
          </Button>
        )}
      </div>

      <div className="bg-white/70 rounded-2xl shadow-premium border border-primary/5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Record</TableHead>
              <TableHead>Changes</TableHead>
              <TableHead className="text-right pr-6">History</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow><TableCell colSpan={8} className="py-16 text-center text-[12px] text-muted-foreground">Loading activity…</TableCell></TableRow>
            ) : entries.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-16 text-center text-[12px] text-muted-foreground">No activity recorded{filtered ? " for these filters" : " yet"}.</TableCell></TableRow>
            ) : (
              entries.map((e) => {
                const open = expanded.has(e.id);
                return (
                  <Fragment key={e.id}>
                    <TableRow className="cursor-pointer whitespace-nowrap" onClick={() => toggle(e.id)}>
                      <TableCell className="pl-4">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</TableCell>
                      <TableCell className="text-[12px] tabular-nums">{formatAuditTime(e.occurredAt)}</TableCell>
                      <TableCell className="text-[12px] font-bold">{e.user?.name || e.user?.email || (e.source === "SQL" ? `DB: ${e.dbUser}` : "System")}</TableCell>
                      <TableCell className="text-[12px]">{ACTION_LABELS[e.action]}</TableCell>
                      <TableCell className="text-[12px]">{TABLE_LABELS[e.table] ?? e.table}</TableCell>
                      <TableCell className="text-[12px] tabular-nums">#{parentOf(e).rowId}</TableCell>
                      <TableCell className="text-[12px] text-muted-foreground max-w-[320px] truncate">{summary(e)}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="sm" className="h-7 text-[11px] font-bold" onClick={(ev) => { ev.stopPropagation(); setHistoryOf(e); }}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                    {open && (
                      <TableRow className="bg-primary/[0.02] hover:bg-primary/[0.02]">
                        <TableCell />
                        <TableCell colSpan={7} className="py-3 space-y-2">
                          <AuditEntryHeader entry={e} />
                          <ChangeList entry={e} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationControls meta={data?.meta} onPageChange={setPage} isFetching={isFetching} />

      {historyOf && (
        <HistoryDialog
          open={!!historyOf}
          onOpenChange={(o) => !o && setHistoryOf(null)}
          table={parentOf(historyOf).table}
          rowId={parentOf(historyOf).rowId}
          title={TABLE_LABELS[historyOf.table]}
        />
      )}
    </PageContainer>
  );
}
