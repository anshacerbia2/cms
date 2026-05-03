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

import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/common/PageContainer";

export default function AccountReceivablePage() {
  const { can } = useAuthStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const limit = 10;

  const { getAllAR } = useAccountReceivable();
  const { data: allARRaw = [], isLoading, refetch } = getAllAR();

  const displayAR = useMemo(() => {
    return (allARRaw || []).map((row: any) => ({
      ...row,
      colB: row.colB || "-",
      colC: formatDate(row.colC), // Format date early
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
    searchFields: ['colA', 'colD', 'colE', 'colB']
  });

  const paginatedData = useMemo(() => {
    const skip = (page - 1) * limit;
    return filteredAndSortedData.slice(skip, skip + limit);
  }, [filteredAndSortedData, page]);

  const subtotalTotals = useMemo(() => {
    return paginatedData.reduce((acc, curr) => {
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
      colO: new Decimal(0), colP: new Decimal(0), colR: new Decimal(0) 
    });
  }, [paginatedData]);

  const grandTotals = useMemo(() => {
    return filteredAndSortedData.reduce((acc, curr) => {
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
      colO: new Decimal(0), colP: new Decimal(0), colR: new Decimal(0) 
    });
  }, [filteredAndSortedData]);


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
                    <ExcelColumnFilter columnKey="colC" label="Date" data={getCascadingData("colC")} activeFilters={filters["colC"]} onFilterChange={(v) => { setFilters(p => ({...p, colC: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colC", direction: d})} />
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

                {[
                  { key: 'colJ', label: 'BCA Suhardjo' },
                  { key: 'colK', label: 'BCA Juanda' },
                  { key: 'colL', label: 'MANDIRI MP' },
                  { key: 'colM', label: 'BRI Suhardjo' },
                  { key: 'colN', label: 'Cash IDR' },
                  { key: 'colO', label: 'Non CB' },
                  { key: 'colP', label: 'Balance' }
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
                  </TableRow>

                  {/* Grand Total Row */}
                  <TableRow className="bg-secondary/10 border-t border-secondary/30 hover:bg-secondary/10 transition-none font-bold whitespace-nowrap">
                    <TableCell colSpan={4} className="text-[11px] text-secondary uppercase tracking-[0.2em]">
                      Grand Total ({filteredAndSortedData.length} results)
                    </TableCell>
                    <TableCell className={`text-right ${getAmountColor(grandTotals.colF.toString(), true)}`}>
                      {formatCurrency(grandTotals.colF.toString())}
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
        onSuccess={() => refetch()} 
      />
    </PageContainer>
  );
}
