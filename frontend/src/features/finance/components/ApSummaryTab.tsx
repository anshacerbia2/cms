import { useState, useMemo } from "react";
import { Search, FilterX } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAccountColumns, accountKey } from "../hooks/useAccountColumns";
import { useAccountPayable } from "../hooks/useAccountPayable";
import { PaginationControls } from "@/components/common/PaginationControls";
import { ExcelColumnFilter } from "./ExcelColumnFilter";
import AddApLedgerModal from "./AddApLedgerModal";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Plus, Edit2, Trash2, AlertCircle, Download, FileSpreadsheet, FileText, Eye } from "lucide-react";
import { downloadExcelFile, downloadPdfFile, exportFilter } from "@/lib/downloadFile";
import { DetailModal } from "@/components/common/DetailModal";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Decimal } from "decimal.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import EditApLedgerModal from "./EditApLedgerModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExcelFilter } from "../hooks/useExcelFilter";

/** This table's own number parser, kept exactly as the totals have always
 * read it, so moving the columns cannot move the figures. */
const clean = (val: any) => {
  const s = String(val || "0");
  if (s === "-" || s === "") return "0";
  let cleaned = s.replace(/[A-Z]{3}\s?/g, "");
  cleaned = cleaned.replace(/\./g, "");
  cleaned = cleaned.replace(/,/g, ".");
  return cleaned.replace(/[^0-9.-]+/g, "") || "0";
};

export function ApSummaryTab() {
  const { can } = useAuthStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const apLimit = 10;

  const [apYearFilter, setApYearFilter] = useState(new Date().getFullYear().toString());
  const yearNum = useMemo(() => Number(apYearFilter), [apYearFilter]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2025; y--) {
      years.push(y.toString());
    }
    return years;
  }, []);

  const { getAllAP, deleteAP } = useAccountPayable();
  const accountColumns = useAccountColumns(
    "account-payable",
    apYearFilter !== "all" ? yearNum : undefined,
    { enabled: !!apYearFilter }
  );

  /** Adds up one account column across the rows given. */
  const sumAccounts = (rows: any[]) =>
    Object.fromEntries(
      accountColumns.map((account) => [
        accountKey(account.id),
        rows.reduce(
          (total, row) => total.plus(new Decimal(clean(row[accountKey(account.id)]))),
          new Decimal(0),
        ),
      ]),
    );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [selectedViewRecord, setSelectedViewRecord] = useState<any>(null);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: allAPRaw, isLoading: apLoading, refetch } = getAllAP(
    apYearFilter !== "all" ? yearNum : undefined,
    { enabled: !!apYearFilter }
  );
  const displayAP = useMemo(() => {
    return (allAPRaw || []).map((row: any) => ({
      ...row,
      colA: row.colA || "-",
      colB: row.colB || "-",
      colC: row.colC || "-",
      colD: row.colD || "-",
      colE: formatCurrency(row.colE || 0),   // Beginning Balance
      colH: row.colH || "-",
      colI: row.colI || "-",
      // colJ are plain strings
      colK: formatCurrency(row.colK),        // BCA Shardjo
      colL: formatCurrency(row.colL),        // BCA Juanda
      colM: formatCurrency(row.colM),        // Mandiri Mid Plaza
      colN: formatCurrency(row.colN),        // BTN
      colO: formatCurrency(row.colO),        // BRI Shardjo
      colP: formatCurrency(row.colP),        // BRI Tebet
      colQ: formatCurrency(row.colQ),        // Cash IDR
      colR: formatCurrency(row.colR),        // Non CB
      colS: formatCurrency(row.colS),        // AP In and Out
      colU: formatCurrency(row.colU),        // Ending Balance
      // The same figures the fixed columns carry, keyed by account.
      ...Object.fromEntries(
        (row.amounts ?? []).map((a: any) => [accountKey(a.accountId), formatCurrency(a.amount)])
      ),
    }));
  }, [allAPRaw]);

  const {
    page: apPage,
    setPage: setApPage,
    search: apSearch,
    setSearch: setApSearch,
    filters: apFilters,
    setFilters: setApFilters,
    sort: apSort,
    setSort: setApSort,
    getCascadingData,
    filteredAndSortedData: filteredAndSortedAP,
    clearFilters: handleClearFilters,
    isAnyFilterActive
  } = useExcelFilter({
    data: displayAP,
    searchFields: ['colC', 'colD', 'colA', 'colH', 'colI']
  });

  const paginatedAP = useMemo(() => {
    const start = (apPage - 1) * apLimit;
    return filteredAndSortedAP.slice(start, start + apLimit);
  }, [filteredAndSortedAP, apPage, apLimit]);

  const apMeta = { 
    total: filteredAndSortedAP.length, 
    page: apPage, 
    limit: apLimit, 
    lastPage: Math.ceil(filteredAndSortedAP.length / apLimit) || 1 
  };

  const subtotalTotals = useMemo(() => {
    const byColumn = paginatedAP.reduce((acc, curr) => {
      return {
        colE: acc.colE.plus(new Decimal(clean(curr.colE))),
        colK: acc.colK.plus(new Decimal(clean(curr.colK))),
        colL: acc.colL.plus(new Decimal(clean(curr.colL))),
        colM: acc.colM.plus(new Decimal(clean(curr.colM))),
        colN: acc.colN.plus(new Decimal(clean(curr.colN))),
        colO: acc.colO.plus(new Decimal(clean(curr.colO))),
        colP: acc.colP.plus(new Decimal(clean(curr.colP))),
        colQ: acc.colQ.plus(new Decimal(clean(curr.colQ))),
        colR: acc.colR.plus(new Decimal(clean(curr.colR))),
        colS: acc.colS.plus(new Decimal(clean(curr.colS))),
        colU: acc.colU.plus(new Decimal(clean(curr.colU))),
      };
    }, {
      colE: new Decimal(0),
      colK: new Decimal(0), colL: new Decimal(0), colM: new Decimal(0),
      colN: new Decimal(0), colO: new Decimal(0), colP: new Decimal(0),
      colQ: new Decimal(0), colR: new Decimal(0), colS: new Decimal(0),
      colU: new Decimal(0),
    });
    return { ...byColumn, ...sumAccounts(paginatedAP) };
  }, [paginatedAP, accountColumns]);

  const grandTotals = useMemo(() => {
    const byColumn = filteredAndSortedAP.reduce((acc, curr) => {
      return {
        colE: acc.colE.plus(new Decimal(clean(curr.colE))),
        colK: acc.colK.plus(new Decimal(clean(curr.colK))),
        colL: acc.colL.plus(new Decimal(clean(curr.colL))),
        colM: acc.colM.plus(new Decimal(clean(curr.colM))),
        colN: acc.colN.plus(new Decimal(clean(curr.colN))),
        colO: acc.colO.plus(new Decimal(clean(curr.colO))),
        colP: acc.colP.plus(new Decimal(clean(curr.colP))),
        colQ: acc.colQ.plus(new Decimal(clean(curr.colQ))),
        colR: acc.colR.plus(new Decimal(clean(curr.colR))),
        colS: acc.colS.plus(new Decimal(clean(curr.colS))),
        colU: acc.colU.plus(new Decimal(clean(curr.colU))),
      };
    }, {
      colE: new Decimal(0),
      colK: new Decimal(0), colL: new Decimal(0), colM: new Decimal(0),
      colN: new Decimal(0), colO: new Decimal(0), colP: new Decimal(0),
      colQ: new Decimal(0), colR: new Decimal(0), colS: new Decimal(0),
      colU: new Decimal(0),
    });
    return { ...byColumn, ...sumAccounts(filteredAndSortedAP) };
  }, [filteredAndSortedAP, accountColumns]);

  const handleEdit = (row: any) => {
    const rawRecord = allAPRaw?.find((r: any) => r.id === row.id) || row;
    setSelectedRecord(rawRecord);
    setIsEditModalOpen(true);
  };

  const handleView = (row: any) => {
    setSelectedViewRecord(row);
    setIsViewModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setRecordToDelete(id);
  };

  const executeDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await deleteAP.mutateAsync(recordToDelete);
      refetch();
    } catch (error: any) {
      // toast is handled in hook
    } finally {
      setIsDeleting(false);
      setRecordToDelete(null);
    }
  };
  const getValueColor = (val: any) => {
    const num = Number(String(val || "0").replace(/[^0-9.-]+/g, ""));
    if (num > 0) return "text-emerald-600";
    if (num < 0) return "text-rose-600";
    return "text-primary/60";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search payables (Vendor, Keterangan)..." 
            className="pl-12 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 text-[13px] font-medium"
            value={apSearch}
            onChange={(e) => { setApSearch(e.target.value); setApPage(1); }}
          />
        </div>
        <Select value={apYearFilter} onValueChange={(v) => { setApYearFilter(v); setApPage(1); }}>
          <SelectTrigger className="w-[130px] h-12 px-5 bg-white border-0 rounded-xl shadow-sm flex items-center gap-2 text-muted-foreground font-bold transition-all cursor-pointer">
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
        <div className="flex items-center gap-2">
           {isAnyFilterActive && (
            <Button 
              onClick={handleClearFilters}
              className="h-12 w-12 bg-white border-0 text-muted-foreground hover:text-red-500 hover:bg-red-50/50 rounded-xl shadow-sm flex items-center justify-center shrink-0 transition-all"
              title="Clear all filters"
            >
              <FilterX size={20} strokeWidth={2} />
            </Button>
          )}
          
          {can('account-payable.create') && (
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="h-12 px-6 bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-sm flex items-center justify-center gap-2 font-bold disabled:opacity-50 transition-all active:scale-95"
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
                onClick={() => downloadExcelFile(`/finance/account-payable/export/excel${apYearFilter !== 'all' ? `?year=${apYearFilter}` : ''}`, `Account_Payable_${apYearFilter !== 'all' ? apYearFilter : 'All'}.xlsx`, exportFilter(isAnyFilterActive, filteredAndSortedAP))}
                className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-emerald-600 transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet size={16} strokeWidth={2.5} />
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => downloadPdfFile(`/finance/account-payable/export/pdf${apYearFilter !== 'all' ? `?year=${apYearFilter}` : ''}`, `Account_Payable_${apYearFilter !== 'all' ? apYearFilter : 'All'}.pdf`, exportFilter(isAnyFilterActive, filteredAndSortedAP))}
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
          <Table className="min-w-[2600px]">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap">
                <TableHead className="pl-8 w-32">
                  <div className="flex items-center justify-start gap-1">
                    Payable
                    <ExcelColumnFilter columnKey="colA" label="Payable" data={getCascadingData("colA")} activeFilters={apFilters["colA"]} onFilterChange={(v) => { setApFilters(p => ({...p, colA: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colA", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-20 px-4">
                  <div className="flex items-center gap-1">
                    Year
                    <ExcelColumnFilter columnKey="colB" label="Year" data={getCascadingData("colB")} activeFilters={apFilters["colB"]} onFilterChange={(v) => { setApFilters(p => ({...p, colB: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colB", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-48 px-4">
                  <div className="flex items-center gap-1">
                    Vendor
                    <ExcelColumnFilter columnKey="colC" label="Vendor" data={getCascadingData("colC")} activeFilters={apFilters["colC"]} onFilterChange={(v) => { setApFilters(p => ({...p, colC: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colC", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-64 px-4">
                  <div className="flex items-center gap-1">
                    Keterangan
                    <ExcelColumnFilter columnKey="colD" label="Keterangan" data={getCascadingData("colD")} activeFilters={apFilters["colD"]} onFilterChange={(v) => { setApFilters(p => ({...p, colD: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colD", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="text-right w-40 whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    Beginning Balance
                    <ExcelColumnFilter columnKey="colE" label="Beginning Balance" data={getCascadingData("colE")} activeFilters={apFilters["colE"]} onFilterChange={(v) => { setApFilters(p => ({...p, colE: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colE", direction: d})} />
                  </div>
                </TableHead>

                {/* 
                <TableHead className="w-48 px-4">
                  <div className="flex items-center gap-1">
                    Col F
                    <ExcelColumnFilter columnKey="colH" label="Col F" data={getCascadingData("colH")} activeFilters={apFilters["colH"]} onFilterChange={(v) => { setApFilters(p => ({...p, colH: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colH", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-48 px-4">
                  <div className="flex items-center gap-1">
                    Col G
                    <ExcelColumnFilter columnKey="colI" label="Col G" data={getCascadingData("colI")} activeFilters={apFilters["colI"]} onFilterChange={(v) => { setApFilters(p => ({...p, colI: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colI", direction: d})} />
                  </div>
                </TableHead>
                */}

                {/* One column per account this year's payables were settled
                    through. The header and the order come from Account & Bank. */}
                {accountColumns.map((account) => ({ key: accountKey(account.id), label: account.name })).map((col) => (
                  <TableHead key={col.key} className="text-right w-36 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {col.label}
                      <ExcelColumnFilter columnKey={col.key} label={col.label} data={getCascadingData(col.key)} activeFilters={apFilters[col.key]} onFilterChange={(v) => { setApFilters(p => ({...p, [col.key]: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: col.key, direction: d})} />
                    </div>
                  </TableHead>
                ))}

                {/* Not an account: the VAT clearing position keeps its own
                    column, read straight from colS. */}
                <TableHead className="text-right w-40 whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    AP In and Out
                    <ExcelColumnFilter columnKey="colS" label="AP In and Out" data={getCascadingData("colS")} activeFilters={apFilters["colS"]} onFilterChange={(v) => { setApFilters(p => ({...p, colS: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colS", direction: d})} />
                  </div>
                </TableHead>


                <TableHead className="text-right w-40 whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    Ending Balance
                    <ExcelColumnFilter columnKey="colU" label="Ending Balance" data={getCascadingData("colU")} activeFilters={apFilters["colU"]} onFilterChange={(v) => { setApFilters(p => ({...p, colU: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colU", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-24 px-4 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {apLoading ? (
                <TableRow>
                  <TableCell colSpan={8 + accountColumns.length} className="h-96 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 animate-pulse">Synchronizing Accounts Payable...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedAP.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8 + accountColumns.length} className="h-64 text-center opacity-20">
                    <p className="mt-4 font-black uppercase tracking-widest">No match found</p>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedAP.map((row: any) => (
                    <TableRow key={row.id} className="hover:bg-transparent transition-none whitespace-nowrap group">
                    <TableCell className="pl-8">
                       <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] font-black uppercase tracking-tight px-1.5 py-0.5">{row.colA}</Badge>
                    </TableCell>
                    <TableCell className="px-4 text-primary/60">{row.colB}</TableCell>
                    <TableCell className="px-4 font-bold text-primary uppercase truncate max-w-[150px]">{row.colC}</TableCell>
                    <TableCell className="px-4 text-primary/60 truncate max-w-[200px]" title={row.colD}>{row.colD || '-'}</TableCell>
                    <TableCell className="text-right font-medium text-primary whitespace-nowrap">{row.colE}</TableCell>
                    {/* <TableCell className="px-4 text-primary/60 truncate max-w-[150px]" title={row.colH}>{row.colH}</TableCell> */}
                    {/* <TableCell className="px-4 text-primary/60 truncate max-w-[150px]" title={row.colI}>{row.colI}</TableCell> */}

                    {accountColumns.map((account) => (
                      <TableCell key={account.id} className={`text-right font-bold whitespace-nowrap ${getValueColor(row[accountKey(account.id)])}`}>
                        {row[accountKey(account.id)]}
                      </TableCell>
                    ))}
                    <TableCell className={`text-right font-bold whitespace-nowrap ${getValueColor(row.colS)}`}>
                      {row.colS}
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary whitespace-nowrap">
                      {row.colU}
                    </TableCell>
                    <TableCell className="px-4 text-center">
                        <div className="flex items-center justify-center gap-1 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-primary/40 hover:text-primary hover:bg-primary/5 rounded-sm"
                            onClick={() => handleView(row)}
                          >
                            <Eye size={12} strokeWidth={2.5} />
                          </Button>
                          {can('account-payable.update') && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-primary/40 hover:text-primary hover:bg-primary/5 rounded-sm"
                              onClick={() => handleEdit(row)}
                            >
                              <Edit2 size={12} strokeWidth={2.5} />
                            </Button>
                          )}
                          {can('account-payable.delete') && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-rose-500/40 hover:text-rose-600 hover:bg-rose-50 rounded-sm"
                              onClick={() => handleDelete(row.id)}
                            >
                              <Trash2 size={12} strokeWidth={2.5} />
                            </Button>
                          )}
                        </div>
                    </TableCell>
                    </TableRow>
                  ))}


                  <TableRow className="bg-secondary/5 border-t-2 border-secondary/30 hover:bg-secondary/5 transition-none font-bold whitespace-nowrap">
                    <TableCell colSpan={4} className="pl-8 py-3 text-[11px] text-secondary/80 uppercase tracking-[0.2em]">
                      Subtotal (Page {apPage})
                    </TableCell>
                    <TableCell className="text-right text-primary whitespace-nowrap">{formatCurrency(subtotalTotals.colE.toString())}</TableCell>

                    {accountColumns.map((account) => (
                      <TableCell key={account.id} className={`text-right whitespace-nowrap ${getValueColor(((subtotalTotals as any)[accountKey(account.id)] ?? 0).toString())}`}>
                        {formatCurrency(((subtotalTotals as any)[accountKey(account.id)] ?? 0).toString())}
                      </TableCell>
                    ))}
                    <TableCell className={`text-right whitespace-nowrap ${getValueColor(subtotalTotals.colS.toString())}`}>{formatCurrency(subtotalTotals.colS.toString())}</TableCell>
                    <TableCell className="text-right text-primary whitespace-nowrap">{formatCurrency(subtotalTotals.colU.toString())}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>

                  <TableRow className="bg-secondary/10 border-t border-secondary/30 hover:bg-secondary/10 transition-none font-bold whitespace-nowrap">
                    <TableCell colSpan={4} className="pl-8 py-3 text-[11px] text-secondary uppercase tracking-[0.2em]">
                      Period Totals ({filteredAndSortedAP.length} results)
                    </TableCell>
                    <TableCell className="text-right text-primary whitespace-nowrap">{formatCurrency(grandTotals.colE.toString())}</TableCell>

                    {accountColumns.map((account) => (
                      <TableCell key={account.id} className={`text-right whitespace-nowrap ${getValueColor(((grandTotals as any)[accountKey(account.id)] ?? 0).toString())}`}>
                        {formatCurrency(((grandTotals as any)[accountKey(account.id)] ?? 0).toString())}
                      </TableCell>
                    ))}
                    <TableCell className={`text-right whitespace-nowrap ${getValueColor(grandTotals.colS.toString())}`}>{formatCurrency(grandTotals.colS.toString())}</TableCell>
                    <TableCell className="text-right text-primary whitespace-nowrap">{formatCurrency(grandTotals.colU.toString())}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <PaginationControls meta={apMeta} onPageChange={setApPage} isFetching={apLoading} />

      <AddApLedgerModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen} 
        year={yearNum}
        onSuccess={() => refetch()} 
      />

      <EditApLedgerModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        record={selectedRecord}
        onSuccess={() => refetch()}
      />

      <Dialog 
        open={recordToDelete !== null} 
        onOpenChange={(open) => {
          if (isDeleting) return;
          if (!open) setRecordToDelete(null);
        }}
      >
        <DialogContent className="max-w-[400px] p-0 overflow-hidden bg-white rounded-3xl border-0 shadow-2xl [&>button]:hidden">
          <div className="bg-destructive/5 p-8 flex flex-col items-center justify-center text-center border-b border-primary/5">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <DialogTitle className="text-xl font-bold text-primary mb-2">Delete Record?</DialogTitle>
            <DialogDescription className="text-[13px] font-medium text-muted-foreground leading-relaxed px-4">
              This action cannot be undone. Are you sure you want to delete this payable record?
            </DialogDescription>
          </div>
          <DialogFooter className="p-6 bg-white gap-3 flex-row justify-center sm:justify-center">
            <Button
              variant="ghost"
              onClick={() => setRecordToDelete(null)}
              disabled={isDeleting}
              className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] text-muted-foreground transition-all"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={executeDelete}
              disabled={isDeleting}
              className="flex-1 h-12 rounded-xl font-bold shadow-lg shadow-destructive/20 transition-all"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DetailModal
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        title="Account Payable Details"
        subtitle={selectedViewRecord?.colA}
        data={[
          { label: "Payable", value: selectedViewRecord?.colA },
          { label: "Year", value: selectedViewRecord?.colB },
          { label: "Vendor", value: selectedViewRecord?.colC },
          { label: "Keterangan", value: selectedViewRecord?.colD },
          { label: "Beginning Balance", value: selectedViewRecord?.colE },
          { label: "BCA Shardjo", value: selectedViewRecord?.colK },
          { label: "BCA Juanda", value: selectedViewRecord?.colL },
          { label: "Mandiri Mid Plaza", value: selectedViewRecord?.colM },
          { label: "BTN", value: selectedViewRecord?.colN },
          { label: "BRI Shardjo", value: selectedViewRecord?.colO },
          { label: "BRI Tebet", value: selectedViewRecord?.colP },
          { label: "Cash IDR", value: selectedViewRecord?.colQ },
          { label: "Non CB", value: selectedViewRecord?.colR },
          { label: "AP In and Out", value: selectedViewRecord?.colS },
          { label: "Ending Balance", value: selectedViewRecord?.colU },
        ]}
      />
    </div>
  );
}
