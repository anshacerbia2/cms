import { useMemo, useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { formatCurrency, getAmountColor, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, PieChart, Info, Loader2, History, Plus, Calendar as CalendarIcon, ChevronDown, ChevronRight } from "lucide-react";
import { useFinance } from "../hooks/useFinance";
import { useExcelFilter } from "../hooks/useExcelFilter";
import { ExcelColumnFilter } from "./ExcelColumnFilter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import PLPropertiesModal from "./PLPropertiesModal";


export function ProfitLossTab() {
  const [year, setYear] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showPropertiesModal, setShowPropertiesModal] = useState(false);
  const { getPLStatement, getPLDetails, getSalesCogsDetails, getDepreciationDetails } = useFinance();
  
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const { data: plData, isLoading } = getPLStatement(
    year === "all" ? undefined : year, 
    selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined
  );

  // Sync selectedDate with year filter
  useEffect(() => {
    if (year !== "all" && selectedDate) {
      if (selectedDate.getFullYear() !== parseInt(year)) {
        setSelectedDate(undefined);
      }
    }
  }, [year]);
  
  const summaryCards = useMemo(() => {
    if (!plData?.summaryCards) return [];
    
    const iconMap: Record<string, any> = {
      "NET SALES": DollarSign,
      "GROSS PROFIT": TrendingUp,
      "OPERATING PROFIT": PieChart,
      "PROFIT AFTER TAX": TrendingUp,
    };

    return plData.summaryCards.map((card: any) => {
      let subValue = "";
      if (card.title === "NET SALES") {
        subValue = `${formatCurrency(card.grossValue)} gross`;
      } else if (card.title === "GROSS PROFIT") {
        subValue = `${card.margin}% margin`;
      } else if (card.title === "OPERATING PROFIT") {
        subValue = `${formatCurrency(card.opexValue)} opex`;
      } else if (card.title === "PROFIT AFTER TAX") {
        subValue = `${card.netMargin}% net margin`;
      }

      return {
        ...card,
        value: formatCurrency(card.value),
        subValue,
        icon: iconMap[card.title] || Info,
      };
    });
  }, [plData]);

  const [selectedLedger, setSelectedLedger] = useState<string | null>(null);
  const [selectedSubItem, setSelectedSubItem] = useState<string | null>(null);
  const [expandedLedgers, setExpandedLedgers] = useState<Set<string>>(new Set());

  const toggleExpand = (ledger: string) => {
    const newSet = new Set(expandedLedgers);
    if (newSet.has(ledger)) {
      newSet.delete(ledger);
    } else {
      newSet.add(ledger);
    }
    setExpandedLedgers(newSet);
  };

  const isCogs = selectedLedger === "Cost of Goods";
  const isDepr = selectedLedger === "Depreciation";

  const { data: plDetails, isLoading: isLoadingPlDetails } = getPLDetails(
    year === "all" ? undefined : year, 
    selectedLedger || undefined, 
    selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined,
    selectedSubItem || undefined,
    { enabled: !!selectedLedger && !isCogs && !isDepr }
  );

  const displayPlDetails = useMemo(() => {
    return (plDetails || []).map((row: any) => ({
      ...row,
      displayDate: formatDate(row.date),
      displayAmount: formatCurrency(row.amount),
    }));
  }, [plDetails]);

  const { 
    search: plSearch, 
    filters: plFilters, 
    setFilters: setPlFilters, 
    sort: plSort, 
    setSort: setPlSort, 
    getCascadingData: getPlCascadingData, 
    filteredAndSortedData: filteredPlDetails,
    clearFilters: clearPlFilters
  } = useExcelFilter({
    data: displayPlDetails,
    searchFields: ['description', 'ledger', 'bankBrand', 'holderName', 'displayAmount', 'displayDate']
  });

  const { data: cogsDetails, isLoading: isLoadingCogsDetails } = getSalesCogsDetails(
    year === "all" ? undefined : year, 
    selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined,
    { enabled: !!selectedLedger && isCogs }
  );

  const { data: deprDetails, isLoading: isLoadingDeprDetails } = getDepreciationDetails(
    { enabled: !!selectedLedger && isDepr }
  );

  // --- COGS Filter Hook ---
  const normalizedCogs = useMemo(() => {
    if (!cogsDetails?.rows) return [];
    return cogsDetails.rows.map((row: any) => {
      const formatted: any = { ...row };
      cogsDetails.headers?.forEach((h: any) => {
        if (row[h.key] !== undefined) {
          formatted[`display_${h.key}`] = formatCurrency(parseFloat(row[h.key] || "0"));
        }
      });
      return formatted;
    });
  }, [cogsDetails]);


  const { 
    search: cogsSearch, 
    filters: cogsFilters, setFilters: setCogsFilters, 
    sort: cogsSort, setSort: setCogsSort, 
    getCascadingData: getCogsCascadingData, 
    filteredAndSortedData: filteredCogs,
    clearFilters: clearCogsFilters
  } = useExcelFilter({
    data: normalizedCogs,
    searchFields: ['cogs', ...(cogsDetails?.headers?.map((h: any) => `display_${h.key}`) || [])]
  });

  // --- Depreciation Filter Hook ---
  const normalizedDepr = useMemo(() => {
    if (!deprDetails) return [];
    return deprDetails.map((row: any) => ({
      ...row,
      displayPurchaseDate: formatDate(row.purchaseDate),
      displayPurchasePrice: formatCurrency(row.purchasePrice),
      displayAccumulated2024: formatCurrency(row.accumulated2024),
      displayTotal2025: formatCurrency(row.total2025),
      displayAccumulated2025: formatCurrency(row.accumulated2025),
      displayBookValue: formatCurrency(row.bookValue),
      ...months.reduce((acc, m) => ({ ...acc, [`display_${m}`]: formatCurrency(row[m]) }), {}),
    }));
  }, [deprDetails]);

  const { 
    search: deprSearch, 
    filters: deprFilters, setFilters: setDeprFilters, 
    sort: deprSort, setSort: setDeprSort, 
    getCascadingData: getDeprCascadingData, 
    filteredAndSortedData: filteredDepr,
    clearFilters: clearDeprFilters
  } = useExcelFilter({
    data: normalizedDepr,
    searchFields: ['assetName', 'displayPurchasePrice', 'displayBookValue']
  });

  const isLoadingDetails = isCogs ? isLoadingCogsDetails : isDepr ? isLoadingDeprDetails : isLoadingPlDetails;

  const expenseLedgers = [
    "Cost of Goods", 
    "Personnel Expense", 
    "Office Expense", 
    "Marketing Expense", 
    "Financial Expense", 
    "Other Income", 
    "Depreciation"
  ];

  const tableData = plData?.tableData || [];
  
  const totals = useMemo(() => {
    if (isCogs) {
      if (!cogsDetails?.rows || !cogsDetails?.headers) return null;
      const res: any = { cogs: "TOTAL" };
      cogsDetails.headers.forEach((h: any) => {
        const sum = cogsDetails.rows.reduce((acc: number, row: any) => {
          return acc + parseFloat(row[h.key] || "0");
        }, 0);
        res[h.key] = sum.toString();
      });
      return res;
    } else if (isDepr) {
      if (!deprDetails || deprDetails.length === 0) return null;
      
      const res: any = { label: "TOTAL" };
      const numericFields = ["purchasePrice", "accumulated2024", ...months, "total2025", "accumulated2025", "bookValue"];
      
      numericFields.forEach(field => {
        const sum = deprDetails.reduce((acc: number, row: any) => acc + parseFloat(row[field] || "0"), 0);
        res[field] = sum.toString();
      });
      
      return res;
    } else {
      if (!plDetails || plDetails.length === 0) return null;
      const sum = plDetails.reduce((acc: number, row: any) => {
        return acc + parseFloat(row.amount || "0");
      }, 0);
      return { amount: sum.toString(), label: "TOTAL" };
    }
  }, [isCogs, isDepr, cogsDetails, plDetails, deprDetails]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      {/* Details Modal */}
      <Dialog open={!!selectedLedger} onOpenChange={(open) => {
        if (!open) {
          setSelectedLedger(null);
          setSelectedSubItem(null);
        }
      }}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] bg-slate-50 border border-slate-200 shadow-2xl rounded-3xl overflow-hidden p-0 gap-0 flex flex-col">
          <div className="py-5 px-8 border-b border-primary/5 bg-white sticky top-0 z-20 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#fdf8ec] flex items-center justify-center text-[#cc9929] border border-[#cc9929]/20 shadow-premium shrink-0">
                  <History size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <DialogTitle className="text-xl font-bold text-primary uppercase tracking-tight leading-none">
                      {selectedLedger === "Other Income" ? "Other Income (Expense)" : selectedLedger} Breakdown
                    </DialogTitle>
                    {selectedSubItem && (
                      <Badge className="bg-secondary/10 text-secondary border-none text-[10px] font-black uppercase tracking-widest py-0.5">
                        {selectedSubItem}
                      </Badge>
                    )}
                  </div>
                  <DialogDescription className="text-[10px] font-bold text-primary/30 uppercase tracking-[0.2em]">
                    Bank Statement Records • Financial Audit Trail
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {(
                  (plSearch !== "" || Object.values(plFilters).some(s => s && s.size > 0)) ||
                  (cogsSearch !== "" || Object.values(cogsFilters).some(s => s && s.size > 0)) ||
                  (deprSearch !== "" || Object.values(deprFilters).some(s => s && s.size > 0))
                ) && (
                   <button 
                     onClick={() => {
                       clearPlFilters();
                       clearCogsFilters();
                       clearDeprFilters();
                     }}
                     className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider hover:bg-red-100 transition-colors"
                   >
                     Clear Filters
                   </button>
                )}
                <button 
                  onClick={() => setSelectedLedger(null)}
                  className="w-10 h-10 rounded-xl bg-transparent hover:bg-red-50 flex items-center justify-center text-primary/40 hover:text-red-600 transition-all cursor-pointer group"
                >
                  <Plus className="w-5 h-5 rotate-45 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-0 flex-1 overflow-auto custom-scrollbar relative">
            {isLoadingDetails ? (
              <div className="h-64 flex flex-col items-center justify-center gap-4 opacity-40">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Retrieving Records...</p>
              </div>
            ) : (isCogs && (!cogsDetails?.rows || cogsDetails.rows.length === 0)) || 
                (isDepr && (!deprDetails || deprDetails.length === 0)) ||
                (!isCogs && !isDepr && (filteredPlDetails.length === 0)) ? (
              <div className="h-64 flex items-center justify-center opacity-20 font-bold uppercase tracking-[0.2em]">
                No Records Found
              </div>
            ) : (
              <table className="w-full border-separate border-spacing-0">
                {isCogs ? (
                  <>
                        <thead>
                          <tr className="bg-white">
                            <th className="pl-8 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 sticky top-0 left-0 z-[60] bg-white border-b border-r border-primary/5 min-w-[350px] max-w-[350px] align-baseline">
                              <div className="flex items-center gap-1">
                                COGS
                                <ExcelColumnFilter 
                                  columnKey="cogs" label="COGS" data={getCogsCascadingData("cogs")} 
                                  activeFilters={cogsFilters["cogs"]} 
                                  onFilterChange={(v) => setCogsFilters(p => ({...p, cogs: v}))}
                                  onSort={(d) => setCogsSort({key: "cogs", direction: d})}
                                  currentSort={cogsSort}
                                />
                              </div>
                            </th>
                            {cogsDetails?.headers?.map((header: any) => (
                              <th 
                                key={header.key} 
                                className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 whitespace-nowrap sticky top-0 z-50 bg-white border-b border-primary/5 align-baseline"
                              >
                                {header.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-primary/5">
                          {filteredCogs?.map((item: any) => (
                            <tr key={item.id} className="bg-white hover:bg-primary/[0.01] transition-colors group">
                              <td className="pl-8 pr-6 py-2 sticky left-0 z-20 bg-white group-hover:bg-slate-50 transition-colors border-r border-primary/5 min-w-[350px] max-w-[350px] align-baseline">
                                <span className="text-[12px] font-bold text-primary uppercase tracking-wide whitespace-normal break-words block">
                                  {item.cogs || "-"}
                                </span>
                              </td>
                              {cogsDetails?.headers?.map((header: any) => {
                                const isTotal = header.key === 'rowTotal';
                                return (
                                  <td 
                                    key={header.key} 
                                    className={cn(
                                      "px-4 py-2 text-right whitespace-nowrap align-baseline",
                                      isTotal && "bg-slate-50/50 font-bold border-l border-primary/5"
                                    )}
                                  >
                                    <span className={cn(
                                      "text-[12px] font-bold tabular-nums",
                                      isTotal ? "text-primary" : "text-primary/70"
                                    )}>
                                      {item[`display_${header.key}`]}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                        {totals && (
                          <tfoot className="sticky bottom-0 z-50">
                            <tr className="bg-[#fdf8ec] border-t-2 border-[#cc9929] transition-none font-bold">
                              <td className="pl-8 py-4 sticky left-0 z-[60] bg-[#fdf8ec] border-r border-[#cc9929]/10 min-w-[350px] max-w-[350px] font-bold">
                                <span className="text-[12px] uppercase tracking-[0.2em] text-[#cc9929] font-bold">{totals.cogs}</span>
                              </td>
                              {cogsDetails?.headers?.map((header: any) => {
                                const isTotal = header.key === 'rowTotal';
                                return (
                                  <td 
                                    key={header.key} 
                                    className={cn(
                                      "px-4 py-4 text-right whitespace-nowrap font-bold",
                                      isTotal && "bg-[#fdf8ec] border-l border-[#cc9929]/20",
                                      getAmountColor(totals[header.key])
                                    )}
                                  >
                                    <span className={cn("text-[12px] tabular-nums font-bold", isTotal && "text-[14px]")}>
                                      {formatCurrency(totals[header.key])}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          </tfoot>
                        )}
                      </>
                ) : isDepr ? (
                  <>
                    <thead className="sticky top-0 z-30 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                      <tr className="border-b border-primary/5 whitespace-nowrap h-12">
                        <th className="pl-8 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-40">
                          <div className="flex items-center gap-1">
                            Category
                            <ExcelColumnFilter 
                              columnKey="category" label="Category" data={getDeprCascadingData("category")} 
                              activeFilters={deprFilters["category"]} 
                              onFilterChange={(v) => setDeprFilters(p => ({...p, category: v}))}
                              onSort={(d) => setDeprSort({key: "category", direction: d})}
                              currentSort={deprSort}
                            />
                          </div>
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-40">
                          <div className="flex items-center gap-1">
                            Date
                            <ExcelColumnFilter 
                              columnKey="displayPurchaseDate" label="Date" data={getDeprCascadingData("displayPurchaseDate")} 
                              activeFilters={deprFilters["displayPurchaseDate"]} 
                              onFilterChange={(v) => setDeprFilters(p => ({...p, displayPurchaseDate: v}))}
                              onSort={(d) => setDeprSort({key: "displayPurchaseDate", direction: d})}
                              currentSort={deprSort}
                            />
                          </div>
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-40">Source</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white min-w-[250px]">
                          <div className="flex items-center gap-1">
                            Description
                            <ExcelColumnFilter 
                              columnKey="assetName" label="Description" data={getDeprCascadingData("assetName")} 
                              activeFilters={deprFilters["assetName"]} 
                              onFilterChange={(v) => setDeprFilters(p => ({...p, assetName: v}))}
                              onSort={(d) => setDeprSort({key: "assetName", direction: d})}
                              currentSort={deprSort}
                            />
                          </div>
                        </th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-40">Purchase Price</th>
                        <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-24">Month</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-40">S/D 2024</th>
                        {months.map(m => (
                          <th key={m} className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-32">{m}</th>
                        ))}
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-40">Total 2025</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-40">S/D 2025</th>
                        <th className="pr-8 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-40">Book Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {filteredDepr?.map((item: any) => (
                        <tr key={item.id} className="bg-white hover:bg-secondary/[0.02] border-primary/5 transition-colors group">
                          <td className="pl-8 py-3 whitespace-nowrap">
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-bold uppercase text-[10px] py-0.5 px-2">
                              {item.category}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-[11px] font-bold text-primary/60 whitespace-nowrap">{item.displayPurchaseDate}</td>
                          <td className="px-4 py-3 text-[11px] font-bold text-primary/40 whitespace-nowrap uppercase tracking-wider">{item.bankRef}</td>
                          <td className="px-4 py-3">
                            <p className="text-[12px] font-bold text-primary uppercase leading-tight">{item.assetName}</p>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap text-[12px] font-bold tabular-nums">
                            {item.displayPurchasePrice}
                          </td>
                          <td className="px-4 py-3 text-center opacity-60 font-medium text-[12px]">
                            {item.usefulLife}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap text-[12px] font-bold tabular-nums">
                            {item.displayAccumulated2024}
                          </td>
                          {months.map(m => (
                            <td key={m} className="px-4 py-3 text-right whitespace-nowrap text-[12px] tabular-nums">
                              {item[`display_${m}`]}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right whitespace-nowrap text-[12px] font-bold text-primary tabular-nums">
                            {item.displayTotal2025}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap text-[12px] font-bold text-primary tabular-nums">
                            {item.displayAccumulated2025}
                          </td>
                          <td className="pr-8 py-3 text-right whitespace-nowrap text-[12px] font-bold text-primary tabular-nums">
                            {item.displayBookValue}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {totals && (
                      <tfoot className="sticky bottom-0 z-50">
                        <tr className="bg-[#fdf8ec] border-t-2 border-[#cc9929] transition-none font-bold">
                          <td colSpan={4} className="pl-8 py-4 text-left font-bold">
                            <span className="text-[12px] uppercase tracking-[0.2em] text-[#cc9929] font-bold">{totals.label}</span>
                          </td>
                          <td className={`px-4 py-4 text-right whitespace-nowrap font-bold tabular-nums text-[12px] ${getAmountColor(totals.purchasePrice)}`}>
                            {formatCurrency(totals.purchasePrice)}
                          </td>
                          <td className="px-4 py-4" />
                          <td className={`px-4 py-4 text-right whitespace-nowrap font-bold tabular-nums text-[12px] ${getAmountColor(totals.accumulated2024)}`}>
                            {formatCurrency(totals.accumulated2024)}
                          </td>
                          {months.map(m => (
                            <td key={m} className={`px-4 py-4 text-right whitespace-nowrap font-bold tabular-nums text-[12px] ${getAmountColor(totals[m])}`}>
                              {formatCurrency(totals[m])}
                            </td>
                          ))}
                          <td className={`px-4 py-4 text-right whitespace-nowrap font-bold tabular-nums text-[13px] ${getAmountColor(totals.total2025)}`}>
                            {formatCurrency(totals.total2025)}
                          </td>
                          <td className={`px-4 py-4 text-right whitespace-nowrap font-bold tabular-nums text-[13px] ${getAmountColor(totals.accumulated2025)}`}>
                            {formatCurrency(totals.accumulated2025)}
                          </td>
                          <td className={`pr-8 py-4 text-right whitespace-nowrap font-bold tabular-nums text-[14px] ${getAmountColor(totals.bookValue)}`}>
                            {formatCurrency(totals.bookValue)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </>
                ) : (
                  <>
                    <thead className="sticky top-0 z-30 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                      <tr className="border-b border-primary/5">
                        <th className="pl-8 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white">
                          <div className="flex items-center gap-1">
                            Channel
                            <ExcelColumnFilter 
                              columnKey="bankBrand" label="Channel" data={getPlCascadingData("bankBrand")} 
                              activeFilters={plFilters["bankBrand"]} 
                              onFilterChange={(v) => setPlFilters(p => ({...p, bankBrand: v}))}
                              onSort={(d) => setPlSort({key: "bankBrand", direction: d})}
                              currentSort={plSort}
                            />
                          </div>
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white">
                          <div className="flex items-center gap-1">
                            Date
                            <ExcelColumnFilter 
                              columnKey="displayDate" label="Date" data={getPlCascadingData("displayDate")} 
                              activeFilters={plFilters["displayDate"]} 
                              onFilterChange={(v) => setPlFilters(p => ({...p, displayDate: v}))}
                              onSort={(d) => setPlSort({key: "displayDate", direction: d})}
                              currentSort={plSort}
                            />
                          </div>
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white min-w-[200px]">
                          <div className="flex items-center gap-1">
                            Description
                            <ExcelColumnFilter 
                              columnKey="description" label="Description" data={getPlCascadingData("description")} 
                              activeFilters={plFilters["description"]} 
                              onFilterChange={(v) => setPlFilters(p => ({...p, description: v}))}
                              onSort={(d) => setPlSort({key: "description", direction: d})}
                              currentSort={plSort}
                            />
                          </div>
                        </th>
                        <th className="pr-8 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white">
                          <div className="flex items-center justify-end gap-1">
                            Amount
                            <ExcelColumnFilter 
                              columnKey="displayAmount" label="Amount" data={getPlCascadingData("displayAmount")} 
                              activeFilters={plFilters["displayAmount"]} 
                              onFilterChange={(v) => setPlFilters(p => ({...p, displayAmount: v}))}
                              onSort={(d) => setPlSort({key: "displayAmount", direction: d})}
                              currentSort={plSort}
                            />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {filteredPlDetails?.map((item: any) => (
                        <tr key={item.id} className="bg-white hover:bg-primary/[0.01] transition-colors group">
                          <td className="pl-8 py-3 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              {item.accountType === "CASH" ? (
                                 <p className="text-[11px] font-bold text-primary/70 uppercase tracking-wider">CASH</p>
                              ) : item.accountType === "BANK" ? (
                                <>
                                  <p className="text-[11px] font-bold text-primary/70 uppercase">
                                    {item.bankBrand || item.bankName} - {item.branch}
                                  </p>
                                  <p className="text-[9px] font-medium text-primary/30">{item.accountNo}</p>
                                </>
                              ) : (
                                <p className="text-[11px] font-bold text-primary/70 uppercase">{item.holderName}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[11px] font-bold text-primary/60 whitespace-nowrap">{item.displayDate}</td>
                          <td className="px-4 py-3 whitespace-normal min-w-[200px]">
                            <div className="flex flex-col gap-0.5">
                              <p className="text-[12px] font-bold text-primary uppercase leading-tight group-hover:text-primary transition-colors">{item.description}</p>
                              <p className="text-[9px] font-bold text-primary/20 uppercase tracking-widest">{item.ledger}</p>
                            </div>
                          </td>
                          <td className="pr-8 py-3 text-right whitespace-nowrap">
                            <span className="text-[12px] font-bold text-primary tabular-nums">
                              {item.displayAmount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {totals && (
                      <tfoot className="sticky bottom-0 z-50">
                        <tr className="bg-[#fdf8ec] border-t-2 border-[#cc9929] transition-none font-bold">
                          <td colSpan={3} className="pl-8 py-4 text-left font-bold">
                            <span className="text-[12px] uppercase tracking-[0.2em] text-[#cc9929] font-bold">{totals.label}</span>
                          </td>
                          <td className={cn("pr-8 py-4 text-right whitespace-nowrap font-bold", getAmountColor(totals.amount))}>
                            <span className="text-[14px] tabular-nums font-bold">
                              {formatCurrency(totals.amount)}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </>
                )}
                </table>
              )}
          </div>
        </DialogContent>
      </Dialog>
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-white/20 backdrop-blur-[2px] flex items-center justify-center rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Aggregating Financial Data...</p>
          </div>
        </div>
      )}

      {/* Premium Navigation Bar */}
      <div className="flex items-center justify-between bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="flex items-center gap-3 pl-2">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary/60 border border-primary/5 shadow-inner shrink-0">
            <PieChart size={20} />
          </div>
          <div className="flex flex-col justify-center">
            <h3 className="text-[13px] font-bold text-primary leading-none capitalize">
              Profit & Loss Statement — {year === "all" ? "All Time" : year}
            </h3>
            <p className="text-[11px] text-primary/40 uppercase tracking-widest mt-1.5">Comprehensive Financial Summary</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mr-4">
          <div className="flex flex-col items-end">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-12 px-6 bg-white border-0 shadow-sm rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all justify-start text-left hover:bg-white hover:shadow-sm text-muted-foreground hover:text-muted-foreground",
                    !selectedDate && "text-muted-foreground hover:text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-secondary" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 shadow-premium border-primary/5 overflow-hidden" align="end">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  startMonth={year === "all" ? new Date(2020, 0) : new Date(parseInt(year), 0)}
                  endMonth={year === "all" ? new Date(2030, 11) : new Date(parseInt(year), 11)}
                  defaultMonth={year === "all" ? undefined : new Date(parseInt(year), 0)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col items-end">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-12 w-32 bg-white border-0 shadow-sm rounded-xl text-[11px] font-bold uppercase tracking-widest focus:ring-0 focus:ring-offset-0 transition-all hover:bg-white hover:shadow-sm">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent className="border-primary/5 shadow-2xl">
                <SelectItem value="all" className="text-[11px] font-bold uppercase tracking-widest py-3 cursor-pointer">All Time</SelectItem>
                <SelectItem value="2024" className="text-[11px] font-bold uppercase tracking-widest py-3 cursor-pointer">2024</SelectItem>
                <SelectItem value="2025" className="text-[11px] font-bold uppercase tracking-widest py-3 cursor-pointer">2025</SelectItem>
                <SelectItem value="2026" className="text-[11px] font-bold uppercase tracking-widest py-3 cursor-pointer">2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {year !== "all" && (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setShowPropertiesModal(true)}
              className="h-12 w-12 bg-white border-0 shadow-sm rounded-xl text-primary/40 hover:text-primary transition-all hover:bg-white hover:shadow-sm"
            >
              <Settings size={20} />
            </Button>
          )}
        </div>
      </div>

      {year !== "all" && (
        <PLPropertiesModal 
          open={showPropertiesModal}
          onOpenChange={setShowPropertiesModal}
          year={parseInt(year)}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card: any, i: number) => (
          <Card key={i} className="bg-white/70 backdrop-blur-md border-primary/5 shadow-premium overflow-hidden group transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-bold text-primary/40 tracking-widest uppercase">{card.title}</p>
                <card.icon className={`w-4 h-4 ${card.color} transition-opacity`} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-primary tracking-tight">
                  {card.value}
                </h3>
                <p className="text-[10px] font-bold text-primary/40 uppercase tracking-wider">
                  {card.subValue}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-premium border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap h-12">
                <TableHead className="pl-8 text-[11px] font-bold uppercase tracking-widest">Account</TableHead>
                <TableHead className="text-right text-[11px] font-bold uppercase tracking-widest">Gross</TableHead>
                <TableHead className="text-right text-[11px] font-bold uppercase tracking-widest">VAT / Adj.</TableHead>
                <TableHead className="pr-8 text-right text-[11px] font-bold uppercase tracking-widest w-64">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row: any, idx:number) => {
                if (row.isHeader) {
                  return (
                    <TableRow key={idx} className="bg-primary/5 hover:bg-primary/5 border-primary/5 transition-none whitespace-nowrap">
                      <TableCell 
                        colSpan={4} 
                        className="py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60"
                        style={{ paddingLeft: `${(row.level >= 2 ? (row.level - 1) * 16 : 0) + 32}px` }}
                      >
                        {row.account}
                      </TableCell>
                    </TableRow>
                  );
                }

                // --- ACCORDION LOGIC ---
                // If it's a sub-item (level 3), only show if parent is expanded
                if (row.level === 3 && !expandedLedgers.has(row.parentLedger)) {
                  return null;
                }

                const isProfitLine = row.isTotal && row.account !== "PROFIT BEFORE TAX";
                const isGrandTotal = row.account === "PROFIT AFTER TAX";
                const isExpense = expenseLedgers.includes(row.account);
                const isSpecialBold = ["Operating Profit", "PROFIT BEFORE TAX"].includes(row.account);
                const isOtherProfitItem = ["Other Income", "Depreciation", "Income Tax"].includes(row.account);
                const hasSubItems = tableData.some((r: any) => r.level === 3 && r.parentLedger === row.account);
                const isExpanded = expandedLedgers.has(row.account);



                return (
                  <TableRow 
                    key={idx} 
                    className={`
                      ${isGrandTotal 
                        ? "bg-secondary/10 hover:bg-secondary/10 border-t border-secondary/30" 
                        : isProfitLine 
                          ? "bg-secondary/5 hover:bg-secondary/5 border-t-2 border-secondary/30" 
                          : row.account === "PROFIT BEFORE TAX"
                            ? "hover:bg-primary/[0.01] border-primary/5"
                            : row.level === 3
                              ? "bg-slate-50/30 hover:bg-slate-50/50 cursor-pointer animate-in fade-in slide-in-from-top-1 duration-200"
                              : "hover:bg-primary/[0.01] border-primary/5"}
                      ${isExpense || row.level === 3 ? "cursor-pointer group/row" : ""}
                      transition-all duration-200 border-b
                    `}
                    onClick={() => {
                      if (isExpense) {
                        setSelectedLedger(row.account);
                        setSelectedSubItem(null);
                      } else if (row.level === 3) {
                        setSelectedLedger(row.parentLedger);
                        setSelectedSubItem(row.account);
                      }
                    }}
                  >
                    <TableCell 
                      className="py-2 pr-4" 
                      style={{ paddingLeft: `${(row.level >= 2 ? (row.level - 1) * 24 : 0) + 32}px` }}
                    >
                      <div className="flex items-center gap-2">
                        {/* Accordion Toggle */}
                        {hasSubItems && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(row.account);
                            }}
                            className="p-1 hover:bg-primary/5 rounded transition-colors cursor-pointer"
                          >
                            {isExpanded ? <ChevronDown size={12} className="text-primary/40" /> : <ChevronRight size={12} className="text-primary/40" />}
                          </button>
                        )}
                        
                        {row.level === 3 && <div className="w-1.5 h-1.5 rounded-full bg-primary/10 mr-1" />}
                        
                        <span 
                          className={`text-[12px] uppercase tracking-wide flex-grow ${
                            isGrandTotal ? "font-bold text-secondary" :
                            isSpecialBold ? "font-bold text-primary/70" :
                            isOtherProfitItem ? "font-medium text-primary/60" :
                            isProfitLine ? "font-bold text-secondary" : 
                            row.level === 3 ? "font-bold text-primary/40 text-[11px]" :
                            row.isSubItem ? "font-medium text-primary/60" : 
                            "font-bold text-primary/70"
                          }`}
                        >
                          {row.account === "Other Income" ? "Other Income (Expense)" : row.account}
                        </span>
                        
                        {(isExpense || row.level === 3) && (
                          <div className="flex items-center justify-center opacity-0 group-hover/row:opacity-100 group-hover/row:text-blue-500 transition-all text-primary">
                            <Info size={12} />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={cn("text-right text-[12px] py-2 text-primary/40", (isProfitLine || isGrandTotal) ? "font-bold" : "font-normal")}>
                      {row.gross ? formatCurrency(row.gross) : "-"}
                    </TableCell>
                    <TableCell className={cn("text-right text-[12px] py-2 text-primary/40", (isProfitLine || isGrandTotal) ? "font-bold" : "font-normal")}>
                      {row.vatAdj ? formatCurrency(row.vatAdj) : "-"}
                    </TableCell>
                    <TableCell className={cn(
                      "pr-8 text-right text-[12px] tracking-tight py-2",
                      (isProfitLine || isGrandTotal) ? "font-bold" : "font-normal",
                      getAmountColor(row.total)
                    )}>
                      {formatCurrency(row.total)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-start gap-2 px-8 mt-6">
        <Info size={14} className="text-primary/20 shrink-0 mt-0.5" />
        <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">
          Click on an account row marked with the info icon to view the detailed bank mutation breakdown.
        </p>
      </div>
    </div>
  );
}
