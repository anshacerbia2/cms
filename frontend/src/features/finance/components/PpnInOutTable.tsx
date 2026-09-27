import { Fragment, useState, useMemo, useCallback, useEffect } from "react";
import { HistoryDialog, historyTitle } from '@/features/audit-logs/components/HistoryDialog';
import { Search, FilterX } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePpnInOut } from "../hooks/usePpnInOut";
import { useExcelFilter } from "../hooks/useExcelFilter";
import { PaginationControls } from "@/components/common/PaginationControls";
import { ExcelColumnFilter } from "./ExcelColumnFilter";
import { formatCurrency, formatDate, getAmountColor } from "@/lib/utils";
import { Decimal } from "decimal.js";
import { toast } from "sonner";
import { AlertCircle, Plus, Download, FileSpreadsheet, FileText } from "lucide-react";
import { downloadExcelFile, downloadPdfFile, exportFilter } from "@/lib/downloadFile";
import { DetailModal } from "@/components/common/DetailModal";
import { LedgerErrorBoundary } from "./LedgerErrorBoundary";
import { PpnDisplayRow, PPN_COLUMNS, rowNoCell } from "./PpnDisplayRow";
import { PpnInlineEditRow, PpnInlineInsertRows, saldoBefore } from "./PpnInlineRows";
import { draftPayload, type PpnDraft } from "./PpnRowEditor";
import AddPpnInOutModal from "./AddPpnInOutModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/authStore";

// Saldo berjalan (AP PPN Non WAPU) tidak dijumlah - sama dengan kolom saldo Bank Statement.
const TOTAL_KEYS = PPN_COLUMNS.filter((c) => c.num && c.total !== false).map((c) => c.k);

/** Angka mentah dari API disimpan di sebelah nilai tampilannya: colH → rawColH, dpp → rawDpp. */
const rawKey = (k: string) => `raw${k[0].toUpperCase()}${k.slice(1)}`;

export function PpnInOutTable() {
  const { can } = useAuthStore();
  const [historyRow, setHistoryRow] = useState<any | null>(null);
  const limit = 10;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedViewRecord, setSelectedViewRecord] = useState<any>(null);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Menyunting dan menyisip langsung di tabel, seperti Bank Statement dan Sales.
  // Satu per satu: selama ada yang diketik, tombol sunting/sisip baris lain dikunci.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [insertAfterId, setInsertAfterId] = useState<number | null>(null);
  // Sisip di atas baris No 1 - disimpan dengan afterId null (paling atas).
  const [insertAboveId, setInsertAboveId] = useState<number | null>(null);
  const [savingInline, setSavingInline] = useState(false);
  const inlineBusy = editingId !== null || insertAfterId !== null || insertAboveId !== null;
  /** Filter rentang kolom No (inklusif), seperti Bank Statement dan Sales. */
  const [rowNoRange, setRowNoRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const isRowNoRangeActive = rowNoRange.min !== null || rowNoRange.max !== null;
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const yearNum = useMemo(() => Number(yearFilter), [yearFilter]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2025; y--) {
      years.push(y.toString());
    }
    return years;
  }, []);

  const { getAllPpnInOut, deletePpnInOut, updatePpnInOut, insertPpnInOut } = usePpnInOut();
  // mutateAsync stabil antar render; objek mutasinya tidak.
  const updatePpnAsync = updatePpnInOut.mutateAsync;
  const insertPpnAsync = insertPpnInOut.mutateAsync;
  const ppnInOutQuery = getAllPpnInOut(
    yearFilter !== "all" ? yearNum : undefined,
    { enabled: !!yearFilter }
  );
  const { data: allDataRaw, isLoading } = ppnInOutQuery;

  // Rentang No disaring di sini, sebelum filter kolom lain, supaya daftar nilai
  // di filter lain, subtotal, dan grand total ikut mengikuti rentangnya.
  const displayData = useMemo(() => {
    const inRange = (row: any) => {
      if (!isRowNoRangeActive) return true;
      const no = row.rowNo === null || row.rowNo === undefined ? null : row.rowNo;
      if (no === null) return false;
      return (rowNoRange.min === null || no >= rowNoRange.min) && (rowNoRange.max === null || no <= rowNoRange.max);
    };
    return (allDataRaw || []).filter(inRange).map((row: any) => ({
      ...row,
      colA: formatDate(row.colA),
      rawColA: row.colA,
      colB: row.colB || "-",
      colC: row.colC || "-",
      colD: row.colD || "-",
      colE: row.colE || "-",
      dpp: formatCurrency(row.dpp),
      rawDpp: row.dpp,
      status: row.status || "-",
      colH: formatCurrency(row.colH),
      rawColH: row.colH,
      colI: formatCurrency(row.colI),
      rawColI: row.colI,
      colJ: formatCurrency(row.colJ),
      rawColJ: row.colJ,
      colK: formatCurrency(row.colK),
      rawColK: row.colK,
      colM: formatCurrency(row.colM),
      rawColM: row.colM,
      colN: formatCurrency(row.colN),
      rawColN: row.colN,
      colO: formatCurrency(row.colO),
      rawColO: row.colO,
      colP: row.colP || "-",
      colQ: row.colQ || "-",
      colR: row.colR || "-",
      colS: row.colS || "-",
    }));
  }, [allDataRaw, isRowNoRangeActive, rowNoRange]);

  const {
    page,
    setPage,
    search,
    setSearch,
    filters,
    setFilters,
    sort,
    setSort,
    getCascadingData,
    filteredAndSortedData,
    clearFilters: handleClearFiltersBase,
    isAnyFilterActive: isExcelFilterActive
  } = useExcelFilter({
    data: displayData,
    searchFields: ['colC', 'colD', 'colE']
  });

  const handleClearFilters = () => {
    handleClearFiltersBase();
    setRowNoRange({ min: null, max: null });
  };

  const isAnyFilterActive = isExcelFilterActive || isRowNoRangeActive;

  const paginatedData = useMemo(() => {
    const skip = (page - 1) * limit;
    return filteredAndSortedData.slice(skip, skip + limit);
  }, [filteredAndSortedData, page]);

  const calcTotals = (data: any[]) => {
    return data.reduce((acc, curr) => {
      const getNum = (val: any) => {
        if (!val || val === "-" || val === "") return new Decimal(0);
        if (typeof val === 'object' && typeof val.toNumber === 'function') {
          return new Decimal(val.toNumber());
        }
        
        // Try parsing the raw value directly first (e.g. "1000.0000" from API)
        const numStr = String(val).trim();
        // Check if it's a standard number format (optional minus, digits, optional dot, optional digits)
        if (/^-?\d*\.?\d+$/.test(numStr)) {
          return new Decimal(numStr);
        }

        // If it was overwritten by formatted string (e.g. "IDR 1.000.000,00"), try to clean it
        let cleaned = numStr.replace(/[A-Z]{3}\s?/g, "");
        cleaned = cleaned.replace(/\./g, ""); // Remove thousands separator
        cleaned = cleaned.replace(/,/g, "."); // Convert decimal separator
        cleaned = cleaned.replace(/[^0-9.-]+/g, "");
        return cleaned ? new Decimal(cleaned) : new Decimal(0);
      };
      for (const k of TOTAL_KEYS) {
        acc[k] = acc[k].plus(getNum(curr[rawKey(k)] ?? curr[k]));
      }
      return acc;
    }, Object.fromEntries(TOTAL_KEYS.map((k) => [k, new Decimal(0)])) as Record<string, Decimal>);
  };

  const subtotalTotals = useMemo(() => calcTotals(paginatedData), [paginatedData]);
  const grandTotals = useMemo(() => calcTotals(filteredAndSortedData), [filteredAndSortedData]);

  // Baris mentah dari API, sebelum diformat - sumber draf yang disunting.
  const rawById = useMemo(
    () => new Map<number, any>((allDataRaw || []).map((r: any) => [r.id, r])),
    [allDataRaw],
  );

  // Semua callback baris stabil (useCallback), supaya PpnDisplayRow yang di-memo
  // tidak ikut dirender ulang setiap halaman berubah.
  const handleView = useCallback((row: any) => {
    setSelectedViewRecord(row);
    setIsViewModalOpen(true);
  }, []);
  const handleHistory = useCallback((row: any) => setHistoryRow(row), []);
  const handleEdit = useCallback((row: any) => setEditingId(row.id), []);
  const handleInsertAfter = useCallback((row: any) => setInsertAfterId(row.id), []);
  const handleInsertAbove = useCallback((row: any) => setInsertAboveId(row.id), []);
  const handleAskDelete = useCallback((id: number) => setRecordToDelete(id), []);
  const cancelInline = useCallback(() => {
    setEditingId(null);
    setInsertAfterId(null);
    setInsertAboveId(null);
  }, []);
  const refetchPpn = ppnInOutQuery.refetch;

  const saveEdit = useCallback(
    async (draft: PpnDraft) => {
      if (editingId === null || savingInline) return;
      setSavingInline(true);
      try {
        await updatePpnAsync({ id: editingId, data: draftPayload(draft) });
        toast.success("PPN In/Out record updated.");
        setEditingId(null);
        refetchPpn();
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Failed to update PPN In/Out record.");
      } finally {
        setSavingInline(false);
      }
    },
    [editingId, savingInline, updatePpnAsync, refetchPpn],
  );

  const saveInsert = useCallback(
    async (drafts: PpnDraft[]) => {
      const anchorId = insertAboveId ?? insertAfterId;
      if (anchorId === null || savingInline) return;
      const anchor = rawById.get(anchorId);
      if (!anchor) return;
      setSavingInline(true);
      try {
        // Sisip atas hanya ada di baris No 1, jadi "di atasnya" = paling atas.
        await insertPpnAsync({
          rows: drafts.map(draftPayload),
          tagYear: anchor.tagYear,
          afterId: insertAboveId !== null ? null : insertAfterId,
        });
        setInsertAfterId(null);
        setInsertAboveId(null);
        refetchPpn();
      } catch {
        // insertPpnInOut sudah menampilkan pesan galatnya; draf tetap di layar.
      } finally {
        setSavingInline(false);
      }
    },
    [insertAfterId, insertAboveId, savingInline, rawById, insertPpnAsync, refetchPpn],
  );

  const canEdit = can('ppn-in-out.update');
  const canCreate = can('ppn-in-out.create');
  const canDelete = can('ppn-in-out.delete');
  const canHistory = can('audit-logs.index');

  // Ganti tahun, pencarian, filter kolom, urutan, atau rentang No: baris yang
  // sedang diketik dibatalkan. Isi tabelnya sudah bukan yang tadi, dan menyisip
  // "di bawah baris ini" di tampilan yang tersaring atau terurut lain
  // membingungkan - posisinya tetap menurut urutan baris.
  useEffect(() => {
    cancelInline();
  }, [yearFilter, search, filters, sort, rowNoRange, cancelInline]);

  // Jaring pengaman untuk semua cara lain baris itu hilang dari layar - pindah
  // halaman, filter kolom, pencarian. Tanpa ini editornya lenyap tapi statusnya
  // masih "sedang mengetik", dan semua tombol edit/sisip terkunci tanpa ada
  // tombol Batal yang bisa dipencet.
  useEffect(() => {
    const visible = (id: number) => paginatedData.some((r: any) => r.id === id);
    if (editingId !== null && !visible(editingId)) setEditingId(null);
    if (insertAfterId !== null && !visible(insertAfterId)) setInsertAfterId(null);
    if (insertAboveId !== null && !visible(insertAboveId)) setInsertAboveId(null);
  }, [paginatedData, editingId, insertAfterId, insertAboveId]);

  const handleDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await deletePpnInOut.mutateAsync(recordToDelete);
      toast.success("PPN In/Out record deleted successfully.");
      ppnInOutQuery.refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete record.");
    } finally {
      setIsDeleting(false);
      setRecordToDelete(null);
    }
  };


  const cols = PPN_COLUMNS;
  // Label total mengisi kolom No dan kolom teks di depan angka pertama.
  const leadCols = cols.findIndex((c) => c.num);
  const colSpanAll = cols.length + 2; // No + kolom + Actions

  return (
    <div className="space-y-6 mt-6">
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search (Client, No Faktur, Invoice No)..." 
            className="pl-12 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 text-[13px] font-medium"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        
        <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); setPage(1); setRowNoRange({ min: null, max: null }); }}>
          <SelectTrigger className="w-full xl:w-[130px] h-12 px-5 bg-white border-0 rounded-xl shadow-sm flex items-center gap-2 text-muted-foreground font-bold transition-all cursor-pointer">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-primary/10 shadow-premium bg-white p-0 overflow-hidden">
            <SelectItem value="all" className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-muted-foreground transition-colors">
              All Years
            </SelectItem>
            {availableYears.map(year => (
              <SelectItem key={year} value={year} className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-muted-foreground transition-colors">
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          {isAnyFilterActive && (
            <Button 
              onClick={handleClearFilters}
              className="h-12 w-12 bg-white border-0 text-muted-foreground hover:text-red-500 hover:bg-red-50/50 rounded-xl shadow-sm flex items-center justify-center shrink-0 transition-all"
              title="Clear all filters"
            >
              <FilterX size={20} strokeWidth={2} />
            </Button>
          )}

          {can('ppn-in-out.create') && (
            <Button
              onClick={(e) => { e.stopPropagation(); cancelInline(); setIsAddModalOpen(true); }}
              className="h-12 px-6 flex-1 xl:flex-none bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-sm flex items-center justify-center gap-2 font-bold disabled:opacity-50 transition-all active:scale-95 shrink-0"
            >
              <Plus size={20} strokeWidth={3} />
              <span className="text-[13px]">Add Record</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                className="h-12 w-12 xl:w-auto xl:px-4 bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-sm flex items-center justify-center font-bold disabled:opacity-50 transition-all active:scale-95 shrink-0"
              >
                <Download size={20} strokeWidth={3} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-primary/10 shadow-premium bg-white p-0 overflow-hidden w-40">
              <DropdownMenuItem 
                onClick={() => downloadExcelFile(`/finance/ppn-in-out/export/excel${yearFilter !== 'all' ? `?year=${yearFilter}` : ''}`, `PpnInOut_${yearFilter !== 'all' ? yearFilter : 'All'}.xlsx`, exportFilter(isAnyFilterActive, filteredAndSortedData))}
                className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-emerald-600 transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet size={16} strokeWidth={2.5} />
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => downloadPdfFile(`/finance/ppn-in-out/export/pdf${yearFilter !== 'all' ? `?year=${yearFilter}` : ''}`, `PpnInOut_${yearFilter !== 'all' ? yearFilter : 'All'}.pdf`, exportFilter(isAnyFilterActive, filteredAndSortedData))}
                className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-rose-600 transition-colors flex items-center gap-2"
              >
                <FileText size={16} strokeWidth={2.5} />
                Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-premium border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <LedgerErrorBoundary onReset={cancelInline} title="The PPN In/Out table could not be displayed.">
          <Table className="min-w-[3000px]">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap">
                <TableHead className={rowNoCell}>
                  <div className="flex items-center gap-1">
                    No
                    <ExcelColumnFilter
                      columnKey="rowNo" label="No" data={[]} activeFilters={null} sortOnly sortLabels={['1 → 9', '9 → 1']}
                      range={rowNoRange}
                      onRangeChange={(r) => { setRowNoRange(r); setPage(1); }}
                      onFilterChange={() => {}}
                      onSort={(d) => setSort({ key: "rowNo", direction: d })}
                      currentSort={sort}
                    />
                  </div>
                </TableHead>
                {cols.map((c) => (
                  <TableHead key={c.k} className={`${c.num ? 'text-right' : ''} px-4`}>
                    <div className={`flex items-center gap-1 ${c.num ? 'justify-end' : ''}`}>
                      {c.l}
                      <ExcelColumnFilter 
                        columnKey={c.k} 
                        label={c.l} 
                        data={getCascadingData(c.k)} 
                        activeFilters={filters[c.k]} 
                        onFilterChange={(v) => { setFilters(p => ({...p, [c.k]: v})); setPage(1); }} 
                        currentSort={sort} 
                        onSort={(d) => setSort({key: c.k, direction: d})} 
                        type={c.isDate ? "date" : "text"}
                        dateKey={c.isDate ? "rawColA" : undefined}
                      />
                    </div>
                  </TableHead>
                ))}
                <TableHead className="px-4 text-center w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={colSpanAll} className="h-96 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40">Fetching PPN Details...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpanAll} className="h-64 text-center opacity-20">
                    <p className="font-black uppercase tracking-widest">No records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedData.map((row: any) => (
                    <Fragment key={row.id}>
                      {insertAboveId === row.id && (
                        <PpnInlineInsertRows
                          anchorSaldo={saldoBefore(rawById.get(row.id))}
                          anchorRowNo={0}
                          colSpan={colSpanAll}
                          saving={savingInline}
                          onSave={saveInsert}
                          onCancel={cancelInline}
                        />
                      )}
                      {editingId === row.id ? (
                        <PpnInlineEditRow
                          raw={rawById.get(row.id)}
                          saving={savingInline}
                          onSave={saveEdit}
                          onCancel={cancelInline}
                        />
                      ) : (
                        <PpnDisplayRow
                          row={row}
                          busy={inlineBusy}
                          canEdit={canEdit}
                          canCreate={canCreate}
                          canDelete={canDelete}
                          onView={handleView}
                          onHistory={canHistory ? handleHistory : undefined}
                          onEdit={handleEdit}
                          onInsert={handleInsertAfter}
                          onInsertAbove={row.rowNo === 1 ? handleInsertAbove : undefined}
                          onDelete={handleAskDelete}
                        />
                      )}
                      {insertAfterId === row.id && (
                        <PpnInlineInsertRows
                          anchorSaldo={Number(rawById.get(row.id)?.colO || 0)}
                          anchorRowNo={row.rowNo}
                          colSpan={colSpanAll}
                          saving={savingInline}
                          onSave={saveInsert}
                          onCancel={cancelInline}
                        />
                      )}
                    </Fragment>
                  ))}

                  {/* Subtotal Row */}
                  <TableRow className="bg-secondary/5 border-t-2 border-secondary/30 font-bold whitespace-nowrap">
                    <TableCell colSpan={leadCols + 1} className="px-4 text-[11px] text-secondary/80 uppercase tracking-[0.2em]">
                      Subtotal (Page {page})
                    </TableCell>
                    {cols.slice(leadCols).map((c) => c.num && c.total !== false ? (
                      <TableCell key={c.k} className={`text-right px-4 ${getAmountColor(subtotalTotals[c.k].toString())}`}>{formatCurrency(subtotalTotals[c.k].toString())}</TableCell>
                    ) : (
                      <TableCell key={c.k} className="bg-secondary/[0.02]" />
                    ))}
                    <TableCell className="bg-secondary/[0.02]" />
                  </TableRow>

                  {/* Grand Total Row */}
                  <TableRow className="bg-secondary/10 border-t border-secondary/30 font-bold whitespace-nowrap">
                    <TableCell colSpan={leadCols + 1} className="px-4 text-[11px] text-secondary uppercase tracking-[0.2em]">
                      Grand Totals ({filteredAndSortedData.length} records)
                    </TableCell>
                    {cols.slice(leadCols).map((c) => c.num && c.total !== false ? (
                      <TableCell key={c.k} className={`text-right px-4 ${getAmountColor(grandTotals[c.k].toString())}`}>{formatCurrency(grandTotals[c.k].toString())}</TableCell>
                    ) : (
                      <TableCell key={c.k} className="bg-secondary/[0.02]" />
                    ))}
                    <TableCell className="bg-secondary/[0.02]" />
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
          </LedgerErrorBoundary>
        </div>
      </div>

      <PaginationControls 
        meta={{ 
          total: filteredAndSortedData.length, 
          page, 
          limit, 
          lastPage: Math.ceil(filteredAndSortedData.length / limit) 
        }} 
        onPageChange={setPage} 
        isFetching={isLoading} 
      />

      <HistoryDialog

        open={historyRow !== null}

        onOpenChange={(o) => { if (!o) setHistoryRow(null); }}

        table="ppn_in_out"

        rowId={historyRow?.id}

        title={historyTitle(historyRow?.colC, historyRow?.colD)}

      />

      <AddPpnInOutModal 
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => ppnInOutQuery.refetch()}
        year={yearNum}
      />

      <Dialog 
        open={recordToDelete !== null} 
        onOpenChange={(open) => {
          if (isDeleting) return;
          if (!open) setRecordToDelete(null);
        }}
      >
        <DialogContent className="rounded-3xl border-0 shadow-premium">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
              <AlertCircle className="text-rose-500" size={24} />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium leading-relaxed">
              Are you sure you want to delete this PPN In/Out record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-4">
            <Button variant="ghost" onClick={() => setRecordToDelete(null)} disabled={isDeleting} className="rounded-xl font-bold uppercase tracking-widest text-[11px]">Cancel</Button>
            <Button onClick={handleDelete} disabled={isDeleting} className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold uppercase tracking-widest text-[11px]">
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DetailModal
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        title="PPN In/Out Details"
        subtitle={selectedViewRecord?.colC}
        data={[
          { label: "No", value: selectedViewRecord?.rowNo ?? "-" },
          ...cols.map(c => ({ label: c.l, value: selectedViewRecord?.[c.k] })),
        ]}
      />
    </div>
  );
}
