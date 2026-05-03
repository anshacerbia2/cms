import { useMemo } from "react";
import { Search, FilterX, TrendingUp, Calculator } from 'lucide-react';
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
import { useFinance } from "../hooks/useFinance";
import { ExcelColumnFilter } from "./ExcelColumnFilter";
import { formatCurrency } from "@/lib/utils";
import { Decimal } from "decimal.js";
import { useExcelFilter } from "../hooks/useExcelFilter";

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface FinanceRevenueTabProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function FinanceRevenueTab({ currentView, onViewChange }: FinanceRevenueTabProps) {
  const { getRevenue } = useFinance();
  const { data: rawData, isLoading } = getRevenue({ page: 1, limit: 1000 });
  
  const displayData = useMemo(() => {
    return (rawData?.data || []).map((row: any) => ({
      ...row,
      colA: row.colA || "-",
      colB: row.colB || "-",
      colC: row.colC || "-",
      colD_raw: Number(row.colD || 0),
      colE_raw: Number(row.colE || 0),
      colF_raw: Number(row.colF || 0),
      colD: formatCurrency(row.colD || 0),
      colE: formatCurrency(row.colE || 0),
      colF: formatCurrency(row.colF || 0),
    }));
  }, [rawData]);

  const {
    search,
    setSearch,
    filters,
    setFilters,
    sort,
    setSort,
    getCascadingData,
    filteredAndSortedData,
    clearFilters,
    isAnyFilterActive
  } = useExcelFilter({
    data: displayData,
    searchFields: ['colB', 'colC']
  });

  const grandTotals = useMemo(() => {
    return filteredAndSortedData.reduce((acc, curr) => ({
      colD: acc.colD.plus(new Decimal(curr.colD_raw)),
      colE: acc.colE.plus(new Decimal(curr.colE_raw)),
      colF: acc.colF.plus(new Decimal(curr.colF_raw)),
    }), { colD: new Decimal(0), colE: new Decimal(0), colF: new Decimal(0) });
  }, [filteredAndSortedData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search revenue (Invoice No, Customer)..." 
            className="pl-12 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 text-[13px] font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
           {isAnyFilterActive && (
            <Button 
              onClick={clearFilters}
              className="h-12 w-12 bg-white border-0 text-muted-foreground hover:text-red-500 hover:bg-red-50/50 rounded-xl shadow-sm flex items-center justify-center shrink-0 transition-all"
            >
              <FilterX size={20} />
            </Button>
          )}
          <div className="h-12 px-6 flex items-center justify-center rounded-xl bg-white border-0 shadow-sm text-primary font-medium text-[13px] whitespace-nowrap">
            {filteredAndSortedData.length} Records
          </div>

          <Select value={currentView} onValueChange={onViewChange}>
            <SelectTrigger className="h-12 w-48 rounded-xl bg-white border-0 shadow-sm text-[11px] uppercase tracking-widest focus:ring-0 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-primary/10 shadow-2xl">
              <SelectItem value="revenue" className="text-[11px] uppercase tracking-widest py-3">
                <div className="flex items-center gap-2">
                   <TrendingUp size={14} className="text-emerald-500" />
                   Revenue
                </div>
              </SelectItem>
              <SelectItem value="expense" className="text-[11px] uppercase tracking-widest py-3">
                <div className="flex items-center gap-2">
                   <Calculator size={14} className="text-orange-500" />
                   Expenses
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-premium border border-primary/5 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap">
              <TableHead className="pl-8 w-20">
                <div className="flex items-center gap-1">
                  No
                  <ExcelColumnFilter columnKey="colA" label="No" data={getCascadingData("colA")} activeFilters={filters["colA"]} onFilterChange={(v) => setFilters(p => ({...p, colA: v}))} currentSort={sort} onSort={(d) => setSort({key: "colA", direction: d})} />
                </div>
              </TableHead>
              <TableHead className="w-48 px-4">
                <div className="flex items-center gap-1">
                  Invoice No
                  <ExcelColumnFilter columnKey="colB" label="Invoice No" data={getCascadingData("colB")} activeFilters={filters["colB"]} onFilterChange={(v) => setFilters(p => ({...p, colB: v}))} currentSort={sort} onSort={(d) => setSort({key: "colB", direction: d})} />
                </div>
              </TableHead>
              <TableHead className="px-4">
                <div className="flex items-center gap-1">
                  Customer Name
                  <ExcelColumnFilter columnKey="colC" label="Customer" data={getCascadingData("colC")} activeFilters={filters["colC"]} onFilterChange={(v) => setFilters(p => ({...p, colC: v}))} currentSort={sort} onSort={(d) => setSort({key: "colC", direction: d})} />
                </div>
              </TableHead>
              <TableHead className="text-right w-40">
                <div className="flex items-center justify-end gap-1">
                  Gross
                  <ExcelColumnFilter columnKey="colD" label="Gross" data={getCascadingData("colD")} activeFilters={filters["colD"]} onFilterChange={(v) => setFilters(p => ({...p, colD: v}))} currentSort={sort} onSort={(d) => setSort({key: "colD", direction: d})} />
                </div>
              </TableHead>
              <TableHead className="text-right w-40">
                <div className="flex items-center justify-end gap-1">
                  VAT
                  <ExcelColumnFilter columnKey="colE" label="VAT" data={getCascadingData("colE")} activeFilters={filters["colE"]} onFilterChange={(v) => setFilters(p => ({...p, colE: v}))} currentSort={sort} onSort={(d) => setSort({key: "colE", direction: d})} />
                </div>
              </TableHead>
              <TableHead className="text-right w-48 pr-8">
                <div className="flex items-center justify-end gap-1">
                  Net Sales
                  <ExcelColumnFilter columnKey="colF" label="Net Sales" data={getCascadingData("colF")} activeFilters={filters["colF"]} onFilterChange={(v) => setFilters(p => ({...p, colF: v}))} currentSort={sort} onSort={(d) => setSort({key: "colF", direction: d})} />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-96 text-center animate-pulse font-medium uppercase text-primary/20 tracking-widest">Loading Revenue...</TableCell></TableRow>
            ) : filteredAndSortedData.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-64 text-center opacity-20 font-medium uppercase tracking-widest">No data match</TableCell></TableRow>
            ) : (
              <>
                {filteredAndSortedData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-primary/[0.02] transition-colors border-primary/5">
                    <TableCell className="pl-8 py-3 text-[12px] text-primary/40">{row.colA}</TableCell>
                    <TableCell className="px-4 py-3 text-[12px] text-primary">{row.colB}</TableCell>
                    <TableCell className="px-4 py-3 text-[12px] text-primary uppercase">{row.colC}</TableCell>
                    <TableCell className="px-4 py-3 text-right text-[12px] text-primary">{row.colD}</TableCell>
                    <TableCell className="px-4 py-3 text-right text-[12px] text-primary">{row.colE}</TableCell>
                    <TableCell className="pr-8 py-3 text-right text-[12px] text-primary">{row.colF}</TableCell>
                  </TableRow>
                ))}

                <TableRow className="bg-secondary/10 border-t-4 border-secondary/20 whitespace-nowrap sticky bottom-0">
                  <TableCell colSpan={3} className="pl-8 py-4 text-[11px] text-secondary uppercase tracking-widest">Total Summary ({filteredAndSortedData.length} records)</TableCell>
                  <TableCell className="text-right px-4 text-[13px] text-primary">
                    {formatCurrency(grandTotals.colD.toString())}
                  </TableCell>
                  <TableCell className="text-right px-4 text-[13px] text-red-600">
                    {formatCurrency(grandTotals.colE.toString())}
                  </TableCell>
                  <TableCell className={`text-right pr-8 text-base ${grandTotals.colF.gt(0) ? 'text-emerald-600' : grandTotals.colF.lt(0) ? 'text-red-600' : 'text-primary'}`}>
                    {formatCurrency(grandTotals.colF.toString())}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
