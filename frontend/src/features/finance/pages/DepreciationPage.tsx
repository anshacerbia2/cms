import { useState } from "react";
import { ArrowUpRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinance } from "../hooks/useFinance";
import { PaginationControls } from "@/components/common/PaginationControls";
import { formatCurrency } from "@/lib/utils";

export default function DepreciationPage() {
  const [assetsPage, setAssetsPage] = useState(1);
  const { getAssets } = useFinance();
  const { data: assetsResponse, isLoading: assetsLoading } = getAssets({ page: assetsPage, limit: 10 });

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-primary flex items-center gap-2 sm:gap-3">
              <ArrowUpRight className="text-secondary shrink-0 w-6 h-6 sm:w-8 sm:h-8" />
              Depreciation
            </h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">Manage and track your asset depreciation.</p>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] shadow-premium border border-primary/5 overflow-x-auto overflow-hidden">
        <Table className="min-w-[2000px]">
          <TableHeader className="bg-primary/5">
            <TableRow className="hover:bg-transparent border-primary/5 h-12 whitespace-nowrap">
              <TableHead colSpan={3} className="pl-8 text-[11px] font-black uppercase tracking-tight text-primary border-r border-primary/10">ASSET INFO</TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary text-right w-32 border-r border-primary/10">HARGA BELI</TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary text-center w-16 border-r border-primary/10">BULAN</TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary text-right w-32 border-r border-primary/10 bg-primary/5">S/D 2020</TableHead>
              <TableHead colSpan={12} className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-secondary bg-secondary/5 border-r border-primary/10 border-b border-primary/10">DEPRECIATION 2021</TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary text-right w-32 border-r border-primary/10 bg-primary/5">2 0 2 1</TableHead>
              <TableHead rowSpan={2} className="text-[11px] font-black uppercase tracking-tight text-primary text-right w-32 border-r border-primary/10 bg-primary/5">S/D 2021</TableHead>
              <TableHead rowSpan={2} className="pr-8 text-[11px] font-black uppercase tracking-tight text-secondary text-right w-40 bg-secondary/5">NILAI BUKU</TableHead>
            </TableRow>
            <TableRow className="hover:bg-transparent border-primary/5 h-10 bg-primary/5">
              <TableHead className="pl-8 text-[11px] font-bold text-primary">PURCHASE DATE</TableHead>
              <TableHead className="text-[11px] font-bold text-primary">BANK REF</TableHead>
              <TableHead className="text-[11px] font-bold text-primary border-r border-primary/10">ASSET NAME</TableHead>
              {["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].map((m, i) => (
                <TableHead key={m} className={`text-[11px] font-bold text-secondary text-right ${i === 11 ? 'border-r border-primary/10' : ''}`}>{m}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {assetsLoading ? (
              <TableRow>
                <TableCell colSpan={21} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Processing Asset Depreciation Data...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : ((assetsResponse as any)?.data || []).map((row: any) => (
              <TableRow key={row.id} className="border-primary/5 hover:bg-primary/5 transition-colors whitespace-nowrap">
                <TableCell className="pl-8 py-4 text-[12px] font-bold text-primary">{row.purchaseDate}</TableCell>
                <TableCell className="py-4 text-[12px] font-bold text-primary uppercase">{row.bankRef}</TableCell>
                <TableCell className="py-4 text-[12px] font-black text-primary uppercase border-r border-primary/5">{row.assetName}</TableCell>
                <TableCell className="py-4 text-right text-[12px] font-bold text-primary border-r border-primary/5">{formatCurrency(row.purchasePrice)}</TableCell>
                <TableCell className="py-4 text-center text-[12px] font-bold text-primary/60 border-r border-primary/5">{row.usefulLife}</TableCell>
                <TableCell className="py-4 text-right text-[12px] font-bold text-primary bg-primary/5 border-r border-primary/5">{formatCurrency(row.accumulated2020)}</TableCell>
                <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.jan)}</TableCell>
                <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.feb)}</TableCell>
                <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.mar)}</TableCell>
                <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.apr)}</TableCell>
                <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.may)}</TableCell>
                <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.jun)}</TableCell>
                <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.jul)}</TableCell>
                <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.aug)}</TableCell>
                <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.sep)}</TableCell>
                <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.oct)}</TableCell>
                <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic">{formatCurrency(row.nov)}</TableCell>
                <TableCell className="py-3 text-right text-[12px] font-bold text-primary italic border-r border-primary/5">{formatCurrency(row.dec)}</TableCell>
                <TableCell className="py-4 text-right text-[12px] bg-primary/5 border-r border-primary/5 font-black text-primary">{formatCurrency(row.total2021)}</TableCell>
                <TableCell className="py-4 text-right text-[12px] bg-primary/5 border-r border-primary/5 font-black text-primary">{formatCurrency(row.accumulated2021)}</TableCell>
                <TableCell className="pr-8 py-4 text-right text-[12px] font-black text-secondary bg-secondary/5">{formatCurrency(row.bookValue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <PaginationControls meta={(assetsResponse as any)?.meta} onPageChange={setAssetsPage} isFetching={assetsLoading} />
    </div>
  );
}
