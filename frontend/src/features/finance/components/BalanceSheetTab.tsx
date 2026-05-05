import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";

export function BalanceSheetTab() {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const { getBalanceSheet } = useFinance();
  const { data: bsData, isLoading } = getBalanceSheet(selectedYear === "all" ? undefined : selectedYear);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "Cash": true,
    "Bank Accounts": true,
    "Account Receivable": true
  });

  const toggleSection = (name: string) => {
    setOpenSections(prev => ({ ...prev, [name]: !prev[name] }));
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
    composition: [],
    trend: []
  };

  // Helper to ensure categories always show up even if backend returns empty []
  const ensureCategories = (section: any, defaultNames: string[]) => {
    const existing = section?.categories || [];
    if (existing.length > 0) return existing;
    
    return defaultNames.map(name => ({
      name,
      total: "0",
      items: []
    }));
  };

  const assetCategories = ensureCategories(bsData?.assets, ["Cash", "Bank Accounts", "Deposit", "Account Receivable", "Prepaid Tax", "Fixed Assets"]);
  const liabilityCategories = ensureCategories(bsData?.liabilities, ["Account Payable", "Short Term Loan"]);
  const equityCategories = ensureCategories(bsData?.equity, ["Equity"]);
  
  

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
              Snapshot of financial position · As of 31 Dec {selectedYear === "all" ? new Date().getFullYear() : selectedYear}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="flex-1 xl:w-[180px] h-12 px-5 bg-white border-0 rounded-xl shadow-sm flex items-center gap-2 text-muted-foreground font-bold transition-all cursor-pointer">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-secondary" />
                <SelectValue placeholder="Year" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-primary/10 shadow-premium bg-white p-0 overflow-hidden">
              <SelectItem value="all" className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-muted-foreground transition-colors">All Time Records</SelectItem>
              <SelectItem value="2026" className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-muted-foreground transition-colors">Fiscal Year 2026</SelectItem>
              <SelectItem value="2025" className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-muted-foreground transition-colors">Fiscal Year 2025</SelectItem>
              <SelectItem value="2024" className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-muted-foreground transition-colors">Fiscal Year 2024</SelectItem>
              <SelectItem value="2023" className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-muted-foreground transition-colors">Fiscal Year 2023</SelectItem>
            </SelectContent>
          </Select>
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

        {/* Asset Composition */}
        <Card className="bg-white/70 backdrop-blur-md border-primary/5 shadow-premium">
          <CardContent className="p-8">
            <h3 className="text-[15px] font-black text-primary uppercase tracking-widest mb-1">Asset Composition</h3>
            <p className="text-[11px] text-primary/40 uppercase font-bold mb-8">Where capital is held</p>
            
            <div className="h-[240px] w-full relative mb-8">
              {/* Central Statistics Indicator */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none translate-y-1">
                <span className="text-[9px] font-black text-primary/30 uppercase tracking-[0.2em] mb-0.5">Total Assets</span>
                <span className="text-xl font-black text-primary tabular-nums leading-none">
                  {formatCurrency(bsData?.assets?.total).split(',')[0]}
                </span>
                <span className="text-[9px] font-black text-primary/20 uppercase mt-1 tracking-widest">IDR Equivalent</span>
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.composition}
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={92}
                    paddingAngle={6}
                    minAngle={3}
                    dataKey="value"
                    stroke="none"
                    animationBegin={0}
                    animationDuration={1500}
                  >
                    {charts.composition.map((_: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    itemStyle={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase' }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-6 border-t border-primary/5">
              {charts.composition.slice(0, 6).map((item: any, i: number) => {
                const total = charts.composition.reduce((acc: number, curr: any) => acc + curr.value, 0);
                const percentNum = (item.value / total) * 100;
                const percent = percentNum > 0 && percentNum < 0.1 ? "< 0.1" : percentNum.toFixed(1);
                return (
                  <div key={i} className="flex items-center justify-between group cursor-default">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-white" 
                        style={{ backgroundColor: COLORS[i % COLORS.length] }} 
                      />
                      <span className="text-[11px] font-bold text-primary/40 uppercase tracking-tight group-hover:text-primary transition-colors">{item.name}</span>
                    </div>
                    <span className="text-[11px] font-black text-primary/80 tabular-nums">{percent}%</span>
                  </div>
                );
              })}
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
                open={openSections[group.name]} 
                onOpenChange={() => toggleSection(group.name)}
              >
                <CollapsibleTrigger className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "text-slate-400 transition-transform duration-200",
                      openSections[group.name] ? "rotate-0" : "-rotate-90"
                    )}>
                      <ChevronDown size={14} />
                    </div>
                    <span className="text-[13px] font-semibold text-slate-700">{group.name}</span>
                    <span className="text-[11px] font-medium text-slate-400 ml-1">{group.items.length}</span>
                  </div>
                  <span className="text-[13px] font-bold text-slate-900 tabular-nums whitespace-nowrap">{formatCurrency(group.total)}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="bg-white px-6 pb-4 space-y-1">
                    {group.items && group.items.length > 0 ? (
                      group.items.map((item: any, i: number) => (
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
                      ))
                    ) : (
                      <div className="py-6 flex flex-col items-center justify-center text-center opacity-30">
                        <Activity className="w-6 h-6 text-slate-400 mb-2 animate-pulse" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No account records found</p>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
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
                  open={openSections[group.name]} 
                  onOpenChange={() => toggleSection(group.name)}
                >
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "text-slate-400 transition-transform duration-200",
                        openSections[group.name] ? "rotate-0" : "-rotate-90"
                      )}>
                        <ChevronDown size={14} />
                      </div>
                      <span className="text-[13px] font-semibold text-slate-700">{group.name}</span>
                      <span className="text-[11px] font-medium text-slate-400 ml-1">{group.items.length}</span>
                    </div>
                    <span className="text-[13px] font-bold text-rose-600 tabular-nums whitespace-nowrap">{formatCurrency(group.total)}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="bg-white px-6 pb-4 space-y-1">
                      {group.items && group.items.length > 0 ? (
                        group.items.map((item: any, i: number) => (
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
                        ))
                      ) : (
                        <div className="py-6 flex flex-col items-center justify-center text-center opacity-30">
                          <Activity className="w-6 h-6 text-slate-400 mb-2 animate-pulse" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No account records found</p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
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
                  open={openSections[group.name]} 
                  onOpenChange={() => toggleSection(group.name)}
                >
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "text-slate-400 transition-transform duration-200",
                        openSections[group.name] ? "rotate-0" : "-rotate-90"
                      )}>
                        <ChevronDown size={14} />
                      </div>
                      <span className="text-[13px] font-semibold text-slate-700">{group.name}</span>
                      <span className="text-[11px] font-medium text-slate-400 ml-1">{group.items.length}</span>
                    </div>
                    <span className="text-[13px] font-black text-emerald-600 tabular-nums whitespace-nowrap">{formatCurrency(group.total)}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="bg-white px-6 pb-4 space-y-1">
                      {group.items && group.items.length > 0 ? (
                        group.items.map((item: any, i: number) => (
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
                        ))
                      ) : (
                        <div className="py-6 flex flex-col items-center justify-center text-center opacity-30">
                          <Activity className="w-6 h-6 text-slate-400 mb-2 animate-pulse" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No account records found</p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
          </div>
        </div>
      </div>
      </div>

      {/* Insights Footer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-500/10 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <h5 className="text-[11px] font-black text-emerald-700 uppercase tracking-widest mb-1">Insight</h5>
            <p className="text-[12px] font-medium text-emerald-900/70 leading-relaxed">
              Account Receivable is your largest asset at <span className="font-bold text-emerald-800">Rp {formatCurrency(charts.composition[0]?.value || 0)}</span>. Consider tightening collections to further improve your cash position.
            </p>
          </div>
        </div>

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
