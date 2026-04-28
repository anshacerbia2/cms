import { useState, useMemo } from "react";
import { ArrowDownRight, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFinance } from "../hooks/useFinance";
import { PaginationControls } from "@/components/common/PaginationControls";
import { ExcelColumnFilter } from "../components/ExcelColumnFilter";
import { formatCurrency } from "@/lib/utils";

export default function AccountPayablePage() {
  const [apPage, setApPage] = useState(1);
  const [apSearch, setApSearch] = useState("");
  const [apSort, setApSort] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [apFilters, setApFilters] = useState<Record<string, Set<string> | null>>({});

  const { getAllAP } = useFinance();
  const { data: allAP, isLoading: apLoading } = getAllAP();

  const filteredAndSortedAP = useMemo(() => {
    if (!allAP) return [];
    let result = [...allAP];

    Object.entries(apFilters).forEach(([key, allowedValues]) => {
      if (allowedValues && allowedValues.size > 0) {
        result = result.filter(item => allowedValues.has(String(item[key] || "")));
      }
    });

    if (apSearch) {
      const term = apSearch.toLowerCase();
      result = result.filter(item => 
        String(item.colC || "").toLowerCase().includes(term) ||
        String(item.colD || "").toLowerCase().includes(term)
      );
    }

    if (apSort) {
      const { key, direction } = apSort;
      result.sort((a, b) => {
        const valA = a[key], valB = b[key];
        if (!isNaN(Number(valA)) && !isNaN(Number(valB))) return direction === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        return direction === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      });
    }
    return result;
  }, [allAP, apFilters, apSearch, apSort]);

  const apAccumulatedTotals = useMemo(() => {
    const subset = filteredAndSortedAP.slice(0, apPage * 10);
    return subset.reduce((acc, curr) => {
      const idr = Number(curr.colT) || 0;
      const usd = Number(curr.colU) || 0;
      const rate = Number(curr.colG) || 1;
      return {
        colE: acc.colE + (Number(curr.colE) || 0),
        colF: acc.colF + (Number(curr.colF) || 0),
        colG: acc.colG + (Number(curr.colG) || 0),
        colK: acc.colK + (Number(curr.colK) || 0),
        colL: acc.colL + (Number(curr.colL) || 0),
        colM: acc.colM + (Number(curr.colM) || 0),
        colN: acc.colN + (Number(curr.colN) || 0),
        colO: acc.colO + (Number(curr.colO) || 0),
        colP: acc.colP + (Number(curr.colP) || 0),
        colQ: acc.colQ + (Number(curr.colQ) || 0),
        colR: acc.colR + (Number(curr.colR) || 0),
        colT: acc.colT + idr,
        colU: acc.colU + usd,
        colW: acc.colW + (Number(curr.colW) || 0),
        colX: acc.colX + (Number(curr.colX) || 0),
        convertedInitial: acc.convertedInitial + (Number(curr.colE) || 0) + ((Number(curr.colF) || 0) * (Number(curr.colG) || 0)),
        convertedOutstanding: acc.convertedOutstanding + idr + (usd * rate)
      };
    }, { colE:0, colF:0, colG:0, colK:0, colL:0, colM:0, colN:0, colO:0, colP:0, colQ:0, colR:0, colT:0, colU:0, colW:0, colX:0, convertedInitial: 0, convertedOutstanding: 0 });
  }, [filteredAndSortedAP, apPage]);

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-primary flex items-center gap-2 sm:gap-3">
              <ArrowDownRight className="text-secondary shrink-0 w-6 h-6 sm:w-8 sm:h-8" />
              Account Payable
            </h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">Manage and track your account payables.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white/50 p-4 rounded-[2rem] border border-primary/5 backdrop-blur-sm shadow-sm w-full">
        <div className="flex flex-col md:flex-row items-center gap-3 flex-1 w-full">
          <div className="relative flex-1 w-full md:max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 group-focus-within:text-primary transition-colors" size={18} />
            <Input 
              placeholder="Universal AP Search (Vendor, Keterangan)..." 
              value={apSearch}
              onChange={(e) => { setApSearch(e.target.value); setApPage(1); }}
              className="pl-12 h-11 bg-white border-primary/5 rounded-xl shadow-sm text-[12px] font-bold text-primary transition-all focus-visible:ring-primary/20"
            />
          </div>
          {Object.keys(apFilters).some(k => (apFilters[k]?.size || 0) > 0) && (
            <Button variant="ghost" size="sm" onClick={() => setApFilters({})} className="h-11 px-4 w-full md:w-auto text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl">
              Clear All Filters
            </Button>
          )}
        </div>
        <Badge variant="outline" className="h-11 px-6 w-full md:w-auto flex justify-center rounded-xl bg-primary/5 text-primary border-primary/10 font-black uppercase tracking-[0.2em] text-[11px]">
          {filteredAndSortedAP.length} Records
        </Badge>
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] shadow-premium border border-primary/5 overflow-x-auto overflow-hidden">
        <Table className="min-w-[2600px]">
          <TableHeader className="bg-primary/5">
            <TableRow className="hover:bg-transparent border-primary/5 h-12 whitespace-nowrap">
              <TableHead rowSpan={2} className="pl-8 text-[11px] font-black uppercase tracking-tight text-primary w-24 border-r border-primary/10">
                <div className="flex items-center">
                  PAYABLE
                  <ExcelColumnFilter columnKey="colA" label="Payable" data={allAP || []} activeFilters={apFilters["colA"]} onFilterChange={(v) => { setApFilters(p => ({...p, colA: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colA", direction: d}); setApPage(1); }} />
                </div>
              </TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-16 border-r border-primary/10">
                <div className="flex items-center">
                  YEAR
                  <ExcelColumnFilter columnKey="colB" label="Year" data={allAP || []} activeFilters={apFilters["colB"]} onFilterChange={(v) => { setApFilters(p => ({...p, colB: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colB", direction: d}); setApPage(1); }} />
                </div>
              </TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-48 border-r border-primary/10">
                <div className="flex items-center">
                  VENDOR
                  <ExcelColumnFilter columnKey="colC" label="Vendor" data={allAP || []} activeFilters={apFilters["colC"]} onFilterChange={(v) => { setApFilters(p => ({...p, colC: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colC", direction: d}); setApPage(1); }} />
                </div>
              </TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-64 border-r border-primary/10">
                <div className="flex items-center">
                  KETERANGAN
                  <ExcelColumnFilter columnKey="colD" label="Keterangan" data={allAP || []} activeFilters={apFilters["colD"]} onFilterChange={(v) => { setApFilters(p => ({...p, colD: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colD", direction: d}); setApPage(1); }} />
                </div>
              </TableHead>
              <TableHead colSpan={3} className="bg-transparent border-r border-primary/10 border-b border-primary/10" />
              <TableHead rowSpan={2} className="text-[11px] font-bold text-primary text-right w-32 border-r border-primary/10">
                <div className="flex items-center justify-end gap-1">
                  COL-H
                  <ExcelColumnFilter columnKey="colH" label="COL-H" data={allAP || []} activeFilters={apFilters["colH"]} onFilterChange={(v) => { setApFilters(p => ({...p, colH: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colH", direction: d}); setApPage(1); }} />
                </div>
              </TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-bold text-primary text-right w-32 border-r border-primary/10">
                <div className="flex items-center justify-end gap-1">
                  COL-I
                  <ExcelColumnFilter columnKey="colI" label="COL-I" data={allAP || []} activeFilters={apFilters["colI"]} onFilterChange={(v) => { setApFilters(p => ({...p, colI: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colI", direction: d}); setApPage(1); }} />
                </div>
              </TableHead>
              <TableHead colSpan={8} className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-secondary bg-secondary/5 border-r border-primary/10 border-b border-primary/10 whitespace-nowrap">PAYMENT IN 2020</TableHead>
              <TableHead colSpan={2} className="text-center text-[11px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border-b border-primary/10 border-r border-primary/10 whitespace-nowrap">OUTSTANDING</TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-bold text-primary text-right w-32 border-r border-primary/10">
                <div className="flex items-center justify-end gap-1">
                  WA YOGI 21-JAN-22
                  <ExcelColumnFilter columnKey="colW" label="Wa Yogi" data={allAP || []} activeFilters={apFilters["colW"]} onFilterChange={(v) => { setApFilters(p => ({...p, colW: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colW", direction: d}); setApPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-bold text-primary text-right w-32 border-r border-primary/10">
                <div className="flex items-center justify-end gap-1">
                  KOREKSI SELISIH
                  <ExcelColumnFilter columnKey="colX" label="Koreksi Selisih" data={allAP || []} activeFilters={apFilters["colX"]} onFilterChange={(v) => { setApFilters(p => ({...p, colX: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colX", direction: d}); setApPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
            </TableRow>
            <TableRow className="hover:bg-transparent border-primary/5 h-12 bg-primary/5 whitespace-nowrap">
              <TableHead className="text-[11px] font-bold text-primary text-right">
                <div className="flex items-center justify-end gap-1">
                  IDR
                  <ExcelColumnFilter columnKey="colE" label="IDR (Initial)" data={allAP || []} activeFilters={apFilters["colE"]} onFilterChange={(v) => { setApFilters(p => ({...p, colE: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colE", direction: d}); setApPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary text-right">
                <div className="flex items-center justify-end gap-1">
                  USD
                  <ExcelColumnFilter columnKey="colF" label="USD (Initial)" data={allAP || []} activeFilters={apFilters["colF"]} onFilterChange={(v) => { setApFilters(p => ({...p, colF: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colF", direction: d}); setApPage(1); }} valueFormatter={(v) => formatCurrency(v, 'USD')} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary text-right italic border-r border-primary/10">
                <div className="flex items-center justify-end gap-1">
                  RATE
                  <ExcelColumnFilter columnKey="colG" label="Rate" data={allAP || []} activeFilters={apFilters["colG"]} onFilterChange={(v) => { setApFilters(p => ({...p, colG: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colG", direction: d}); setApPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right">
                <div className="flex items-center justify-end gap-1">
                  BCA
                  <ExcelColumnFilter columnKey="colK" label="BCA" data={allAP || []} activeFilters={apFilters["colK"]} onFilterChange={(v) => { setApFilters(p => ({...p, colK: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colK", direction: d}); setApPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right">
                <div className="flex items-center justify-end gap-1">
                  MANDIRI
                  <ExcelColumnFilter columnKey="colL" label="Mandiri" data={allAP || []} activeFilters={apFilters["colL"]} onFilterChange={(v) => { setApFilters(p => ({...p, colL: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colL", direction: d}); setApPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right">
                <div className="flex items-center justify-end gap-1">
                  BTN
                  <ExcelColumnFilter columnKey="colM" label="BTN" data={allAP || []} activeFilters={apFilters["colM"]} onFilterChange={(v) => { setApFilters(p => ({...p, colM: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colM", direction: d}); setApPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right">
                <div className="flex items-center justify-end gap-1">
                  BRI
                  <ExcelColumnFilter columnKey="colN" label="BRI" data={allAP || []} activeFilters={apFilters["colN"]} onFilterChange={(v) => { setApFilters(p => ({...p, colN: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colN", direction: d}); setApPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right">
                <div className="flex items-center justify-end gap-1">
                  CASH IDR
                  <ExcelColumnFilter columnKey="colO" label="Cash IDR" data={allAP || []} activeFilters={apFilters["colO"]} onFilterChange={(v) => { setApFilters(p => ({...p, colO: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colO", direction: d}); setApPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right">
                <div className="flex items-center justify-end gap-1">
                  NON CB
                  <ExcelColumnFilter columnKey="colP" label="Non CB" data={allAP || []} activeFilters={apFilters["colP"]} onFilterChange={(v) => { setApFilters(p => ({...p, colP: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colP", direction: d}); setApPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right">
                <div className="flex items-center justify-end gap-1">
                  CITIBANK
                  <ExcelColumnFilter columnKey="colQ" label="Citibank" data={allAP || []} activeFilters={apFilters["colQ"]} onFilterChange={(v) => { setApFilters(p => ({...p, colQ: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colQ", direction: d}); setApPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right border-r border-primary/10">
                <div className="flex items-center justify-end gap-1">
                  CASH USD
                  <ExcelColumnFilter columnKey="colR" label="Cash USD" data={allAP || []} activeFilters={apFilters["colR"]} onFilterChange={(v) => { setApFilters(p => ({...p, colR: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colR", direction: d}); setApPage(1); }} valueFormatter={(v) => formatCurrency(v, 'USD')} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-emerald-600 text-right bg-emerald-50/30">
                <div className="flex items-center justify-end gap-1">
                  IDR
                  <ExcelColumnFilter columnKey="colT" label="IDR Outstanding" data={allAP || []} activeFilters={apFilters["colT"]} onFilterChange={(v) => { setApFilters(p => ({...p, colT: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colT", direction: d}); setApPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-emerald-600 text-right bg-emerald-50/30 border-r border-primary/10">
                <div className="flex items-center justify-end gap-1">
                  USD
                  <ExcelColumnFilter columnKey="colU" label="USD Outstanding" data={allAP || []} activeFilters={apFilters["colU"]} onFilterChange={(v) => { setApFilters(p => ({...p, colU: v})); setApPage(1); }} currentSort={apSort} onSort={(d) => { setApSort({key: "colU", direction: d}); setApPage(1); }} valueFormatter={(v) => formatCurrency(v, 'USD')} />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apLoading ? (
              <TableRow>
                <TableCell colSpan={21} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Processing Accounts Payable Data...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredAndSortedAP.length === 0 ? (
              <TableRow><TableCell colSpan={21} className="h-64 text-center opacity-20"><Search size={48} className="mx-auto" /><p className="mt-4 font-black uppercase tracking-widest">No matching AP found</p></TableCell></TableRow>
            ) : (
              <>
                {filteredAndSortedAP.slice((apPage - 1) * 10, apPage * 10).map((row: any) => (
                  <TableRow key={row.id} className="border-primary/5 hover:bg-primary/5 transition-colors whitespace-nowrap">
                    <TableCell className="pl-8 py-4 border-r border-primary/5">
                        <Badge variant="outline" className="bg-secondary/5 text-secondary border-secondary/10 text-[11px] font-black uppercase tracking-tight ">{row.colA}</Badge>
                    </TableCell>
                    <TableCell className="py-4 text-[12px] font-medium text-primary border-r border-primary/5">{row.colB}</TableCell>
                    <TableCell className="py-4 font-black text-primary text-[12px] uppercase truncate border-r border-primary/5">{row.colC}</TableCell>
                    <TableCell className="py-4 text-[12px] font-medium text-primary/60 truncate border-r border-primary/5 max-w-[200px]">{row.colD}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary">{formatCurrency(row.colE)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary">{formatCurrency(row.colF, 'USD')}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary italic border-r border-primary/5">{row.colG ? formatCurrency(row.colG) : '-'}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary w-32 border-r border-primary/5">{row.colH || '-'}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary w-32 border-r border-primary/5">{row.colI || '-'}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary">{formatCurrency(row.colK)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary">{formatCurrency(row.colL)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary">{formatCurrency(row.colM)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary">{formatCurrency(row.colN)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary">{formatCurrency(row.colO)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary">{formatCurrency(row.colP)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary">{formatCurrency(row.colQ)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary border-r border-primary/5">{formatCurrency(row.colR)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-black text-emerald-600 bg-emerald-500/5">{formatCurrency(row.colT)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-black text-emerald-600 bg-emerald-500/5 border-r border-primary/10">{formatCurrency(row.colU, 'USD')}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary w-32 border-r border-primary/10">{formatCurrency(row.colW)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary w-32 border-r border-primary/10">{Number(row.colX) !== 0 ? formatCurrency(row.colX) : '-'}</TableCell>
                  </TableRow>
                ))}

                {filteredAndSortedAP.length > 0 && (
                  <>
                    <TableRow className="bg-primary/5 border-t-2 border-primary/20 whitespace-nowrap">
                      <TableCell colSpan={4} className="pl-10 py-5 font-black text-[12px] text-primary uppercase tracking-[0.2em]">Accumulated Balance (Page 1-{apPage})</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">{apAccumulatedTotals.colE !== 0 ? formatCurrency(apAccumulatedTotals.colE) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">{formatCurrency(apAccumulatedTotals.colF, 'USD')}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] bg-primary/5 border-r border-primary/10 whitespace-nowrap">{apAccumulatedTotals.colG !== 0 ? formatCurrency(apAccumulatedTotals.colG) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] w-32 whitespace-nowrap" />
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] w-32 border-r border-primary/10 whitespace-nowrap" />
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">{apAccumulatedTotals.colK !== 0 ? formatCurrency(apAccumulatedTotals.colK) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">{apAccumulatedTotals.colL !== 0 ? formatCurrency(apAccumulatedTotals.colL) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">{apAccumulatedTotals.colM !== 0 ? formatCurrency(apAccumulatedTotals.colM) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">{apAccumulatedTotals.colN !== 0 ? formatCurrency(apAccumulatedTotals.colN) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">{apAccumulatedTotals.colO !== 0 ? formatCurrency(apAccumulatedTotals.colO) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">{apAccumulatedTotals.colP !== 0 ? formatCurrency(apAccumulatedTotals.colP) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">{apAccumulatedTotals.colQ !== 0 ? formatCurrency(apAccumulatedTotals.colQ) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] border-r border-primary/10 whitespace-nowrap">{apAccumulatedTotals.colR !== 0 ? formatCurrency(apAccumulatedTotals.colR, 'USD') : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-emerald-600 text-[12px] bg-emerald-500/10 border-l border-emerald-500/20 whitespace-nowrap">{apAccumulatedTotals.colT !== 0 ? formatCurrency(apAccumulatedTotals.colT) : "-"}</TableCell>
                      <TableCell className="py-5 text-right font-black text-emerald-600 text-[12px] bg-emerald-500/10 border-r border-primary/10 whitespace-nowrap">{formatCurrency(apAccumulatedTotals.colU, 'USD')}</TableCell>
                      <TableCell className="bg-transparent" />
                      <TableCell className="bg-transparent" />
                    </TableRow>

                    <TableRow className="bg-primary/10 border-t-2 border-primary/30">
                      <TableCell colSpan={4} className="pl-10 py-5 font-black text-[12px] text-primary uppercase tracking-[0.2em]">Total IDR Summary (Converted)</TableCell>
                      <TableCell colSpan={3} className="py-5 text-right font-black text-primary text-[14px] bg-primary/10 border-r border-primary/20">{formatCurrency(apAccumulatedTotals.convertedInitial)}</TableCell>
                      <TableCell colSpan={10} className="bg-transparent" />
                      <TableCell colSpan={2} className="py-5 text-right font-black text-emerald-700 text-[14px] bg-emerald-500/10 border-l border-emerald-500/20">{formatCurrency(apAccumulatedTotals.convertedOutstanding)}</TableCell>
                      <TableCell colSpan={2} className="bg-transparent" />
                    </TableRow>
                  </>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationControls meta={{ total: filteredAndSortedAP.length, page: apPage, limit: 10, lastPage: Math.ceil(filteredAndSortedAP.length / 10) || 1 }} onPageChange={setApPage} isFetching={apLoading} />
    </div>
  );
}
