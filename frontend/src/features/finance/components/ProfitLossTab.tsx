import { useMemo, useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { formatCurrency, getAmountColor } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, PieChart, Info, Loader2, History, Plus } from "lucide-react";
import { useFinance } from "../hooks/useFinance";

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

export function ProfitLossTab() {
  const [year, setYear] = useState("all");
  const { getPLStatement } = useFinance();
  
  const { data: plData, isLoading } = getPLStatement(year === "all" ? undefined : year);
  
  const summaryCards = useMemo(() => {
    if (!plData?.summaryCards) return [];
    
    const iconMap: Record<string, any> = {
      "NET SALES": DollarSign,
      "GROSS PROFIT": TrendingUp,
      "OPERATING PROFIT": PieChart,
      "PROFIT AFTER TAX": TrendingUp,
    };

    return plData.summaryCards.map((card: any) => {
      let subValue = "";
      if (card.title === "NET SALES") {
        subValue = `${formatCurrency(card.grossValue)} gross`;
      } else if (card.title === "GROSS PROFIT") {
        subValue = `${card.margin}% margin`;
      } else if (card.title === "OPERATING PROFIT") {
        subValue = `${formatCurrency(card.opexValue)} opex`;
      } else if (card.title === "PROFIT AFTER TAX") {
        subValue = `${card.netMargin}% net margin`;
      }

      return {
        ...card,
        value: formatCurrency(card.value),
        subValue,
        icon: iconMap[card.title] || Info,
      };
    });
  }, [plData]);

  const [selectedLedger, setSelectedLedger] = useState<string | null>(null);
  const { getPLDetails } = useFinance();
  const { data: details, isLoading: isLoadingDetails } = getPLDetails(year === "all" ? undefined : year, selectedLedger || undefined, {
    enabled: !!selectedLedger
  });

  const expenseLedgers = ["Personnel Expense", "Office Expense", "Marketing Expense", "Financial Expense", "OTHER INCOME"];

  const tableData = plData?.tableData || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      {/* Details Modal */}
      <Dialog open={!!selectedLedger} onOpenChange={(open) => !open && setSelectedLedger(null)}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] bg-slate-50 border border-slate-200 shadow-2xl rounded-3xl overflow-hidden p-0 gap-0 flex flex-col">
          <div className="py-5 px-8 border-b border-primary/5 bg-white sticky top-0 z-20 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 border border-blue-500/20 shadow-premium shrink-0">
                  <History size={24} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black text-primary uppercase tracking-tight leading-none mb-1.5">
                    {selectedLedger} Breakdown
                  </DialogTitle>
                  <DialogDescription className="text-[10px] font-bold text-primary/30 uppercase tracking-[0.2em]">
                    Bank Mutation Records • Financial Audit Trail
                  </DialogDescription>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLedger(null)}
                className="w-10 h-10 rounded-xl bg-transparent hover:bg-red-50 flex items-center justify-center text-primary/40 hover:text-red-600 transition-all cursor-pointer group"
              >
                <Plus className="w-5 h-5 rotate-45 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>

          <div className="p-0 flex-1 overflow-auto custom-scrollbar">
            {isLoadingDetails ? (
              <div className="h-64 flex flex-col items-center justify-center gap-4 opacity-40">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Retrieving Records...</p>
              </div>
            ) : !details || details.length === 0 ? (
              <div className="h-64 flex items-center justify-center opacity-20 font-black uppercase tracking-[0.2em]">
                No Records Found
              </div>
            ) : (
              <table className="w-full min-w-full border-collapse">
                <thead className="sticky top-0 z-30 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                  <tr className="border-b border-primary/5">
                    <th className="pl-8 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-primary/40 bg-white">Channel</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-primary/40 bg-white">Date</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-primary/40 bg-white min-w-[200px]">Description</th>
                    <th className="pr-8 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-primary/40 bg-white">Debit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {details.map((item: any) => (
                    <tr key={item.id} className="bg-white hover:bg-primary/[0.01] transition-colors group">
                      <td className="pl-8 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          {item.accountType === "CASH" ? (
                             <p className="text-[11px] font-bold text-primary/70 uppercase tracking-wider">CASH</p>
                          ) : item.accountType === "BANK" ? (
                            <>
                              <p className="text-[11px] font-bold text-primary/70 uppercase">
                                {item.bankBrand || item.bankName} - {item.branch}
                              </p>
                              <p className="text-[9px] font-medium text-primary/30">{item.accountNo}</p>
                            </>
                          ) : (
                            <p className="text-[11px] font-bold text-primary/70 uppercase">{item.holderName}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-bold text-primary/60 whitespace-nowrap">{formatDate(item.date)}</td>
                      <td className="px-4 py-3 whitespace-normal min-w-[200px]">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[12px] font-bold text-primary uppercase leading-tight group-hover:text-primary transition-colors">{item.description}</p>
                          <p className="text-[9px] font-black text-primary/20 uppercase tracking-widest">{item.ledger}</p>
                        </div>
                      </td>
                      <td className="pr-8 py-3 text-right whitespace-nowrap">
                        <span className="text-[12px] font-black text-primary tabular-nums">
                          {formatCurrency(item.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-white/20 backdrop-blur-[2px] flex items-center justify-center rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">Aggregating Financial Data...</p>
          </div>
        </div>
      )}

      {/* Premium Navigation Bar */}
      <div className="flex items-center justify-between bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="flex items-center gap-3 pl-2">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary/60 border border-primary/5 shadow-inner shrink-0">
            <PieChart size={20} />
          </div>
          <div className="flex flex-col justify-center">
            <h3 className="text-[13px] font-bold text-primary leading-none capitalize">
              Profit & Loss Statement — {year === "all" ? "All Time" : year}
            </h3>
            <p className="text-[11px] text-primary/40 uppercase tracking-widest mt-1.5">Comprehensive Financial Summary</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end mr-2">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-12 w-32 bg-white border-0 shadow-sm rounded-xl text-[11px] font-bold uppercase tracking-widest focus:ring-0 focus:ring-offset-0 transition-all">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-primary/5 shadow-2xl">
                <SelectItem value="all" className="text-[11px] font-bold uppercase tracking-widest py-3 cursor-pointer">All Time</SelectItem>
                <SelectItem value="2024" className="text-[11px] font-bold uppercase tracking-widest py-3 cursor-pointer">2024</SelectItem>
                <SelectItem value="2025" className="text-[11px] font-bold uppercase tracking-widest py-3 cursor-pointer">2025</SelectItem>
                <SelectItem value="2026" className="text-[11px] font-bold uppercase tracking-widest py-3 cursor-pointer">2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card: any, i: number) => (
          <Card key={i} className="bg-white/70 backdrop-blur-md border-primary/5 shadow-premium overflow-hidden group transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-black text-primary/40 tracking-widest uppercase">{card.title}</p>
                <card.icon className={`w-4 h-4 ${card.color} transition-opacity`} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-primary tracking-tight">
                  {card.value}
                </h3>
                <p className="text-[10px] font-bold text-primary/40 uppercase tracking-wider">
                  {card.subValue}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-premium border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap h-12">
                <TableHead className="pl-8 text-[11px] font-black uppercase tracking-widest">Account</TableHead>
                <TableHead className="text-right text-[11px] font-black uppercase tracking-widest">Gross</TableHead>
                <TableHead className="text-right text-[11px] font-black uppercase tracking-widest">VAT / Adj.</TableHead>
                <TableHead className="pr-8 text-right text-[11px] font-black uppercase tracking-widest w-64">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row: any, idx:number) => {
                if (row.isHeader) {
                  return (
                    <TableRow key={idx} className="bg-primary/5 hover:bg-primary/5 border-primary/5 transition-none whitespace-nowrap">
                      <TableCell colSpan={4} className="pl-8 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
                        {row.account}
                      </TableCell>
                    </TableRow>
                  );
                }

                const isProfitLine = row.isTotal;
                const isGrandTotal = row.account === "PROFIT AFTER TAX";
                const isExpense = expenseLedgers.includes(row.account);

                return (
                  <TableRow 
                    key={idx} 
                    className={`
                      ${isGrandTotal 
                        ? "bg-secondary/10 hover:bg-secondary/10 border-t border-secondary/30" 
                        : isProfitLine 
                          ? "bg-secondary/5 hover:bg-secondary/5 border-t-2 border-secondary/30" 
                          : "hover:bg-primary/[0.01] border-primary/5"}
                      ${isExpense ? "cursor-pointer group/row" : ""}
                      transition-all duration-200 border-b
                    `}
                    onClick={() => isExpense && setSelectedLedger(row.account)}
                  >
                    <TableCell className={`py-2 ${row.isSubItem ? "pl-16" : "pl-8"}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-[12px] uppercase tracking-wide ${
                          isProfitLine ? "font-bold text-secondary" : row.isSubItem ? "font-medium text-primary/60" : "font-bold text-primary/70"
                        }`}>
                          {row.account}
                        </span>
                        {isExpense && (
                          <div className="flex items-center justify-center opacity-40 group-hover/row:opacity-100 group-hover/row:text-blue-500 transition-all text-primary">
                            <Info size={12} />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-[12px] font-bold text-primary/40 py-2">
                      {row.gross ? formatCurrency(row.gross) : "-"}
                    </TableCell>
                    <TableCell className="text-right text-[12px] font-bold text-primary/40 py-2">
                      {row.vatAdj ? formatCurrency(row.vatAdj) : "-"}
                    </TableCell>
                    <TableCell className={`pr-8 text-right text-[12px] tracking-tight py-2 ${getAmountColor(row.total)} ${isProfitLine || isGrandTotal ? "font-black" : ""}`}>
                      {formatCurrency(row.total)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-start gap-2 px-8 mt-6">
        <Info size={14} className="text-primary/20 shrink-0 mt-0.5" />
        <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">
          Click on an expense row marked with the info icon to view the detailed bank mutation breakdown.
        </p>
      </div>
    </div>
  );
}
