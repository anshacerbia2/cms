import { useState, useMemo } from "react";
import { Search, Calendar, Landmark, Hash } from "lucide-react";
import { useBanks } from "../hooks/useBanks";
import { PaginationControls } from "@/components/common/PaginationControls";
import { useDebounce } from "use-debounce";
import { Input } from "@/components/ui/input";
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
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

export function FiscalPeriodsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  // Fetch accounts for the filter dropdown
  const { internalAccountsQuery } = useBanks({
    accounts: { limit: 100, enabled: true },
  });
  const internalAccounts = useMemo(() => internalAccountsQuery.data?.data || [], [internalAccountsQuery.data?.data]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];
    for (let y = currentYear; y >= 2020; y--) {
      years.push(y.toString());
    }
    return years;
  }, []);

  const { fiscalPeriodsQuery } = useBanks({
    fiscalPeriods: { 
      search: debouncedSearch, 
      page, 
      limit: 10, 
      enabled: true,
      accountId: selectedAccountId !== "all" ? selectedAccountId : undefined,
      year: selectedYear !== "all" ? selectedYear : undefined,
    },
  });

  const data = fiscalPeriodsQuery.data?.data || [];
  const meta = fiscalPeriodsQuery.data?.meta || { total: 0, lastPage: 1, page: 1, limit: 10 };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-white/50 p-2 rounded-xl border border-primary/5 backdrop-blur-sm mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
          <Input 
            placeholder="Search by account name or number..." 
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 text-[13px] font-medium"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          {/* Account Select */}
          <Select 
            value={selectedAccountId} 
            onValueChange={(v) => { setSelectedAccountId(v); setPage(1); }}
          >
            <SelectTrigger className="flex-1 xl:w-[220px]">
              <div className="flex items-center gap-3 overflow-hidden">
                <Landmark size={18} className="text-secondary shrink-0" />
                {selectedAccountId === "all" ? (
                  <span className="font-bold text-muted-foreground truncate text-left">All Accounts</span>
                ) : (
                  <div className="flex flex-col items-start gap-0 overflow-hidden whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black uppercase tracking-widest border border-slate-200 px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 shrink-0">
                        {internalAccounts.find((a: any) => a.id === selectedAccountId)?.type || "TYPE"}
                      </span>
                      <span className="text-[12px] font-extrabold text-muted-foreground truncate text-left">
                        {internalAccounts.find((a: any) => a.id === selectedAccountId)?.bank?.bankBrand || internalAccounts.find((a: any) => a.id === selectedAccountId)?.holderName || "Account"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-fit">
              <SelectItem value="all">
                All Accounts
              </SelectItem>
              {internalAccounts.map((acc: any) => (
                <SelectItem 
                  key={acc.id} 
                  value={acc.id}
                >
                  <div className="flex flex-col items-start gap-1 w-full">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black uppercase tracking-widest border border-slate-200 px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 shrink-0">
                        {acc.type}
                      </span>
                      <span className="font-extrabold text-[12px] tracking-tight">
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
            value={selectedYear} 
            onValueChange={(v) => { setSelectedYear(v); setPage(1); }}
          >
            <SelectTrigger className="flex-1 xl:w-[130px]">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-secondary" />
                <SelectValue placeholder="Year" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                All Years
              </SelectItem>
              {availableYears.map(year => (
                <SelectItem 
                  key={year} 
                  value={year}
                >
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-premium border border-primary/5 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px] pl-8">Year</TableHead>
              <TableHead>Account & Bank</TableHead>
              <TableHead className="text-right">Opening Balance</TableHead>
              <TableHead className="text-right pr-8">Closing Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fiscalPeriodsQuery.isPending ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i} className="animate-pulse border-primary/5">
                  <TableCell className="pl-8 "><div className="h-4 w-12 bg-slate-200 rounded"></div></TableCell>
                  <TableCell><div className="h-4 w-48 bg-slate-200 rounded"></div></TableCell>
                  <TableCell><div className="h-4 w-24 bg-slate-200 rounded ml-auto"></div></TableCell>
                  <TableCell className="text-right "><div className="h-4 w-24 bg-slate-200 rounded ml-auto"></div></TableCell>
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-20">
                    <Calendar size={48} />
                    <p className="text-xs font-black uppercase tracking-widest">No Fiscal Periods Found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item: any) => (
                <TableRow key={item.id} className="group whitespace-nowrap">
                  <TableCell className="pl-8">
                    <div className="flex items-center gap-2">
                       <Calendar size={14} className="text-secondary" />
                       <span className="font-black text-primary text-sm tracking-tight">{item.year}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-extrabold text-primary uppercase leading-tight">{item.internalAccount?.holderName}</span>
                      <div className="flex items-center gap-1.5 opacity-60">
                        <Landmark size={10} className="text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase italic tracking-tighter">
                          {item.internalAccount?.bank?.bankName || item.internalAccount?.bank?.name || "Internal Ledger"}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-[12px] font-black text-primary whitespace-nowrap tabular-nums">
                    {item.openingBalance != null ? formatCurrency(item.openingBalance) : "-"}
                  </TableCell>
                  <TableCell className="text-right text-[12px] font-black text-primary pr-8 whitespace-nowrap tabular-nums">
                    {item.closingBalance != null ? formatCurrency(item.closingBalance) : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationControls 
        meta={meta} 
        onPageChange={setPage}
        isFetching={fiscalPeriodsQuery.isFetching}
      />
    </div>
  );
}
