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

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePpnInOut } from "../hooks/usePpnInOut";
import { useExcelFilter } from "../hooks/useExcelFilter";
import { PaginationControls } from "@/components/common/PaginationControls";
import { ExcelColumnFilter } from "./ExcelColumnFilter";
import { formatCurrency, formatDate, getAmountColor } from "@/lib/utils";
import { Decimal } from "decimal.js";
import { toast } from "sonner";
import { Edit2, Trash2, AlertCircle, Plus, Download, FileSpreadsheet, FileText, Eye } from "lucide-react";
import { downloadExcelFile, downloadPdfFile } from "@/lib/downloadFile";
import { DetailModal } from "@/components/common/DetailModal";
import EditPpnInOutModal from "./EditPpnInOutModal";
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

export function PpnInOutTable() {
  const { can } = useAuthStore();
  const limit = 10;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [selectedViewRecord, setSelectedViewRecord] = useState<any>(null);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const { getAllPpnInOut, deletePpnInOut } = usePpnInOut();
  const ppnInOutQuery = getAllPpnInOut(
    yearFilter !== "all" ? yearNum : undefined,
    { enabled: !!yearFilter }
  );
  const { data: allDataRaw, isLoading } = ppnInOutQuery;

  const displayData = useMemo(() => {
    return (allDataRaw || []).map((row: any) => ({
      ...row,
      colA: formatDate(row.colA),
      rawColA: row.colA,
      colB: row.colB || "-",
      colC: row.colC || "-",
      colD: row.colD || "-",
      colE: row.colE || "-",
      colF: row.colF || "-",
      colG: formatCurrency(row.colG),
      rawColG: row.colG,
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
  }, [allDataRaw]);

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
    clearFilters: handleClearFilters,
    isAnyFilterActive
  } = useExcelFilter({
    data: displayData,
    searchFields: ['colC', 'colD', 'colE']
  });

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
      return {
        colG: acc.colG.plus(getNum(curr.rawColG ?? curr.colG)),
        colH: acc.colH.plus(getNum(curr.rawColH ?? curr.colH)),
        colI: acc.colI.plus(getNum(curr.rawColI ?? curr.colI)),
        colJ: acc.colJ.plus(getNum(curr.rawColJ ?? curr.colJ)),
        colK: acc.colK.plus(getNum(curr.rawColK ?? curr.colK)),
        colM: acc.colM.plus(getNum(curr.rawColM ?? curr.colM)),
        colN: acc.colN.plus(getNum(curr.rawColN ?? curr.colN)),
        colO: acc.colO.plus(getNum(curr.rawColO ?? curr.colO)),
      };
    }, { 
      colG: new Decimal(0), colH: new Decimal(0), colI: new Decimal(0), colJ: new Decimal(0), colK: new Decimal(0),
      colM: new Decimal(0), colN: new Decimal(0), colO: new Decimal(0)
    });
  };

  const subtotalTotals = useMemo(() => calcTotals(paginatedData), [paginatedData]);
  const grandTotals = useMemo(() => calcTotals(filteredAndSortedData), [filteredAndSortedData]);

  const handleEdit = (id: number) => {
    setSelectedRecordId(id);
    setIsEditModalOpen(true);
  };

  const handleView = (row: any) => {
    setSelectedViewRecord(row);
    setIsViewModalOpen(true);
  };

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


  const cols = [
    { k: 'colA', l: 'Masa', isDate: true },
    { k: 'colB', l: 'Col B' },
    { k: 'colC', l: 'No Faktur' },
    { k: 'colD', l: 'Client/Suplier' },
    { k: 'colE', l: 'Invoice No' },
    { k: 'colF', l: 'Sales' },
    { k: 'colG', l: 'Status', num: true },
    { k: 'colH', l: 'PPN', num: true },
    { k: 'colI', l: 'WAPU', num: true },
    { k: 'colJ', l: 'PAID', num: true },
    { k: 'colK', l: 'AP PPN WAPU', num: true },
    { k: 'colM', l: 'Non WAPU', num: true },
    { k: 'colN', l: 'Masukan', num: true },
    { k: 'colO', l: 'AP PPN Non WAPU', num: true },
    { k: 'colP', l: 'Ledger' },
    { k: 'colQ', l: 'Sub Ledger-1' },
    { k: 'colR', l: 'Sub Ledger-2' },
    { k: 'colS', l: 'Sub Ledger-3' },
  ];

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
        
        <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); setPage(1); }}>
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
              onClick={() => setIsAddModalOpen(true)}
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
                onClick={() => downloadExcelFile(`/finance/ppn-in-out/export/excel${yearFilter !== 'all' ? `?year=${yearFilter}` : ''}`, `PpnInOut_${yearFilter !== 'all' ? yearFilter : 'All'}.xlsx`)}
                className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-emerald-600 transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet size={16} strokeWidth={2.5} />
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => downloadPdfFile(`/finance/ppn-in-out/export/pdf${yearFilter !== 'all' ? `?year=${yearFilter}` : ''}`, `PpnInOut_${yearFilter !== 'all' ? yearFilter : 'All'}.pdf`)}
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
          <Table className="min-w-[3000px]">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap">
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
                  <TableCell colSpan={cols.length} className="h-96 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40">Fetching PPN Details...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={cols.length} className="h-64 text-center opacity-20">
                    <p className="font-black uppercase tracking-widest">No records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedData.map((row: any) => (
                    <TableRow key={row.id} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap group">
                      {cols.map((c) => (
                        <TableCell key={c.k} className={`px-4 ${c.num ? 'text-right font-bold text-primary/80' : 'text-primary/60'}`}>
                          {row[c.k]}
                        </TableCell>
                      ))}
                      <TableCell className="px-4 text-center">
                        <div className="flex items-center justify-center gap-1 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary/40 hover:text-primary hover:bg-primary/5 rounded-sm" onClick={(e) => { e.stopPropagation(); handleView(row); }}>
                            <Eye size={12} strokeWidth={2.5} />
                          </Button>
                          {can('ppn-in-out.update') && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary/40 hover:text-primary hover:bg-primary/5 rounded-sm" onClick={(e) => { e.stopPropagation(); handleEdit(row.id); }}>
                              <Edit2 size={12} strokeWidth={2.5} />
                            </Button>
                          )}
                          {can('ppn-in-out.delete') && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500/40 hover:text-rose-600 hover:bg-rose-50 rounded-sm" onClick={(e) => { e.stopPropagation(); setRecordToDelete(row.id); }}>
                              <Trash2 size={12} strokeWidth={2.5} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Subtotal Row */}
                  <TableRow className="bg-secondary/5 border-t-2 border-secondary/30 font-bold whitespace-nowrap">
                    <TableCell colSpan={6} className="px-4 text-[11px] text-secondary/80 uppercase tracking-[0.2em]">
                      Subtotal (Page {page})
                    </TableCell>
                    <TableCell className={`text-right ${getAmountColor(subtotalTotals.colG.toString())}`}>{formatCurrency(subtotalTotals.colG.toString())}</TableCell>
                    <TableCell className={`text-right ${getAmountColor(subtotalTotals.colH.toString())}`}>{formatCurrency(subtotalTotals.colH.toString())}</TableCell>
                    <TableCell className={`text-right ${getAmountColor(subtotalTotals.colI.toString())}`}>{formatCurrency(subtotalTotals.colI.toString())}</TableCell>
                    <TableCell className={`text-right ${getAmountColor(subtotalTotals.colJ.toString())}`}>{formatCurrency(subtotalTotals.colJ.toString())}</TableCell>
                    <TableCell className={`text-right ${getAmountColor(subtotalTotals.colK.toString())}`}>{formatCurrency(subtotalTotals.colK.toString())}</TableCell>
                    <TableCell className={`text-right ${getAmountColor(subtotalTotals.colM.toString())}`}>{formatCurrency(subtotalTotals.colM.toString())}</TableCell>
                    <TableCell className={`text-right ${getAmountColor(subtotalTotals.colN.toString())}`}>{formatCurrency(subtotalTotals.colN.toString())}</TableCell>
                    <TableCell className={`text-right ${getAmountColor(subtotalTotals.colO.toString())}`}>{formatCurrency(subtotalTotals.colO.toString())}</TableCell>
                    <TableCell colSpan={5} className="bg-secondary/[0.02]" />
                  </TableRow>

                  {/* Grand Total Row */}
                  <TableRow className="bg-secondary/10 border-t border-secondary/30 font-bold whitespace-nowrap">
                    <TableCell colSpan={6} className="px-4 text-[11px] text-secondary uppercase tracking-[0.2em]">
                      Grand Totals ({filteredAndSortedData.length} records)
                    </TableCell>
                    <TableCell className={`text-right ${getAmountColor(grandTotals.colG.toString())}`}>{formatCurrency(grandTotals.colG.toString())}</TableCell>
                    <TableCell className={`text-right ${getAmountColor(grandTotals.colH.toString())}`}>{formatCurrency(grandTotals.colH.toString())}</TableCell>
                    <TableCell className={`text-right ${getAmountColor(grandTotals.colI.toString())}`}>{formatCurrency(grandTotals.colI.toString())}</TableCell>
                    <TableCell className={`text-right ${getAmountColor(grandTotals.colJ.toString())}`}>{formatCurrency(grandTotals.colJ.toString())}</TableCell>
                    <TableCell className={`text-right ${getAmountColor(grandTotals.colK.toString())}`}>{formatCurrency(grandTotals.colK.toString())}</TableCell>
                    <TableCell className={`text-right ${getAmountColor(grandTotals.colM.toString())}`}>{formatCurrency(grandTotals.colM.toString())}</TableCell>
                    <TableCell className={`text-right ${getAmountColor(grandTotals.colN.toString())}`}>{formatCurrency(grandTotals.colN.toString())}</TableCell>
                    <TableCell className={`text-right ${getAmountColor(grandTotals.colO.toString())}`}>{formatCurrency(grandTotals.colO.toString())}</TableCell>
                    <TableCell colSpan={5} className="bg-secondary/[0.02]" />
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
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

      <EditPpnInOutModal 
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        recordId={selectedRecordId}
        onSuccess={() => ppnInOutQuery.refetch()}
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
        data={cols.map(c => ({
          label: c.l,
          value: selectedViewRecord?.[c.k]
        }))}
      />
    </div>
  );
}
