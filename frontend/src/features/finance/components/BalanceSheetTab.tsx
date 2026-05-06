import { useState, useEffect } from "react";
import { formatCurrency, getAmountColor } from "@/lib/utils";
import { useFinance } from "../hooks/useFinance";
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
} from 'recharts';
import { 
  TrendingUp, 
  ShieldCheck, 
  Scale, 
  ChevronDown, 
  ArrowUpRight,
  Activity,
  Zap,
  Eye,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function BalanceSheetTab() {
  const { getBalanceSheet } = useFinance();
  const { data: bsData, isLoading } = getBalanceSheet();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [isInitialized, setIsInitialized] = useState(false);

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
      subValue: "+9.2% vs prev. quarter", 
      icon: TrendingUp, 
      color: "text-indigo-500",
      bg: "bg-indigo-50/50"
    },
    { 
      title: "LIABILITIES", 
      value: formatCurrency(summary.totalLiabilities), 
      subValue: "Short-term debt priority", 
      icon: Activity, 
      color: "text-rose-500",
      bg: "bg-rose-50/50"
    },
    { 
      title: "TOTAL EQUITY", 
      value: formatCurrency(summary.totalEquity), 
      subValue: "Retained earnings stable", 
      icon: Scale, 
      color: "text-emerald-500",
      bg: "bg-emerald-50/50"
    },
    { 
      title: "WORKING CAPITAL", 
      value: formatCurrency(summary.workingCapital), 
      subValue: "Liquid capital availability", 
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
              Balance Sheet
            </h3>
            <p className="text-[11px] text-primary/40 uppercase tracking-widest mt-1.5">
              Snapshot of financial position · Real-time Cumulative Balance
            </p>
          </div>
        </div>


      </div>
      
      {/* Top Status Bar */}
      <div className="flex items-center justify-between bg-white/70 backdrop-blur-md p-3 px-6 rounded-2xl border border-primary/5 shadow-premium">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    tickFormatter={(val) => `Rp ${(val/1e9).toFixed(1)}B`}
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
        
        {/* Left Column: Assets */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-premium overflow-hidden">
          {/* Section Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <h4 className="text-[15px] font-bold text-slate-900 tracking-tight">Assets</h4>
            </div>
            <span className="text-[16px] font-bold text-slate-900 tabular-nums whitespace-nowrap">{formatCurrency(bsData?.assets?.total)}</span>
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
                      "text-slate-400 transition-transform duration-200",
                      group.items?.length === 0 && "opacity-0 w-[14px]",
                      openSections[`assets-${group.name}`] ? "rotate-0" : "-rotate-90"
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
                    <div className="bg-white px-6 pb-4 space-y-1">
                      {group.items.map((item: any, i: number) => (
                        <div key={i} className="flex items-center py-2 group/item pl-6">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-[11px] font-medium text-slate-300 w-10 tabular-nums flex-shrink-0">
                              {item.code}
                            </span>
                            <span className="text-[12px] font-normal text-slate-600 truncate" title={item.accountName}>
                              {item.accountName}
                            </span>
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
                      ))}
                    </div>
                  </CollapsibleContent>
                )}
              </Collapsible>
            ))}
          </div>
        </div>

        {/* Right Column: Liabilities & Equity */}
        <div className="space-y-8">
          {/* Liabilities Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-premium overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                <h4 className="text-[15px] font-bold text-slate-900 tracking-tight">Liabilities</h4>
              </div>
              <span className="text-[16px] font-bold text-rose-600 tabular-nums whitespace-nowrap">{formatCurrency(bsData?.liabilities?.total)}</span>
            </div>

            <div className="divide-y divide-slate-100">
              {liabilityCategories.map((group: any, idx: number) => (
                <Collapsible 
                  key={idx} 
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
                        "text-slate-400 transition-transform duration-200",
                        group.items?.length === 0 && "opacity-0 w-[14px]",
                        openSections[`liabilities-${group.name}`] ? "rotate-0" : "-rotate-90"
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
                      <div className="bg-white px-6 pb-4 space-y-1">
                        {group.items.map((item: any, i: number) => (
                          <div key={i} className="flex items-center py-2 group/item pl-6">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-[11px] font-medium text-slate-300 w-10 tabular-nums flex-shrink-0">
                                {item.code}
                              </span>
                              <span className="text-[12px] font-normal text-slate-600 truncate" title={item.accountName}>
                                {item.accountName}
                              </span>
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
            </div>
          </div>

          {/* Equity Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-premium overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <h4 className="text-[15px] font-bold text-slate-900 tracking-tight">Equity</h4>
              </div>
              <span className="text-[16px] font-bold text-emerald-600 tabular-nums whitespace-nowrap">{formatCurrency(bsData?.equity?.total)}</span>
            </div>

            <div className="divide-y divide-slate-100">
              {equityCategories.map((group: any, idx: number) => (
                <Collapsible 
                  key={idx} 
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
                        "text-slate-400 transition-transform duration-200",
                        group.items?.length === 0 && "opacity-0 w-[14px]",
                        openSections[`equity-${group.name}`] ? "rotate-0" : "-rotate-90"
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
                      <div className="bg-white px-6 pb-4 space-y-1">
                        {group.items.map((item: any, i: number) => (
                          <div key={i} className="flex items-center py-2 group/item pl-6">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-[11px] font-medium text-slate-300 w-10 tabular-nums flex-shrink-0">
                                {item.code}
                              </span>
                              <span className="text-[12px] font-normal text-slate-600 truncate" title={item.accountName}>
                                {item.accountName}
                              </span>
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
                        ))}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
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

    </div>
  );
}
