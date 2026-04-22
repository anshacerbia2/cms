import { useState, useMemo } from "react";
import { 
  Search, 
  Landmark,
  Plus,
  FilterX
} from "lucide-react";
import { useFinance } from "@/features/finance/hooks/useFinance";
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
import { PaginationControls } from "@/components/common/PaginationControls";
import { ExcelColumnFilter } from "../components/ExcelColumnFilter";

export default function BankMutationPage() {
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerBankFilter, setLedgerBankFilter] = useState("BCA");
  const [ledgerFilters, setLedgerFilters] = useState<Record<string, Set<string> | null>>({});
  const [ledgerSort, setLedgerSort] = useState<{key: string, direction: 'asc'|'desc' | null}>({key: 'id', direction: 'asc'});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const ledgerLimit = 10;

  const { getAllTransactions } = useFinance();
  
  // Use getAllTransactions to bypass the strict PaginationQueryDto (which causes 400 error when sending 'name')
  // This matches the "previously works" behavior where full dataset was often used for client-side filtering.
  const { data: allTransactionsRaw, isLoading: transLoading, refetch } = getAllTransactions(
    ledgerBankFilter
  );
  
  const allTransactions = allTransactionsRaw || [];

  // --- CLIENT-SIDE ENGINE (Filtering & Sorting) ---
  const filteredAndSortedLedger = useMemo(() => {
    let result = [...allTransactions];

    // 1. Global Search
    if (ledgerSearch) {
      const term = ledgerSearch.toLowerCase();
      result = result.filter(row => 
        String(row.colB || "").toLowerCase().includes(term) ||
        String(row.colF || "").toLowerCase().includes(term) ||
        String(row.colG || "").toLowerCase().includes(term) ||
        String(row.colH || "").toLowerCase().includes(term)
      );
    }

    // 2. Column-specific filters
    Object.entries(ledgerFilters).forEach(([key, values]) => {
      if (values && values.size > 0) {
        result = result.filter(row => values.has(String(row[key as keyof typeof row] || "")));
      }
    });

    // 3. Sorting
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

  // 4. Pagination (Client-side)
  const paginatedLedger = useMemo(() => {
    const start = (ledgerPage - 1) * ledgerLimit;
    return filteredAndSortedLedger.slice(start, start + ledgerLimit);
  }, [filteredAndSortedLedger, ledgerPage]);

  const ledgerMeta = {
    total: filteredAndSortedLedger.length,
    page: ledgerPage,
    limit: ledgerLimit,
    lastPage: Math.ceil(filteredAndSortedLedger.length / ledgerLimit) || 1
  };

  // 5. Accumulated Totals (For the current page view as requested)
  const accumulatedTotals = useMemo(() => {
    return paginatedLedger.reduce((acc, row) => ({
      withdrawal: acc.withdrawal + (Number(row.colC) || 0),
      deposit: acc.deposit + (Number(row.colD) || 0),
    }), { withdrawal: 0, deposit: 0 });
  }, [paginatedLedger]);

  const handleClearFilters = () => {
    setLedgerSearch("");
    setLedgerFilters({});
    setLedgerPage(1);
  };

  const isAnyFilterActive = ledgerSearch !== "" || Object.keys(ledgerFilters).length > 0;

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700 pb-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary uppercase flex items-center gap-3">
             <Landmark className="text-secondary shrink-0" size={32} />
             Bank Mutation
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Institutional financial ledger and audit trail for corporate accounts.</p>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search transactions..." 
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 text-[13px] font-medium"
            value={ledgerSearch}
            onChange={(e) => { setLedgerSearch(e.target.value); setLedgerPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select 
            value={ledgerBankFilter} 
            onValueChange={(v) => { 
              setLedgerBankFilter(v); 
              handleClearFilters();
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px] h-12 px-5 bg-white border-0 rounded-xl shadow-sm flex items-center gap-2 text-muted-foreground font-bold">
              <div className="flex items-center gap-2">
                <Landmark size={18} />
                <SelectValue placeholder="Select Bank" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-primary/10 shadow-premium bg-white">
              <SelectItem value="BCA" className="text-[11px] font-bold uppercase py-3 px-5">BCA</SelectItem>
              <SelectItem value="MANDIRI" className="text-[11px] font-bold uppercase py-3 px-5">Mandiri</SelectItem>
              <SelectItem value="CITIBANK" className="text-[11px] font-bold uppercase py-3 px-5">Citibank</SelectItem>
              <SelectItem value="BTN" className="text-[11px] font-bold uppercase py-3 px-5">BTN</SelectItem>
              <SelectItem value="BRI" className="text-[11px] font-bold uppercase py-3 px-5">BRI</SelectItem>
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
            className="h-12 w-12 bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-sm flex items-center justify-center shrink-0"
          >
            <Plus size={20} strokeWidth={3} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] shadow-premium border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[1600px]">
            <TableHeader className="bg-primary/5">
              <TableRow className="hover:bg-transparent border-primary/5 h-16 whitespace-nowrap">
                <TableHead className="pl-8 text-[11px] font-black uppercase tracking-widest text-primary w-32 text-left border-r border-primary/5">
                  <div className="flex items-center justify-start gap-1">
                    Tanggal
                    <ExcelColumnFilter 
                      columnKey="colA" label="Tanggal" data={allTransactions} 
                      activeFilters={ledgerFilters["colA"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colA: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colA", direction: d})}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-widest text-primary border-r border-primary/5 px-4">
                  <div className="flex items-center gap-1">
                    Keterangan Transaksi
                    <ExcelColumnFilter 
                      columnKey="colB" label="Keterangan" data={allTransactions} 
                      activeFilters={ledgerFilters["colB"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colB: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colB", direction: d})}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right text-[11px] font-black uppercase tracking-widest text-primary w-40 border-r border-primary/5 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    Debet
                    <ExcelColumnFilter 
                      columnKey="colC" label="Debet" data={allTransactions} 
                      activeFilters={ledgerFilters["colC"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colC: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colC", direction: d})}
                      valueFormatter={formatCurrency}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right text-[11px] font-black uppercase tracking-widest text-primary w-40 border-r border-primary/5 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    Kredit
                    <ExcelColumnFilter 
                      columnKey="colD" label="Kredit" data={allTransactions} 
                      activeFilters={ledgerFilters["colD"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colD: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colD", direction: d})}
                      valueFormatter={formatCurrency}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right text-[11px] font-black uppercase tracking-widest text-primary w-44 border-r border-primary/5 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    Saldo
                    <ExcelColumnFilter 
                      columnKey="colE"
                      label="Saldo"
 data={allTransactions} 
                      activeFilters={ledgerFilters["colE"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colE: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colE", direction: d})}
                      valueFormatter={formatCurrency}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-left text-[11px] font-black uppercase tracking-widest text-primary w-48 border-r border-primary/5 pl-4">
                  <div className="flex items-center gap-1">
                    Ledger
                    <ExcelColumnFilter 
                      columnKey="colF"
                      label="Ledger"
 data={allTransactions} 
                      activeFilters={ledgerFilters["colF"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colF: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colF", direction: d})}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-left text-[11px] font-black uppercase tracking-widest text-primary w-48 border-r border-primary/5 pl-4">
                  <div className="flex items-center gap-1">
                    Sub Ledger - 1
                    <ExcelColumnFilter 
                      columnKey="colG"
                      label="Sub Ledger - 1"
 data={allTransactions} 
                      activeFilters={ledgerFilters["colG"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colG: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colG", direction: d})}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-left text-[11px] font-black uppercase tracking-widest text-primary w-48 border-r border-primary/5 pl-4">
                  <div className="flex items-center gap-1">
                    Sub Ledger - 2
                    <ExcelColumnFilter 
                      columnKey="colH"
                      label="Sub Ledger - 2"
                      data={allTransactions} 
                      activeFilters={ledgerFilters["colH"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colH: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colH", direction: d})}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-left text-[11px] font-black uppercase tracking-widest text-primary w-48 border-r border-primary/5 pl-4">
                  <div className="flex items-center gap-1">
                    Sub Ledger - 3
                    <ExcelColumnFilter 
                      columnKey="colI"
                      label="Sub Ledger - 3"
                      data={allTransactions} 
                      activeFilters={ledgerFilters["colI"]} 
                      onFilterChange={(v) => { setLedgerFilters(p => ({...p, colI: v})); setLedgerPage(1); }}
                      onSort={(d) => setLedgerSort({key: "colI", direction: d})}
                    />
                  </div>
                </TableHead>
                <TableHead className="pr-8 text-left text-[11px] font-black uppercase tracking-widest text-primary w-48 border-r border-primary/5 pl-4">
                  <div className="flex items-center gap-1">
                    Sub Ledger - 4
                    <ExcelColumnFilter 
                      columnKey="colJ"
                      label="Sub Ledger - 4"
                      data={allTransactions} 
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
                  <TableCell colSpan={8} className="h-64 text-center opacity-20">
                    <Search size={48} className="mx-auto" />
                    <p className="mt-4 font-black uppercase tracking-widest">No mutation records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedLedger.map((row: any) => (
                    <TableRow key={row.id} className="border-primary/5 hover:bg-transparent transition-none whitespace-nowrap group">
                      <TableCell className="pl-8 py-3 text-[12px] text-primary/60 border-r border-primary/5 text-left">{formatDate(row.colA)}</TableCell>
                      <TableCell className="py-3 px-4 font-medium text-primary text-[12px] uppercase border-r border-primary/5 transition-colors max-w-md truncate" title={row.colB}>
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
                      <TableCell className="py-3 text-left border-r border-primary/5 pl-4 text-[12px] text-primary uppercase tracking-tighter" title={row.colF}>
                        {row.colF || "-"}
                      </TableCell>
                      <TableCell className="py-3 text-left text-[12px] text-primary uppercase truncate max-w-[150px] border-r border-primary/5 pl-4" title={row.colG}>
                        {row.colG || "-"}
                      </TableCell>
                      <TableCell className="py-3 text-left text-[12px] text-primary uppercase truncate max-w-[150px] border-r border-primary/5 pl-4" title={row.colH}>
                        {row.colH || "-"}
                      </TableCell>
                      <TableCell className="py-3 text-left text-[12px] text-primary uppercase truncate max-w-[150px] border-r border-primary/5 pl-4" title={row.colI}>
                        {row.colI || "-"}
                      </TableCell>
                      <TableCell className="pr-8 py-3 text-left text-[12px] text-primary uppercase truncate max-w-[150px] pl-4" title={row.colJ}>
                        {row.colJ || "-"}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Summary Rows */}
                  <TableRow className="bg-primary/5 border-t-2 border-primary/20 hover:bg-primary/5 transition-none font-bold">
                    <TableCell colSpan={2} className="pl-8 py-3 text-[11px] text-primary uppercase tracking-[0.2em]">
                      Accumulated Balance (Current Page)
                    </TableCell>
                    <TableCell className="py-3 text-right text-red-600 text-[12px] border-r border-primary/5 pr-4 whitespace-nowrap">
                      {accumulatedTotals.withdrawal !== 0 ? formatCurrency(accumulatedTotals.withdrawal) : "-"}
                    </TableCell>
                    <TableCell className="py-3 text-right text-emerald-700 text-[12px] border-r border-primary/5 pr-4 whitespace-nowrap">
                      {accumulatedTotals.deposit !== 0 ? formatCurrency(accumulatedTotals.deposit) : "-"}
                    </TableCell>
                    <TableCell className="py-3 text-right border-r border-primary/5 pr-4 text-[12px] text-primary whitespace-nowrap">
                      -
                    </TableCell>
                    <TableCell colSpan={5} className="bg-primary/[0.01]" />
                  </TableRow>

                  <TableRow className="bg-secondary/5 border-t border-secondary/20 hover:bg-secondary/5 transition-none font-bold">
                    <TableCell colSpan={4} className="pl-8 py-3 text-[11px] text-secondary uppercase tracking-[0.2em]">
                      Total
                    </TableCell>
                    <TableCell className="py-3 text-right border-r border-primary/5 pr-4 text-[13px] bg-secondary/5 whitespace-nowrap">
                      {(() => {
                        const lastRow = paginatedLedger[paginatedLedger.length - 1];
                        const totalValue = lastRow ? (Number(lastRow.colD) || 0) + (Number(lastRow.colE) || 0) - (Number(lastRow.colC) || 0) : 0;
                        return (
                          <span className={totalValue >= 0 ? "text-emerald-700" : "text-red-600"}>
                            {formatCurrency(totalValue)}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell colSpan={5} className="bg-secondary/[0.01]" />
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
        onSuccess={() => refetch()} 
        currentSource={ledgerBankFilter}
      />
    </div>
  );
}
