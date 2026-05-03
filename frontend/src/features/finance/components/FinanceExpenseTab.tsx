import { useMemo } from "react";
import { FilterX, Calculator, TrendingUp, Landmark } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useFinance } from "../hooks/useFinance";
import { ExcelColumnFilter } from "./ExcelColumnFilter";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Decimal } from "decimal.js";
import { useExcelFilter } from "../hooks/useExcelFilter";

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface FinanceExpenseTabProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function FinanceExpenseTab({ currentView, onViewChange }: FinanceExpenseTabProps) {
  const { getExpenses } = useFinance();
  const { data: rawData, isLoading } = getExpenses({ page: 1, limit: 1000 });
  
  const displayData = useMemo(() => {
    return (rawData?.data || []).map((row: any) => ({
      ...row,
      colA: row.colA || "-",
      colB_display: row.colB ? formatDate(row.colB) : "-",
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
    searchFields: ['colA', 'colC']
  });

  // Group data by Bank Source (colA)
  const groupedData = useMemo(() => {
    const groups: Record<string, typeof filteredAndSortedData> = {};
    filteredAndSortedData.forEach(row => {
      const bank = row.colA;
      if (!groups[bank]) groups[bank] = [];
      groups[bank].push(row);
    });
    return groups;
  }, [filteredAndSortedData]);

  // Sort bank names alphabetically
  const bankSources = useMemo(() => Object.keys(groupedData).sort(), [groupedData]);

  const getValueColor = (val: any) => {
    const num = Number(String(val || "0").replace(/[^0-9.-]+/g, ""));
    if (num > 0) return "text-emerald-600";
    if (num < 0) return "text-rose-600";
    return "text-primary/60";
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* Navigation Bar */}
      <div className="flex items-center justify-between bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="flex items-center gap-3 pl-2">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary/60 border border-primary/5 shadow-inner shrink-0">
            <Landmark size={20} />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-primary leading-none">Bank Source Breakdown</h3>
            <p className="text-[11px] text-primary/40 uppercase tracking-widest mt-1.5">{bankSources.length} Active Sources</p>
          </div>
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

      {isLoading ? (
        <div className="h-96 flex items-center justify-center animate-pulse font-medium uppercase text-primary/20 tracking-[0.3em]">
          Synchronizing Bank Records...
        </div>
      ) : filteredAndSortedData.length === 0 ? (
        <div className="h-64 flex items-center justify-center opacity-20 font-medium uppercase tracking-widest">
          No records found
        </div>
      ) : (
        bankSources.map((bank) => {
          const rows = groupedData[bank];
          const totalNet = rows.reduce((acc, curr) => acc.plus(new Decimal(curr.colF_raw)), new Decimal(0));

          return (
            <div key={bank} className="space-y-4">
              {/* Premium Bank Group Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 py-3 bg-white rounded-xl border border-primary/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-primary/60 border border-primary/5 shadow-inner">
                    <Landmark size={18} />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-black text-primary uppercase tracking-[0.2em] leading-none">{bank}</h4>
                    <p className="text-[10px] text-primary/40 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                      Financial Source
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-4 py-2 rounded-lg bg-slate-50 border border-primary/5 text-[11px] font-bold text-primary/40 uppercase tracking-widest">
                    {rows.length} <span className="ml-1 opacity-50">Records</span>
                  </div>
                  <div className={`px-4 py-2 rounded-lg border font-bold text-[11px] uppercase tracking-widest ${totalNet.gt(0) ? 'bg-emerald-50/50 border-emerald-100 text-emerald-600' : totalNet.lt(0) ? 'bg-red-50/50 border-red-100 text-red-600' : 'bg-white border-primary/5 text-primary/40'}`}>
                    Balance <span className="mx-2 opacity-30">|</span> {formatCurrency(totalNet.toString())}
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-premium border border-primary/5">
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar relative rounded-xl">
                  <table className="w-full border-separate border-spacing-0">
                    <thead className="relative z-40">
                      <tr className="whitespace-nowrap">
                        <th 
                          style={{ position: 'sticky', top: 0, zIndex: 50 }}
                          className="bg-slate-50 pl-8 text-left py-3 text-[11px] font-black text-primary/40 uppercase tracking-widest border-b border-primary/10"
                        >
                           <div className="flex items-center gap-1">
                             Date
                             <ExcelColumnFilter columnKey="colB_display" label="Date" data={getCascadingData("colB_display")} activeFilters={filters["colB_display"]} onFilterChange={(v) => setFilters(p => ({...p, colB_display: v}))} currentSort={sort} onSort={(d) => setSort({key: "colB_display", direction: d})} />
                           </div>
                        </th>
                        <th 
                          style={{ position: 'sticky', top: 0, zIndex: 50 }}
                          className="bg-slate-50 text-left px-4 py-3 text-[11px] font-black text-primary/40 uppercase tracking-widest border-b border-primary/10"
                        >
                           <div className="flex items-center gap-1">
                             Description
                             <ExcelColumnFilter columnKey="colC" label="Description" data={getCascadingData("colC")} activeFilters={filters["colC"]} onFilterChange={(v) => setFilters(p => ({...p, colC: v}))} currentSort={sort} onSort={(d) => setSort({key: "colC", direction: d})} />
                           </div>
                        </th>
                        <th 
                          style={{ position: 'sticky', top: 0, zIndex: 50 }}
                          className="bg-slate-50 text-right px-4 py-3 text-[11px] font-black text-primary/40 uppercase tracking-widest border-b border-primary/10"
                        >
                           <div className="flex items-center justify-end gap-1">
                             Debit
                             <ExcelColumnFilter columnKey="colD" label="Debit" data={getCascadingData("colD")} activeFilters={filters["colD"]} onFilterChange={(v) => setFilters(p => ({...p, colD: v}))} currentSort={sort} onSort={(d) => setSort({key: "colD", direction: d})} />
                           </div>
                        </th>
                        <th 
                          style={{ position: 'sticky', top: 0, zIndex: 50 }}
                          className="bg-slate-50 text-right px-4 py-3 text-[11px] font-black text-primary/40 uppercase tracking-widest border-b border-primary/10"
                        >
                           <div className="flex items-center justify-end gap-1">
                             Credit
                             <ExcelColumnFilter columnKey="colE" label="Credit" data={getCascadingData("colE")} activeFilters={filters["colE"]} onFilterChange={(v) => setFilters(p => ({...p, colE: v}))} currentSort={sort} onSort={(d) => setSort({key: "colE", direction: d})} />
                           </div>
                        </th>
                        <th 
                          style={{ position: 'sticky', top: 0, zIndex: 50 }}
                          className="bg-slate-50 text-right pr-8 py-3 text-[11px] font-black text-primary/40 uppercase tracking-widest border-b border-primary/10"
                        >
                           <div className="flex items-center justify-end gap-1">
                             Balance
                             <ExcelColumnFilter columnKey="colF" label="Balance" data={getCascadingData("colF")} activeFilters={filters["colF"]} onFilterChange={(v) => setFilters(p => ({...p, colF: v}))} currentSort={sort} onSort={(d) => setSort({key: "colF", direction: d})} />
                           </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/50">
                      {rows.map((row) => (
                        <tr key={row.id} className="hover:bg-primary/[0.02] transition-colors border-b border-primary/5 last:border-0">
                          <td className="pl-8 py-4 text-[12px] text-primary/60">{row.colB_display}</td>
                          <td className="px-4 py-4 text-[12px] text-primary uppercase leading-tight max-w-md truncate font-medium" title={row.colC}>{row.colC}</td>
                          <td className="px-4 py-4 text-right text-[12px] text-primary">{row.colD}</td>
                          <td className="px-4 py-4 text-right text-[12px] text-primary">{row.colE}</td>
                          <td className={`pr-8 py-4 text-right text-[12px] font-medium ${getValueColor(row.colF)}`}>{row.colF}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
