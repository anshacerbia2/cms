import { memo, useEffect, useMemo, useState } from "react";
import {
  Search,
  FilterX,
  Calendar as CalendarIcon,
  FileSpreadsheet,
  FileText,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { Decimal } from "decimal.js";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatCurrency, formatDate, cleanAmount, cn } from "@/lib/utils";
import { downloadExcelFile, downloadPdfFile, exportFilter } from "@/lib/downloadFile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationControls } from "@/components/common/PaginationControls";
import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/common/PageContainer";
import { useExcelFilter } from "../hooks/useExcelFilter";
import { useBankMutation } from "../hooks/useBankMutation";
import { ExcelColumnFilter } from "../components/ExcelColumnFilter";

const PAGE_LIMIT = 10;

/**
 * Teks tambahan untuk pencarian angka: user bisa ingat jumlahnya sebagai
 * 1500000, 1.500.000, atau 1,500,000 - semuanya harus ketemu. Yang tampil di
 * sel (IDR 1.500.000,00) tetap dari formatCurrency.
 */
function amountSearchText(...values: any[]): string {
  return values
    .filter((v) => v !== null && v !== undefined && Number(v) !== 0)
    .map((v) => {
      const n = Number(v);
      const whole = Math.trunc(Math.abs(n));
      return [
        String(whole),
        whole.toLocaleString("id-ID"),
        whole.toLocaleString("en-US"),
        Math.abs(n).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ].join(" ");
    })
    .join(" ");
}

/** Teks tambahan untuk pencarian tanggal: 2026-01-15, 15/01/2026, 15-01-2026, selain yang tampil. */
function dateSearchText(raw: any): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return [format(d, "yyyy-MM-dd"), format(d, "dd/MM/yyyy"), format(d, "dd-MM-yyyy"), format(d, "d MMM yyyy")].join(" ");
}

/** Satu baris - tanpa saldo dan tanpa aksi. Memo, karena halaman bisa memuat ribuan baris. */
const AllTransactionsRow = memo(function AllTransactionsRow({ row }: { row: any }) {
  return (
    <TableRow className="hover:bg-slate-50 transition-colors whitespace-nowrap group">
      <TableCell className="pl-4">
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-black uppercase tracking-widest border border-slate-200 px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 shrink-0">
            {row.sourceType || "-"}
          </span>
          <span className="font-bold text-primary/80">{row.source}</span>
        </div>
      </TableCell>
      <TableCell className="text-primary/60">{row.colA}</TableCell>
      <TableCell className="font-medium text-primary transition-colors max-w-md truncate" title={row.colB}>
        {row.colB}
      </TableCell>
      <TableCell className="text-right text-rose-600 pr-4 font-bold">{row.colC}</TableCell>
      <TableCell className="text-right text-emerald-600 pr-4 font-bold">{row.colD}</TableCell>
      <TableCell className="tracking-tighter" title={row.colF}>{row.colF}</TableCell>
      <TableCell className="text-primary truncate max-w-[150px]" title={row.colG}>{row.colG}</TableCell>
      <TableCell className="text-primary truncate max-w-[150px]" title={row.colH}>{row.colH}</TableCell>
      <TableCell className="text-primary truncate max-w-[150px] pr-4" title={row.colI}>{row.colI}</TableCell>
    </TableRow>
  );
});

/**
 * All Transactions - permintaan klien 2026-10-08.
 *
 * Transaksi semua rekening (bank, Cash IDR, Non CB) dalam satu daftar, untuk
 * MENCARI satu transaksi dari secuil informasi: tanggal, sumber, jumlah, atau
 * beberapa kata di deskripsi. Hanya baca: tidak ada tambah, edit, hapus, atau
 * saldo - saldo berjalan hanya bermakna per rekening.
 *
 * Datanya baris Bank Statement yang sama, jadi setiap tambahan atau revisi di
 * sana langsung terlihat di sini. Tampilannya mengikuti halaman Bank Statement.
 */
export default function AllTransactionsPage() {
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Rentang tanggal di luar tahun yang dipilih dibuang, seperti di Bank Statement.
  useEffect(() => {
    if (yearFilter === "all") return;
    if (startDate && startDate.getFullYear() !== parseInt(yearFilter)) setStartDate(undefined);
    if (endDate && endDate.getFullYear() !== parseInt(yearFilter)) setEndDate(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearFilter]);

  const { getAllSourcesTransactions } = useBankMutation();
  const { data: raw, isLoading } = getAllSourcesTransactions(
    yearFilter,
    startDate ? format(startDate, "yyyy-MM-dd") : undefined,
    endDate ? format(endDate, "yyyy-MM-dd") : undefined,
  );

  const rows = useMemo(
    () =>
      (raw || []).map((row: any) => ({
        ...row,
        rawColA: row.colA,
        colA: formatDate(row.colA),
        colB: row.colB || "-",
        colC: row.colC && Number(row.colC) !== 0 ? formatCurrency(row.colC) : "-",
        colD: row.colD && Number(row.colD) !== 0 ? formatCurrency(row.colD) : "-",
        colF: row.colF || "-",
        colG: row.colG || "-",
        colH: row.colH || "-",
        colI: row.colI || "-",
        amountSearch: amountSearchText(row.colC, row.colD),
        dateSearch: dateSearchText(row.colA),
      })),
    [raw],
  );

  const {
    page,
    setPage,
    search,
    setSearch,
    filters,
    setFilters,
    sort,
    setSort,
    getCascadingData,
    filteredAndSortedData: filtered,
    clearFilters: clearExcelFilters,
    isAnyFilterActive: isExcelFilterActive,
  } = useExcelFilter({
    data: rows,
    searchFields: ["source", "colA", "dateSearch", "colB", "colC", "colD", "amountSearch", "colF", "colG", "colH", "colI"],
  });

  const clearFilters = () => {
    clearExcelFilters();
    setStartDate(undefined);
    setEndDate(undefined);
  };
  const isAnyFilterActive = isExcelFilterActive || startDate !== undefined || endDate !== undefined;

  const availableYears = useMemo(() => {
    const years: string[] = [];
    for (let y = new Date().getFullYear(); y >= 2025; y--) years.push(y.toString());
    return years;
  }, []);

  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT), [filtered, page]);
  const meta = { total: filtered.length, page, limit: PAGE_LIMIT, lastPage: Math.ceil(filtered.length / PAGE_LIMIT) || 1 };

  const sumOf = (list: any[]) =>
    list.reduce(
      (acc, row) => ({
        debit: acc.debit.plus(new Decimal(cleanAmount(row.colC))),
        credit: acc.credit.plus(new Decimal(cleanAmount(row.colD))),
      }),
      { debit: new Decimal(0), credit: new Decimal(0) },
    );
  const pageTotals = useMemo(() => sumOf(paginated), [paginated]);
  const grandTotals = useMemo(() => sumOf(filtered), [filtered]);

  const exportQuery = `year=${yearFilter}${startDate ? `&startDate=${format(startDate, "yyyy-MM-dd")}` : ""}${endDate ? `&endDate=${format(endDate, "yyyy-MM-dd")}` : ""}`;
  const exportName = `All_Transactions_${yearFilter !== "all" ? yearFilter : "All"}`;

  const columnFilter = (key: string, label: string, extra: Record<string, any> = {}) => (
    <ExcelColumnFilter
      columnKey={key}
      label={label}
      data={getCascadingData(key)}
      activeFilters={filters[key]}
      onFilterChange={(v) => { setFilters((p) => ({ ...p, [key]: v })); setPage(1); }}
      onSort={(d) => setSort({ key, direction: d })}
      currentSort={sort}
      {...extra}
    />
  );

  const datePicker = (label: "FROM" | "UNTIL", value: Date | undefined, onChange: (d: Date | undefined) => void) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-12 px-4 bg-white border-0 shadow-sm rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all justify-start text-left hover:bg-white hover:shadow-sm text-muted-foreground hover:text-muted-foreground min-w-[150px]",
            !value && "text-muted-foreground opacity-60",
          )}
        >
          <div className="flex flex-col items-start gap-0.5">
            <span className={cn("text-[7px] font-black", label === "FROM" ? "text-secondary" : "text-rose-500")}>{label}</span>
            <div className="flex items-center gap-2">
              <CalendarIcon size={12} className={label === "FROM" ? "text-secondary" : "text-rose-500"} />
              {value ? format(value, "dd MMM y") : <span>{label === "FROM" ? "Start Date" : "End Date"}</span>}
            </div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 shadow-premium border-primary/5 overflow-hidden" align="end">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={value}
          onSelect={(d) => { onChange(d); setPage(1); }}
          startMonth={yearFilter === "all" ? new Date(2020, 0) : new Date(parseInt(yearFilter), 0)}
          endMonth={yearFilter === "all" ? new Date(2030, 11) : new Date(parseInt(yearFilter), 11)}
          defaultMonth={value || (yearFilter === "all" ? undefined : new Date(parseInt(yearFilter), 0))}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <PageContainer>
      <PageHeader
        title="All Transactions"
        description="Every bank, Cash and Non Cash & Bank transaction in one list - view only, for finding a transaction fast."
        icon={Search}
      />

      <div className="space-y-8 mt-8">
        {/* Filters & Actions */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search by source, date, amount or description..."
              className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 text-[13px] font-medium"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            {datePicker("FROM", startDate, setStartDate)}
            {datePicker("UNTIL", endDate, setEndDate)}

            <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); setPage(1); }}>
              <SelectTrigger className="flex-1 xl:w-[130px] h-12 px-5 bg-white border-0 rounded-xl shadow-sm flex items-center gap-2 text-muted-foreground font-bold transition-all cursor-pointer">
                <CalendarIcon size={18} className="text-secondary" />
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-primary/10 shadow-premium bg-white p-0 overflow-hidden">
                <SelectItem value="all" className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-muted-foreground transition-colors">
                  All Time
                </SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year} className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-muted-foreground transition-colors">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isAnyFilterActive && (
              <Button onClick={clearFilters} className="h-12 w-12 bg-white border-0 text-muted-foreground hover:text-red-500 hover:bg-red-50/50 rounded-xl shadow-sm flex items-center justify-center shrink-0 transition-all">
                <FilterX size={20} strokeWidth={2} />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-12 w-12 xl:w-auto xl:px-4 bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-sm flex items-center justify-center font-bold disabled:opacity-50 transition-all active:scale-95 shrink-0">
                  <Download size={20} strokeWidth={3} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-primary/10 shadow-premium bg-white p-0 overflow-hidden w-40">
                <DropdownMenuItem
                  onClick={() => downloadExcelFile(`/bank-mutation/all-sources/export/excel?${exportQuery}`, `${exportName}.xlsx`, exportFilter(isAnyFilterActive, filtered))}
                  className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-emerald-600 transition-colors flex items-center gap-2"
                >
                  <FileSpreadsheet size={16} strokeWidth={2.5} />
                  Export Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => downloadPdfFile(`/bank-mutation/all-sources/export/pdf?${exportQuery}`, `${exportName}.pdf`, exportFilter(isAnyFilterActive, filtered))}
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
                  <TableHead className="py-3 pl-4 w-56">
                    <div className="flex items-center gap-1">Source{columnFilter("source", "Source")}</div>
                  </TableHead>
                  <TableHead className="w-44 min-w-44">
                    <div className="flex items-center justify-start gap-1">
                      Date{columnFilter("colA", "Tanggal", { type: "date", dateKey: "rawColA" })}
                    </div>
                  </TableHead>
                  <TableHead className="py-3 px-4">
                    <div className="flex items-center gap-1">Description{columnFilter("colB", "Description")}</div>
                  </TableHead>
                  <TableHead className="py-3 text-right w-40 pr-4">
                    <div className="flex items-center justify-end gap-1">Debit{columnFilter("colC", "Debit")}</div>
                  </TableHead>
                  <TableHead className="py-3 text-right w-40 pr-4">
                    <div className="flex items-center justify-end gap-1">Credit{columnFilter("colD", "Credit")}</div>
                  </TableHead>
                  <TableHead className="py-3 w-48 pl-4">
                    <div className="flex items-center gap-1">Ledger{columnFilter("colF", "Ledger")}</div>
                  </TableHead>
                  <TableHead className="py-3 w-48 pl-4">
                    <div className="flex items-center gap-1">Sub Ledger - 1{columnFilter("colG", "Sub Ledger - 1")}</div>
                  </TableHead>
                  <TableHead className="py-3 w-48 pl-4">
                    <div className="flex items-center gap-1">Sub Ledger - 2{columnFilter("colH", "Sub Ledger - 2")}</div>
                  </TableHead>
                  <TableHead className="py-3 w-48 pl-4 pr-4">
                    <div className="flex items-center gap-1">Sub Ledger - 3{columnFilter("colI", "Sub Ledger - 3")}</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-96 text-center">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Loading All Transactions...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center opacity-20">
                      <Search size={48} className="mx-auto" />
                      <p className="mt-4 font-black uppercase tracking-widest">No transactions found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {paginated.map((row: any) => (
                      <AllTransactionsRow key={row.id} row={row} />
                    ))}

                    <TableRow className="bg-secondary/5 border-t-2 border-secondary/30 hover:bg-secondary/5 transition-none font-bold whitespace-nowrap">
                      <TableCell colSpan={3} className="text-[11px] text-secondary/80 uppercase tracking-[0.2em] pl-4">
                        Subtotal (Page {page})
                      </TableCell>
                      <TableCell className="text-right text-rose-600 pr-4">{formatCurrency(pageTotals.debit)}</TableCell>
                      <TableCell className="text-right text-emerald-600 pr-4">{formatCurrency(pageTotals.credit)}</TableCell>
                      <TableCell colSpan={4} />
                    </TableRow>

                    <TableRow className="bg-secondary/10 border-t border-secondary/30 hover:bg-secondary/10 transition-none font-bold whitespace-nowrap">
                      <TableCell colSpan={3} className="text-[11px] text-secondary uppercase tracking-[0.2em] pl-4">
                        Grand Total ({filtered.length} Records)
                      </TableCell>
                      <TableCell className="text-right text-rose-600 pr-4">{formatCurrency(grandTotals.debit)}</TableCell>
                      <TableCell className="text-right text-emerald-600 pr-4">{formatCurrency(grandTotals.credit)}</TableCell>
                      <TableCell colSpan={4} />
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <PaginationControls meta={meta} onPageChange={setPage} isFetching={isLoading} />
      </div>
    </PageContainer>
  );
}
