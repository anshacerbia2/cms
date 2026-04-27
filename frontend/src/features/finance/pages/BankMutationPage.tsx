import { useState, useMemo, useEffect } from "react";
import { 
  Search, 
  Landmark,
  Plus,
  Minus,
  Flag,
  FilterX,
  Calendar as CalendarIcon,
  Lock,
  Unlock,
  RefreshCw,
  AlertCircle,
  Hash,
  ArrowUp,
  ArrowDown,
  History,
  ShieldCheck,
} from "lucide-react";
import { Decimal } from "decimal.js";
import { useFinance } from "@/features/finance/hooks/useFinance";
import { useBanks } from "@/features/banks/hooks/useBanks";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import AddLedgerModal from "../components/AddLedgerModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PaginationControls } from "@/components/common/PaginationControls";
import { ExcelColumnFilter } from "../components/ExcelColumnFilter";
import { toast } from "sonner";

export default function BankMutationPage() {
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  
  // Fetch dynamic bank list
  const { internalAccountsQuery } = useBanks({ accounts: { limit: 100, enabled: true } });
  const internalAccounts = useMemo(() => internalAccountsQuery.data?.data || [], [internalAccountsQuery.data?.data]);

  // Initialize selected account once data is loaded - stable selection
  useEffect(() => {
    if (internalAccounts.length > 0 && !selectedAccount) {
      setSelectedAccount(internalAccounts[0]);
    }
  }, [internalAccounts, selectedAccount]);
  const [ledgerYearFilter, setLedgerYearFilter] = useState(new Date().getFullYear().toString());
  const [ledgerFilters, setLedgerFilters] = useState<Record<string, Set<string> | null>>({});
  const [ledgerSort, setLedgerSort] = useState<{key: string, direction: 'asc'|'desc' | null}>({key: 'id', direction: 'asc'});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const ledgerLimit = 10;

  const { user } = useAuthStore();
  const { getAllTransactions, getFiscalPeriods, recalculateLedger, closeYear, getAnchorBalance } = useFinance();
  
  const yearNum = useMemo(() => Number(ledgerYearFilter), [ledgerYearFilter]);

  // 1. Fetch Period Status & Fiscal Data
  const { data: fiscalData, isLoading: fiscalLoading, refetch: refetchFiscal } = getFiscalPeriods(
    selectedAccount?.id,
    yearNum
  );

  // 2. Fetch Anchor Data (Recursive Discovery for Opening Balance)
  const { data: anchorData, isLoading: anchorLoading } = getAnchorBalance(
    selectedAccount?.id,
    yearNum
  );

  const isPeriodClosed = fiscalData?.status === 'CLOSED';

  // 3. Main Transactions Fetch
  const { data: allTransactionsRaw, isLoading: transLoading, refetch: refetchTransactions } = getAllTransactions(
    selectedAccount?.id,
    ledgerYearFilter,
    { enabled: !!selectedAccount?.id && !!ledgerYearFilter }
  );

  const handleRecalculate = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await recalculateLedger()({ 
        accountId: selectedAccount?.id, 
        year: yearNum 
      });
      toast.success("Ledger balances recalculated successfully");
      refetchFiscal();
      refetchTransactions();
    } catch (err: any) {
      toast.error(err.message || "Failed to recalculate");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseYear = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await closeYear()({ 
        accountId: selectedAccount?.id, 
        year: yearNum,
        userId: user?.id || "" 
      });
      toast.success(`Year ${ledgerYearFilter} has been CLOSED and locked.`);
      refetchFiscal();
      refetchTransactions();
    } catch (err: any) {
      toast.error(err.message || "Failed to close year");
    } finally {
      setIsProcessing(false);
    }
  };

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2020; y--) {
      years.push(y.toString());
    }
    return years;
  }, []);

  const allTransactions = allTransactionsRaw || [];
  const shouldShowData = !!fiscalData || allTransactions.length > 0;

  // --- Wording & Display Logic ---
  const openingBalanceLabel = useMemo(() => {
    if (!shouldShowData || anchorLoading) return "";
    if (!anchorData) return "No Fiscal Data";

    const isCurrentYear = Number(anchorData.referredYear) === Number(ledgerYearFilter);

    switch (anchorData.status) {
      case 'CLOSED':
        return isCurrentYear 
          ? `Fiscal Opening ${anchorData.referredYear}` 
          : `Fiscal Closing ${anchorData.referredYear}`;
      case 'OPEN':
        return `Fiscal Opening ${anchorData.referredYear}`;
      case 'ONGOING':
        return `Projected Opening ${anchorData.referredYear}`;
      case 'INITIAL':
        return 'Initial Migration';
      default:
        return 'No Fiscal Data';
    }
  }, [shouldShowData, anchorLoading, anchorData, ledgerYearFilter]);

  const closingBalanceLabel = useMemo(() => {
    if (!shouldShowData) return "";
    
    // Kalau sudah ada record fiscal dan statusnya CLOSED
    if (fiscalData?.status === 'CLOSED') {
      return `Fiscal Closing ${ledgerYearFilter}`;
    }

    // Default kalau belum closed atau record belum ada tapi ada mutasi
    return `Projected Year-End ${ledgerYearFilter}`;
  }, [shouldShowData, fiscalData, ledgerYearFilter]);

  const filteredAndSortedLedger = useMemo(() => {
    let result = [...allTransactions];
    if (ledgerSearch) {
      const term = ledgerSearch.toLowerCase();
      result = result.filter(row => 
        String(row.colB || "").toLowerCase().includes(term) ||
        String(row.colF || "").toLowerCase().includes(term) ||
        String(row.colG || "").toLowerCase().includes(term) ||
        String(row.colH || "").toLowerCase().includes(term)
      );
    }
    Object.entries(ledgerFilters).forEach(([key, values]) => {
      if (values && values.size > 0) {
        result = result.filter(row => values.has(String(row[key as keyof typeof row] || "")));
      }
    });
    if (ledgerSort.key && ledgerSort.direction) {
      result.sort((a, b) => {
        const valA = a[ledgerSort.key as keyof typeof a];
        const valB = b[ledgerSort.key as keyof typeof b];
        if (ledgerSort.key === 'colA') {
          const dateA = new Date(valA).getTime();
          const dateB = new Date(valB).getTime();
          return ledgerSort.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return ledgerSort.direction === 'asc' ? valA - valB : valB - valA;
        }
        const strA = String(valA || "").toLowerCase();
        const strB = String(valB || "").toLowerCase();
        return ledgerSort.direction === 'asc' 
          ? strA.localeCompare(strB, undefined, { numeric: true }) 
          : strB.localeCompare(strA, undefined, { numeric: true });
      });
    }
    return result;
  }, [allTransactions, ledgerSearch, ledgerFilters, ledgerSort]);

  // Helper for Cascading (Excel-like) Filters
  const getCascadingData = (excludeKey: string) => {
    let result = [...allTransactions];
    
    // 1. Apply Global Search first
    if (ledgerSearch) {
      const term = ledgerSearch.toLowerCase();
      result = result.filter(row => 
        String(row.colB || "").toLowerCase().includes(term) ||
        String(row.colF || "").toLowerCase().includes(term) ||
        String(row.colG || "").toLowerCase().includes(term) ||
        String(row.colH || "").toLowerCase().includes(term)
      );
    }
    
    // 2. Apply all OTHER column filters
    Object.entries(ledgerFilters).forEach(([key, values]) => {
      if (key !== excludeKey && values && values.size > 0) {
        result = result.filter(row => values.has(String(row[key as keyof typeof row] || "")));
      }
    });
    
    return result;
  };

  const paginatedLedger = useMemo(() => {
    const start = (ledgerPage - 1) * ledgerLimit;
    return filteredAndSortedLedger.slice(start, start + ledgerLimit);
  }, [filteredAndSortedLedger, ledgerPage, ledgerLimit]);

  const ledgerMeta = {
    total: filteredAndSortedLedger.length,
    page: ledgerPage,
    limit: ledgerLimit,
    lastPage: Math.ceil(filteredAndSortedLedger.length / ledgerLimit) || 1
  };

  const accumulatedTotals = useMemo(() => {
    return paginatedLedger.reduce((acc, row) => ({
      withdrawal: acc.withdrawal.plus(new Decimal(row.colC || 0)),
      deposit: acc.deposit.plus(new Decimal(row.colD || 0)),
    }), { withdrawal: new Decimal(0), deposit: new Decimal(0) });
  }, [paginatedLedger]);

  const handleClearFilters = () => {
    setLedgerSearch("");
    setLedgerFilters({});
    setLedgerPage(1);
  };

  const isAnyFilterActive = ledgerSearch !== "" || Object.keys(ledgerFilters).length > 0;

  // const runningTotals = useMemo(() => {
  //   const end = ledgerPage * ledgerLimit;
  //   const viewUntilNow = filteredAndSortedLedger.slice(0, end);
  //   return viewUntilNow.reduce((acc, row) => ({
  //     withdrawal: acc.withdrawal.plus(new Decimal(row.colC || 0)),
  //     deposit: acc.deposit.plus(new Decimal(row.colD || 0)),
  //   }), { withdrawal: new Decimal(0), deposit: new Decimal(0) });
  // }, [filteredAndSortedLedger, ledgerPage, ledgerLimit]);

  // 7. Global Summary Stats
  const summaryStats = useMemo(() => {
    let opening: Decimal | null = null;
    if (fiscalData?.openingBalance !== undefined && fiscalData?.openingBalance !== null) {
      opening = new Decimal(fiscalData.openingBalance);
    } else if (anchorData?.balance !== undefined && anchorData?.balance !== null) {
      opening = new Decimal(anchorData.balance);
    }
    
    // If opening is still null, we can't reliably calculate others
    if (opening === null) {
      return { opening: null, credit: null, debit: null, closing: null };
    }

    // Inflow/Outflow are sums of all transactions in this specific year
    const debit = (allTransactions || []).reduce((sum, row) => {
      if (sum === null || row.colC === undefined || row.colC === null) return null;
      return sum.plus(new Decimal(row.colC));
    }, new Decimal(0) as Decimal | null);

    const credit = (allTransactions || []).reduce((sum, row) => {
      if (sum === null || row.colD === undefined || row.colD === null) return null;
      return sum.plus(new Decimal(row.colD));
    }, new Decimal(0) as Decimal | null);
    
    // Calculate Projected Balance (Always Live Ledger Sum)
    const projected = (opening !== null && credit !== null && debit !== null) 
      ? opening.plus(credit).minus(debit) 
      : null;

    // Calculate Primary Closing Balance (Audited Priority)
    let closing: Decimal | null = null;
    if (fiscalData?.status === 'CLOSED' && fiscalData?.closingBalance !== null) {
      closing = new Decimal(fiscalData.closingBalance);
    }
      
    return { 
      opening, 
      credit, 
      debit, 
      closing,
      projected
    };
  }, [fiscalData, anchorData, allTransactions]);

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700 pb-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-primary flex items-center gap-2 sm:gap-3">
              <Landmark className="text-secondary shrink-0 w-6 h-6 sm:w-8 sm:h-8" />
              Bank Mutation
            </h1>
            
            {/* Status Badge - Only show if a fiscal record exists for this year */}
            {!fiscalLoading && shouldShowData && (
              <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 border shadow-sm ${
                fiscalData?.status === 'CLOSED' 
                  ? "bg-red-50 border-red-200 text-red-700" 
                  : (fiscalData?.status === 'ONGOING' || (!fiscalData && shouldShowData))
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-sky-50 border-sky-200 text-sky-700"
              }`}>
                {fiscalData?.status === 'CLOSED' ? (
                  <>
                    <Lock size={12} className="shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Closed</span>
                  </>
                ) : (fiscalData?.status === 'ONGOING' || (!fiscalData && shouldShowData)) ? (
                  <>
                    <RefreshCw size={12} className={fiscalData?.status === 'ONGOING' ? "animate-spin-slow" : "shrink-0"} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Ongoing</span>
                  </>
                ) : (
                  <>
                    <Unlock size={12} className="shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Open</span>
                  </>
                )}
              </div>
            )}
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">Institutional financial ledger and audit trail for corporate accounts.</p>
        </div>

        {/* Fiscal Actions */}
        <div className="flex items-center gap-2">
          {anchorData?.isStale && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              disabled={isProcessing}
              className="h-10 px-4 rounded-xl border-red-200 bg-red-50 hover:bg-red-100 flex items-center gap-2 text-xs font-bold transition-all relative text-red-600"
            >
              <RefreshCw size={14} className={isProcessing ? "animate-spin" : ""} />
              Sync Required
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            </Button>
          )}

          {!isPeriodClosed && shouldShowData && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isProcessing}
                  className="h-10 px-4 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 text-red-600 hover:text-red-700 flex items-center gap-2 text-xs font-bold transition-all active:scale-95 shadow-sm"
                >
                  <Lock size={14} />
                  Close Period
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl border-0 shadow-premium">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-slate-800 mb-4">Close Fiscal Year {ledgerYearFilter}?</DialogTitle>
                  <DialogDescription className="text-slate-500 font-medium leading-relaxed">
                    Closing fiscal year <span className="font-bold text-slate-900">{ledgerYearFilter}</span> is a critical audit operation.
                    <span>
                      This will permanently lock all transactions and <span className="font-bold text-amber-700 underline">automatically update opening/closing balances for ALL subsequent years</span>.
                    </span>
                    <span className="block mt-3 text-red-600 font-black flex items-center gap-2 uppercase text-[10px] tracking-widest bg-red-50 p-2 rounded-lg border border-red-100">
                      <AlertCircle size={14} />
                      Warning: This cascading action cannot be reversed.
                    </span>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-3">
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="rounded-sm border-0 bg-slate-100 hover:bg-slate-200 font-bold text-slate-600">Cancel</Button>
                  </DialogTrigger>
                  <Button 
                    onClick={handleCloseYear}
                    className="rounded-sm bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  >
                    Lock and Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
        {/* Opening Balance */}
        <div className="bg-white/60 backdrop-blur-sm p-4 lg:p-5 rounded-2xl lg:rounded-3xl shadow-sm min-w-0">
          <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
            <div className="p-2 bg-slate-100 rounded-lg lg:rounded-xl text-slate-500">
              <History size={14} className="lg:w-4 lg:h-4" />
            </div>
            <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 truncate">Opening Balance</span>
          </div>
          <div className="pl-0.5 overflow-hidden">
            <p className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold tracking-tighter text-slate-700 leading-none truncate">
                {fiscalLoading || anchorLoading ? (
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 animate-pulse">Syncing...</span>
                ) : (shouldShowData && summaryStats.opening !== null) ? (
                  formatCurrency(summaryStats.opening)
                ) : (
                  "-"
                )}
              </p>
              <p className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1 truncate">
                {openingBalanceLabel}
              </p>
          </div>
        </div>

        {/* Total Debit (Outflow) */}
        <div className="bg-white/60 backdrop-blur-sm p-4 lg:p-5 rounded-2xl lg:rounded-3xl shadow-sm min-w-0">
          <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
            <div className="p-2 bg-rose-50 rounded-lg lg:rounded-xl text-rose-600">
              <ArrowDown size={14} strokeWidth={3} className="lg:w-4 lg:h-4" />
            </div>
            <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] text-rose-400 truncate">Total Debit</span>
          </div>
          <div className="pl-0.5 overflow-hidden">
            <p className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold tracking-tighter text-rose-600 leading-none truncate">
              {shouldShowData && summaryStats.debit !== null ? formatCurrency(summaryStats.debit) : "-"}
            </p>
            <p className="text-[8px] lg:text-[9px] font-bold text-rose-400 uppercase tracking-wider mt-1 truncate">
              Annual Accumulation
            </p>
          </div>
        </div>

        {/* Total Credit (Inflow) */}
        <div className="bg-white/60 backdrop-blur-sm p-4 lg:p-5 rounded-2xl lg:rounded-3xl shadow-sm min-w-0">
          <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
            <div className="p-2 bg-emerald-50 rounded-lg lg:rounded-xl text-emerald-600">
              <ArrowUp size={14} strokeWidth={3} className="lg:w-4 lg:h-4" />
            </div>
            <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 truncate">Total Credit</span>
          </div>
          <div className="pl-0.5 overflow-hidden">
            <p className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold tracking-tighter text-emerald-600 leading-none truncate">
              {shouldShowData && summaryStats.credit !== null ? formatCurrency(summaryStats.credit) : "-"}
            </p>
            <p className="text-[8px] lg:text-[9px] font-bold text-emerald-400 uppercase tracking-wider mt-1 truncate">
              Annual Accumulation
            </p>
          </div>
        </div>

        {/* Closing Balance */}
        <div className="bg-primary/[0.03] backdrop-blur-sm p-4 lg:p-5 rounded-2xl lg:rounded-3xl shadow-sm min-w-0 border border-primary/5">
          <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
            <div className="p-2 bg-primary text-white rounded-lg lg:rounded-xl shadow-sm shadow-primary/5">
              <ShieldCheck size={14} className="lg:w-4 lg:h-4" />
            </div>
            <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] text-primary/40 truncate">
              Closing Balance
            </span>
          </div>
          <div className="pl-0.5 overflow-hidden">
            <p className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold tracking-tighter text-primary leading-none truncate">
              {shouldShowData 
                ? (summaryStats.closing !== null 
                  ? formatCurrency(summaryStats.closing) 
                  : (summaryStats.projected !== null ? formatCurrency(summaryStats.projected) : "-"))
                : "-"}
            </p>
            <div className="flex items-center gap-1.5 mt-1 truncate">
              <p className="text-[8px] lg:text-[9px] font-bold text-primary/40 uppercase tracking-wider">
                {closingBalanceLabel}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search transactions..." 
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 text-[13px] font-medium"
            value={ledgerSearch}
            onChange={(e) => { setLedgerSearch(e.target.value); setLedgerPage(1); }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          {/* Bank Select */}
          <Select 
            value={selectedAccount?.id || ""} 
            onValueChange={(id) => { 
              const acc = internalAccounts.find((a: any) => a.id === id);
              if (acc) setSelectedAccount(acc);
              handleClearFilters();
            }}
          >
            <SelectTrigger className="flex items-center justify-between whitespace-nowrap border-0 py-2 text-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 cursor-pointer flex-1 xl:w-[220px] h-12 px-5 bg-white rounded-xl shadow-sm gap-1.5 text-muted-foreground transition-all">
               <div className="flex items-center gap-3 overflow-hidden">
                 <Landmark size={18} className="text-secondary shrink-0" />
                 <div className="flex flex-col items-start gap-0 overflow-hidden whitespace-nowrap">
                   <div className="flex items-center gap-2">
                     <span className="text-[8px] font-black uppercase tracking-widest border border-slate-200 px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 shrink-0">
                       {selectedAccount?.type || "TYPE"}
                        </span>
                     <span className="text-[12px] font-extrabold text-muted-foreground truncate text-left">
                       {selectedAccount?.bank?.bankBrand || selectedAccount?.holderName || "Select Account"}
                     </span>
                   </div>
                   {selectedAccount?.accountNo && selectedAccount.accountNo !== "" && (
                     <span className="text-[10px] text-muted-foreground font-bold tracking-[0.1em] truncate w-full text-left opacity-60 pl-0.5">
                       {selectedAccount.accountNo}
                     </span>
                   )}
                 </div>
               </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-primary/10 shadow-premium bg-white p-0 overflow-hidden w-[var(--radix-select-trigger-width)] min-w-fit">
               {internalAccounts.map((acc: any) => (
                <SelectItem 
                  key={acc.id} 
                  value={acc.id} 
                  className="py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 whitespace-nowrap text-muted-foreground transition-colors"
                >
                  <div className="flex flex-col items-start gap-1 w-full">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black uppercase tracking-widest border border-slate-200 px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 group-focus:border-white/30 group-focus:bg-white/10 group-focus:text-white transition-all shrink-0">
                        {acc.type}
                      </span>
                      <span className="font-bold text-[12px] tracking-tight">
                        {acc.bank?.bankBrand || acc.holderName}
                      </span>
                    </div>
                    {acc.accountNo && acc.accountNo !== "" && (
                      <div className="flex items-center gap-1 opacity-40 pl-0.5">
                        <Hash size={10} strokeWidth={3} />
                        <span className="text-[10px] font-bold tracking-widest">{acc.accountNo}</span>
                      </div>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year Select */}
          <Select 
            value={ledgerYearFilter} 
            onValueChange={(v) => {
              setLedgerYearFilter(v);
              setLedgerPage(1);
            }}
          >
            <SelectTrigger className="flex-1 xl:w-[130px] h-12 px-5 bg-white border-0 rounded-xl shadow-sm flex items-center gap-2 text-muted-foreground font-bold transition-all">
              <div className="flex items-center gap-2">
                <CalendarIcon size={18} className="text-secondary" />
                <SelectValue placeholder="Year" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-primary/10 shadow-premium bg-white p-0 overflow-hidden">
              {availableYears.map(year => (
                <SelectItem key={year} value={year} className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-muted-foreground transition-colors">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAnyFilterActive && (
            <Button 
              onClick={handleClearFilters}
              className="h-12 w-12 bg-white border-0 text-muted-foreground hover:text-red-500 hover:bg-red-50/50 rounded-xl shadow-sm flex items-center justify-center shrink-0 transition-all"
              title="Clear all filters"
            >
              <FilterX size={20} strokeWidth={2} />
            </Button>
          )}

          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="h-12 px-6 flex-1 xl:flex-none bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-sm flex items-center justify-center gap-2 font-bold disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
          >
            <Plus size={20} strokeWidth={3} />
            <span className="text-[13px]">Add Mutation</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-premium border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[1600px]">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap">
                <TableHead className="pl-8 py-3 text-[10px] font-black uppercase tracking-widest text-primary/40 w-32 text-left border-r border-primary/5">
                  <div className="flex items-center justify-start gap-1">
                    Tanggal
                    <ExcelColumnFilter 
                      columnKey="colA" label="Tanggal" data={getCascadingData("colA")} 
                      activeFilters={ledgerFilters["colA"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colA: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colA", direction: d})}
                      currentSort={ledgerSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3 text-[10px] font-black uppercase tracking-widest text-primary/40 border-r border-primary/5 px-4">
                  <div className="flex items-center gap-1">
                    Keterangan Transaksi
                    <ExcelColumnFilter 
                      columnKey="colB" label="Keterangan" data={getCascadingData("colB")} 
                      activeFilters={ledgerFilters["colB"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colB: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colB", direction: d})}
                      currentSort={ledgerSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-primary/40 w-40 border-r border-primary/5 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    Debet
                    <ExcelColumnFilter 
                      columnKey="colC" label="Debet" data={getCascadingData("colC")} 
                      activeFilters={ledgerFilters["colC"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colC: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colC", direction: d})}
                      currentSort={ledgerSort}
                      valueFormatter={formatCurrency}
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-primary/40 w-40 border-r border-primary/5 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    Kredit
                    <ExcelColumnFilter 
                      columnKey="colD" label="Kredit" data={getCascadingData("colD")} 
                      activeFilters={ledgerFilters["colD"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colD: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colD", direction: d})}
                      currentSort={ledgerSort}
                      valueFormatter={formatCurrency}
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-primary/40 w-44 border-r border-primary/5 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    Saldo
                    <ExcelColumnFilter 
                      columnKey="colE"
                      label="Saldo"
                      data={getCascadingData("colE")} 
                      activeFilters={ledgerFilters["colE"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colE: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colE", direction: d})}
                      currentSort={ledgerSort}
                      valueFormatter={formatCurrency}
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3 text-left text-[10px] font-black uppercase tracking-widest text-primary/40 w-48 border-r border-primary/5 pl-4">
                  <div className="flex items-center gap-1">
                    Ledger
                    <ExcelColumnFilter 
                      columnKey="colF"
                      label="Ledger"
                      data={getCascadingData("colF")} 
                      activeFilters={ledgerFilters["colF"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colF: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colF", direction: d})}
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3 text-left text-[10px] font-black uppercase tracking-widest text-primary/40 w-48 border-r border-primary/5 pl-4">
                  <div className="flex items-center gap-1">
                    Sub Ledger - 1
                    <ExcelColumnFilter 
                      columnKey="colG"
                      label="Sub Ledger - 1"
                      data={getCascadingData("colG")} 
                      activeFilters={ledgerFilters["colG"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colG: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colG", direction: d})}
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3 text-left text-[10px] font-black uppercase tracking-widest text-primary/40 w-48 border-r border-primary/5 pl-4">
                  <div className="flex items-center gap-1">
                    Sub Ledger - 2
                    <ExcelColumnFilter 
                      columnKey="colH"
                      label="Sub Ledger - 2"
                      data={getCascadingData("colH")} 
                      activeFilters={ledgerFilters["colH"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colH: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colH", direction: d})}
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3 text-left text-[10px] font-black uppercase tracking-widest text-primary/40 w-48 border-r border-primary/5 pl-4">
                  <div className="flex items-center gap-1">
                    Sub Ledger - 3
                    <ExcelColumnFilter 
                      columnKey="colI"
                      label="Sub Ledger - 3"
                      data={getCascadingData("colI")} 
                      activeFilters={ledgerFilters["colI"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colI: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colI", direction: d})}
                    />
                  </div>
                </TableHead>
                <TableHead className="pr-8 py-3 text-left text-[10px] font-black uppercase tracking-widest text-primary/40 w-48 border-r border-primary/5 pl-4">
                  <div className="flex items-center gap-1">
                    Sub Ledger - 4
                    <ExcelColumnFilter 
                      columnKey="colJ"
                      label="Sub Ledger - 4"
                      data={getCascadingData("colJ")} 
                      activeFilters={ledgerFilters["colJ"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colJ: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colJ", direction: d})}
                    />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-96 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Synchronizing Global Ledger Data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedLedger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-64 text-center opacity-20">
                    <Search size={48} className="mx-auto" />
                    <p className="mt-4 font-black uppercase tracking-widest">No mutation records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedLedger.map((row: any) => (
                    <TableRow key={row.id} className="border-primary/5 hover:bg-transparent transition-none whitespace-nowrap group">
                      <TableCell className="pl-8 py-3 text-[12px] text-primary/60 border-r border-primary/5 text-left">{formatDate(row.colA)}</TableCell>
                      <TableCell className="py-3 px-4 font-medium text-primary text-[12px] border-r border-primary/5 transition-colors max-w-md truncate" title={row.colB}>
                        {row.colB}
                      </TableCell>
                      <TableCell className="py-3 text-right text-red-600 text-[12px] border-r border-primary/5 pr-4 whitespace-nowrap">
                        {row.colC && Number(row.colC) !== 0 ? formatCurrency(row.colC) : "-"}
                      </TableCell>
                      <TableCell className="py-3 text-right text-emerald-600 text-[12px] border-r border-primary/5 pr-4 whitespace-nowrap">
                        {row.colD && Number(row.colD) !== 0 ? formatCurrency(row.colD) : "-"}
                      </TableCell>
                      <TableCell className="py-3 text-right border-r border-primary/5 pr-4 text-[12px] text-primary whitespace-nowrap">
                        {row.colE ? formatCurrency(row.colE) : "-"}
                      </TableCell>
                      <TableCell className="py-3 text-left border-r border-primary/5 pl-4 text-[12px] text-primary tracking-tighter" title={row.colF}>
                        {row.colF || "-"}
                      </TableCell>
                      <TableCell className="py-3 text-left text-[12px] text-primary truncate max-w-[150px] border-r border-primary/5 pl-4" title={row.colG}>
                        {row.colG || "-"}
                      </TableCell>
                      <TableCell className="py-3 text-left text-[12px] text-primary truncate max-w-[150px] border-r border-primary/5 pl-4" title={row.colH}>
                        {row.colH || "-"}
                      </TableCell>
                      <TableCell className="py-3 text-left text-[12px] text-primary truncate max-w-[150px] border-r border-primary/5 pl-4" title={row.colI}>
                        {row.colI || "-"}
                      </TableCell>
                      <TableCell className="pr-8 py-3 text-left text-[12px] text-primary truncate max-w-[150px] pl-4" title={row.colJ}>
                        {row.colJ || "-"}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Summary Rows */}
                  {/* Subtotal (Current Page) */}
                  <TableRow className="bg-secondary/5 border-t-2 border-secondary/30 hover:bg-secondary/5 transition-none font-bold">
                    <TableCell colSpan={2} className="pl-8 py-3 text-[11px] text-secondary/80 uppercase tracking-[0.2em]">
                      Subtotal (Page {ledgerPage})
                    </TableCell>
                    <TableCell className="py-3 text-right text-red-600/90 text-[12px] border-r border-secondary/20 pr-4 whitespace-nowrap">
                      {accumulatedTotals.withdrawal !== 0 ? formatCurrency(accumulatedTotals.withdrawal) : "-"}
                    </TableCell>
                    <TableCell className="py-3 text-right text-emerald-700/90 text-[12px] border-r border-secondary/20 pr-4 whitespace-nowrap">
                      {accumulatedTotals.deposit !== 0 ? formatCurrency(accumulatedTotals.deposit) : "-"}
                    </TableCell>
                    <TableCell colSpan={6} className="bg-secondary/[0.02]" />
                  </TableRow>

                  {/* Grand Total (All Pages) */}
                  <TableRow className="bg-secondary/10 border-t border-secondary/30 hover:bg-secondary/10 transition-none font-bold">
                    <TableCell colSpan={2} className="pl-8 py-3 text-[11px] text-secondary uppercase tracking-[0.2em]">
                      Period Totals ({ledgerMeta?.total || 0} rows)
                    </TableCell>
                    <TableCell className="py-3 text-right text-red-600 text-[12px] border-r border-secondary/20 pr-4 whitespace-nowrap">
                      {shouldShowData && summaryStats.credit !== null ? formatCurrency(summaryStats.credit) : "-"}
                    </TableCell>
                    <TableCell className="py-3 text-right text-emerald-700 text-[12px] border-r border-secondary/20 pr-4 whitespace-nowrap">
                      {shouldShowData && summaryStats.debit !== null ? formatCurrency(summaryStats.debit) : "-"}
                    </TableCell>
                    <TableCell colSpan={6} className="bg-secondary/[0.03]" />
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <PaginationControls meta={ledgerMeta} onPageChange={setLedgerPage} isFetching={transLoading} />

      <AddLedgerModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen} 
        onSuccess={() => {
          refetchTransactions();
          refetchFiscal();
        }} 
        selectedAccount={selectedAccount}
        year={yearNum}
        isPeriodClosed={isPeriodClosed}
      />
    </div>
  );
}
