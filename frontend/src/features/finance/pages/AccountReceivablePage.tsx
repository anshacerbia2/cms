import { useState, useMemo } from "react";
import { ArrowUpRight, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFinance } from "../hooks/useFinance";
import { PaginationControls } from "@/components/common/PaginationControls";
import { ExcelColumnFilter } from "../components/ExcelColumnFilter";
import { formatCurrency } from "@/lib/utils";

export default function AccountReceivablePage() {
  const [arPage, setArPage] = useState(1);
  const [arSearch, setArSearch] = useState("");
  const [arSort, setArSort] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [arFilters, setArFilters] = useState<Record<string, Set<string> | null>>({});

  const { getAllAR } = useFinance();
  const { data: allAR, isLoading: arLoading } = getAllAR();

  const filteredAndSortedAR = useMemo(() => {
    if (!allAR) return [];
    let result = [...allAR];

    Object.entries(arFilters).forEach(([key, allowedValues]) => {
      if (allowedValues && allowedValues.size > 0) {
        result = result.filter(item => allowedValues.has(String(item[key] || "")));
      }
    });

    if (arSearch) {
      const term = arSearch.toLowerCase();
      result = result.filter(item => 
        String(item.colD || "").toLowerCase().includes(term) ||
        String(item.colE || "").toLowerCase().includes(term)
      );
    }

    if (arSort) {
      const { key, direction } = arSort;
      result.sort((a, b) => {
        const valA = a[key], valB = b[key];
        if (!isNaN(Number(valA)) && !isNaN(Number(valB))) return direction === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        return direction === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      });
    }
    return result;
  }, [allAR, arFilters, arSearch, arSort]);

  const arAccumulatedTotals = useMemo(() => {
    const subset = filteredAndSortedAR.slice(0, arPage * 10);
    return subset.reduce((acc, curr) => {
      const idrInitial = Number(curr.colF) || 0;
      const usdInitial = Number(curr.colG) || 0;
      const rateInitial = Number(curr.colH) || 1;
      const idrOutstanding = Number(curr.colR) || 0;
      const usdOutstanding = Number(curr.colS) || 0;
      const rateOutstanding = Number(curr.colT) || 1;
      return {
        colF: acc.colF + idrInitial,
        colG: acc.colG + usdInitial,
        colH: acc.colH + (Number(curr.colH) || 0),
        colJ: acc.colJ + (Number(curr.colJ) || 0),
        colK: acc.colK + (Number(curr.colK) || 0),
        colL: acc.colL + (Number(curr.colL) || 0),
        colM: acc.colM + (Number(curr.colM) || 0),
        colN: acc.colN + (Number(curr.colN) || 0),
        colO: acc.colO + (Number(curr.colO) || 0),
        colP: acc.colP + (Number(curr.colP) || 0),
        colR: acc.colR + idrOutstanding,
        colS: acc.colS + usdOutstanding,
        colT: acc.colT + (Number(curr.colT) || 0),
        convertedInitial: acc.convertedInitial + idrInitial + (usdInitial * rateInitial),
        convertedOutstanding: acc.convertedOutstanding + idrOutstanding + (usdOutstanding * rateOutstanding)
      };
    }, { colF:0, colG:0, colH:0, colJ:0, colK:0, colL:0, colM:0, colN:0, colO:0, colP:0, colR:0, colS:0, colT:0, convertedInitial: 0, convertedOutstanding: 0 });
  }, [filteredAndSortedAR, arPage]);

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-primary flex items-center gap-2 sm:gap-3">
              <ArrowUpRight className="text-secondary shrink-0 w-6 h-6 sm:w-8 sm:h-8" />
              Account Receivable
            </h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">Manage and track your account receivables.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white/50 p-4 rounded-[2rem] border border-primary/5 backdrop-blur-sm shadow-sm w-full">
        <div className="flex flex-col md:flex-row items-center gap-3 flex-1 w-full">
          <div className="relative flex-1 w-full md:max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 group-focus-within:text-primary transition-colors" size={18} />
            <Input 
              placeholder="Universal AR Search (Entity, Description)..." 
              value={arSearch}
              onChange={(e) => { setArSearch(e.target.value); setArPage(1); }}
              className="pl-12 h-11 bg-white border-primary/5 rounded-xl shadow-sm text-[12px] font-bold text-primary transition-all focus-visible:ring-primary/20"
            />
          </div>
          {Object.keys(arFilters).some(k => (arFilters[k]?.size || 0) > 0) && (
            <Button variant="ghost" size="sm" onClick={() => setArFilters({})} className="h-11 px-4 w-full md:w-auto text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl">
              Clear All Filters
            </Button>
          )}
        </div>
        <Badge variant="outline" className="h-11 px-6 w-full md:w-auto flex justify-center rounded-xl bg-primary/5 text-primary border-primary/10 font-black uppercase tracking-[0.2em] text-[11px]">
          {filteredAndSortedAR.length} Records
        </Badge>
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] shadow-premium border border-primary/5 overflow-x-auto overflow-hidden">
        <Table className="min-w-[2400px]">
          <TableHeader className="bg-primary/5">
            <TableRow className="hover:bg-transparent border-primary/5 h-12 whitespace-nowrap">
              <TableHead rowSpan={2} className="pl-8 text-[11px] font-black uppercase tracking-tight text-primary w-24 border-r border-primary/10">
                <div className="flex items-center">
                  TYPE
                  <ExcelColumnFilter columnKey="colB" label="Type" data={allAR || []} activeFilters={arFilters["colB"]} onFilterChange={(v) => { setArFilters(p => ({...p, colB: v})); setArPage(1); }} currentSort={arSort} onSort={(d) => { setArSort({key: "colB", direction: d}); setArPage(1); }} />
                </div>
              </TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-32 border-r border-primary/10">
                <div className="flex items-center">
                  SUB CATEGORY
                  <ExcelColumnFilter columnKey="colC" label="Sub Category" data={allAR || []} activeFilters={arFilters["colC"]} onFilterChange={(v) => { setArFilters(p => ({...p, colC: v})); setArPage(1); }} currentSort={arSort} onSort={(d) => { setArSort({key: "colC", direction: d}); setArPage(1); }} />
                </div>
              </TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-48 border-r border-primary/10">
                <div className="flex items-center">
                  ENTITY NAME
                  <ExcelColumnFilter columnKey="colD" label="Entity Name" data={allAR || []} activeFilters={arFilters["colD"]} onFilterChange={(v) => { setArFilters(p => ({...p, colD: v})); setArPage(1); }} currentSort={arSort} onSort={(d) => { setArSort({key: "colD", direction: d}); setArPage(1); }} />
                </div>
              </TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-64 border-r border-primary/10">
                <div className="flex items-center">
                  DESCRIPTION
                  <ExcelColumnFilter columnKey="colE" label="Description" data={allAR || []} activeFilters={arFilters["colE"]} onFilterChange={(v) => { setArFilters(p => ({...p, colE: v})); setArPage(1); }} currentSort={arSort} onSort={(d) => { setArSort({key: "colE", direction: d}); setArPage(1); }} />
                </div>
              </TableHead>
              <TableHead colSpan={3} className="text-center text-[11px] font-black uppercase tracking-widest text-primary bg-primary/5 border-b border-primary/10 border-r border-primary/10">END OF 2020</TableHead>
              <TableHead colSpan={7} className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-secondary bg-secondary/5 border-r border-primary/10 border-b border-primary/10">MUTASI 2021</TableHead>
              <TableHead colSpan={3} className="text-center text-[11px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border-b border-primary/10 whitespace-nowrap">OUTSTANDING</TableHead>
            </TableRow>
            <TableRow className="hover:bg-transparent border-primary/5 h-12 bg-primary/5 whitespace-nowrap">
               <TableHead className="text-[11px] font-bold text-primary text-right">
                <div className="flex items-center justify-end gap-1">
                  IDR
                  <ExcelColumnFilter columnKey="colF" label="IDR (2020)" data={allAR || []} activeFilters={arFilters["colF"]} onFilterChange={(v) => { setArFilters(p => ({...p, colF: v})); setArPage(1); }} currentSort={arSort} onSort={(d) => { setArSort({key: "colF", direction: d}); setArPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary text-right">
                <div className="flex items-center justify-end gap-1">
                  USD
                  <ExcelColumnFilter columnKey="colG" label="USD (2020)" data={allAR || []} activeFilters={arFilters["colG"]} onFilterChange={(v) => { setArFilters(p => ({...p, colG: v})); setArPage(1); }} currentSort={arSort} onSort={(d) => { setArSort({key: "colG", direction: d}); setArPage(1); }} valueFormatter={(v) => formatCurrency(v, 'USD')} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary text-right border-r border-primary/10 italic">
                <div className="flex items-center justify-end gap-1">
                  RATE
                  <ExcelColumnFilter columnKey="colH" label="Rate" data={allAR || []} activeFilters={arFilters["colH"]} onFilterChange={(v) => { setArFilters(p => ({...p, colH: v})); setArPage(1); }} currentSort={arSort} onSort={(d) => { setArSort({key: "colH", direction: d}); setArPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right">
                <div className="flex items-center justify-end gap-1">
                  BCA
                  <ExcelColumnFilter columnKey="colJ" label="BCA" data={allAR || []} activeFilters={arFilters["colJ"]} onFilterChange={(v) => { setArFilters(p => ({...p, colJ: v})); setArPage(1); }} currentSort={arSort} onSort={(d) => { setArSort({key: "colJ", direction: d}); setArPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right">
                <div className="flex items-center justify-end gap-1">
                  MANDIRI
                  <ExcelColumnFilter columnKey="colK" label="Mandiri" data={allAR || []} activeFilters={arFilters["colK"]} onFilterChange={(v) => { setArFilters(p => ({...p, colK: v})); setArPage(1); }} currentSort={arSort} onSort={(d) => { setArSort({key: "colK", direction: d}); setArPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right">
                <div className="flex items-center justify-end gap-1">
                  BNI
                  <ExcelColumnFilter columnKey="colL" label="BNI" data={allAR || []} activeFilters={arFilters["colL"]} onFilterChange={(v) => { setArFilters(p => ({...p, colL: v})); setArPage(1); }} currentSort={arSort} onSort={(d) => { setArSort({key: "colL", direction: d}); setArPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right">
                <div className="flex items-center justify-end gap-1">
                  CASH IDR
                  <ExcelColumnFilter columnKey="colM" label="Cash IDR" data={allAR || []} activeFilters={arFilters["colM"]} onFilterChange={(v) => { setArFilters(p => ({...p, colM: v})); setArPage(1); }} currentSort={arSort} onSort={(d) => { setArSort({key: "colM", direction: d}); setArPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right">
                <div className="flex items-center justify-end gap-1">
                  NON CB
                  <ExcelColumnFilter columnKey="colN" label="Non CB" data={allAR || []} activeFilters={arFilters["colN"]} onFilterChange={(v) => { setArFilters(p => ({...p, colN: v})); setArPage(1); }} currentSort={arSort} onSort={(d) => { setArSort({key: "colN", direction: d}); setArPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right">
                <div className="flex items-center justify-end gap-1">
                  CEK BANK
                  <ExcelColumnFilter columnKey="colO" label="Cek Bank" data={allAR || []} activeFilters={arFilters["colO"]} onFilterChange={(v) => { setArFilters(p => ({...p, colO: v})); setArPage(1); }} currentSort={arSort} onSort={(d) => { setArSort({key: "colO", direction: d}); setArPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right border-r border-primary/10">
                <div className="flex items-center justify-end gap-1">
                  CASH USD
                  <ExcelColumnFilter columnKey="colP" label="Cash USD" data={allAR || []} activeFilters={arFilters["colP"]} onFilterChange={(v) => { setArFilters(p => ({...p, colP: v})); setArPage(1); }} currentSort={arSort} onSort={(d) => { setArSort({key: "colP", direction: d}); setArPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-emerald-600 text-right bg-emerald-50/30">
                <div className="flex items-center justify-end gap-1">
                  IDR
                  <ExcelColumnFilter columnKey="colR" label="IDR Outstanding" data={allAR || []} activeFilters={arFilters["colR"]} onFilterChange={(v) => { setArFilters(p => ({...p, colR: v})); setArPage(1); }} currentSort={arSort} onSort={(d) => { setArSort({key: "colR", direction: d}); setArPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-emerald-600 text-right bg-emerald-50/30">
                <div className="flex items-center justify-end gap-1">
                  USD
                  <ExcelColumnFilter columnKey="colS" label="USD Outstanding" data={allAR || []} activeFilters={arFilters["colS"]} onFilterChange={(v) => { setArFilters(p => ({...p, colS: v})); setArPage(1); }} currentSort={arSort} onSort={(d) => { setArSort({key: "colS", direction: d}); setArPage(1); }} valueFormatter={(v) => formatCurrency(v, 'USD')} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-emerald-600 text-right bg-emerald-50/30 border-r border-primary/10 italic">
                <div className="flex items-center justify-end gap-1">
                  RATE
                  <ExcelColumnFilter columnKey="colT" label="Rate Outstanding" data={allAR || []} activeFilters={arFilters["colT"]} onFilterChange={(v) => { setArFilters(p => ({...p, colT: v})); setArPage(1); }} currentSort={arSort} onSort={(d) => { setArSort({key: "colT", direction: d}); setArPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {arLoading ? (
              <TableRow>
                <TableCell colSpan={17} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Processing Accounts Receivable Data...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredAndSortedAR.length === 0 ? (
              <TableRow><TableCell colSpan={18} className="h-64 text-center opacity-20"><Search size={48} className="mx-auto" /><p className="mt-4 font-black uppercase tracking-widest">No matching AR found</p></TableCell></TableRow>
            ) : (
              <>
                {filteredAndSortedAR.slice((arPage - 1) * 10, arPage * 10).map((row: any) => (
                  <TableRow key={row.id} className="border-primary/5 hover:bg-primary/5 transition-colors whitespace-nowrap">
                    <TableCell className="pl-8 py-4 border-r border-primary/5">
                        <span className="text-primary text-[12px] font-black uppercase tracking-tight">{row.colB}</span>
                    </TableCell>
                    <TableCell className="py-4 text-[12px] font-bold text-primary/60 uppercase border-r border-primary/5">{row.colC}</TableCell>
                    <TableCell className="py-4 font-black text-primary text-[12px] uppercase truncate border-r border-primary/5">{row.colD}</TableCell>
                    <TableCell className="py-4 text-[12px] font-medium text-primary/60 truncate border-r border-primary/5 max-w-[200px]">{row.colE}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary">{formatCurrency(row.colF)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary">{formatCurrency(row.colG, 'USD')}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary/60 border-r border-primary/5 italic">{Number(row.colH) !== 0 ? formatCurrency(row.colH) : '-'}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary">{formatCurrency(row.colJ)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary">{formatCurrency(row.colK)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary">{formatCurrency(row.colL)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary">{formatCurrency(row.colM)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary">{formatCurrency(row.colN)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary">{formatCurrency(row.colO)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary border-r border-primary/5">{formatCurrency(row.colP)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-black text-emerald-600 bg-emerald-500/5">{formatCurrency(row.colR)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-black text-emerald-600 bg-emerald-500/5">{formatCurrency(row.colS, 'USD')}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-emerald-600/60 bg-emerald-500/5 border-r border-primary/5 italic">{formatCurrency(row.colT)}</TableCell>
                  </TableRow>
                ))}

                {filteredAndSortedAR.length > 0 && (
                  <>
                    <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                      <TableCell colSpan={4} className="pl-10 py-5 font-black text-[12px] text-primary uppercase tracking-[0.2em]">Accumulated Balance (Page 1-{arPage})</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">{arAccumulatedTotals.colF !== 0 ? formatCurrency(arAccumulatedTotals.colF) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">{formatCurrency(arAccumulatedTotals.colG, 'USD')}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] bg-primary/5 border-r border-primary/10 whitespace-nowrap">{arAccumulatedTotals.colH !== 0 ? formatCurrency(arAccumulatedTotals.colH) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">{arAccumulatedTotals.colJ !== 0 ? formatCurrency(arAccumulatedTotals.colJ) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">{arAccumulatedTotals.colK !== 0 ? formatCurrency(arAccumulatedTotals.colK) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">{arAccumulatedTotals.colL !== 0 ? formatCurrency(arAccumulatedTotals.colL) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">{arAccumulatedTotals.colM !== 0 ? formatCurrency(arAccumulatedTotals.colM) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">{arAccumulatedTotals.colN !== 0 ? formatCurrency(arAccumulatedTotals.colN) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">{arAccumulatedTotals.colO !== 0 ? formatCurrency(arAccumulatedTotals.colO) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap border-r border-primary/10">{arAccumulatedTotals.colP !== 0 ? formatCurrency(arAccumulatedTotals.colP, 'USD') : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-emerald-600 text-[12px] bg-emerald-500/10 whitespace-nowrap">{arAccumulatedTotals.colR !== 0 ? formatCurrency(arAccumulatedTotals.colR) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-emerald-600 text-[12px] bg-emerald-500/10 whitespace-nowrap">{formatCurrency(arAccumulatedTotals.colS, 'USD')}</TableCell>
                      <TableCell className="py-5 text-right font-black text-emerald-600/60 text-[12px] bg-emerald-500/10 italic whitespace-nowrap">{formatCurrency(arAccumulatedTotals.colT)}</TableCell>
                    </TableRow>

                    <TableRow className="bg-primary/10 border-t-2 border-primary/30">
                      <TableCell colSpan={4} className="pl-10 py-5 font-black text-[12px] text-primary uppercase tracking-[0.2em]">Total IDR Summary (Converted)</TableCell>
                      <TableCell colSpan={3} className="py-5 text-right font-black text-primary text-[14px] bg-primary/10 border-r border-primary/20">{formatCurrency(arAccumulatedTotals.convertedInitial)}</TableCell>
                      <TableCell colSpan={7} className="bg-transparent" />
                      <TableCell colSpan={3} className="py-5 text-right font-black text-emerald-700 text-[14px] bg-emerald-500/10">{formatCurrency(arAccumulatedTotals.convertedOutstanding)}</TableCell>
                    </TableRow>
                  </>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationControls meta={{ total: filteredAndSortedAR.length, page: arPage, limit: 10, lastPage: Math.ceil(filteredAndSortedAR.length / 10) || 1 }} onPageChange={setArPage} isFetching={arLoading} />
    </div>
  );
}
