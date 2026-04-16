import { useState } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
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
import { Landmark, TrendingUp, Users, Truck, Package, PieChart, BarChart3, Repeat, Filter } from "lucide-react";

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState("transactions");
  
  // Separate page state for each tab to ensure independent navigation
  const [transPage, setTransPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const [arPage, setArPage] = useState(1);
  const [apPage, setApPage] = useState(1);
  const [assetsPage, setAssetsPage] = useState(1);
  const [plPage, setPlPage] = useState(1);
  const [plCostPage, setPlCostPage] = useState(1);
  const [bsPage, setBsPage] = useState(1);
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
  const { data: plResponse, isLoading: plLoading } = getPL({ page: plPage, limit });
  const { data: plCostsResponse, isLoading: plCostsLoading } = getPLCosts({ page: plCostPage, limit });
  const { data: bsResponse, isLoading: bsLoading } = getBalanceSheet({ page: bsPage, limit });
  const { data: iaResponse, isLoading: iaLoading } = getInterAccountTransfers({ page: iaPage, limit });

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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 px-4 md:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary uppercase flex items-center gap-3">
             <Landmark className="text-secondary" size={32} />
             Financial Reporting
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Enterprise financial consolidation and centralized ledger analysis.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 bg-transparent h-auto mb-8 p-0">
          {[
            { id: "transactions", label: "Ledger", icon: Landmark },
            { id: "sales", label: "Sales", icon: TrendingUp },
            { id: "ar", label: "AR", icon: Users },
            { id: "ap", label: "AP", icon: Truck },
            { id: "assets", label: "Assets", icon: Package },
            { id: "pl", label: "P&L", icon: PieChart },
            { id: "bs", label: "Balance", icon: BarChart3 },
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
                <SelectItem value="DANAMON" className="text-xs font-bold uppercase rounded-lg">Danamon</SelectItem>
                <SelectItem value="NON_CB" className="text-xs font-bold uppercase rounded-lg">Non CB</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-primary/5">
                  <TableHead className="pl-8 py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Date</TableHead>
                  <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-center">Reference</TableHead>
                  <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Description</TableHead>
                  <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Category</TableHead>
                  <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-right">Debit</TableHead>
                  <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-right">Credit</TableHead>
                  <TableHead className="pr-8 py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-black">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transLoading ? (
                  <TableRow><TableCell colSpan={7} className="h-48 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest animate-pulse">Synchronizing Ledger...</TableCell></TableRow>
                ) : (transResponse?.data || []).map((row: any) => (
                  <TableRow key={row.id} className="border-primary/5 hover:bg-primary/[0.01] transition-colors whitespace-nowrap">
                    <TableCell className="pl-8 py-4 font-bold text-xs text-primary">{formatDate(row.date)}</TableCell>
                    <TableCell className="py-4 text-center">
                      <span className="text-[10px] font-mono text-muted-foreground/50">{row.reference || "-"}</span>
                    </TableCell>
                    <TableCell className="py-4 text-[12px] font-medium text-muted-foreground max-w-xs truncate">{row.description}</TableCell>
                    <TableCell className="py-4 text-center">
                      <Badge variant="outline" className="bg-secondary/5 text-secondary border-secondary/10 text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-lg">
                        {row.category || row.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-right font-bold text-red-500 text-xs">
                       {row.withdrawal && Number(row.withdrawal) !== 0 ? formatCurrency(row.withdrawal) : "-"}
                    </TableCell>
                    <TableCell className="py-4 text-right font-bold text-green-600 text-xs">
                      {row.deposit && Number(row.deposit) !== 0 ? formatCurrency(row.deposit) : "-"}
                    </TableCell>
                    <TableCell className="pr-8 py-4 text-right font-black text-primary text-xs">
                      {formatCurrency(row.balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls meta={transResponse?.meta} onPageChange={setTransPage} isFetching={transLoading} />
        </TabsContent>

        {/* 2. SALES CONTENT */}
        <TabsContent value="sales" className="mt-0 space-y-4">
          <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                {/* Header Row 1: Groups for Sales */}
                <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap h-12">
                  <TableHead colSpan={8} className="pl-8 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 border-r border-primary/5">Information & Pricing</TableHead>
                  <TableHead colSpan={7} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-secondary border-r border-primary/5 bg-secondary/5">Payment Breakdown</TableHead>
                  <TableHead colSpan={6} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 bg-amber-50">Status & Taxes</TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap bg-muted/50">
                  <TableHead className="pl-8 py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">No</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Date</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Billing To</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Project</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Description</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono text-primary">Basic Price</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono text-secondary">Mngt Fee</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono border-r border-primary/5 text-primary">Total</TableHead>
                  {/* Payments */}
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right">BCA</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right">Mandiri</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right">Danamon</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right">BRI</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right">BTN</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right">Cash IDR</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right border-r border-primary/5">Non CB</TableHead>
                  {/* Status */}
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right text-red-500 font-bold">Outstanding</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right">PPh 23</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right">AP PPh 23</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right">PPN Tax</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right">AP PPN</TableHead>
                  <TableHead className="pr-8 py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right">Net Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesLoading ? (
                  <TableRow><TableCell colSpan={21} className="h-48 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">Loading Sales...</TableCell></TableRow>
                ) : (salesResponse?.data || []).map((row: any) => (
                  <TableRow key={row.id} className="hover:bg-primary/[0.01] border-primary/5 transition-colors whitespace-nowrap">
                    <TableCell className="pl-8 py-4 font-bold text-primary text-xs">{row.no}</TableCell>
                    <TableCell className="py-4 text-xs font-medium text-muted-foreground uppercase">{row.date} {row.year}</TableCell>
                    <TableCell className="py-4 font-bold text-[12px] text-primary uppercase truncate max-w-[150px]">{row.billingTo}</TableCell>
                    <TableCell className="py-4 text-[10px] font-bold text-secondary uppercase tracking-tight truncate max-w-[150px]">{row.project}</TableCell>
                    <TableCell className="py-4 text-[11px] font-medium text-muted-foreground max-w-[200px] truncate">{row.description}</TableCell>
                    <TableCell className="py-4 text-right font-medium text-xs font-mono">{formatCurrency(row.basicPrice)}</TableCell>
                    <TableCell className="py-4 text-right font-medium text-xs font-mono text-secondary">{formatCurrency(row.managementFee)}</TableCell>
                    <TableCell className="py-4 text-right font-black text-primary text-xs font-mono border-r border-primary/5 bg-primary/5">{formatCurrency(row.totalAmount)}</TableCell>
                    {/* Payments */}
                    <TableCell className="py-4 text-right text-xs opacity-70 font-mono">{formatCurrency(row.bca)}</TableCell>
                    <TableCell className="py-4 text-right text-xs opacity-70 font-mono">{formatCurrency(row.mandiri)}</TableCell>
                    <TableCell className="py-4 text-right text-xs opacity-70 font-mono">{formatCurrency(row.danamon)}</TableCell>
                    <TableCell className="py-4 text-right text-xs opacity-70 font-mono">{formatCurrency(row.bri)}</TableCell>
                    <TableCell className="py-4 text-right text-xs opacity-70 font-mono">{formatCurrency(row.btn)}</TableCell>
                    <TableCell className="py-4 text-right text-xs opacity-70 font-mono">{formatCurrency(row.cashIdr)}</TableCell>
                    <TableCell className="py-4 text-right text-xs opacity-70 font-mono border-r border-primary/5">{formatCurrency(row.nonCb)}</TableCell>
                    {/* Status */}
                    <TableCell className="py-4 text-right text-xs text-red-500 font-bold font-mono">{formatCurrency(row.outstanding)}</TableCell>
                    <TableCell className="py-4 text-right text-[10px] text-blue-600 font-medium">{formatCurrency(row.pph23)}</TableCell>
                    <TableCell className="py-4 text-right text-[10px] text-blue-400 font-medium">{formatCurrency(row.apPph23)}</TableCell>
                    <TableCell className="py-4 text-right text-[10px] text-orange-600 font-medium">{formatCurrency(row.ppnTax)}</TableCell>
                    <TableCell className="py-4 text-right text-[10px] text-orange-400 font-medium">{formatCurrency(row.apPpn)}</TableCell>
                    <TableCell className="pr-8 py-4 text-right text-xs font-black text-primary bg-muted/5">{formatCurrency(row.netReceived)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls meta={salesResponse?.meta} onPageChange={setSalesPage} isFetching={salesLoading} />
        </TabsContent>

        {/* 3. AR CONTENT */}
        <TabsContent value="ar" className="mt-0 space-y-4">
          <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                {/* Header Row 1: Groups */}
                <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap h-12">
                  <TableHead colSpan={4} className="pl-8 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 border-r border-primary/5">Information</TableHead>
                  <TableHead colSpan={3} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-primary border-r border-primary/5 bg-primary/5">End of 2020</TableHead>
                  <TableHead colSpan={7} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-secondary border-r border-primary/5 bg-secondary/5">Mutasi 2021</TableHead>
                  <TableHead colSpan={2} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 border-r border-primary/5 bg-amber-50">Adjustment</TableHead>
                  <TableHead colSpan={2} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50">Outstanding</TableHead>
                </TableRow>
                {/* Header Row 2: Sub-headers */}
                <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap bg-muted/50">
                  {/* Info */}
                  <TableHead className="pl-8 py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Type</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Subtype</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Entity</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground border-r border-primary/5">Description</TableHead>
                  {/* End 2020 */}
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">IDR</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">USD</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono border-r border-primary/5">Rate</TableHead>
                  {/* Mutasi */}
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">BCA</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">Mandiri</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">BRI</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">Cash IDR</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">Non CB</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">Citi</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono border-r border-primary/5">Cash USD</TableHead>
                  {/* Adjustment */}
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">IDR</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono border-r border-primary/5">USD</TableHead>
                  {/* Outstanding */}
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">IDR</TableHead>
                  <TableHead className="pr-8 py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">USD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arLoading ? (
                  <TableRow><TableCell colSpan={18} className="h-48 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">Loading AR Data...</TableCell></TableRow>
                ) : (arResponse?.data || []).map((row: any) => (
                  <TableRow key={row.id} className="border-primary/5 hover:bg-primary/[0.01] transition-colors whitespace-nowrap">
                    <TableCell className="pl-8 py-4 font-bold text-primary text-[10px]">
                        <Badge variant="outline" className="bg-secondary/5 text-secondary border-secondary/10 text-[8px] font-bold uppercase tracking-tight px-1.5 py-0 rounded-md font-mono">{row.arType}</Badge>
                    </TableCell>
                    <TableCell className="py-4 text-[11px] font-bold text-muted-foreground uppercase">{row.subCategory}</TableCell>
                    <TableCell className="py-4 font-bold text-[13px] text-primary uppercase truncate max-w-[120px]">{row.entityName}</TableCell>
                    <TableCell className="py-4 text-[11px] font-medium text-muted-foreground max-w-[180px] truncate border-r border-primary/5">{row.description}</TableCell>
                    
                    {/* End 2020 */}
                    <TableCell className="py-4 text-right text-xs font-medium font-mono">{formatCurrency(row.endOf2020Idr)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-medium font-mono text-muted-foreground/70">{formatCurrency(row.endOf2020Usd)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-medium font-mono border-r border-primary/5 italic text-muted-foreground/50">{row.rate ? formatCurrency(row.rate) : '-'}</TableCell>
                    
                    {/* Mutasi */}
                    <TableCell className="py-4 text-right text-xs font-mono opacity-80">{formatCurrency(row.bca)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-mono opacity-80">{formatCurrency(row.mandiri)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-mono opacity-80">{formatCurrency(row.bri)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-mono opacity-80">{formatCurrency(row.cashIdr)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-mono opacity-50 italic">{formatCurrency(row.nonCb)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-mono opacity-80">{formatCurrency(row.citibank)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-mono border-r border-primary/5 opacity-80">{formatCurrency(row.cashUsd)}</TableCell>
                    
                    {/* Adjustment */}
                    <TableCell className="py-4 text-right text-xs text-amber-600 font-bold font-mono italic">{formatCurrency(row.adjustmentIdr)}</TableCell>
                    <TableCell className="py-4 text-right text-xs text-amber-600/60 font-bold font-mono italic border-r border-primary/5">{formatCurrency(row.adjustmentUsd)}</TableCell>
                    
                    {/* Outstanding */}
                    <TableCell className="py-4 text-right text-xs text-emerald-600 font-black bg-emerald-500/5 font-mono">
                      {Number(row.outstandingIdr) > 0 ? <span className="text-red-500">{formatCurrency(row.outstandingIdr)}</span> : formatCurrency(row.outstandingIdr)}
                    </TableCell>
                    <TableCell className="pr-8 py-4 text-right text-xs text-emerald-600/60 font-black bg-emerald-500/5 font-mono">
                      {formatCurrency(row.outstandingUsd)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls meta={arResponse?.meta} onPageChange={setArPage} isFetching={arLoading} />
        </TabsContent>

        {/* 4. AP CONTENT */}
        <TabsContent value="ap" className="mt-0 space-y-4">
          <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                {/* Header Row 1: Groups */}
                <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap h-12">
                  <TableHead colSpan={6} className="pl-8 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 border-r border-primary/5">Information</TableHead>
                  <TableHead colSpan={3} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-primary border-r border-primary/5 bg-primary/5">Initial Amount</TableHead>
                  <TableHead colSpan={8} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-secondary border-r border-primary/5 bg-secondary/5">Payments 2020</TableHead>
                  <TableHead colSpan={2} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 border-r border-primary/5 bg-amber-50">Notes</TableHead>
                  <TableHead colSpan={2} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50">Outstanding</TableHead>
                </TableRow>
                {/* Header Row 2: Sub-headers */}
                <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap bg-muted/50">
                  {/* Info */}
                  <TableHead className="pl-8 py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Payable</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Year</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Vendor</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Description</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Category</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground border-r border-primary/5">Project Ref</TableHead>
                  {/* Initial */}
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">IDR</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">USD</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono border-r border-primary/5">Rate</TableHead>
                  {/* Payments */}
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">BCA</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">Mandiri</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">BTN</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">BRI</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">Cash IDR</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">Non CB</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">Citi</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono border-r border-primary/5">Cash USD</TableHead>
                  {/* Notes */}
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right">Notes Yogi</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right border-r border-primary/5">Koreksi</TableHead>
                  {/* Outstanding */}
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">IDR</TableHead>
                  <TableHead className="pr-8 py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">USD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apLoading ? (
                  <TableRow><TableCell colSpan={21} className="h-48 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">Loading AP Data...</TableCell></TableRow>
                ) : (apResponse?.data || []).map((row: any) => (
                  <TableRow key={row.id} className="border-primary/5 hover:bg-primary/[0.01] transition-colors whitespace-nowrap">
                    <TableCell className="pl-8 py-4 font-bold text-primary text-[10px]">
                        <Badge variant="outline" className="bg-secondary/5 text-secondary border-secondary/10 text-[8px] font-bold uppercase tracking-tight px-1.5 py-0 rounded-md font-mono">{row.payable}</Badge>
                    </TableCell>
                    <TableCell className="py-4 text-[11px] font-medium text-muted-foreground">{row.year}</TableCell>
                    <TableCell className="py-4 font-bold text-[13px] text-primary uppercase truncate max-w-[120px]">{row.vendor}</TableCell>
                    <TableCell className="py-4 text-[10px] font-medium text-muted-foreground max-w-[150px] truncate">{row.keterangan}</TableCell>
                    <TableCell className="py-4 text-[10px] font-bold text-secondary uppercase tracking-tight">{row.costCategory}</TableCell>
                    <TableCell className="py-4 text-[10px] font-medium text-muted-foreground uppercase border-r border-primary/5 max-w-[150px] truncate">{row.projectRef}</TableCell>
                    
                    {/* Initial Amount */}
                    <TableCell className="py-4 text-right text-xs font-medium font-mono">{formatCurrency(row.idr)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-medium font-mono text-muted-foreground/70">{formatCurrency(row.usd)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-medium font-mono border-r border-primary/5 italic text-muted-foreground/50">{row.rate ? formatCurrency(row.rate) : '-'}</TableCell>
                    
                    {/* Payments */}
                    <TableCell className="py-4 text-right text-xs font-mono opacity-80">{formatCurrency(row.bca)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-mono opacity-80">{formatCurrency(row.mandiri)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-mono opacity-80">{formatCurrency(row.btn)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-mono opacity-80">{formatCurrency(row.bri)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-mono opacity-80">{formatCurrency(row.cashIdr)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-mono opacity-50 italic">{formatCurrency(row.nonCb)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-mono opacity-80">{formatCurrency(row.citibank)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-mono border-r border-primary/5 opacity-80">{formatCurrency(row.cashUsd)}</TableCell>
                    
                    {/* Notes */}
                    <TableCell className="py-4 text-right text-[10px] text-muted-foreground max-w-[150px] truncate">{row.notesYogi}</TableCell>
                    <TableCell className="py-4 text-right text-xs text-orange-400 font-medium border-r border-primary/5 italic">{row.koreksiSelisih}</TableCell>
                    
                    {/* Outstanding */}
                    <TableCell className="py-4 text-right text-xs text-emerald-600 font-black bg-emerald-500/5 font-mono">
                      {Number(row.outstandingIdr) > 0 ? <span className="text-red-500">{formatCurrency(row.outstandingIdr)}</span> : formatCurrency(row.outstandingIdr)}
                    </TableCell>
                    <TableCell className="pr-8 py-4 text-right text-xs text-emerald-600/60 font-black bg-emerald-500/5 font-mono">
                      {formatCurrency(row.outstandingUsd)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls meta={apResponse?.meta} onPageChange={setApPage} isFetching={apLoading} />
        </TabsContent>

        {/* 5. ASSETS CONTENT */}
        <TabsContent value="assets" className="mt-0 space-y-4">
          <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                {/* Header Row 1: Groups */}
                <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap h-12">
                  <TableHead colSpan={6} className="pl-8 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 border-r border-primary/5">Asset Information</TableHead>
                  <TableHead colSpan={13} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-primary border-r border-primary/5 bg-primary/5 text-secondary">Depreciation Breakdown (2021)</TableHead>
                  <TableHead colSpan={3} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 bg-amber-50">Summary</TableHead>
                </TableRow>
                {/* Header Row 2: Sub-headers */}
                <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap bg-muted/50">
                  <TableHead className="pl-8 py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground w-12">ID</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Date</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Bank Ref</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">Asset Name</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">Price</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-center border-r border-primary/5">Life (M)</TableHead>
                  
                  {/* Monthly */}
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right bg-secondary/5">Accum 2020</TableHead>
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, idx) => (
                    <TableHead key={m} className={`py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right bg-secondary/5 ${idx === 11 ? "border-r border-primary/5" : ""}`}>
                      {m}
                    </TableHead>
                  ))}

                  {/* Summary */}
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-black text-primary">Total 2021</TableHead>
                  <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-black">Accum 2021</TableHead>
                  <TableHead className="pr-8 py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-black border-l border-primary/5 bg-amber-50">Book Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assetsLoading ? (
                  <TableRow><TableCell colSpan={22} className="h-48 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest animate-pulse">Syncing Assets...</TableCell></TableRow>
                ) : (assetsResponse?.data || []).map((row: any) => (
                  <TableRow key={row.id} className="border-primary/5 hover:bg-primary/[0.01] transition-colors whitespace-nowrap">
                    <TableCell className="pl-8 py-4 text-[10px] font-bold text-muted-foreground">{row.id}</TableCell>
                    <TableCell className="py-4 text-[10px] font-medium text-muted-foreground">{row.purchaseDate || "-"}</TableCell>
                    <TableCell className="py-4 text-[10px] font-mono text-muted-foreground truncate max-w-[100px]">{row.bankRef || "-"}</TableCell>
                    <TableCell className="py-4 font-bold text-xs text-primary uppercase truncate max-w-[150px]">{row.assetName}</TableCell>
                    <TableCell className="py-4 text-right font-mono text-xs">{formatCurrency(row.purchasePrice)}</TableCell>
                    <TableCell className="py-4 text-center text-[10px] font-bold border-r border-primary/5 text-secondary">{row.usefulLifeMonths}</TableCell>
                    
                    {/* Monthly Mapping */}
                    <TableCell className="py-4 text-right font-mono text-[10px] bg-secondary/[0.02]">{formatCurrency(row.accumulated2020)}</TableCell>
                    {["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].map((m, idx) => (
                      <TableCell key={m} className={`py-4 text-right font-mono text-[10px] bg-secondary/[0.02] opacity-70 ${idx === 11 ? "border-r border-primary/5" : ""}`}>
                        {Number(row[m]) !== 0 ? formatCurrency(row[m]) : "-"}
                      </TableCell>
                    ))}

                    {/* Summary Mapping */}
                    <TableCell className="py-4 text-right font-black text-primary text-xs font-mono">{formatCurrency(row.total2021)}</TableCell>
                    <TableCell className="py-4 text-right font-bold text-muted-foreground text-xs font-mono">{formatCurrency(row.accumulated2021)}</TableCell>
                    <TableCell className="pr-8 py-4 text-right font-black text-primary text-xs font-mono bg-amber-50/50">{formatCurrency(row.bookValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls meta={assetsResponse?.meta} onPageChange={setAssetsPage} isFetching={assetsLoading} />
        </TabsContent>

        {/* 6. P&L CONTENT */}
        <TabsContent value="pl" className="mt-0 space-y-8">
          {/* Revenue Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1">
              <TrendingUp size={16} /> Revenue Statement
            </h3>
            <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-x-auto text-[11px]">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap h-12">
                     <TableHead colSpan={2} className="pl-8 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 border-r border-primary/5">Account Info</TableHead>
                     <TableHead colSpan={5} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/5">Revenue & Tax</TableHead>
                  </TableRow>
                  <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap bg-muted/50">
                    <TableHead className="pl-8 py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground w-12">No</TableHead>
                    <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground border-r border-primary/5">Account Name</TableHead>
                    <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right">Gross</TableHead>
                    <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right text-orange-600">VAT / AP VAT</TableHead>
                    <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right text-red-600">Credit Note</TableHead>
                    <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right border-r border-primary/5 text-red-400">AP Credit Note</TableHead>
                    <TableHead className="pr-8 py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-black shadow-sm text-primary">Net Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plLoading ? (
                    <TableRow><TableCell colSpan={7} className="h-48 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">Loading Revenue...</TableCell></TableRow>
                  ) : (plResponse?.data || []).map((row: any) => (
                    <TableRow key={row.id} className="border-primary/5 hover:bg-primary/[0.01] transition-colors whitespace-nowrap">
                      <TableCell className="pl-8 py-4 text-xs font-bold text-muted-foreground">{row.no || "-"}</TableCell>
                      <TableCell className="py-4 font-bold text-primary text-xs uppercase tracking-tight border-r border-primary/5">{row.accountName}</TableCell>
                      <TableCell className="py-4 text-right text-xs font-medium font-mono">{formatCurrency(row.gross)}</TableCell>
                      <TableCell className="py-4 text-right text-xs font-mono">
                         <span className="text-orange-600 font-bold">{formatCurrency(row.vat)}</span>
                         <span className="mx-1 text-muted-foreground/30">/</span>
                         <span className="text-orange-400 font-medium">{formatCurrency(row.apVat)}</span>
                      </TableCell>
                      <TableCell className="py-4 text-right text-xs font-medium text-red-600 font-mono">{formatCurrency(row.creditNote)}</TableCell>
                      <TableCell className="py-4 text-right text-xs font-medium text-red-400 font-mono border-r border-primary/5">{formatCurrency(row.apCreditNote)}</TableCell>
                      <TableCell className="pr-8 py-4 text-right font-black text-primary text-xs font-mono bg-primary/5">{formatCurrency(row.netSales)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationControls meta={plResponse?.meta} onPageChange={setPlPage} isFetching={plLoading} />
          </div>

          {/* Expenses & COGS Section */}
          <div className="space-y-4 pt-4 border-t border-primary/5">
            <h3 className="text-sm font-black uppercase tracking-widest text-secondary flex items-center gap-2 px-1">
              <PieChart size={16} /> Cost & Expenses Breakdown
            </h3>
            <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-x-auto text-[11px]">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap h-12">
                     <TableHead colSpan={2} className="pl-8 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 border-r border-primary/5">Cost Detail</TableHead>
                     <TableHead colSpan={7} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-secondary bg-secondary/5">Payment Breakdown</TableHead>
                     <TableHead className="bg-secondary/10"></TableHead>
                  </TableRow>
                  <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap bg-muted/50">
                    <TableHead className="pl-8 py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground w-12">No</TableHead>
                    <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground border-r border-primary/5">Account Name</TableHead>
                    <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">BCA</TableHead>
                    <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">Mandiri</TableHead>
                    <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">BRI</TableHead>
                    <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">BTN</TableHead>
                    <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">Cash IDR</TableHead>
                    <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">Non CB</TableHead>
                    <TableHead className="py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono border-r border-primary/5">Others</TableHead>
                    <TableHead className="pr-8 py-4 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-black shadow-sm text-secondary">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plCostsLoading ? (
                    <TableRow><TableCell colSpan={10} className="h-48 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">Loading Costs...</TableCell></TableRow>
                  ) : (plCostsResponse?.data || []).map((row: any) => (
                    <TableRow key={row.id} className="border-primary/5 hover:bg-secondary/[0.01] transition-colors whitespace-nowrap">
                      <TableCell className="pl-8 py-4 text-xs font-bold text-muted-foreground">{row.no || "-"}</TableCell>
                      <TableCell className="py-4 font-bold text-secondary text-xs uppercase tracking-tight border-r border-primary/5">{row.accountName}</TableCell>
                      <TableCell className="py-4 text-right text-xs font-mono">{formatCurrency(row.bca)}</TableCell>
                      <TableCell className="py-4 text-right text-xs font-mono">{formatCurrency(row.mandiri)}</TableCell>
                      <TableCell className="py-4 text-right text-xs font-mono">{formatCurrency(row.bri)}</TableCell>
                      <TableCell className="py-4 text-right text-xs font-mono">{formatCurrency(row.btn)}</TableCell>
                      <TableCell className="py-4 text-right text-xs font-mono">{formatCurrency(row.cashIdr)}</TableCell>
                      <TableCell className="py-4 text-right text-xs font-mono">{formatCurrency(row.nonCb)}</TableCell>
                      <TableCell className="py-4 text-right text-xs font-mono border-r border-primary/5">{formatCurrency(row.other)}</TableCell>
                      <TableCell className="pr-8 py-4 text-right font-black text-secondary text-xs font-mono bg-secondary/5">{formatCurrency(row.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationControls meta={plCostsResponse?.meta} onPageChange={setPlCostPage} isFetching={plCostsLoading} />
          </div>
        </TabsContent>

        {/* 7. BALANCE SHEET CONTENT */}
        <TabsContent value="bs" className="mt-0 space-y-4">
          <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap">
                  <TableHead className="pl-8 py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Account Category</TableHead>
                  <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono text-primary">IDR Balance</TableHead>
                  <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono text-secondary">USD Balance</TableHead>
                  <TableHead className="pr-8 py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-black font-mono">Total Consolidated (IDR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bsLoading ? (
                  <TableRow><TableCell colSpan={4} className="h-48 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest animate-pulse">Loading Balance...</TableCell></TableRow>
                ) : (bsResponse?.data || []).map((row: any) => (
                  <TableRow key={row.id} className="border-primary/5 hover:bg-primary/[0.01] transition-colors whitespace-nowrap">
                    <TableCell className="pl-8 py-4 font-bold text-primary text-xs uppercase tracking-tight">{row.accountName}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-medium font-mono text-primary/80">{formatCurrency(row.idr)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-medium font-mono text-secondary/80">{formatCurrency(row.usd)}</TableCell>
                    <TableCell className="pr-8 py-4 text-right font-black text-primary text-xs font-mono bg-muted/5">{formatCurrency(row.totalIdr)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls meta={bsResponse?.meta} onPageChange={setBsPage} isFetching={bsLoading} />
        </TabsContent>

        {/* 8. INTER-ACCOUNT CONTENT */}
        <TabsContent value="ia" className="mt-0 space-y-4">
          <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap">
                  <TableHead className="pl-8 py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Transfer Description</TableHead>
                  <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">BCA</TableHead>
                  <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">Mandiri</TableHead>
                  <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">BRI</TableHead>
                  <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">BTN</TableHead>
                  <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-mono">Cash IDR</TableHead>
                  <TableHead className="pr-8 py-5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-right font-black">Non Cash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {iaLoading ? (
                  <TableRow><TableCell colSpan={7} className="h-48 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest animate-pulse">Syncing Transfers...</TableCell></TableRow>
                ) : (iaResponse?.data || []).map((row: any) => (
                  <TableRow key={row.id} className="border-primary/5 hover:bg-primary/[0.01] transition-colors whitespace-nowrap">
                    <TableCell className="pl-8 py-4 font-bold text-primary text-xs uppercase tracking-tight">{row.description}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-bold font-mono">
                      {Number(row.bca) !== 0 ? <span className={Number(row.bca) < 0 ? "text-red-500" : "text-green-600"}>{formatCurrency(row.bca)}</span> : "-"}
                    </TableCell>
                    <TableCell className="py-4 text-right text-xs font-bold font-mono">
                      {Number(row.mandiri) !== 0 ? <span className={Number(row.mandiri) < 0 ? "text-red-500" : "text-green-600"}>{formatCurrency(row.mandiri)}</span> : "-"}
                    </TableCell>
                    <TableCell className="py-4 text-right text-xs font-bold font-mono">
                      {Number(row.bri) !== 0 ? <span className={Number(row.bri) < 0 ? "text-red-500" : "text-green-600"}>{formatCurrency(row.bri)}</span> : "-"}
                    </TableCell>
                    <TableCell className="py-4 text-right text-xs font-bold font-mono">
                      {Number(row.btn) !== 0 ? <span className={Number(row.btn) < 0 ? "text-red-500" : "text-green-600"}>{formatCurrency(row.btn)}</span> : "-"}
                    </TableCell>
                    <TableCell className="py-4 text-right text-xs font-bold font-mono">
                      {Number(row.cashIdr) !== 0 ? <span className={Number(row.cashIdr) < 0 ? "text-red-500" : "text-green-600"}>{formatCurrency(row.cashIdr)}</span> : "-"}
                    </TableCell>
                    <TableCell className="pr-8 py-4 text-right text-xs font-bold font-mono">
                      {Number(row.nonCashBank) !== 0 ? <span className={Number(row.nonCashBank) < 0 ? "text-red-500" : "text-green-600"}>{formatCurrency(row.nonCashBank)}</span> : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls meta={iaResponse?.meta} onPageChange={setIaPage} isFetching={iaLoading} />
        </TabsContent>

      </Tabs>
    </div>
  );
}
