import { useState, useMemo } from "react";
import { ArrowDownRight, Search, FilterX } from 'lucide-react';
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
import { useFinance } from "../hooks/useFinance";
import { PaginationControls } from "@/components/common/PaginationControls";
import { ExcelColumnFilter } from "../components/ExcelColumnFilter";
import { formatCurrency } from "@/lib/utils";
import { Decimal } from "decimal.js";

export default function AccountPayablePage() {
  const [apPage, setApPage] = useState(1);
  const [apSearch, setApSearch] = useState("");
  const [apSort, setApSort] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [apFilters, setApFilters] = useState<Record<string, Set<string> | null>>({});
  const apLimit = 10;

  const { getAllAP } = useFinance();
  const { data: allAP, isLoading: apLoading } = getAllAP();

  const filteredAndSortedAP = useMemo(() => {
    if (!allAP) return [];
    let result = [...allAP];

    // 1. Column Filters
    Object.entries(apFilters).forEach(([key, allowedValues]) => {
      if (allowedValues && allowedValues.size > 0) {
        result = result.filter(item => allowedValues.has(String(item[key] || "")));
      }
    });

    // 2. Global Search
    if (apSearch) {
      const term = apSearch.toLowerCase();
      result = result.filter(item => 
        String(item.colC || "").toLowerCase().includes(term) || // Vendor
        String(item.colD || "").toLowerCase().includes(term) || // Keterangan
        String(item.colA || "").toLowerCase().includes(term)    // Payable No
      );
    }

    // 3. Sorting
    if (apSort) {
      const { key, direction } = apSort;
      result.sort((a, b) => {
        const valA = a[key], valB = b[key];
        const stringCols = ['colA', 'colC', 'colD', 'colF', 'colG', 'colH', 'colR'];
        if (!isNaN(Number(valA)) && !isNaN(Number(valB)) && !stringCols.includes(key)) {
           return direction === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        }
        return direction === 'asc' 
          ? String(valA || "").localeCompare(String(valB || "")) 
          : String(valB || "").localeCompare(String(valA || ""));
      });
    }
    return result;
  }, [allAP, apFilters, apSearch, apSort]);

  // Helper for Cascading (Excel-like) Filters
  const getCascadingData = (excludeKey: string) => {
    if (!allAP) return [];
    let result = [...allAP];
    
    // 1. Apply Global Search first
    if (apSearch) {
      const term = apSearch.toLowerCase();
      result = result.filter(item => 
        String(item.colC || "").toLowerCase().includes(term) ||
        String(item.colD || "").toLowerCase().includes(term) ||
        String(item.colA || "").toLowerCase().includes(term)
      );
    }
    
    // 2. Apply all OTHER column filters
    Object.entries(apFilters).forEach(([key, values]) => {
      if (key !== excludeKey && values && values.size > 0) {
        result = result.filter(item => values.has(String(item[key as keyof typeof item] || "")));
      }
    });
    
    return result;
  };

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
      return {
        colE: acc.colE.plus(new Decimal(curr.colE || 0)),
        colI: acc.colI.plus(new Decimal(curr.colI || 0)),
        colJ: acc.colJ.plus(new Decimal(curr.colJ || 0)),
        colK: acc.colK.plus(new Decimal(curr.colK || 0)),
        colL: acc.colL.plus(new Decimal(curr.colL || 0)),
        colM: acc.colM.plus(new Decimal(curr.colM || 0)),
        colN: acc.colN.plus(new Decimal(curr.colN || 0)),
        colO: acc.colO.plus(new Decimal(curr.colO || 0)),
        colP: acc.colP.plus(new Decimal(curr.colP || 0)),
        colQ: acc.colQ.plus(new Decimal(curr.colQ || 0)),
        colS: acc.colS.plus(new Decimal(curr.colS || 0)),
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
      return {
        colE: acc.colE.plus(new Decimal(curr.colE || 0)),
        colI: acc.colI.plus(new Decimal(curr.colI || 0)),
        colJ: acc.colJ.plus(new Decimal(curr.colJ || 0)),
        colK: acc.colK.plus(new Decimal(curr.colK || 0)),
        colL: acc.colL.plus(new Decimal(curr.colL || 0)),
        colM: acc.colM.plus(new Decimal(curr.colM || 0)),
        colN: acc.colN.plus(new Decimal(curr.colN || 0)),
        colO: acc.colO.plus(new Decimal(curr.colO || 0)),
        colP: acc.colP.plus(new Decimal(curr.colP || 0)),
        colQ: acc.colQ.plus(new Decimal(curr.colQ || 0)),
        colS: acc.colS.plus(new Decimal(curr.colS || 0)),
      };
    }, { 
      colE: new Decimal(0), colI: new Decimal(0), colJ: new Decimal(0), 
      colK: new Decimal(0), colL: new Decimal(0), colM: new Decimal(0), 
      colN: new Decimal(0), colO: new Decimal(0), colP: new Decimal(0),
      colQ: new Decimal(0), colS: new Decimal(0)
    });
  }, [filteredAndSortedAP]);

  const handleClearFilters = () => {
    setApSearch("");
    setApFilters({});
    setApPage(1);
  };

  const isAnyFilterActive = apSearch !== "" || Object.keys(apFilters).length > 0;

  // Helper to get color based on value
  const getValueColor = (val: any) => {
    const num = Number(val || 0);
    if (num > 0) return "text-emerald-600";
    if (num < 0) return "text-rose-600";
    return "text-primary/60";
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-primary flex items-center gap-2 sm:gap-3">
              <ArrowDownRight className="text-secondary shrink-0 w-6 h-6 sm:w-8 sm:h-8" />
              Account Payable
            </h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium ml-8 sm:ml-11">Modular management and tracking for payables.</p>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search payables (Vendor, Keterangan)..." 
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 text-[13px] font-medium"
            value={apSearch}
            onChange={(e) => { setApSearch(e.target.value); setApPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2">
           {isAnyFilterActive && (
            <Button 
              onClick={handleClearFilters}
              className="h-12 w-12 bg-white border-0 text-muted-foreground hover:text-red-500 hover:bg-red-50/50 rounded-xl shadow-sm flex items-center justify-center shrink-0 transition-all"
            >
              <FilterX size={20} />
            </Button>
          )}
          <Badge variant="outline" className="h-12 px-6 flex justify-center rounded-xl bg-white border-0 shadow-sm text-primary font-black uppercase tracking-widest text-[10px]">
            {filteredAndSortedAP.length} Records
          </Badge>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-premium border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[2600px]">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap">
                <TableHead className="pl-8 py-3 text-[10px] font-black uppercase tracking-widest text-primary/40 w-32 text-left border-r border-primary/5">
                  <div className="flex items-center justify-start gap-1">
                    Payable
                    <ExcelColumnFilter columnKey="colA" label="Payable" data={getCascadingData("colA")} activeFilters={apFilters["colA"]} onFilterChange={(v) => { setApFilters(p => ({...p, colA: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colA", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="py-3 text-[10px] font-black uppercase tracking-widest text-primary/40 w-20 border-r border-primary/5 px-4">
                  <div className="flex items-center gap-1">
                    Year
                    <ExcelColumnFilter columnKey="colB" label="Year" data={getCascadingData("colB")} activeFilters={apFilters["colB"]} onFilterChange={(v) => { setApFilters(p => ({...p, colB: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colB", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="py-3 text-[10px] font-black uppercase tracking-widest text-primary/40 w-48 border-r border-primary/5 px-4">
                  <div className="flex items-center gap-1">
                    Vendor
                    <ExcelColumnFilter columnKey="colC" label="Vendor" data={getCascadingData("colC")} activeFilters={apFilters["colC"]} onFilterChange={(v) => { setApFilters(p => ({...p, colC: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colC", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="py-3 text-[10px] font-black uppercase tracking-widest text-primary/40 w-64 border-r border-primary/5 px-4">
                  <div className="flex items-center gap-1">
                    Keterangan
                    <ExcelColumnFilter columnKey="colD" label="Keterangan" data={getCascadingData("colD")} activeFilters={apFilters["colD"]} onFilterChange={(v) => { setApFilters(p => ({...p, colD: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colD", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-primary/40 w-40 border-r border-primary/5 pr-4 whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    EOY IDR
                    <ExcelColumnFilter columnKey="colE" label="EOY IDR" data={getCascadingData("colE")} activeFilters={apFilters["colE"]} onFilterChange={(v) => { setApFilters(p => ({...p, colE: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colE", direction: d})} valueFormatter={formatCurrency} />
                  </div>
                </TableHead>

                <TableHead className="py-3 text-[10px] font-black uppercase tracking-widest text-primary/40 w-56 border-r border-primary/5 px-4">
                    <div className="flex items-center gap-1">
                    Col F
                    <ExcelColumnFilter columnKey="colF" label="Col F" data={getCascadingData("colF")} activeFilters={apFilters["colF"]} onFilterChange={(v) => { setApFilters(p => ({...p, colF: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colF", direction: d})} />
                  </div>
                </TableHead>
                <TableHead className="py-3 text-[10px] font-black uppercase tracking-widest text-primary/40 w-56 border-r border-primary/5 px-4">
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
                  <TableHead key={col.key} className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-primary/40 w-36 border-r border-primary/5 pr-4 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {col.label}
                      <ExcelColumnFilter columnKey={col.key} label={col.label} data={getCascadingData(col.key)} activeFilters={apFilters[col.key]} onFilterChange={(v) => { setApFilters(p => ({...p, [col.key]: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: col.key, direction: d})} valueFormatter={formatCurrency} />
                    </div>
                  </TableHead>
                ))}

                <TableHead className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-primary/40 w-40 border-r border-primary/5 pr-4 whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    AP PPN
                    <ExcelColumnFilter columnKey="colQ" label="AP PPN" data={getCascadingData("colQ")} activeFilters={apFilters["colQ"]} onFilterChange={(v) => { setApFilters(p => ({...p, colQ: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colQ", direction: d})} valueFormatter={formatCurrency} />
                  </div>
                </TableHead>

                <TableHead className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-primary/40 w-36 pr-8 pl-4 whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    Outstanding IDR
                    <ExcelColumnFilter columnKey="colS" label="Outstanding IDR" data={getCascadingData("colS")} activeFilters={apFilters["colS"]} onFilterChange={(v) => { setApFilters(p => ({...p, colS: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => setApSort({key: "colS", direction: d})} valueFormatter={formatCurrency} />
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
                    <TableRow key={row.id} className="border-primary/5 hover:bg-transparent transition-none whitespace-nowrap group">
                      <TableCell className="pl-8 py-3 border-r border-primary/5 text-left">
                         <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] font-black uppercase tracking-tight px-1.5 py-0.5">{row.colA}</Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-[12px] text-primary/60 border-r border-primary/5">{row.colB}</TableCell>
                      <TableCell className="py-3 px-4 font-bold text-primary text-[12px] border-r border-primary/5 uppercase truncate max-w-[150px]">{row.colC}</TableCell>
                      <TableCell className="py-3 px-4 text-[12px] text-primary/60 border-r border-primary/5 truncate max-w-[200px]" title={row.colD}>{row.colD || '-'}</TableCell>
                      <TableCell className="py-3 pr-4 text-right text-[12px] font-medium text-primary border-r border-primary/5 whitespace-nowrap">{formatCurrency(row.colE)}</TableCell>
                      <TableCell className="py-3 px-4 text-[12px] text-primary/60 border-r border-primary/5 truncate max-w-[200px]" title={row.colF}>{row.colF || '-'}</TableCell>
                      <TableCell className="py-3 px-4 text-[12px] text-primary/60 border-r border-primary/5 truncate max-w-[200px]" title={row.colG}>{row.colG || '-'}</TableCell>

                      {['colI', 'colJ', 'colK', 'colL', 'colM', 'colN', 'colO', 'colP'].map(col => (
                        <TableCell key={col} className={`py-3 pr-4 text-right text-[12px] font-bold border-r border-primary/5 whitespace-nowrap ${getValueColor(row[col])}`}>
                          {Number(row[col]) !== 0 ? formatCurrency(row[col]) : "-"}
                        </TableCell>
                      ))}

                      <TableCell className={`py-3 pr-4 text-right text-[12px] font-bold border-r border-primary/5 whitespace-nowrap ${getValueColor(row.colQ)}`}>
                        {Number(row.colQ) !== 0 ? formatCurrency(row.colQ) : "-"}
                      </TableCell>
                      
                      <TableCell className="py-3 pr-8 text-right text-[12px] font-medium text-primary whitespace-nowrap">
                        {Number(row.colS) !== 0 ? formatCurrency(row.colS) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Summary Rows */}
                  <TableRow className="bg-secondary/5 border-t-2 border-secondary/30 hover:bg-secondary/5 transition-none font-bold whitespace-nowrap">
                    <TableCell colSpan={4} className="pl-8 py-3 text-[11px] text-secondary/80 uppercase tracking-[0.2em]">
                      Subtotal (Page {apPage})
                    </TableCell>
                    <TableCell className="py-3 pr-4 text-right text-[12px] text-primary border-r border-secondary/20 whitespace-nowrap">{formatCurrency(subtotalTotals.colE.toString())}</TableCell>
                    <TableCell colSpan={2} className="bg-secondary/[0.02] border-r border-secondary/20" />
                    
                    {['colI', 'colJ', 'colK', 'colL', 'colM', 'colN', 'colO', 'colP'].map(col => (
                      <TableCell key={col} className={`py-3 pr-4 text-right text-[12px] border-r border-secondary/20 whitespace-nowrap ${getValueColor(subtotalTotals[col as keyof typeof subtotalTotals].toString())}`}>
                        {formatCurrency(subtotalTotals[col as keyof typeof subtotalTotals].toString())}
                      </TableCell>
                    ))}

                    <TableCell className={`py-3 pr-4 text-right text-[12px] border-r border-secondary/20 whitespace-nowrap ${getValueColor(subtotalTotals.colQ.toString())}`}>{formatCurrency(subtotalTotals.colQ.toString())}</TableCell>
                    
                    <TableCell className="py-3 pr-8 text-right text-[12px] text-primary whitespace-nowrap">{formatCurrency(subtotalTotals.colS.toString())}</TableCell>
                  </TableRow>

                  <TableRow className="bg-secondary/10 border-t border-secondary/30 hover:bg-secondary/10 transition-none font-bold whitespace-nowrap">
                    <TableCell colSpan={4} className="pl-8 py-3 text-[11px] text-secondary uppercase tracking-[0.2em]">
                      Period Totals ({filteredAndSortedAP.length} records)
                    </TableCell>
                    <TableCell className="py-3 pr-4 text-right text-[12px] text-primary border-r border-secondary/20 whitespace-nowrap">{formatCurrency(grandTotals.colE.toString())}</TableCell>
                    <TableCell colSpan={2} className="bg-secondary/[0.02] border-r border-secondary/20" />
                    
                    {['colI', 'colJ', 'colK', 'colL', 'colM', 'colN', 'colO', 'colP'].map(col => (
                      <TableCell key={col} className={`py-3 pr-4 text-right text-[12px] border-r border-secondary/20 whitespace-nowrap ${getValueColor(grandTotals[col as keyof typeof grandTotals].toString())}`}>
                        {formatCurrency(grandTotals[col as keyof typeof grandTotals].toString())}
                      </TableCell>
                    ))}

                    <TableCell className={`py-3 pr-4 text-right text-[12px] border-r border-secondary/20 whitespace-nowrap ${getValueColor(grandTotals.colQ.toString())}`}>{formatCurrency(grandTotals.colQ.toString())}</TableCell>
                    
                    <TableCell className="py-3 pr-8 text-right text-[12px] text-primary whitespace-nowrap">{formatCurrency(grandTotals.colS.toString())}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <PaginationControls meta={apMeta} onPageChange={setApPage} isFetching={apLoading} />
    </div>
  );
}
