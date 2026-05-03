import { useState, useMemo } from "react";
import { ArrowUpRight, Search, FilterX, Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDepreciation } from "../hooks/useDepreciation";
import { PaginationControls } from "@/components/common/PaginationControls";
import { formatCurrency, formatDate, cleanAmount, getAmountColor } from "@/lib/utils";
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

export default function DepreciationPage() {
  const { can } = useAuthStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const assetLimit = 10;

  const { getAllAssets } = useDepreciation();
  const assetsQuery = getAllAssets();
  const { data: allAssetsRaw, isLoading: assetsLoading } = assetsQuery;
  
  const displayAssets = useMemo(() => {
    return (allAssetsRaw || []).map((row: any) => ({
      ...row,
      category: row.type || "-",
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
          <Table className="min-w-[3000px]">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap">
                <TableHead className="pl-8 w-40 px-4">
                  <div className="flex items-center gap-1">Category <ExcelColumnFilter columnKey="category" label="Category" data={getCascadingData("category")} activeFilters={filters["category"]} onFilterChange={(v: Set<string> | null) => { setFilters(p => ({...p, category: v})); setPage(1); }} currentSort={sort} onSort={(d: 'asc' | 'desc') => { setSort({key: "category", direction: d}); setPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-40 px-4">
                  <div className="flex items-center gap-1">Date <ExcelColumnFilter columnKey="purchaseDate" label="Purchase Date" data={getCascadingData("purchaseDate")} activeFilters={filters["purchaseDate"]} onFilterChange={(v: Set<string> | null) => { setFilters(p => ({...p, purchaseDate: v})); setPage(1); }} currentSort={sort} onSort={(d: 'asc' | 'desc') => { setSort({key: "purchaseDate", direction: d}); setPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-40 px-4">
                  <div className="flex items-center gap-1">Source <ExcelColumnFilter columnKey="bankRef" label="Source" data={getCascadingData("bankRef")} activeFilters={filters["bankRef"]} onFilterChange={(v: Set<string> | null) => { setFilters(p => ({...p, bankRef: v})); setPage(1); }} currentSort={sort} onSort={(d: 'asc' | 'desc') => { setSort({key: "bankRef", direction: d}); setPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-80 px-4">
                  <div className="flex items-center gap-1">Description <ExcelColumnFilter columnKey="assetName" label="Description" data={getCascadingData("assetName")} activeFilters={filters["assetName"]} onFilterChange={(v: Set<string> | null) => { setFilters(p => ({...p, assetName: v})); setPage(1); }} currentSort={sort} onSort={(d: 'asc' | 'desc') => { setSort({key: "assetName", direction: d}); setPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-44 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">Purchase Price <ExcelColumnFilter columnKey="purchasePrice" label="Purchase Price" data={getCascadingData("purchasePrice")} activeFilters={filters["purchasePrice"]} onFilterChange={(v: Set<string> | null) => { setFilters(p => ({...p, purchasePrice: v})); setPage(1); }} currentSort={sort} onSort={(d: 'asc' | 'desc') => { setSort({key: "purchasePrice", direction: d}); setPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-24 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">Month <ExcelColumnFilter columnKey="usefulLife" label="Month" data={getCascadingData("usefulLife")} activeFilters={filters["usefulLife"]} onFilterChange={(v: Set<string> | null) => { setFilters(p => ({...p, usefulLife: v})); setPage(1); }} currentSort={sort} onSort={(d: 'asc' | 'desc') => { setSort({key: "usefulLife", direction: d}); setPage(1); }} /></div>
                </TableHead>
                <TableHead className="w-44 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">S/D 2024 <ExcelColumnFilter columnKey="accumulated2020" label="S/D 2024" data={getCascadingData("accumulated2020")} activeFilters={filters["accumulated2020"]} onFilterChange={(v: Set<string> | null) => { setFilters(p => ({...p, accumulated2020: v})); setPage(1); }} currentSort={sort} onSort={(d: 'asc' | 'desc') => { setSort({key: "accumulated2020", direction: d}); setPage(1); }} /></div>
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
                      <TableCell className="pl-8 px-4 w-40">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-bold uppercase text-[10px] py-0.5 px-2">
                          {row.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 w-40">{row.purchaseDate}</TableCell>
                      <TableCell className="px-4 w-40 font-medium">{row.bankRef}</TableCell>
                      <TableCell className="px-4 w-80 font-bold text-primary">{row.assetName}</TableCell>
                      <TableCell className="px-4 w-44 text-right">{row.purchasePrice}</TableCell>
                      <TableCell className="px-4 w-24 text-center opacity-60 font-medium">{row.usefulLife}</TableCell>
                      <TableCell className="px-4 w-44 text-right">{row.accumulated2020}</TableCell>
                      
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
                    <TableCell colSpan={4} className="pl-8 py-3 text-[11px] text-secondary/80 uppercase tracking-[0.2em]">
                      Subtotal (Page {page})
                    </TableCell>
                    <TableCell className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(assetPageSubtotals.purchasePrice.toString())}`}>{formatCurrency(assetPageSubtotals.purchasePrice.toString())}</TableCell>
                    <TableCell className="py-3" />
                    <TableCell className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(assetPageSubtotals.accumulated2020.toString())}`}>{formatCurrency(assetPageSubtotals.accumulated2020.toString())}</TableCell>
                    
                    {months.map(m => (
                      <TableCell key={m} className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(assetPageSubtotals[m].toString())}`}>{formatCurrency(assetPageSubtotals[m].toString())}</TableCell>
                    ))}

                    <TableCell className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(assetPageSubtotals.total2021.toString())}`}>{formatCurrency(assetPageSubtotals.total2021.toString())}</TableCell>
                    <TableCell className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(assetPageSubtotals.accumulated2021.toString())}`}>{formatCurrency(assetPageSubtotals.accumulated2021.toString())}</TableCell>
                    <TableCell className={`pr-8 py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(assetPageSubtotals.bookValue.toString())}`}>{formatCurrency(assetPageSubtotals.bookValue.toString())}</TableCell>
                  </TableRow>

                  {/* Grand Total (All Pages) */}
                  <TableRow className="bg-secondary/10 border-t border-secondary/30 hover:bg-secondary/10 transition-none font-bold">
                    <TableCell colSpan={4} className="pl-8 py-3 text-[11px] text-secondary uppercase tracking-[0.2em]">
                      Grand Total ({assetMeta.total} records)
                    </TableCell>
                    <TableCell className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(assetGrandTotals.purchasePrice.toString())}`}>{formatCurrency(assetGrandTotals.purchasePrice.toString())}</TableCell>
                    <TableCell className="py-3" />
                    <TableCell className={`py-3 text-right pr-4 whitespace-nowrap ${getAmountColor(assetGrandTotals.accumulated2020.toString())}`}>{formatCurrency(assetGrandTotals.accumulated2020.toString())}</TableCell>
                    
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
