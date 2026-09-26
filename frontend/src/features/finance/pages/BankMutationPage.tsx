import { useState, useMemo, useEffect, useCallback, Fragment } from "react";
import { HistoryDialog, historyTitle } from '@/features/audit-logs/components/HistoryDialog';
import { 
  Search, 
  Landmark,
  Plus,
  FilterX,
  Calendar as CalendarIcon,
  Lock,
  RefreshCw,
  AlertCircle,
  Hash,
  ArrowUp,
  ArrowDown,
  History,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Decimal } from "decimal.js";
import { useBanks } from "@/features/banks/hooks/useBanks";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency, formatDate, cleanAmount, cn } from "@/lib/utils";
import { downloadExcelFile, downloadPdfFile, exportFilter } from "@/lib/downloadFile";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AddLedgerModal from "../components/AddLedgerModal";
import { type LedgerDraft, draftPayload } from "../components/LedgerRowEditor";
import { InlineEditRow, InlineInsertRows } from "../components/LedgerInlineRows";
import { LedgerDisplayRow } from "../components/LedgerDisplayRow";
import { LedgerErrorBoundary } from "../components/LedgerErrorBoundary";
import { useLedgerMaster } from "../hooks/useLedgers";
import { DetailModal } from "@/components/common/DetailModal";
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
import { useExcelFilter } from "../hooks/useExcelFilter";
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
import { useBankMutation } from "../hooks/useBankMutation";
import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/common/PageContainer";
/**
 * What to call an account in the picker.
 *
 * The brand alone is ambiguous: three of them have two accounts each, and two
 * of those carry no account number to tell them apart. The branch is what
 * separates them, so it is part of the name - taken from the account's own
 * display name where one is set, and composed from brand and branch otherwise.
 */
function accountLabel(acc: any): string {
  if (!acc) return "Select Account";
  if (acc.displayName?.trim()) return acc.displayName.trim();
  if (acc.type === "CASH") return acc.branch?.trim() ? `CASH ${acc.branch.trim()}` : "CASH";
  const brand = acc.bank?.bankBrand ?? acc.holderName ?? "";
  const branch = acc.branch?.trim();
  return [brand, branch].filter(Boolean).join(" ") || "Select Account";
}

export default function BankMutationPage() {
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [ledgerYearFilter, setLedgerYearFilter] = useState(new Date().getFullYear().toString());
  const [ledgerStartDate, setLedgerStartDate] = useState<Date | undefined>(undefined);
  const [ledgerEndDate, setLedgerEndDate] = useState<Date | undefined>(undefined);

  // Sync selectedDate with year filter
  useEffect(() => {
    if (ledgerYearFilter !== "all") {
      if (ledgerStartDate && ledgerStartDate.getFullYear() !== parseInt(ledgerYearFilter)) {
        setLedgerStartDate(undefined);
      }
      if (ledgerEndDate && ledgerEndDate.getFullYear() !== parseInt(ledgerYearFilter)) {
        setLedgerEndDate(undefined);
      }
    }
  }, [ledgerYearFilter]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // Menyunting dan menyisip dikerjakan langsung di baris tabel, bukan di popup.
  // Halaman cuma tahu baris mana yang sedang disunting / disisipi. Drafnya sendiri
  // hidup di komponen barisnya, supaya mengetik tidak merender ulang seluruh tabel.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [insertAfterId, setInsertAfterId] = useState<number | null>(null);
  const [savingInline, setSavingInline] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedViewTransaction, setSelectedViewTransaction] = useState<any>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const ledgerLimit = 10;

  // Fetch dynamic bank list
  const { internalAccountsQuery } = useBanks({ accounts: { limit: 100, enabled: true } });
  const internalAccounts = useMemo(() => internalAccountsQuery.data?.data || [], [internalAccountsQuery.data?.data]);

  // Initialize selected account once data is loaded
  useEffect(() => {
    if (internalAccounts.length > 0 && !selectedAccount) {
      setSelectedAccount(internalAccounts[0]);
    }
  }, [internalAccounts, selectedAccount]);

  const { user, can } = useAuthStore();
  const { getAllTransactions, getFiscalPeriods, recalculateLedger, closeYear, getAnchorBalance, deleteTransaction, updateTransaction, insertTransaction } = useBankMutation();
  
  const yearNum = useMemo(() => Number(ledgerYearFilter), [ledgerYearFilter]);
  /** Master Ledger/SL1 untuk dropdown di baris yang disunting atau disisipkan. */
  const ledgerMaster = useLedgerMaster();

  /** Sedang ada baris yang diketik - tombol edit/sisip di baris lain dikunci supaya ketikan tidak hilang. */
  const inlineBusy = editingId !== null || insertAfterId !== null;

  // Semua callback ke baris tabel stabil (useCallback), supaya memo di
  // LedgerDisplayRow benar-benar mencegah render ulang. Tombolnya sendiri sudah
  // dikunci selama ada yang diketik, jadi di sini tidak perlu dicek lagi.
  const handleEditTransaction = useCallback((row: any) => setEditingId(row.id), []);
  const [historyRow, setHistoryRow] = useState<any | null>(null);
  const handleHistory = useCallback((row: any) => setHistoryRow(row), []);

  /** Baris baru mendarat tepat di bawah `row`, bukan di ujung daftar. */
  const handleInsertAfter = useCallback((row: any) => setInsertAfterId(row.id), []);

  const canEdit = can('bank-mutation.edit');
  const canCreate = can('bank-mutation.create');
  const canDelete = can('bank-mutation.delete');

  const cancelInline = useCallback(() => {
    setEditingId(null);
    setInsertAfterId(null);
  }, []);

  const saveEdit = useCallback(
    async (draft: LedgerDraft) => {
      if (editingId === null || savingInline) return;
      setSavingInline(true);
      try {
        await updateTransaction()({ id: editingId, data: draftPayload(draft, ledgerMaster) });
        toast.success("Row saved.");
        setEditingId(null);
        refetchTransactions();
        refetchFiscal();
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Failed to save row.");
      } finally {
        setSavingInline(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editingId, savingInline, ledgerMaster],
  );

  const saveInsert = useCallback(
    async (drafts: LedgerDraft[]) => {
      if (insertAfterId === null || savingInline) return;
      setSavingInline(true);
      try {
        await insertTransaction()({
          rows: drafts.map((d) => draftPayload(d, ledgerMaster)),
          accountId: selectedAccount?.id,
          tagYear: yearNum,
          afterId: insertAfterId,
        });
        toast.success(`${drafts.length} row(s) inserted.`);
        setInsertAfterId(null);
        refetchTransactions();
        refetchFiscal();
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Failed to insert rows.");
      } finally {
        setSavingInline(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [insertAfterId, savingInline, selectedAccount?.id, yearNum, ledgerMaster],
  );

  const handleViewTransaction = useCallback((row: any) => {
    setSelectedViewTransaction(row);
    setIsViewModalOpen(true);
  }, []);

  const handleDeleteTransaction = useCallback((id: number) => setTransactionToDelete(id), []);

  const executeDelete = async () => {
    if (!transactionToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTransaction()(transactionToDelete);
      toast.success("Transaction deleted successfully.");
      refetchTransactions();
      refetchFiscal();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete transaction.");
    } finally {
      setIsDeleting(false);
      setTransactionToDelete(null);
    }
  };

  // 1. Fetch Period Status & Fiscal Data
  const { data: fiscalData, isLoading: fiscalLoading, refetch: refetchFiscal } = getFiscalPeriods(
    selectedAccount?.id,
    yearNum
  );

  // 2. Fetch Anchor Data
  const { data: anchorData, isLoading: anchorLoading } = getAnchorBalance(
    selectedAccount?.id,
    yearNum
  );

  const isPeriodClosed = fiscalData?.status === 'CLOSED';

  // 3. Main Transactions Fetch
  const { data: allTransactionsRaw, isLoading: transLoading, refetch: refetchTransactions } = getAllTransactions(
    selectedAccount?.id,
    ledgerYearFilter,
    ledgerStartDate ? format(ledgerStartDate, "yyyy-MM-dd") : undefined,
    ledgerEndDate ? format(ledgerEndDate, "yyyy-MM-dd") : undefined,
    { enabled: !!selectedAccount?.id && (!!ledgerYearFilter || !!ledgerStartDate || !!ledgerEndDate) }
  );

  /** Baris mentah dari API per id - Map, bukan .find, karena dipanggil saat render. */
  const rawById = useMemo(
    () => new Map<number, any>((allTransactionsRaw || []).map((r: any) => [r.id, r])),
    [allTransactionsRaw],
  );

  /** Kolom "No" (row_no) hanya untuk Non CB: bukunya tanpa tanggal, jadi nomor urut jadi pegangan ke Excel. */
  const showRowNo = selectedAccount?.type === 'OTHER';

  /** Filter rentang kolom No (inklusif). Hanya berlaku di Non CB. */
  const [rowNoRange, setRowNoRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const isRowNoRangeActive = showRowNo && (rowNoRange.min !== null || rowNoRange.max !== null);

  // --- PRE-FORMAT DATA FOR EXCEL FILTER ---
  // Rentang No disaring di sini, sebelum filter kolom lain, supaya daftar nilai
  // di filter lain, subtotal, dan grand total ikut mengikuti rentangnya.
  const displayTransactions = useMemo(() => {
    const inRange = (row: any) => {
      if (!isRowNoRangeActive) return true;
      const no = row.rowNo === null || row.rowNo === undefined ? null : row.rowNo;
      if (no === null) return false;
      return (rowNoRange.min === null || no >= rowNoRange.min) && (rowNoRange.max === null || no <= rowNoRange.max);
    };
    return (allTransactionsRaw || []).filter(inRange).map((row: any) => ({
      ...row,
      rawColA: row.colA,
      colA: formatDate(row.colA),
      colB: row.colB || "-",
      colC: row.colC && Number(row.colC) !== 0 ? formatCurrency(row.colC) : "-",
      colD: row.colD && Number(row.colD) !== 0 ? formatCurrency(row.colD) : "-",
      colE: row.colE ? formatCurrency(row.colE) : "-",
      colF: row.colF || "-",
      colG: row.colG || "-",
      colH: row.colH || "-",
      colI: row.colI || "-",
    }));
  }, [allTransactionsRaw, isRowNoRangeActive, rowNoRange]);

  // --- CASCADING FILTER HOOK ---
  const { 
    page: ledgerPage, 
    setPage: setLedgerPage, 
    search: ledgerSearch, 
    setSearch: setLedgerSearch, 
    filters: ledgerFilters, 
    setFilters: setLedgerFilters, 
    sort: ledgerSort, 
    setSort: setLedgerSort, 
    getCascadingData, 
    filteredAndSortedData: filteredAndSortedLedger,
    clearFilters: handleClearFiltersBase,
    isAnyFilterActive: isExcelFilterActive 
  } = useExcelFilter({
    data: displayTransactions,
    searchFields: ['colB', 'colF', 'colG', 'colH', 'colI']
  });

  const handleClearFilters = () => {
    handleClearFiltersBase();
    setLedgerStartDate(undefined);
    setLedgerEndDate(undefined);
    setRowNoRange({ min: null, max: null });
  };

  const isAnyFilterActive =
    isExcelFilterActive || ledgerStartDate !== undefined || ledgerEndDate !== undefined || isRowNoRangeActive;

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
    for (let y = currentYear; y >= 2025; y--) {
      years.push(y.toString());
    }
    return years;
  }, []);

  const isNoPaginationAccount = useMemo(() => {
    return selectedAccount?.accountNo?.replace(/\s/g, '') === '5750489666';
  }, [selectedAccount]);

  const extraCols = showRowNo ? 1 : 0;

  const paginatedLedger = useMemo(() => {
    if (isNoPaginationAccount) return filteredAndSortedLedger;
    const start = (ledgerPage - 1) * ledgerLimit;
    return filteredAndSortedLedger.slice(start, start + ledgerLimit);
  }, [filteredAndSortedLedger, ledgerPage, ledgerLimit, isNoPaginationAccount]);

  // Ganti rekening, tahun, rentang tanggal, pencarian, filter kolom, atau
  // urutan: baris yang sedang diketik dibatalkan. Isi tabelnya sudah bukan yang
  // tadi, dan menyisip "di bawah baris ini" di tampilan yang tersaring atau
  // terurut lain membingungkan - posisinya tetap menurut urutan ledger.
  useEffect(() => {
    cancelInline();
  }, [
    selectedAccount?.id,
    ledgerYearFilter,
    ledgerStartDate,
    ledgerEndDate,
    ledgerSearch,
    ledgerFilters,
    ledgerSort,
    rowNoRange,
    cancelInline,
  ]);

  // Jaring pengaman untuk semua cara lain baris itu hilang dari layar - pindah
  // halaman, filter kolom, pencarian. Tanpa ini editornya lenyap tapi statusnya
  // masih "sedang mengetik", dan semua tombol edit/sisip terkunci tanpa ada
  // tombol Batal yang bisa dipencet.
  useEffect(() => {
    const visible = (id: number) => paginatedLedger.some((r: any) => r.id === id);
    if (editingId !== null && !visible(editingId)) setEditingId(null);
    if (insertAfterId !== null && !visible(insertAfterId)) setInsertAfterId(null);
  }, [paginatedLedger, editingId, insertAfterId]);

  const ledgerMeta = { 
    total: filteredAndSortedLedger.length, 
    page: ledgerPage, 
    limit: ledgerLimit, 
    lastPage: Math.ceil(filteredAndSortedLedger.length / ledgerLimit) || 1 
  };

  const accumulatedTotals = useMemo(() => {
    return paginatedLedger.reduce((acc, row) => {
      return {
        withdrawal: acc.withdrawal.plus(new Decimal(cleanAmount(row.colC))),
        deposit: acc.deposit.plus(new Decimal(cleanAmount(row.colD))),
      };
    }, { withdrawal: new Decimal(0), deposit: new Decimal(0) });
  }, [paginatedLedger]);

  const grandTotals = useMemo(() => {
    return filteredAndSortedLedger.reduce((acc, row) => {
      return {
        withdrawal: acc.withdrawal.plus(new Decimal(cleanAmount(row.colC))),
        deposit: acc.deposit.plus(new Decimal(cleanAmount(row.colD))),
      };
    }, { withdrawal: new Decimal(0), deposit: new Decimal(0) });
  }, [filteredAndSortedLedger]);

  const allTransactions = allTransactionsRaw || [];
  const shouldShowData = !!fiscalData || allTransactions.length > 0;

  // Global Summary Stats
  const summaryStats = useMemo(() => {
    let opening: Decimal | null = null;
    if (fiscalData?.openingBalance !== undefined && fiscalData?.openingBalance !== null) {
      opening = new Decimal(fiscalData.openingBalance);
    } else if (anchorData?.balance !== undefined && anchorData?.balance !== null) {
      opening = new Decimal(anchorData.balance);
    }
    
    if (opening === null) {
      return { opening: null, credit: null, debit: null, closing: null, projected: null };
    }

    const debit = (allTransactions || []).reduce((sum, row) => {
      if (sum === null || row.colC === undefined || row.colC === null) return null;
      return sum.plus(new Decimal(row.colC));
    }, new Decimal(0) as Decimal | null);

    const credit = (allTransactions || []).reduce((sum, row) => {
      if (sum === null || row.colD === undefined || row.colD === null) return null;
      return sum.plus(new Decimal(row.colD));
    }, new Decimal(0) as Decimal | null);
    
    const projected = (opening !== null && credit !== null && debit !== null) 
      ? opening.plus(credit).minus(debit) 
      : null;

    let closing: Decimal | null = null;
    if (fiscalData?.status === 'CLOSED' && fiscalData?.closingBalance !== null) {
      closing = new Decimal(fiscalData.closingBalance);
    }
      
    return { opening, credit, debit, closing, projected };
  }, [fiscalData, anchorData, allTransactions]);

  const openingBalanceLabel = useMemo(() => {
    if (!shouldShowData || anchorLoading) return "";
    if (!anchorData) return "No Fiscal Data";
    const isCurrentYear = Number(anchorData.referredYear) === Number(ledgerYearFilter);
    switch (anchorData.status) {
      case 'CLOSED': return isCurrentYear ? `Fiscal Opening ${anchorData.referredYear}` : `Fiscal Closing ${anchorData.referredYear}`;
      case 'OPEN': return `Fiscal Opening ${anchorData.referredYear}`;
      case 'ONGOING': return `Projected Opening ${anchorData.referredYear}`;
      case 'INITIAL': return 'Initial Migration';
      default: return 'No Fiscal Data';
    }
  }, [shouldShowData, anchorLoading, anchorData, ledgerYearFilter]);

  const closingBalanceLabel = useMemo(() => {
    if (!shouldShowData) return "";
    if (fiscalData?.status === 'CLOSED') return `Fiscal Closing ${ledgerYearFilter}`;
    return `Projected Year-End ${ledgerYearFilter}`;
  }, [shouldShowData, fiscalData, ledgerYearFilter]);

  return (
    <PageContainer>
      <PageHeader 
        title="Bank Statement"
        description="Institutional financial ledger and audit trail for corporate accounts."
        icon={Landmark}
        actions={
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
        }
      />

      <div className="space-y-8 mt-8">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
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
                  formatCurrency(summaryStats.opening, 'IDR', false)
                ) : (
                  "-"
                )}
              </p>
              <p className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1 truncate">
                {openingBalanceLabel}
              </p>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm p-4 lg:p-5 rounded-2xl lg:rounded-3xl shadow-sm min-w-0">
          <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
            <div className="p-2 bg-rose-50 rounded-lg lg:rounded-xl text-rose-600">
              <ArrowDown size={14} strokeWidth={3} className="lg:w-4 lg:h-4" />
            </div>
            <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] text-rose-400 truncate">Total Debit</span>
          </div>
          <div className="pl-0.5 overflow-hidden">
            <p className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold tracking-tighter text-rose-600 leading-none truncate">
              {shouldShowData && summaryStats.debit !== null ? formatCurrency(summaryStats.debit, 'IDR', false) : "-"}
            </p>
            <p className="text-[8px] lg:text-[9px] font-bold text-rose-400 uppercase tracking-wider mt-1 truncate">
              Annual Accumulation
            </p>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm p-4 lg:p-5 rounded-2xl lg:rounded-3xl shadow-sm min-w-0">
          <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
            <div className="p-2 bg-emerald-50 rounded-lg lg:rounded-xl text-emerald-600">
              <ArrowUp size={14} strokeWidth={3} className="lg:w-4 lg:h-4" />
            </div>
            <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 truncate">Total Credit</span>
          </div>
          <div className="pl-0.5 overflow-hidden">
            <p className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold tracking-tighter text-emerald-600 leading-none truncate">
              {shouldShowData && summaryStats.credit !== null ? formatCurrency(summaryStats.credit, 'IDR', false) : "-"}
            </p>
            <p className="text-[8px] lg:text-[9px] font-bold text-emerald-400 uppercase tracking-wider mt-1 truncate">
              Annual Accumulation
            </p>
          </div>
        </div>

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
                  ? formatCurrency(summaryStats.closing, 'IDR', false) 
                  : (summaryStats.projected !== null ? formatCurrency(summaryStats.projected, 'IDR', false) : "-"))
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
          <Select 
            value={selectedAccount?.id || ""} 
            onValueChange={(id) => { 
              const acc = internalAccounts.find((a: any) => a.id === id);
              if (acc) setSelectedAccount(acc);
              handleClearFilters();
            }}
          >
            <SelectTrigger className="flex items-center justify-between whitespace-nowrap border-0 py-2 text-sm focus:outline-none h-12 px-5 bg-white rounded-xl shadow-sm gap-1.5 text-muted-foreground transition-all cursor-pointer flex-1 xl:w-[220px]">
               <div className="flex items-center gap-3 overflow-hidden">
                 <Landmark size={18} className="text-secondary shrink-0" />
                 <div className="flex flex-col items-start gap-0 overflow-hidden whitespace-nowrap">
                   <div className="flex items-center gap-2">
                     <span className="text-[8px] font-black uppercase tracking-widest border border-slate-200 px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 shrink-0">
                       {selectedAccount?.type || "TYPE"}
                         </span>
                     <span className="text-[12px] font-extrabold text-muted-foreground truncate text-left">
                       {accountLabel(selectedAccount)}
                     </span>
                   </div>
                   {selectedAccount?.accountNo && (
                     <span className="text-[10px] text-muted-foreground font-bold tracking-[0.1em] truncate w-full text-left opacity-60 pl-0.5">
                       {selectedAccount.accountNo}
                     </span>
                   )}
                 </div>
               </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-primary/10 shadow-premium bg-white p-0 overflow-hidden w-[var(--radix-select-trigger-width)]">
               {internalAccounts.map((acc: any) => (
                <SelectItem 
                  key={acc.id} 
                  value={acc.id} 
                  className="py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 whitespace-nowrap text-muted-foreground transition-colors"
                >
                  <div className="flex flex-col items-start gap-1 w-full">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black uppercase tracking-widest border border-slate-200 px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 transition-all shrink-0">
                        {acc.type}
                      </span>
                      <span className="font-bold text-[12px] tracking-tight">
                        {accountLabel(acc)}
                      </span>
                    </div>
                    {acc.accountNo && (
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

          {/* Start Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-12 px-4 bg-white border-0 shadow-sm rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all justify-start text-left hover:bg-white hover:shadow-sm text-muted-foreground hover:text-muted-foreground min-w-[150px]",
                  !ledgerStartDate && "text-muted-foreground opacity-60"
                )}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-[7px] text-secondary font-black">FROM</span>
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={12} className="text-secondary" />
                    {ledgerStartDate ? format(ledgerStartDate, "dd MMM y") : <span>Start Date</span>}
                  </div>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 shadow-premium border-primary/5 overflow-hidden" align="end">
              <Calendar
                mode="single"
                captionLayout="dropdown"
                selected={ledgerStartDate}
                onSelect={(d) => { setLedgerStartDate(d); setLedgerPage(1); }}
                startMonth={ledgerYearFilter === "all" ? new Date(2020, 0) : new Date(parseInt(ledgerYearFilter), 0)}
                endMonth={ledgerYearFilter === "all" ? new Date(2030, 11) : new Date(parseInt(ledgerYearFilter), 11)}
                defaultMonth={ledgerStartDate || (ledgerYearFilter === "all" ? undefined : new Date(parseInt(ledgerYearFilter), 0))}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* End Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-12 px-4 bg-white border-0 shadow-sm rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all justify-start text-left hover:bg-white hover:shadow-sm text-muted-foreground hover:text-muted-foreground min-w-[150px]",
                  !ledgerEndDate && "text-muted-foreground opacity-60"
                )}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-[7px] text-rose-500 font-black">UNTIL</span>
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={12} className="text-rose-500" />
                    {ledgerEndDate ? format(ledgerEndDate, "dd MMM y") : <span>End Date</span>}
                  </div>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 shadow-premium border-primary/5 overflow-hidden" align="end">
              <Calendar
                mode="single"
                captionLayout="dropdown"
                selected={ledgerEndDate}
                onSelect={(d) => { setLedgerEndDate(d); setLedgerPage(1); }}
                startMonth={ledgerYearFilter === "all" ? new Date(2020, 0) : new Date(parseInt(ledgerYearFilter), 0)}
                endMonth={ledgerYearFilter === "all" ? new Date(2030, 11) : new Date(parseInt(ledgerYearFilter), 11)}
                defaultMonth={ledgerEndDate || (ledgerYearFilter === "all" ? undefined : new Date(parseInt(ledgerYearFilter), 0))}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Select value={ledgerYearFilter} onValueChange={(v) => { setLedgerYearFilter(v); setLedgerPage(1); setRowNoRange({ min: null, max: null }); }}>
            <SelectTrigger className="flex-1 xl:w-[130px] h-12 px-5 bg-white border-0 rounded-xl shadow-sm flex items-center gap-2 text-muted-foreground font-bold transition-all cursor-pointer">
              <CalendarIcon size={18} className="text-secondary" />
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-primary/10 shadow-premium bg-white p-0 overflow-hidden">
              <SelectItem value="all" className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-muted-foreground transition-colors">
                All Time
              </SelectItem>
              {availableYears.map(year => (
                <SelectItem key={year} value={year} className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-muted-foreground transition-colors">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAnyFilterActive && (
            <Button onClick={handleClearFilters} className="h-12 w-12 bg-white border-0 text-muted-foreground hover:text-red-500 hover:bg-red-50/50 rounded-xl shadow-sm flex items-center justify-center shrink-0 transition-all">
              <FilterX size={20} strokeWidth={2} />
            </Button>
          )}

          {can('bank-mutation.create') && (
            <Button onClick={(e) => { e.stopPropagation(); cancelInline(); setIsAddModalOpen(true); }} className="h-12 px-6 flex-1 xl:flex-none bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-sm flex items-center justify-center gap-2 font-bold transition-all active:scale-95">
              <Plus size={20} strokeWidth={3} />
              <span className="text-[13px]">Add Transaction</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                className="h-12 w-12 xl:w-auto xl:px-4 bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-sm flex items-center justify-center font-bold disabled:opacity-50 transition-all active:scale-95 shrink-0"
              >
                <Download size={20} strokeWidth={3} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-primary/10 shadow-premium bg-white p-0 overflow-hidden w-40">
              <DropdownMenuItem 
                onClick={() => downloadExcelFile(`/bank-mutation/export/excel?accountId=${selectedAccount?.id}&year=${ledgerYearFilter}${ledgerStartDate ? `&startDate=${format(ledgerStartDate, 'yyyy-MM-dd')}` : ''}${ledgerEndDate ? `&endDate=${format(ledgerEndDate, 'yyyy-MM-dd')}` : ''}`, `Bank_Statement_${accountLabel(selectedAccount).replace(/\s+/g, '_')}_${ledgerYearFilter !== 'all' ? ledgerYearFilter : 'All'}.xlsx`, exportFilter(isAnyFilterActive, filteredAndSortedLedger))}
                className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-emerald-600 transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet size={16} strokeWidth={2.5} />
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => downloadPdfFile(`/bank-mutation/export/pdf?accountId=${selectedAccount?.id}&year=${ledgerYearFilter}${ledgerStartDate ? `&startDate=${format(ledgerStartDate, 'yyyy-MM-dd')}` : ''}${ledgerEndDate ? `&endDate=${format(ledgerEndDate, 'yyyy-MM-dd')}` : ''}`, `Bank_Statement_${accountLabel(selectedAccount).replace(/\s+/g, '_')}_${ledgerYearFilter !== 'all' ? ledgerYearFilter : 'All'}.pdf`, exportFilter(isAnyFilterActive, filteredAndSortedLedger))}
                className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-rose-600 transition-colors flex items-center gap-2"
              >
                <FileText size={16} strokeWidth={2.5} />
                Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-premium border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <LedgerErrorBoundary onReset={cancelInline}>
          <Table className="min-w-[1600px]">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap">
                {showRowNo && (
                  <TableHead className="py-3 pl-4 w-20">
                    <div className="flex items-center gap-1">
                      No
                      <ExcelColumnFilter
                        columnKey="rowNo" label="No" data={[]} activeFilters={null} sortOnly sortLabels={['1 → 9', '9 → 1']}
                        range={rowNoRange}
                        onRangeChange={(r) => { setRowNoRange(r); setLedgerPage(1); }}
                        onFilterChange={() => {}}
                        onSort={(d) => setLedgerSort({ key: "rowNo", direction: d })}
                        currentSort={ledgerSort}
                      />
                    </div>
                  </TableHead>
                )}
                <TableHead className="w-44 min-w-44">
                  <div className="flex items-center justify-start gap-1">
                    Date
                    <ExcelColumnFilter 
                      columnKey="colA" label="Tanggal" data={getCascadingData("colA")} 
                      activeFilters={ledgerFilters["colA"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colA: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colA", direction: d})}
                      currentSort={ledgerSort}
                      type="date"
                      dateKey="rawColA"
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    Description
                    <ExcelColumnFilter 
                      columnKey="colB" label="Description" data={getCascadingData("colB")} 
                      activeFilters={ledgerFilters["colB"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colB: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colB", direction: d})}
                      currentSort={ledgerSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3 text-right w-40 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    Debit
                    <ExcelColumnFilter 
                      columnKey="colC" label="Debit" data={getCascadingData("colC")} 
                      activeFilters={ledgerFilters["colC"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colC: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colC", direction: d})}
                      currentSort={ledgerSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3 text-right w-40 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    Credit
                    <ExcelColumnFilter 
                      columnKey="colD" label="Credit" data={getCascadingData("colD")} 
                      activeFilters={ledgerFilters["colD"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colD: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colD", direction: d})}
                      currentSort={ledgerSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3 text-right w-44 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    Balance
                    <ExcelColumnFilter 
                      columnKey="colE" label="Balance" data={getCascadingData("colE")} 
                      activeFilters={ledgerFilters["colE"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colE: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colE", direction: d})}
                      currentSort={ledgerSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3 w-48 pl-4">
                  <div className="flex items-center gap-1">
                    Ledger
                    <ExcelColumnFilter 
                      columnKey="colF" label="Ledger" data={getCascadingData("colF")} 
                      activeFilters={ledgerFilters["colF"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colF: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colF", direction: d})}
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3 w-48 pl-4">
                  <div className="flex items-center gap-1">
                    Sub Ledger - 1
                    <ExcelColumnFilter 
                      columnKey="colG" label="Sub Ledger - 1" data={getCascadingData("colG")} 
                      activeFilters={ledgerFilters["colG"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colG: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colG", direction: d})}
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3 w-48 pl-4">
                  <div className="flex items-center gap-1">
                    Sub Ledger - 2
                    <ExcelColumnFilter 
                      columnKey="colH" label="Sub Ledger - 2" data={getCascadingData("colH")} 
                      activeFilters={ledgerFilters["colH"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colH: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colH", direction: d})}
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3 w-48 pl-4">
                  <div className="flex items-center gap-1">
                    Sub Ledger - 3
                    <ExcelColumnFilter 
                      columnKey="colI" label="Sub Ledger - 3" data={getCascadingData("colI")} 
                      activeFilters={ledgerFilters["colI"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colI: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colI", direction: d})}
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3 w-24 pr-4 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transLoading ? (
                <TableRow>
                  <TableCell colSpan={11 + extraCols} className="h-96 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Synchronizing Global Ledger Data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedLedger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11 + extraCols} className="h-64 text-center opacity-20">
                    <Search size={48} className="mx-auto" />
                    <p className="mt-4 font-black uppercase tracking-widest">No mutation records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedLedger.map((row: any) => (
                    <Fragment key={row.id}>
                    {editingId === row.id ? (
                      <InlineEditRow
                        raw={rawById.get(row.id)}
                        master={ledgerMaster}
                        showRowNo={showRowNo}
                        saving={savingInline}
                        onSave={saveEdit}
                        onCancel={cancelInline}
                      />
                    ) : (
                    <LedgerDisplayRow
                      row={row}
                      showRowNo={showRowNo}
                      busy={inlineBusy}
                      canEdit={canEdit}
                      canCreate={canCreate}
                      canDelete={canDelete}
                      onView={handleViewTransaction}
                      onHistory={can('audit-logs.index') ? handleHistory : undefined}
                      onEdit={handleEditTransaction}
                      onInsert={handleInsertAfter}
                      onDelete={handleDeleteTransaction}
                    />
                    )}
                    {insertAfterId === row.id && (
                      <InlineInsertRows
                        anchorSaldo={Number(rawById.get(row.id)?.colE || 0)}
                        master={ledgerMaster}
                        showRowNo={showRowNo}
                        anchorRowNo={rawById.get(row.id)?.rowNo}
                        saving={savingInline}
                        onSave={saveInsert}
                        onCancel={cancelInline}
                      />
                    )}
                    </Fragment>
                  ))}
                  
                  {/* Subtotal Row */}
                  <TableRow className="bg-secondary/5 border-t-2 border-secondary/30 hover:bg-secondary/5 transition-none font-bold whitespace-nowrap">
                    <TableCell colSpan={2 + extraCols} className="text-[11px] text-secondary/80 uppercase tracking-[0.2em] pl-4">
                      {isNoPaginationAccount ? "Total Statement" : `Subtotal (Page ${ledgerPage})`}
                    </TableCell>
                    <TableCell className="text-right text-rose-600 pr-4">
                      {formatCurrency(accumulatedTotals.withdrawal)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 pr-4">
                      {formatCurrency(accumulatedTotals.deposit)}
                    </TableCell>
                    <TableCell colSpan={7} />
                  </TableRow>

                  {/* Grand Total Row (Optional, but good for consistency) */}
                  <TableRow className="bg-secondary/10 border-t border-secondary/30 hover:bg-secondary/10 transition-none font-bold whitespace-nowrap">
                    <TableCell colSpan={2 + extraCols} className="text-[11px] text-secondary uppercase tracking-[0.2em] pl-4">
                      Grand Total ({filteredAndSortedLedger.length} Records)
                    </TableCell>
                    <TableCell className="text-right text-rose-600 pr-4">
                      {formatCurrency(grandTotals.withdrawal)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 pr-4">
                      {formatCurrency(grandTotals.deposit)}
                    </TableCell>
                    <TableCell colSpan={7} />
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
          </LedgerErrorBoundary>
        </div>
        
      </div>
     
      {!isNoPaginationAccount && (
        <PaginationControls 
          meta={ledgerMeta} 
          onPageChange={setLedgerPage} 
          isFetching={transLoading} 
        />
      )}

      <HistoryDialog

        open={historyRow !== null}

        onOpenChange={(o) => { if (!o) setHistoryRow(null); }}

        table="financial_transactions"

        rowId={historyRow?.id}

        title={historyTitle(historyRow?.colA, historyRow?.colB)}

      />

      <AddLedgerModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen} 
        selectedAccount={selectedAccount}
        year={yearNum}
        onSuccess={() => {
          refetchFiscal();
          refetchTransactions();
        }}
      />

      <Dialog 
        open={transactionToDelete !== null} 
        onOpenChange={(open) => {
          if (isDeleting) return;
          if (!open) setTransactionToDelete(null);
        }}
      >
        <DialogContent 
          className="max-w-[400px] p-0 overflow-hidden bg-white rounded-3xl border-0 shadow-2xl [&>button]:hidden"
          onInteractOutside={(e) => { if (isDeleting) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (isDeleting) e.preventDefault(); }}
        >
          <div className="bg-destructive/5 p-8 flex flex-col items-center justify-center text-center border-b border-primary/5">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <DialogTitle className="text-xl font-bold text-primary mb-2">Delete Transaction?</DialogTitle>
            <DialogDescription className="text-[13px] font-medium text-muted-foreground leading-relaxed px-4">
              This action cannot be undone. All subsequent ledger balances will be automatically recalculated.
            </DialogDescription>
          </div>
          <DialogFooter className="p-6 bg-white gap-3 flex-row justify-center sm:justify-center">
            <Button
              variant="ghost"
              onClick={() => setTransactionToDelete(null)}
              disabled={isDeleting}
              className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] text-muted-foreground transition-all"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={executeDelete}
              disabled={isDeleting}
              className="flex-1 h-12 rounded-xl font-bold shadow-lg shadow-destructive/20 transition-all"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DetailModal
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        title="Mutation Details"
        subtitle={selectedViewTransaction?.colB}
        data={[
          { label: "Date", value: selectedViewTransaction?.colA },
          { label: "Description", value: selectedViewTransaction?.colB },
          { label: "Debit", value: selectedViewTransaction?.colC },
          { label: "Credit", value: selectedViewTransaction?.colD },
          { label: "Balance", value: selectedViewTransaction?.colE },
          { label: "Ledger", value: selectedViewTransaction?.colF },
          { label: "Sub Ledger - 1", value: selectedViewTransaction?.colG },
          { label: "Sub Ledger - 2", value: selectedViewTransaction?.colH },
          { label: "Sub Ledger - 3", value: selectedViewTransaction?.colI },
        ]}
      />
      </div>
    </PageContainer>
  );
}
