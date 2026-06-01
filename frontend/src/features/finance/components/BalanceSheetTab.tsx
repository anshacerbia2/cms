import { useState, useEffect, useMemo } from "react";
import { formatCurrency, getAmountColor, cn, formatDate } from "@/lib/utils";
import { useFinance } from "../hooks/useFinance";
import { useExcelFilter } from "../hooks/useExcelFilter";
import { ExcelColumnFilter } from "./ExcelColumnFilter";
import EquityPropertiesModal from "./EquityPropertiesModal";
import { Card, CardContent } from "@/components/ui/card";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  ShieldCheck, 
  Scale, 
  ChevronDown, 
  ArrowUpRight,
  Activity,
  Zap,
  Eye,
  Loader2,
  History, Plus, Info,
  Calendar as CalendarIcon
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export function BalanceSheetTab() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const { getBalanceSheet, getBSDetails } = useFinance();
  
  // Year for UI Display only
  const displayYear = selectedDate ? selectedDate.getFullYear().toString() : new Date().getFullYear().toString();

  const { data: bsData, isLoading } = getBalanceSheet(
    selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined
  );

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEquityModalOpen, setIsEquityModalOpen] = useState(false);
  
  // Drill-down state
  const [drillDown, setDrillDown] = useState<{
    isOpen: boolean;
    category?: string;
    subItem?: string;
    accountId?: string;
    total?: number;
    isLiability?: boolean;
  }>({ isOpen: false });

  const { data: detailData, isLoading: isLoadingDetails } = getBSDetails(
    drillDown.category!,
    drillDown.subItem,
    selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined,
    drillDown.accountId,
    { enabled: drillDown.isOpen }
  );

  const isCashOrBank = drillDown.category === 'Cash' || drillDown.category === 'Bank Accounts';
  const isARorTax = drillDown.category === 'Account Receivable' || drillDown.category === 'Deposit' || drillDown.category === 'Prepaid Tax';
  const isFixedAsset = drillDown.category === 'Fixed Assets';
  const displayDetails = useMemo(() => {
    if (!detailData || detailData.length === 0) return { body: [], footer: null };
    if (!isCashOrBank) return { body: detailData, footer: null };
    return {
      body: detailData.slice(0, -1),
      footer: detailData[detailData.length - 1]
    };
  }, [detailData, isCashOrBank]);

  const normalizedDetails = useMemo(() => {
    return (displayDetails.body || []).map((row: any) => {
      if (isARorTax || drillDown.isLiability) {
        return { 
          ...row, 
          f_col1: row.colC, 
          f_col2: row.colE, 
          f_col3: formatCurrency(row.colR) 
        };
      }
      if (isFixedAsset) {
        return { 
          ...row, 
          f_col1: formatDate(row.purchaseDate), 
          f_col2: row.assetName, 
          f_col3: formatCurrency(row.purchasePrice) 
        };
      }
      const date = row.colA || row.date || row.createdAt;
      const reference = row.colF || row.type || row.category || '-';
      const description = isCashOrBank ? (row.colB || '-') : (row.colE || row.colB || row.description || '-');
      const amount = isCashOrBank ? row.colE : (row.colR || row.colD || row.amount || row.idr || 0);
      return { 
        ...row, 
        f_col1: formatDate(date), 
        f_col2: reference, 
        f_col3: description, 
        f_col4: formatCurrency(amount) 
      };
    });
  }, [displayDetails.body, isARorTax, isFixedAsset, isCashOrBank, drillDown.isLiability]);

  const { 
    search: bsSearch, 
    filters: bsFilters, 
    setFilters: setBsFilters, 
    sort: bsSort, 
    setSort: setBsSort, 
    getCascadingData: getBsCascadingData, 
    filteredAndSortedData: filteredBsDetails,
    clearFilters: clearBsFilters
  } = useExcelFilter({
    data: normalizedDetails,
    searchFields: ['f_col1', 'f_col2', 'f_col3', 'f_col4']
  });

  useEffect(() => {
    if (bsData && !isInitialized) {
      const initial: Record<string, boolean> = {};
      // Initialize accordion state directly from backend's isOpen flag
      bsData.assets?.categories?.forEach((c: any) => {
        if (c.isOpen) initial[`assets-${c.name}`] = true;
      });
      bsData.liabilities?.categories?.forEach((c: any) => {
        if (c.isOpen) initial[`liabilities-${c.name}`] = true;
      });
      bsData.equity?.categories?.forEach((c: any) => {
        if (c.isOpen) initial[`equity-${c.name}`] = true;
      });
      setOpenSections(initial);
      setIsInitialized(true);
    }
  }, [bsData, isInitialized]);

  const toggleSection = (section: string, name: string) => {
    const key = `${section}-${name}`;
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const summary = bsData?.summary || {
    totalAssets: "0",
    totalLiabilities: "0",
    totalEquity: "0",
    workingCapital: "0",
    currentRatio: "0.00",
    deRatio: "0.00",
    isBalanced: true
  };

  const charts = bsData?.charts || {
    assetComposition: [],
    liabilityEquityComposition: [],
    trend: []
  };

  const assetCategories = bsData?.assets?.categories || [];
  const liabilityCategories = bsData?.liabilities?.categories || [];
  const equityCategories = bsData?.equity?.categories || [];
  
  

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  const summaryCards = [
    { 
      title: "TOTAL ASSETS", 
      value: formatCurrency(summary.totalAssets), 
      subValue: "Cash, Bank, AR, Tax, & Fixed Assets", 
      icon: TrendingUp, 
      color: "text-indigo-500",
      bg: "bg-indigo-50/50"
    },
    { 
      title: "LIABILITIES", 
      value: formatCurrency(summary.totalLiabilities), 
      subValue: "Account Payable & Short-term Loans", 
      icon: Activity, 
      color: "text-rose-500",
      bg: "bg-rose-50/50"
    },
    { 
      title: "TOTAL EQUITY", 
      value: formatCurrency(summary.totalEquity), 
      subValue: "Capital & Retained Earnings", 
      icon: Scale, 
      color: "text-emerald-500",
      bg: "bg-emerald-50/50"
    },
    { 
      title: "WORKING CAPITAL", 
      value: formatCurrency(summary.workingCapital), 
      subValue: "Current Assets minus Current Liabilities", 
      icon: Zap, 
      color: "text-amber-500",
      bg: "bg-amber-50/50"
    }
  ];

  if (isLoading && !bsData) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-4 opacity-40 animate-pulse">
        <Activity className="w-12 h-12 text-primary animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Synchronizing Balance Sheet...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-white/10 backdrop-blur-[1px] flex items-center justify-center rounded-xl pointer-events-none">
          <Loader2 className="w-6 h-6 text-primary animate-spin opacity-20" />
        </div>
      )}

      {/* Premium Navigation Bar */}
      <div className="flex items-center justify-between bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="flex items-center gap-3 pl-2">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary/60 border border-primary/5 shadow-inner shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div className="flex flex-col justify-center">
            <h3 className="text-[13px] font-bold text-primary leading-none uppercase">
              Balance Sheet — FY {displayYear}
            </h3>
            <p className="text-[11px] text-primary/40 uppercase tracking-widest mt-1.5">
              Snapshot of financial position · Real-time Cumulative Balance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 mr-4">
          <Button
            variant="ghost"
            onClick={() => setIsEquityModalOpen(true)}
            className="h-12 px-5 rounded-xl border border-primary/5 bg-white shadow-sm flex items-center gap-2 text-primary/60 hover:text-primary transition-all active:scale-95"
            title="Equity Settings"
          >
            <ShieldCheck size={18} />
            <span className="text-[11px] font-black uppercase tracking-widest">Equity Settings</span>
          </Button>

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
                  {selectedDate ? format(selectedDate, "PPP") : <span>As of Today</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 shadow-premium border-primary/5 overflow-hidden" align="end">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
      
      {/* Top Status Bar — temporarily hidden */}
      <div className="hidden flex items-center justify-between bg-white/70 backdrop-blur-md p-3 px-6 rounded-2xl border border-primary/5 shadow-premium">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse", summary.isBalanced ? "bg-emerald-500" : "bg-rose-500")} />
            <span className="text-[11px] font-black uppercase tracking-widest text-primary/70">
              {summary.isBalanced ? "Books Balanced" : "Balance Mismatch Detected"}
            </span>
          </div>
          <div className="h-4 w-px bg-primary/10 mx-2" />
          <p className="text-[11px] font-bold text-primary/40 uppercase tracking-tight whitespace-nowrap">
            Assets <span className="text-primary/70">{formatCurrency(summary.totalAssets)}</span> = L&E <span className="text-primary/70">{formatCurrency(Number(summary.totalLiabilities) + Number(summary.totalEquity))}</span>
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-primary/30 uppercase tracking-widest">Current Ratio</span>
            <span className="text-[13px] font-black text-primary">{summary.currentRatio}x</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-primary/30 uppercase tracking-widest">D/E Ratio</span>
            <span className="text-[13px] font-black text-primary">{summary.deRatio}x</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-primary/30 uppercase tracking-widest">FX Rate</span>
            <span className="text-[13px] font-black text-primary">14.500 <span className="text-[10px] text-primary/40 font-bold uppercase ml-1">IDR/USD</span></span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <Card key={i} className="bg-white/70 backdrop-blur-md border-primary/5 shadow-premium overflow-hidden group transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-black text-primary/40 tracking-widest uppercase">{card.title}</p>
                <div className={cn("p-2 rounded-xl transition-transform group-hover:scale-110", card.bg)}>
                  <card.icon className={cn("w-4 h-4", card.color)} />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-primary tracking-tight whitespace-nowrap">
                  {card.value}
                </h3>
                <div className="flex items-center gap-1.5">
                  {i < 3 ? (
                    <ArrowUpRight size={12} className="text-emerald-500" />
                  ) : (
                    <Zap size={12} className="text-amber-500" />
                  )}
                  <p className="text-[10px] font-bold text-primary/40 uppercase tracking-wider">
                    {card.subValue}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="hidden grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Position Trend */}
        <Card className="lg:col-span-2 bg-white/70 backdrop-blur-md border-primary/5 shadow-premium">
          <CardContent className="p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-[15px] font-black text-primary uppercase tracking-widest">Position Trend</h3>
                <p className="text-[11px] text-primary/40 uppercase font-bold mt-1">Quarterly evolution · 2025</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-[10px] font-black uppercase text-primary/50">Assets</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-black uppercase text-primary/50">Liabilities</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black uppercase text-primary/50">Equity</span>
                </div>
              </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.trend}>
                  <defs>
                    <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 900, fill: 'rgba(0,0,0,0.3)'}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 900, fill: 'rgba(0,0,0,0.3)'}}
                    tickFormatter={(val: number) => `Rp ${(val/1e9).toFixed(1)}B`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    itemStyle={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase' }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Area type="monotone" dataKey="assets" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAssets)" />
                  <Area type="monotone" dataKey="liabilities" stroke="#f59e0b" strokeWidth={3} fill="transparent" />
                  <Area type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={3} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Compositions Section */}
        <Card className="bg-white/70 backdrop-blur-md border-primary/5 shadow-premium">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Asset Composition */}
              <div>
                <h3 className="text-[15px] font-black text-primary uppercase tracking-widest mb-1">Asset Composition</h3>
                <p className="text-[11px] text-primary/40 uppercase font-bold mb-6">Allocation of resources</p>
                
                <div className="h-[200px] w-full relative mb-6">
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none translate-y-1">
                    <span className="text-[8px] font-black text-primary/30 uppercase tracking-[0.2em] mb-0.5">Total Assets</span>
                    <span className="text-sm font-black text-primary tabular-nums">
                      {formatCurrency(bsData?.assets?.total).split(',')[0]}
                    </span>
                  </div>

                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.assetComposition}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={6}
                        dataKey="value"
                        stroke="none"
                      >
                        {charts.assetComposition.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {charts.assetComposition.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-[10px] font-bold text-primary/40 uppercase">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-primary/80">
                        {((item.value / (Number(bsData?.assets?.total?.toString().replace(/,/g, '')) || 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* L & E Structure */}
              <div>
                <h3 className="text-[15px] font-black text-primary uppercase tracking-widest mb-1">Financial Structure</h3>
                <p className="text-[11px] text-primary/40 uppercase font-bold mb-6">Liabilities vs Equity</p>
                
                <div className="h-[200px] w-full relative mb-6">
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none translate-y-1">
                    <span className="text-[8px] font-black text-primary/30 uppercase tracking-[0.2em] mb-0.5">Solvency</span>
                    <span className="text-sm font-black text-primary tabular-nums">
                      {summary.deRatio}x
                    </span>
                  </div>

                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.liabilityEquityComposition}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={6}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill="#f59e0b" /> {/* Liabilities */}
                        <Cell fill="#10b981" /> {/* Equity */}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {charts.liabilityEquityComposition.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: i === 0 ? "#f59e0b" : "#10b981" }} />
                        <span className="text-[10px] font-bold text-primary/40 uppercase">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-primary/80">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Two-Column Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Column: Assets + Summary */}
        <div className="space-y-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-premium overflow-hidden">
            {/* Section Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-slate-900">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <h4 className="text-[15px] font-bold text-white tracking-tight">Assets</h4>
              </div>
              <span className="text-[16px] font-black text-white tabular-nums whitespace-nowrap">{formatCurrency(bsData?.assets?.total)}</span>
            </div>

            {/* Categories Accordion */}
            <div className="divide-y divide-slate-100">
              {assetCategories.map((group: any, idx: number) => (
                <Collapsible 
                  key={idx} 
                  open={openSections[`assets-${group.name}`]} 
                  onOpenChange={() => toggleSection('assets', group.name)}
                >
                  <CollapsibleTrigger 
                    className={cn(
                      "w-full flex items-center justify-between px-6 py-4 transition-colors group",
                      group.items?.length > 0 ? "hover:bg-slate-50/50 cursor-pointer" : "cursor-default pointer-events-none"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-3.5 h-3.5 flex items-center justify-center text-slate-400 transition-transform duration-200 flex-shrink-0",
                        group.items?.length === 0 ? "opacity-0" : (openSections[`assets-${group.name}`] ? "rotate-0" : "-rotate-90")
                      )}>
                        {group.items?.length > 0 && <ChevronDown size={14} />}
                      </div>
                      <span className="text-[13px] font-semibold text-slate-700">{group.name}</span>
                      {group.items?.length > 0 && <span className="text-[11px] font-medium text-slate-400 ml-1">{group.items.length}</span>}
                    </div>
                    <span className="text-[13px] font-bold text-slate-900 tabular-nums whitespace-nowrap">{formatCurrency(group.total)}</span>
                  </CollapsibleTrigger>
                  {group.items?.length > 0 && (
                    <CollapsibleContent>
                      <div className="bg-white px-0 pb-4 space-y-1">
                          {group.items.map((item: any, i: number) => {
                            const isNonClickable = item.accountName.toLowerCase().includes('depreciation');
                            return (
                              <div 
                                key={i} 
                                className={cn(
                                  "flex items-center py-2 group/item px-6 transition-colors",
                                  isNonClickable ? "" : "hover:bg-slate-50 cursor-pointer"
                                )}
                                onClick={() => {
                                  if (isNonClickable) return;
                                  setDrillDown({ 
                                    isOpen: true, 
                                    category: group.name, 
                                    subItem: item.accountName,
                                    accountId: item.accountId,
                                    total: item.idr,
                                    isLiability: false
                                  });
                                }}
                              >
                            <div className="flex items-center gap-2 flex-1 min-w-0 pl-[22px]">
                              <span className="text-[11px] font-medium text-slate-300 w-10 tabular-nums flex-shrink-0">
                                {item.code}
                              </span>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[12px] font-normal text-slate-600 truncate group-hover/item:text-blue-600 transition-colors" title={item.accountName}>
                                  {item.accountName}
                                </span>
                                {!isNonClickable && (
                                  <div className="flex items-center justify-center opacity-60 group-hover/item:opacity-100 group-hover/item:text-blue-600 transition-all text-slate-400">
                                    <Info size={11} />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                              <span className="text-[11px] font-medium text-slate-300 tabular-nums whitespace-nowrap">
                                {item.tx || 0}tx
                              </span>
                              <span className={cn("text-[12px] font-normal tabular-nums w-48 text-right whitespace-nowrap", getAmountColor(item.idr, false))}>
                                {formatCurrency(item.idr)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Liabilities & Equity */}
        <div className="space-y-8">
          {/* Combined Total Equity + Liability Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-premium overflow-hidden">
            {/* Card Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-slate-900">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <h4 className="text-[15px] font-bold text-white tracking-tight">Total Equity + Liability</h4>
              </div>
              <span className="text-[16px] font-black text-emerald-400 tabular-nums whitespace-nowrap">
                {(() => {
                  const l = Number(bsData?.liabilities?.total?.toString().replace(/,/g, '')) || 0;
                  const e = Number(bsData?.equity?.total?.toString().replace(/,/g, '')) || 0;
                  return formatCurrency(l + e);
                })()}
              </span>
            </div>

            {/* Combined Body List */}
            <div className="divide-y divide-slate-100">
              {/* Subsection Header: Liabilities */}
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                  <span className="text-[11px] font-black text-rose-600 uppercase tracking-widest">Liabilities</span>
                </div>
                <span className="text-[12px] font-black text-rose-600 tabular-nums">{formatCurrency(bsData?.liabilities?.total)}</span>
              </div>
              
              {/* Liabilities Categories Accordion */}
              {liabilityCategories.map((group: any, idx: number) => (
                <Collapsible 
                  key={`liab-${idx}`} 
                  open={openSections[`liabilities-${group.name}`]} 
                  onOpenChange={() => toggleSection('liabilities', group.name)}
                >
                  <CollapsibleTrigger 
                    className={cn(
                      "w-full flex items-center justify-between px-6 py-4 transition-colors group",
                      group.items?.length > 0 ? "hover:bg-slate-50/50 cursor-pointer" : "cursor-default pointer-events-none"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-3.5 h-3.5 flex items-center justify-center text-slate-400 transition-transform duration-200 flex-shrink-0",
                        group.items?.length === 0 ? "opacity-0" : (openSections[`liabilities-${group.name}`] ? "rotate-0" : "-rotate-90")
                      )}>
                        {group.items?.length > 0 && <ChevronDown size={14} />}
                      </div>
                      <span className="text-[13px] font-semibold text-slate-700">{group.name}</span>
                      {group.items?.length > 0 && <span className="text-[11px] font-medium text-slate-400 ml-1">{group.items.length}</span>}
                    </div>
                    <span className="text-[13px] font-bold text-rose-600 tabular-nums whitespace-nowrap">{formatCurrency(group.total)}</span>
                  </CollapsibleTrigger>
                  {group.items?.length > 0 && (
                    <CollapsibleContent>
                      <div className="bg-white px-0 pb-4 space-y-1">
                        {group.items.map((item: any, i: number) => (
                          <div 
                            key={i} 
                            className="flex items-center py-2 group/item px-6 hover:bg-rose-50/50 cursor-pointer transition-colors"
                            onClick={() => setDrillDown({ 
                              isOpen: true, 
                              category: group.name, 
                              subItem: item.accountName,
                              accountId: item.accountId,
                              total: item.idr,
                              isLiability: true
                            })}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0 pl-[22px]">
                              <span className="text-[11px] font-medium text-slate-300 w-10 tabular-nums flex-shrink-0">
                                {item.code}
                              </span>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[12px] font-normal text-slate-600 truncate group-hover/item:text-rose-600 transition-colors" title={item.accountName}>
                                  {item.accountName}
                                </span>
                                <div className="flex items-center justify-center opacity-60 group-hover/item:opacity-100 group-hover/item:text-rose-600 transition-all text-slate-400">
                                  <Info size={11} />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                              <span className="text-[11px] font-medium text-slate-300 tabular-nums whitespace-nowrap">
                                {item.tx || 0}tx
                              </span>
                              <span className="text-[12px] font-normal text-rose-600 tabular-nums w-48 text-right whitespace-nowrap">
                                {formatCurrency(item.idr)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              ))}

              {/* Subsection Header: Equity */}
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">Equity</span>
                </div>
                <span className="text-[12px] font-black text-emerald-600 tabular-nums">{formatCurrency(bsData?.equity?.total)}</span>
              </div>

              {/* Equity Categories Accordion */}
              {equityCategories.map((group: any, idx: number) => (
                <Collapsible 
                  key={`eq-${idx}`} 
                  open={openSections[`equity-${group.name}`]} 
                  onOpenChange={() => toggleSection('equity', group.name)}
                >
                  <CollapsibleTrigger 
                    className={cn(
                      "w-full flex items-center justify-between px-6 py-4 transition-colors group",
                      group.items?.length > 0 ? "hover:bg-slate-50/50 cursor-pointer" : "cursor-default pointer-events-none"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-3.5 h-3.5 flex items-center justify-center text-slate-400 transition-transform duration-200 flex-shrink-0",
                        group.items?.length === 0 ? "opacity-0" : (openSections[`equity-${group.name}`] ? "rotate-0" : "-rotate-90")
                      )}>
                        {group.items?.length > 0 && <ChevronDown size={14} />}
                      </div>
                      <span className="text-[13px] font-semibold text-slate-700">{group.name}</span>
                      {group.items?.length > 0 && <span className="text-[11px] font-medium text-slate-400 ml-1">{group.items.length}</span>}
                    </div>
                    <span className="text-[13px] font-black text-emerald-600 tabular-nums whitespace-nowrap">{formatCurrency(group.total)}</span>
                  </CollapsibleTrigger>
                  {group.items?.length > 0 && (
                    <CollapsibleContent>
                      <div className="bg-white px-0 pb-4 space-y-1">
                        {group.items.map((item: any, i: number) => {
                          const isNonClickable = item.accountName === 'Previous years' || item.accountName === 'Dividend' || item.accountName.startsWith('Profit (Loss)');
                          return (
                            <div 
                              key={i} 
                              className={cn(
                                "flex items-center py-2 group/item px-6 transition-colors",
                                isNonClickable ? "" : "hover:bg-emerald-50/50 cursor-pointer"
                              )}
                              onClick={() => {
                                if (isNonClickable) return;
                                const category = group.name === 'Fixed Assets' ? 'Fixed Assets' : 'Equity';
                                setDrillDown({ 
                                  isOpen: true, 
                                  category, 
                                  subItem: item.accountName,
                                  total: item.idr,
                                  isLiability: false
                                });
                              }}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0 pl-[22px]">
                                <span className="text-[11px] font-medium text-slate-300 w-10 tabular-nums flex-shrink-0">
                                  {item.code}
                                </span>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={cn("text-[12px] font-normal text-slate-600 truncate transition-colors", isNonClickable ? "" : "group-hover/item:text-emerald-600")} title={item.accountName}>
                                    {item.accountName}
                                  </span>
                                  {!isNonClickable && (
                                    <div className="flex items-center justify-center opacity-60 group-hover/item:opacity-100 group-hover/item:text-emerald-600 transition-all text-slate-400">
                                      <Info size={11} />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                <span className="text-[11px] font-medium text-slate-300 tabular-nums whitespace-nowrap">
                                  {item.tx || 0}tx
                                </span>
                                <span className="text-[12px] font-normal text-emerald-600 tabular-nums w-48 text-right whitespace-nowrap">
                                  {formatCurrency(item.idr)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Insights Footer */}
      <div className="hidden grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Dynamic Insight based on largest asset */}
        {(() => {
          const sortedAssets = [...charts.assetComposition].sort((a, b) => b.value - a.value);
          const topAsset = sortedAssets[0] || { name: 'Assets', value: 0 };
          return (
            <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-500/10 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <Zap size={20} />
              </div>
              <div>
                <h5 className="text-[11px] font-black text-emerald-700 uppercase tracking-widest mb-1">Insight</h5>
                <p className="text-[12px] font-medium text-emerald-900/70 leading-relaxed">
                  {topAsset.name} is your largest asset at <span className="font-bold text-emerald-800">{formatCurrency(topAsset.value)}</span>. 
                  {topAsset.name === 'AR' ? " Consider tightening collections to further improve your cash position." : " Maintain this liquidity to ensure operational stability."}
                </p>
              </div>
            </div>
          );
        })()}

        <div className="p-6 bg-amber-50/50 rounded-2xl border border-amber-500/10 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
            <Eye size={20} />
          </div>
          <div>
            <h5 className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-1">Watch</h5>
            <p className="text-[12px] font-medium text-amber-900/70 leading-relaxed">
              Your debt-to-equity ratio is <span className="font-bold text-amber-800">{summary.deRatio}x</span>. While healthy, monitor upcoming short-term loan repayments to maintain liquidity.
            </p>
          </div>
        </div>
      </div>

      {/* Audit Trail Modal */}
      <Dialog open={drillDown.isOpen} onOpenChange={(open) => !open && setDrillDown({ isOpen: false })}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] bg-slate-50 border border-slate-200 shadow-2xl rounded-3xl overflow-hidden p-0 gap-0 flex flex-col">
          <div className="py-5 px-8 border-b border-primary/5 bg-white sticky top-0 z-20 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#fdf8ec] flex items-center justify-center text-[#cc9929] border border-[#cc9929]/20 shadow-premium shrink-0">
                  <Activity size={24} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-primary uppercase tracking-tight leading-none mb-1.5">
                    {drillDown.subItem || drillDown.category} Breakdown
                  </DialogTitle>
                  <DialogDescription className="text-[10px] font-bold text-primary/30 uppercase tracking-[0.2em]">
                    {isCashOrBank 
                      ? "Bank Statement Records • Financial Audit Trail" 
                      : (isARorTax || isFixedAsset)
                        ? "Outstanding Balances • Financial Audit Trail" 
                        : "Account Records • Financial Audit Trail"}
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {(bsSearch !== "" || Object.values(bsFilters).some(s => s && s.size > 0)) && (
                   <button 
                     onClick={clearBsFilters}
                     className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider hover:bg-red-100 transition-colors"
                   >
                     Clear Filters
                   </button>
                )}
                <button 
                  onClick={() => setDrillDown({ isOpen: false })}
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
            ) : detailData && detailData.length > 0 ? (
              <table className="w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-30 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                  { (isARorTax || drillDown.isLiability) ? (
                    <tr className="border-b border-primary/5">
                      <th className="pl-8 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white">
                        <div className="flex items-center gap-1">
                          Year
                          <ExcelColumnFilter 
                            columnKey="f_col1" label="Year" data={getBsCascadingData("f_col1")} 
                            activeFilters={bsFilters["f_col1"]} 
                            onFilterChange={(v) => setBsFilters(p => ({...p, f_col1: v}))}
                            onSort={(d) => setBsSort({key: "f_col1", direction: d})}
                            currentSort={bsSort}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white min-w-[250px]">
                        <div className="flex items-center gap-1">
                          Description
                          <ExcelColumnFilter 
                            columnKey="f_col2" label="Description" data={getBsCascadingData("f_col2")} 
                            activeFilters={bsFilters["f_col2"]} 
                            onFilterChange={(v) => setBsFilters(p => ({...p, f_col2: v}))}
                            onSort={(d) => setBsSort({key: "f_col2", direction: d})}
                            currentSort={bsSort}
                          />
                        </div>
                      </th>
                      <th className="pr-8 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white">
                        <div className="flex items-center justify-end gap-1">
                          Outstanding IDR
                          <ExcelColumnFilter 
                            columnKey="f_col3" label="Outstanding IDR" data={getBsCascadingData("f_col3")} 
                            activeFilters={bsFilters["f_col3"]} 
                            onFilterChange={(v) => setBsFilters(p => ({...p, f_col3: v}))}
                            onSort={(d) => setBsSort({key: "f_col3", direction: d})}
                            currentSort={bsSort}
                          />
                        </div>
                      </th>
                    </tr>
                  ) : isFixedAsset ? (
                    <tr className="border-b border-primary/5">
                      <th className="pl-8 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white">
                        <div className="flex items-center gap-1">
                          Purchase Date
                          <ExcelColumnFilter 
                            columnKey="f_col1" label="Date" data={getBsCascadingData("f_col1")} 
                            activeFilters={bsFilters["f_col1"]} 
                            onFilterChange={(v) => setBsFilters(p => ({...p, f_col1: v}))}
                            onSort={(d) => setBsSort({key: "f_col1", direction: d})}
                            currentSort={bsSort}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white min-w-[250px]">
                        <div className="flex items-center gap-1">
                          Asset Name
                          <ExcelColumnFilter 
                            columnKey="f_col2" label="Asset Name" data={getBsCascadingData("f_col2")} 
                            activeFilters={bsFilters["f_col2"]} 
                            onFilterChange={(v) => setBsFilters(p => ({...p, f_col2: v}))}
                            onSort={(d) => setBsSort({key: "f_col2", direction: d})}
                            currentSort={bsSort}
                          />
                        </div>
                      </th>
                      <th className="pr-8 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white">
                        <div className="flex items-center justify-end gap-1">
                          Purchase Price
                          <ExcelColumnFilter 
                            columnKey="f_col3" label="Price" data={getBsCascadingData("f_col3")} 
                            activeFilters={bsFilters["f_col3"]} 
                            onFilterChange={(v) => setBsFilters(p => ({...p, f_col3: v}))}
                            onSort={(d) => setBsSort({key: "f_col3", direction: d})}
                            currentSort={bsSort}
                          />
                        </div>
                      </th>
                    </tr>
                  ) : (
                    <tr className="border-b border-primary/5">
                      <th className="pl-8 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white">
                        <div className="flex items-center gap-1">
                          Date
                          <ExcelColumnFilter 
                            columnKey="f_col1" label="Date" data={getBsCascadingData("f_col1")} 
                            activeFilters={bsFilters["f_col1"]} 
                            onFilterChange={(v) => setBsFilters(p => ({...p, f_col1: v}))}
                            onSort={(d) => setBsSort({key: "f_col1", direction: d})}
                            currentSort={bsSort}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white">
                        <div className="flex items-center gap-1">
                          Reference
                          <ExcelColumnFilter 
                            columnKey="f_col2" label="Reference" data={getBsCascadingData("f_col2")} 
                            activeFilters={bsFilters["f_col2"]} 
                            onFilterChange={(v) => setBsFilters(p => ({...p, f_col2: v}))}
                            onSort={(d) => setBsSort({key: "f_col2", direction: d})}
                            currentSort={bsSort}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white min-w-[250px]">
                        <div className="flex items-center gap-1">
                          Description
                          <ExcelColumnFilter 
                            columnKey="f_col3" label="Description" data={getBsCascadingData("f_col3")} 
                            activeFilters={bsFilters["f_col3"]} 
                            onFilterChange={(v) => setBsFilters(p => ({...p, f_col3: v}))}
                            onSort={(d) => setBsSort({key: "f_col3", direction: d})}
                            currentSort={bsSort}
                          />
                        </div>
                      </th>
                      <th className="pr-8 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-primary/40 bg-white">
                        <div className="flex items-center justify-end gap-1">
                          Balance
                          <ExcelColumnFilter 
                            columnKey="f_col4" label="Balance" data={getBsCascadingData("f_col4")} 
                            activeFilters={bsFilters["f_col4"]} 
                            onFilterChange={(v) => setBsFilters(p => ({...p, f_col4: v}))}
                            onSort={(d) => setBsSort({key: "f_col4", direction: d})}
                            currentSort={bsSort}
                          />
                        </div>
                      </th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {filteredBsDetails.map((row: any, i: number) => {
                    if (isARorTax || drillDown.isLiability) {
                      return (
                        <tr key={i} className="bg-white hover:bg-primary/[0.01] transition-colors group">
                          <td className="pl-8 py-3 text-[11px] font-bold text-primary/60 whitespace-nowrap">
                            {row.colC}
                          </td>
                          <td className="px-4 py-3 whitespace-normal min-w-[250px]">
                            <span className="text-[12px] font-bold text-primary uppercase leading-tight group-hover:text-primary transition-colors">
                              {row.colE}
                            </span>
                          </td>
                          <td className="pr-8 py-3 text-right whitespace-nowrap">
                            <span className={cn("text-[12px] font-bold tabular-nums", drillDown.isLiability ? "text-rose-600" : "text-primary")}>
                              {formatCurrency(row.colR)}
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    if (isFixedAsset) {
                      return (
                        <tr key={i} className="bg-white hover:bg-primary/[0.01] transition-colors group">
                          <td className="pl-8 py-3 text-[11px] font-bold text-primary/60 whitespace-nowrap">
                            {formatDate(row.purchaseDate)}
                          </td>
                          <td className="px-4 py-3 whitespace-normal min-w-[250px]">
                            <span className="text-[12px] font-bold text-primary uppercase leading-tight group-hover:text-primary transition-colors">
                              {row.assetName}
                            </span>
                          </td>
                          <td className="pr-8 py-3 text-right whitespace-nowrap">
                            <span className="text-[12px] font-bold text-primary tabular-nums">
                              {formatCurrency(row.purchasePrice)}
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    const date = row.colA || row.date || row.createdAt;
                    const reference = row.colF || row.type || row.category || '-';
                    // Fix: For Cash/Bank, description must come from colB, and amount from colE
                    const description = isCashOrBank ? (row.colB || '-') : (row.colE || row.colB || row.description || '-');
                    const amount = isCashOrBank ? row.colE : (row.colR || row.colD || row.amount || row.idr || 0);

                    return (
                      <tr key={i} className="bg-white hover:bg-primary/[0.01] transition-colors group">
                        <td className="pl-8 py-3 text-[11px] font-bold text-primary/60 whitespace-nowrap">
                          {formatDate(date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-[12px] font-bold text-primary/40 uppercase tracking-tight">
                            {reference}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-normal min-w-[250px]">
                          <span className="text-[12px] font-bold text-primary uppercase leading-tight group-hover:text-primary transition-colors">
                            {description}
                          </span>
                        </td>
                        <td className="pr-8 py-3 text-right whitespace-nowrap">
                          <span className="text-[12px] font-bold text-primary tabular-nums">
                            {formatCurrency(amount)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="sticky bottom-0 z-50">
                  {displayDetails.footer ? (
                    <tr className="bg-[#fdf8ec] border-t-2 border-[#cc9929] transition-none font-bold">
                      <td className="pl-8 py-4 text-[11px] font-bold text-[#cc9929] whitespace-nowrap">
                        {formatDate(displayDetails.footer.colA)}
                      </td>
                      {!(isARorTax || drillDown.isLiability) && (
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-[12px] font-bold text-[#cc9929]/60 uppercase tracking-tight">
                            {displayDetails.footer.colF || '-'}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-4 whitespace-normal min-w-[250px]">
                        <span className="text-[12px] font-bold text-[#cc9929] uppercase leading-tight">
                          {displayDetails.footer.colB || 'LATEST BALANCE'} (FINAL SALDO)
                        </span>
                      </td>
                      <td className={cn("pr-8 py-4 text-right whitespace-nowrap font-bold", getAmountColor(displayDetails.footer.colE))}>
                        <span className="text-[14px] tabular-nums font-bold">
                          {formatCurrency(displayDetails.footer.colE)}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    <tr className="bg-[#fdf8ec] border-t-2 border-[#cc9929] transition-none font-bold">
                      <td colSpan={(isFixedAsset || isARorTax || drillDown.isLiability) ? 2 : 3} className="pl-8 py-4 text-left font-bold">
                        <span className="text-[12px] uppercase tracking-[0.2em] text-[#cc9929] font-bold">
                          Total
                        </span>
                      </td>
                      <td className={cn("pr-8 py-4 text-right whitespace-nowrap font-bold", drillDown.isLiability ? "text-rose-600" : getAmountColor(drillDown.total || 0))}>
                        <span className="text-[14px] tabular-nums font-bold">
                          {formatCurrency(drillDown.total || 0)}
                        </span>
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center gap-4 opacity-20">
                <History className="w-12 h-12 text-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Transactions Found</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <EquityPropertiesModal 
        open={isEquityModalOpen}
        onOpenChange={setIsEquityModalOpen}
        year={Number(displayYear)}
      />
    </div>
  );
}
