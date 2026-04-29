import { useState, useMemo } from "react";
import { Search, Calendar, Landmark, Lock, Unlock, AlertCircle, Hash } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
            <SelectTrigger className="flex items-center justify-between whitespace-nowrap border-0 py-2 text-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 cursor-pointer flex-1 xl:w-[220px] h-12 px-5 bg-white rounded-xl shadow-sm gap-1.5 text-muted-foreground transition-all">
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
            <SelectContent className="rounded-xl border-primary/10 shadow-premium bg-white p-0 overflow-hidden w-[var(--radix-select-trigger-width)] min-w-fit">
              <SelectItem 
                value="all" 
                className="py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 whitespace-nowrap text-[11px] font-bold uppercase text-muted-foreground transition-colors"
              >
                All Accounts
              </SelectItem>
              {internalAccounts.map((acc: any) => (
                <SelectItem 
                  key={acc.id} 
                  value={acc.id} 
                  className="py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 whitespace-nowrap text-muted-foreground transition-colors"
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
            <SelectTrigger className="flex-1 xl:w-[130px] h-12 px-5 bg-white border-0 rounded-xl shadow-sm flex items-center gap-2 text-muted-foreground font-bold transition-all shrink-0 cursor-pointer">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-secondary" />
                <SelectValue placeholder="Year" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-primary/10 shadow-premium bg-white p-0 overflow-hidden">
              <SelectItem value="all" className="text-[12px] font-bold py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 text-muted-foreground">
                All Years
              </SelectItem>
              {availableYears.map(year => (
                <SelectItem 
                  key={year} 
                  value={year} 
                  className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-muted-foreground"
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
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-primary/5">
              <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-widest text-primary/40 py-3 pl-8">Year</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/40 py-3">Account & Bank</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/40 py-3 text-right">Opening Balance</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/40 py-3 text-right">Closing Balance</TableHead>
              {/* <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/40 py-3 text-center">Status</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/40 py-3 text-center pr-8">Audit</TableHead> */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {fiscalPeriodsQuery.isPending ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i} className="animate-pulse border-primary/5">
                  <TableCell className="py-3 pl-8 "><div className="h-4 w-12 bg-slate-200 rounded"></div></TableCell>
                  <TableCell className="py-3 "><div className="h-4 w-48 bg-slate-200 rounded"></div></TableCell>
                  <TableCell className="py-3 "><div className="h-4 w-24 bg-slate-200 rounded ml-auto"></div></TableCell>
                  <TableCell className="py-3 text-right "><div className="h-4 w-24 bg-slate-200 rounded ml-auto"></div></TableCell>
                  {/* <TableCell className="py-3 text-center "><div className="h-6 w-16 bg-slate-200 rounded-full mx-auto"></div></TableCell>
                  <TableCell className="py-3 text-center pr-8 "><div className="h-4 w-4 bg-slate-200 rounded mx-auto"></div></TableCell> */}
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
                <TableRow key={item.id} className="group hover:bg-slate-50/50 transition-colors border-primary/5">
                  <TableCell className="py-3 pl-8 ">
                    <div className="flex items-center gap-2">
                       <Calendar size={14} className="text-secondary" />
                       <span className="font-black text-primary text-sm tracking-tight">{item.year}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 ">
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
                  <TableCell className="py-3 text-right text-[12px] font-black text-primary border-r border-primary/5 pr-4 whitespace-nowrap tabular-nums ">
                    {item.openingBalance != null ? formatCurrency(item.openingBalance) : "-"}
                  </TableCell>
                  <TableCell className="py-3 text-right text-[12px] font-black text-primary pr-8 whitespace-nowrap tabular-nums ">
                    {item.closingBalance != null ? formatCurrency(item.closingBalance) : "-"}
                  </TableCell>
                  {/* <TableCell className="py-3 text-center ">
                    <Badge 
                      variant="outline" 
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg tracking-widest border-2 transition-all ${
                        item.status === 'CLOSED' 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm shadow-emerald-100/50' 
                          : 'bg-amber-50 border-amber-100 text-amber-600 animate-pulse'
                      }`}
                    >
                      {item.status === 'CLOSED' ? <Lock size={10} className="mr-1 inline" /> : <Unlock size={10} className="mr-1 inline" />}
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-center pr-8 ">
                    {item.isStale ? (
                      <div className="inline-flex items-center justify-center text-amber-500 animate-bounce" title="Sync required: Data drift detected">
                        <AlertCircle size={16} />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
                        <span className="text-[10px] font-black text-emerald-600/60 uppercase tracking-tighter">Verified</span>
                      </div>
                    )}
                  </TableCell> */}
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
