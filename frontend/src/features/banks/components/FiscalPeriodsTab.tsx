import { useState } from "react";
import { Search, Calendar, Landmark, Lock, Unlock, AlertCircle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export function FiscalPeriodsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { fiscalPeriodsQuery } = useBanks({
    fiscalPeriods: { 
      search: debouncedSearch, 
      page, 
      limit: 10, 
      enabled: true 
    },
  });

  const data = fiscalPeriodsQuery.data?.data || [];
  const meta = fiscalPeriodsQuery.data?.meta || { total: 0, lastPage: 1, page: 1, limit: 10 };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex flex-col lg:flex-row items-center gap-4 bg-white/50 p-2 rounded-xl border border-primary/5 backdrop-blur-sm mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
          <Input 
            placeholder="Search by account name or number..." 
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 text-[13px] font-medium"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-premium border border-primary/5 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-primary/5">
              <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-widest text-primary/40 py-5 pl-8">Year</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/40 py-5">Account & Bank</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/40 py-5 text-right">Opening Balance</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/40 py-5 text-right">Closing Balance</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/40 py-5 text-center">Status</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-primary/40 py-5 text-center pr-8">Audit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fiscalPeriodsQuery.isPending ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i} className="animate-pulse border-primary/5">
                  <TableCell className="py-6 pl-8"><div className="h-4 w-12 bg-slate-200 rounded"></div></TableCell>
                  <TableCell className="py-6"><div className="h-4 w-48 bg-slate-200 rounded"></div></TableCell>
                  <TableCell className="py-6"><div className="h-4 w-24 bg-slate-200 rounded ml-auto"></div></TableCell>
                  <TableCell className="py-6"><div className="h-4 w-24 bg-slate-200 rounded ml-auto"></div></TableCell>
                  <TableCell className="py-6 text-center"><div className="h-6 w-16 bg-slate-200 rounded-full mx-auto"></div></TableCell>
                  <TableCell className="py-6 text-center pr-8"><div className="h-4 w-4 bg-slate-200 rounded mx-auto"></div></TableCell>
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-20">
                    <Calendar size={48} />
                    <p className="text-xs font-black uppercase tracking-widest">No Fiscal Periods Found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item: any) => (
                <TableRow key={item.id} className="group hover:bg-slate-50/50 transition-colors border-primary/5">
                  <TableCell className="py-6 pl-8">
                    <div className="flex items-center gap-2">
                       <Calendar size={14} className="text-secondary" />
                       <span className="font-black text-primary text-sm tracking-tight">{item.year}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
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
                  <TableCell className="py-6 text-right text-[12px] font-black text-primary border-r border-primary/5 pr-4 whitespace-nowrap font-mono tabular-nums">
                    {item.openingBalance && Number(item.openingBalance) !== 0 ? formatCurrency(item.openingBalance) : "-"}
                  </TableCell>
                  <TableCell className="py-6 text-right text-[12px] font-black text-primary border-r border-primary/5 pr-4 whitespace-nowrap font-mono tabular-nums">
                    {item.closingBalance && Number(item.closingBalance) !== 0 ? formatCurrency(item.closingBalance) : (item.closingBalance === null ? "-" : "-")}
                  </TableCell>
                  <TableCell className="py-6 text-center">
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
                  <TableCell className="py-6 text-center pr-8">
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
