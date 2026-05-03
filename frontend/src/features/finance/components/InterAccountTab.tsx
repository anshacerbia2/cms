import { useMemo } from "react";
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

export function InterAccountTab() {
  const { getAllInterAccountTransfers } = useFinance();
  const { data: allDataRaw, isLoading } = getAllInterAccountTransfers();
  const allData = useMemo(() => allDataRaw || [], [allDataRaw]);

  const { filteredAndSortedData } = useExcelFilter({ 
    data: allData,
    searchFields: ["description"]
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-premium border border-primary/5 overflow-x-auto">
        <Table className="min-w-[1200px]">
          <TableHeader className="bg-primary/5">
            <TableRow className="hover:bg-transparent border-primary/5 h-12 whitespace-nowrap">
              <TableHead className="pl-8 text-[11px] font-black uppercase w-32">Date</TableHead>
              <TableHead className="text-[11px] font-black uppercase">Description</TableHead>
              <TableHead className="text-right text-[11px] font-black uppercase w-28">BCA</TableHead>
              <TableHead className="text-right text-[11px] font-black uppercase w-28">Mandiri</TableHead>
              <TableHead className="text-right text-[11px] font-black uppercase w-28">BRI</TableHead>
              <TableHead className="text-right text-[11px] font-black uppercase w-28">BTN</TableHead>
              <TableHead className="text-right text-[11px] font-black uppercase w-28 border-r border-primary/10">Cash IDR</TableHead>
              <TableHead className="pr-8 text-right text-[11px] font-black uppercase w-32 bg-primary/10">Checker</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="h-64 text-center text-[10px] font-black uppercase tracking-widest animate-pulse">Tracing Transfers...</TableCell></TableRow>
            ) : filteredAndSortedData.map((row) => (
              <TableRow key={row.id} className="border-primary/5 hover:bg-primary/5 transition-colors whitespace-nowrap">
                <TableCell className="pl-8 py-3 text-[12px] font-bold text-primary">{row.date}</TableCell>
                <TableCell className="py-3 text-[12px] font-bold text-primary/80 uppercase truncate max-w-xs">{row.description}</TableCell>
                <TableCell className="py-3 text-right text-[12px] font-bold text-primary">{formatCurrency(row.bca)}</TableCell>
                <TableCell className="py-3 text-right text-[12px] font-bold text-primary">{formatCurrency(row.mandiri)}</TableCell>
                <TableCell className="py-3 text-right text-[12px] font-bold text-primary">{formatCurrency(row.bri)}</TableCell>
                <TableCell className="py-3 text-right text-[12px] font-bold text-primary">{formatCurrency(row.btn)}</TableCell>
                <TableCell className="py-3 text-right text-[12px] font-bold text-primary border-r border-primary/5">{formatCurrency(row.cashIdr)}</TableCell>
                <TableCell className="pr-8 py-3 text-right text-[12px] font-black text-primary bg-primary/5">{formatCurrency(row.checker)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
