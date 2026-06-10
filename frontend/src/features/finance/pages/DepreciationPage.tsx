import { useState, useMemo } from "react";
import { ArrowUpRight, Search, FilterX, Plus, Pin } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDepreciation } from "../hooks/useDepreciation";
import { PaginationControls } from "@/components/common/PaginationControls";
import { formatCurrency, formatDate, cleanAmount, getAmountColor, cn } from "@/lib/utils";
import { ExcelColumnFilter } from "@/features/finance/components/ExcelColumnFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExcelFilter } from "../hooks/useExcelFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/common/PageContainer";
import { useAuthStore } from "@/store/authStore";
import { Decimal } from "decimal.js";
import { Badge } from "@/components/ui/badge";
import AddDepreciationModal from "../components/AddDepreciationModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DepreciationPage() {
  const { can } = useAuthStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const assetLimit = 10;
  const [depYearFilter, setDepYearFilter] = useState(new Date().getFullYear().toString());
  const yearNum = useMemo(() => Number(depYearFilter), [depYearFilter]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2025; y--) {
      years.push(y.toString());
    }
    return years;
  }, []);

  const [pinnedColumns, setPinnedColumns] = useState<string[]>([]);

  const PINNABLE_COLUMNS = useMemo(() => [
    'category',
    'purchaseDate',
    'bankRef',
    'assetName',
    'purchasePrice',
    'usefulLife',
    'accumulated2020'
  ], []);

  const COLUMN_WIDTHS = useMemo<Record<string, number>>(() => ({
    category: 240,
    purchaseDate: 160,
    bankRef: 160,
    assetName: 320,
    purchasePrice: 200,
    usefulLife: 120,
    accumulated2020: 200,
  }), []);

  const getStickyStyle = (colKey: string, isHeader = false) => {
    const isPinned = pinnedColumns.includes(colKey);
    const width = COLUMN_WIDTHS[colKey];
    
    const baseStyle = {
      width: `${width}px`,
      minWidth: `${width}px`,
    };

    if (!isPinned) return baseStyle;

    const currentIndex = PINNABLE_COLUMNS.indexOf(colKey);
    let leftOffset = 0;
    for (let i = 0; i < currentIndex; i++) {
      const prevCol = PINNABLE_COLUMNS[i];
      if (pinnedColumns.includes(prevCol)) {
        leftOffset += COLUMN_WIDTHS[prevCol];
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

  const getStickyClass = (colKey: string, type: 'header' | 'body' | 'subtotal' | 'grandtotal') => {
    const isPinned = pinnedColumns.includes(colKey);
    if (!isPinned) return '';
    
    switch (type) {
      case 'header':
        return '!bg-white text-primary shadow-[inset_-2px_0_0_0_rgba(15, 23, 42, 0.08)]';
      case 'body':
        return '!bg-white group-hover:!bg-slate-50/90 shadow-[inset_-2px_0_0_0_rgba(15, 23, 42, 0.05)] transition-colors';
      case 'subtotal':
        return '!bg-[#faf7f0] shadow-[inset_-2px_0_0_0_rgba(15, 23, 42, 0.05)]';
      case 'grandtotal':
        return '!bg-[#f5eedf] shadow-[inset_-2px_0_0_0_rgba(15, 23, 42, 0.05)]';
      default:
        return '';
    }
  };

  const togglePin = (colKey: string) => {
    setPinnedColumns(prev => 
      prev.includes(colKey) 
        ? prev.filter(k => k !== colKey) 
        : [...prev, colKey]
    );
  };

  const renderPinButton = (colKey: string) => {
    const isPinned = pinnedColumns.includes(colKey);
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          togglePin(colKey);
        }}
        className={cn(
          "p-1 rounded-md transition-all hover:bg-slate-200/50 cursor-pointer shrink-0",
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

  const { getAllAssets } = useDepreciation();
  const assetsQuery = getAllAssets(
    depYearFilter !== "all" ? yearNum : undefined,
    { enabled: !!depYearFilter }
  );
  const { data: allAssetsRaw, isLoading: assetsLoading } = assetsQuery;
  
  const displayAssets = useMemo(() => {
    return (allAssetsRaw || []).map((row: any) => ({
      ...row,
      category: row.type || "-",
      rawColA: row.colA,
      purchaseDate: formatDate(row.colA),
      bankRef: row.colB || "-",
      assetName: row.colC || "-",
      purchasePrice: formatCurrency(row.colD),
      usefulLife: row.colE || 0,
      accumulated2020: formatCurrency(row.colF),
      jan: formatCurrency(row.colG),
      feb: formatCurrency(row.colH),
      mar: formatCurrency(row.colI),
      apr: formatCurrency(row.colJ),
      may: formatCurrency(row.colK),
      jun: formatCurrency(row.colL),
      jul: formatCurrency(row.colM),
      aug: formatCurrency(row.colN),
      sep: formatCurrency(row.colO),
      oct: formatCurrency(row.colP),
      nov: formatCurrency(row.colQ),
      dec: formatCurrency(row.colR),
      total2021: formatCurrency(row.colS),
      accumulated2021: formatCurrency(row.colT),
      bookValue: formatCurrency(row.colU),
    }));
  }, [allAssetsRaw]);

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
    clearFilters,
    isAnyFilterActive
  } = useExcelFilter({
    data: displayAssets,
    searchFields: ['category', 'purchaseDate', 'bankRef', 'assetName']
  });

  const paginatedAssets = useMemo(() => {
    const start = (page - 1) * assetLimit;
    return filteredAndSortedData.slice(start, start + assetLimit);
  }, [filteredAndSortedData, page, assetLimit]);

  const assetMeta = {
    total: filteredAndSortedData.length,
    page: page,
    limit: assetLimit,
    lastPage: Math.ceil(filteredAndSortedData.length / assetLimit) || 1
  };


  const assetGrandTotals = useMemo(() => {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    return filteredAndSortedData.reduce((acc: any, curr: any) => {
      const nextAcc: any = {
        purchasePrice: acc.purchasePrice.plus(new Decimal(cleanAmount(curr.purchasePrice))),
        accumulated2020: acc.accumulated2020.plus(new Decimal(cleanAmount(curr.accumulated2020))),
        total2021: acc.total2021.plus(new Decimal(cleanAmount(curr.total2021))),
        accumulated2021: acc.accumulated2021.plus(new Decimal(cleanAmount(curr.accumulated2021))),
        bookValue: acc.bookValue.plus(new Decimal(cleanAmount(curr.bookValue))),
      };
      months.forEach(m => {
        nextAcc[m] = (acc[m] || new Decimal(0)).plus(new Decimal(cleanAmount(curr[m])));
      });
      return nextAcc;
    }, { 
      purchasePrice: new Decimal(0), accumulated2020: new Decimal(0), 
      total2021: new Decimal(0), accumulated2021: new Decimal(0), bookValue: new Decimal(0) 
    });
  }, [filteredAndSortedData]);

  const assetPageSubtotals = useMemo(() => {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    return paginatedAssets.reduce((acc: any, curr: any) => {
      const nextAcc: any = {
        purchasePrice: acc.purchasePrice.plus(new Decimal(cleanAmount(curr.purchasePrice))),
        accumulated2020: acc.accumulated2020.plus(new Decimal(cleanAmount(curr.accumulated2020))),
        total2021: acc.total2021.plus(new Decimal(cleanAmount(curr.total2021))),
        accumulated2021: acc.accumulated2021.plus(new Decimal(cleanAmount(curr.accumulated2021))),
        bookValue: acc.bookValue.plus(new Decimal(cleanAmount(curr.bookValue))),
      };
      months.forEach(m => {
        nextAcc[m] = (acc[m] || new Decimal(0)).plus(new Decimal(cleanAmount(curr[m])));
      });
      return nextAcc;
    }, { 
      purchasePrice: new Decimal(0), accumulated2020: new Decimal(0), 
      total2021: new Decimal(0), accumulated2021: new Decimal(0), bookValue: new Decimal(0) 
    });
  }, [paginatedAssets]);

  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

  return (
    <PageContainer>
      <PageHeader 
        title="Depreciation"
        description="Asset lifecycle & value amortization tracking."
        icon={ArrowUpRight}
      />

      {/* Filter Bar */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm mt-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search asset records..." 
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 text-[13px] font-medium"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={depYearFilter} onValueChange={(v) => { setDepYearFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[130px] h-12 px-5 bg-white border-0 rounded-xl shadow-sm flex items-center gap-2 text-muted-foreground font-bold transition-all cursor-pointer">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-primary/10 shadow-premium bg-white p-0 overflow-hidden">
            <SelectItem value="all" className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-muted-foreground transition-colors">
              All Years
            </SelectItem>
            {availableYears.map(year => (
              <SelectItem key={year} value={year} className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-muted-foreground transition-colors">
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          {isAnyFilterActive && (
            <Button 
              onClick={clearFilters}
              className="h-12 w-12 bg-white border-0 text-muted-foreground hover:text-red-500 hover:bg-red-50/50 rounded-xl shadow-sm flex items-center justify-center shrink-0 transition-all"
              title="Clear all filters"
            >
              <FilterX size={20} strokeWidth={2} />
            </Button>
          )}
          
          {can('depreciation.create') && (
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="h-12 px-6 flex-1 xl:flex-none bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-sm flex items-center justify-center gap-2 font-bold disabled:opacity-50 disabled:grayscale transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={20} strokeWidth={3} />
              <span className="text-[13px]">Add Depreciation</span>
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-premium border border-primary/5 overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <Table className="min-w-[3000px] table-fixed">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap">
                <TableHead className={cn("pl-8 w-40 px-4 group select-none", getStickyClass("category", "header"))} style={getStickyStyle("category", true)}>
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span>Category</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <ExcelColumnFilter columnKey="category" label="Category" data={getCascadingData("category")} activeFilters={filters["category"]} onFilterChange={(v: Set<string> | null) => { setFilters(p => ({...p, category: v})); setPage(1); }} currentSort={sort} onSort={(d: 'asc' | 'desc') => { setSort({key: "category", direction: d}); setPage(1); }} />
                      {renderPinButton("category")}
                    </div>
                  </div>
                </TableHead>
                <TableHead className={cn("w-40 px-4 group select-none", getStickyClass("purchaseDate", "header"))} style={getStickyStyle("purchaseDate", true)}>
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span>Date</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <ExcelColumnFilter columnKey="purchaseDate" label="Purchase Date" data={getCascadingData("purchaseDate")} activeFilters={filters["purchaseDate"]} onFilterChange={(v: Set<string> | null) => { setFilters(p => ({...p, purchaseDate: v})); setPage(1); }} currentSort={sort} onSort={(d: 'asc' | 'desc') => { setSort({key: "purchaseDate", direction: d}); setPage(1); }} type="date" dateKey="rawColA" />
                      {renderPinButton("purchaseDate")}
                    </div>
                  </div>
                </TableHead>
                <TableHead className={cn("w-40 px-4 group select-none", getStickyClass("bankRef", "header"))} style={getStickyStyle("bankRef", true)}>
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span>Source</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <ExcelColumnFilter columnKey="bankRef" label="Source" data={getCascadingData("bankRef")} activeFilters={filters["bankRef"]} onFilterChange={(v: Set<string> | null) => { setFilters(p => ({...p, bankRef: v})); setPage(1); }} currentSort={sort} onSort={(d: 'asc' | 'desc') => { setSort({key: "bankRef", direction: d}); setPage(1); }} />
                      {renderPinButton("bankRef")}
                    </div>
                  </div>
                </TableHead>
                <TableHead className={cn("w-80 px-4 group select-none", getStickyClass("assetName", "header"))} style={getStickyStyle("assetName", true)}>
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span>Description</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <ExcelColumnFilter columnKey="assetName" label="Description" data={getCascadingData("assetName")} activeFilters={filters["assetName"]} onFilterChange={(v: Set<string> | null) => { setFilters(p => ({...p, assetName: v})); setPage(1); }} currentSort={sort} onSort={(d: 'asc' | 'desc') => { setSort({key: "assetName", direction: d}); setPage(1); }} />
                      {renderPinButton("assetName")}
                    </div>
                  </div>
                </TableHead>
                <TableHead className={cn("w-44 px-4 text-right group select-none", getStickyClass("purchasePrice", "header"))} style={getStickyStyle("purchasePrice", true)}>
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="text-right w-full">Purchase Price</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <ExcelColumnFilter columnKey="purchasePrice" label="Purchase Price" data={getCascadingData("purchasePrice")} activeFilters={filters["purchasePrice"]} onFilterChange={(v: Set<string> | null) => { setFilters(p => ({...p, purchasePrice: v})); setPage(1); }} currentSort={sort} onSort={(d: 'asc' | 'desc') => { setSort({key: "purchasePrice", direction: d}); setPage(1); }} />
                      {renderPinButton("purchasePrice")}
                    </div>
                  </div>
                </TableHead>
                <TableHead className={cn("w-24 px-4 text-center group select-none", getStickyClass("usefulLife", "header"))} style={getStickyStyle("usefulLife", true)}>
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="text-center w-full">Month</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <ExcelColumnFilter columnKey="usefulLife" label="Month" data={getCascadingData("usefulLife")} activeFilters={filters["usefulLife"]} onFilterChange={(v: Set<string> | null) => { setFilters(p => ({...p, usefulLife: v})); setPage(1); }} currentSort={sort} onSort={(d: 'asc' | 'desc') => { setSort({key: "usefulLife", direction: d}); setPage(1); }} />
                      {renderPinButton("usefulLife")}
                    </div>
                  </div>
                </TableHead>
                <TableHead className={cn("w-44 px-4 text-right group select-none", getStickyClass("accumulated2020", "header"))} style={getStickyStyle("accumulated2020", true)}>
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="text-right w-full">S/D 2024</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <ExcelColumnFilter columnKey="accumulated2020" label="S/D 2024" data={getCascadingData("accumulated2020")} activeFilters={filters["accumulated2020"]} onFilterChange={(v: Set<string> | null) => { setFilters(p => ({...p, accumulated2020: v})); setPage(1); }} currentSort={sort} onSort={(d: 'asc' | 'desc') => { setSort({key: "accumulated2020", direction: d}); setPage(1); }} />
                      {renderPinButton("accumulated2020")}
                    </div>
                  </div>
                </TableHead>
                
                {months.map(m => (
                  <TableHead key={m} className="w-32 px-4 text-right uppercase">
                    <div className="flex items-center justify-end gap-1">{m} <ExcelColumnFilter columnKey={m} label={m.toUpperCase()} data={getCascadingData(m)} activeFilters={filters[m]} onFilterChange={(v: Set<string> | null) => { setFilters(p => ({...p, [m]: v})); setPage(1); }} currentSort={sort} onSort={(d: 'asc' | 'desc') => { setSort({key: m, direction: d}); setPage(1); }} /></div>
                  </TableHead>
                ))}

                <TableHead className="w-44 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">Total 2025 <ExcelColumnFilter columnKey="total2021" label="Total 2025" data={getCascadingData("total2021")} activeFilters={filters["total2021"]} onFilterChange={(v: Set<string> | null) => { setFilters(p => ({...p, total2021: v})); setPage(1); }} currentSort={sort} onSort={(d: 'asc' | 'desc') => { setSort({key: "total2021", direction: d}); setPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-44 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">S/D 2025 <ExcelColumnFilter columnKey="accumulated2021" label="S/D 2025" data={getCascadingData("accumulated2021")} activeFilters={filters["accumulated2021"]} onFilterChange={(v: Set<string> | null) => { setFilters(p => ({...p, accumulated2021: v})); setPage(1); }} currentSort={sort} onSort={(d: 'asc' | 'desc') => { setSort({key: "accumulated2021", direction: d}); setPage(1); }} /></div>
                </TableHead>
                <TableHead className="pr-8 w-44 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">Book Value <ExcelColumnFilter columnKey="bookValue" label="Book Value" data={getCascadingData("bookValue")} activeFilters={filters["bookValue"]} onFilterChange={(v: Set<string> | null) => { setFilters(p => ({...p, bookValue: v})); setPage(1); }} currentSort={sort} onSort={(d: 'asc' | 'desc') => { setSort({key: "bookValue", direction: d}); setPage(1); }} /></div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assetsLoading ? (
                <TableRow>
                  <TableCell colSpan={22} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Standardizing Depreciation Data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={22} className="h-64 text-center opacity-20">
                    <Search size={48} className="mx-auto" />
                    <p className="mt-4 font-black uppercase tracking-widest">No depreciation records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedAssets.map((row: any) => (
                    <TableRow key={row.id} className="border-primary/5 hover:bg-primary/[0.01] transition-colors whitespace-nowrap group">
                      <TableCell className={cn("pl-8 px-4 w-40", getStickyClass("category", "body"))} style={getStickyStyle("category")}>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-bold uppercase text-[10px] py-0.5 px-2">
                          {row.category}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn("px-4 w-40", getStickyClass("purchaseDate", "body"))} style={getStickyStyle("purchaseDate")}>{row.purchaseDate}</TableCell>
                      <TableCell className={cn("px-4 w-40 font-medium", getStickyClass("bankRef", "body"))} style={getStickyStyle("bankRef")}>{row.bankRef}</TableCell>
                      <TableCell className={cn("px-4 w-80 font-bold text-primary whitespace-normal break-words", getStickyClass("assetName", "body"))} style={getStickyStyle("assetName")}>{row.assetName}</TableCell>
                      <TableCell className={cn("px-4 w-44 text-right", getStickyClass("purchasePrice", "body"))} style={getStickyStyle("purchasePrice")}>{row.purchasePrice}</TableCell>
                      <TableCell className={cn("px-4 w-24 text-center font-medium", getStickyClass("usefulLife", "body"))} style={getStickyStyle("usefulLife")}><span className="opacity-60">{row.usefulLife}</span></TableCell>
                      <TableCell className={cn("px-4 w-44 text-right", getStickyClass("accumulated2020", "body"))} style={getStickyStyle("accumulated2020")}>{row.accumulated2020}</TableCell>
                      
                      {months.map(m => (
                        <TableCell key={m} className="px-4 w-32 text-right">{row[m]}</TableCell>
                      ))}

                      <TableCell className="px-4 w-44 text-right font-bold">{row.total2021}</TableCell>
                      <TableCell className="px-4 w-44 text-right font-bold">{row.accumulated2021}</TableCell>
                      <TableCell className="pr-8 px-4 w-44 text-right font-black text-primary">{row.bookValue}</TableCell>
                    </TableRow>
                  ))}

                  {/* Summary Rows */}
                  {/* Subtotal (Current Page) */}
                  <TableRow className="bg-secondary/5 border-t-2 border-secondary/30 hover:bg-secondary/5 transition-none font-bold">
                    <TableCell className={cn("pl-8 py-3 text-[12px] font-bold text-secondary/80 uppercase tracking-normal w-40", getStickyClass("category", "subtotal"))} style={getStickyStyle("category")}>
                      Subtotal (Page {page})
                    </TableCell>
                    <TableCell className={cn("py-3 w-40", getStickyClass("purchaseDate", "subtotal"))} style={getStickyStyle("purchaseDate")} />
                    <TableCell className={cn("py-3 w-40", getStickyClass("bankRef", "subtotal"))} style={getStickyStyle("bankRef")} />
                    <TableCell className={cn("py-3 w-80", getStickyClass("assetName", "subtotal"))} style={getStickyStyle("assetName")} />
                    <TableCell className={cn(`py-3 text-right pr-4 whitespace-nowrap w-44 ${getAmountColor(assetPageSubtotals.purchasePrice.toString())}`, getStickyClass("purchasePrice", "subtotal"))} style={getStickyStyle("purchasePrice")}>{formatCurrency(assetPageSubtotals.purchasePrice.toString())}</TableCell>
                    <TableCell className={cn("py-3 w-24", getStickyClass("usefulLife", "subtotal"))} style={getStickyStyle("usefulLife")} />
                    <TableCell className={cn(`py-3 text-right pr-4 whitespace-nowrap w-44 ${getAmountColor(assetPageSubtotals.accumulated2020.toString())}`, getStickyClass("accumulated2020", "subtotal"))} style={getStickyStyle("accumulated2020")}>{formatCurrency(assetPageSubtotals.accumulated2020.toString())}</TableCell>
                    
                    {months.map(m => (
                      <TableCell key={m} className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(assetPageSubtotals[m].toString())}`}>{formatCurrency(assetPageSubtotals[m].toString())}</TableCell>
                    ))}

                    <TableCell className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(assetPageSubtotals.total2021.toString())}`}>{formatCurrency(assetPageSubtotals.total2021.toString())}</TableCell>
                    <TableCell className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(assetPageSubtotals.accumulated2021.toString())}`}>{formatCurrency(assetPageSubtotals.accumulated2021.toString())}</TableCell>
                    <TableCell className={`pr-8 py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(assetPageSubtotals.bookValue.toString())}`}>{formatCurrency(assetPageSubtotals.bookValue.toString())}</TableCell>
                  </TableRow>

                  {/* Grand Total (All Pages) */}
                  <TableRow className="bg-secondary/10 border-t border-secondary/30 hover:bg-secondary/10 transition-none font-bold">
                    <TableCell className={cn("pl-8 py-3 text-[12px] font-bold text-secondary uppercase tracking-normal w-40", getStickyClass("category", "grandtotal"))} style={getStickyStyle("category")}>
                      Grand Total ({assetMeta.total} records)
                    </TableCell>
                    <TableCell className={cn("py-3 w-40", getStickyClass("purchaseDate", "grandtotal"))} style={getStickyStyle("purchaseDate")} />
                    <TableCell className={cn("py-3 w-40", getStickyClass("bankRef", "grandtotal"))} style={getStickyStyle("bankRef")} />
                    <TableCell className={cn("py-3 w-80", getStickyClass("assetName", "grandtotal"))} style={getStickyStyle("assetName")} />
                    <TableCell className={cn(`py-3 text-right pr-4 whitespace-nowrap w-44 ${getAmountColor(assetGrandTotals.purchasePrice.toString())}`, getStickyClass("purchasePrice", "grandtotal"))} style={getStickyStyle("purchasePrice")}>{formatCurrency(assetGrandTotals.purchasePrice.toString())}</TableCell>
                    <TableCell className={cn("py-3 w-24", getStickyClass("usefulLife", "grandtotal"))} style={getStickyStyle("usefulLife")} />
                    <TableCell className={cn(`py-3 text-right pr-4 whitespace-nowrap w-44 ${getAmountColor(assetGrandTotals.accumulated2020.toString())}`, getStickyClass("accumulated2020", "grandtotal"))} style={getStickyStyle("accumulated2020")}>{formatCurrency(assetGrandTotals.accumulated2020.toString())}</TableCell>
                    
                    {months.map(m => (
                      <TableCell key={m} className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(assetGrandTotals[m].toString())}`}>{formatCurrency(assetGrandTotals[m].toString())}</TableCell>
                    ))}

                    <TableCell className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(assetGrandTotals.total2021.toString())}`}>{formatCurrency(assetGrandTotals.total2021.toString())}</TableCell>
                    <TableCell className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(assetGrandTotals.accumulated2021.toString())}`}>{formatCurrency(assetGrandTotals.accumulated2021.toString())}</TableCell>
                    <TableCell className={`pr-8 py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(assetGrandTotals.bookValue.toString())}`}>{formatCurrency(assetGrandTotals.bookValue.toString())}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <PaginationControls meta={assetMeta} onPageChange={setPage} isFetching={assetsLoading} />
      <AddDepreciationModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen} 
        onSuccess={() => assetsQuery.refetch()} 
      />
    </PageContainer>
  );
}
