import { useState, useMemo, useEffect } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";

import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { useFinance } from "../hooks/useFinance";
import { useBanks } from "@/features/banks/hooks/useBanks";
import { PaginationControls } from "@/components/common/PaginationControls";
import { ExcelColumnFilter } from "../components/ExcelColumnFilter";
import { Landmark, TrendingUp, Users, Truck, Package, PieChart, BarChart3, Repeat, Filter, ArrowUpRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "sales");

  // Sync state when URL changes
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearchParams({ tab: val });
  };
  
  // --- PAGINATION STATES (Server-side tabs) ---
  const [salesPage, setSalesPage] = useState(1);
  const [salesSearch, setSalesSearch] = useState("");
  const [salesSort, setSalesSort] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [salesFilters, setSalesFilters] = useState<Record<string, Set<string> | null>>({});
  const salesLimit = 10;

  const [arPage, setArPage] = useState(1);
  const [arSearch, setArSearch] = useState("");
  const [arSort, setArSort] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [arFilters, setArFilters] = useState<Record<string, Set<string> | null>>({});
  // const arLimit = 100; // Client-side filtering needs more data or full fetch

  const [apPage, setApPage] = useState(1);
  const [apSearch, setApSearch] = useState("");
  const [apSort, setApSort] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [apFilters, setApFilters] = useState<Record<string, Set<string> | null>>({});
  // const apLimit = 100;

  const [assetsPage, setAssetsPage] = useState(1);
  const [iaPage, setIaPage] = useState(1);

  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [selectedBankLabel, setSelectedBankLabel] = useState<string | null>(null);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankPage, setBankPage] = useState(1);

  const {    
    getTransactions, 
    getSales, 
    getAllSales,
    getAllAR,
    getAllAP,
    getAssets, 
    getPL, 
    getPLCosts,
    getPLSummary,
    getBalanceSheet, 
    getInterAccountTransfers 
  } = useFinance();
 
  // Fetch accounts for mapping labels to IDs
  const { internalAccountsQuery } = useBanks({ accounts: { limit: 100, enabled: activeTab === 'bs' || isBankModalOpen } });
  const internalAccounts = useMemo(() => internalAccountsQuery.data?.data || [], [internalAccountsQuery.data?.data]);

  // --- LAZY FETCHING (Only fetch if tab is active) ---
  const { data: allSales, isLoading: salesLoading } = getAllSales({ enabled: activeTab === 'sales' });
  const { data: allAR, isLoading: arLoading } = getAllAR({ enabled: activeTab === 'ar' });
  const { data: allAP, isLoading: apLoading } = getAllAP({ enabled: activeTab === 'ap' });
  const { data: assetsResponse, isLoading: assetsLoading } = getAssets({ page: assetsPage, limit: 10 }, { enabled: activeTab === 'assets' });
  const { data: plResponse, isLoading: plLoading } = getPL({ page: 1, limit: 100 }, { enabled: activeTab === 'pl' });
  const { data: plCostsResponse, isLoading: plCostsLoading } = getPLCosts({ page: 1, limit: 100 }, { enabled: activeTab === 'pl' });
  const { data: plSummaryResponse, isLoading: plSummaryLoading } = (getPLSummary as any)({ enabled: activeTab === 'pl' });
  const { data: bsResponse, isLoading: bsLoading } = getBalanceSheet({ page: 1, limit: 100 }, { enabled: activeTab === 'bs' });
  const { data: iaResponse, isLoading: iaLoading } = getInterAccountTransfers({ page: iaPage, limit: 10 }, { enabled: activeTab === 'ia' });


  // Special lookups for modals
  const { data: bankTxsResponse, isLoading: bankTxsLoading } = getTransactions({ 
    page: bankPage, 
    limit: 10, 
    accountId: selectedBankId || undefined
  }, { enabled: isBankModalOpen && !!selectedBankId });

  const { data: salesLookup } = getSales({ page: 1, limit: 100 }, { enabled: activeTab === 'pl' });

  // --- SALES CLIENT-SIDE ENGINE ---
  const filteredAndSortedSales = useMemo(() => {
    if (!allSales) return [];

    let result = [...allSales];

    // 1. Column Filters
    Object.entries(salesFilters).forEach(([key, allowedValues]) => {
      if (allowedValues) {
        result = result.filter(item => allowedValues.has(String(item[key] || "")));
      }
    });

    // 2. Global Search
    if (salesSearch) {
      const term = salesSearch.toLowerCase();
      result = result.filter(item => 
        String(item.colD || "").toLowerCase().includes(term) || // Billing To
        String(item.colE || "").toLowerCase().includes(term) || // Project
        String(item.colF || "").toLowerCase().includes(term)    // Description
      );
    }

    // 3. Sorting
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
    lastPage: Math.ceil(filteredAndSortedSales.length / salesLimit)
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

  // --- AR FILTERING & SORTING ENGINE ---
  const filteredAndSortedAR = useMemo(() => {
    if (!allAR) return [];
    let result = [...allAR];

    // 1. Column Filters
    Object.entries(arFilters).forEach(([key, allowedValues]) => {
      if (allowedValues && allowedValues.size > 0) {
        result = result.filter(item => allowedValues.has(String(item[key] || "")));
      }
    });

    // 2. Search
    if (arSearch) {
      const term = arSearch.toLowerCase();
      result = result.filter(item => 
        String(item.colD || "").toLowerCase().includes(term) || // Entity
        String(item.colE || "").toLowerCase().includes(term)    // Desc
      );
    }

    // 3. Sort
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


  // --- AP FILTERING & SORTING ENGINE ---
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
        String(item.colC || "").toLowerCase().includes(term) || // Vendor
        String(item.colD || "").toLowerCase().includes(term)    // Keterangan
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary uppercase flex items-center gap-3">
             <Landmark className="text-secondary" size={32} />
             Financial Reporting
              </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Enterprise financial consolidation and centralized ledger analysis.</p>
        </div>
      </div>


      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 bg-transparent h-auto mb-8 p-0">
          {[
            { id: "sales", label: "Sales", icon: TrendingUp },
            { id: "ar", label: "A/R", icon: Users },
            { id: "ap", label: "A/P", icon: Truck },
            { id: "assets", label: "Assets", icon: Package },
            { id: "pl", label: "P&L", icon: BarChart3 },
            { id: "bs", label: "Balance", icon: PieChart },
            { id: "ia", label: "Transfers", icon: Repeat },
          ].map((tab) => (


            <TabsTrigger 
              key={tab.id}
              value={tab.id}
              className="px-4 py-3 rounded-xl border border-primary/5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-premium transition-all font-bold text-[10px] uppercase tracking-wider flex flex-col gap-1.5 h-auto bg-white/50 backdrop-blur-sm shadow-sm"
            >
              <tab.icon size={16} />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>








        {/* 2. SALES CONTENT */}
        <TabsContent value="sales" className="mt-0 space-y-4">
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSalesFilters({})}
                  className="h-11 px-4 w-full md:w-auto text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                >
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
                      <ExcelColumnFilter 
                        columnKey="colA" label="No" data={allSales || []} 
                        activeFilters={salesFilters["colA"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colA: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colA", direction: d}); setSalesPage(1); }}
                      />
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-24 border-r border-primary/10">
                    <div className="flex items-center">
                      DATE
                      <ExcelColumnFilter 
                        columnKey="colB" 
                        label="Date" 
                        data={allSales || []} 
                        activeFilters={salesFilters["colB"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colB: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colB", direction: d}); setSalesPage(1); }}
                      />
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-16 border-r border-primary/10">
                    <div className="flex items-center">
                      YEAR
                      <ExcelColumnFilter 
                        columnKey="colC" 
                        label="Year" 
                        data={allSales || []} 
                        activeFilters={salesFilters["colC"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colC: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colC", direction: d}); setSalesPage(1); }}
                      />
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-48 border-r border-primary/10">
                    <div className="flex items-center">
                      BILLING TO
                      <ExcelColumnFilter 
                        columnKey="colD" 
                        label="Billing To" 
                        data={allSales || []} 
                        activeFilters={salesFilters["colD"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colD: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colD", direction: d}); setSalesPage(1); }}
                      />
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-48 border-r border-primary/10 pl-4">
                    <div className="flex items-center">
                      PROJECT
                      <ExcelColumnFilter 
                        columnKey="colE" 
                        label="Project" 
                        data={allSales || []} 
                        activeFilters={salesFilters["colE"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colE: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colE", direction: d}); setSalesPage(1); }}
                      />
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-64 border-r border-primary/10 pl-4">
                    <div className="flex items-center">
                      DESCRIPTION
                      <ExcelColumnFilter 
                        columnKey="colF" 
                        label="Description" 
                        data={allSales || []} 
                        activeFilters={salesFilters["colF"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colF: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colF", direction: d}); setSalesPage(1); }}
                      />
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary text-right w-32 pr-4">
                    <div className="flex items-center justify-end gap-2">
                      BASIC PRICE
                      <ExcelColumnFilter 
                        columnKey="colG" label="Basic Price" data={allSales || []} 
                        activeFilters={salesFilters["colG"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colG: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colG", direction: d}); setSalesPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary text-right w-32 font-bold text-secondary pr-4">
                    <div className="flex items-center justify-end gap-2">
                      MGMT FEE
                      <ExcelColumnFilter 
                        columnKey="colH" label="Mgmt Fee" data={allSales || []} 
                        activeFilters={salesFilters["colH"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colH: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colH", direction: d}); setSalesPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary text-right w-24 pr-4">
                    <div className="flex items-center justify-end gap-2">
                      PPN
                      <ExcelColumnFilter 
                        columnKey="colI" label="PPN" data={allSales || []} 
                        activeFilters={salesFilters["colI"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colI: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colI", direction: d}); setSalesPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary text-right w-40 border-r border-primary/10 font-bold bg-primary/5 pr-4">
                    <div className="flex items-center justify-end gap-2">
                      TOTAL AMOUNT
                      <ExcelColumnFilter 
                        columnKey="colJ" label="Total Amount" data={allSales || []} 
                        activeFilters={salesFilters["colJ"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colJ: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colJ", direction: d}); setSalesPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead colSpan={7} className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-secondary bg-secondary/5 border-r border-primary/10 border-b border-primary/10">MUTASI 2021</TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-red-600 text-right w-40 border-r border-primary/10 pr-4">
                    <div className="flex items-center justify-end gap-2">
                      OUTSTANDING
                      <ExcelColumnFilter 
                        columnKey="colS" label="Outstanding" data={allSales || []} 
                        activeFilters={salesFilters["colS"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colS: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colS", direction: d}); setSalesPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead colSpan={4} className="text-center text-[11px] font-black uppercase tracking-widest text-primary bg-primary/5 border-b border-primary/10 border-r border-primary/10">TAX & ADJUSTMENT</TableHead>
                  <TableHead rowSpan={2} className="pr-8 text-[12px] font-black uppercase tracking-tight text-emerald-600 text-right w-44 bg-emerald-50 text-secondary">
                    <div className="flex items-center justify-end gap-2">
                      NET RECEIVED
                      <ExcelColumnFilter 
                        columnKey="colZ" label="Net Received" data={allSales || []} 
                        activeFilters={salesFilters["colZ"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colZ: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colZ", direction: d}); setSalesPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent border-primary/5 h-12 bg-primary/5 whitespace-nowrap">
                  <TableHead className="text-[11px] font-bold text-secondary text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      BCA
                      <ExcelColumnFilter 
                        columnKey="colL" label="BCA" data={allSales || []} 
                        activeFilters={salesFilters["colL"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colL: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colL", direction: d}); setSalesPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      MANDIRI
                      <ExcelColumnFilter 
                        columnKey="colM" label="Mandiri" data={allSales || []} 
                        activeFilters={salesFilters["colM"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colM: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colM", direction: d}); setSalesPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      DANAMON
                      <ExcelColumnFilter 
                        columnKey="colN" label="Danamon" data={allSales || []} 
                        activeFilters={salesFilters["colN"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colN: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colN", direction: d}); setSalesPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      BRI
                      <ExcelColumnFilter 
                        columnKey="colO" label="BRI" data={allSales || []} 
                        activeFilters={salesFilters["colO"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colO: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colO", direction: d}); setSalesPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      BTN
                      <ExcelColumnFilter 
                        columnKey="colP" label="BTN" data={allSales || []} 
                        activeFilters={salesFilters["colP"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colP: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colP", direction: d}); setSalesPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      Cash IDR
                      <ExcelColumnFilter 
                        columnKey="colQ" label="Cash IDR" data={allSales || []} 
                        activeFilters={salesFilters["colQ"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colQ: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colQ", direction: d}); setSalesPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right border-r border-primary/10 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      Non CB
                      <ExcelColumnFilter 
                        columnKey="colR" label="Non CB" data={allSales || []} 
                        activeFilters={salesFilters["colR"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colR: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colR", direction: d}); setSalesPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-primary text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      PPh-23
                      <ExcelColumnFilter 
                        columnKey="colU" label="PPh-23" data={allSales || []} 
                        activeFilters={salesFilters["colU"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colU: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colU", direction: d}); setSalesPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-primary text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      A/P PPh-23
                      <ExcelColumnFilter 
                        columnKey="colV" label="A/P PPh-23" data={allSales || []} 
                        activeFilters={salesFilters["colV"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colV: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colV", direction: d}); setSalesPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-primary text-right pr-4">
                    <div className="flex items-center justify-end gap-1">
                      PPN TAX
                      <ExcelColumnFilter 
                        columnKey="colW" label="PPN TAX" data={allSales || []} 
                        activeFilters={salesFilters["colW"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colW: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colW", direction: d}); setSalesPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-primary text-right border-r border-primary/10 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      A/P PPN
                      <ExcelColumnFilter 
                        columnKey="colX" label="A/P PPN" data={allSales || []} 
                        activeFilters={salesFilters["colX"]} 
                        onFilterChange={(v) => { setSalesFilters(p => ({...p, colX: v})); setSalesPage(1); }}
                        currentSort={salesSort}
                        onSort={(d) => { setSalesSort({key: "colX", direction: d}); setSalesPage(1); }}
                        valueFormatter={formatCurrency}
                      />
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
                        {/* Payments */}
                        <TableCell className="py-4 text-right text-[12px] font-bold text-primary pr-4">{formatCurrency(row.colL)}</TableCell>
                        <TableCell className="py-4 text-right text-[12px] font-bold text-primary pr-4">{formatCurrency(row.colM)}</TableCell>
                        <TableCell className="py-4 text-right text-[12px] font-bold text-primary pr-4">{formatCurrency(row.colN)}</TableCell>
                        <TableCell className="py-4 text-right text-[12px] font-bold text-primary pr-4">{formatCurrency(row.colO)}</TableCell>
                        <TableCell className="py-4 text-right text-[12px] font-bold text-primary pr-4">{formatCurrency(row.colP)}</TableCell>
                        <TableCell className="py-4 text-right text-[12px] font-bold text-primary pr-4">{formatCurrency(row.colQ)}</TableCell>
                        <TableCell className="py-4 text-right text-[12px] font-bold text-primary border-r border-primary/5 pr-4">{formatCurrency(row.colR)}</TableCell>
                        {/* Status */}
                        <TableCell className="py-4 text-right text-[12px] font-black text-red-600 border-r border-primary/5 pr-4">{formatCurrency(row.colS)}</TableCell>
                        {/* Taxes */}
                        <TableCell className="py-4 text-right text-[12px] font-bold text-primary pr-4">{formatCurrency(row.colU)}</TableCell>
                        <TableCell className="py-4 text-right text-[12px] font-bold text-primary italic pr-4">{formatCurrency(row.colV)}</TableCell>
                        <TableCell className="py-4 text-right text-[12px] font-bold text-primary pr-4">{formatCurrency(row.colW)}</TableCell>
                        <TableCell className="py-4 text-right text-[12px] font-bold text-primary italic border-r border-primary/5 pr-4">{formatCurrency(row.colX)}</TableCell>
                        <TableCell className="pr-8 py-4 text-right text-[12px] font-black text-secondary bg-secondary/[0.02]">{formatCurrency(row.colZ)}</TableCell>
                      </TableRow>
                    ))}

                    <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                      <TableCell colSpan={6} className="pl-10 py-5 font-black text-[12px] text-primary uppercase tracking-[0.2em]">
                        Accumulated Balance (Page 1-{salesPage})
                      </TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">
                        {formatCurrency(salesAccumulatedTotals.colG)}
                      </TableCell>
                      <TableCell className="py-5 text-right font-black text-secondary text-[12px] pr-4">
                        {formatCurrency(salesAccumulatedTotals.colH)}
                      </TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">
                        {formatCurrency(salesAccumulatedTotals.colI)}
                      </TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] bg-primary/10 border-r border-primary/10 pr-4">
                        {formatCurrency(salesAccumulatedTotals.colJ)}
                      </TableCell>
                      {/* Payment Sums */}
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colL)}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colM)}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colN)}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colO)}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colP)}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colQ)}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] border-r border-primary/10 pr-4">{formatCurrency(salesAccumulatedTotals.colR)}</TableCell>
                      {/* Outstanding Sum */}
                      <TableCell className="py-5 text-right font-black text-red-700 text-[12px] border-r border-primary/10 pr-4">
                        {formatCurrency(salesAccumulatedTotals.colS)}
                      </TableCell>
                      {/* Tax Sums */}
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colU)}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] italic pr-4">{formatCurrency(salesAccumulatedTotals.colV)}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] pr-4">{formatCurrency(salesAccumulatedTotals.colW)}</TableCell>
                      <TableCell className="py-5 text-right font-black text-primary text-[12px] italic border-r border-primary/10 pr-4">{formatCurrency(salesAccumulatedTotals.colX)}</TableCell>
                      <TableCell className="pr-10 py-5 text-right font-black text-secondary text-[12px] bg-secondary/10">
                        {formatCurrency(salesAccumulatedTotals.colZ)}
                      </TableCell>
                    </TableRow>

                    <TableRow className="bg-secondary/5 border-t border-secondary/20">
                      <TableCell colSpan={10} className="pl-10 py-5 font-black text-[12px] text-secondary uppercase tracking-[0.2em]">
                        Performance Summary (Total Amount - Outstanding)
                      </TableCell>
                      <TableCell colSpan={7} className="bg-secondary/[0.01]" />
                      <TableCell className="py-5 text-right border-r border-primary/10 pr-4 text-[13px] font-black bg-secondary/5">
                        <span className="text-emerald-700">
                          {formatCurrency(salesAccumulatedTotals.colJ - salesAccumulatedTotals.colS)}
                        </span>
                      </TableCell>
                      <TableCell colSpan={4} className="bg-secondary/[0.01]" />
                      <TableCell className="pr-10 py-5 text-right font-black text-secondary text-[13px] bg-secondary/10">
                        {formatCurrency(salesAccumulatedTotals.colZ)}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationControls meta={salesMeta} onPageChange={setSalesPage} isFetching={salesLoading} />
        </TabsContent>


        {/* 3. AR CONTENT */}
        <TabsContent value="ar" className="mt-0 space-y-4">
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setArFilters({})}
                  className="h-11 px-4 w-full md:w-auto text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                >
                  Clear All Filters
                </Button>
              )}
            </div>

            <Badge variant="outline" className="h-11 px-6 w-full md:w-auto flex justify-center rounded-xl bg-primary/5 text-primary border-primary/10 font-black uppercase tracking-[0.2em] text-[11px]">
              {filteredAndSortedAR.length} Records
            </Badge>
          </div>

          <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-premium border border-primary/5 overflow-x-auto">
            <Table className="min-w-[2400px]">
              <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent border-primary/5 h-12 whitespace-nowrap">
                  <TableHead rowSpan={2} className="pl-8 text-[11px] font-black uppercase tracking-tight text-primary w-24 border-r border-primary/10">
                    <div className="flex items-center">
                      TYPE
                      <ExcelColumnFilter 
                        columnKey="colB" label="Type" data={allAR || []} 
                        activeFilters={arFilters["colB"]} 
                        onFilterChange={(v) => { setArFilters(p => ({...p, colB: v})); setArPage(1); }}
                        currentSort={arSort}
                        onSort={(d) => { setArSort({key: "colB", direction: d}); setArPage(1); }}
                      />
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-32 border-r border-primary/10">
                    <div className="flex items-center">
                      SUB CATEGORY
                      <ExcelColumnFilter 
                        columnKey="colC" label="Sub Category" data={allAR || []} 
                        activeFilters={arFilters["colC"]} 
                        onFilterChange={(v) => { setArFilters(p => ({...p, colC: v})); setArPage(1); }}
                        currentSort={arSort}
                        onSort={(d) => { setArSort({key: "colC", direction: d}); setArPage(1); }}
                      />
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-48 border-r border-primary/10">
                    <div className="flex items-center">
                      ENTITY NAME
                      <ExcelColumnFilter 
                        columnKey="colD" label="Entity Name" data={allAR || []} 
                        activeFilters={arFilters["colD"]} 
                        onFilterChange={(v) => { setArFilters(p => ({...p, colD: v})); setArPage(1); }}
                        currentSort={arSort}
                        onSort={(d) => { setArSort({key: "colD", direction: d}); setArPage(1); }}
                      />
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-64 border-r border-primary/10">
                    <div className="flex items-center">
                      DESCRIPTION
                      <ExcelColumnFilter 
                        columnKey="colE" label="Description" data={allAR || []} 
                        activeFilters={arFilters["colE"]} 
                        onFilterChange={(v) => { setArFilters(p => ({...p, colE: v})); setArPage(1); }}
                        currentSort={arSort}
                        onSort={(d) => { setArSort({key: "colE", direction: d}); setArPage(1); }}
                      />
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
                      <ExcelColumnFilter 
                        columnKey="colF" label="IDR (2020)" data={allAR || []} 
                        activeFilters={arFilters["colF"]} 
                        onFilterChange={(v) => { setArFilters(p => ({...p, colF: v})); setArPage(1); }}
                        currentSort={arSort}
                        onSort={(d) => { setArSort({key: "colF", direction: d}); setArPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-primary text-right">
                    <div className="flex items-center justify-end gap-1">
                      USD
                      <ExcelColumnFilter 
                        columnKey="colG" label="USD (2020)" data={allAR || []} 
                        activeFilters={arFilters["colG"]} 
                        onFilterChange={(v) => { setArFilters(p => ({...p, colG: v})); setArPage(1); }}
                        currentSort={arSort}
                        onSort={(d) => { setArSort({key: "colG", direction: d}); setArPage(1); }}
                        valueFormatter={(v) => formatCurrency(v, 'USD')}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-primary text-right border-r border-primary/10 italic">
                    <div className="flex items-center justify-end gap-1">
                      RATE
                      <ExcelColumnFilter 
                        columnKey="colH" label="Rate" data={allAR || []} 
                        activeFilters={arFilters["colH"]} 
                        onFilterChange={(v) => { setArFilters(p => ({...p, colH: v})); setArPage(1); }}
                        currentSort={arSort}
                        onSort={(d) => { setArSort({key: "colH", direction: d}); setArPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right">
                    <div className="flex items-center justify-end gap-1">
                      BCA
                      <ExcelColumnFilter 
                        columnKey="colJ" label="BCA" data={allAR || []} 
                        activeFilters={arFilters["colJ"]} 
                        onFilterChange={(v) => { setArFilters(p => ({...p, colJ: v})); setArPage(1); }}
                        currentSort={arSort}
                        onSort={(d) => { setArSort({key: "colJ", direction: d}); setArPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right">
                    <div className="flex items-center justify-end gap-1">
                      MANDIRI
                      <ExcelColumnFilter 
                        columnKey="colK" label="Mandiri" data={allAR || []} 
                        activeFilters={arFilters["colK"]} 
                        onFilterChange={(v) => { setArFilters(p => ({...p, colK: v})); setArPage(1); }}
                        currentSort={arSort}
                        onSort={(d) => { setArSort({key: "colK", direction: d}); setArPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right">
                    <div className="flex items-center justify-end gap-1">
                      BNI
                      <ExcelColumnFilter 
                        columnKey="colL" label="BNI" data={allAR || []} 
                        activeFilters={arFilters["colL"]} 
                        onFilterChange={(v) => { setArFilters(p => ({...p, colL: v})); setArPage(1); }}
                        currentSort={arSort}
                        onSort={(d) => { setArSort({key: "colL", direction: d}); setArPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right">
                    <div className="flex items-center justify-end gap-1">
                      CASH IDR
                      <ExcelColumnFilter 
                        columnKey="colM" label="Cash IDR" data={allAR || []} 
                        activeFilters={arFilters["colM"]} 
                        onFilterChange={(v) => { setArFilters(p => ({...p, colM: v})); setArPage(1); }}
                        currentSort={arSort}
                        onSort={(d) => { setArSort({key: "colM", direction: d}); setArPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right">
                    <div className="flex items-center justify-end gap-1">
                      NON CB
                      <ExcelColumnFilter 
                        columnKey="colN" label="Non CB" data={allAR || []} 
                        activeFilters={arFilters["colN"]} 
                        onFilterChange={(v) => { setArFilters(p => ({...p, colN: v})); setArPage(1); }}
                        currentSort={arSort}
                        onSort={(d) => { setArSort({key: "colN", direction: d}); setArPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right">
                    <div className="flex items-center justify-end gap-1">
                      CEK BANK
                      <ExcelColumnFilter 
                        columnKey="colO" label="Cek Bank" data={allAR || []} 
                        activeFilters={arFilters["colO"]} 
                        onFilterChange={(v) => { setArFilters(p => ({...p, colO: v})); setArPage(1); }}
                        currentSort={arSort}
                        onSort={(d) => { setArSort({key: "colO", direction: d}); setArPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right border-r border-primary/10">
                    <div className="flex items-center justify-end gap-1">
                      CASH USD
                      <ExcelColumnFilter 
                        columnKey="colP" label="Cash USD" data={allAR || []} 
                        activeFilters={arFilters["colP"]} 
                        onFilterChange={(v) => { setArFilters(p => ({...p, colP: v})); setArPage(1); }}
                        currentSort={arSort}
                        onSort={(d) => { setArSort({key: "colP", direction: d}); setArPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-emerald-600 text-right bg-emerald-50/30">
                    <div className="flex items-center justify-end gap-1">
                      IDR
                      <ExcelColumnFilter 
                        columnKey="colR" label="IDR Outstanding" data={allAR || []} 
                        activeFilters={arFilters["colR"]} 
                        onFilterChange={(v) => { setArFilters(p => ({...p, colR: v})); setArPage(1); }}
                        currentSort={arSort}
                        onSort={(d) => { setArSort({key: "colR", direction: d}); setArPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-emerald-600 text-right bg-emerald-50/30">
                    <div className="flex items-center justify-end gap-1">
                      USD
                      <ExcelColumnFilter 
                        columnKey="colS" label="USD Outstanding" data={allAR || []} 
                        activeFilters={arFilters["colS"]} 
                        onFilterChange={(v) => { setArFilters(p => ({...p, colS: v})); setArPage(1); }}
                        currentSort={arSort}
                        onSort={(d) => { setArSort({key: "colS", direction: d}); setArPage(1); }}
                        valueFormatter={(v) => formatCurrency(v, 'USD')}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-emerald-600 text-right bg-emerald-50/30 border-r border-primary/10 italic">
                    <div className="flex items-center justify-end gap-1">
                      RATE
                      <ExcelColumnFilter 
                        columnKey="colT" label="Rate Outstanding" data={allAR || []} 
                        activeFilters={arFilters["colT"]} 
                        onFilterChange={(v) => { setArFilters(p => ({...p, colT: v})); setArPage(1); }}
                        currentSort={arSort}
                        onSort={(d) => { setArSort({key: "colT", direction: d}); setArPage(1); }}
                        valueFormatter={formatCurrency}
                      />
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
                        <TableCell className="py-4 text-right text-[12px] font-black text-emerald-600 bg-emerald-500/5">
                          {formatCurrency(row.colR)}
                        </TableCell>
                         <TableCell className="py-4 text-right text-[12px] font-black text-emerald-600 bg-emerald-500/5">
                          {formatCurrency(row.colS, 'USD')}
                        </TableCell>
                        <TableCell className="py-4 text-right text-[12px] font-bold text-emerald-600/60 bg-emerald-500/5 border-r border-primary/5 italic">
                           {formatCurrency(row.colT)}
                        </TableCell>
                      </TableRow>
                    ))}

                    {filteredAndSortedAR.length > 0 && (
                      <>
                        <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                          <TableCell colSpan={4} className="pl-10 py-5 font-black text-[12px] text-primary uppercase tracking-[0.2em]">
                            Accumulated Balance (Page 1-{arPage})
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">
                            {arAccumulatedTotals.colF !== 0 ? formatCurrency(arAccumulatedTotals.colF) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">
                            {formatCurrency(arAccumulatedTotals.colG, 'USD')}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] bg-primary/5 border-r border-primary/10 whitespace-nowrap">
                            {arAccumulatedTotals.colH !== 0 ? formatCurrency(arAccumulatedTotals.colH) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">
                            {arAccumulatedTotals.colJ !== 0 ? formatCurrency(arAccumulatedTotals.colJ) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">
                            {arAccumulatedTotals.colK !== 0 ? formatCurrency(arAccumulatedTotals.colK) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">
                            {arAccumulatedTotals.colL !== 0 ? formatCurrency(arAccumulatedTotals.colL) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">
                            {arAccumulatedTotals.colM !== 0 ? formatCurrency(arAccumulatedTotals.colM) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">
                            {arAccumulatedTotals.colN !== 0 ? formatCurrency(arAccumulatedTotals.colN) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">
                            {arAccumulatedTotals.colO !== 0 ? formatCurrency(arAccumulatedTotals.colO) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap border-r border-primary/10">
                            {arAccumulatedTotals.colP !== 0 ? formatCurrency(arAccumulatedTotals.colP, 'USD') : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-emerald-600 text-[12px] bg-emerald-500/10 whitespace-nowrap">
                            {arAccumulatedTotals.colR !== 0 ? formatCurrency(arAccumulatedTotals.colR) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-emerald-600 text-[12px] bg-emerald-500/10 whitespace-nowrap">
                            {formatCurrency(arAccumulatedTotals.colS, 'USD')}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-emerald-600/60 text-[12px] bg-emerald-500/10 italic whitespace-nowrap">
                            {formatCurrency(arAccumulatedTotals.colT)}
                          </TableCell>
                        </TableRow>

                        <TableRow className="bg-primary/10 border-t-2 border-primary/30">
                          <TableCell colSpan={4} className="pl-10 py-5 font-black text-[12px] text-primary uppercase tracking-[0.2em]">
                            Total IDR Summary (Converted)
                          </TableCell>
                          <TableCell colSpan={3} className="py-5 text-right font-black text-primary text-[14px] bg-primary/10 border-r border-primary/20">
                            {formatCurrency(arAccumulatedTotals.convertedInitial)}
                          </TableCell>
                          <TableCell colSpan={7} className="bg-transparent" />
                          <TableCell colSpan={3} className="py-5 text-right font-black text-emerald-700 text-[14px] bg-emerald-500/10">
                            {formatCurrency(arAccumulatedTotals.convertedOutstanding)}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationControls 
            meta={{
              total: filteredAndSortedAR.length,
              page: arPage,
              limit: 10,
              lastPage: Math.ceil(filteredAndSortedAR.length / 10)
            }} 
            onPageChange={setArPage} 
            isFetching={arLoading} 
          />
        </TabsContent>

        {/* 4. AP CONTENT */}
        <TabsContent value="ap" className="mt-0 space-y-4">
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setApFilters({})}
                  className="h-11 px-4 w-full md:w-auto text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                >
                  Clear All Filters
                </Button>
              )}
            </div>

            <Badge variant="outline" className="h-11 px-6 w-full md:w-auto flex justify-center rounded-xl bg-primary/5 text-primary border-primary/10 font-black uppercase tracking-[0.2em] text-[11px]">
              {filteredAndSortedAP.length} Records
            </Badge>
          </div>

          <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-premium border border-primary/5 overflow-x-auto">
            <Table className="min-w-[2600px]">
              <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent border-primary/5 h-12 whitespace-nowrap">
                  <TableHead rowSpan={2} className="pl-8 text-[11px] font-black uppercase tracking-tight text-primary w-24 border-r border-primary/10">
                    <div className="flex items-center">
                      PAYABLE
                      <ExcelColumnFilter 
                        columnKey="colA" label="Payable" data={allAP || []} 
                        activeFilters={apFilters["colA"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colA: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colA", direction: d}); setApPage(1); }}
                      />
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-16 border-r border-primary/10">
                    <div className="flex items-center">
                      YEAR
                      <ExcelColumnFilter 
                        columnKey="colB" label="Year" data={allAP || []} 
                        activeFilters={apFilters["colB"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colB: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colB", direction: d}); setApPage(1); }}
                      />
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-48 border-r border-primary/10">
                    <div className="flex items-center">
                      VENDOR
                      <ExcelColumnFilter 
                        columnKey="colC" label="Vendor" data={allAP || []} 
                        activeFilters={apFilters["colC"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colC: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colC", direction: d}); setApPage(1); }}
                      />
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary w-64 border-r border-primary/10">
                    <div className="flex items-center">
                      KETERANGAN
                      <ExcelColumnFilter 
                        columnKey="colD" label="Keterangan" data={allAP || []} 
                        activeFilters={apFilters["colD"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colD: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colD", direction: d}); setApPage(1); }}
                      />
                    </div>
                  </TableHead>
                  <TableHead colSpan={3} className="bg-transparent border-r border-primary/10 border-b border-primary/10" />
                  <TableHead rowSpan={2} className="text-[11px] font-bold text-primary text-right w-32 border-r border-primary/10">
                    <div className="flex items-center justify-end gap-1">
                      COL-H
                      <ExcelColumnFilter 
                        columnKey="colH" label="COL-H" data={allAP || []} 
                        activeFilters={apFilters["colH"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colH: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colH", direction: d}); setApPage(1); }}
                      />
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-bold text-primary text-right w-32 border-r border-primary/10">
                    <div className="flex items-center justify-end gap-1">
                      COL-I
                      <ExcelColumnFilter 
                        columnKey="colI" label="COL-I" data={allAP || []} 
                        activeFilters={apFilters["colI"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colI: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colI", direction: d}); setApPage(1); }}
                      />
                    </div>
                  </TableHead>
                  <TableHead colSpan={8} className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-secondary bg-secondary/5 border-r border-primary/10 border-b border-primary/10 whitespace-nowrap">PAYMENT IN 2020</TableHead>
                  <TableHead colSpan={2} className="text-center text-[11px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border-b border-primary/10 border-r border-primary/10 whitespace-nowrap">OUTSTANDING</TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-bold text-primary text-right w-32 border-r border-primary/10">
                    <div className="flex items-center justify-end gap-1">
                      WA YOGI 21-JAN-22
                      <ExcelColumnFilter 
                        columnKey="colW" label="Wa Yogi" data={allAP || []} 
                        activeFilters={apFilters["colW"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colW: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colW", direction: d}); setApPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-bold text-primary text-right w-32 border-r border-primary/10">
                    <div className="flex items-center justify-end gap-1">
                      KOREKSI SELISIH
                      <ExcelColumnFilter 
                        columnKey="colX" label="Koreksi Selisih" data={allAP || []} 
                        activeFilters={apFilters["colX"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colX: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colX", direction: d}); setApPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent border-primary/5 h-12 bg-primary/5 whitespace-nowrap">
                  <TableHead className="text-[11px] font-bold text-primary text-right">
                    <div className="flex items-center justify-end gap-1">
                      IDR
                      <ExcelColumnFilter 
                        columnKey="colE" label="IDR (Initial)" data={allAP || []} 
                        activeFilters={apFilters["colE"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colE: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colE", direction: d}); setApPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-primary text-right">
                    <div className="flex items-center justify-end gap-1">
                      USD
                      <ExcelColumnFilter 
                        columnKey="colF" label="USD (Initial)" data={allAP || []} 
                        activeFilters={apFilters["colF"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colF: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colF", direction: d}); setApPage(1); }}
                        valueFormatter={(v) => formatCurrency(v, 'USD')}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-primary text-right italic border-r border-primary/10">
                    <div className="flex items-center justify-end gap-1">
                      RATE
                      <ExcelColumnFilter 
                        columnKey="colG" label="Rate" data={allAP || []} 
                        activeFilters={apFilters["colG"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colG: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colG", direction: d}); setApPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right">
                    <div className="flex items-center justify-end gap-1">
                      BCA
                      <ExcelColumnFilter 
                        columnKey="colK" label="BCA" data={allAP || []} 
                        activeFilters={apFilters["colK"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colK: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colK", direction: d}); setApPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right">
                    <div className="flex items-center justify-end gap-1">
                      MANDIRI
                      <ExcelColumnFilter 
                        columnKey="colL" label="Mandiri" data={allAP || []} 
                        activeFilters={apFilters["colL"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colL: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colL", direction: d}); setApPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right">
                    <div className="flex items-center justify-end gap-1">
                      BTN
                      <ExcelColumnFilter 
                        columnKey="colM" label="BTN" data={allAP || []} 
                        activeFilters={apFilters["colM"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colM: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colM", direction: d}); setApPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right">
                    <div className="flex items-center justify-end gap-1">
                      BRI
                      <ExcelColumnFilter 
                        columnKey="colN" label="BRI" data={allAP || []} 
                        activeFilters={apFilters["colN"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colN: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colN", direction: d}); setApPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right">
                    <div className="flex items-center justify-end gap-1">
                      CASH IDR
                      <ExcelColumnFilter 
                        columnKey="colO" label="Cash IDR" data={allAP || []} 
                        activeFilters={apFilters["colO"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colO: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colO", direction: d}); setApPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right">
                    <div className="flex items-center justify-end gap-1">
                      NON CB
                      <ExcelColumnFilter 
                        columnKey="colP" label="Non CB" data={allAP || []} 
                        activeFilters={apFilters["colP"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colP: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colP", direction: d}); setApPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right">
                    <div className="flex items-center justify-end gap-1">
                      CITIBANK
                      <ExcelColumnFilter 
                        columnKey="colQ" label="Citibank" data={allAP || []} 
                        activeFilters={apFilters["colQ"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colQ: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colQ", direction: d}); setApPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-secondary text-right border-r border-primary/10">
                    <div className="flex items-center justify-end gap-1">
                      CASH USD
                      <ExcelColumnFilter 
                        columnKey="colR" label="Cash USD" data={allAP || []} 
                        activeFilters={apFilters["colR"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colR: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colR", direction: d}); setApPage(1); }}
                        valueFormatter={(v) => formatCurrency(v, 'USD')}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-emerald-600 text-right bg-emerald-50/30">
                    <div className="flex items-center justify-end gap-1">
                      IDR
                      <ExcelColumnFilter 
                        columnKey="colT" label="IDR Outstanding" data={allAP || []} 
                        activeFilters={apFilters["colT"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colT: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colT", direction: d}); setApPage(1); }}
                        valueFormatter={formatCurrency}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-emerald-600 text-right bg-emerald-50/30 border-r border-primary/10">
                    <div className="flex items-center justify-end gap-1">
                      USD
                      <ExcelColumnFilter 
                        columnKey="colU" label="USD Outstanding" data={allAP || []} 
                        activeFilters={apFilters["colU"]} 
                        onFilterChange={(v) => { setApFilters(p => ({...p, colU: v})); setApPage(1); }}
                        currentSort={apSort}
                        onSort={(d) => { setApSort({key: "colU", direction: d}); setApPage(1); }}
                        valueFormatter={(v) => formatCurrency(v, 'USD')}
                      />
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
                        <TableCell className="py-4 text-right text-[12px] font-black text-emerald-600 bg-emerald-500/5">
                          {formatCurrency(row.colT)}
                        </TableCell>
                        <TableCell className="py-4 text-right text-[12px] font-black text-emerald-600 bg-emerald-500/5 border-r border-primary/10">
                          {formatCurrency(row.colU, 'USD')}
                        </TableCell>
                        <TableCell className="py-4 text-right text-[12px] font-bold text-primary w-32 border-r border-primary/10">{formatCurrency(row.colW)}</TableCell>
                        <TableCell className="py-4 text-right text-[12px] font-bold text-primary w-32 border-r border-primary/10">{Number(row.colX) !== 0 ? formatCurrency(row.colX) : '-'}</TableCell>
                      </TableRow>
                    ))}

                    {filteredAndSortedAP.length > 0 && (
                      <>
                        <TableRow className="bg-primary/5 border-t-2 border-primary/20 whitespace-nowrap">
                          <TableCell colSpan={4} className="pl-10 py-5 font-black text-[12px] text-primary uppercase tracking-[0.2em]">
                            Accumulated Balance (Page 1-{apPage})
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">
                            {apAccumulatedTotals.colE !== 0 ? formatCurrency(apAccumulatedTotals.colE) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">
                            {formatCurrency(apAccumulatedTotals.colF, 'USD')}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] bg-primary/5 border-r border-primary/10 whitespace-nowrap">
                            {apAccumulatedTotals.colG !== 0 ? formatCurrency(apAccumulatedTotals.colG) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] w-32 whitespace-nowrap" />
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] w-32 border-r border-primary/10 whitespace-nowrap" />
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">
                            {apAccumulatedTotals.colK !== 0 ? formatCurrency(apAccumulatedTotals.colK) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">
                            {apAccumulatedTotals.colL !== 0 ? formatCurrency(apAccumulatedTotals.colL) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">
                            {apAccumulatedTotals.colM !== 0 ? formatCurrency(apAccumulatedTotals.colM) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">
                            {apAccumulatedTotals.colN !== 0 ? formatCurrency(apAccumulatedTotals.colN) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">
                            {apAccumulatedTotals.colO !== 0 ? formatCurrency(apAccumulatedTotals.colO) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">
                            {apAccumulatedTotals.colP !== 0 ? formatCurrency(apAccumulatedTotals.colP) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] whitespace-nowrap">
                            {apAccumulatedTotals.colQ !== 0 ? formatCurrency(apAccumulatedTotals.colQ) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-primary text-[12px] border-r border-primary/10 whitespace-nowrap">
                            {apAccumulatedTotals.colR !== 0 ? formatCurrency(apAccumulatedTotals.colR, 'USD') : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-emerald-600 text-[12px] bg-emerald-500/10 border-l border-emerald-500/20 whitespace-nowrap">
                            {apAccumulatedTotals.colT !== 0 ? formatCurrency(apAccumulatedTotals.colT) : "-"}
                          </TableCell>
                          <TableCell className="py-5 text-right font-black text-emerald-600 text-[12px] bg-emerald-500/10 border-r border-primary/10 whitespace-nowrap">
                            {formatCurrency(apAccumulatedTotals.colU, 'USD')}
                          </TableCell>
                          <TableCell className="bg-transparent" />
                          <TableCell className="bg-transparent" />
                        </TableRow>

                        {/* NEW SUMMARY ROW: TOTAL IDR CONVERTED */}
                        <TableRow className="bg-primary/10 border-t-2 border-primary/30">
                          <TableCell colSpan={4} className="pl-10 py-5 font-black text-[12px] text-primary uppercase tracking-[0.2em]">
                            Total IDR Summary (Converted)
                          </TableCell>
                          <TableCell colSpan={3} className="py-5 text-right font-black text-primary text-[14px] bg-primary/10 border-r border-primary/20">
                            {formatCurrency(apAccumulatedTotals.convertedInitial)}
                          </TableCell>
                          <TableCell colSpan={10} className="bg-transparent" />
                          <TableCell colSpan={2} className="py-5 text-right font-black text-emerald-700 text-[14px] bg-emerald-500/10 border-l border-emerald-500/20">
                             {formatCurrency(apAccumulatedTotals.convertedOutstanding)}
                          </TableCell>
                          <TableCell colSpan={2} className="bg-transparent" />
                        </TableRow>
                      </>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationControls 
            meta={{
              total: filteredAndSortedAP.length,
              page: apPage,
              limit: 10,
              lastPage: Math.ceil(filteredAndSortedAP.length / 10)
            }} 
            onPageChange={setApPage} 
            isFetching={apLoading} 
          />
        </TabsContent>


        <TabsContent value="assets" className="mt-0">
          <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-premium border border-primary/5 overflow-x-auto">
            <Table className="min-w-[2000px]">
              <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent border-primary/5 h-12 whitespace-nowrap">
                  <TableHead colSpan={3} className="pl-8 text-[11px] font-black uppercase tracking-tight text-primary border-r border-primary/10">ASSET INFO</TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary text-right w-32 border-r border-primary/10">HARGA BELI</TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary text-center w-16 border-r border-primary/10">BULAN</TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary text-right w-32 border-r border-primary/10 bg-primary/5">S/D 2020</TableHead>
                  <TableHead colSpan={12} className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-secondary bg-secondary/5 border-r border-primary/10 border-b border-primary/10">DEPRECIATION 2021</TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary text-right w-32 border-r border-primary/10 bg-primary/5">2 0 2 1</TableHead>
                  <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary text-right w-32 border-r border-primary/10 bg-primary/5">S/D 2021</TableHead>
                  <TableHead rowSpan={2} className="pr-8 text-[11px] font-black uppercase tracking-tight text-secondary text-right w-40 bg-secondary/5">NILAI BUKU</TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent border-primary/5 h-10 bg-primary/5">
                  <TableHead className="pl-8 text-[11px] font-bold text-primary">PURCHASE DATE</TableHead>
                  <TableHead className="text-[11px] font-bold text-primary">BANK REF</TableHead>
                  <TableHead className="text-[11px] font-bold text-primary border-r border-primary/10">ASSET NAME</TableHead>
                  {["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].map((m, i) => (
                    <TableHead key={m} className={`text-[11px] font-bold text-secondary text-right ${i === 11 ? 'border-r border-primary/10' : ''}`}>{m}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {assetsLoading ? (
                  <TableRow>
                    <TableCell colSpan={21} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Processing Asset Depreciation Data...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : ((assetsResponse as any)?.data || []).map((row: any) => (
                  <TableRow key={row.id} className="border-primary/5 hover:bg-primary/5 transition-colors whitespace-nowrap">
                    <TableCell className="pl-8 py-4 text-[12px] font-bold text-primary">{row.purchaseDate}</TableCell>
                    <TableCell className="py-4 text-[12px] font-bold text-primary uppercase">{row.bankRef}</TableCell>
                    <TableCell className="py-4 text-[12px] font-black text-primary uppercase border-r border-primary/5">{row.assetName}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary border-r border-primary/5">{formatCurrency(row.purchasePrice)}</TableCell>
                    <TableCell className="py-4 text-center text-[12px] font-bold text-primary/60 border-r border-primary/5">{row.usefulLife}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] font-bold text-primary bg-primary/5 border-r border-primary/5">{formatCurrency(row.accumulated2020)}</TableCell>
                    <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.jan)}</TableCell>
                    <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.feb)}</TableCell>
                    <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.mar)}</TableCell>
                    <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.apr)}</TableCell>
                    <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.may)}</TableCell>
                    <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.jun)}</TableCell>
                    <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.jul)}</TableCell>
                    <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.aug)}</TableCell>
                    <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.sep)}</TableCell>
                    <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.oct)}</TableCell>
                    <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.nov)}</TableCell>
                    <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic border-r border-primary/5">{formatCurrency(row.dec)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] bg-primary/5 border-r border-primary/5 font-black text-primary">{formatCurrency(row.total2021)}</TableCell>
                    <TableCell className="py-4 text-right text-[12px] bg-primary/5 border-r border-primary/5 font-black text-primary">{formatCurrency(row.accumulated2021)}</TableCell>
                    <TableCell className="pr-8 py-4 text-right text-[12px] font-black text-secondary bg-secondary/5">{formatCurrency(row.bookValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls meta={(assetsResponse as any)?.meta} onPageChange={setAssetsPage} isFetching={assetsLoading} />
        </TabsContent>


        <TabsContent value="pl" className="mt-0">
          <div className="space-y-12">


          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4">
               <div className="w-1.5 h-6 bg-secondary rounded-full"></div>
               <h3 className="text-xl font-black uppercase tracking-tight text-primary">SALES REVENUE DETAILS</h3>
            </div>
            <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-premium border border-primary/5 overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader className="bg-primary/5">
                  <TableRow className="hover:bg-transparent border-primary/5 h-12 whitespace-nowrap">
                    <TableHead className="pl-8 text-[11px] font-black uppercase tracking-tight text-primary w-16 border-r border-primary/10">NO</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-tight text-primary w-64 border-r border-primary/10">ACCOUNT NAME</TableHead>
                    <TableHead className="text-right text-[11px] font-black uppercase tracking-tight text-primary w-32">GROSS</TableHead>
                    <TableHead className="text-right text-[11px] font-black uppercase tracking-tight text-orange-600 w-32">VAT</TableHead>
                    <TableHead className="text-right text-[11px] font-black uppercase tracking-tight text-orange-400 w-32 border-r border-primary/10">AP VAT</TableHead>
                    <TableHead className="pr-8 text-right text-[11px] font-black uppercase tracking-tight text-secondary bg-secondary/5 w-44">NET SALES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Processing Revenue Data...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : ((plResponse as any)?.data || []).map((row: any, i: number) => (
                    <Dialog key={`pl-sales-${row.id}`}>
                      <DialogTrigger asChild>
                        <TableRow className="hover:bg-secondary/5 border-primary/5 transition-colors cursor-pointer group active:scale-[0.99]">
                          <TableCell className="pl-8 py-3 font-bold text-[12px] text-primary border-r border-primary/5">{i+1}</TableCell>
                          <TableCell className="py-3 font-black text-primary text-[12px] uppercase border-r border-primary/5 group-hover:text-secondary transition-colors">
                             <div className="flex items-center gap-2">
                                {row.accountName}
                                <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-all text-secondary" />
                             </div>
                          </TableCell>
                          <TableCell className="py-3 text-right text-[12px] font-bold text-primary">{formatCurrency(row.gross)}</TableCell>
                          <TableCell className="py-3 text-right text-[12px] font-bold text-orange-600">{formatCurrency(row.vat)}</TableCell>
                          <TableCell className="py-3 text-right text-[12px] font-bold text-orange-400 border-r border-primary/5">{formatCurrency(row.apVat)}</TableCell>
                          <TableCell className="pr-8 py-3 text-right text-[12px] font-black text-secondary bg-secondary/5">{formatCurrency(row.netSales)}</TableCell>
                        </TableRow>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] w-full bg-white/95 backdrop-blur-2xl border-white/20 shadow-premium rounded-[2.5rem] p-0 overflow-y-auto max-h-[90vh] ring-1 ring-black/5 animate-in zoom-in-95 duration-300">
                        <DialogHeader className="p-10 border-b border-primary/5 bg-white/40 sticky top-0 z-10 backdrop-blur-md">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary group">
                                   <Package size={24} className="group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="space-y-1">
                                   <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-primary">REVENUE DRILL-DOWN</DialogTitle>
                                   <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Sourcing ledger matches for: <span className="text-secondary">{row.accountName}</span></p>
                                </div>
                             </div>
                             <Badge variant="outline" className="h-8 px-4 rounded-full bg-primary/5 text-primary border-primary/10 font-bold uppercase tracking-widest text-[11px]">AUDITED DATA</Badge>
                          </div>
                        </DialogHeader>
                        
                        <div className="p-10 bg-white/20">
                           <div className="bg-white/50 backdrop-blur-sm rounded-3xl border border-primary/5 shadow-inner-lg overflow-x-auto overflow-y-visible">
                              <Table className="min-w-[1400px]">

                                <TableHeader className="bg-primary/5">
                                  <TableRow className="hover:bg-transparent border-primary/5 h-14">
                                    <TableHead className="pl-8 text-[11px] font-black uppercase tracking-tight text-primary w-28 border-r border-primary/5 text-center">DATE</TableHead>
                                    <TableHead className="text-[11px] font-black uppercase tracking-tight text-primary w-24 border-r border-primary/5 text-center">BANK REF</TableHead>
                                    <TableHead className="text-[11px] font-black uppercase tracking-tight text-primary w-48 border-r border-primary/5">BILLING RECIPIENT</TableHead>
                                    <TableHead className="text-[11px] font-black uppercase tracking-tight text-primary w-48 border-r border-primary/5">PROJECT</TableHead>
                                    <TableHead className="text-[11px] font-black uppercase tracking-tight text-primary border-r border-primary/5">DESCRIPTION</TableHead>
                                    <TableHead className="text-right text-[11px] font-black uppercase tracking-tight text-primary w-28 border-r border-primary/5">BASIC PRICE</TableHead>
                                    <TableHead className="text-right text-[11px] font-black uppercase tracking-tight text-secondary w-28 border-r border-primary/5">MGMT FEE</TableHead>
                                    <TableHead className="text-right text-[11px] font-black uppercase tracking-tight text-primary w-24 border-r border-primary/5">PPN</TableHead>
                                    <TableHead className="text-right text-[11px] font-black uppercase tracking-tight text-primary bg-primary/5 w-32 border-r border-primary/5">TOTAL AMOUNT</TableHead>
                                    <TableHead className="text-right text-[11px] font-black uppercase tracking-tight text-red-600 w-32 border-r border-primary/5">OUTSTANDING</TableHead>
                                    <TableHead className="pr-8 text-right text-[11px] font-black uppercase tracking-tight text-emerald-600 bg-emerald-50 w-32">NET RCVD</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {((salesLookup as any)?.data || [])
                                    .filter((s: any) => 
                                      s.project?.toLowerCase().trim().includes(row.accountName?.toLowerCase().trim()) ||
                                      row.accountName?.toLowerCase().trim().includes(s.project?.toLowerCase().trim())
                                    )
                                    .map((s: any, idx: number) => (
                                      <TableRow key={idx} className="border-primary/5 hover:bg-white/80 transition-all duration-300">
                                        <TableCell className="pl-8 py-4 text-[12px] font-bold text-primary/60 border-r border-primary/5 text-center">{s.date}</TableCell>
                                        <TableCell className="py-4 text-[12px] font-bold text-primary/60 border-r border-primary/5 text-center">{s.bankRef || '-'}</TableCell>
                                        <TableCell className="py-4 font-black text-primary text-[12px] uppercase border-r border-primary/5 max-w-[150px] truncate">{s.billingTo || 'GENERAL SALES'}</TableCell>
                                        <TableCell className="py-4 font-bold text-primary/60 text-[12px] uppercase border-r border-primary/5">{s.project}</TableCell>
                                        <TableCell className="py-4 text-[12px] font-bold text-primary/60 border-r border-primary/5 max-w-[200px] truncate">{s.description || '-'}</TableCell>
                                        <TableCell className="py-4 text-right text-[12px] font-bold text-primary border-r border-primary/5">{formatCurrency(s.basicPrice)}</TableCell>
                                        <TableCell className="py-4 text-right text-[12px] font-bold text-secondary border-r border-primary/5 bg-secondary/5">{formatCurrency(s.managementFee)}</TableCell>
                                        <TableCell className="py-4 text-right text-[12px] font-bold text-primary border-r border-primary/5">{formatCurrency(s.ppn)}</TableCell>
                                        <TableCell className="py-4 text-right text-[12px] font-black text-primary bg-primary/5 border-r border-primary/5">{formatCurrency(s.totalAmount)}</TableCell>
                                        <TableCell className="py-4 text-right text-[12px] font-bold text-red-600 border-r border-primary/5">{formatCurrency(s.outstanding)}</TableCell>
                                        <TableCell className="pr-8 py-4 text-right font-black text-emerald-600 text-[12px] bg-emerald-50">{formatCurrency(s.netReceived)}</TableCell>
                                      </TableRow>
                                    ))}
                                  {!((salesLookup as any)?.data || []).some((s: any) => 
                                    s.project?.toLowerCase().trim().includes(row.accountName?.toLowerCase().trim()) ||
                                    row.accountName?.toLowerCase().trim().includes(s.project?.toLowerCase().trim())
                                  ) && (
                                    <TableRow className="hover:bg-transparent">
                                      <TableCell colSpan={11} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                          <Filter size={32} className="text-primary" />
                                          <p className="text-[11px] font-black uppercase tracking-[0.2em] italic max-w-xs leading-relaxed text-primary">
                                            No explicit ledger matches found in the expanded sales dataset.
                                          </p>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                           </div>

                           <div className="mt-8 flex items-center justify-start">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <p className="text-[11px] font-bold text-primary uppercase tracking-widest italic">Live syncing with finance/sales records</p>
                              </div>
                           </div>

                        </div>
                      </DialogContent>

                    </Dialog>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4">
               <div className="w-1.5 h-6 bg-red-600 rounded-full"></div>
               <h3 className="text-xl font-black uppercase tracking-tight text-primary">COST OF GOODS SOLD (COGS)</h3>
            </div>
            <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-premium border border-primary/5 overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader className="bg-primary/5">
                  <TableRow className="hover:bg-transparent border-primary/5 h-12 whitespace-nowrap">
                    <TableHead className="pl-8 text-[11px] font-black uppercase tracking-tight text-primary w-16 border-r border-primary/10">NO</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-tight text-primary w-24 border-r border-primary/10">TYPE</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-tight text-primary w-64 border-r border-primary/10">ACCOUNT NAME</TableHead>
                    <TableHead className="text-right text-[11px] font-black uppercase tracking-tight text-primary w-40 border-r border-primary/10">AMOUNT</TableHead>
                    <TableHead className="pr-8 text-right text-[11px] font-black uppercase tracking-tight text-emerald-600 bg-emerald-50 w-44">GROSS PROFIT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plCostsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Processing Cost Data...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (plCostsResponse?.data || []).map((row: any, i: number) => (
                    <TableRow key={i} className="border-primary/5 hover:bg-primary/5 transition-colors group">
                      <TableCell className="pl-8 py-3 text-[12px] font-bold text-primary border-r border-primary/5">{i+1}</TableCell>
                      <TableCell className="py-3 border-r border-primary/5">
                        <span className={`text-[12px] font-black uppercase px-2 py-0.5 rounded-md ${row.type === 'DIRECT_COST' ? 'bg-orange-50 text-orange-600' : 'bg-primary/5 text-primary'}`}>
                          {row.type}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-[12px] font-black text-primary uppercase border-r border-primary/5">{row.accountName}</TableCell>
                      <TableCell className="py-3 text-right text-[12px] font-bold text-primary border-r border-primary/5">{formatCurrency(row.amount)}</TableCell>
                      <TableCell className="pr-8 py-3 text-right text-[12px] font-black text-emerald-600 bg-emerald-50">{formatCurrency(row.grossProfit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4">
               <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
               <h3 className="text-xl font-black uppercase tracking-tight text-primary">OPERATING EXPENSES</h3>
            </div>
            <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-premium border border-primary/5 overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader className="bg-primary/5">
                  <TableRow className="hover:bg-transparent border-primary/5 h-12 whitespace-nowrap">
                    <TableHead className="pl-8 text-[11px] font-black uppercase tracking-tight text-primary w-16 border-r border-primary/10">NO</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-tight text-primary border-r border-primary/10">DESCRIPTION / SUB-CATEGORY</TableHead>
                    <TableHead className="text-right text-[11px] font-black uppercase tracking-tight text-primary w-24">BCA</TableHead>
                    <TableHead className="text-right text-[11px] font-black uppercase tracking-tight text-primary w-24">MANDIRI</TableHead>
                    <TableHead className="text-right text-[11px] font-black uppercase tracking-tight text-primary w-24 border-r border-primary/10">CASH/OTHER</TableHead>
                    <TableHead className="pr-8 text-right text-[11px] font-black uppercase tracking-tight text-primary bg-primary/10 w-44">TOTAL EXPENSE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {plCostsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Processing Expense Data...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (plCostsResponse?.data || []).filter((c: any) => c.category === 'EXPENSE').map((row: any, i: number) => (
                    <TableRow key={`pl-exp-${row.id}`} className="hover:bg-orange-500/5 border-primary/5 transition-colors whitespace-nowrap">
                      <TableCell className="pl-8 py-3 font-bold text-[12px] text-primary border-r border-primary/5">{i+1}</TableCell>
                      <TableCell className="py-3 border-r border-primary/5">
                          <p className="text-[12px] font-black text-primary uppercase">{row.accountName}</p>
                          {row.subCategory && <p className="text-[11px] font-bold text-primary/60 uppercase tracking-tighter">{row.subCategory}</p>}
                      </TableCell>
                      <TableCell className="py-3 text-right text-[12px] font-bold text-primary">{formatCurrency(row.bca)}</TableCell>
                      <TableCell className="py-3 text-right text-[12px] font-bold text-primary">{formatCurrency(row.mandiri)}</TableCell>
                      <TableCell className="py-3 text-right text-[12px] font-bold text-primary border-r border-primary/5">{formatCurrency(row.other)}</TableCell>
                      <TableCell className="pr-8 py-3 text-right text-[12px] font-black text-primary bg-primary/5">{formatCurrency(row.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-6 pt-12 border-t-2 border-dashed border-primary/10">
             <div className="flex items-center gap-3 px-4">
                <BarChart3 size={24} className="text-secondary" />
                <h3 className="text-xl font-black uppercase tracking-tight text-primary">BOTTOM-LINE FINANCIAL SUMMARY</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
                {plSummaryLoading ? (
                  Array(4).fill(0).map((_, i) => <div key={i} className="h-40 bg-primary/5 animate-pulse rounded-[2.5rem]" />)
                ) : (plSummaryResponse || []).map((sum: any) => (
                   <div key={sum.id} className={`p-8 rounded-[2.5rem] shadow-premium flex flex-col justify-between h-52 transition-transform hover:scale-[1.02] cursor-default ${sum?.label?.includes('PROFIT') ? 'bg-primary text-white' : 'bg-white border border-primary/5'}`}>
                      <div>
                        <p className={`text-[11px] font-black uppercase tracking-[0.2em] mb-2 ${sum?.label?.includes('PROFIT') ? 'text-white' : 'text-primary'}`}>{sum.label || '-'}</p>
                        <h4 className={`text-2xl font-black  leading-tight ${sum?.label?.includes('PROFIT') ? 'text-secondary' : 'text-primary'}`}>{formatCurrency(sum.total)}</h4>
                      </div>
                      <div className="flex items-center justify-between">
                         <div className={`w-12 h-1.5 rounded-full ${sum?.label?.includes('PROFIT') ? 'bg-secondary' : 'bg-primary/20'}`}></div>
                         <Badge className={sum?.label?.includes('PROFIT') ? 'bg-secondary text-primary' : 'bg-primary/5 text-primary'}>AUDITED</Badge>
                      </div>
                   </div>
                ))}
            </div>
          </div>
        </div>
        </TabsContent>


        <TabsContent value="bs" className="mt-0 space-y-8 pb-20 px-4 md:px-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-primary">PANCONVINCE MITRA INTERNATIONAL</h2>
            <div className="text-right">
              <p className="text-xs font-black text-secondary uppercase tracking-widest">BALANCE SHEET AS OF 31-DEC-2021</p>
              <p className="text-[10px] font-bold text-primary uppercase">Currency: IDR & USD</p>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] shadow-premium border border-primary/5 overflow-hidden">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent border-primary/5 h-14">
                  <TableHead className="pl-10 text-[11px] font-black uppercase tracking-tight text-primary w-2/5">ASSETS</TableHead>
                  <TableHead className="text-right text-[11px] font-black uppercase tracking-tight text-primary w-1/5">IDR</TableHead>
                  <TableHead className="text-right text-[11px] font-black uppercase tracking-tight text-primary w-1/5">USD</TableHead>
                  <TableHead className="pr-10 text-right text-[11px] font-black uppercase tracking-tight text-secondary w-1/5">Total (IDR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Processing Balance Sheet Data...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (() => {
                  const data = bsResponse?.data || [];
                  
                   const renderRow = (label: string, idr: any = null, usd: any = null, total: any = null, type: 'header' | 'group' | 'account' | 'total' = 'account') => {
                    const isSum = type === 'total' || type === 'header';
                    const numIdr = idr === null ? null : (Number(idr) || 0);
                    const numUsd = usd === null ? null : (Number(usd) || 0);
                    
                    const calcIdr = numIdr === null ? 0 : numIdr;
                    const calcUsd = numUsd === null ? 0 : numUsd;
                    const numTotal = total === null ? (calcIdr + (calcUsd * 14500)) : (Number(total) || 0);

                    const isBank = (label: string) => ['CITIBANK', 'MANDIRI', 'BCA', 'DANAMON', 'BNI', 'BRI', 'BTN'].includes(label.toUpperCase());
                    const canDrillDown = type === 'account' && isBank(label);

                    return (
                      <TableRow 
                        className={`border-primary/5 transition-colors ${isSum ? 'bg-primary/5' : ''} ${canDrillDown ? 'hover:bg-secondary/5 cursor-pointer group' : 'hover:bg-primary/5'}`}
                        onClick={() => {
                          if (canDrillDown) {
                            const account = internalAccounts.find((a: any) => 
                              (a.bank?.bankBrand || a.holderName || "").toUpperCase() === label.toUpperCase()
                            );
                            if (account) {
                              setSelectedBankId(account.id);
                              setSelectedBankLabel(label);
                              setBankPage(1);
                              setIsBankModalOpen(true);
                            } else {
                              console.warn(`Could not find internal account for label: ${label}`);
                            }
                          }
                        }}
                      >
                        <TableCell className={`py-4 font-black uppercase tracking-tight border-r border-primary/5 ${
                          type === 'header' ? 'text-[11px] text-primary pl-10' : 
                          type === 'group' ? 'text-[12px] text-primary pl-14 font-black' : 
                          'text-[12px] text-primary pl-20 font-bold'
                        }`}>
                          <div className="flex items-center gap-2">
                            {label}
                            {canDrillDown && <ArrowUpRight size={14} className="text-secondary opacity-100 transition-all font-black" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-[12px] font-bold text-primary border-r border-primary/5">
                          {numIdr !== null ? (numIdr === 0 ? '-' : formatCurrencyNoSymbol(numIdr)) : ''}
                        </TableCell>
                        <TableCell className="text-right text-[12px] font-bold text-primary border-r border-primary/5">
                          {numUsd !== null ? (numUsd === 0 ? '-' : formatCurrencyNoSymbol(numUsd)) : ''}
                        </TableCell>
                        <TableCell className={`pr-10 text-right ${isSum ? 'text-[12px] font-black text-secondary' : 'text-[12px] text-primary font-black'}`}>
                          {numTotal !== 0 ? formatCurrencyNoSymbol(numTotal) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  };


                  const formatCurrencyNoSymbol = (val: number) => {
                    return new Intl.NumberFormat('id-ID', { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2 
                    }).format(val);
                  };

          const findVal = (name: string, field: 'idr' | 'usd' = 'idr') => {
            const item = (data as any[]).find((d: any) => d.accountName?.toLowerCase().includes(name.toLowerCase()));
            return item ? Number(item[field]) || 0 : 0;
          };

                  const sumGroup = (names: string[], field: 'idr' | 'usd' = 'idr') => {
                    return names.reduce((acc, name) => acc + findVal(name, field), 0);
                  };

                  const cashGroup = ['Cash IDR', 'Cash Other Currency'];
                  const bankGroup = ['Citibank', 'Mandiri', 'BCA', 'Danamon', 'BNI', 'BRI', 'BTN'];
                  const arGroup = ['AR Cash Advance', 'AR Refund', 'AR Staff Loan', 'AR Temporary Notes', 'AR Trade', 'AR Others'];
                  const prepaidTaxGroup = ['PPh-23', 'PPN', 'PPh-25 and PPh-29'];
                  const fixedAssetsGroup = ['Office Equipment', 'Vehicle', 'Intangible property', 'Depreciation & Amortization'];

                  const totalCashIdr = sumGroup(cashGroup, 'idr');
                  const totalBankIdr = sumGroup(bankGroup, 'idr');
                  const totalDepositIdr = findVal('Deposit to vendor', 'idr');
                  const totalArIdr = sumGroup(arGroup, 'idr');
                  const totalTaxIdr = sumGroup(prepaidTaxGroup, 'idr');
                  const totalCurrentAssetsIdr = totalCashIdr + totalBankIdr + totalDepositIdr + totalArIdr + totalTaxIdr;
                  const totalFixedAssetsIdr = sumGroup(fixedAssetsGroup, 'idr');

                  return (
                    <>
                      {renderRow('Current Assets', null, null, null, 'header')}
                      {renderRow('CASH', null, null, null, 'group')}
                      {renderRow('Cash IDR', findVal('Cash IDR'), findVal('Cash IDR', 'usd'))}
                      {renderRow('Cash Other Currency', findVal('Cash Other Currency'), findVal('Cash Other Currency', 'usd'))}
                      {renderRow('BANK', null, null, null, 'group')}
                      {renderRow('Citibank', findVal('Citibank'), findVal('Citibank', 'usd'))}
                      {renderRow('Mandiri', findVal('Mandiri'), findVal('Mandiri', 'usd'))}
                      {renderRow('BCA', findVal('BCA'), findVal('BCA', 'usd'))}
                      {renderRow('Danamon', findVal('Danamon'), findVal('Danamon', 'usd'))}
                      {renderRow('BRI', findVal('BRI'), findVal('BRI', 'usd'))}
                      {renderRow('BTN', findVal('BTN'), findVal('BTN', 'usd'))}
                      {renderRow('DEPOSIT', null, null, null, 'group')}
                      {renderRow('Deposit to vendor', findVal('Deposit to vendor'), findVal('Deposit to vendor', 'usd'))}
                      {renderRow('ACCOUNT RECEIVABLE', null, null, null, 'group')}
                      {renderRow('AR Cash Advance', findVal('AR Cash Advance'), findVal('AR Cash Advance', 'usd'))}
                      {renderRow('AR Refund', findVal('AR Refund'), findVal('AR Refund', 'usd'))}
                      {renderRow('AR Staff Loan', findVal('AR Staff Loan'), findVal('AR Staff Loan', 'usd'))}
                      {renderRow('AR Trade', findVal('AR Trade'), findVal('AR Trade', 'usd'))}
                      {renderRow('PREPAID TAX', null, null, null, 'group')}
                      {renderRow('PPN', findVal('PPN'), findVal('PPN', 'usd'))}
                      {renderRow('Total Current Assets', totalCurrentAssetsIdr, 0, totalCurrentAssetsIdr, 'total')}
                      <TableRow className="bg-primary/5 h-2" />
                      {renderRow('Fixed Assets', null, null, null, 'header')}
                      {renderRow('Office Equipment', findVal('Office Equipment'))}
                      {renderRow('Vehicle', findVal('Vehicle'))}
                      {renderRow('Total Fixed Assets', totalFixedAssetsIdr, 0, totalFixedAssetsIdr, 'total')}
                      <TableRow className="bg-primary h-12">
                        <TableCell className="pl-10 text-white font-black uppercase text-[14px]">TOTAL ASSETS</TableCell>
                        <TableCell className="text-right text-white text-[11px]">-</TableCell>
                        <TableCell className="text-right text-white text-[11px]">-</TableCell>
                        <TableCell className="pr-10 text-right text-secondary font-black text-[18px]">
                          {formatCurrencyNoSymbol(totalCurrentAssetsIdr + totalFixedAssetsIdr)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="h-12" />
                      <TableRow className="bg-primary/5">
                        <TableHead className="pl-10 text-[11px] font-black uppercase text-primary">LIABILITIES & EQUITY</TableHead>
                        <TableHead className="text-right text-primary text-[10px]">IDR</TableHead>
                        <TableHead className="text-right text-primary text-[10px]">USD</TableHead>
                        <TableHead className="pr-10 text-right text-secondary text-[10px]">TOTAL (IDR)</TableHead>
                      </TableRow>
                      {renderRow('Current Liabilities', null, null, null, 'header')}
                      {renderRow('ACCOUNT PAYABLE', findVal('AP Expense') + findVal('AP Trade') + findVal('AP Tax'), 0, null, 'group')}
                      {renderRow('AP Trade', findVal('AP Trade'))}
                      {renderRow('AP Expense', findVal('AP Expense'))}
                      {renderRow('AP Tax', findVal('AP Tax'))}
                      {renderRow('DEPOSIT', findVal('Deposit from customer'), 0, null, 'group')}
                      {renderRow('Deposit from customer', findVal('Deposit from customer'))}
                      {renderRow('Total Liabilities', findVal('AP Expense') + findVal('AP Trade') + findVal('AP Tax') + findVal('Deposit from customer'), 0, null, 'total')}
                      <TableRow className="h-8" />
                      {renderRow('EQUITY', null, null, null, 'header')}
                      {renderRow('Shared Capital', 500000000)}
                      {renderRow('Retained Earnings', findVal('Retained Earnings'))}
                      {renderRow('Profit (Loss) 2021', findVal('Profit'))}
                      {renderRow('Total Equity', findVal('Shared Capital') + findVal('Retained Earnings') + findVal('Profit'), 0, null, 'total')}
                      <TableRow className="bg-primary h-12">
                        <TableCell className="pl-10 text-white font-black uppercase text-[12px]">LIABILITIES & EQUITY</TableCell>
                        <TableCell className="text-right text-white text-[12px] font-bold">-</TableCell>
                        <TableCell className="text-right text-white text-[12px] font-bold">-</TableCell>
                        <TableCell className="pr-10 text-right text-secondary font-black text-[14px]">
                           {formatCurrencyNoSymbol(totalCurrentAssetsIdr + totalFixedAssetsIdr)}
                        </TableCell>
                      </TableRow>
                    </>
                  );
                })()}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="ia" className="mt-0">
          <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-premium border border-primary/5 overflow-x-auto">
            <Table className="min-w-[1500px]">
              <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent border-primary/5 h-12 whitespace-nowrap">
                  <TableHead className="pl-8 text-[11px] font-black uppercase tracking-tight text-primary w-12 border-r border-primary/10">NO</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-tight text-primary w-48 border-r border-primary/10">DESC</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-primary">BCA 80</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-primary">MANDIRI 44</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-primary">BRI 87</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-primary">Cash IDR</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-primary">Non CB</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-primary">CITI USD</TableHead>
                  <TableHead className="pr-8 text-right text-[11px] font-black text-secondary bg-secondary/5">Cash USD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {iaLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Processing Account Reconciliation Data...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (iaResponse?.data || []).map((row: any) => (
                  <TableRow key={row.id} className="border-primary/5 hover:bg-primary/5 transition-colors whitespace-nowrap">
                    <TableCell className="pl-8 py-5 text-[12px] font-bold text-primary border-r border-primary/5">{row.no}</TableCell>
                    <TableCell className="py-5 font-black text-primary/60 text-[12px] uppercase border-r border-primary/5">{row.description}</TableCell>
                    <TableCell className="py-5 text-right text-[12px] font-bold text-primary">{formatCurrency(row.bca)}</TableCell>
                    <TableCell className="py-5 text-right text-[12px] font-bold text-primary">{formatCurrency(row.mandiri)}</TableCell>
                    <TableCell className="py-5 text-right text-[12px] font-bold text-primary">{formatCurrency(row.bri)}</TableCell>
                    <TableCell className="py-5 text-right text-[12px] font-bold text-primary">{formatCurrency(row.cashIdr)}</TableCell>
                    <TableCell className="py-5 text-right text-[12px] font-bold text-primary">{formatCurrency(row.nonCb)}</TableCell>
                    <TableCell className="py-5 text-right text-[12px] font-bold text-primary">{formatCurrency(row.citiUsd)}</TableCell>
                    <TableCell className="pr-8 py-5 text-right text-[12px] font-black text-secondary bg-secondary/5">{formatCurrency(row.cashUsd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls meta={(iaResponse as any)?.meta} onPageChange={setIaPage} isFetching={iaLoading} />
        </TabsContent>

      </Tabs>

      <Dialog open={isBankModalOpen} onOpenChange={setIsBankModalOpen}>
        <DialogContent className="max-w-[95vw] w-full bg-white/95 backdrop-blur-2xl border-white/20 shadow-premium rounded-[2.5rem] p-0 overflow-y-auto max-h-[90vh] ring-1 ring-black/5">
          <DialogHeader className="p-10 border-b border-primary/5 bg-white/40 sticky top-0 z-10 backdrop-blur-md">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary group">
                     <Landmark size={24} className="group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                     <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-primary">{selectedBankLabel} LEDGER</DialogTitle>
                     <p className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] mt-1">Audit Drill-down: Transactional Fidelity for <span className="text-secondary">{selectedBankLabel}</span></p>
                  </div>
               </div>
               <Badge variant="outline" className="h-8 px-4 rounded-full bg-secondary/10 text-secondary border-secondary/20 font-black uppercase tracking-widest text-[10px]">REAL-TIME RECONCILIATION</Badge>
            </div>
          </DialogHeader>
          
          <div className="p-10 space-y-6">
             <div className="bg-white/50 backdrop-blur-sm rounded-3xl border border-primary/5 shadow-inner-lg overflow-x-auto">
                <Table className="min-w-[1600px]">
                  <TableHeader className="bg-primary/5">
                    <TableRow className="hover:bg-transparent border-primary/5 h-14">
                      <TableHead className="pl-8 text-[11px] font-black uppercase tracking-widest text-primary w-28 text-center ring-1 ring-primary/5">Tanggal</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-widest text-primary ring-1 ring-primary/5">Keterangan Transaksi</TableHead>
                      <TableHead className="text-right text-[11px] font-black uppercase tracking-widest text-primary w-32 ring-1 ring-primary/5">Debet</TableHead>
                      <TableHead className="text-right text-[11px] font-black uppercase tracking-widest text-primary w-32 ring-1 ring-primary/5">Kredit</TableHead>
                      <TableHead className="text-right text-[11px] font-black uppercase tracking-widest text-primary w-44 ring-1 ring-primary/5">Ledger</TableHead>
                      <TableHead className="text-left text-[11px] font-black uppercase tracking-widest text-primary w-40 ring-1 ring-primary/5">Sub Ledger - 1</TableHead>
                      <TableHead className="text-left text-[11px] font-black uppercase tracking-widest text-primary w-40 ring-1 ring-primary/5">Sub Ledger - 2</TableHead>
                      <TableHead className="pr-8 text-left text-[11px] font-black uppercase tracking-widest text-primary w-40 ring-1 ring-primary/5">Sub Ledger - 3</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankTxsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center gap-4">
                            <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Processing Bank Transaction Data...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (bankTxsResponse?.data || []).length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="h-48 text-center text-primary font-bold uppercase text-[10px]">No transaction history found for {selectedBankLabel}</TableCell></TableRow>
                    ) : (bankTxsResponse?.data || []).map((row: any) => (
                      <TableRow key={row.id} className="border-primary/5 hover:bg-primary/5 transition-colors whitespace-nowrap">
                        <TableCell className="pl-8 py-4 font-bold text-[12px] text-primary">{formatDate(row.date)}</TableCell>
                        <TableCell className="py-4 text-[12px] font-bold text-primary/60 max-w-md truncate">{row.description}</TableCell>
                        <TableCell className="py-4 text-right font-black text-red-600 text-[12px]">
                           {row.withdrawal && Number(row.withdrawal) !== 0 ? formatCurrency(row.withdrawal) : "-"}
                        </TableCell>
                        <TableCell className="py-4 text-right font-black text-emerald-600 text-[12px]">
                          {row.deposit && Number(row.deposit) !== 0 ? formatCurrency(row.deposit) : "-"}
                        </TableCell>
                        <TableCell className="py-4 text-right border-r border-primary/5 pr-4 text-[12px] font-black text-primary">
                            {row.ledger ? formatCurrency(row.ledger) : "-"}
                        </TableCell>
                        <TableCell className="py-4 text-left border-r border-primary/5 pl-4 text-[12px] font-black text-primary uppercase tracking-tighter">
                          {row.subLedger1 || row.subCategory || "-"}
                        </TableCell>
                        <TableCell className="py-4 text-left font-bold text-[12px] text-primary uppercase truncate max-w-[150px] border-r border-primary/5 pl-4">
                          {row.subLedger2 || "-"}
                        </TableCell>
                        <TableCell className="pr-8 py-4 text-left font-bold text-[12px] text-primary uppercase truncate max-w-[150px] pl-4">
                          {row.subLedger3 || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             </div>

             <div className="flex items-center justify-between px-2 pt-4">
                <p className="text-[11px] font-black text-primary uppercase tracking-widest">
                   Page <span className="text-secondary">{bankTxsResponse?.meta?.page || 1}</span> of <span className="text-primary">{bankTxsResponse?.meta?.lastPage || 1}</span>
                </p>
                <div className="flex gap-2">
                   <button 
                     disabled={bankPage === 1}
                     onClick={() => setBankPage(p => Math.max(1, p - 1))}
                     className="px-4 py-2 rounded-xl bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 disabled:opacity-30 disabled:pointer-events-none transition-colors border border-primary/5"
                   >
                     Previous
                   </button>
                   <button 
                     disabled={bankPage >= (bankTxsResponse?.meta?.lastPage || 1)}
                     onClick={() => setBankPage(p => p + 1)}
                     className="px-4 py-2 rounded-xl bg-secondary text-white text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-secondary/20 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-md"
                   >
                     Next Page
                   </button>
                </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
