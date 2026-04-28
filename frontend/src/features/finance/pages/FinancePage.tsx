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
import { Landmark, Package, PieChart, BarChart3, Repeat, Filter, ArrowUpRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "pl");

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
  
  // --- PAGINATION STATES ---
  const [iaPage, setIaPage] = useState(1);

  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [selectedBankLabel, setSelectedBankLabel] = useState<string | null>(null);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankPage, setBankPage] = useState(1);

  const {    
    getTransactions, 
    getSales, 
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
