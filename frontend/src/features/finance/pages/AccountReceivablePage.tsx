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
import { useAccountColumns, accountKey } from "../hooks/useAccountColumns";
import { useExcelFilter } from "../hooks/useExcelFilter";
import { PaginationControls } from "@/components/common/PaginationControls";
import { ExcelColumnFilter } from "../components/ExcelColumnFilter";
import AddArLedgerModal from "../components/AddArLedgerModal";
import { formatCurrency, cleanAmount, getAmountColor } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Decimal } from "decimal.js";
import { Edit2, Trash2, AlertCircle, Download, FileSpreadsheet, FileText, Eye } from "lucide-react";
import { downloadExcelFile, downloadPdfFile } from "@/lib/downloadFile";
import { DetailModal } from "@/components/common/DetailModal";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const accountColumns = useAccountColumns(
    "account-receivable",
    arYearFilter !== "all" ? yearNum : undefined,
    { enabled: !!arYearFilter }
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [selectedViewRecord, setSelectedViewRecord] = useState<any>(null);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: allARRaw = [], isLoading, refetch } = getAllAR(
    arYearFilter !== "all" ? yearNum : undefined,
    { enabled: !!arYearFilter }
  );

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

  const displayAR = useMemo(() => {
    return (allARRaw || []).map((row: any) => ({
      ...row,
      colB: row.colB || "-",
      // rawColC: row.colC,
      // colC: formatDate(row.colC), // Format date early
      colC: row.colC || "-",
      colD: row.colD || "-",
      colE: row.colE || "-",
      colF: formatCurrency(row.colF),
      colJ: formatCurrency(row.colJ),
      colK: formatCurrency(row.colK),
      colL: formatCurrency(row.colL),
      colM: formatCurrency(row.colM),
      colN: formatCurrency(row.colN),
      colO: formatCurrency(row.colO),
      colP: formatCurrency(row.colP),
      // The same figures the fixed columns carry, keyed by account.
      ...Object.fromEntries(
        (row.amounts ?? []).map((a: any) => [accountKey(a.accountId), formatCurrency(a.amount)])
      ),
      colR: formatCurrency(row.colR),
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
    const byColumn = paginatedData.reduce((acc, curr) => {
      return {
        colF: acc.colF.plus(new Decimal(cleanAmount(curr.colF))),
        colJ: acc.colJ.plus(new Decimal(cleanAmount(curr.colJ))),
        colK: acc.colK.plus(new Decimal(cleanAmount(curr.colK))),
        colL: acc.colL.plus(new Decimal(cleanAmount(curr.colL))),
        colM: acc.colM.plus(new Decimal(cleanAmount(curr.colM))),
        colN: acc.colN.plus(new Decimal(cleanAmount(curr.colN))),
        colO: acc.colO.plus(new Decimal(cleanAmount(curr.colO))),
        colP: acc.colP.plus(new Decimal(cleanAmount(curr.colP))),
        colR: acc.colR.plus(new Decimal(cleanAmount(curr.colR))),
      };
    }, { 
      colF: new Decimal(0), colJ: new Decimal(0), colK: new Decimal(0), 
      colL: new Decimal(0), colM: new Decimal(0), colN: new Decimal(0), 
      colO: new Decimal(0), colP: new Decimal(0), colR: new Decimal(0),
    });
    return { ...byColumn, ...sumAccounts(paginatedData) };
  }, [paginatedData, accountColumns]);

  const grandTotals = useMemo(() => {
    const byColumn = filteredAndSortedData.reduce((acc, curr) => {
      return {
        colF: acc.colF.plus(new Decimal(cleanAmount(curr.colF))),
        colJ: acc.colJ.plus(new Decimal(cleanAmount(curr.colJ))),
        colK: acc.colK.plus(new Decimal(cleanAmount(curr.colK))),
        colL: acc.colL.plus(new Decimal(cleanAmount(curr.colL))),
        colM: acc.colM.plus(new Decimal(cleanAmount(curr.colM))),
        colN: acc.colN.plus(new Decimal(cleanAmount(curr.colN))),
        colO: acc.colO.plus(new Decimal(cleanAmount(curr.colO))),
        colP: acc.colP.plus(new Decimal(cleanAmount(curr.colP))),
        colR: acc.colR.plus(new Decimal(cleanAmount(curr.colR))),
      };
    }, { 
      colF: new Decimal(0), colJ: new Decimal(0), colK: new Decimal(0), 
      colL: new Decimal(0), colM: new Decimal(0), colN: new Decimal(0), 
      colO: new Decimal(0), colP: new Decimal(0), colR: new Decimal(0),
    });
    return { ...byColumn, ...sumAccounts(filteredAndSortedData) };
  }, [filteredAndSortedData, accountColumns]);

  const handleEdit = (row: any) => {
    const rawRecord = allARRaw?.find((r: any) => r.id === row.id) || row;
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
                onClick={() => downloadExcelFile(`/finance/account-receivable/export/excel${arYearFilter !== 'all' ? `?year=${arYearFilter}` : ''}`, `Account_Receivable_${arYearFilter !== 'all' ? arYearFilter : 'All'}.xlsx`)}
                className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-emerald-600 transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet size={16} strokeWidth={2.5} />
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => downloadPdfFile(`/finance/account-receivable/export/pdf${arYearFilter !== 'all' ? `?year=${arYearFilter}` : ''}`, `Account_Receivable_${arYearFilter !== 'all' ? arYearFilter : 'All'}.pdf`)}
                className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-rose-600 transition-colors flex items-center gap-2"
              >
                <FileText size={16} strokeWidth={2.5} />
                Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                  {/* <div className="flex items-center gap-1">
                    Date
                    <ExcelColumnFilter columnKey="colC" label="Date" data={getCascadingData("colC")} activeFilters={filters["colC"]} onFilterChange={(v) => { setFilters(p => ({...p, colC: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colC", direction: d})} type="date" dateKey="rawColC" />
                  </div> */}
                  <div className="flex items-center gap-1">
                    Year
                    <ExcelColumnFilter columnKey="colC" label="Year" data={getCascadingData("colC")} activeFilters={filters["colC"]} onFilterChange={(v) => { setFilters(p => ({...p, colC: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colC", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-48">
                  <div className="flex items-center gap-1">
                    Client
                    <ExcelColumnFilter columnKey="colD" label="Client" data={getCascadingData("colD")} activeFilters={filters["colD"]} onFilterChange={(v) => { setFilters(p => ({...p, colD: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colD", direction: d})} />
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
                    IDR
                    <ExcelColumnFilter columnKey="colF" label="IDR" data={getCascadingData("colF")} activeFilters={filters["colF"]} onFilterChange={(v) => { setFilters(p => ({...p, colF: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colF", direction: d})} />
                  </div>
                </TableHead>

                {/* One column per account this year's receivables were settled
                    through. The header and the order come from Account & Bank. */}
                {accountColumns.map((account) => ({ key: accountKey(account.id), label: account.name })).map((col) => (
                  <TableHead key={col.key} className="text-right w-36 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {col.label}
                      <ExcelColumnFilter columnKey={col.key} label={col.label} data={getCascadingData(col.key)} activeFilters={filters[col.key]} onFilterChange={(v) => { setFilters(p => ({...p, [col.key]: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: col.key, direction: d})} />
                    </div>
                  </TableHead>
                ))}

                {/* Not an account: the VAT clearing position keeps its own
                    column, read straight from colP. */}
                <TableHead className="text-right w-36 whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    PPn In and Out
                    <ExcelColumnFilter columnKey="colP" label="PPn In and Out" data={getCascadingData("colP")} activeFilters={filters["colP"]} onFilterChange={(v) => { setFilters(p => ({...p, colP: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colP", direction: d})} />
                  </div>
                </TableHead>

                <TableHead className="text-right w-36">
                  <div className="flex items-center justify-end gap-1">
                    Outstanding IDR
                    <ExcelColumnFilter columnKey="colR" label="Outstanding IDR" data={getCascadingData("colR")} activeFilters={filters["colR"]} onFilterChange={(v) => { setFilters(p => ({...p, colR: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colR", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-24 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8 + accountColumns.length} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40">Synchronizing Accounts Receivable...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8 + accountColumns.length} className="h-64 text-center opacity-20">
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
                      
                      {accountColumns.map((account) => (
                        <TableCell key={account.id} className={`text-right font-bold ${getAmountColor(row[accountKey(account.id)], true)}`}>
                          {row[accountKey(account.id)]}
                        </TableCell>
                      ))}

                      <TableCell className={`text-right font-bold ${getAmountColor(row.colP, false)}`}>
                        {row.colP}
                      </TableCell>

                      <TableCell className={`text-right font-black ${getAmountColor(row.colR, false)}`}>
                        {row.colR}
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
                          {can('account-receivable.update') && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-primary/40 hover:text-primary hover:bg-primary/5 rounded-sm"
                              onClick={() => handleEdit(row)}
                            >
                              <Edit2 size={12} strokeWidth={2.5} />
                            </Button>
                          )}
                          {can('account-receivable.delete') && (
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

                  {/* Subtotal Row */}
                  <TableRow className="bg-secondary/5 border-t-2 border-secondary/30 hover:bg-secondary/5 transition-none font-bold whitespace-nowrap">
                    <TableCell colSpan={4} className="text-[11px] text-secondary/80 uppercase tracking-[0.2em]">
                      Subtotal (Page {page})
                    </TableCell>
                    <TableCell className={`text-right ${getAmountColor(subtotalTotals.colF.toString(), true)}`}>
                      {formatCurrency(subtotalTotals.colF.toString())}
                    </TableCell>
                    
                    {accountColumns.map((account) => (
                      <TableCell key={account.id} className={`text-right ${getAmountColor(((subtotalTotals as any)[accountKey(account.id)] ?? 0).toString(), true)}`}>
                        {formatCurrency(((subtotalTotals as any)[accountKey(account.id)] ?? 0).toString())}
                      </TableCell>
                    ))}

                    <TableCell className={`text-right ${getAmountColor(subtotalTotals.colP.toString(), false)}`}>
                      {formatCurrency(subtotalTotals.colP.toString())}
                    </TableCell>
                    
                    <TableCell className={`text-right ${getAmountColor(subtotalTotals.colR.toString(), false)}`}>
                      {formatCurrency(subtotalTotals.colR.toString())}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>

                  {/* Grand Total Row */}
                  <TableRow className="bg-secondary/10 border-t border-secondary/30 hover:bg-secondary/10 transition-none font-bold whitespace-nowrap">
                    <TableCell colSpan={4} className="text-[11px] text-secondary uppercase tracking-[0.2em]">
                      Grand Total ({filteredAndSortedData.length} results)
                    </TableCell>
                    <TableCell className={`text-right ${getAmountColor(grandTotals.colF.toString(), true)}`}>
                      {formatCurrency(grandTotals.colF.toString())}
                    </TableCell>
                    
                    {accountColumns.map((account) => (
                      <TableCell key={account.id} className={`text-right ${getAmountColor(((grandTotals as any)[accountKey(account.id)] ?? 0).toString(), true)}`}>
                        {formatCurrency(((grandTotals as any)[accountKey(account.id)] ?? 0).toString())}
                      </TableCell>
                    ))}

                    <TableCell className={`text-right ${getAmountColor(grandTotals.colP.toString(), false)}`}>
                      {formatCurrency(grandTotals.colP.toString())}
                    </TableCell>
                    
                    <TableCell className={`text-right ${getAmountColor(grandTotals.colR.toString(), false)}`}>
                      {formatCurrency(grandTotals.colR.toString())}
                    </TableCell>
                    <TableCell></TableCell>
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
      <DetailModal
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        title="Account Receivable Details"
        subtitle={selectedViewRecord?.colD}
        data={[
          { label: "Type", value: selectedViewRecord?.colB },
          { label: "Year", value: selectedViewRecord?.colC },
          { label: "Client", value: selectedViewRecord?.colD },
          { label: "Description", value: selectedViewRecord?.colE },
          { label: "IDR", value: selectedViewRecord?.colF },
          { label: "BCA Suhardjo", value: selectedViewRecord?.colJ },
          { label: "BCA Juanda", value: selectedViewRecord?.colK },
          { label: "MANDIRI MP", value: selectedViewRecord?.colL },
          { label: "BRI Suhardjo", value: selectedViewRecord?.colM },
          { label: "Cash IDR", value: selectedViewRecord?.colN },
          { label: "Non CB", value: selectedViewRecord?.colO },
          { label: "PPn In and Out", value: selectedViewRecord?.colP },
          { label: "Outstanding IDR", value: selectedViewRecord?.colR },
        ]}
      />
    </PageContainer>
  );
}
