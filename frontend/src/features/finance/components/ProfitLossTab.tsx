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
import { TrendingUp, DollarSign, PieChart, Info, Loader2, History, Plus, Calendar as CalendarIcon, ChevronDown, ChevronRight, Pin } from "lucide-react";
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
  const { getPLStatement, getPLDetails, getDepreciationDetails, getSalesCogsDetails } = useFinance();
  
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

  const [pinnedDeprCols, setPinnedDeprCols] = useState<string[]>([]);

  const DEPR_PINNABLE_COLUMNS = useMemo(() => [
    'category',
    'purchaseDate',
    'bankRef',
    'assetName',
    'purchasePrice',
    'usefulLife',
    'accumulated2024'
  ], []);

  const DEPR_COLUMN_WIDTHS = useMemo<Record<string, number>>(() => ({
    category: 160,
    purchaseDate: 160,
    bankRef: 160,
    assetName: 250,
    purchasePrice: 160,
    usefulLife: 96,
    accumulated2024: 160,
  }), []);

  const getDeprStickyStyle = (colKey: string, isHeader = false) => {
    const isPinned = pinnedDeprCols.includes(colKey);
    const width = DEPR_COLUMN_WIDTHS[colKey];
    
    const baseStyle = {
      width: `${width}px`,
      minWidth: `${width}px`,
    };

    if (!isPinned) return baseStyle;

    const currentIndex = DEPR_PINNABLE_COLUMNS.indexOf(colKey);
    let leftOffset = 0;
    for (let i = 0; i < currentIndex; i++) {
      const prevCol = DEPR_PINNABLE_COLUMNS[i];
      if (pinnedDeprCols.includes(prevCol)) {
        leftOffset += DEPR_COLUMN_WIDTHS[prevCol];
      }
    }

    return {
      ...baseStyle,
      position: 'sticky' as const,
      left: `${leftOffset}px`,
      zIndex: isHeader ? 30 : 20,
      boxShadow: 'inset -2px 0 0 0 rgba(15, 23, 42, 0.05)',
    };
  };

  const getDeprStickyClass = (colKey: string, type: 'header' | 'body' | 'footer') => {
    const isPinned = pinnedDeprCols.includes(colKey);
    if (!isPinned) return '';
    
    switch (type) {
      case 'header':
        return '!bg-white text-primary shadow-[inset_-2px_0_0_0_rgba(15, 23, 42, 0.08)]';
      case 'body':
        return '!bg-white group-hover:!bg-slate-50/90 shadow-[inset_-2px_0_0_0_rgba(15, 23, 42, 0.05)] transition-colors';
      case 'footer':
        return '!bg-[#fdf8ec] shadow-[inset_-2px_0_0_0_rgba(15, 23, 42, 0.05)]';
      default:
        return '';
    }
  };

  const toggleDeprPin = (colKey: string) => {
    setPinnedDeprCols(prev => 
      prev.includes(colKey) 
        ? prev.filter(k => k !== colKey) 
        : [...prev, colKey]
    );
  };

  const renderDeprPinButton = (colKey: string) => {
    const isPinned = pinnedDeprCols.includes(colKey);
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleDeprPin(colKey);
        }}
        className={cn(
          "p-1 rounded-md transition-all hover:bg-slate-200/50 cursor-pointer shrink-0 ml-1",
          isPinned 
            ? "text-secondary opacity-100 scale-110" 
            : "text-primary/40 opacity-70 hover:opacity-100 hover:text-primary/80"
        )}
        title={isPinned ? "Unpin column" : "Pin column"}
      >
        <Pin size={12} className={cn(isPinned ? "fill-current rotate-45" : "")} />
      </button>
    );
  };
  
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
  const [selectedSalesCode, setSelectedSalesCode] = useState<string | null>(null);
  const [selectedCogsGroup, setSelectedCogsGroup] = useState<string | null>(null);
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

  const isDepr = selectedLedger === "Depreciation";
  const isSales = selectedLedger === "Sales";
  const isCogs = selectedLedger === "Cost of Goods";

  const { data: plDetails, isLoading: isLoadingPlDetails } = getPLDetails(
    year === "all" ? undefined : year, 
    selectedLedger || undefined, 
    selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined,
    selectedSubItem || undefined,
    undefined,
    { enabled: !!selectedLedger && !isDepr && !isCogs }
  );

  const { data: salesCodeDetails, isLoading: isLoadingSalesCodeDetails } = getPLDetails(
    year === "all" ? undefined : year,
    "Sales",
    selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined,
    undefined,
    selectedSalesCode || undefined,
    { enabled: !!selectedSalesCode }
  );

  const { data: cogsGroupDetails, isLoading: isLoadingCogsGroupDetails } = getPLDetails(
    year === "all" ? undefined : year,
    "Cost of Goods",
    selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined,
    selectedCogsGroup || undefined,
    undefined,
    { enabled: !!selectedCogsGroup }
  );

  const displayPlDetails = useMemo(() => {
    return (plDetails || []).map((row: any) => ({
      ...row,
      displayDate: formatDate(row.date),
      displayAmount: formatCurrency(row.amount),
      displayGross: row.gross !== undefined ? formatCurrency(row.gross) : undefined,
      displayVat: row.vat !== undefined ? formatCurrency(row.vat) : undefined,
      displayVatWapu: row.vatWapu !== undefined ? formatCurrency(row.vatWapu) : undefined,
      displayVatNonWapu: row.vatNonWapu !== undefined ? formatCurrency(row.vatNonWapu) : undefined,
    }));
  }, [plDetails]);

  const displaySalesCodeDetails = useMemo(() => {
    return (salesCodeDetails || []).map((row: any) => ({
      ...row,
      displayDate: formatDate(row.date),
      displayAmount: formatCurrency(row.amount),
      displayGross: row.gross !== undefined ? formatCurrency(row.gross) : undefined,
      displayVat: row.vat !== undefined ? formatCurrency(row.vat) : undefined,
    }));
  }, [salesCodeDetails]);

  const displayCogsGroupDetails = useMemo(() => {
    return (cogsGroupDetails || []).map((row: any) => ({
      ...row,
      displayDate: formatDate(row.date),
      displayDebit: formatCurrency(row.debit),
      displayCredit: formatCurrency(row.credit),
      displayAmount: formatCurrency(row.amount),
    }));
  }, [cogsGroupDetails]);

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
    searchFields: [
      'description', 
      'subItem', 
      'ledger', 
      'bankBrand', 
      'holderName', 
      'displayAmount', 
      'displayDate',
      'invoiceNo',
      'invoiceType',
      'clientName',
      'salesCode',
      'displayGross',
      'displayVat',
      'displayVatWapu',
      'displayVatNonWapu'
    ]
  });

  const { 
    search: salesCodeSearch, 
    filters: salesCodeFilters, 
    setFilters: setSalesCodeFilters, 
    sort: salesCodeSort, 
    setSort: setSalesCodeSort, 
    getCascadingData: getSalesCodeCascadingData, 
    filteredAndSortedData: filteredSalesCodeDetails,
    clearFilters: clearSalesCodeFilters
  } = useExcelFilter({
    data: displaySalesCodeDetails,
    searchFields: [
      'description', 
      'subItem', 
      'displayAmount', 
      'displayDate',
      'invoiceNo',
      'invoiceType',
      'clientName',
      'salesCode',
      'displayGross',
      'displayVat'
    ]
  });

  const { 
    search: cogsGroupSearch, 
    filters: cogsGroupFilters, 
    setFilters: setCogsGroupFilters, 
    sort: cogsGroupSort, 
    setSort: setCogsGroupSort, 
    getCascadingData: getCogsGroupCascadingData, 
    filteredAndSortedData: filteredCogsGroupDetails,
    clearFilters: clearCogsGroupFilters
  } = useExcelFilter({
    data: displayCogsGroupDetails,
    searchFields: [
      'description', 
      'displayDebit',
      'displayCredit',
      'displayAmount', 
      'displayDate',
      'bankBrand',
      'holderName'
    ]
  });

  const { data: deprDetails, isLoading: isLoadingDeprDetails } = getDepreciationDetails(
    { enabled: !!selectedLedger && isDepr }
  );

  // --- COGS Details ---
  const { data: cogsData, isLoading: isLoadingCogs } = getSalesCogsDetails(
    year === "all" ? undefined : year,
    selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined,
    { enabled: isCogs }
  );

  const cogsHeaders: { key: string; label: string }[] = useMemo(
    () => cogsData?.headers ?? [],
    [cogsData]
  );

  const normalizedCogs = useMemo(() => {
    if (!cogsData?.rows) return [];
    return cogsData.rows.map((row: any) => {
      const normalized: any = {
        ...row,
        id: row.id?.toString(),
        displayDate: formatDate(row.date),
      };
      cogsHeaders.forEach((h) => {
        normalized[`display_${h.key}`] = formatCurrency(row[h.key] ?? '0');
      });
      return normalized;
    });
  }, [cogsData, cogsHeaders]);

  const {
    filters: cogsFilters,
    setFilters: setCogsFilters,
    sort: cogsSort,
    setSort: setCogsSort,
    getCascadingData: getCogsCascadingData,
    filteredAndSortedData: filteredCogs,
    clearFilters: clearCogsFilters,
  } = useExcelFilter({
    data: normalizedCogs,
    searchFields: ['cogs', 'displayDate'],
  });

  const cogsTotals = useMemo(() => {
    if (!cogsData?.rows || cogsData.rows.length === 0) return null;
    const totalsRow: any = { label: 'TOTAL' };
    cogsHeaders.forEach((h) => {
      const sum = cogsData.rows.reduce(
        (acc: number, r: any) => acc + parseFloat(r[h.key] ?? '0'),
        0
      );
      totalsRow[h.key] = sum.toString();
    });
    return totalsRow;
  }, [cogsData, cogsHeaders]);

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

  const isLoadingDetails = isDepr ? isLoadingDeprDetails : isLoadingPlDetails;

  const expenseLedgers = [
    "Personnel Expense", 
    "Office Expense", 
    "Marketing Expense", 
    "Financial Expense", 
    "Other Income", 
    "Depreciation"
  ];

  const tableData = plData?.tableData || [];
  
  const totals = useMemo(() => {
    if (isDepr) {
      if (!deprDetails || deprDetails.length === 0) return null;
      
      const res: any = { label: "TOTAL" };
      const numericFields = ["purchasePrice", "accumulated2024", ...months, "total2025", "accumulated2025", "bookValue"];
      
      numericFields.forEach(field => {
        const sum = deprDetails.reduce((acc: number, row: any) => acc + parseFloat(row[field] || "0"), 0);
        res[field] = sum.toString();
      });
      
      return res;
    } else if (isSales) {
      if (!plDetails || plDetails.length === 0) return null;
      const sumGross = plDetails.reduce((acc: number, row: any) => acc + parseFloat(row.gross || "0"), 0);
      const sumVat = plDetails.reduce((acc: number, row: any) => acc + parseFloat(row.vat || "0"), 0);
      const sumVatWapu = plDetails.reduce((acc: number, row: any) => acc + parseFloat(row.vatWapu || "0"), 0);
      const sumVatNonWapu = plDetails.reduce((acc: number, row: any) => acc + parseFloat(row.vatNonWapu || "0"), 0);
      const sumAmount = plDetails.reduce((acc: number, row: any) => acc + parseFloat(row.amount || "0"), 0);
      return { 
        gross: sumGross.toString(), 
        vat: sumVat.toString(), 
        vatWapu: sumVatWapu.toString(),
        vatNonWapu: sumVatNonWapu.toString(),
        amount: sumAmount.toString(), 
        label: "TOTAL" 
      };
    } else {
      if (!plDetails || plDetails.length === 0) return null;
      const sum = plDetails.reduce((acc: number, row: any) => {
        return acc + parseFloat(row.amount || "0");
      }, 0);
      return { amount: sum.toString(), label: "TOTAL" };
    }
  }, [isDepr, isSales, plDetails, deprDetails]);

  const salesCodeTotals = useMemo(() => {
    if (!salesCodeDetails || salesCodeDetails.length === 0) return null;
    const sumGross = salesCodeDetails.reduce((acc: number, row: any) => acc + parseFloat(row.gross || "0"), 0);
    const sumVat = salesCodeDetails.reduce((acc: number, row: any) => acc + parseFloat(row.vat || "0"), 0);
    const sumAmount = salesCodeDetails.reduce((acc: number, row: any) => acc + parseFloat(row.amount || "0"), 0);
    return {
      gross: sumGross.toString(),
      vat: sumVat.toString(),
      amount: sumAmount.toString(),
      label: "TOTAL"
    };
  }, [salesCodeDetails]);

  const cogsGroupTotals = useMemo(() => {
    if (!cogsGroupDetails || cogsGroupDetails.length === 0) return null;
    const sumDebit = cogsGroupDetails.reduce((acc: number, row: any) => acc + parseFloat(row.debit || "0"), 0);
    const sumCredit = cogsGroupDetails.reduce((acc: number, row: any) => acc + parseFloat(row.credit || "0"), 0);
    const sumAmount = cogsGroupDetails.reduce((acc: number, row: any) => acc + parseFloat(row.amount || "0"), 0);
    return {
      debit: sumDebit.toString(),
      credit: sumCredit.toString(),
      amount: sumAmount.toString(),
      label: "TOTAL"
    };
  }, [cogsGroupDetails]);

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
                  (deprSearch !== "" || Object.values(deprFilters).some(s => s && s.size > 0)) ||
                  (Object.values(cogsFilters).some(s => s && s.size > 0))
                ) && (
                   <button 
                     onClick={() => {
                       clearPlFilters();
                       clearDeprFilters();
                       clearCogsFilters();
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
            {(isCogs ? isLoadingCogs : isLoadingDetails) ? (
              <div className="h-64 flex flex-col items-center justify-center gap-4 opacity-40">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Retrieving Records...</p>
              </div>
            ) : (isDepr && (!deprDetails || deprDetails.length === 0)) ||
                (isCogs && filteredCogs.length === 0) ||
                (!isDepr && !isCogs && filteredPlDetails.length === 0) ? (
              <div className="h-64 flex items-center justify-center opacity-20 font-bold uppercase tracking-[0.2em]">
                No Records Found
              </div>
            ) : (
              <table className={cn("w-full border-separate border-spacing-0", isDepr && "table-fixed min-w-[3000px]")}>
                {isCogs ? (
                  <>
                    <thead className="sticky top-0 z-30 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                      <tr className="border-b border-primary/5 whitespace-nowrap h-12">
                        {/* Project/COGS */}
                        <th className="pl-8 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white min-w-[220px]">
                          <div className="flex items-center gap-1">
                            Project/COGS
                            <ExcelColumnFilter
                              columnKey="cogs"
                              label="Project/COGS"
                              data={getCogsCascadingData("cogs")}
                              activeFilters={cogsFilters["cogs"]}
                              onFilterChange={(v) => setCogsFilters((p) => ({ ...p, cogs: v }))}
                              onSort={(d) => setCogsSort({ key: "cogs", direction: d })}
                              currentSort={cogsSort}
                            />
                          </div>
                        </th>
                        {/* Dynamic account columns */}
                        {cogsHeaders.map((h) => (
                          <th
                            key={h.key}
                            className={`px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white whitespace-nowrap ${
                              h.key === 'rowTotal' ? 'pr-8 min-w-[140px] text-primary/70' : 'w-36'
                            }`}
                          >
                            <div className="flex items-center justify-end gap-1">
                              {h.label}
                              <ExcelColumnFilter
                                columnKey={`display_${h.key}`}
                                label={h.label}
                                data={getCogsCascadingData(`display_${h.key}`)}
                                activeFilters={cogsFilters[`display_${h.key}`]}
                                onFilterChange={(v) => setCogsFilters((p) => ({ ...p, [`display_${h.key}`]: v }))}
                                onSort={(d) => setCogsSort({ key: `display_${h.key}`, direction: d })}
                                currentSort={cogsSort}
                              />
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {filteredCogs.map((item: any) => (
                        <tr 
                          key={item.id} 
                          className="bg-white hover:bg-primary/[0.03] active:bg-primary/[0.05] transition-colors group cursor-pointer"
                          onClick={() => setSelectedCogsGroup(item.cogs)}
                        >
                          <td className="pl-8 py-3 whitespace-normal min-w-[220px]">
                            <div className="flex items-center gap-2 w-full">
                              <p className="text-[12px] font-bold text-primary uppercase leading-tight group-hover:underline flex-1">{item.cogs}</p>
                              <div className="flex items-center justify-center text-primary/20 group-hover:text-blue-500 transition-all shrink-0">
                                <Info size={12} className="transition-colors duration-200" />
                              </div>
                            </div>
                          </td>
                          {cogsHeaders.map((h) => (
                            <td
                              key={h.key}
                              className={`px-4 py-3 text-right whitespace-nowrap text-[12px] tabular-nums ${
                                h.key === 'rowTotal'
                                  ? `pr-8 font-bold ${getAmountColor(item[h.key])}`
                                  : parseFloat(item[h.key] ?? '0') !== 0
                                  ? `font-bold ${getAmountColor(item[h.key])}`
                                  : 'text-primary/20'
                              }`}
                            >
                              {formatCurrency(item[h.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    {cogsTotals && (
                      <tfoot className="sticky bottom-0 z-50">
                        <tr className="bg-[#fdf8ec] border-t-2 border-[#cc9929] transition-none font-bold">
                          <td colSpan={1} className="pl-8 py-4 text-left font-bold">
                            <span className="text-[12px] uppercase tracking-[0.2em] text-[#cc9929] font-bold">{cogsTotals.label}</span>
                          </td>
                          {cogsHeaders.map((h) => (
                            <td
                              key={h.key}
                              className={`px-4 py-4 text-right whitespace-nowrap font-bold tabular-nums ${
                                h.key === 'rowTotal'
                                  ? `pr-8 text-[14px] ${getAmountColor(cogsTotals[h.key])}`
                                  : `text-[12px] ${getAmountColor(cogsTotals[h.key])}`
                              }`}
                            >
                              {formatCurrency(cogsTotals[h.key])}
                            </td>
                          ))}
                        </tr>
                      </tfoot>
                    )}
                  </>
                ) : isDepr ? (
                  <>
                    <thead className="sticky top-0 z-30 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                      <tr className="border-b border-primary/5 whitespace-nowrap h-12">
                        <th className={cn("pl-8 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-40 group select-none", getDeprStickyClass("category", "header"))} style={getDeprStickyStyle("category", true)}>
                          <div className="flex items-center justify-between gap-1 w-full">
                            <span>Category</span>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <ExcelColumnFilter 
                                columnKey="category" label="Category" data={getDeprCascadingData("category")} 
                                activeFilters={deprFilters["category"]} 
                                onFilterChange={(v) => setDeprFilters(p => ({...p, category: v}))}
                                onSort={(d) => setDeprSort({key: "category", direction: d})}
                                currentSort={deprSort}
                              />
                              {renderDeprPinButton("category")}
                            </div>
                          </div>
                        </th>
                        <th className={cn("px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-40 group select-none", getDeprStickyClass("purchaseDate", "header"))} style={getDeprStickyStyle("purchaseDate", true)}>
                          <div className="flex items-center justify-between gap-1 w-full">
                            <span>Date</span>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <ExcelColumnFilter 
                                columnKey="displayPurchaseDate" label="Date" data={getDeprCascadingData("displayPurchaseDate")} 
                                activeFilters={deprFilters["displayPurchaseDate"]} 
                                onFilterChange={(v) => setDeprFilters(p => ({...p, displayPurchaseDate: v}))}
                                onSort={(d) => setDeprSort({key: "displayPurchaseDate", direction: d})}
                                currentSort={deprSort}
                                type="date"
                                dateKey="purchaseDate"
                              />
                              {renderDeprPinButton("purchaseDate")}
                            </div>
                          </div>
                        </th>
                        <th className={cn("px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-40 group select-none", getDeprStickyClass("bankRef", "header"))} style={getDeprStickyStyle("bankRef", true)}>
                          <div className="flex items-center justify-between gap-1 w-full">
                            <span>Source</span>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {renderDeprPinButton("bankRef")}
                            </div>
                          </div>
                        </th>
                        <th className={cn("px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white min-w-[250px] group select-none", getDeprStickyClass("assetName", "header"))} style={getDeprStickyStyle("assetName", true)}>
                          <div className="flex items-center justify-between gap-1 w-full">
                            <span>Description</span>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <ExcelColumnFilter 
                                columnKey="assetName" label="Description" data={getDeprCascadingData("assetName")} 
                                activeFilters={deprFilters["assetName"]} 
                                onFilterChange={(v) => setDeprFilters(p => ({...p, assetName: v}))}
                                onSort={(d) => setDeprSort({key: "assetName", direction: d})}
                                currentSort={deprSort}
                              />
                              {renderDeprPinButton("assetName")}
                            </div>
                          </div>
                        </th>
                        <th className={cn("px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-40 group select-none", getDeprStickyClass("purchasePrice", "header"))} style={getDeprStickyStyle("purchasePrice", true)}>
                          <div className="flex items-center justify-between gap-1 w-full">
                            <span className="text-right w-full">Purchase Price</span>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {renderDeprPinButton("purchasePrice")}
                            </div>
                          </div>
                        </th>
                        <th className={cn("px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-24 group select-none", getDeprStickyClass("usefulLife", "header"))} style={getDeprStickyStyle("usefulLife", true)}>
                          <div className="flex items-center justify-between gap-1 w-full">
                            <span className="text-center w-full">Month</span>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {renderDeprPinButton("usefulLife")}
                            </div>
                          </div>
                        </th>
                        <th className={cn("px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-40 group select-none", getDeprStickyClass("accumulated2024", "header"))} style={getDeprStickyStyle("accumulated2024", true)}>
                          <div className="flex items-center justify-between gap-1 w-full">
                            <span className="text-right w-full">S/D 2024</span>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {renderDeprPinButton("accumulated2024")}
                            </div>
                          </div>
                        </th>
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
                          <td className={cn("pl-8 py-3 whitespace-nowrap", getDeprStickyClass("category", "body"))} style={getDeprStickyStyle("category")}>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-bold uppercase text-[10px] py-0.5 px-2">
                              {item.category}
                            </Badge>
                          </td>
                          <td className={cn("px-4 py-3 text-[11px] font-bold text-primary/60 whitespace-nowrap", getDeprStickyClass("purchaseDate", "body"))} style={getDeprStickyStyle("purchaseDate")}>{item.displayPurchaseDate}</td>
                          <td className={cn("px-4 py-3 text-[11px] font-bold text-primary/40 whitespace-nowrap uppercase tracking-wider", getDeprStickyClass("bankRef", "body"))} style={getDeprStickyStyle("bankRef")}>{item.bankRef}</td>
                          <td className={cn("px-4 py-3 whitespace-normal break-words", getDeprStickyClass("assetName", "body"))} style={getDeprStickyStyle("assetName")}>
                            <p className="text-[12px] font-bold text-primary uppercase leading-tight">{item.assetName}</p>
                          </td>
                          <td className={cn("px-4 py-3 text-right whitespace-nowrap text-[12px] font-bold tabular-nums", getDeprStickyClass("purchasePrice", "body"))} style={getDeprStickyStyle("purchasePrice")}>
                            {item.displayPurchasePrice}
                          </td>
                          <td className={cn("px-4 py-3 text-center font-medium text-[12px]", getDeprStickyClass("usefulLife", "body"))} style={getDeprStickyStyle("usefulLife")}>
                            <span className="opacity-60">{item.usefulLife}</span>
                          </td>
                          <td className={cn("px-4 py-3 text-right whitespace-nowrap text-[12px] font-bold tabular-nums", getDeprStickyClass("accumulated2024", "body"))} style={getDeprStickyStyle("accumulated2024")}>
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
                          <td className={cn("pl-8 py-4 text-left font-bold w-40", getDeprStickyClass("category", "footer"))} style={getDeprStickyStyle("category")}>
                            <span className="text-[12px] uppercase tracking-normal text-[#cc9929] font-bold">{totals.label}</span>
                          </td>
                          <td className={cn("py-4 w-40", getDeprStickyClass("purchaseDate", "footer"))} style={getDeprStickyStyle("purchaseDate")} />
                          <td className={cn("py-4 w-40", getDeprStickyClass("bankRef", "footer"))} style={getDeprStickyStyle("bankRef")} />
                          <td className={cn("py-4 w-80", getDeprStickyClass("assetName", "footer"))} style={getDeprStickyStyle("assetName")} />
                          <td className={cn(`px-4 py-4 text-right whitespace-nowrap font-bold tabular-nums text-[12px] w-40 ${getAmountColor(totals.purchasePrice)}`, getDeprStickyClass("purchasePrice", "footer"))} style={getDeprStickyStyle("purchasePrice")}>
                            {formatCurrency(totals.purchasePrice)}
                          </td>
                          <td className={cn("px-4 py-4 w-24", getDeprStickyClass("usefulLife", "footer"))} style={getDeprStickyStyle("usefulLife")} />
                          <td className={cn(`px-4 py-4 text-right whitespace-nowrap font-bold tabular-nums text-[12px] w-40 ${getAmountColor(totals.accumulated2024)}`, getDeprStickyClass("accumulated2024", "footer"))} style={getDeprStickyStyle("accumulated2024")}>
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
                ) : isSales ? (
                  <>
                    <thead className="sticky top-0 z-30 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                      <tr className="border-b border-primary/5 whitespace-nowrap h-12">
                        <th className="pl-8 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white min-w-[250px]">
                          <div className="flex items-center gap-1">
                            Sales Code
                            <ExcelColumnFilter 
                              columnKey="salesCode" label="Sales Code" data={getPlCascadingData("salesCode")} 
                              activeFilters={plFilters["salesCode"]} 
                              onFilterChange={(v) => setPlFilters(p => ({...p, salesCode: v}))}
                              onSort={(d) => setPlSort({key: "salesCode", direction: d})}
                              currentSort={plSort}
                            />
                          </div>
                        </th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-48">Gross</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-48">VAT</th>
                        <th className="pr-8 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-56">
                          Net
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {filteredPlDetails?.map((item: any) => (
                        <tr 
                          key={item.id} 
                          className="bg-white hover:bg-primary/[0.03] active:bg-primary/[0.05] transition-colors group cursor-pointer"
                          onClick={() => setSelectedSalesCode(item.salesCode)}
                        >
                          <td className="pl-8 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2 w-full">
                              <span className="text-[12px] font-bold text-primary uppercase hover:underline flex-1">
                                {item.salesCode || "-"}
                              </span>
                              <div className="flex items-center justify-center text-primary/20 group-hover:text-blue-500 transition-all shrink-0">
                                <Info size={12} className="transition-colors duration-200" />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap text-[12px] font-bold tabular-nums text-primary">
                            {item.displayGross}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap text-[12px] font-bold tabular-nums text-rose-600">
                            {item.displayVat}
                          </td>
                          <td className="pr-8 py-3 text-right whitespace-nowrap">
                            <span className={cn("text-[12px] font-bold tabular-nums", getAmountColor(item.amount))}>
                              {item.displayAmount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {totals && (
                      <tfoot className="sticky bottom-0 z-50">
                        <tr className="bg-[#fdf8ec] border-t-2 border-[#cc9929] transition-none font-bold">
                          <td colSpan={1} className="pl-8 py-4 text-left font-bold">
                            <span className="text-[12px] uppercase tracking-[0.2em] text-[#cc9929] font-bold">{totals.label}</span>
                          </td>
                          <td className="px-4 py-4 text-right whitespace-nowrap font-bold tabular-nums text-[12px] text-primary">
                            {formatCurrency(totals.gross)}
                          </td>
                          <td className="px-4 py-4 text-right whitespace-nowrap font-bold tabular-nums text-[12px] text-rose-600">
                            {formatCurrency(totals.vat)}
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
                              type="date"
                              dateKey="date"
                            />
                          </div>
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white">
                          <div className="flex items-center gap-1">
                            Sub-ledger
                            <ExcelColumnFilter 
                              columnKey="subItem" label="Sub-ledger" data={getPlCascadingData("subItem")} 
                              activeFilters={plFilters["subItem"]} 
                              onFilterChange={(v) => setPlFilters(p => ({...p, subItem: v}))}
                              onSort={(d) => setPlSort({key: "subItem", direction: d})}
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
                          <td className="px-4 py-3 whitespace-nowrap">
                             <Badge variant="outline" className="bg-primary/5 text-primary/70 border-primary/10 font-bold uppercase text-[10px] py-0.5 px-2">
                               {item.subItem || "-"}
                             </Badge>
                          </td>
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
                          <td colSpan={4} className="pl-8 py-4 text-left font-bold">
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

          {/* Footer Info Bar inside Modal */}
          {(isCogs || isSales) && (
            <div className="flex items-start gap-2 px-8 py-3.5 bg-white border-t border-primary/5 shrink-0">
              <Info size={14} className="text-primary/20 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">
                Click on an account row marked with the info icon to view the detailed breakdown.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sales Code Details Modal (2nd Layer) */}
      <Dialog open={!!selectedSalesCode} onOpenChange={(open) => {
        if (!open) {
          setSelectedSalesCode(null);
        }
      }}>
        <DialogContent className="max-w-6xl w-[90vw] max-h-[85vh] bg-slate-50 border border-slate-200 shadow-2xl rounded-3xl overflow-hidden p-0 gap-0 flex flex-col z-[100]">
          <div className="py-5 px-8 border-b border-primary/5 bg-white sticky top-0 z-20 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#fdf8ec] flex items-center justify-center text-[#cc9929] border border-[#cc9929]/20 shadow-premium shrink-0">
                  <History size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <DialogTitle className="text-xl font-bold text-primary uppercase tracking-tight leading-none">
                      Sales Code: {selectedSalesCode} Breakdown
                    </DialogTitle>
                  </div>
                  <DialogDescription className="text-[10px] font-bold text-primary/30 uppercase tracking-[0.2em]">
                    Transaction List for {selectedSalesCode}
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {(salesCodeSearch !== "" || Object.values(salesCodeFilters).some(s => s && s.size > 0)) && (
                   <button 
                     onClick={clearSalesCodeFilters}
                     className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider hover:bg-red-100 transition-colors"
                   >
                     Clear Filters
                   </button>
                )}
                <button 
                  onClick={() => setSelectedSalesCode(null)}
                  className="w-10 h-10 rounded-xl bg-transparent hover:bg-red-50 flex items-center justify-center text-primary/40 hover:text-red-600 transition-all cursor-pointer group"
                >
                  <Plus className="w-5 h-5 rotate-45 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-0 flex-1 overflow-auto custom-scrollbar relative">
            {isLoadingSalesCodeDetails ? (
              <div className="h-64 flex flex-col items-center justify-center gap-4 opacity-40">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Retrieving Records...</p>
              </div>
            ) : filteredSalesCodeDetails.length === 0 ? (
              <div className="h-64 flex items-center justify-center opacity-20 font-bold uppercase tracking-[0.2em]">
                No Records Found
              </div>
            ) : (
              <table className="w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-30 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                  <tr className="border-b border-primary/5 whitespace-nowrap h-12">
                    <th className="pl-8 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-64">
                      <div className="flex items-center gap-1">
                        Invoice
                        <ExcelColumnFilter 
                          columnKey="invoiceNo" label="Invoice" data={getSalesCodeCascadingData("invoiceNo")} 
                          activeFilters={salesCodeFilters["invoiceNo"]} 
                          onFilterChange={(v) => setSalesCodeFilters(p => ({...p, invoiceNo: v}))}
                          onSort={(d) => setSalesCodeSort({key: "invoiceNo", direction: d})}
                          currentSort={salesCodeSort}
                        />
                      </div>
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-full">
                      <div className="flex items-center gap-1">
                        Customer
                        <ExcelColumnFilter 
                          columnKey="clientName" label="Customer" data={getSalesCodeCascadingData("clientName")} 
                          activeFilters={salesCodeFilters["clientName"]} 
                          onFilterChange={(v) => setSalesCodeFilters(p => ({...p, clientName: v}))}
                          onSort={(d) => setSalesCodeSort({key: "clientName", direction: d})}
                          currentSort={salesCodeSort}
                        />
                      </div>
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-48">Gross</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-48">VAT</th>
                    <th className="pr-8 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white w-56">
                      Net
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {filteredSalesCodeDetails?.map((item: any) => (
                    <tr key={item.id} className="bg-white hover:bg-primary/[0.01] transition-colors group">
                      <td className="pl-8 py-3 whitespace-nowrap align-top">
                        <span className="text-[12px] font-bold text-primary uppercase">
                          {item.invoiceNo || "-"}
                        </span>
                      </td>
                       <td className="px-4 py-3 whitespace-normal w-full align-top">
                        <span className="text-[12px] font-bold text-primary uppercase">
                          {item.clientName || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap align-top">
                        <span className="text-[12px] font-bold tabular-nums text-primary">
                          {item.displayGross}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap align-top">
                        <span className="text-[12px] font-bold tabular-nums text-rose-600">
                          {item.displayVat}
                        </span>
                      </td>
                      <td className="pr-8 py-3 text-right whitespace-nowrap align-top">
                        <span className={cn("text-[12px] font-bold tabular-nums", getAmountColor(item.amount))}>
                          {item.displayAmount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {salesCodeTotals && (
                  <tfoot className="sticky bottom-0 z-50">
                    <tr className="bg-[#fdf8ec] border-t-2 border-[#cc9929] transition-none font-bold">
                      <td colSpan={2} className="pl-8 py-4 text-left font-bold">
                        <span className="text-[12px] uppercase tracking-[0.2em] text-[#cc9929] font-bold">{salesCodeTotals.label}</span>
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap font-bold tabular-nums text-[12px] text-primary">
                        {formatCurrency(salesCodeTotals.gross)}
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap font-bold tabular-nums text-[12px] text-rose-600">
                        {formatCurrency(salesCodeTotals.vat)}
                      </td>
                      <td className={cn("pr-8 py-4 text-right whitespace-nowrap font-bold", getAmountColor(salesCodeTotals.amount))}>
                        <span className="text-[14px] tabular-nums font-bold">
                          {formatCurrency(salesCodeTotals.amount)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* COGS Group Details Modal (2nd Layer) */}
      <Dialog open={!!selectedCogsGroup} onOpenChange={(open) => {
        if (!open) {
          setSelectedCogsGroup(null);
        }
      }}>
        <DialogContent className="max-w-6xl w-[90vw] max-h-[85vh] bg-slate-50 border border-slate-200 shadow-2xl rounded-3xl overflow-hidden p-0 gap-0 flex flex-col z-[100]">
          <div className="py-5 px-8 border-b border-primary/5 bg-white sticky top-0 z-20 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#fdf8ec] flex items-center justify-center text-[#cc9929] border border-[#cc9929]/20 shadow-premium shrink-0">
                  <History size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <DialogTitle className="text-xl font-bold text-primary uppercase tracking-tight leading-none">
                      COGS Group: {selectedCogsGroup} Breakdown
                    </DialogTitle>
                  </div>
                  <DialogDescription className="text-[10px] font-bold text-primary/30 uppercase tracking-[0.2em]">
                    Transaction List for {selectedCogsGroup}
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {(cogsGroupSearch !== "" || Object.values(cogsGroupFilters).some(s => s && s.size > 0)) && (
                   <button 
                     onClick={clearCogsGroupFilters}
                     className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider hover:bg-red-100 transition-colors"
                   >
                     Clear Filters
                   </button>
                )}
                <button 
                  onClick={() => setSelectedCogsGroup(null)}
                  className="w-10 h-10 rounded-xl bg-transparent hover:bg-red-50 flex items-center justify-center text-primary/40 hover:text-red-600 transition-all cursor-pointer group"
                >
                  <Plus className="w-5 h-5 rotate-45 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-0 flex-1 overflow-auto custom-scrollbar relative">
            {isLoadingCogsGroupDetails ? (
              <div className="h-64 flex flex-col items-center justify-center gap-4 opacity-40">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Retrieving Records...</p>
              </div>
            ) : filteredCogsGroupDetails.length === 0 ? (
              <div className="h-64 flex items-center justify-center opacity-20 font-bold uppercase tracking-[0.2em]">
                No Records Found
              </div>
            ) : (
              <table className="w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-30 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                  <tr className="border-b border-primary/5 whitespace-nowrap h-12">
                    <th className="pl-8 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white">
                      <div className="flex items-center gap-1">
                        Channel
                        <ExcelColumnFilter 
                          columnKey="bankBrand" label="Channel" data={getCogsGroupCascadingData("bankBrand")} 
                          activeFilters={cogsGroupFilters["bankBrand"]} 
                          onFilterChange={(v) => setCogsGroupFilters(p => ({...p, bankBrand: v}))}
                          onSort={(d) => setCogsGroupSort({key: "bankBrand", direction: d})}
                          currentSort={cogsGroupSort}
                        />
                      </div>
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white">
                      <div className="flex items-center gap-1">
                        Date
                        <ExcelColumnFilter 
                          columnKey="displayDate" label="Date" data={getCogsGroupCascadingData("displayDate")} 
                          activeFilters={cogsGroupFilters["displayDate"]} 
                          onFilterChange={(v) => setCogsGroupFilters(p => ({...p, displayDate: v}))}
                          onSort={(d) => setCogsGroupSort({key: "displayDate", direction: d})}
                          currentSort={cogsGroupSort}
                          type="date"
                          dateKey="date"
                        />
                      </div>
                    </th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white min-w-[200px]">
                      <div className="flex items-center gap-1">
                        Description
                        <ExcelColumnFilter 
                          columnKey="description" label="Description" data={getCogsGroupCascadingData("description")} 
                          activeFilters={cogsGroupFilters["description"]} 
                          onFilterChange={(v) => setCogsGroupFilters(p => ({...p, description: v}))}
                          onSort={(d) => setCogsGroupSort({key: "description", direction: d})}
                          currentSort={cogsGroupSort}
                        />
                      </div>
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white">
                      <div className="flex items-center justify-end gap-1">
                        Debit
                        <ExcelColumnFilter 
                          columnKey="displayDebit" label="Debit" data={getCogsGroupCascadingData("displayDebit")} 
                          activeFilters={cogsGroupFilters["displayDebit"]} 
                          onFilterChange={(v) => setCogsGroupFilters(p => ({...p, displayDebit: v}))}
                          onSort={(d) => setCogsGroupSort({key: "displayDebit", direction: d})}
                          currentSort={cogsGroupSort}
                        />
                      </div>
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white">
                      <div className="flex items-center justify-end gap-1">
                        Credit
                        <ExcelColumnFilter 
                          columnKey="displayCredit" label="Credit" data={getCogsGroupCascadingData("displayCredit")} 
                          activeFilters={cogsGroupFilters["displayCredit"]} 
                          onFilterChange={(v) => setCogsGroupFilters(p => ({...p, displayCredit: v}))}
                          onSort={(d) => setCogsGroupSort({key: "displayCredit", direction: d})}
                          currentSort={cogsGroupSort}
                        />
                      </div>
                    </th>
                    <th className="pr-8 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white">
                      <div className="flex items-center justify-end gap-1">
                        Amount
                        <ExcelColumnFilter 
                          columnKey="displayAmount" label="Amount" data={getCogsGroupCascadingData("displayAmount")} 
                          activeFilters={cogsGroupFilters["displayAmount"]} 
                          onFilterChange={(v) => setCogsGroupFilters(p => ({...p, displayAmount: v}))}
                          onSort={(d) => setCogsGroupSort({key: "displayAmount", direction: d})}
                          currentSort={cogsGroupSort}
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {filteredCogsGroupDetails?.map((item: any) => (
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
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={cn("text-[12px] font-bold tabular-nums", getAmountColor(item.debit ? `-${item.debit}` : "0") || "opacity-20")}>
                          {item.displayDebit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={cn("text-[12px] font-bold tabular-nums", getAmountColor(item.credit) || "opacity-20")}>
                          {item.displayCredit}
                        </span>
                      </td>
                      <td className="pr-8 py-3 text-right whitespace-nowrap">
                        <span className={cn("text-[12px] font-bold tabular-nums", getAmountColor(item.amount))}>
                          {item.displayAmount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {cogsGroupTotals && (
                  <tfoot className="sticky bottom-0 z-50">
                    <tr className="bg-[#fdf8ec] border-t-2 border-[#cc9929] transition-none font-bold">
                      <td colSpan={3} className="pl-8 py-4 text-left font-bold">
                        <span className="text-[12px] uppercase tracking-[0.2em] text-[#cc9929] font-bold">{cogsGroupTotals.label}</span>
                      </td>
                      <td className={cn("px-4 py-4 text-right whitespace-nowrap font-bold tabular-nums text-[12px]", getAmountColor(cogsGroupTotals.debit ? `-${cogsGroupTotals.debit}` : "0") || "text-primary/70")}>
                        {formatCurrency(cogsGroupTotals.debit)}
                      </td>
                      <td className={cn("px-4 py-4 text-right whitespace-nowrap font-bold tabular-nums text-[12px]", getAmountColor(cogsGroupTotals.credit) || "text-primary/70")}>
                        {formatCurrency(cogsGroupTotals.credit)}
                      </td>
                      <td className={cn("pr-8 py-4 text-right whitespace-nowrap font-bold", getAmountColor(cogsGroupTotals.amount))}>
                        <span className="text-[14px] tabular-nums font-bold">
                          {formatCurrency(cogsGroupTotals.amount)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
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
                const isSales = row.account === "Sales";
                const isCogs = row.account === "Cost of Goods";
                const isClickable = isExpense || isSales || isCogs || row.level === 3;
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
                      ${isClickable ? "cursor-pointer group/row" : ""}
                      transition-all duration-200 border-b
                    `}
                    onClick={() => {
                      if (isExpense || isSales || isCogs) {
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
                        
                        {isClickable && (
                          <div className="flex items-center justify-center text-primary/20 group-hover/row:text-blue-500 transition-all shrink-0">
                            <Info size={12} className="transition-colors duration-200" />
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
