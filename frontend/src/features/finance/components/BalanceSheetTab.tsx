import React, { useMemo } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { useFinance } from "../hooks/useFinance";
import { useExcelFilter } from "../hooks/useExcelFilter";

export function BalanceSheetTab() {
  const { getBalanceSheet } = useFinance();
  const { data: bsRaw, isLoading } = getBalanceSheet({ page: 1, limit: 500 });
  const allData = useMemo(() => bsRaw?.data || [], [bsRaw]);

  const { filteredAndSortedData } = useExcelFilter({ 
    data: allData,
    searchFields: ["description"]
  });

  // Group by category
  const groupedData = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredAndSortedData.forEach(item => {
      const cat = item.category || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredAndSortedData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-premium border border-primary/5 overflow-hidden">
        <Table>
          <TableHeader className="bg-primary/5">
            <TableRow className="hover:bg-transparent border-primary/5 h-12">
              <TableHead className="pl-8 text-[11px] font-black uppercase">Account Category & Name</TableHead>
              <TableHead className="text-right text-[11px] font-black uppercase w-48">Amount (IDR)</TableHead>
              <TableHead className="text-right text-[11px] font-black uppercase w-40">USD</TableHead>
              <TableHead className="pr-8 text-right text-[11px] font-black uppercase w-32">Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="h-64 text-center text-[10px] font-black uppercase tracking-widest animate-pulse">Calculating Balance Sheet...</TableCell></TableRow>
            ) : Object.entries(groupedData).map(([category, items]) => (
              <React.Fragment key={category}>
                <TableRow className="bg-primary/5 hover:bg-primary/5">
                  <TableCell colSpan={4} className="pl-8 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">{category}</TableCell>
                </TableRow>
                {items.map((item) => (
                  <TableRow key={item.id} className="border-primary/5 hover:bg-primary/5 transition-colors">
                    <TableCell className="pl-12 py-3 text-[12px] font-bold text-primary uppercase">{item.accountName}</TableCell>
                    <TableCell className="py-3 text-right text-[12px] font-black text-primary">{formatCurrency(item.idr)}</TableCell>
                    <TableCell className="py-3 text-right text-[12px] font-bold text-primary/60">{item.usd > 0 ? `$${item.usd}` : "-"}</TableCell>
                    <TableCell className="pr-8 py-3 text-right text-[12px] font-bold text-primary/40">{item.rate || "-"}</TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

