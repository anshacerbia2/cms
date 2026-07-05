import React, { useState, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { formatCurrency, getAmountColor } from '@/lib/utils';
import { useExcelFilter } from '../hooks/useExcelFilter';
import { ExcelColumnFilter } from './ExcelColumnFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, FilterX } from 'lucide-react';
import Decimal from 'decimal.js';

import { useInterAccount } from '../hooks/useInterAccount';
import { toast } from "sonner";
import { Edit2, Trash2, AlertCircle } from "lucide-react";
import EditInterAccountModal from "./EditInterAccountModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/authStore";

export const InterAccountTable: React.FC = () => {
  const { can } = useAuthStore();
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const yearNum = useMemo(() => Number(yearFilter), [yearFilter]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2025; y--) {
      years.push(y.toString());
    }
    return years;
  }, []);

  const { data: interAccountData, isLoading, deleteInterAccount, refetch } = useInterAccount({ 
    page: 1, 
    limit: 10000,
    year: yearFilter !== "all" ? yearNum : undefined
  });

  const allDataRaw = interAccountData?.data || [];

  const displayData = useMemo(() => {
    return allDataRaw.map((row: any) => ({
      ...row,
      colA: row.colA || "-",
      colB: row.colB || "-",
      colC: formatCurrency(row.colC),
      rawColC: row.colC,
      colD: formatCurrency(row.colD),
      rawColD: row.colD,
      colE: formatCurrency(row.colE),
      rawColE: row.colE,
      colF: formatCurrency(row.colF),
      rawColF: row.colF,
      colG: formatCurrency(row.colG),
      rawColG: row.colG,
      colH: formatCurrency(row.colH),
      rawColH: row.colH,
      colI: formatCurrency(row.colI),
      rawColI: row.colI,
      colJ: formatCurrency(row.colJ),
      rawColJ: row.colJ,
      colK: formatCurrency(row.colK),
      rawColK: row.colK,
      colL: formatCurrency(row.colL),
      rawColL: row.colL,
      colM: formatCurrency(row.colM),
      rawColM: row.colM,
      colN: formatCurrency(row.colN),
      rawColN: row.colN,
      colO: formatCurrency(row.colO),
      rawColO: row.colO,
      colP: formatCurrency(row.colP),
      rawColP: row.colP,
    }));
  }, [allDataRaw]);

  const {
    search,
    setSearch,
    filteredAndSortedData,
    clearFilters: handleClearFilters,
    isAnyFilterActive,
    filters,
    setFilters,
    getCascadingData
  } = useExcelFilter({
    data: displayData,
    searchFields: ['colA', 'colB']
  });

  const calcTotals = (data: any[]) => {
    return data.reduce((acc, curr) => {
      const getNum = (val: any) => {
        if (!val || val === "-" || val === "") return new Decimal(0);
        if (typeof val === 'object' && typeof val.toNumber === 'function') {
          return new Decimal(val.toNumber());
        }
        
        // Try parsing the raw value directly first (e.g. "1000.0000" from API)
        const numStr = String(val).trim();
        if (/^-?\d*\.?\d+$/.test(numStr)) {
          return new Decimal(numStr);
        }

        let cleaned = numStr.replace(/[A-Z]{3}\s?/g, "");
        cleaned = cleaned.replace(/\./g, ""); // Remove thousands separator
        cleaned = cleaned.replace(/,/g, "."); // Convert decimal separator
        cleaned = cleaned.replace(/[^0-9.-]+/g, "");
        return cleaned ? new Decimal(cleaned) : new Decimal(0);
      };
      return {
        colC: acc.colC.plus(getNum(curr.rawColC ?? curr.colC)),
        colD: acc.colD.plus(getNum(curr.rawColD ?? curr.colD)),
        colE: acc.colE.plus(getNum(curr.rawColE ?? curr.colE)),
        colF: acc.colF.plus(getNum(curr.rawColF ?? curr.colF)),
        colG: acc.colG.plus(getNum(curr.rawColG ?? curr.colG)),
        colH: acc.colH.plus(getNum(curr.rawColH ?? curr.colH)),
        colI: acc.colI.plus(getNum(curr.rawColI ?? curr.colI)),
        colJ: acc.colJ.plus(getNum(curr.rawColJ ?? curr.colJ)),
        colK: acc.colK.plus(getNum(curr.rawColK ?? curr.colK)),
        colL: acc.colL.plus(getNum(curr.rawColL ?? curr.colL)),
        colM: acc.colM.plus(getNum(curr.rawColM ?? curr.colM)),
        colN: acc.colN.plus(getNum(curr.rawColN ?? curr.colN)),
        colO: acc.colO.plus(getNum(curr.rawColO ?? curr.colO)),
        colP: acc.colP.plus(getNum(curr.rawColP ?? curr.colP)),
      };
    }, { 
      colC: new Decimal(0), colD: new Decimal(0), colE: new Decimal(0), colF: new Decimal(0),
      colG: new Decimal(0), colH: new Decimal(0), colI: new Decimal(0), colJ: new Decimal(0),
      colK: new Decimal(0), colL: new Decimal(0), colM: new Decimal(0), colN: new Decimal(0),
      colO: new Decimal(0), colP: new Decimal(0),
    });
  };

  const grandTotals = useMemo(() => calcTotals(filteredAndSortedData), [filteredAndSortedData]);

  const handleEdit = (id: number) => {
    setSelectedRecordId(id);
    setIsEditModalOpen(true);
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await deleteInterAccount.mutateAsync(recordToDelete);
      toast.success("Inter Account record deleted successfully.");
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete record.");
    } finally {
      setIsDeleting(false);
      setRecordToDelete(null);
    }
  };


  const cols: { k: string; l: string; num?: boolean; isDate?: boolean }[] = [
    { k: 'colB', l: 'Col B' },
    { k: 'colC', l: 'BCA Sahardjo', num: true },
    { k: 'colD', l: 'BCA Juanda', num: true },
    { k: 'colE', l: 'Mandiri Mid Plaza', num: true },
    { k: 'colF', l: 'BRI Sahardjo', num: true },
    { k: 'colG', l: 'BTN', num: true },
    { k: 'colH', l: 'BJB', num: true },
    { k: 'colI', l: 'Bank Raya', num: true },
    { k: 'colJ', l: 'BRI Tebet', num: true },
    { k: 'colK', l: 'Manidiri Plaza Mandiri', num: true },
    { k: 'colL', l: 'BNI', num: true },
    { k: 'colM', l: 'Cash IDR', num: true },
    { k: 'colN', l: 'Non Cash Bank', num: true },
    { k: 'colO', l: 'PPn In and Out', num: true },
  ];

  return (
    <div className="space-y-6 mt-6">
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search entries..." 
            className="pl-12 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 text-[13px] font-medium"
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
          />
        </div>
        
        <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); }}>
          <SelectTrigger className="w-[130px] h-12 px-5 bg-white border-0 rounded-xl shadow-sm flex items-center gap-2 text-muted-foreground font-bold transition-all cursor-pointer">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-primary/10 shadow-premium bg-white p-0 overflow-hidden">
            <SelectItem value="all" className="text-[11px] font-bold uppercase py-3 px-5 focus:bg-slate-100 focus:text-primary rounded-none cursor-pointer border-b border-slate-100/50 last:border-0 text-muted-foreground transition-colors">
              All Years
            </SelectItem>
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
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-premium border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[1600px]">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap">
                {cols.map((c) => (
                  <TableHead key={c.k} className={`h-11 font-bold whitespace-nowrap px-4 ${c.num ? 'text-right' : ''}`}>
                    <div className={`flex items-center gap-1 ${c.num ? 'justify-end' : ''}`}>
                      {c.l}
                      <ExcelColumnFilter 
                        columnKey={c.k} 
                        label={c.l} 
                        data={getCascadingData(c.k)} 
                        activeFilters={filters[c.k]} 
                        onFilterChange={(v) => { setFilters(p => ({...p, [c.k]: v})); }} 
                        type={c.isDate ? "date" : "text"}
                        dateKey={c.isDate ? "rawColA" : undefined}
                      />
                    </div>
                  </TableHead>
                ))}
                <TableHead className="px-4 text-center w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={cols.length} className="h-96 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40">Fetching Data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={cols.length} className="h-64 text-center opacity-20">
                    <p className="font-black uppercase tracking-widest">No records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {filteredAndSortedData.map((row: any) => (
                    <TableRow key={row.id} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap group">
                      {cols.map((c) => (
                        <TableCell key={c.k} className={`px-4 ${c.num ? 'text-right font-bold text-primary/80' : 'text-primary/60'}`}>
                          {row[c.k]}
                        </TableCell>
                      ))}
                      <TableCell className="px-4 text-center">
                        <div className="flex items-center justify-center gap-1 transition-opacity">
                          {can('inter-account.update') && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary/40 hover:text-primary hover:bg-primary/5 rounded-sm" onClick={(e) => { e.stopPropagation(); handleEdit(row.id); }}>
                              <Edit2 size={12} strokeWidth={2.5} />
                            </Button>
                          )}
                          {can('inter-account.delete') && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500/40 hover:text-rose-600 hover:bg-rose-50 rounded-sm" onClick={(e) => { e.stopPropagation(); setRecordToDelete(row.id); }}>
                              <Trash2 size={12} strokeWidth={2.5} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Grand Total Row */}
                  <TableRow className="bg-secondary/10 border-t border-secondary/30 font-bold whitespace-nowrap">
                    <TableCell colSpan={1} className="px-4 text-[11px] text-secondary uppercase tracking-[0.2em]">
                      Grand Totals ({filteredAndSortedData.length} records)
                    </TableCell>
                    {cols.slice(1).map(c => (
                      <TableCell key={`grand-${c.k}`} className={`text-right ${getAmountColor((grandTotals as any)[c.k].toString())}`}>
                        {formatCurrency((grandTotals as any)[c.k].toString())}
                      </TableCell>
                    ))}
                    <TableCell className="bg-secondary/[0.02]" />
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <EditInterAccountModal 
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        recordId={selectedRecordId}
        onSuccess={() => refetch()}
      />
      <Dialog 
        open={recordToDelete !== null} 
        onOpenChange={(open) => {
          if (isDeleting) return;
          if (!open) setRecordToDelete(null);
        }}
      >
        <DialogContent className="rounded-3xl border-0 shadow-premium">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
              <AlertCircle className="text-rose-500" size={24} />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium leading-relaxed">
              Are you sure you want to delete this Inter Account record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-4">
            <Button variant="ghost" onClick={() => setRecordToDelete(null)} disabled={isDeleting} className="rounded-xl font-bold uppercase tracking-widest text-[11px]">Cancel</Button>
            <Button onClick={handleDelete} disabled={isDeleting} className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold uppercase tracking-widest text-[11px]">
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
