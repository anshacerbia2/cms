import { useState } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";

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

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useFinance } from "../hooks/useFinance";
import { PaginationControls } from "@/components/common/PaginationControls";
import { Landmark, TrendingUp, Users, Truck, Package, PieChart, BarChart3, Repeat, Filter, ArrowUpRight } from "lucide-react";


export default function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "transactions");

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
  
  // Separate page state for each tab to ensure independent navigation


  const [transPage, setTransPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const [arPage, setArPage] = useState(1);
  const [apPage, setApPage] = useState(1);
  const [assetsPage, setAssetsPage] = useState(1);
  const [iaPage, setIaPage] = useState(1);


  const [source, setSource] = useState("BCA");
  const { 
    getTransactions, 
    getSales, 
    getAR, 
    getAP, 
    getAssets, 
    getPL, 
    getPLCosts,
    getBalanceSheet, 
    getInterAccountTransfers 
  } = useFinance();


  // Standard limit for all tables

  const limit = 10;

  // Data fetching for all tabs
  const { data: transResponse, isLoading: transLoading } = getTransactions({ page: transPage, limit, source });
  const { data: salesResponse, isLoading: salesLoading } = getSales({ page: salesPage, limit });
  const { data: arResponse, isLoading: arLoading } = getAR({ page: arPage, limit });
  const { data: apResponse, isLoading: apLoading } = getAP({ page: apPage, limit });
  const { data: assetsResponse, isLoading: assetsLoading } = getAssets({ page: assetsPage, limit });
  const { data: plResponse, isLoading: plLoading } = getPL({ page: 1, limit });
  const { data: plCostsResponse, isLoading: plCostsLoading } = getPLCosts({ page: 1, limit });
  const { data: plSummaryResponse, isLoading: plSummaryLoading } = (useFinance() as any).getPLSummary();
  const { data: bsResponse, isLoading: bsLoading } = getBalanceSheet({ page: 1, limit: 100 }); // Show all for BS as requested earlier
  const { data: iaResponse, isLoading: iaLoading } = getInterAccountTransfers({ page: iaPage, limit });

  // Background lookup for Modal Drill-down (Limit 100 to ensure we find matches)
  // --- DRILL-DOWN MODAL STATE ---
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankPage, setBankPage] = useState(1);

  const { data: bankTxsResponse, isLoading: bankTxsLoading } = getTransactions({ 
    page: bankPage, 
    limit: 10, 
    source: selectedBank?.toUpperCase().replace(/\s+/g, '_') 
  });

  const { data: salesLookup } = getSales({ page: 1, limit: 100 });




  const formatCurrency = (val: any) => {
    const num = Number(val);
    if (isNaN(num)) {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(0);
    }
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(num);
  };



  const formatDate = (date: any) => {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

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
            { id: "transactions", label: "Ledger", icon: Landmark },
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



        {/* 1. LEDGER CONTENT */}
        <TabsContent value="transactions" className="mt-0 space-y-4">
          <div className="flex items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 pl-2">
              <Filter size={14} className="text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-2">Source Filter</span>
            </div>
            <Select value={source} onValueChange={(v) => { setSource(v); setTransPage(1); }}>
              <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white border-primary/5 shadow-sm text-xs font-bold uppercase tracking-tight">
                <SelectValue placeholder="Select Source" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-premium border-primary/5 p-1">
                <SelectItem value="BCA" className="text-xs font-bold uppercase rounded-lg">BCA</SelectItem>
                <SelectItem value="MANDIRI" className="text-xs font-bold uppercase rounded-lg">Mandiri</SelectItem>
                <SelectItem value="BRI" className="text-xs font-bold uppercase rounded-lg">BRI</SelectItem>
                <SelectItem value="BTN" className="text-xs font-bold uppercase rounded-lg">BTN</SelectItem>
                <SelectItem value="CASH_IDR" className="text-xs font-bold uppercase rounded-lg">Cash IDR</SelectItem>
                <SelectItem value="NON_CB" className="text-xs font-bold uppercase rounded-lg">Non CB</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-x-auto">
            <Table className="min-w-[1600px]">
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-primary/5">
                  <TableHead className="pl-8 py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground w-24">Tanggal</TableHead>
                  <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground min-w-[300px]">Keterangan Transaksi</TableHead>
                  <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-right w-32">Debet</TableHead>
                  <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-right w-32">Kredit</TableHead>
                  <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-right w-44">Ledger</TableHead>
                  <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-left w-40">Sub Ledger - 1</TableHead>
                  <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-left w-40">Sub Ledger - 2</TableHead>
                  <TableHead className="pr-8 py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-left w-40">Sub Ledger - 3</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transLoading ? (
                  <TableRow><TableCell colSpan={7} className="h-48 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest animate-pulse">Synchronizing Ledger...</TableCell></TableRow>
                ) : (transResponse?.data || []).map((row: any) => (
                  <TableRow key={row.id} className="border-primary/5 hover:bg-primary/[0.01] transition-colors whitespace-nowrap">
                    <TableCell className="pl-8 py-4 font-bold text-xs text-primary">{formatDate(row.date)}</TableCell>
                    <TableCell className="py-4 text-[12px] font-medium text-muted-foreground max-w-md truncate">{row.description}</TableCell>
                    <TableCell className="py-4 text-right font-bold text-red-500 text-xs">
                       {row.withdrawal && Number(row.withdrawal) !== 0 ? formatCurrency(row.withdrawal) : "-"}
                    </TableCell>
                    <TableCell className="py-4 text-right font-bold text-green-600 text-xs">
                      {row.deposit && Number(row.deposit) !== 0 ? formatCurrency(row.deposit) : "-"}
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <span className="text-xs font-bold text-primary whitespace-nowrap">
                        {row.ledger ? formatCurrency(row.ledger) : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-left">
                      <span className="text-[10px] font-bold text-muted-foreground/70 uppercase">{row.subLedger1 || row.subCategory || "-"}</span>
                    </TableCell>
                    <TableCell className="py-4 text-left">
                      <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-tight">{row.subLedger2 || "-"}</span>
                    </TableCell>
                    <TableCell className="pr-8 py-4 text-left">
                      <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-tight">{row.subLedger3 || "-"}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls meta={transResponse?.meta} onPageChange={setTransPage} isFetching={transLoading} />
        </TabsContent>

        {/* 2. SALES CONTENT */}
        <TabsContent value="sales" className="mt-0">
          <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-premium border border-primary/5 overflow-x-auto">
            <Table className="min-w-[2800px]">
              <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent border-primary/5 h-12">
                  <TableHead rowSpan={2} className="pl-8 text-[10px] font-black uppercase tracking-tight text-primary w-12 border-r border-primary/10">NO</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary w-32 border-r border-primary/10">DATE</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary w-48 border-r border-primary/10">BILLING TO</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary w-48 border-r border-primary/10">PROJECT</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary w-64 border-r border-primary/10">DESCRIPTION</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary text-right w-32">BASIC PRICE</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary text-right w-32 font-bold text-secondary">MGMT FEE</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary text-right w-24">PPN</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary text-right w-40 border-r border-primary/10 font-bold bg-primary/5">TOTAL AMOUNT</TableHead>
                  <TableHead colSpan={7} className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-secondary bg-secondary/5 border-r border-primary/10 border-b border-primary/10">MUTASI 2021</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-red-600 text-right w-40 border-r border-primary/10">OUTSTANDING</TableHead>
                  <TableHead colSpan={4} className="text-center text-[11px] font-black uppercase tracking-widest text-primary/60 bg-primary/5 border-b border-primary/10 border-r border-primary/10">TAX & ADJUSTMENT</TableHead>
                  <TableHead rowSpan={2} className="pr-8 text-[12px] font-black uppercase tracking-tight text-emerald-600 text-right w-44 bg-emerald-50 text-secondary">NET RECEIVED</TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent border-primary/5 h-12 bg-primary/5">
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right">BCA</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right">MANDIRI</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right">DANAMON</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right">BRI</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right">BTN</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right">Cash IDR</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right border-r border-primary/10">Non CB</TableHead>
                  <TableHead className="text-[9px] font-bold text-primary/50 text-right">PPh-23</TableHead>
                  <TableHead className="text-[9px] font-bold text-primary/50 text-right">A/P PPh-23</TableHead>
                  <TableHead className="text-[9px] font-bold text-primary/50 text-right">PPN TAX</TableHead>
                  <TableHead className="text-[9px] font-bold text-primary/50 text-right border-r border-primary/10">A/P PPN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesLoading ? (
                  <TableRow><TableCell colSpan={24} className="h-64 text-center animate-pulse text-muted-foreground font-black uppercase tracking-widest">Aggregating Sales Data...</TableCell></TableRow>
                ) : (salesResponse?.data || []).map((row: any) => (
                  <TableRow key={row.id} className="border-primary/5 hover:bg-primary/[0.01] transition-colors whitespace-nowrap group">
                    <TableCell className="pl-8 py-4 font-bold text-primary/40 text-[10px] border-r border-primary/5">{row.no}</TableCell>
                    <TableCell className="py-4 text-[10px] font-bold text-muted-foreground border-r border-primary/5">{row.date}{row.year ? `-${row.year}` : ''}</TableCell>
                    <TableCell className="py-4 font-black text-primary text-[11px] uppercase truncate border-r border-primary/5">{row.billingTo}</TableCell>
                    <TableCell className="py-4 text-[10px] font-bold text-secondary uppercase truncate border-r border-primary/5">{row.project}</TableCell>
                    <TableCell className="py-4 text-[10px] font-medium text-muted-foreground truncate border-r border-primary/5 max-w-[200px]">{row.description}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[11px]">{formatCurrency(row.basicPrice)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[11px] font-bold text-secondary">{formatCurrency(row.managementFee)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[11px] text-muted-foreground">{formatCurrency(row.ppn)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[12px] font-black text-primary bg-primary/[0.02] border-r border-primary/5">{formatCurrency(row.totalAmount)}</TableCell>
                    {/* Payments */}
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70 group-hover:opacity-100">{formatCurrency(row.bca)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70 group-hover:opacity-100">{formatCurrency(row.mandiri)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70 group-hover:opacity-100">{formatCurrency(row.danamon)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70 group-hover:opacity-100">{formatCurrency(row.bri)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70 group-hover:opacity-100">{formatCurrency(row.btn)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70 group-hover:opacity-100">{formatCurrency(row.cashIdr)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70 group-hover:opacity-100 border-r border-primary/5">{formatCurrency(row.nonCb)}</TableCell>
                    {/* Status */}
                    <TableCell className="py-4 text-right font-mono text-[11px] font-black text-red-600 border-r border-primary/5">{formatCurrency(row.outstanding)}</TableCell>
                    {/* Taxes */}
                    <TableCell className="py-4 text-right font-mono text-[10px] text-primary/60">{formatCurrency(row.pph23)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] text-primary/40 italic">{formatCurrency(row.apPph23)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] text-primary/60">{formatCurrency(row.ppnTax)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] text-primary/40 italic border-r border-primary/5">{formatCurrency(row.apPpn)}</TableCell>
                    <TableCell className="pr-8 py-4 text-right font-mono text-[13px] font-black text-secondary bg-secondary/[0.02]">{formatCurrency(row.netReceived)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls meta={salesResponse?.meta} onPageChange={setSalesPage} isFetching={salesLoading} />
        </TabsContent>


        {/* 3. AR CONTENT */}
        <TabsContent value="ar" className="mt-0">
          <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-premium border border-primary/5 overflow-x-auto">
            <Table className="min-w-[2400px]">
              <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent border-primary/5 h-12">
                  <TableHead rowSpan={2} className="pl-8 text-[10px] font-black uppercase tracking-tight text-primary w-24 border-r border-primary/10">TYPE</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary w-32 border-r border-primary/10">SUB CATEGORY</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary w-48 border-r border-primary/10">ENTITY NAME</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary w-64 border-r border-primary/10">DESCRIPTION</TableHead>
                  <TableHead colSpan={3} className="text-center text-[10px] font-black uppercase tracking-widest text-primary/60 bg-primary/5 border-b border-primary/10 border-r border-primary/10">END OF 2020</TableHead>
                  <TableHead colSpan={7} className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-secondary bg-secondary/5 border-r border-primary/10 border-b border-primary/10">MUTASI 2021</TableHead>
                  <TableHead colSpan={2} className="text-center text-[11px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border-b border-primary/10 border-r border-primary/10">OUTSTANDING</TableHead>
                  <TableHead colSpan={2} className="text-center text-[11px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border-b border-primary/10">ADJUSTMENT</TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent border-primary/5 h-12 bg-primary/5">
                  <TableHead className="text-[9px] font-bold text-primary/50 text-right">IDR</TableHead>
                  <TableHead className="text-[9px] font-bold text-primary/50 text-right">USD</TableHead>
                  <TableHead className="text-[9px] font-bold text-primary/40 text-right border-r border-primary/10 italic">RATE</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right">BCA</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right">MANDIRI</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right">BNI</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right">CASH IDR</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right text-muted-foreground opacity-50">NON CB</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right">CEK BANK</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right border-r border-primary/10">CASH USD</TableHead>
                  <TableHead className="text-[9px] font-bold text-emerald-600 text-right bg-emerald-50/30">IDR</TableHead>
                  <TableHead className="text-[9px] font-bold text-emerald-600 text-right bg-emerald-50/30 border-r border-primary/10">USD</TableHead>
                  <TableHead className="text-[9px] font-bold text-amber-600 text-right bg-amber-50/30">IDR</TableHead>
                  <TableHead className="text-[9px] font-bold text-amber-600 text-right bg-amber-50/30">USD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arLoading ? (
                  <TableRow><TableCell colSpan={18} className="h-64 text-center animate-pulse text-muted-foreground font-black uppercase tracking-widest">Tracking Accounts Receivable...</TableCell></TableRow>
                ) : (arResponse?.data || []).map((row: any) => (
                  <TableRow key={row.id} className="border-primary/5 hover:bg-primary/[0.01] transition-colors whitespace-nowrap">
                    <TableCell className="pl-8 py-4 border-r border-primary/5">
                        <span className="text-primary text-[10px] font-black uppercase tracking-tight font-mono">{row.arType}</span>
                    </TableCell>
                    <TableCell className="py-4 text-[11px] font-bold text-muted-foreground uppercase border-r border-primary/5">{row.subCategory}</TableCell>
                    <TableCell className="py-4 font-black text-primary text-[13px] uppercase truncate border-r border-primary/5">{row.entityName}</TableCell>
                    <TableCell className="py-4 text-[10px] font-medium text-muted-foreground truncate border-r border-primary/5 max-w-[200px]">{row.description}</TableCell>
                    
                    {/* End of 2020 */}
                    <TableCell className="py-4 text-right font-mono text-[11px]">{formatCurrency(row.idr)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[11px]">{formatCurrency(row.usd)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[11px] text-muted-foreground/40 border-r border-primary/5 italic">{row.rate ? formatCurrency(row.rate) : '-'}</TableCell>

                    {/* Mutasi */}
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70">{formatCurrency(row.bca)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70">{formatCurrency(row.mandiri)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70">{formatCurrency(row.bri)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70">{formatCurrency(row.cashIdr)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-40">{formatCurrency(row.nonCb)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70">{formatCurrency(row.citibank)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70 border-r border-primary/5">{formatCurrency(row.cashUsd)}</TableCell>

                    {/* Outstanding */}
                    <TableCell className="py-4 text-right font-mono text-[11px] font-black text-emerald-600 bg-emerald-500/5">
                      {formatCurrency(row.outstandingIdr)}
                    </TableCell>
                    <TableCell className="py-4 text-right font-mono text-[11px] font-black text-emerald-600/60 bg-emerald-500/5 border-r border-primary/5">
                      {formatCurrency(row.outstandingUsd)}
                    </TableCell>

                    {/* Adjustment */}
                    <TableCell className="py-4 text-right font-mono text-[11px] font-black text-amber-600 bg-amber-500/5">
                      {formatCurrency(row.adjustmentIdr)}
                    </TableCell>
                    <TableCell className="pr-8 py-4 text-right font-mono text-[11px] font-black text-amber-600/60 bg-amber-500/5">
                      {formatCurrency(row.adjustmentUsd)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls meta={arResponse?.meta} onPageChange={setArPage} isFetching={arLoading} />
        </TabsContent>

        <TabsContent value="ap" className="mt-0">
          <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-premium border border-primary/5 overflow-x-auto">
            <Table className="min-w-[2600px]">
              <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent border-primary/5 h-12">
                  <TableHead rowSpan={2} className="pl-8 text-[10px] font-black uppercase tracking-tight text-primary w-24 border-r border-primary/10">PAYABLE</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary w-16 border-r border-primary/10">YEAR</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary w-48 border-r border-primary/10">VENDOR</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary w-64 border-r border-primary/10">KETERANGAN</TableHead>
                  <TableHead colSpan={3} className="text-center text-[10px] font-black uppercase tracking-widest text-primary/60 bg-primary/5 border-r border-primary/10 border-b border-primary/10">INITIAL AMOUNT</TableHead>
                  <TableHead colSpan={8} className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-secondary bg-secondary/5 border-r border-primary/10 border-b border-primary/10">MUTASI 2021</TableHead>
                  <TableHead colSpan={2} className="text-center text-[11px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border-b border-primary/10 border-r border-primary/10">OUTSTANDING</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-amber-600 w-48 border-r border-primary/10">WA YOGI 21-JAN-22</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-orange-600 w-32">KOREKSI SELISIH</TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent border-primary/5 h-12 bg-primary/5">
                  <TableHead className="text-[9px] font-bold text-primary/50 text-right">IDR</TableHead>
                  <TableHead className="text-[9px] font-bold text-primary/50 text-right">USD</TableHead>
                  <TableHead className="text-[9px] font-bold text-primary/50 text-right border-r border-primary/10 italic text-muted-foreground/40">RATE</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right">BCA</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right">MANDIRI</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right">BTN</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right">BRI</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right">CASH IDR</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right opacity-50">NON CB</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right">CITIBANK</TableHead>
                  <TableHead className="text-[9px] font-bold text-secondary/70 text-right border-r border-primary/10">CASH USD</TableHead>
                  <TableHead className="text-[9px] font-bold text-emerald-600 text-right bg-emerald-50/30">IDR</TableHead>
                  <TableHead className="text-[9px] font-bold text-emerald-600 text-right bg-emerald-50/30 border-r border-primary/10">USD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apLoading ? (
                  <TableRow><TableCell colSpan={21} className="h-64 text-center animate-pulse text-muted-foreground font-black uppercase tracking-widest">Auditing Accounts Payable...</TableCell></TableRow>
                ) : (apResponse?.data || []).map((row: any) => (
                  <TableRow key={row.id} className="border-primary/5 hover:bg-primary/[0.01] transition-colors whitespace-nowrap">
                    <TableCell className="pl-8 py-4 border-r border-primary/5">
                        <Badge variant="outline" className="bg-secondary/5 text-secondary border-secondary/10 text-[8px] font-black uppercase tracking-tight font-mono">{row.payable}</Badge>
                    </TableCell>
                    <TableCell className="py-4 text-[11px] font-medium text-muted-foreground border-r border-primary/5">{row.year}</TableCell>
                    <TableCell className="py-4 font-black text-primary text-[13px] uppercase truncate border-r border-primary/5">{row.vendor}</TableCell>
                    <TableCell className="py-4 text-[10px] font-medium text-muted-foreground truncate border-r border-primary/5 max-w-[200px]">{row.keterangan}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[11px]">{formatCurrency(row.idr)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[11px] text-muted-foreground/60">{formatCurrency(row.usd)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[11px] text-muted-foreground/40 border-r border-primary/5 italic">{row.rate ? formatCurrency(row.rate) : '-'}</TableCell>
                    {/* Payments */}
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70">{formatCurrency(row.bca)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70">{formatCurrency(row.mandiri)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70">{formatCurrency(row.btn)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70">{formatCurrency(row.bri)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70">{formatCurrency(row.cashIdr)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-40">{formatCurrency(row.nonCb)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70">{formatCurrency(row.citibank)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[10px] opacity-70 border-r border-primary/5">{formatCurrency(row.cashUsd)}</TableCell>
                    {/* Notes */}
                    <TableCell className="py-4 text-[10px] font-medium text-amber-600 truncate border-r border-primary/5 max-w-[180px]">{row.notesYogi}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[11px] text-orange-600 font-bold italic border-r border-primary/5">{row.koreksiSelisih}</TableCell>
                    {/* Outstanding */}
                    <TableCell className="py-4 text-right font-mono text-[12px] font-black text-emerald-600 bg-emerald-500/5">
                      {Number(row.outstandingIdr) > 0 ? <span className="text-red-500">{formatCurrency(row.outstandingIdr)}</span> : formatCurrency(row.outstandingIdr)}
                    </TableCell>
                    <TableCell className="pr-8 py-4 text-right font-mono text-[12px] font-black text-emerald-600/60 bg-emerald-500/5">
                      {formatCurrency(row.outstandingUsd)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls meta={apResponse?.meta} onPageChange={setApPage} isFetching={apLoading} />
        </TabsContent>


        <TabsContent value="assets" className="mt-0">
          <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-premium border border-primary/5 overflow-x-auto">
            <Table className="min-w-[2000px]">
              <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent border-primary/5 h-12">
                  <TableHead colSpan={3} className="pl-8 text-[10px] font-black uppercase tracking-tight text-primary border-r border-primary/10">ASSET INFO</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary text-right w-32 border-r border-primary/10">HARGA BELI</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary text-center w-16 border-r border-primary/10">BULAN</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary text-right w-32 border-r border-primary/10 bg-primary/5">S/D 2020</TableHead>
                  <TableHead colSpan={12} className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-secondary bg-secondary/5 border-r border-primary/10 border-b border-primary/10">DEPRECIATION 2021</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary text-right w-32 border-r border-primary/10 bg-primary/5">2 0 2 1</TableHead>
                  <TableHead rowSpan={2} className="text-[10px] font-black uppercase tracking-tight text-primary text-right w-32 border-r border-primary/10 bg-primary/5">S/D 2021</TableHead>
                  <TableHead rowSpan={2} className="pr-8 text-[12px] font-black uppercase tracking-tight text-secondary text-right w-40 bg-secondary/5">NILAI BUKU</TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent border-primary/5 h-10 bg-primary/5">
                  <TableHead className="pl-8 text-[8px] font-bold text-primary/40">PURCHASE DATE</TableHead>
                  <TableHead className="text-[8px] font-bold text-primary/40">BANK REF</TableHead>
                  <TableHead className="text-[8px] font-bold text-primary/40 border-r border-primary/10">ASSET NAME</TableHead>
                  {["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].map((m, i) => (
                    <TableHead key={m} className={`text-[8px] font-bold text-secondary/70 text-right ${i === 11 ? 'border-r border-primary/10' : ''}`}>{m}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {assetsLoading ? (
                  <TableRow><TableCell colSpan={21} className="h-64 text-center animate-pulse text-muted-foreground font-black uppercase tracking-widest">Calculating Depreciation Grid...</TableCell></TableRow>
                ) : (assetsResponse?.data || []).map((row: any) => (
                  <TableRow key={row.id} className="border-primary/5 hover:bg-primary/[0.01] transition-colors whitespace-nowrap">
                    <TableCell className="pl-8 py-4 text-[10px] font-medium text-muted-foreground">{row.purchaseDate}</TableCell>
                    <TableCell className="py-4 text-[10px] font-bold text-primary/60 uppercase">{row.bankRef}</TableCell>
                    <TableCell className="py-4 text-[11px] font-black text-primary uppercase border-r border-primary/5">{row.assetName}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[11px] border-r border-primary/5">{formatCurrency(row.purchasePrice)}</TableCell>
                    <TableCell className="py-4 text-center font-mono text-[11px] border-r border-primary/5">{row.usefulLife}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[11px] bg-primary/[0.01] border-r border-primary/5 opacity-60">{formatCurrency(row.accumulated2020)}</TableCell>
                    {/* Month Grid */}
                    <TableCell className="py-3 text-right font-mono text-[10px] opacity-70 italic">{formatCurrency(row.jan)}</TableCell>
                    <TableCell className="py-3 text-right font-mono text-[10px] opacity-70 italic">{formatCurrency(row.feb)}</TableCell>
                    <TableCell className="py-3 text-right font-mono text-[10px] opacity-70 italic">{formatCurrency(row.mar)}</TableCell>
                    <TableCell className="py-3 text-right font-mono text-[10px] opacity-70 italic">{formatCurrency(row.apr)}</TableCell>
                    <TableCell className="py-3 text-right font-mono text-[10px] opacity-70 italic">{formatCurrency(row.may)}</TableCell>
                    <TableCell className="py-3 text-right font-mono text-[10px] opacity-70 italic">{formatCurrency(row.jun)}</TableCell>
                    <TableCell className="py-3 text-right font-mono text-[10px] opacity-70 italic">{formatCurrency(row.jul)}</TableCell>
                    <TableCell className="py-3 text-right font-mono text-[10px] opacity-70 italic">{formatCurrency(row.aug)}</TableCell>
                    <TableCell className="py-3 text-right font-mono text-[10px] opacity-70 italic">{formatCurrency(row.sep)}</TableCell>
                    <TableCell className="py-3 text-right font-mono text-[10px] opacity-70 italic">{formatCurrency(row.oct)}</TableCell>
                    <TableCell className="py-3 text-right font-mono text-[10px] opacity-70 italic">{formatCurrency(row.nov)}</TableCell>
                    <TableCell className="py-3 text-right font-mono text-[10px] opacity-70 italic border-r border-primary/5">{formatCurrency(row.dec)}</TableCell>
                    {/* Result */}
                    <TableCell className="py-4 text-right font-mono text-[11px] bg-primary/[0.02] border-r border-primary/5 font-bold">{formatCurrency(row.total2021)}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-[11px] bg-primary/[0.02] border-r border-primary/5 font-bold">{formatCurrency(row.accumulated2021)}</TableCell>
                    <TableCell className="pr-8 py-4 text-right font-mono text-[13px] font-black text-secondary bg-secondary/[0.02]">{formatCurrency(row.bookValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls meta={assetsResponse?.meta} onPageChange={setAssetsPage} isFetching={assetsLoading} />
        </TabsContent>


        <TabsContent value="pl" className="mt-0">
          <div className="space-y-12">


          {/* 1. SALES TABLE */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4">
               <div className="w-1.5 h-6 bg-secondary rounded-full"></div>
               <h3 className="text-xl font-black uppercase tracking-tight text-primary">SALES REVENUE DETAILS</h3>
            </div>
            <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-premium border border-primary/5 overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader className="bg-primary/5">
                  <TableRow className="hover:bg-transparent border-primary/5 h-12">
                    <TableHead className="pl-8 text-[10px] font-black uppercase tracking-tight text-primary w-16 border-r border-primary/10">NO</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-tight text-primary w-64 border-r border-primary/10">ACCOUNT NAME</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-tight text-primary w-32">GROSS</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-tight text-orange-600 w-32">VAT</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-tight text-orange-400 w-32 border-r border-primary/10">AP VAT</TableHead>
                    <TableHead className="pr-8 text-right text-[12px] font-black uppercase tracking-tight text-secondary bg-secondary/5 w-44">NET SALES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plLoading ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center animate-pulse text-muted-foreground font-black uppercase tracking-widest text-xs">Fetching Revenue...</TableCell></TableRow>
                  ) : (plResponse?.data || []).map((row: any) => (
                    <Dialog key={`pl-sales-${row.id}`}>
                      <DialogTrigger asChild>
                        <TableRow className="hover:bg-secondary/[0.05] border-primary/5 transition-colors cursor-pointer group active:scale-[0.99]">
                          <TableCell className="pl-8 py-5 font-bold text-primary/40 text-[10px] border-r border-primary/5">{row.no}</TableCell>
                          <TableCell className="py-5 font-black text-primary text-[12px] uppercase border-r border-primary/5 group-hover:text-secondary transition-colors">
                             <div className="flex items-center gap-2">
                                {row.accountName}
                                <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-all text-secondary" />
                             </div>
                          </TableCell>
                          <TableCell className="py-5 text-right font-mono text-[11px]">{formatCurrency(row.gross)}</TableCell>
                          <TableCell className="py-5 text-right font-mono text-[11px] text-orange-600">{formatCurrency(row.vat)}</TableCell>
                          <TableCell className="py-5 text-right font-mono text-[11px] text-orange-400 border-r border-primary/5">{formatCurrency(row.apVat)}</TableCell>
                          <TableCell className="pr-8 py-5 text-right font-mono text-[13px] font-black text-secondary bg-secondary/[0.01]">{formatCurrency(row.netSales)}</TableCell>
                        </TableRow>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] w-full bg-white/95 backdrop-blur-2xl border-white/20 shadow-premium rounded-[2.5rem] p-0 overflow-y-auto max-h-[90vh] ring-1 ring-black/5 animate-in zoom-in-95 duration-300">
                        <DialogHeader className="p-10 border-b border-primary/5 bg-white/40 sticky top-0 z-10 backdrop-blur-md">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary group">
                                   <Package size={24} className="group-hover:scale-110 transition-transform" />
                                </div>
                                <div>
                                   <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-primary">REVENUE DRILL-DOWN</DialogTitle>
                                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">Sourcing ledger matches for: <span className="text-secondary">{row.accountName}</span></p>
                                </div>
                             </div>
                             <Badge variant="outline" className="h-8 px-4 rounded-full bg-primary/5 text-primary border-primary/10 font-bold uppercase tracking-widest text-[9px]">AUDITED DATA</Badge>
                          </div>
                        </DialogHeader>
                        
                        <div className="p-10 bg-white/20">
                           <div className="bg-white/50 backdrop-blur-sm rounded-3xl border border-primary/5 shadow-inner-lg overflow-x-auto overflow-y-visible">
                              <Table className="min-w-[1400px]">

                                <TableHeader className="bg-primary/[0.02]">
                                  <TableRow className="hover:bg-transparent border-primary/5 h-14">
                                    <TableHead className="pl-8 text-[9px] font-black uppercase tracking-tight text-primary/60 w-28 border-r border-primary/5 text-center">DATE</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-tight text-primary/60 w-24 border-r border-primary/5 text-center">BANK REF</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-tight text-primary/60 w-48 border-r border-primary/5">BILLING RECIPIENT</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-tight text-primary/60 w-48 border-r border-primary/5">PROJECT</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-tight text-primary/60 border-r border-primary/5">DESCRIPTION</TableHead>
                                    <TableHead className="text-right text-[9px] font-black uppercase tracking-tight text-primary/60 w-28 border-r border-primary/5">BASIC PRICE</TableHead>
                                    <TableHead className="text-right text-[9px] font-black uppercase tracking-tight text-secondary w-28 border-r border-primary/5">MGMT FEE</TableHead>
                                    <TableHead className="text-right text-[9px] font-black uppercase tracking-tight text-primary/40 w-24 border-r border-primary/5">PPN</TableHead>
                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-tight text-primary bg-primary/[0.01] w-32 border-r border-primary/5">TOTAL AMOUNT</TableHead>
                                    <TableHead className="text-right text-[9px] font-black uppercase tracking-tight text-red-600 w-32 border-r border-primary/5">OUTSTANDING</TableHead>
                                    <TableHead className="pr-8 text-right text-[11px] font-black uppercase tracking-tight text-emerald-600 bg-emerald-50 w-32">NET RCVD</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(salesLookup?.data || [])
                                    .filter((s: any) => 
                                      s.project?.toLowerCase().trim().includes(row.accountName?.toLowerCase().trim()) ||
                                      row.accountName?.toLowerCase().trim().includes(s.project?.toLowerCase().trim())
                                    )
                                    .map((s: any, idx: number) => (
                                      <TableRow key={idx} className="border-primary/5 hover:bg-white/80 transition-all duration-300">
                                        <TableCell className="pl-8 py-4 font-mono text-[10px] text-muted-foreground/70 border-r border-primary/5 text-center">{s.date}</TableCell>
                                        <TableCell className="py-4 font-mono text-[9px] text-primary/40 border-r border-primary/5 text-center">{s.bankRef || '-'}</TableCell>
                                        <TableCell className="py-4 font-black text-primary text-[11px] uppercase border-r border-primary/5 max-w-[150px] truncate">{s.billingTo || 'GENERAL SALES'}</TableCell>
                                        <TableCell className="py-4 font-bold text-primary/40 text-[9px] uppercase italic border-r border-primary/5">{s.project}</TableCell>
                                        <TableCell className="py-4 text-[10px] text-muted-foreground border-r border-primary/5 max-w-[200px] truncate">{s.description || '-'}</TableCell>
                                        <TableCell className="py-4 text-right font-mono text-[10px] border-r border-primary/5">{formatCurrency(s.basicPrice)}</TableCell>
                                        <TableCell className="py-4 text-right font-mono text-[11px] font-bold text-secondary border-r border-primary/5 bg-secondary/[0.01]">{formatCurrency(s.managementFee)}</TableCell>
                                        <TableCell className="py-4 text-right font-mono text-[10px] text-primary/40 border-r border-primary/5">{formatCurrency(s.ppn)}</TableCell>
                                        <TableCell className="py-4 text-right font-mono text-[12px] font-black text-primary bg-primary/[0.02] border-r border-primary/5">{formatCurrency(s.totalAmount)}</TableCell>
                                        <TableCell className="py-4 text-right font-mono text-[11px] font-bold text-red-500/80 border-r border-primary/5">{formatCurrency(s.outstanding)}</TableCell>
                                        <TableCell className="pr-8 py-4 text-right font-black font-mono text-emerald-600 text-[13px] bg-emerald-500/[0.02]">{formatCurrency(s.netReceived)}</TableCell>
                                      </TableRow>
                                    ))}
                                  {!(salesLookup?.data || []).some((s: any) => 
                                    s.project?.toLowerCase().trim().includes(row.accountName?.toLowerCase().trim()) ||
                                    row.accountName?.toLowerCase().trim().includes(s.project?.toLowerCase().trim())
                                  ) && (
                                    <TableRow className="hover:bg-transparent">
                                      <TableCell colSpan={11} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 opacity-30">
                                          <Filter size={32} />
                                          <p className="text-[11px] font-black uppercase tracking-[0.2em] italic max-w-xs leading-relaxed">
                                            No explicit ledger matches found for "{row.accountName}" in the expanded sales dataset.
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
                                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest italic">Live syncing with finance/sales records</p>
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

          {/* 2. COGS TABLE */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4">
               <div className="w-1.5 h-6 bg-red-500 rounded-full"></div>
               <h3 className="text-xl font-black uppercase tracking-tight text-primary">COST OF GOODS SOLD (COGS)</h3>
            </div>
            <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-premium border border-primary/5 overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader className="bg-primary/5">
                  <TableRow className="hover:bg-transparent border-primary/5 h-12">
                    <TableHead className="pl-8 text-[10px] font-black uppercase tracking-tight text-primary w-16 border-r border-primary/10">NO</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-tight text-primary w-64 border-r border-primary/10">ACCOUNT NAME</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-tight text-muted-foreground w-24">BCA</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-tight text-muted-foreground w-24">MANDIRI</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-tight text-muted-foreground w-24">BRI</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-tight text-muted-foreground w-24 border-r border-primary/10">OTHER</TableHead>
                    <TableHead className="pr-8 text-right text-[12px] font-black uppercase tracking-tight text-primary bg-primary/5 w-44">TOTAL COGS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plCostsLoading ? (
                    <TableRow><TableCell colSpan={7} className="h-32 text-center animate-pulse text-muted-foreground font-black uppercase tracking-widest text-xs">Analyzing Costs...</TableCell></TableRow>
                  ) : (plCostsResponse?.data || []).filter((c: any) => c.category === 'COGS').map((row: any) => (
                    <TableRow key={`pl-cogs-${row.id}`} className="hover:bg-red-500/[0.01] border-primary/5 transition-colors whitespace-nowrap">
                      <TableCell className="pl-8 py-5 font-bold text-primary/40 text-[10px] border-r border-primary/5">{row.no}</TableCell>
                      <TableCell className="py-5 font-black text-primary text-[12px] uppercase border-r border-primary/5">{row.accountName}</TableCell>
                      <TableCell className="py-5 text-right font-mono text-[11px] opacity-60">{formatCurrency(row.bca)}</TableCell>
                      <TableCell className="py-5 text-right font-mono text-[11px] opacity-60">{formatCurrency(row.mandiri)}</TableCell>
                      <TableCell className="py-5 text-right font-mono text-[11px] opacity-60">{formatCurrency(row.bri)}</TableCell>
                      <TableCell className="py-5 text-right font-mono text-[11px] opacity-30 italic border-r border-primary/5">{formatCurrency(row.other)}</TableCell>
                      <TableCell className="pr-8 py-5 text-right font-mono text-[14px] font-black text-primary bg-primary/[0.02]">{formatCurrency(row.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 3. OPERATING EXPENSES TABLE */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4">
               <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
               <h3 className="text-xl font-black uppercase tracking-tight text-primary">OPERATING EXPENSES</h3>
            </div>
            <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-premium border border-primary/5 overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader className="bg-primary/5">
                  <TableRow className="hover:bg-transparent border-primary/5 h-12">
                    <TableHead className="pl-8 text-[10px] font-black uppercase tracking-tight text-primary w-16 border-r border-primary/10">NO</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-tight text-primary border-r border-primary/10">DESCRIPTION / SUB-CATEGORY</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-tight text-muted-foreground w-24">BCA</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-tight text-muted-foreground w-24">MANDIRI</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-tight text-muted-foreground w-24 border-r border-primary/10">CASH/OTHER</TableHead>
                    <TableHead className="pr-8 text-right text-[11px] font-black uppercase tracking-tight text-primary bg-primary/10 w-44">TOTAL EXPENSE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {plCostsLoading ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center animate-pulse text-muted-foreground font-black uppercase tracking-widest text-xs">Summarizing Expenses...</TableCell></TableRow>
                  ) : (plCostsResponse?.data || []).filter((c: any) => c.category === 'EXPENSE').map((row: any) => (
                    <TableRow key={`pl-exp-${row.id}`} className="hover:bg-orange-500/[0.01] border-primary/5 transition-colors whitespace-nowrap">
                      <TableCell className="pl-8 py-4 font-bold text-primary/40 text-[10px] border-r border-primary/5">{row.no}</TableCell>
                      <TableCell className="py-4 border-r border-primary/5">
                          <p className="text-[12px] font-black text-primary uppercase">{row.accountName}</p>
                          {row.subCategory && <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter">{row.subCategory}</p>}
                      </TableCell>
                      <TableCell className="py-4 text-right font-mono text-[11px] opacity-60">{formatCurrency(row.bca)}</TableCell>
                      <TableCell className="py-4 text-right font-mono text-[11px] opacity-60">{formatCurrency(row.mandiri)}</TableCell>
                      <TableCell className="py-4 text-right font-mono text-[11px] opacity-30 italic border-r border-primary/5">{formatCurrency(row.other)}</TableCell>
                      <TableCell className="pr-8 py-4 text-right font-mono text-[12px] font-black text-primary bg-primary/[0.05]">{formatCurrency(row.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 4. SUMMARY SECTION */}
          <div className="space-y-6 pt-12 border-t-2 border-dashed border-primary/10">
             <div className="flex items-center gap-3 px-4">
                <BarChart3 size={24} className="text-secondary" />
                <h3 className="text-xl font-black uppercase tracking-tight text-primary">BOTTOM-LINE FINANCIAL SUMMARY</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
                {plSummaryLoading ? (
                  Array(4).fill(0).map((_, i) => <div key={i} className="h-40 bg-muted/20 animate-pulse rounded-[2.5rem]" />)
                ) : (plSummaryResponse || []).map((sum: any) => (
                   <div key={sum.id} className={`p-8 rounded-[2.5rem] shadow-premium flex flex-col justify-between h-52 transition-transform hover:scale-[1.02] cursor-default ${sum.label.includes('PROFIT') ? 'bg-primary text-white' : 'bg-white border border-primary/5'}`}>
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${sum.label.includes('PROFIT') ? 'text-white/40' : 'text-muted-foreground/50'}`}>{sum.label}</p>
                        <h4 className={`text-2xl font-black font-mono leading-tight ${sum.label.includes('PROFIT') ? 'text-secondary' : 'text-primary'}`}>{formatCurrency(sum.total)}</h4>
                      </div>
                      <div className="flex items-center justify-between">
                         <div className={`w-12 h-1.5 rounded-full ${sum.label.includes('PROFIT') ? 'bg-secondary' : 'bg-primary/20'}`}></div>
                         <Badge className={sum.label.includes('PROFIT') ? 'bg-secondary text-primary' : 'bg-primary/5 text-primary'}>AUDITED</Badge>
                      </div>
                   </div>
                ))}
            </div>
            </div>
          </div>
        </TabsContent>


        {/* 7. BALANCE SHEET CONTENT */}
        <TabsContent value="bs" className="mt-0 space-y-8 pb-20 px-4 md:px-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-primary">PANCONVINCE MITRA INTERNATIONAL</h2>
            <div className="text-right">
              <p className="text-xs font-black text-secondary uppercase tracking-widest">BALANCE SHEET AS OF 31-DEC-2021</p>
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">Currency: IDR & USD</p>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] shadow-premium border border-primary/5 overflow-hidden">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent border-primary/5 h-14">
                  <TableHead className="pl-10 text-[11px] font-black uppercase tracking-tight text-primary w-2/5">ASSETS</TableHead>
                  <TableHead className="text-right text-[11px] font-black uppercase tracking-tight text-primary w-1/5">IDR</TableHead>
                  <TableHead className="text-right text-[11px] font-black uppercase tracking-tight text-primary w-1/5">USD</TableHead>
                  <TableHead className="pr-10 text-right text-[11px] font-black uppercase tracking-tight text-secondary w-1/5">Total (Rp)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bsLoading ? (
                  <TableRow><TableCell colSpan={4} className="h-48 text-center animate-pulse text-muted-foreground font-black uppercase tracking-widest text-xs">Stabilizing Balance Sheet...</TableCell></TableRow>
                ) : (() => {
                  const data = bsResponse?.data || [];
                  
                   const renderRow = (label: string, idr: any = null, usd: any = null, total: any = null, type: 'header' | 'group' | 'account' | 'total' = 'account') => {
                    const isSum = type === 'total' || type === 'header';
                    const numIdr = idr === null ? null : (Number(idr) || 0);
                    const numUsd = usd === null ? null : (Number(usd) || 0);
                    
                    // Safe calculation after null checks
                    const calcIdr = numIdr === null ? 0 : numIdr;
                    const calcUsd = numUsd === null ? 0 : numUsd;
                    const numTotal = total === null ? (calcIdr + (calcUsd * 14500)) : (Number(total) || 0);

                    // IDENTIFY BANK ROWS FOR DRILL-DOWN
                    const isBank = (label: string) => ['CITIBANK', 'MANDIRI', 'BCA', 'DANAMON', 'BNI', 'BRI', 'BTN'].includes(label.toUpperCase());
                    const canDrillDown = type === 'account' && isBank(label);

                    return (
                      <TableRow 
                        className={`border-primary/5 transition-colors ${isSum ? 'bg-primary/[0.02]' : ''} ${canDrillDown ? 'hover:bg-secondary/5 cursor-pointer group' : 'hover:bg-primary/[0.01]'}`}
                        onClick={() => {
                          if (canDrillDown) {
                            setSelectedBank(label);
                            setBankPage(1);
                            setIsBankModalOpen(true);
                          }
                        }}
                      >
                        <TableCell className={`py-4 font-black uppercase tracking-tight border-r border-primary/5 ${
                          type === 'header' ? 'text-[13px] text-primary pl-10' : 
                          type === 'group' ? 'text-[11px] text-primary/70 pl-14' : 
                          'text-[11px] text-primary/40 pl-20 font-bold italic'
                        }`}>
                          <div className="flex items-center gap-2">
                            {label}
                            {canDrillDown && <ArrowUpRight size={14} className="text-secondary opacity-0 group-hover:opacity-100 transition-all font-bold" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-[11px] border-r border-primary/5">
                          {numIdr !== null ? (numIdr === 0 ? '-' : formatCurrencyNoSymbol(numIdr)) : ''}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[11px] border-r border-primary/5">
                          {numUsd !== null ? (numUsd === 0 ? '-' : formatCurrencyNoSymbol(numUsd)) : ''}
                        </TableCell>
                        <TableCell className={`pr-10 text-right font-mono ${isSum ? 'text-[14px] font-black text-secondary' : 'text-[11px] text-primary/60 font-bold opacity-60'}`}>
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
                    const item = data.find((d: any) => d.accountName?.toLowerCase().includes(name.toLowerCase()));
                    return item ? Number(item[field]) || 0 : 0;
                  };

                  const sumGroup = (names: string[], field: 'idr' | 'usd' = 'idr') => {
                    return names.reduce((acc, name) => acc + findVal(name, field), 0);
                  };

                  // --- CALC SECTIONS ---
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
                      {/* ASSETS SECTION */}
                      {renderRow('Current Assets', null, null, null, 'header')}
                      
                      {/* CASH */}
                      {renderRow('CASH', null, null, null, 'group')}
                      {renderRow('Cash IDR', findVal('Cash IDR'), findVal('Cash IDR', 'usd'))}
                      {renderRow('Cash Other Currency', findVal('Cash Other Currency'), findVal('Cash Other Currency', 'usd'))}

                      {/* BANK */}
                      {renderRow('BANK', null, null, null, 'group')}
                      {renderRow('Citibank', findVal('Citibank'), findVal('Citibank', 'usd'))}
                      {renderRow('Mandiri', findVal('Mandiri'), findVal('Mandiri', 'usd'))}
                      {renderRow('BCA', findVal('BCA'), findVal('BCA', 'usd'))}
                      {renderRow('Danamon', findVal('Danamon'), findVal('Danamon', 'usd'))}
                      {renderRow('BRI', findVal('BRI'), findVal('BRI', 'usd'))}
                      {renderRow('BTN', findVal('BTN'), findVal('BTN', 'usd'))}

                      {/* DEPOSIT */}
                      {renderRow('DEPOSIT', null, null, null, 'group')}
                      {renderRow('Deposit to vendor', findVal('Deposit to vendor'), findVal('Deposit to vendor', 'usd'))}

                      {/* AR */}
                      {renderRow('ACCOUNT RECEIVABLE', null, null, null, 'group')}
                      {renderRow('AR Cash Advance', findVal('AR Cash Advance'), findVal('AR Cash Advance', 'usd'))}
                      {renderRow('AR Refund', findVal('AR Refund'), findVal('AR Refund', 'usd'))}
                      {renderRow('AR Staff Loan', findVal('AR Staff Loan'), findVal('AR Staff Loan', 'usd'))}
                      {renderRow('AR Trade', findVal('AR Trade'), findVal('AR Trade', 'usd'))}

                      {/* TAX */}
                      {renderRow('PREPAID TAX', null, null, null, 'group')}
                      {renderRow('PPN', findVal('PPN'), findVal('PPN', 'usd'))}

                      {/* TOTAL CURRENT */}
                      {renderRow('Total Current Assets', totalCurrentAssetsIdr, 0, totalCurrentAssetsIdr, 'total')}

                      {/* FIXED ASSETS */}
                      <TableRow className="bg-primary/5 h-2" />
                      {renderRow('Fixed Assets', null, null, null, 'header')}
                      {renderRow('Office Equipment', findVal('Office Equipment'))}
                      {renderRow('Vehicle', findVal('Vehicle'))}
                      {renderRow('Total Fixed Assets', totalFixedAssetsIdr, 0, totalFixedAssetsIdr, 'total')}

                      {/* GRAND TOTAL ASSETS */}
                      <TableRow className="bg-primary h-12">
                        <TableCell className="pl-10 text-white font-black uppercase text-[14px]">TOTAL ASSETS</TableCell>
                        <TableCell className="text-right text-white font-mono text-[11px]">-</TableCell>
                        <TableCell className="text-right text-white font-mono text-[11px]">-</TableCell>
                        <TableCell className="pr-10 text-right text-secondary font-black font-mono text-[18px]">
                          {formatCurrencyNoSymbol(totalCurrentAssetsIdr + totalFixedAssetsIdr)}
                        </TableCell>
                      </TableRow>

                      {/* LIABILITIES SECTION */}
                      <TableRow className="h-12" />
                      <TableRow className="bg-primary/5">
                        <TableHead className="pl-10 text-[11px] font-black uppercase text-primary">LIABILITIES & EQUITY</TableHead>
                        <TableHead className="text-right text-primary/40 text-[10px]">IDR</TableHead>
                        <TableHead className="text-right text-primary/40 text-[10px]">USD</TableHead>
                        <TableHead className="pr-10 text-right text-secondary/60 text-[10px]">TOTAL (Rp)</TableHead>
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
                        <TableCell className="pl-10 text-white font-black uppercase text-[14px]">LIABILITIES & EQUITY</TableCell>
                        <TableCell className="text-right text-white font-mono text-[11px]">-</TableCell>
                        <TableCell className="text-right text-white font-mono text-[11px]">-</TableCell>
                        <TableCell className="pr-10 text-right text-secondary font-black font-mono text-[18px]">
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

        {/* 8. INTER-ACCOUNT CONTENT */}

        <TabsContent value="ia" className="mt-0">
          <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-premium border border-primary/5 overflow-x-auto">
            <Table className="min-w-[1500px]">
              <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent border-primary/5 h-12">
                  <TableHead className="pl-8 text-[10px] font-black uppercase tracking-tight text-primary w-12 border-r border-primary/10">NO</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-tight text-primary w-48 border-r border-primary/10">DESC</TableHead>
                  <TableHead className="text-right text-[9px] font-bold text-secondary/70">BCA 80</TableHead>
                  <TableHead className="text-right text-[9px] font-bold text-secondary/70">MANDIRI 44</TableHead>
                  <TableHead className="text-right text-[9px] font-bold text-secondary/70">BRI 87</TableHead>
                  <TableHead className="text-right text-[9px] font-bold text-secondary/70">Cash IDR</TableHead>
                  <TableHead className="text-right text-[9px] font-bold text-secondary/70">Non CB</TableHead>
                  <TableHead className="text-right text-[9px] font-bold text-secondary/70">CITI USD</TableHead>
                  <TableHead className="pr-8 text-right text-[11px] font-black text-secondary bg-secondary/5">Cash USD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {iaLoading ? (
                  <TableRow><TableCell colSpan={9} className="h-48 text-center animate-pulse text-muted-foreground font-black uppercase tracking-widest text-xs">Reconciling Inter-Accounts...</TableCell></TableRow>
                ) : (iaResponse?.data || []).map((row: any) => (
                  <TableRow key={row.id} className="border-primary/5 hover:bg-primary/[0.01] transition-colors whitespace-nowrap">
                    <TableCell className="pl-8 py-5 text-[10px] font-bold text-primary/40 border-r border-primary/5">{row.no}</TableCell>
                    <TableCell className="py-5 font-black text-primary text-[12px] uppercase border-r border-primary/5">{row.description}</TableCell>
                    <TableCell className="py-5 text-right font-mono text-[11px]">{formatCurrency(row.bca)}</TableCell>
                    <TableCell className="py-5 text-right font-mono text-[11px]">{formatCurrency(row.mandiri)}</TableCell>
                    <TableCell className="py-5 text-right font-mono text-[11px]">{formatCurrency(row.bri)}</TableCell>
                    <TableCell className="py-5 text-right font-mono text-[11px] opacity-60 italic">{formatCurrency(row.cashIdr)}</TableCell>
                    <TableCell className="py-5 text-right font-mono text-[11px] opacity-30 italic">{formatCurrency(row.nonCb)}</TableCell>
                    <TableCell className="py-5 text-right font-mono text-[11px]">{formatCurrency(row.citiUsd)}</TableCell>
                    <TableCell className="pr-8 py-5 text-right font-mono text-[12px] font-black text-secondary bg-secondary/[0.02]">{formatCurrency(row.cashUsd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls meta={iaResponse?.meta} onPageChange={setIaPage} isFetching={iaLoading} />
        </TabsContent>

      </Tabs>

      {/* BANK DRILL-DOWN MODAL */}
      <Dialog open={isBankModalOpen} onOpenChange={setIsBankModalOpen}>
        <DialogContent className="max-w-[95vw] w-full bg-white/95 backdrop-blur-2xl border-white/20 shadow-premium rounded-[2.5rem] p-0 overflow-y-auto max-h-[90vh] ring-1 ring-black/5">
          <DialogHeader className="p-10 border-b border-primary/5 bg-white/40 sticky top-0 z-10 backdrop-blur-md">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary group">
                     <Landmark size={24} className="group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                     <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-primary">{selectedBank} LEDGER</DialogTitle>
                     <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">Audit Drill-down: Transactional Fidelity for <span className="text-secondary">{selectedBank}</span></p>
                  </div>
               </div>
               <Badge variant="outline" className="h-8 px-4 rounded-full bg-secondary/5 text-secondary border-secondary/10 font-bold uppercase tracking-widest text-[9px]">REAL-TIME RECONCILIATION</Badge>
            </div>
          </DialogHeader>
          
          <div className="p-10 space-y-6">
             <div className="bg-white/50 backdrop-blur-sm rounded-3xl border border-primary/5 shadow-inner-lg overflow-x-auto">
                <Table className="min-w-[1600px]">
                  <TableHeader className="bg-primary/5">
                    <TableRow className="hover:bg-transparent border-primary/5 h-14">
                      <TableHead className="pl-8 text-[9px] font-black uppercase tracking-widest text-primary/60 w-28 text-center ring-1 ring-primary/5">Tanggal</TableHead>
                      <TableHead className="text-[9px] font-black uppercase tracking-widest text-primary/60 ring-1 ring-primary/5">Keterangan Transaksi</TableHead>
                      <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-primary/60 w-32 ring-1 ring-primary/5">Debet</TableHead>
                      <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-primary/60 w-32 ring-1 ring-primary/5">Kredit</TableHead>
                      <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-primary w-44 ring-1 ring-primary/5">Ledger</TableHead>
                      <TableHead className="text-left text-[9px] font-black uppercase tracking-widest text-primary/70 w-40 ring-1 ring-primary/5">Sub Ledger - 1</TableHead>
                      <TableHead className="text-left text-[9px] font-black uppercase tracking-widest text-primary/50 w-40 ring-1 ring-primary/5">Sub Ledger - 2</TableHead>
                      <TableHead className="pr-8 text-left text-[9px] font-black uppercase tracking-widest text-primary/50 w-40 ring-1 ring-primary/5">Sub Ledger - 3</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankTxsLoading ? (
                      <TableRow><TableCell colSpan={8} className="h-48 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Sourcing Bank Records...</TableCell></TableRow>
                    ) : (bankTxsResponse?.data || []).length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="h-48 text-center text-muted-foreground font-bold uppercase text-[10px]">No transaction history found for {selectedBank}</TableCell></TableRow>
                    ) : (bankTxsResponse?.data || []).map((row: any) => (
                      <TableRow key={row.id} className="border-primary/5 hover:bg-primary/[0.01] transition-colors whitespace-nowrap">
                        <TableCell className="pl-8 py-4 font-bold text-xs text-primary">{formatDate(row.date)}</TableCell>
                        <TableCell className="py-4 text-[11px] font-medium text-muted-foreground max-w-md truncate">{row.description}</TableCell>
                        <TableCell className="py-4 text-right font-bold text-red-500 text-xs">
                           {row.withdrawal && Number(row.withdrawal) !== 0 ? formatCurrency(row.withdrawal) : "-"}
                        </TableCell>
                        <TableCell className="py-4 text-right font-bold text-green-600 text-xs">
                          {row.deposit && Number(row.deposit) !== 0 ? formatCurrency(row.deposit) : "-"}
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <span className="text-xs font-bold text-primary whitespace-nowrap">
                            {row.ledger ? formatCurrency(row.ledger) : "-"}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 text-left">
                          <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-tighter">{row.subLedger1 || row.subCategory || "-"}</span>
                        </TableCell>
                        <TableCell className="py-4 text-left">
                          <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-tighter">{row.subLedger2 || "-"}</span>
                        </TableCell>
                        <TableCell className="pr-8 py-4 text-left">
                          <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-tighter">{row.subLedger3 || "-"}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             </div>

             {/* MODAL PAGINATION */}
             <div className="flex items-center justify-between px-2 pt-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                   Page <span className="text-secondary">{bankTxsResponse?.meta?.page || 1}</span> of <span className="text-primary">{bankTxsResponse?.meta?.totalPages || 1}</span>
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
                     disabled={bankPage >= (bankTxsResponse?.meta?.totalPages || 1)}
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
