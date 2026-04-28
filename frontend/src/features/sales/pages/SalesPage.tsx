import { useState, useMemo } from "react";
import { ShoppingCart, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFinance } from "../../finance/hooks/useFinance";
import { PaginationControls } from "@/components/common/PaginationControls";
import { ExcelColumnFilter } from "../../finance/components/ExcelColumnFilter";
import { formatCurrency } from "@/lib/utils";

export default function SalesPage() {
  const [salesPage, setSalesPage] = useState(1);
  const [salesSearch, setSalesSearch] = useState("");
  const [salesSort, setSalesSort] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [salesFilters, setSalesFilters] = useState<Record<string, Set<string> | null>>({});
  const salesLimit = 10;

  const { getAllSales } = useFinance();
  const { data: allSales, isLoading: salesLoading } = getAllSales();

  const filteredAndSortedSales = useMemo(() => {
    if (!allSales) return [];
    let result = [...allSales];

    Object.entries(salesFilters).forEach(([key, allowedValues]) => {
      if (allowedValues) {
        result = result.filter(item => allowedValues.has(String(item[key] || "")));
      }
    });

    if (salesSearch) {
      const term = salesSearch.toLowerCase();
      result = result.filter(item => 
        String(item.colD || "").toLowerCase().includes(term) ||
        String(item.colE || "").toLowerCase().includes(term) ||
        String(item.colF || "").toLowerCase().includes(term)
      );
    }

    if (salesSort) {
      const { key, direction } = salesSort;
      result.sort((a, b) => {
        const valA = (a as any)[key];
        const valB = (b as any)[key];
        const strA = String(valA || "");
        const strB = String(valB || "");
        return direction === 'asc' 
          ? strA.localeCompare(strB, undefined, { numeric: true })
          : strB.localeCompare(strA, undefined, { numeric: true });
      });
    }

    return result;
  }, [allSales, salesFilters, salesSearch, salesSort]);

  const paginatedSales = useMemo(() => {
    const start = (salesPage - 1) * salesLimit;
    return filteredAndSortedSales.slice(start, start + salesLimit);
  }, [filteredAndSortedSales, salesPage]);

  const salesMeta = {
    total: filteredAndSortedSales.length,
    page: salesPage,
    limit: salesLimit,
    lastPage: Math.ceil(filteredAndSortedSales.length / salesLimit) || 1
  };

  const salesAccumulatedTotals = useMemo(() => {
    const subset = filteredAndSortedSales.slice(0, salesPage * salesLimit);
    return subset.reduce((acc, curr) => ({
      colG: acc.colG + (Number(curr.colG) || 0),
      colH: acc.colH + (Number(curr.colH) || 0),
      colI: acc.colI + (Number(curr.colI) || 0),
      colJ: acc.colJ + (Number(curr.colJ) || 0),
      colL: acc.colL + (Number(curr.colL) || 0),
      colM: acc.colM + (Number(curr.colM) || 0),
      colN: acc.colN + (Number(curr.colN) || 0),
      colO: acc.colO + (Number(curr.colO) || 0),
      colP: acc.colP + (Number(curr.colP) || 0),
      colQ: acc.colQ + (Number(curr.colQ) || 0),
      colR: acc.colR + (Number(curr.colR) || 0),
      colS: acc.colS + (Number(curr.colS) || 0),
      colU: acc.colU + (Number(curr.colU) || 0),
      colV: acc.colV + (Number(curr.colV) || 0),
      colW: acc.colW + (Number(curr.colW) || 0),
      colX: acc.colX + (Number(curr.colX) || 0),
      colZ: acc.colZ + (Number(curr.colZ) || 0),
    }), { 
      colG: 0, colH: 0, colI: 0, colJ: 0, colL: 0, colM: 0, colN: 0, colO: 0, 
      colP: 0, colQ: 0, colR: 0, colS: 0, colU: 0, colV: 0, colW: 0, colX: 0, colZ: 0 
    });
  }, [filteredAndSortedSales, salesPage]);

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-primary flex items-center gap-2 sm:gap-3">
              <ShoppingCart className="text-secondary shrink-0 w-6 h-6 sm:w-8 sm:h-8" />
              Sales
            </h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">Manage and track your sales transactions.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white/50 p-4 rounded-[2rem] border border-primary/5 backdrop-blur-sm shadow-sm w-full">
        <div className="flex flex-col md:flex-row items-center gap-3 flex-1 w-full">
          <div className="relative flex-1 w-full md:max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 group-focus-within:text-primary transition-colors" size={18} />
            <Input 
              placeholder="Universal Sales Search (Billing, Project, Desc)..." 
              value={salesSearch}
              onChange={(e) => { setSalesSearch(e.target.value); setSalesPage(1); }}
              className="pl-12 h-11 bg-white border-primary/5 rounded-xl shadow-sm text-[12px] font-bold text-primary transition-all focus-visible:ring-primary/20"
            />
          </div>
          {Object.keys(salesFilters).some(k => salesFilters[k] !== null) && (
            <Button variant="ghost" size="sm" onClick={() => setSalesFilters({})} className="h-11 px-4 w-full md:w-auto text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl">
              Clear All Filters
            </Button>
          )}
        </div>
        <Badge variant="outline" className="h-11 px-6 w-full md:w-auto flex justify-center rounded-xl bg-primary/5 text-primary border-primary/10 font-black uppercase tracking-[0.2em] text-[11px]">
          {filteredAndSortedSales.length} Records
        </Badge>
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] shadow-premium border border-primary/5 overflow-x-auto overflow-hidden">
        <Table className="min-w-[2800px]">
          <TableHeader className="bg-primary/5">
            <TableRow className="hover:bg-transparent border-primary/5 h-12 whitespace-nowrap">
              <TableHead rowSpan={2} className="pl-8 text-[11px] font-black uppercase tracking-tight text-primary w-12 border-r border-primary/10">
                <div className="flex items-center">
                  NO
                  <ExcelColumnFilter columnKey="colA" label="No" data={allSales || []} activeFilters={salesFilters["colA"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colA: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colA", direction: d}); setSalesPage(1); }} />
                </div>
              </TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-24 border-r border-primary/10">
                <div className="flex items-center">
                  DATE
                  <ExcelColumnFilter columnKey="colB" label="Date" data={allSales || []} activeFilters={salesFilters["colB"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colB: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colB", direction: d}); setSalesPage(1); }} />
                </div>
              </TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-16 border-r border-primary/10">
                <div className="flex items-center">
                  YEAR
                  <ExcelColumnFilter columnKey="colC" label="Year" data={allSales || []} activeFilters={salesFilters["colC"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colC: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colC", direction: d}); setSalesPage(1); }} />
                </div>
              </TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-48 border-r border-primary/10">
                <div className="flex items-center">
                  BILLING TO
                  <ExcelColumnFilter columnKey="colD" label="Billing To" data={allSales || []} activeFilters={salesFilters["colD"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colD: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colD", direction: d}); setSalesPage(1); }} />
                </div>
              </TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-48 border-r border-primary/10 pl-4">
                <div className="flex items-center">
                  PROJECT
                  <ExcelColumnFilter columnKey="colE" label="Project" data={allSales || []} activeFilters={salesFilters["colE"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colE: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colE", direction: d}); setSalesPage(1); }} />
                </div>
              </TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-64 border-r border-primary/10 pl-4">
                <div className="flex items-center">
                  DESCRIPTION
                  <ExcelColumnFilter columnKey="colF" label="Description" data={allSales || []} activeFilters={salesFilters["colF"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colF: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colF", direction: d}); setSalesPage(1); }} />
                </div>
              </TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary text-right w-32 pr-4">
                <div className="flex items-center justify-end gap-2">
                  BASIC PRICE
                  <ExcelColumnFilter columnKey="colG" label="Basic Price" data={allSales || []} activeFilters={salesFilters["colG"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colG: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colG", direction: d}); setSalesPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary text-right w-32 font-bold text-secondary pr-4">
                <div className="flex items-center justify-end gap-2">
                  MGMT FEE
                  <ExcelColumnFilter columnKey="colH" label="Mgmt Fee" data={allSales || []} activeFilters={salesFilters["colH"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colH: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colH", direction: d}); setSalesPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary text-right w-24 pr-4">
                <div className="flex items-center justify-end gap-2">
                  PPN
                  <ExcelColumnFilter columnKey="colI" label="PPN" data={allSales || []} activeFilters={salesFilters["colI"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colI: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colI", direction: d}); setSalesPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary text-right w-40 border-r border-primary/10 font-bold bg-primary/5 pr-4">
                <div className="flex items-center justify-end gap-2">
                  TOTAL AMOUNT
                  <ExcelColumnFilter columnKey="colJ" label="Total Amount" data={allSales || []} activeFilters={salesFilters["colJ"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colJ: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colJ", direction: d}); setSalesPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead colSpan={7} className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-secondary bg-secondary/5 border-r border-primary/10 border-b border-primary/10">MUTASI 2021</TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-red-600 text-right w-40 border-r border-primary/10 pr-4">
                <div className="flex items-center justify-end gap-2">
                  OUTSTANDING
                  <ExcelColumnFilter columnKey="colS" label="Outstanding" data={allSales || []} activeFilters={salesFilters["colS"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colS: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colS", direction: d}); setSalesPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead colSpan={4} className="text-center text-[11px] font-black uppercase tracking-widest text-primary bg-primary/5 border-b border-primary/10 border-r border-primary/10">TAX & ADJUSTMENT</TableHead>
              <TableHead rowSpan={2} className="pr-8 text-[12px] font-black uppercase tracking-tight text-emerald-600 text-right w-44 bg-emerald-50 text-secondary">
                <div className="flex items-center justify-end gap-2">
                  NET RECEIVED
                  <ExcelColumnFilter columnKey="colZ" label="Net Received" data={allSales || []} activeFilters={salesFilters["colZ"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colZ: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colZ", direction: d}); setSalesPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
            </TableRow>
            <TableRow className="hover:bg-transparent border-primary/5 h-12 bg-primary/5 whitespace-nowrap">
              <TableHead className="text-[11px] font-bold text-secondary text-right pr-4">
                <div className="flex items-center justify-end gap-1">
                  BCA
                  <ExcelColumnFilter columnKey="colL" label="BCA" data={allSales || []} activeFilters={salesFilters["colL"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colL: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colL", direction: d}); setSalesPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right pr-4">
                <div className="flex items-center justify-end gap-1">
                  MANDIRI
                  <ExcelColumnFilter columnKey="colM" label="Mandiri" data={allSales || []} activeFilters={salesFilters["colM"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colM: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colM", direction: d}); setSalesPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right pr-4">
                <div className="flex items-center justify-end gap-1">
                  DANAMON
                  <ExcelColumnFilter columnKey="colN" label="Danamon" data={allSales || []} activeFilters={salesFilters["colN"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colN: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colN", direction: d}); setSalesPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right pr-4">
                <div className="flex items-center justify-end gap-1">
                  BRI
                  <ExcelColumnFilter columnKey="colO" label="BRI" data={allSales || []} activeFilters={salesFilters["colO"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colO: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colO", direction: d}); setSalesPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right pr-4">
                <div className="flex items-center justify-end gap-1">
                  BTN
                  <ExcelColumnFilter columnKey="colP" label="BTN" data={allSales || []} activeFilters={salesFilters["colP"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colP: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colP", direction: d}); setSalesPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right pr-4">
                <div className="flex items-center justify-end gap-1">
                  Cash IDR
                  <ExcelColumnFilter columnKey="colQ" label="Cash IDR" data={allSales || []} activeFilters={salesFilters["colQ"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colQ: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colQ", direction: d}); setSalesPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-secondary text-right border-r border-primary/10 pr-4">
                <div className="flex items-center justify-end gap-1">
                  Non CB
                  <ExcelColumnFilter columnKey="colR" label="Non CB" data={allSales || []} activeFilters={salesFilters["colR"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colR: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colR", direction: d}); setSalesPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary text-right pr-4">
                <div className="flex items-center justify-end gap-1">
                  PPh-23
                  <ExcelColumnFilter columnKey="colU" label="PPh-23" data={allSales || []} activeFilters={salesFilters["colU"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colU: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colU", direction: d}); setSalesPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary text-right pr-4">
                <div className="flex items-center justify-end gap-1">
                  A/P PPh-23
                  <ExcelColumnFilter columnKey="colV" label="A/P PPh-23" data={allSales || []} activeFilters={salesFilters["colV"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colV: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colV", direction: d}); setSalesPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary text-right pr-4">
                <div className="flex items-center justify-end gap-1">
                  PPN TAX
                  <ExcelColumnFilter columnKey="colW" label="PPN TAX" data={allSales || []} activeFilters={salesFilters["colW"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colW: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colW", direction: d}); setSalesPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-primary text-right border-r border-primary/10 pr-4">
                <div className="flex items-center justify-end gap-1">
                  A/P PPN
                  <ExcelColumnFilter columnKey="colX" label="A/P PPN" data={allSales || []} activeFilters={salesFilters["colX"]} onFilterChange={(v) => { setSalesFilters(p => ({...p, colX: v})); setSalesPage(1); }} currentSort={salesSort} onSort={(d) => { setSalesSort({key: "colX", direction: d}); setSalesPage(1); }} valueFormatter={formatCurrency} />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salesLoading ? (
              <TableRow><TableCell colSpan={25} className="h-64 text-center">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Processing Sales Data...</p>
                </div>
              </TableCell></TableRow>
            ) : paginatedSales.length === 0 ? (
              <TableRow><TableCell colSpan={25} className="h-64 text-center">
                <div className="flex flex-col items-center justify-center gap-2 opacity-20">
                  <Search size={48} />
                  <p className="text-xs font-black uppercase tracking-widest mt-4">No matching sales records found</p>
                </div>
              </TableCell></TableRow>
            ) : (
              <>
                {paginatedSales.map((row: any) => (
                  <TableRow key={row.id} className="border-primary/5 hover:bg-primary/[0.01] transition-colors whitespace-nowrap group">
                    <TableCell className="pl-8 py-4 font-bold text-primary text-[12px] border-r border-primary/5">{row.colA}</TableCell>
                    <TableCell className="py-4 text-[12px] font-bold text-primary border-r border-primary/5 pl-4">{row.colB}</TableCell>
                    <TableCell className="py-4 text-[12px] font-bold text-primary/60 border-r border-primary/5 pl-4">{row.colC}</TableCell>
                    <TableCell className="py-4 font-black text-primary text-[12px] uppercase truncate border-r border-primary/5 pl-4">{row.colD}</TableCell>
                    <TableCell className="py-4 font-bold text-primary/60 text-[12px] uppercase border-r border-primary/5 pl-4">{row.colE}</TableCell>
                    <TableCell className="py-4 text-[12px] font-bold text-primary/60 truncate border-r border-primary/5 max-w-[200px] pl-4">{row.colF}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary pr-4">{formatCurrency(row.colG)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-secondary pr-4">{formatCurrency(row.colH)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary pr-4">{formatCurrency(row.colI)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-black text-primary bg-primary/[0.02] border-r border-primary/5 pr-4">{formatCurrency(row.colJ)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary pr-4">{formatCurrency(row.colL)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary pr-4">{formatCurrency(row.colM)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary pr-4">{formatCurrency(row.colN)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary pr-4">{formatCurrency(row.colO)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary pr-4">{formatCurrency(row.colP)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary pr-4">{formatCurrency(row.colQ)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary border-r border-primary/5 pr-4">{formatCurrency(row.colR)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-black text-red-600 border-r border-primary/5 pr-4">{formatCurrency(row.colS)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary pr-4">{formatCurrency(row.colU)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary italic pr-4">{formatCurrency(row.colV)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary pr-4">{formatCurrency(row.colW)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary italic border-r border-primary/5 pr-4">{formatCurrency(row.colX)}</TableCell>
                    <TableCell className="pr-8 py-4 text-right text-[12px] font-black text-secondary bg-secondary/[0.02]">{formatCurrency(row.colZ)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                  <TableCell colSpan={6} className="pl-10 py-5 font-black text-[12px] text-primary uppercase tracking-[0.2em]">Accumulated Balance (Page 1-{salesPage})</TableCell>
                  <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colG)}</TableCell>
                  <TableCell className="py-5 text-right font-black text-secondary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colH)}</TableCell>
                  <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colI)}</TableCell>
                  <TableCell className="py-5 text-right font-black text-primary text-[12px] bg-primary/10 border-r border-primary/10 pr-4">{formatCurrency(salesAccumulatedTotals.colJ)}</TableCell>
                  <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colL)}</TableCell>
                  <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colM)}</TableCell>
                  <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colN)}</TableCell>
                  <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colO)}</TableCell>
                  <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colP)}</TableCell>
                  <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colQ)}</TableCell>
                  <TableCell className="py-5 text-right font-black text-primary text-[12px] border-r border-primary/10 pr-4">{formatCurrency(salesAccumulatedTotals.colR)}</TableCell>
                  <TableCell className="py-5 text-right font-black text-red-700 text-[12px] border-r border-primary/10 pr-4">{formatCurrency(salesAccumulatedTotals.colS)}</TableCell>
                  <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colU)}</TableCell>
                  <TableCell className="py-5 text-right font-black text-primary text-[12px] italic pr-4">{formatCurrency(salesAccumulatedTotals.colV)}</TableCell>
                  <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colW)}</TableCell>
                  <TableCell className="py-5 text-right font-black text-primary text-[12px] italic border-r border-primary/10 pr-4">{formatCurrency(salesAccumulatedTotals.colX)}</TableCell>
                  <TableCell className="pr-10 py-5 text-right font-black text-secondary text-[12px] bg-secondary/10">{formatCurrency(salesAccumulatedTotals.colZ)}</TableCell>
                </TableRow>
                <TableRow className="bg-secondary/5 border-t border-secondary/20">
                  <TableCell colSpan={10} className="pl-10 py-5 font-black text-[12px] text-secondary uppercase tracking-[0.2em]">Performance Summary (Total Amount - Outstanding)</TableCell>
                  <TableCell colSpan={7} className="bg-secondary/[0.01]" />
                  <TableCell className="py-5 text-right border-r border-primary/10 pr-4 text-[13px] font-black bg-secondary/5"><span className="text-emerald-700">{formatCurrency(salesAccumulatedTotals.colJ - salesAccumulatedTotals.colS)}</span></TableCell>
                  <TableCell colSpan={4} className="bg-secondary/[0.01]" />
                  <TableCell className="pr-10 py-5 text-right font-black text-secondary text-[13px] bg-secondary/10">{formatCurrency(salesAccumulatedTotals.colZ)}</TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationControls meta={salesMeta} onPageChange={setSalesPage} isFetching={salesLoading} />
    </div>
  );
}
