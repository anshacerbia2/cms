import { Fragment, useState, useMemo, useCallback, useEffect } from "react";
import { HistoryDialog, historyTitle } from '@/features/audit-logs/components/HistoryDialog';
import { Decimal } from "decimal.js";
import { ShoppingCart, Search, FilterX } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSales } from "../../finance/hooks/useSales";
import { useAccountColumns, accountKey } from "../../finance/hooks/useAccountColumns";
import { PaginationControls } from "@/components/common/PaginationControls";
import { ExcelColumnFilter } from "../../finance/components/ExcelColumnFilter";
import { LedgerErrorBoundary } from "../../finance/components/LedgerErrorBoundary";
import { formatCurrency, formatDate, cleanAmount, getAmountColor } from "@/lib/utils";
import { useExcelFilter } from "../../finance/hooks/useExcelFilter";

import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/common/PageContainer";
import AddSalesModal from "../components/AddSalesModal";
import { useAuthStore } from "@/store/authStore";
import { Download, Plus, AlertCircle, FileSpreadsheet, FileText } from "lucide-react";
import { downloadExcelFile, downloadPdfFile, exportFilter } from "@/lib/downloadFile";
import { toast } from "sonner";
import { SalesDisplayRow } from "../components/SalesDisplayRow";
import { SalesInlineEditRow, SalesInlineInsertRows } from "../components/SalesInlineRows";
import { draftPayload, type SalesDraft } from "../components/SalesRowEditor";
import { DetailModal } from "@/components/common/DetailModal";
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

export default function SalesPage() {
  const { can } = useAuthStore();
  const [historyRow, setHistoryRow] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // Menyunting dan menyisip langsung di tabel, seperti Bank Statement. Satu per satu:
  // selama ada yang diketik, tombol sunting/sisip baris lain dikunci.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [insertAfterId, setInsertAfterId] = useState<number | null>(null);
  // Sisip di atas baris No 1 - satu-satunya tempat yang tidak bisa dicapai dengan
  // "sisip di bawah baris sebelumnya". Disimpan dengan afterId null (paling atas).
  const [insertAboveId, setInsertAboveId] = useState<number | null>(null);
  const [savingInline, setSavingInline] = useState(false);
  const inlineBusy = editingId !== null || insertAfterId !== null || insertAboveId !== null;
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedViewRecord, setSelectedViewRecord] = useState<any>(null);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const salesLimit = 10;

  const [salesYearFilter, setSalesYearFilter] = useState(new Date().getFullYear().toString());
  const yearNum = useMemo(() => Number(salesYearFilter), [salesYearFilter]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2025; y--) {
      years.push(y.toString());
    }
    return years;
  }, []);

  const { getAllSales, deleteSales, updateSales, insertSales } = useSales();
  // mutateAsync stabil antar render; objek mutasinya tidak.
  const updateSalesAsync = updateSales.mutateAsync;
  const insertSalesAsync = insertSales.mutateAsync;
  const accountColumns = useAccountColumns(
    "sales",
    salesYearFilter !== "all" ? yearNum : undefined,
    { enabled: !!salesYearFilter }
  );
  const { data: allSalesRaw, isLoading: salesLoading, refetch: refetchSales } = getAllSales(
    salesYearFilter !== "all" ? yearNum : undefined,
    { enabled: !!salesYearFilter }
  );

  /** Filter rentang kolom No (inklusif), seperti Bank Statement. */
  const [rowNoRange, setRowNoRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const isRowNoRangeActive = rowNoRange.min !== null || rowNoRange.max !== null;

  // Rentang No disaring di sini, sebelum filter kolom lain, supaya daftar nilai
  // di filter lain, subtotal, dan grand total ikut mengikuti rentangnya.
  const displaySales = useMemo(() => {
    const inRange = (row: any) => {
      if (!isRowNoRangeActive) return true;
      const no = row.rowNo === null || row.rowNo === undefined ? null : row.rowNo;
      if (no === null) return false;
      return (rowNoRange.min === null || no >= rowNoRange.min) && (rowNoRange.max === null || no <= rowNoRange.max);
    };
    return (allSalesRaw || []).filter(inRange).map((row: any) => ({
      ...row,
      colB: row.colB || "-",
      rawColC: row.colC,
      colC: formatDate(row.colC),
      colD: row.colD || "-",
      colE: row.colE || "-",
      colF: row.colF || "-",
      colG: row.colG || "-",
      colH: formatCurrency(row.colH),
      colI: formatCurrency(row.colI),
      colJ: formatCurrency(row.colJ),
      colK: formatCurrency(row.colK),
      rawColL: row.colL,
      colL: formatDate(row.colL),
      colM: formatCurrency(row.colM),
      colN: formatCurrency(row.colN),
      colO: formatCurrency(row.colO),
      colP: formatCurrency(row.colP),
      colQ: formatCurrency(row.colQ),
      colR: formatCurrency(row.colR),
      colS: formatCurrency(row.colS),
      colT: formatCurrency(row.colT),
      colU: formatCurrency(row.colU),
      colV: formatCurrency(row.colV),
      colW: formatCurrency(row.colW),
      colX: formatCurrency(row.colX),
      colZ: formatCurrency(row.colZ),
      colAA: formatCurrency(row.colAA),
      colAB: formatCurrency(row.colAB),
      colAC: formatCurrency(row.colAC),
      colAD: row.colAD || "-",
      // The same payment figures the colM..colW columns carry, keyed by
      // account so the table can show whichever accounts this year used.
      ...Object.fromEntries(
        (row.amounts ?? []).map((a: any) => [accountKey(a.accountId), formatCurrency(a.amount)])
      ),
    }));
  }, [allSalesRaw, isRowNoRangeActive, rowNoRange]);

  const {
    page: salesPage,
    setPage: setSalesPage,
    search: salesSearch,
    setSearch: setSalesSearch,
    filters: salesFilters,
    setFilters: setSalesFilters,
    sort: salesSort,
    setSort: setSalesSort,
    getCascadingData,
    filteredAndSortedData: filteredAndSortedSales,
    clearFilters: handleClearFiltersBase,
    isAnyFilterActive: isExcelFilterActive
  } = useExcelFilter({
    data: displaySales,
    searchFields: ['colB', 'colD', 'colE', 'colF', 'colG']
  });

  const handleClearFilters = () => {
    handleClearFiltersBase();
    setRowNoRange({ min: null, max: null });
  };

  const isAnyFilterActive = isExcelFilterActive || isRowNoRangeActive;

  const paginatedSales = useMemo(() => {
    const start = (salesPage - 1) * salesLimit;
    return filteredAndSortedSales.slice(start, start + salesLimit);
  }, [filteredAndSortedSales, salesPage, salesLimit]);

  const canEdit = can('sales.update');
  const canCreate = can('sales.create');
  const canDelete = can('sales.delete');
  const canHistory = can('audit-logs.index');

  // Jaring pengaman untuk semua cara lain baris itu hilang dari layar - pindah
  // halaman, filter kolom, pencarian. Tanpa ini editornya lenyap tapi statusnya
  // masih "sedang mengetik", dan semua tombol edit/sisip terkunci tanpa ada
  // tombol Batal yang bisa dipencet.
  useEffect(() => {
    const visible = (id: number) => paginatedSales.some((r: any) => r.id === id);
    if (editingId !== null && !visible(editingId)) setEditingId(null);
    if (insertAfterId !== null && !visible(insertAfterId)) setInsertAfterId(null);
    if (insertAboveId !== null && !visible(insertAboveId)) setInsertAboveId(null);
  }, [paginatedSales, editingId, insertAfterId, insertAboveId]);

  const salesMeta = {
    total: filteredAndSortedSales.length,
    page: salesPage,
    limit: salesLimit,
    lastPage: Math.ceil(filteredAndSortedSales.length / salesLimit) || 1
  };

  // Baris mentah dari API, sebelum diformat - sumber draf yang disunting.
  const rawById = useMemo(
    () => new Map<number, any>((allSalesRaw || []).map((r: any) => [r.id, r])),
    [allSalesRaw],
  );

  // Semua callback baris stabil (useCallback), supaya SalesDisplayRow yang
  // di-memo tidak ikut dirender ulang setiap halaman berubah.
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

  // Ganti tahun, pencarian, filter kolom, urutan, atau rentang No: baris yang
  // sedang diketik dibatalkan. Isi tabelnya sudah bukan yang tadi, dan menyisip
  // "di bawah baris ini" di tampilan yang tersaring atau terurut lain
  // membingungkan - posisinya tetap menurut urutan register.
  useEffect(() => {
    cancelInline();
  }, [salesYearFilter, salesSearch, salesFilters, salesSort, rowNoRange, cancelInline]);

  const saveEdit = useCallback(
    async (draft: SalesDraft) => {
      if (editingId === null || savingInline) return;
      setSavingInline(true);
      try {
        await updateSalesAsync({ id: editingId, data: draftPayload(draft) });
        toast.success("Sales record updated.");
        setEditingId(null);
        refetchSales();
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Failed to update sales record.");
      } finally {
        setSavingInline(false);
      }
    },
    [editingId, savingInline, updateSalesAsync, refetchSales],
  );

  const saveInsert = useCallback(
    async (drafts: SalesDraft[]) => {
      const anchorId = insertAboveId ?? insertAfterId;
      if (anchorId === null || savingInline) return;
      const anchor = rawById.get(anchorId);
      if (!anchor) return;
      setSavingInline(true);
      try {
        // Sisip atas hanya ada di baris No 1, jadi "di atasnya" = paling atas.
        await insertSalesAsync({
          rows: drafts.map(draftPayload),
          tagYear: anchor.tagYear,
          afterId: insertAboveId !== null ? null : insertAfterId,
        });
        setInsertAfterId(null);
        setInsertAboveId(null);
        refetchSales();
      } catch {
        // insertSales sudah menampilkan pesan galatnya; draf tetap di layar.
      } finally {
        setSavingInline(false);
      }
    },
    [insertAfterId, insertAboveId, savingInline, rawById, insertSalesAsync, refetchSales],
  );

  const handleDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSales.mutateAsync(recordToDelete);
      toast.success("Sales record deleted successfully.");
      refetchSales();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete record.");
    } finally {
      setIsDeleting(false);
      setRecordToDelete(null);
    }
  };


  /** Adds up one account column across the rows given. */
  const sumAccounts = (rows: any[]) =>
    Object.fromEntries(
      accountColumns.map((account) => [
        accountKey(account.id),
        rows.reduce(
          (total, row) => total.plus(new Decimal(cleanAmount(row[accountKey(account.id)]))),
          new Decimal(0),
        ),
      ]),
    );

  const salesGrandTotals = useMemo(() => {
    const byColumn = filteredAndSortedSales.reduce((acc: any, curr: any) => ({
      colH: acc.colH.plus(new Decimal(cleanAmount(curr.colH))),
      colI: acc.colI.plus(new Decimal(cleanAmount(curr.colI))),
      colJ: acc.colJ.plus(new Decimal(cleanAmount(curr.colJ))),
      colK: acc.colK.plus(new Decimal(cleanAmount(curr.colK))),
      colM: acc.colM.plus(new Decimal(cleanAmount(curr.colM))),
      colN: acc.colN.plus(new Decimal(cleanAmount(curr.colN))),
      colO: acc.colO.plus(new Decimal(cleanAmount(curr.colO))),
      colP: acc.colP.plus(new Decimal(cleanAmount(curr.colP))),
      colQ: acc.colQ.plus(new Decimal(cleanAmount(curr.colQ))),
      colR: acc.colR.plus(new Decimal(cleanAmount(curr.colR))),
      colS: acc.colS.plus(new Decimal(cleanAmount(curr.colS))),
      colT: acc.colT.plus(new Decimal(cleanAmount(curr.colT))),
      colU: acc.colU.plus(new Decimal(cleanAmount(curr.colU))),
      colV: acc.colV.plus(new Decimal(cleanAmount(curr.colV))),
      colW: acc.colW.plus(new Decimal(cleanAmount(curr.colW))),
      colX: acc.colX.plus(new Decimal(cleanAmount(curr.colX))),
      colZ: acc.colZ.plus(new Decimal(cleanAmount(curr.colZ))),
      colAA: acc.colAA.plus(new Decimal(cleanAmount(curr.colAA))),
      colAB: acc.colAB.plus(new Decimal(cleanAmount(curr.colAB))),
      colAC: acc.colAC.plus(new Decimal(cleanAmount(curr.colAC))),
    }), { 
      colH: new Decimal(0), colI: new Decimal(0), colJ: new Decimal(0), colK: new Decimal(0), colM: new Decimal(0), 
      colN: new Decimal(0), colO: new Decimal(0), colP: new Decimal(0), colQ: new Decimal(0), colR: new Decimal(0), 
      colS: new Decimal(0), colT: new Decimal(0), colU: new Decimal(0), colV: new Decimal(0), colW: new Decimal(0), 
      colX: new Decimal(0), colZ: new Decimal(0), colAA: new Decimal(0), colAB: new Decimal(0), colAC: new Decimal(0),
    });
    return { ...byColumn, ...sumAccounts(filteredAndSortedSales) };
  }, [filteredAndSortedSales, accountColumns]);

  const salesPageSubtotals = useMemo(() => {
    const byColumn = paginatedSales.reduce((acc: any, curr: any) => ({
      colH: acc.colH.plus(new Decimal(cleanAmount(curr.colH))),
      colI: acc.colI.plus(new Decimal(cleanAmount(curr.colI))),
      colJ: acc.colJ.plus(new Decimal(cleanAmount(curr.colJ))),
      colK: acc.colK.plus(new Decimal(cleanAmount(curr.colK))),
      colM: acc.colM.plus(new Decimal(cleanAmount(curr.colM))),
      colN: acc.colN.plus(new Decimal(cleanAmount(curr.colN))),
      colO: acc.colO.plus(new Decimal(cleanAmount(curr.colO))),
      colP: acc.colP.plus(new Decimal(cleanAmount(curr.colP))),
      colQ: acc.colQ.plus(new Decimal(cleanAmount(curr.colQ))),
      colR: acc.colR.plus(new Decimal(cleanAmount(curr.colR))),
      colS: acc.colS.plus(new Decimal(cleanAmount(curr.colS))),
      colT: acc.colT.plus(new Decimal(cleanAmount(curr.colT))),
      colU: acc.colU.plus(new Decimal(cleanAmount(curr.colU))),
      colV: acc.colV.plus(new Decimal(cleanAmount(curr.colV))),
      colW: acc.colW.plus(new Decimal(cleanAmount(curr.colW))),
      colX: acc.colX.plus(new Decimal(cleanAmount(curr.colX))),
      colZ: acc.colZ.plus(new Decimal(cleanAmount(curr.colZ))),
      colAA: acc.colAA.plus(new Decimal(cleanAmount(curr.colAA))),
      colAB: acc.colAB.plus(new Decimal(cleanAmount(curr.colAB))),
      colAC: acc.colAC.plus(new Decimal(cleanAmount(curr.colAC))),
    }), { 
      colH: new Decimal(0), colI: new Decimal(0), colJ: new Decimal(0), colK: new Decimal(0), colM: new Decimal(0), 
      colN: new Decimal(0), colO: new Decimal(0), colP: new Decimal(0), colQ: new Decimal(0), colR: new Decimal(0), 
      colS: new Decimal(0), colT: new Decimal(0), colU: new Decimal(0), colV: new Decimal(0), colW: new Decimal(0), 
      colX: new Decimal(0), colZ: new Decimal(0), colAA: new Decimal(0), colAB: new Decimal(0), colAC: new Decimal(0),
    });
    return { ...byColumn, ...sumAccounts(paginatedSales) };
  }, [paginatedSales, accountColumns]);

  return (
    <PageContainer>
      <PageHeader 
        title="Sales"
        description="Manage and track your sales transactions."
        icon={ShoppingCart}
      />

      {/* Filters & Actions */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm mt-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search sales records..." 
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 text-[13px] font-medium"
            value={salesSearch}
            onChange={(e) => { setSalesSearch(e.target.value); setSalesPage(1); }}
          />
        </div>
        <Select value={salesYearFilter} onValueChange={(v) => { setSalesYearFilter(v); setSalesPage(1); setRowNoRange({ min: null, max: null }); }}>
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
          
          {can('sales.create') && (
            <Button 
              onClick={(e) => { e.stopPropagation(); cancelInline(); setIsAddModalOpen(true); }}
              className="h-12 px-6 flex-1 xl:flex-none bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-sm flex items-center justify-center gap-2 font-bold disabled:opacity-50 disabled:grayscale transition-all active:scale-95 cursor-pointer"
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
                onClick={() => downloadExcelFile(`/finance/sales/export/excel${salesYearFilter !== 'all' ? `?year=${salesYearFilter}` : ''}`, `Sales_${salesYearFilter !== 'all' ? salesYearFilter : 'All'}.xlsx`, exportFilter(isAnyFilterActive, filteredAndSortedSales))}
                className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-emerald-600 transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet size={16} strokeWidth={2.5} />
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => downloadPdfFile(`/finance/sales/export/pdf${salesYearFilter !== 'all' ? `?year=${salesYearFilter}` : ''}`, `Sales_${salesYearFilter !== 'all' ? salesYearFilter : 'All'}.pdf`, exportFilter(isAnyFilterActive, filteredAndSortedSales))}
                className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-rose-600 transition-colors flex items-center gap-2"
              >
                <FileText size={16} strokeWidth={2.5} />
                Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-premium border border-primary/5 overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <LedgerErrorBoundary onReset={cancelInline} title="The sales table could not be displayed.">
          <Table className="min-w-[4200px]">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap">
                <TableHead className="pl-8 w-20 px-4">
                  <div className="flex items-center gap-1">No <ExcelColumnFilter columnKey="rowNo" label="No" data={[]} activeFilters={null} onFilterChange={() => {}} sortOnly sortLabels={['1 → 9', '9 → 1']} range={rowNoRange} onRangeChange={(r) => { setRowNoRange(r); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key: "rowNo", direction: d}); setSalesPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-40 px-4">
                  <div className="flex items-center gap-1">Invoice No <ExcelColumnFilter columnKey="colB" label="Invoice No" data={getCascadingData("colB")} activeFilters={salesFilters["colB"]} onFilterChange={(v: Set<string> | null) => { setSalesFilters(p => ({...p, colB: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key: "colB", direction: d}); setSalesPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-32 px-4">
                  <div className="flex items-center gap-1">Date <ExcelColumnFilter columnKey="colC" label="Date" data={getCascadingData("colC")} activeFilters={salesFilters["colC"]} onFilterChange={(v: Set<string> | null) => { setSalesFilters(p => ({...p, colC: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key: "colC", direction: d}); setSalesPage(1); }} type="date" dateKey="rawColC" /></div>
                </TableHead>
                <TableHead className="w-20 px-4">
                  <div className="flex items-center gap-1">Year <ExcelColumnFilter columnKey="colD" label="Year" data={getCascadingData("colD")} activeFilters={salesFilters["colD"]} onFilterChange={(v: Set<string> | null) => { setSalesFilters(p => ({...p, colD: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key: "colD", direction: d}); setSalesPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-48 px-4">
                  <div className="flex items-center gap-1">Billing To <ExcelColumnFilter columnKey="colE" label="Billing To" data={getCascadingData("colE")} activeFilters={salesFilters["colE"]} onFilterChange={(v: Set<string> | null) => { setSalesFilters(p => ({...p, colE: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key: "colE", direction: d}); setSalesPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-32 px-4">
                  <div className="flex items-center gap-1">Sales Code <ExcelColumnFilter columnKey="colF" label="Sales Code" data={getCascadingData("colF")} activeFilters={salesFilters["colF"]} onFilterChange={(v: Set<string> | null) => { setSalesFilters(p => ({...p, colF: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key: "colF", direction: d}); setSalesPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-64 px-4">
                  <div className="flex items-center gap-1">Description <ExcelColumnFilter columnKey="colG" label="Description" data={getCascadingData("colG")} activeFilters={salesFilters["colG"]} onFilterChange={(v: Set<string> | null) => { setSalesFilters(p => ({...p, colG: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key: "colG", direction: d}); setSalesPage(1); }} /></div>
                </TableHead>

                <TableHead className="w-40 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">Basic Price <ExcelColumnFilter columnKey="colH" label="Basic Price" data={getCascadingData("colH")} activeFilters={salesFilters["colH"]} onFilterChange={(v: Set<string> | null) => { setSalesFilters(p => ({...p, colH: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key: "colH", direction: d}); setSalesPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-40 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">Mgmt Fee <ExcelColumnFilter columnKey="colI" label="Mgmt Fee" data={getCascadingData("colI")} activeFilters={salesFilters["colI"]} onFilterChange={(v: Set<string> | null) => { setSalesFilters(p => ({...p, colI: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key: "colI", direction: d}); setSalesPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-40 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">PPN <ExcelColumnFilter columnKey="colJ" label="PPN" data={getCascadingData("colJ")} activeFilters={salesFilters["colJ"]} onFilterChange={(v: Set<string> | null) => { setSalesFilters(p => ({...p, colJ: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key: "colJ", direction: d}); setSalesPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-40 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">AR IDR <ExcelColumnFilter columnKey="colK" label="AR IDR" data={getCascadingData("colK")} activeFilters={salesFilters["colK"]} onFilterChange={(v: Set<string> | null) => { setSalesFilters(p => ({...p, colK: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key: "colK", direction: d}); setSalesPage(1); }} /></div>
                </TableHead>
                {/* <TableHead className="w-40 px-4">
                  <div className="flex items-center gap-1">Date Received <ExcelColumnFilter columnKey="colL" label="Date Received" data={getCascadingData("colL")} activeFilters={salesFilters["colL"]} onFilterChange={(v: Set<string> | null) => { setSalesFilters(p => ({...p, colL: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key: "colL", direction: d}); setSalesPage(1); }} type="date" dateKey="rawColL" /></div>
                </TableHead> */}

                {/* One column per account that actually took money this year.
                    The header, the order and which accounts appear at all come
                    from Account & Bank, not from this file. */}
                {accountColumns.map((account) => {
                  const key = accountKey(account.id);
                  return (
                    <TableHead key={key} className="w-40 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">{account.name} <ExcelColumnFilter columnKey={key} label={account.name} data={getCascadingData(key)} activeFilters={salesFilters[key]} onFilterChange={(v: Set<string> | null) => { setSalesFilters(p => ({...p, [key]: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key, direction: d}); setSalesPage(1); }} /></div>
                    </TableHead>
                  );
                })}
                <TableHead className="w-40 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">Outstanding <ExcelColumnFilter columnKey="colX" label="Outstanding" data={getCascadingData("colX")} activeFilters={salesFilters["colX"]} onFilterChange={(v: Set<string> | null) => { setSalesFilters(p => ({...p, colX: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key: "colX", direction: d}); setSalesPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-40 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">AP PPN <ExcelColumnFilter columnKey="colZ" label="AP PPN" data={getCascadingData("colZ")} activeFilters={salesFilters["colZ"]} onFilterChange={(v: Set<string> | null) => { setSalesFilters(p => ({...p, colZ: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key: "colZ", direction: d}); setSalesPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-40 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">PPh 23 <ExcelColumnFilter columnKey="colAA" label="PPh 23" data={getCascadingData("colAA")} activeFilters={salesFilters["colAA"]} onFilterChange={(v: Set<string> | null) => { setSalesFilters(p => ({...p, colAA: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key: "colAA", direction: d}); setSalesPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-40 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">WAPU <ExcelColumnFilter columnKey="colAB" label="WAPU" data={getCascadingData("colAB")} activeFilters={salesFilters["colAB"]} onFilterChange={(v: Set<string> | null) => { setSalesFilters(p => ({...p, colAB: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key: "colAB", direction: d}); setSalesPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-40 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">Non WAPU <ExcelColumnFilter columnKey="colAC" label="Non WAPU" data={getCascadingData("colAC")} activeFilters={salesFilters["colAC"]} onFilterChange={(v: Set<string> | null) => { setSalesFilters(p => ({...p, colAC: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key: "colAC", direction: d}); setSalesPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-64 px-4 pr-8">
                  <div className="flex items-center gap-1">Remarks <ExcelColumnFilter columnKey="colAD" label="Remarks" data={getCascadingData("colAD")} activeFilters={salesFilters["colAD"]} onFilterChange={(v: Set<string> | null) => { setSalesFilters(p => ({...p, colAD: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d: 'asc' | 'desc') => { setSalesSort({key: "colAD", direction: d}); setSalesPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-24 px-4 pr-8 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesLoading ? (
                <TableRow>
                  <TableCell colSpan={18 + accountColumns.length} className="h-96 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Synchronizing Global Sales Data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={18 + accountColumns.length} className="h-64 text-center opacity-20">
                    <Search size={48} className="mx-auto" />
                    <p className="mt-4 font-black uppercase tracking-widest">No sales records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedSales.map((row: any) => (
                    <Fragment key={row.id}>
                      {insertAboveId === row.id && (
                        <SalesInlineInsertRows
                          accountColumns={accountColumns}
                          anchorRowNo={0}
                          colSpan={18 + accountColumns.length}
                          saving={savingInline}
                          onSave={saveInsert}
                          onCancel={cancelInline}
                        />
                      )}
                      {editingId === row.id ? (
                        <SalesInlineEditRow
                          raw={rawById.get(row.id)}
                          accountColumns={accountColumns}
                          saving={savingInline}
                          onSave={saveEdit}
                          onCancel={cancelInline}
                        />
                      ) : (
                        <SalesDisplayRow
                          row={row}
                          accountColumns={accountColumns}
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
                        <SalesInlineInsertRows
                          accountColumns={accountColumns}
                          anchorRowNo={row.rowNo}
                          colSpan={18 + accountColumns.length}
                          saving={savingInline}
                          onSave={saveInsert}
                          onCancel={cancelInline}
                        />
                      )}
                    </Fragment>
                  ))}
                  {/* Summary Rows */}
                  {/* Subtotal (Current Page) */}
                  <TableRow className="bg-secondary/5 border-t-2 border-secondary/30 hover:bg-secondary/5 transition-none font-bold">
                    <TableCell colSpan={7} className="pl-8 py-3 text-[11px] text-secondary/80 uppercase tracking-[0.2em]">
                      Subtotal (Page {salesPage})
                    </TableCell>
                    <TableCell className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(salesPageSubtotals.colH.toString())}`}>{formatCurrency(salesPageSubtotals.colH.toString())}</TableCell>
                    <TableCell className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(salesPageSubtotals.colI.toString())}`}>{formatCurrency(salesPageSubtotals.colI.toString())}</TableCell>
                    <TableCell className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(salesPageSubtotals.colJ.toString())}`}>{formatCurrency(salesPageSubtotals.colJ.toString())}</TableCell>
                    <TableCell className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(salesPageSubtotals.colK.toString())}`}>{formatCurrency(salesPageSubtotals.colK.toString())}</TableCell>
                    {/* <TableCell className="py-3 bg-secondary/[0.01]" /> */}
                    {accountColumns.map((account) => (
                      <TableCell key={account.id} className="py-3 text-right text-emerald-600/90 pr-4 whitespace-nowrap">{formatCurrency(((salesPageSubtotals as any)[accountKey(account.id)] ?? 0).toString())}</TableCell>
                    ))}
                    <TableCell className="py-3 text-right text-rose-600/90 pr-4 whitespace-nowrap">{formatCurrency(salesPageSubtotals.colX.toString())}</TableCell>
                    <TableCell className="py-3 text-right text-rose-600/90 pr-4 whitespace-nowrap">{formatCurrency(salesPageSubtotals.colZ.toString())}</TableCell>
                    <TableCell className="py-3 text-right text-rose-600/90 pr-4 whitespace-nowrap">{formatCurrency(salesPageSubtotals.colAA.toString())}</TableCell>
                    <TableCell className="py-3 text-right text-rose-600/90 pr-4 whitespace-nowrap">{formatCurrency(salesPageSubtotals.colAB.toString())}</TableCell>
                    <TableCell className="py-3 text-right text-rose-600/90 pr-4 whitespace-nowrap">{formatCurrency(salesPageSubtotals.colAC.toString())}</TableCell>
                    <TableCell className="py-3 bg-secondary/[0.02]" />
                    <TableCell></TableCell>
                  </TableRow>

                  {/* Grand Total (All Pages) */}
                  <TableRow className="bg-secondary/10 border-t border-secondary/30 hover:bg-secondary/10 transition-none font-bold">
                    <TableCell colSpan={7} className="pl-8 py-3 text-[11px] text-secondary uppercase tracking-[0.2em]">
                      Grand Total ({salesMeta.total} rows)
                    </TableCell>
                    <TableCell className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(salesGrandTotals.colH.toString())}`}>{formatCurrency(salesGrandTotals.colH.toString())}</TableCell>
                    <TableCell className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(salesGrandTotals.colI.toString())}`}>{formatCurrency(salesGrandTotals.colI.toString())}</TableCell>
                    <TableCell className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(salesGrandTotals.colJ.toString())}`}>{formatCurrency(salesGrandTotals.colJ.toString())}</TableCell>
                    <TableCell className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(salesGrandTotals.colK.toString())}`}>{formatCurrency(salesGrandTotals.colK.toString())}</TableCell>
                    {/* <TableCell className="py-3 bg-secondary/[0.02]" /> */}
                    {accountColumns.map((account) => (
                      <TableCell key={account.id} className="py-3 text-right text-emerald-600/90 pr-4 whitespace-nowrap">{formatCurrency(((salesGrandTotals as any)[accountKey(account.id)] ?? 0).toString())}</TableCell>
                    ))}
                    <TableCell className="py-3 text-right text-rose-600/90 pr-4 whitespace-nowrap">{formatCurrency(salesGrandTotals.colX.toString())}</TableCell>
                    <TableCell className="py-3 text-right text-rose-600/90 pr-4 whitespace-nowrap">{formatCurrency(salesGrandTotals.colZ.toString())}</TableCell>
                    <TableCell className="py-3 text-right text-rose-600/90 pr-4 whitespace-nowrap">{formatCurrency(salesGrandTotals.colAA.toString())}</TableCell>
                    <TableCell className="py-3 text-right text-rose-600/90 pr-4 whitespace-nowrap">{formatCurrency(salesGrandTotals.colAB.toString())}</TableCell>
                    <TableCell className="py-3 text-right text-rose-600/90 pr-4 whitespace-nowrap">{formatCurrency(salesGrandTotals.colAC.toString())}</TableCell>
                    <TableCell className="py-3 bg-secondary/[0.03]" />
                    <TableCell></TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
          </LedgerErrorBoundary>
        </div>
      </div>
      <PaginationControls meta={salesMeta} onPageChange={setSalesPage} isFetching={salesLoading} />
      <AddSalesModal 
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        year={yearNum}
        onSuccess={() => {
          refetchSales();
          toast.success("Sales data refreshed successfully");
        }}
      />
      <HistoryDialog
        open={historyRow !== null}
        onOpenChange={(o) => { if (!o) setHistoryRow(null); }}
        table="sales_records"
        rowId={historyRow?.id}
        title={historyTitle(historyRow?.colB, historyRow?.colF)}
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
              Are you sure you want to delete this sales record? This action cannot be undone.
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
        title="Sales Details"
        subtitle={`Invoice No: ${selectedViewRecord?.colB}`}
        data={[
          { label: "No", value: selectedViewRecord?.rowNo ?? "-" },
          { label: "Invoice No", value: selectedViewRecord?.colB },
          { label: "Date", value: selectedViewRecord?.colC },
          { label: "Year", value: selectedViewRecord?.colD },
          { label: "Billing To", value: selectedViewRecord?.colE },
          { label: "Sales Code", value: selectedViewRecord?.colF },
          { label: "Description", value: selectedViewRecord?.colG },
          { label: "Basic Price", value: selectedViewRecord?.colH },
          { label: "Mgmt Fee", value: selectedViewRecord?.colI },
          { label: "PPN", value: selectedViewRecord?.colJ },
          { label: "AR IDR", value: selectedViewRecord?.colK },
          { label: "BCA Sahardjo", value: selectedViewRecord?.colM },
          { label: "BCA Juanda", value: selectedViewRecord?.colN },
          { label: "Mandiri Mid", value: selectedViewRecord?.colO },
          { label: "Mandiri Plasa", value: selectedViewRecord?.colP },
          { label: "BRI Tebet", value: selectedViewRecord?.colQ },
          { label: "BRI Sahardjo", value: selectedViewRecord?.colR },
          { label: "BTN", value: selectedViewRecord?.colS },
          { label: "Bank Raya", value: selectedViewRecord?.colT },
          { label: "BNI", value: selectedViewRecord?.colU },
          { label: "Cash IDR", value: selectedViewRecord?.colV },
          { label: "Non CB", value: selectedViewRecord?.colW },
          { label: "Outstanding", value: selectedViewRecord?.colX },
          { label: "AP PPN", value: selectedViewRecord?.colZ },
          { label: "PPh 23", value: selectedViewRecord?.colAA },
          { label: "WAPU", value: selectedViewRecord?.colAB },
          { label: "Non WAPU", value: selectedViewRecord?.colAC },
          { label: "Remarks", value: selectedViewRecord?.colAD },
        ]}
      />
    </PageContainer>
  );
}
