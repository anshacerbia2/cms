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
import { PaginationControls } from "@/components/common/PaginationControls";
import { ExcelColumnFilter } from "./ExcelColumnFilter";
import AddApLedgerModal from "./AddApLedgerModal";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Plus } from "lucide-react";
import { Decimal } from "decimal.js";
import { useExcelFilter } from "../hooks/useExcelFilter";

export function ApSummaryTab() {
  const { can } = useAuthStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const apLimit = 10;

  const { getAllAP } = useAccountPayable();
  const { data: allAPRaw, isLoading: apLoading, refetch } = getAllAP();
  const displayAP = useMemo(() => {
    return (allAPRaw || []).map((row: any) => ({
      ...row,
      colA: row.colA || "-",
      colB: row.colB || "-",
      colC: row.colC || "-",
      colD: row.colD || "-",
      colE: formatCurrency(row.colE || 0),
      colF: row.colF || "-",
      colG: row.colG || "-",
      colI: formatCurrency(row.colI),
      colJ: formatCurrency(row.colJ),
      colK: formatCurrency(row.colK),
      colL: formatCurrency(row.colL),
      colM: formatCurrency(row.colM),
      colN: formatCurrency(row.colN),
      colO: formatCurrency(row.colO),
      colP: formatCurrency(row.colP),
      colQ: formatCurrency(row.colQ),
      colS: formatCurrency(row.colS),
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
    searchFields: ['colC', 'colD', 'colA']
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
    return paginatedAP.reduce((acc, curr) => {
      const clean = (val: any) => {
        const s = String(val || "0");
        if (s === "-" || s === "") return "0";
        let cleaned = s.replace(/[A-Z]{3}\s?/g, "");
        cleaned = cleaned.replace(/\./g, "");
        cleaned = cleaned.replace(/,/g, ".");
        return cleaned.replace(/[^0-9.-]+/g, "") || "0";
      };
      return {
        colE: acc.colE.plus(new Decimal(clean(curr.colE))),
        colI: acc.colI.plus(new Decimal(clean(curr.colI))),
        colJ: acc.colJ.plus(new Decimal(clean(curr.colJ))),
        colK: acc.colK.plus(new Decimal(clean(curr.colK))),
        colL: acc.colL.plus(new Decimal(clean(curr.colL))),
        colM: acc.colM.plus(new Decimal(clean(curr.colM))),
        colN: acc.colN.plus(new Decimal(clean(curr.colN))),
        colO: acc.colO.plus(new Decimal(clean(curr.colO))),
        colP: acc.colP.plus(new Decimal(clean(curr.colP))),
        colQ: acc.colQ.plus(new Decimal(clean(curr.colQ))),
        colS: acc.colS.plus(new Decimal(clean(curr.colS))),
      };
    }, { 
      colE: new Decimal(0), colI: new Decimal(0), colJ: new Decimal(0), 
      colK: new Decimal(0), colL: new Decimal(0), colM: new Decimal(0), 
      colN: new Decimal(0), colO: new Decimal(0), colP: new Decimal(0),
      colQ: new Decimal(0), colS: new Decimal(0)
    });
  }, [paginatedAP]);

  const grandTotals = useMemo(() => {
    return filteredAndSortedAP.reduce((acc, curr) => {
      const clean = (val: any) => {
        const s = String(val || "0");
        if (s === "-" || s === "") return "0";
        let cleaned = s.replace(/[A-Z]{3}\s?/g, "");
        cleaned = cleaned.replace(/\./g, "");
        cleaned = cleaned.replace(/,/g, ".");
        return cleaned.replace(/[^0-9.-]+/g, "") || "0";
      };
      return {
        colE: acc.colE.plus(new Decimal(clean(curr.colE))),
        colI: acc.colI.plus(new Decimal(clean(curr.colI))),
        colJ: acc.colJ.plus(new Decimal(clean(curr.colJ))),
        colK: acc.colK.plus(new Decimal(clean(curr.colK))),
        colL: acc.colL.plus(new Decimal(clean(curr.colL))),
        colM: acc.colM.plus(new Decimal(clean(curr.colM))),
        colN: acc.colN.plus(new Decimal(clean(curr.colN))),
        colO: acc.colO.plus(new Decimal(clean(curr.colO))),
        colP: acc.colP.plus(new Decimal(clean(curr.colP))),
        colQ: acc.colQ.plus(new Decimal(clean(curr.colQ))),
        colS: acc.colS.plus(new Decimal(clean(curr.colS))),
      };
    }, { 
      colE: new Decimal(0), colI: new Decimal(0), colJ: new Decimal(0), 
      colK: new Decimal(0), colL: new Decimal(0), colM: new Decimal(0), 
      colN: new Decimal(0), colO: new Decimal(0), colP: new Decimal(0),
      colQ: new Decimal(0), colS: new Decimal(0)
    });
  }, [filteredAndSortedAP]);



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
                    EOY IDR
                    <ExcelColumnFilter columnKey="colE" label="EOY IDR" data={getCascadingData("colE")} activeFilters={apFilters["colE"]} onFilterChange={(v) => { setApFilters(p => ({...p, colE: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colE", direction: d})} />
                  </div>
                </TableHead>

                <TableHead className="w-56 px-4">
                    <div className="flex items-center gap-1">
                    Col F
                    <ExcelColumnFilter columnKey="colF" label="Col F" data={getCascadingData("colF")} activeFilters={apFilters["colF"]} onFilterChange={(v) => { setApFilters(p => ({...p, colF: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colF", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="w-56 px-4">
                    <div className="flex items-center gap-1">
                    Col G
                    <ExcelColumnFilter columnKey="colG" label="Col G" data={getCascadingData("colG")} activeFilters={apFilters["colG"]} onFilterChange={(v) => { setApFilters(p => ({...p, colG: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colG", direction: d})} />
                  </div>
                </TableHead>

                {[
                  { key: 'colI', label: 'BCA Sahardjo' },
                  { key: 'colJ', label: 'BCA Juanda' },
                  { key: 'colK', label: 'MANDIRI Mid Plaza' },
                  { key: 'colL', label: 'BTN' },
                  { key: 'colM', label: 'BRI Sahardjo' },
                  { key: 'colN', label: 'BRI Tebet' },
                  { key: 'colO', label: 'Cash IDR' },
                  { key: 'colP', label: 'Non CB' }
                ].map((col) => (
                  <TableHead key={col.key} className="text-right w-36 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {col.label}
                      <ExcelColumnFilter columnKey={col.key} label={col.label} data={getCascadingData(col.key)} activeFilters={apFilters[col.key]} onFilterChange={(v) => { setApFilters(p => ({...p, [col.key]: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: col.key, direction: d})} />
                    </div>
                  </TableHead>
                ))}

                <TableHead className="text-right w-40 whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    AP PPN
                    <ExcelColumnFilter columnKey="colQ" label="AP PPN" data={getCascadingData("colQ")} activeFilters={apFilters["colQ"]} onFilterChange={(v) => { setApFilters(p => ({...p, colQ: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colQ", direction: d})} />
                  </div>
                </TableHead>

                <TableHead className="text-right w-36 pr-8 pl-4 whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    Outstanding IDR
                    <ExcelColumnFilter columnKey="colS" label="Outstanding IDR" data={getCascadingData("colS")} activeFilters={apFilters["colS"]} onFilterChange={(v) => { setApFilters(p => ({...p, colS: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colS", direction: d})} />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {apLoading ? (
                <TableRow>
                  <TableCell colSpan={20} className="h-96 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 animate-pulse">Synchronizing Accounts Payable...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedAP.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={20} className="h-64 text-center opacity-20">
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
                      <TableCell className="px-4 text-primary/60 truncate max-w-[200px]" title={row.colF}>{row.colF || '-'}</TableCell>
                      <TableCell className="px-4 text-primary/60 truncate max-w-[200px]" title={row.colG}>{row.colG || '-'}</TableCell>

                      {['colI', 'colJ', 'colK', 'colL', 'colM', 'colN', 'colO', 'colP'].map(col => (
                        <TableCell key={col} className={`text-right font-bold whitespace-nowrap ${getValueColor(row[col])}`}>
                          {row[col]}
                        </TableCell>
                      ))}

                      <TableCell className={`text-right font-bold whitespace-nowrap ${getValueColor(row.colQ)}`}>
                        {row.colQ}
                      </TableCell>
                      
                      <TableCell className="pr-8 text-right font-medium text-primary whitespace-nowrap">
                        {row.colS}
                      </TableCell>
                    </TableRow>
                  ))}


                  <TableRow className="bg-secondary/5 border-t-2 border-secondary/30 hover:bg-secondary/5 transition-none font-bold whitespace-nowrap">
                    <TableCell colSpan={4} className="pl-8 py-3 text-[11px] text-secondary/80 uppercase tracking-[0.2em]">
                      Subtotal (Page {apPage})
                    </TableCell>
                    <TableCell className="text-right text-primary whitespace-nowrap">{formatCurrency(subtotalTotals.colE.toString())}</TableCell>
                    <TableCell colSpan={2} className="bg-secondary/[0.02]" />
                    
                    {['colI', 'colJ', 'colK', 'colL', 'colM', 'colN', 'colO', 'colP'].map(col => (
                      <TableCell key={col} className={`text-right whitespace-nowrap ${getValueColor(subtotalTotals[col as keyof typeof subtotalTotals].toString())}`}>
                        {formatCurrency(subtotalTotals[col as keyof typeof subtotalTotals].toString())}
                      </TableCell>
                    ))}

                    <TableCell className={`text-right whitespace-nowrap ${getValueColor(subtotalTotals.colQ.toString())}`}>{formatCurrency(subtotalTotals.colQ.toString())}</TableCell>
                    
                    <TableCell className="pr-8 text-right text-primary whitespace-nowrap">{formatCurrency(subtotalTotals.colS.toString())}</TableCell>
                  </TableRow>

                  <TableRow className="bg-secondary/10 border-t border-secondary/30 hover:bg-secondary/10 transition-none font-bold whitespace-nowrap">
                    <TableCell colSpan={4} className="pl-8 py-3 text-[11px] text-secondary uppercase tracking-[0.2em]">
                      Period Totals ({filteredAndSortedAP.length} results)
                    </TableCell>
                    <TableCell className="text-right text-primary whitespace-nowrap">{formatCurrency(grandTotals.colE.toString())}</TableCell>
                    <TableCell colSpan={2} className="bg-secondary/[0.02]" />
                    
                    {['colI', 'colJ', 'colK', 'colL', 'colM', 'colN', 'colO', 'colP'].map(col => (
                      <TableCell key={col} className={`text-right whitespace-nowrap ${getValueColor(grandTotals[col as keyof typeof grandTotals].toString())}`}>
                        {formatCurrency(grandTotals[col as keyof typeof grandTotals].toString())}
                      </TableCell>
                    ))}

                    <TableCell className={`text-right whitespace-nowrap ${getValueColor(grandTotals.colQ.toString())}`}>{formatCurrency(grandTotals.colQ.toString())}</TableCell>
                    
                    <TableCell className="pr-8 text-right text-primary whitespace-nowrap">{formatCurrency(grandTotals.colS.toString())}</TableCell>
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
        onSuccess={() => refetch()} 
      />
    </div>
  );
}
