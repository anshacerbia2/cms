import { useState, useMemo } from "react";
import { ArrowUpRight, Search, FilterX, Plus } from 'lucide-react';
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
import { useAccountReceivable } from "../hooks/useAccountReceivable";
import { useExcelFilter } from "../hooks/useExcelFilter";
import { PaginationControls } from "@/components/common/PaginationControls";
import { ExcelColumnFilter } from "../components/ExcelColumnFilter";
import AddArLedgerModal from "../components/AddArLedgerModal";
import { formatCurrency, formatDate, cleanAmount, getAmountColor } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Decimal } from "decimal.js";
import { Edit2, Trash2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import EditArLedgerModal from "../components/EditArLedgerModal";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/common/PageContainer";

export default function AccountReceivablePage() {
  const { can } = useAuthStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const limit = 10;

  const [arYearFilter, setArYearFilter] = useState(new Date().getFullYear().toString());
  const yearNum = useMemo(() => Number(arYearFilter), [arYearFilter]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2025; y--) {
      years.push(y.toString());
    }
    return years;
  }, []);

  const { getAllAR, deleteAR } = useAccountReceivable();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: allARRaw = [], isLoading, refetch } = getAllAR(
    arYearFilter !== "all" ? yearNum : undefined,
    { enabled: !!arYearFilter }
  );

  const displayAR = useMemo(() => {
    return (allARRaw || []).map((row: any) => ({
      ...row,
      colB: row.colB || "-",
      rawColC: row.colC,
      colC: formatDate(row.colC), // Format date early
      colD: row.colD || "-",
      colE: row.colE || "-",
      colF: formatCurrency(row.colF),
      colG: formatCurrency(row.colG),
      colH: formatCurrency(row.colH),
      colJ: formatCurrency(row.colJ),
      colK: formatCurrency(row.colK),
      colL: formatCurrency(row.colL),
      colM: formatCurrency(row.colM),
      colN: formatCurrency(row.colN),
      colO: formatCurrency(row.colO),
      colP: formatCurrency(row.colP),
      colR: formatCurrency(row.colR),
      colS: formatCurrency(row.colS),
    }));
  }, [allARRaw]);

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
    data: displayAR,
    searchFields: ['colD', 'colE', 'colB']
  });

  const paginatedData = useMemo(() => {
    const skip = (page - 1) * limit;
    return filteredAndSortedData.slice(skip, skip + limit);
  }, [filteredAndSortedData, page]);

  const subtotalTotals = useMemo(() => {
    return paginatedData.reduce((acc, curr) => {
      return {
        colF: acc.colF.plus(new Decimal(cleanAmount(curr.colF))),
        colG: acc.colG.plus(new Decimal(cleanAmount(curr.colG))),
        colH: acc.colH.plus(new Decimal(cleanAmount(curr.colH))),
        colJ: acc.colJ.plus(new Decimal(cleanAmount(curr.colJ))),
        colK: acc.colK.plus(new Decimal(cleanAmount(curr.colK))),
        colL: acc.colL.plus(new Decimal(cleanAmount(curr.colL))),
        colM: acc.colM.plus(new Decimal(cleanAmount(curr.colM))),
        colN: acc.colN.plus(new Decimal(cleanAmount(curr.colN))),
        colO: acc.colO.plus(new Decimal(cleanAmount(curr.colO))),
        colP: acc.colP.plus(new Decimal(cleanAmount(curr.colP))),
        colR: acc.colR.plus(new Decimal(cleanAmount(curr.colR))),
        colS: acc.colS.plus(new Decimal(cleanAmount(curr.colS))),
      };
    }, { 
      colF: new Decimal(0), colG: new Decimal(0), colH: new Decimal(0), colJ: new Decimal(0), colK: new Decimal(0), 
      colL: new Decimal(0), colM: new Decimal(0), colN: new Decimal(0), 
      colO: new Decimal(0), colP: new Decimal(0), colR: new Decimal(0), colS: new Decimal(0)
    });
  }, [paginatedData]);

  const grandTotals = useMemo(() => {
    return filteredAndSortedData.reduce((acc, curr) => {
      return {
        colF: acc.colF.plus(new Decimal(cleanAmount(curr.colF))),
        colG: acc.colG.plus(new Decimal(cleanAmount(curr.colG))),
        colH: acc.colH.plus(new Decimal(cleanAmount(curr.colH))),
        colJ: acc.colJ.plus(new Decimal(cleanAmount(curr.colJ))),
        colK: acc.colK.plus(new Decimal(cleanAmount(curr.colK))),
        colL: acc.colL.plus(new Decimal(cleanAmount(curr.colL))),
        colM: acc.colM.plus(new Decimal(cleanAmount(curr.colM))),
        colN: acc.colN.plus(new Decimal(cleanAmount(curr.colN))),
        colO: acc.colO.plus(new Decimal(cleanAmount(curr.colO))),
        colP: acc.colP.plus(new Decimal(cleanAmount(curr.colP))),
        colR: acc.colR.plus(new Decimal(cleanAmount(curr.colR))),
        colS: acc.colS.plus(new Decimal(cleanAmount(curr.colS))),
      };
    }, { 
      colF: new Decimal(0), colG: new Decimal(0), colH: new Decimal(0), colJ: new Decimal(0), colK: new Decimal(0), 
      colL: new Decimal(0), colM: new Decimal(0), colN: new Decimal(0), 
      colO: new Decimal(0), colP: new Decimal(0), colR: new Decimal(0), colS: new Decimal(0)
    });
  }, [filteredAndSortedData]);

  const handleEdit = (row: any) => {
    const rawRecord = allARRaw?.find((r: any) => r.id === row.id) || row;
    setSelectedRecord(rawRecord);
    setIsEditModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setRecordToDelete(id);
  };

  const executeDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await deleteAR.mutateAsync(recordToDelete);
      refetch();
    } catch (error: any) {
      // toast is handled in hook
    } finally {
      setIsDeleting(false);
      setRecordToDelete(null);
    }
  };


  return (
    <PageContainer>
      <PageHeader 
        title="Account Receivable"
        description="Comprehensive ledger tracking for corporate billing and incoming reconciliation."
        icon={ArrowUpRight}
      />

      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search by Client, Description..." 
            className="pl-12 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 text-[13px] font-medium"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={arYearFilter} onValueChange={(v) => { setArYearFilter(v); setPage(1); }}>
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
          
          {can('account-receivable.create') && (
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="h-12 px-6 bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-sm flex items-center justify-center gap-2 font-bold transition-all active:scale-95"
            >
              <Plus size={20} strokeWidth={3} />
              <span className="text-[13px]">Add Record</span>
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 bg-white/70 backdrop-blur-md rounded-2xl shadow-premium border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <Table className="min-w-[2400px]">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap">
                <TableHead className="w-32 pl-8">
                  <div className="flex items-center gap-1">
                    Type
                    <ExcelColumnFilter columnKey="colB" label="Type" data={getCascadingData("colB")} activeFilters={filters["colB"]} onFilterChange={(v) => { setFilters(p => ({...p, colB: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colB", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-32">
                  <div className="flex items-center gap-1">
                    Date
                    <ExcelColumnFilter columnKey="colC" label="Date" data={getCascadingData("colC")} activeFilters={filters["colC"]} onFilterChange={(v) => { setFilters(p => ({...p, colC: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colC", direction: d})} type="date" dateKey="rawColC" />
                  </div>
                </TableHead>
                <TableHead className="w-48">
                  <div className="flex items-center gap-1">
                    Name
                    <ExcelColumnFilter columnKey="colD" label="Name" data={getCascadingData("colD")} activeFilters={filters["colD"]} onFilterChange={(v) => { setFilters(p => ({...p, colD: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colD", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-72">
                  <div className="flex items-center gap-1">
                    Description
                    <ExcelColumnFilter columnKey="colE" label="Description" data={getCascadingData("colE")} activeFilters={filters["colE"]} onFilterChange={(v) => { setFilters(p => ({...p, colE: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colE", direction: d})} />
                  </div>
                </TableHead>

                <TableHead className="text-right w-36">
                  <div className="flex items-center justify-end gap-1">
                    EOY IDR
                    <ExcelColumnFilter columnKey="colF" label="EOY IDR" data={getCascadingData("colF")} activeFilters={filters["colF"]} onFilterChange={(v) => { setFilters(p => ({...p, colF: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colF", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="text-right w-36">
                  <div className="flex items-center justify-end gap-1">
                    EOY USD
                    <ExcelColumnFilter columnKey="colG" label="EOY USD" data={getCascadingData("colG")} activeFilters={filters["colG"]} onFilterChange={(v) => { setFilters(p => ({...p, colG: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colG", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="text-right w-36">
                  <div className="flex items-center justify-end gap-1">
                    USD Rate
                    <ExcelColumnFilter columnKey="colH" label="USD Rate" data={getCascadingData("colH")} activeFilters={filters["colH"]} onFilterChange={(v) => { setFilters(p => ({...p, colH: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colH", direction: d})} />
                  </div>
                </TableHead>

                {[
                  { key: 'colJ', label: 'BCA Suhardjo' },
                  { key: 'colK', label: 'BCA Juanda' },
                  { key: 'colL', label: 'MANDIRI MP' },
                  { key: 'colM', label: 'BRI Suhardjo' },
                  { key: 'colN', label: 'Cash IDR' },
                  { key: 'colO', label: 'Non CB' },
                  { key: 'colP', label: 'PPn In and Out' }
                ].map((col) => (
                  <TableHead key={col.key} className="text-right w-36 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {col.label}
                      <ExcelColumnFilter columnKey={col.key} label={col.label} data={getCascadingData(col.key)} activeFilters={filters[col.key]} onFilterChange={(v) => { setFilters(p => ({...p, [col.key]: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: col.key, direction: d})} />
                    </div>
                  </TableHead>
                ))}

                <TableHead className="text-right w-36">
                  <div className="flex items-center justify-end gap-1">
                    Outstanding IDR
                    <ExcelColumnFilter columnKey="colR" label="Outstanding IDR" data={getCascadingData("colR")} activeFilters={filters["colR"]} onFilterChange={(v) => { setFilters(p => ({...p, colR: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colR", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="text-right w-36">
                  <div className="flex items-center justify-end gap-1">
                    Outstanding USD
                    <ExcelColumnFilter columnKey="colS" label="Outstanding USD" data={getCascadingData("colS")} activeFilters={filters["colS"]} onFilterChange={(v) => { setFilters(p => ({...p, colS: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colS", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-24 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={13} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40">Synchronizing Accounts Receivable...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="h-64 text-center opacity-20">
                    <p className="font-black uppercase tracking-widest">No records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedData.map((row: any) => (
                    <TableRow key={row.id} className="hover:bg-transparent transition-none whitespace-nowrap group">
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] font-black uppercase tracking-tight px-1.5 py-0.5">{row.colB}</Badge>
                      </TableCell>
                      <TableCell className="font-bold text-primary/60">
                        {row.colC}
                      </TableCell>
                      <TableCell className="font-bold text-primary uppercase truncate max-w-[150px]">{row.colD}</TableCell>
                      <TableCell className="text-primary/60 truncate max-w-[250px]" title={row.colE}>{row.colE}</TableCell>
                      
                      <TableCell className={`text-right font-bold ${getAmountColor(row.colF, true)}`}>
                        {row.colF}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${getAmountColor(row.colG, true)}`}>
                        {row.colG}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${getAmountColor(row.colH, true)}`}>
                        {row.colH}
                      </TableCell>
                      
                      {['colJ', 'colK', 'colL', 'colM', 'colN', 'colO'].map(col => (
                        <TableCell key={col} className={`text-right font-bold ${getAmountColor(row[col], true)}`}>
                          {row[col]}
                        </TableCell>
                      ))}

                      <TableCell className={`text-right font-bold ${getAmountColor(row.colP, false)}`}>
                        {row.colP}
                      </TableCell>

                      <TableCell className={`text-right font-black ${getAmountColor(row.colR, false)}`}>
                        {row.colR}
                      </TableCell>
                      <TableCell className={`text-right font-black ${getAmountColor(row.colS, false)}`}>
                        {row.colS}
                      </TableCell>
                      <TableCell className="px-4 text-center">
                        <div className="flex items-center justify-center gap-1 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-primary/40 hover:text-primary hover:bg-primary/5 rounded-sm"
                            onClick={() => handleEdit(row)}
                          >
                            <Edit2 size={12} strokeWidth={2.5} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-rose-500/40 hover:text-rose-600 hover:bg-rose-50 rounded-sm"
                            onClick={() => handleDelete(row.id)}
                          >
                            <Trash2 size={12} strokeWidth={2.5} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Subtotal Row */}
                  <TableRow className="bg-secondary/5 border-t-2 border-secondary/30 hover:bg-secondary/5 transition-none font-bold whitespace-nowrap">
                    <TableCell colSpan={4} className="text-[11px] text-secondary/80 uppercase tracking-[0.2em]">
                      Subtotal (Page {page})
                    </TableCell>
                    <TableCell className={`text-right ${getAmountColor(subtotalTotals.colF.toString(), true)}`}>
                      {formatCurrency(subtotalTotals.colF.toString())}
                    </TableCell>
                    <TableCell className={`text-right ${getAmountColor(subtotalTotals.colG.toString(), true)}`}>
                      {formatCurrency(subtotalTotals.colG.toString())}
                    </TableCell>
                    <TableCell className={`text-right ${getAmountColor(subtotalTotals.colH.toString(), true)}`}>
                      {formatCurrency(subtotalTotals.colH.toString())}
                    </TableCell>
                    
                    {['colJ', 'colK', 'colL', 'colM', 'colN', 'colO'].map(col => (
                      <TableCell key={col} className={`text-right ${getAmountColor(subtotalTotals[col as keyof typeof subtotalTotals].toString(), true)}`}>
                        {formatCurrency(subtotalTotals[col as keyof typeof subtotalTotals].toString())}
                      </TableCell>
                    ))}

                    <TableCell className={`text-right ${getAmountColor(subtotalTotals.colP.toString(), false)}`}>
                      {formatCurrency(subtotalTotals.colP.toString())}
                    </TableCell>
                    
                    <TableCell className={`text-right ${getAmountColor(subtotalTotals.colR.toString(), false)}`}>
                      {formatCurrency(subtotalTotals.colR.toString())}
                    </TableCell>
                    <TableCell className={`text-right ${getAmountColor(subtotalTotals.colS.toString(), false)}`}>
                      {formatCurrency(subtotalTotals.colS.toString())}
                    </TableCell>
                  </TableRow>

                  {/* Grand Total Row */}
                  <TableRow className="bg-secondary/10 border-t border-secondary/30 hover:bg-secondary/10 transition-none font-bold whitespace-nowrap">
                    <TableCell colSpan={4} className="text-[11px] text-secondary uppercase tracking-[0.2em]">
                      Grand Total ({filteredAndSortedData.length} results)
                    </TableCell>
                    <TableCell className={`text-right ${getAmountColor(grandTotals.colF.toString(), true)}`}>
                      {formatCurrency(grandTotals.colF.toString())}
                    </TableCell>
                    <TableCell className={`text-right ${getAmountColor(grandTotals.colG.toString(), true)}`}>
                      {formatCurrency(grandTotals.colG.toString())}
                    </TableCell>
                    <TableCell className={`text-right ${getAmountColor(grandTotals.colH.toString(), true)}`}>
                      {formatCurrency(grandTotals.colH.toString())}
                    </TableCell>
                    
                    {['colJ', 'colK', 'colL', 'colM', 'colN', 'colO'].map(col => (
                      <TableCell key={col} className={`text-right ${getAmountColor(grandTotals[col as keyof typeof grandTotals].toString(), true)}`}>
                        {formatCurrency(grandTotals[col as keyof typeof grandTotals].toString())}
                      </TableCell>
                    ))}

                    <TableCell className={`text-right ${getAmountColor(grandTotals.colP.toString(), false)}`}>
                      {formatCurrency(grandTotals.colP.toString())}
                    </TableCell>
                    
                    <TableCell className={`text-right ${getAmountColor(grandTotals.colR.toString(), false)}`}>
                      {formatCurrency(grandTotals.colR.toString())}
                    </TableCell>
                    <TableCell className={`text-right ${getAmountColor(grandTotals.colS.toString(), false)}`}>
                      {formatCurrency(grandTotals.colS.toString())}
                    </TableCell>
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
          lastPage: Math.ceil(filteredAndSortedData.length / limit) || 1
        }} 
        onPageChange={setPage} 
        isFetching={isLoading} 
      />

      <AddArLedgerModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen} 
        year={yearNum}
        onSuccess={() => refetch()} 
      />

      <EditArLedgerModal
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
              This action cannot be undone. Are you sure you want to delete this receivable record?
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
    </PageContainer>
  );
}
