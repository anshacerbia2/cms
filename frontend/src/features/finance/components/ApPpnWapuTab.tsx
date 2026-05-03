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
import { useAccountPayable } from "../hooks/useAccountPayable";
import { useExcelFilter } from "../hooks/useExcelFilter";
import { PaginationControls } from "@/components/common/PaginationControls";
import { ExcelColumnFilter } from "./ExcelColumnFilter";
import AddTaxLedgerModal from "./AddTaxLedgerModal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Plus } from "lucide-react";
import { Decimal } from "decimal.js";

export function ApPpnWapuTab() {
  const { user } = useAuthStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const limit = 10;

  const { getAllApTaxLedger } = useAccountPayable();
  const { data: allData = [], isLoading, refetch } = getAllApTaxLedger({ type: 'WAPU' });

  const displayData = useMemo(() => {
    return (allData || []).map((row: any) => ({
      ...row,
      colA: formatDate(row.colA),
      colB: row.colB || "-",
      colC: row.colC || "-",
      colD: row.colD || "-",
      colE: row.colE || "-",
      colF: row.colF || "-",
      colG: row.colG || "-",
      colH: formatCurrency(row.colH),
      colI: formatCurrency(row.colI),
      colJ: formatCurrency(row.colJ),
      colK: formatCurrency(row.colK),
      colL: row.colL || "-",
      colM: row.colM || "-",
      colN: row.colN || "-",
    }));
  }, [allData]);

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

  // Client-side pagination
  const paginatedData = useMemo(() => {
    const skip = (page - 1) * limit;
    return filteredAndSortedData.slice(skip, skip + limit);
  }, [filteredAndSortedData, page]);

  // Calculations for Subtotal and Grand Total
  const subtotalTotals = useMemo(() => {
    return paginatedData.reduce((acc, curr) => {
      const clean = (val: any) => {
        const s = String(val || "0");
        if (s === "-" || s === "") return "0";
        let cleaned = s.replace(/[A-Z]{3}\s?/g, "");
        cleaned = cleaned.replace(/\./g, "");
        cleaned = cleaned.replace(/,/g, ".");
        return cleaned.replace(/[^0-9.-]+/g, "") || "0";
      };
      return {
        colH: acc.colH.plus(new Decimal(clean(curr.colH))),
        colI: acc.colI.plus(new Decimal(clean(curr.colI))),
        colJ: acc.colJ.plus(new Decimal(clean(curr.colJ))),
        colK: acc.colK.plus(new Decimal(clean(curr.colK))),
      };
    }, { 
      colH: new Decimal(0), colI: new Decimal(0), colJ: new Decimal(0), colK: new Decimal(0) 
    });
  }, [paginatedData]);

  const grandTotals = useMemo(() => {
    return filteredAndSortedData.reduce((acc, curr) => {
      const clean = (val: any) => {
        const s = String(val || "0");
        if (s === "-" || s === "") return "0";
        let cleaned = s.replace(/[A-Z]{3}\s?/g, "");
        cleaned = cleaned.replace(/\./g, "");
        cleaned = cleaned.replace(/,/g, ".");
        return cleaned.replace(/[^0-9.-]+/g, "") || "0";
      };
      return {
        colH: acc.colH.plus(new Decimal(clean(curr.colH))),
        colI: acc.colI.plus(new Decimal(clean(curr.colI))),
        colJ: acc.colJ.plus(new Decimal(clean(curr.colJ))),
        colK: acc.colK.plus(new Decimal(clean(curr.colK))),
      };
    }, { 
      colH: new Decimal(0), colI: new Decimal(0), colJ: new Decimal(0), colK: new Decimal(0) 
    });
  }, [filteredAndSortedData]);



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
            placeholder="Search PPN WAPU (Client, No Faktur, Reference)..." 
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
          
          {user?.permissions?.includes('account-payable.create') && (
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="h-12 px-6 bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-sm flex items-center justify-center gap-2 font-bold disabled:opacity-50 transition-all active:scale-95"
            >
              <Plus size={20} strokeWidth={3} />
              <span className="text-[13px]">Add Record</span>
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-premium border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[2000px]">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap">
                <TableHead className="pl-8 w-32">
                  <div className="flex items-center gap-1">
                    Masa
                    <ExcelColumnFilter columnKey="colA" label="Masa" data={getCascadingData("colA")} activeFilters={filters["colA"]} onFilterChange={(v) => { setFilters(p => ({...p, colA: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colA", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-32 px-4">
                  <div className="flex items-center gap-1">
                    Faktur
                    <ExcelColumnFilter columnKey="colB" label="Faktur" data={getCascadingData("colB")} activeFilters={filters["colB"]} onFilterChange={(v) => { setFilters(p => ({...p, colB: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colB", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-48 px-4">
                  <div className="flex items-center gap-1">
                    No Faktur
                    <ExcelColumnFilter columnKey="colC" label="No Faktur" data={getCascadingData("colC")} activeFilters={filters["colC"]} onFilterChange={(v) => { setFilters(p => ({...p, colC: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colC", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-64 px-4">
                  <div className="flex items-center gap-1">
                    Client / Supplier
                    <ExcelColumnFilter columnKey="colD" label="Client" data={getCascadingData("colD")} activeFilters={filters["colD"]} onFilterChange={(v) => { setFilters(p => ({...p, colD: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colD", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-48 px-4">
                  <div className="flex items-center gap-1">
                    Reference
                    <ExcelColumnFilter columnKey="colE" label="Reference" data={getCascadingData("colE")} activeFilters={filters["colE"]} onFilterChange={(v) => { setFilters(p => ({...p, colE: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colE", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-24 px-4">
                  <div className="flex items-center gap-1">
                    Sales
                    <ExcelColumnFilter columnKey="colF" label="Sales" data={getCascadingData("colF")} activeFilters={filters["colF"]} onFilterChange={(v) => { setFilters(p => ({...p, colF: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colF", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-32 px-4">
                  <div className="flex items-center gap-1">
                    Status
                    <ExcelColumnFilter columnKey="colG" label="Status" data={getCascadingData("colG")} activeFilters={filters["colG"]} onFilterChange={(v) => { setFilters(p => ({...p, colG: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colG", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="text-right w-36">
                  <div className="flex items-center justify-end gap-1">
                    PPN
                    <ExcelColumnFilter columnKey="colH" label="PPN" data={getCascadingData("colH")} activeFilters={filters["colH"]} onFilterChange={(v) => { setFilters(p => ({...p, colH: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colH", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="text-right w-36">
                  <div className="flex items-center justify-end gap-1">
                    WAPU
                    <ExcelColumnFilter columnKey="colI" label="WAPU" data={getCascadingData("colI")} activeFilters={filters["colI"]} onFilterChange={(v) => { setFilters(p => ({...p, colI: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colI", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="text-right w-36">
                  <div className="flex items-center justify-end gap-1">
                    WAPU Paid
                    <ExcelColumnFilter columnKey="colJ" label="WAPU Paid" data={getCascadingData("colJ")} activeFilters={filters["colJ"]} onFilterChange={(v) => { setFilters(p => ({...p, colJ: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colJ", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="text-right w-36">
                  <div className="flex items-center justify-end gap-1">
                    AP PPN WAPU
                    <ExcelColumnFilter columnKey="colK" label="AP PPN WAPU" data={getCascadingData("colK")} activeFilters={filters["colK"]} onFilterChange={(v) => { setFilters(p => ({...p, colK: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colK", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-48 px-4">
                  <div className="flex items-center gap-1">
                    Account
                    <ExcelColumnFilter columnKey="colL" label="Account" data={getCascadingData("colL")} activeFilters={filters["colL"]} onFilterChange={(v) => { setFilters(p => ({...p, colL: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colL", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-48 px-4">
                  <div className="flex items-center gap-1">
                    Sub Ledger
                    <ExcelColumnFilter columnKey="colM" label="Sub Ledger" data={getCascadingData("colM")} activeFilters={filters["colM"]} onFilterChange={(v) => { setFilters(p => ({...p, colM: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colM", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-48 px-4">
                  <div className="flex items-center gap-1">
                    Period
                    <ExcelColumnFilter columnKey="colN" label="Period" data={getCascadingData("colN")} activeFilters={filters["colN"]} onFilterChange={(v) => { setFilters(p => ({...p, colN: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colN", direction: d})} />
                  </div>
                </TableHead>
                {/* <TableHead className="py-3 text-[10px] font-black uppercase tracking-widest text-primary/40 pr-8 pl-4">
                  <div className="flex items-center gap-1">
                    Sub Ledger 3
                    <ExcelColumnFilter columnKey="colO" label="Sub Ledger 3" data={getCascadingData("colO")} activeFilters={filters["colO"]} onFilterChange={(v) => { setFilters(p => ({...p, colO: v})); setPage(1); }} currentSort={sort} onSort={(d) => setSort({key: "colO", direction: d})} />
                  </div>
                </TableHead> */}
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={15} className="h-96 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40">Fetching PPN WAPU Details...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} className="h-64 text-center opacity-20">
                    <p className="font-black uppercase tracking-widest">No records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedData.map((row: any) => (
                    <TableRow key={row.id} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap group">
                      <TableCell className="pl-8 font-medium">
                        {row.colA}
                      </TableCell>
                      <TableCell className="px-4 text-primary/60">{row.colB || '-'}</TableCell>
                      <TableCell className="px-4 font-bold text-primary uppercase">{row.colC || '-'}</TableCell>
                      <TableCell className="px-4 text-primary/60 font-medium">{row.colD || '-'}</TableCell>
                      <TableCell className="px-4 text-primary/60">{row.colE || '-'}</TableCell>
                      <TableCell className="px-4 text-primary/60 text-center">{row.colF || '-'}</TableCell>
                      <TableCell className="px-4">
                        <Badge variant="outline" className="bg-slate-50 text-[10px] font-bold uppercase">{row.colG || '-'}</Badge>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${getValueColor(row.colH)}`}>
                        {row.colH}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${getValueColor(row.colI)}`}>
                        {row.colI}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${getValueColor(row.colJ)}`}>
                        {row.colJ}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${getValueColor(row.colK)}`}>
                        {row.colK}
                      </TableCell>
                      <TableCell className="px-4 text-primary/60">{row.colL || '-'}</TableCell>
                      <TableCell className="px-4 text-primary/60">{row.colM || '-'}</TableCell>
                      <TableCell className="px-4 text-primary/60">{row.colN || '-'}</TableCell>
                      {/* <TableCell className="py-3 pr-8 pl-4 text-[12px] text-primary/60">{row.colO || '-'}</TableCell> */}
                    </TableRow>
                  ))}

                  {/* Subtotal Row */}
                  <TableRow className="bg-secondary/5 border-t-2 border-secondary/30 hover:bg-secondary/5 transition-none font-bold whitespace-nowrap">
                    <TableCell colSpan={7} className="pl-8 text-[11px] text-secondary/80 uppercase tracking-[0.2em]">
                      Subtotal (Page {page})
                    </TableCell>
                    <TableCell className={`text-right ${Number(subtotalTotals.colH.toString()) < 0 ? "text-rose-600" : "text-primary/80"}`}>
                      {formatCurrency(subtotalTotals.colH.toString())}
                    </TableCell>
                    <TableCell className={`text-right ${Number(subtotalTotals.colI.toString()) < 0 ? "text-rose-600" : "text-primary/80"}`}>
                      {formatCurrency(subtotalTotals.colI.toString())}
                    </TableCell>
                    <TableCell className={`text-right ${getValueColor(subtotalTotals.colJ.toString())}`}>
                      {formatCurrency(subtotalTotals.colJ.toString())}
                    </TableCell>
                    <TableCell className={`text-right ${Number(subtotalTotals.colK.toString()) < 0 ? "text-rose-600" : "text-primary/80"}`}>
                      {formatCurrency(subtotalTotals.colK.toString())}
                    </TableCell>
                    <TableCell colSpan={4} className="bg-secondary/[0.02]" />
                  </TableRow>

                  {/* Grand Total Row */}
                  <TableRow className="bg-secondary/10 border-t border-secondary/30 hover:bg-secondary/10 transition-none font-bold whitespace-nowrap">
                    <TableCell colSpan={7} className="pl-8 text-[11px] text-secondary uppercase tracking-[0.2em]">
                      Grand Totals ({filteredAndSortedData.length} records)
                    </TableCell>
                    <TableCell className={`text-right ${Number(grandTotals.colH.toString()) < 0 ? "text-rose-600" : "text-primary/80"}`}>
                      {formatCurrency(grandTotals.colH.toString())}
                    </TableCell>
                    <TableCell className={`text-right ${Number(grandTotals.colI.toString()) < 0 ? "text-rose-600" : "text-primary/80"}`}>
                      {formatCurrency(grandTotals.colI.toString())}
                    </TableCell>
                    <TableCell className={`text-right ${getValueColor(grandTotals.colJ.toString())}`}>
                      {formatCurrency(grandTotals.colJ.toString())}
                    </TableCell>
                    <TableCell className={`text-right ${Number(grandTotals.colK.toString()) < 0 ? "text-rose-600" : "text-primary/80"}`}>
                      {formatCurrency(grandTotals.colK.toString())}
                    </TableCell>
                    <TableCell colSpan={4} className="bg-secondary/[0.02]" />
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

      <AddTaxLedgerModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen} 
        type="WAPU"
        onSuccess={() => refetch()} 
      />
    </div>
  );
}
