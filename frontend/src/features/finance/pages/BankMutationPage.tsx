import { useState, useMemo, useEffect, Fragment } from "react";
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
  Edit2,
  Trash2,
  CornerDownRight,
  Check,
  X,
  FileSpreadsheet,
  FileText,
  Eye,
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
import { formatCurrency, formatDate, cleanAmount, cn, parseSmartDate, cleanNumber } from "@/lib/utils";
import { downloadExcelFile, downloadPdfFile } from "@/lib/downloadFile";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AddLedgerModal from "../components/AddLedgerModal";
import {
  LedgerRowEditor,
  type LedgerDraft,
  type DraftField,
  DRAFT_COLUMNS,
  emptyDraft,
  draftFrom,
  isBlankDraft,
  draftPayload,
} from "../components/LedgerRowEditor";
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
  const [editing, setEditing] = useState<{ id: number; draft: LedgerDraft } | null>(null);
  const [inserting, setInserting] = useState<{ afterId: number; drafts: LedgerDraft[] } | null>(null);
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

  /** Baris mentah dari API, sebelum diformat untuk tampilan. */
  const rawRow = (id: number) => (allTransactionsRaw || []).find((r: any) => r.id === id);

  /** Sedang ada baris yang diketik - tombol edit/sisip di baris lain dikunci supaya ketikan tidak hilang. */
  const inlineBusy = editing !== null || inserting !== null;

  const handleEditTransaction = (row: any) => {
    if (inlineBusy) return;
    setEditing({ id: row.id, draft: draftFrom(rawRow(row.id)) });
  };

  /** Baris baru mendarat tepat di bawah `row`, bukan di ujung daftar. */
  const handleInsertAfter = (row: any) => {
    if (inlineBusy) return;
    setInserting({ afterId: row.id, drafts: [emptyDraft()] });
  };

  const cancelInline = () => {
    setEditing(null);
    setInserting(null);
  };

  const saveEdit = async () => {
    if (!editing || savingInline) return;
    setSavingInline(true);
    try {
      await updateTransaction()({ id: editing.id, data: draftPayload(editing.draft) });
      toast.success("Baris disimpan.");
      setEditing(null);
      refetchTransactions();
      refetchFiscal();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Gagal menyimpan baris.");
    } finally {
      setSavingInline(false);
    }
  };

  const saveInsert = async () => {
    if (!inserting || savingInline) return;
    const filled = inserting.drafts.filter((d) => !isBlankDraft(d));
    // Sama dengan form create: butuh deskripsi dan nominal. Tanggal tidak wajib,
    // dan tidak harus di tahun yang sama - buku non-kas punya ribuan baris tanpa
    // tanggal dan ratusan yang bertanggal tahun berikutnya.
    const incomplete = filled.findIndex(
      (d) => d.colB.trim() === "" || (Number(d.colC || 0) === 0 && Number(d.colD || 0) === 0),
    );
    if (filled.length === 0) {
      toast.error("Belum ada baris yang diisi.");
      return;
    }
    if (incomplete >= 0) {
      toast.error(`Baris ${incomplete + 1}: deskripsi dan nominal (debit atau kredit) wajib diisi.`);
      return;
    }
    setSavingInline(true);
    try {
      await insertTransaction()({
        rows: filled.map(draftPayload),
        accountId: selectedAccount?.id,
        tagYear: yearNum,
        afterId: inserting.afterId,
      });
      toast.success(`${filled.length} baris disisipkan.`);
      setInserting(null);
      refetchTransactions();
      refetchFiscal();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Gagal menyisipkan baris.");
    } finally {
      setSavingInline(false);
    }
  };

  const setDraft = (index: number, field: DraftField, value: string) =>
    setInserting((cur) =>
      cur ? { ...cur, drafts: cur.drafts.map((d, i) => (i === index ? { ...d, [field]: value } : d)) } : cur,
    );

  const focusDraft = (rowKey: string, field: DraftField) =>
    setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(
        `input[data-draft-row="${rowKey}"][data-draft-col="${field}"]`,
      );
      el?.focus();
      el?.select();
    }, 30);

  /** Enter turun ke baris berikutnya, dan menambah baris kalau sudah di paling bawah - seperti form create. */
  const onDraftKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, field: DraftField) => {
    if (e.key === "Escape") return cancelInline();
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) return void saveInsert();
    if (inserting && index === inserting.drafts.length - 1) {
      setInserting((cur) => (cur ? { ...cur, drafts: [...cur.drafts, emptyDraft()] } : cur));
    }
    focusDraft(`ins-${index + 1}`, field);
  };

  /** Menempel blok dari Excel: tiap baris jadi satu draf, mulai dari sel yang sedang aktif. */
  const onDraftPaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number, field: DraftField) => {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\t") && !text.includes("\n")) return; // satu nilai: biarkan tempel biasa
    e.preventDefault();
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    const startCol = DRAFT_COLUMNS.indexOf(field);
    setInserting((cur) => {
      if (!cur) return cur;
      const drafts = [...cur.drafts];
      lines.forEach((line, li) => {
        const at = index + li;
        while (drafts.length <= at) drafts.push(emptyDraft());
        const next = { ...drafts[at] };
        line.split("\t").forEach((raw, ci) => {
          const key = DRAFT_COLUMNS[startCol + ci];
          if (!key) return; // kolom berlebih dari Excel dibuang, bukan digeser
          const v = raw.trim();
          next[key] = key === "colA" ? parseSmartDate(v) : key === "colC" || key === "colD" ? cleanNumber(v) : v;
        });
        drafts[at] = next;
      });
      return { ...cur, drafts };
    });
    toast.success(`${lines.length} baris ditempel dari Excel.`);
  };

  const onEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") return cancelInline();
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    }
  };

  /** Saldo sesudah baris yang sedang disunting, dihitung ulang dari nilai barunya. */
  const editSaldo = (id: number, draft: LedgerDraft) => {
    const raw = rawRow(id);
    if (!raw) return null;
    const before = Number(raw.colE || 0) - Number(raw.colD || 0) + Number(raw.colC || 0);
    return String(before - Number(draft.colC || 0) + Number(draft.colD || 0));
  };

  /** Saldo berjalan untuk tiap draf, meneruskan saldo baris tempat menyisip. */
  const insertSaldos = (afterId: number, drafts: LedgerDraft[]) => {
    let running = Number(rawRow(afterId)?.colE || 0);
    return drafts.map((d) => {
      running = running - Number(d.colC || 0) + Number(d.colD || 0);
      return String(running);
    });
  };

  const handleViewTransaction = (row: any) => {
    setSelectedViewTransaction(row);
    setIsViewModalOpen(true);
  };

  const handleDeleteTransaction = (id: number) => {
    setTransactionToDelete(id);
  };

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

  // --- PRE-FORMAT DATA FOR EXCEL FILTER ---
  const displayTransactions = useMemo(() => {
    return (allTransactionsRaw || []).map((row: any) => ({
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
  }, [allTransactionsRaw]);

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
  };

  const isAnyFilterActive = isExcelFilterActive || ledgerStartDate !== undefined || ledgerEndDate !== undefined;

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

  const paginatedLedger = useMemo(() => {
    if (isNoPaginationAccount) return filteredAndSortedLedger;
    const start = (ledgerPage - 1) * ledgerLimit;
    return filteredAndSortedLedger.slice(start, start + ledgerLimit);
  }, [filteredAndSortedLedger, ledgerPage, ledgerLimit, isNoPaginationAccount]);

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

          <Select value={ledgerYearFilter} onValueChange={(v) => { setLedgerYearFilter(v); setLedgerPage(1); }}>
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
            <Button onClick={(e) => { e.stopPropagation(); setIsAddModalOpen(true); }} className="h-12 px-6 flex-1 xl:flex-none bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-sm flex items-center justify-center gap-2 font-bold transition-all active:scale-95">
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
                onClick={() => downloadExcelFile(`/bank-mutation/export/excel?accountId=${selectedAccount?.id}&year=${ledgerYearFilter}${ledgerStartDate ? `&startDate=${format(ledgerStartDate, 'yyyy-MM-dd')}` : ''}${ledgerEndDate ? `&endDate=${format(ledgerEndDate, 'yyyy-MM-dd')}` : ''}`, `Bank_Statement_${accountLabel(selectedAccount).replace(/\s+/g, '_')}_${ledgerYearFilter !== 'all' ? ledgerYearFilter : 'All'}.xlsx`)}
                className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-emerald-600 transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet size={16} strokeWidth={2.5} />
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => downloadPdfFile(`/bank-mutation/export/pdf?accountId=${selectedAccount?.id}&year=${ledgerYearFilter}${ledgerStartDate ? `&startDate=${format(ledgerStartDate, 'yyyy-MM-dd')}` : ''}${ledgerEndDate ? `&endDate=${format(ledgerEndDate, 'yyyy-MM-dd')}` : ''}`, `Bank_Statement_${accountLabel(selectedAccount).replace(/\s+/g, '_')}_${ledgerYearFilter !== 'all' ? ledgerYearFilter : 'All'}.pdf`)}
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
          <Table className="min-w-[1600px]">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap">
                <TableHead className="w-32">
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
                  <TableCell colSpan={11} className="h-96 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Synchronizing Global Ledger Data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedLedger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-64 text-center opacity-20">
                    <Search size={48} className="mx-auto" />
                    <p className="mt-4 font-black uppercase tracking-widest">No mutation records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedLedger.map((row: any) => (
                    <Fragment key={row.id}>
                    {editing && editing.id === row.id ? (
                      <TableRow className="whitespace-nowrap">
                        <LedgerRowEditor
                          draft={editing.draft}
                          saldo={editSaldo(row.id, editing.draft)}
                          rowKey="edit"
                          autoFocus
                          onChange={(field, value) =>
                            setEditing((cur) => (cur ? { ...cur, draft: { ...cur.draft, [field]: value } } : cur))
                          }
                          onKeyDown={(e) => onEditKeyDown(e)}
                        />
                        <TableCell className="pr-4 bg-amber-50/60">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Simpan (Enter)"
                              disabled={savingInline}
                              className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 rounded-sm"
                              onClick={saveEdit}
                            >
                              <Check size={14} strokeWidth={2.5} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Batal (Esc)"
                              disabled={savingInline}
                              className="h-7 w-7 text-primary/40 hover:text-primary hover:bg-primary/5 rounded-sm"
                              onClick={cancelInline}
                            >
                              <X size={14} strokeWidth={2.5} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                    <TableRow className="hover:bg-slate-50 transition-colors whitespace-nowrap group">
                      <TableCell className="text-primary/60">{row.colA}</TableCell>
                      <TableCell className="font-medium text-primary transition-colors max-w-md truncate" title={row.colB}>
                        {row.colB}
                      </TableCell>
                      <TableCell className="text-right text-rose-600 pr-4 font-bold">{row.colC}</TableCell>
                      <TableCell className="text-right text-emerald-600 pr-4 font-bold">{row.colD}</TableCell>
                      <TableCell className="text-right pr-4 text-primary font-bold">{row.colE}</TableCell>
                      <TableCell className="tracking-tighter" title={row.colF}>{row.colF}</TableCell>
                      <TableCell className="text-primary truncate max-w-[150px]" title={row.colG}>{row.colG}</TableCell>
                      <TableCell className="text-primary truncate max-w-[150px]" title={row.colH}>{row.colH}</TableCell>
                      <TableCell className="text-primary truncate max-w-[150px]" title={row.colI}>{row.colI}</TableCell>
                      <TableCell className="pr-4">
                        <div className="flex items-center justify-end gap-1 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-primary/40 hover:text-primary hover:bg-primary/5 rounded-sm"
                            onClick={(e) => { e.stopPropagation(); handleViewTransaction(row); }}
                          >
                            <Eye size={12} strokeWidth={2.5} />
                          </Button>
                          {can('bank-mutation.edit') && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-primary/40 hover:text-primary hover:bg-primary/5 rounded-sm"
                              disabled={inlineBusy}
                              onClick={(e) => { e.stopPropagation(); handleEditTransaction(row); }}
                            >
                              <Edit2 size={12} strokeWidth={2.5} />
                            </Button>
                          )}
                          {can('bank-mutation.create') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Insert a row below this one"
                              className="h-7 w-7 text-primary/40 hover:text-secondary hover:bg-secondary/5 rounded-sm"
                              disabled={inlineBusy}
                              onClick={(e) => { e.stopPropagation(); handleInsertAfter(row); }}
                            >
                              <CornerDownRight size={12} strokeWidth={2.5} />
                            </Button>
                          )}
                          {can('bank-mutation.delete') && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-rose-500/40 hover:text-rose-600 hover:bg-rose-50 rounded-sm"
                              onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(row.id); }}
                            >
                              <Trash2 size={12} strokeWidth={2.5} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    )}
                    {inserting && inserting.afterId === row.id && ((ins) => {
                      const saldos = insertSaldos(row.id, ins.drafts);
                      return (
                        <>
                          {ins.drafts.map((draft, i) => (
                            <TableRow key={`ins-${i}`} className="whitespace-nowrap">
                              <LedgerRowEditor
                                draft={draft}
                                saldo={saldos[i]}
                                rowKey={`ins-${i}`}
                                autoFocus={i === 0 && ins.drafts.length === 1}
                                onChange={(field, value) => setDraft(i, field, value)}
                                onKeyDown={(e, field) => onDraftKeyDown(e, i, field)}
                                onPaste={(e, field) => onDraftPaste(e, i, field)}
                              />
                              <TableCell className="pr-4 bg-amber-50/60">
                                <div className="flex items-center justify-end">
                                  {ins.drafts.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Buang baris ini"
                                      className="h-7 w-7 text-rose-500/50 hover:text-rose-600 hover:bg-rose-50 rounded-sm"
                                      onClick={() =>
                                        setInserting((cur) =>
                                          cur ? { ...cur, drafts: cur.drafts.filter((_, j) => j !== i) } : cur,
                                        )
                                      }
                                    >
                                      <X size={12} strokeWidth={2.5} />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-amber-50/40 hover:bg-amber-50/40">
                            <TableCell colSpan={10} className="py-2 px-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-lg text-[11px] font-bold gap-1"
                                  onClick={() =>
                                    setInserting((cur) => (cur ? { ...cur, drafts: [...cur.drafts, emptyDraft()] } : cur))
                                  }
                                >
                                  <Plus size={12} /> Tambah baris
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={savingInline}
                                  className="h-8 rounded-lg text-[11px] font-bold gap-1"
                                  onClick={saveInsert}
                                >
                                  <Check size={12} />
                                  {savingInline
                                    ? "Menyimpan..."
                                    : `Simpan ${ins.drafts.filter((d) => !isBlankDraft(d)).length} baris`}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={savingInline}
                                  className="h-8 rounded-lg text-[11px] font-bold"
                                  onClick={cancelInline}
                                >
                                  Batal
                                </Button>
                                <span className="text-[11px] text-muted-foreground ml-2">
                                  Enter = baris baru · Ctrl+Enter = simpan · Esc = batal · bisa tempel dari Excel
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        </>
                      );
                    })(inserting)}
                    </Fragment>
                  ))}
                  
                  {/* Subtotal Row */}
                  <TableRow className="bg-secondary/5 border-t-2 border-secondary/30 hover:bg-secondary/5 transition-none font-bold whitespace-nowrap">
                    <TableCell colSpan={2} className="text-[11px] text-secondary/80 uppercase tracking-[0.2em] pl-4">
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
                    <TableCell colSpan={2} className="text-[11px] text-secondary uppercase tracking-[0.2em] pl-4">
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
        </div>
        
      </div>
     
      {!isNoPaginationAccount && (
        <PaginationControls 
          meta={ledgerMeta} 
          onPageChange={setLedgerPage} 
          isFetching={transLoading} 
        />
      )}

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
