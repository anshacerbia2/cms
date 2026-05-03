import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save, Loader2, FileSpreadsheet, Calculator, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { financeService } from '../services/finance.service';

interface ImportFinanceReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ImportFinanceReportModal({ open, onOpenChange, onSuccess }: ImportFinanceReportModalProps) {
  const [revenueRows, setRevenueRows] = useState<any[]>([]);
  const [expenseRows, setExpenseRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("revenue");

  const addRow = () => {
    if (activeTab === "revenue") {
      setRevenueRows([...revenueRows, { colA: '', colB: '', colC: '', colD: 0, colE: 0, colF: 0 }]);
    } else {
      setExpenseRows([...expenseRows, { colA: '', colB: '', colC: '', colD: 0, colE: 0, colF: 0 }]);
    }
  };

  const removeRow = (index: number) => {
    if (activeTab === "revenue") {
      setRevenueRows(revenueRows.filter((_, i) => i !== index));
    } else {
      setExpenseRows(expenseRows.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (revenueRows.length > 0) {
        await financeService.bulkRevenue(revenueRows);
      }
      if (expenseRows.length > 0) {
        await financeService.bulkExpenses(expenseRows);
      }
      toast.success('Financial data synchronized successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save financial data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse"></div>
          <DialogHeader>
            <DialogTitle className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
              <FileSpreadsheet size={32} className="text-secondary" />
              Sync Financial Data
            </DialogTitle>
            <p className="text-white/60 text-[11px] font-bold uppercase tracking-[0.2em] mt-1">Bulk synchronization with Excel financial reports.</p>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-primary/5 p-1 rounded-full w-fit">
              <TabsTrigger value="revenue" className="rounded-full px-8 py-2 data-[state=active]:bg-primary data-[state=active]:text-white font-black text-[10px] uppercase tracking-widest gap-2">
                <TrendingUp size={14} /> Revenue
              </TabsTrigger>
              <TabsTrigger value="expense" className="rounded-full px-8 py-2 data-[state=active]:bg-primary data-[state=active]:text-white font-black text-[10px] uppercase tracking-widest gap-2">
                <Calculator size={14} /> Expenses
              </TabsTrigger>
            </TabsList>

            <TabsContent value="revenue" className="animate-in slide-in-from-left-4 duration-300">
              <div className="bg-white rounded-[2.5rem] border border-primary/5 shadow-premium overflow-hidden">
                <Table>
                  <TableHeader className="bg-primary/5">
                    <TableRow className="hover:bg-transparent border-primary/5">
                      <TableHead className="pl-8 text-[10px] font-black uppercase w-16">No</TableHead>
                      <TableHead className="text-[10px] font-black uppercase w-48">Invoice No</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Customer Name</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase w-32">Gross</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase w-32">VAT</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase w-40">Net Sales</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenueRows.map((row, i) => (
                      <TableRow key={i} className="border-primary/5">
                        <TableCell className="pl-8 py-2">
                          <input 
                            className="w-full bg-transparent border-none text-[12px] font-black focus:ring-0 uppercase"
                            value={row.colA}
                            onChange={(e) => {
                              const newRows = [...revenueRows];
                              newRows[i].colA = e.target.value;
                              setRevenueRows(newRows);
                            }}
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <input 
                            className="w-full bg-transparent border-none text-[12px] font-black focus:ring-0 uppercase"
                            value={row.colB}
                            onChange={(e) => {
                              const newRows = [...revenueRows];
                              newRows[i].colB = e.target.value;
                              setRevenueRows(newRows);
                            }}
                          />
                        </TableCell>
                        <TableCell className="py-2">
                           <input 
                            className="w-full bg-transparent border-none text-[12px] font-bold focus:ring-0 uppercase"
                            value={row.colC}
                            onChange={(e) => {
                              const newRows = [...revenueRows];
                              newRows[i].colC = e.target.value;
                              setRevenueRows(newRows);
                            }}
                          />
                        </TableCell>
                        <TableCell className="py-2 text-right">
                           <input 
                            type="number"
                            className="w-full bg-transparent border-none text-[12px] font-black text-right focus:ring-0"
                            value={row.colD}
                            onChange={(e) => {
                              const newRows = [...revenueRows];
                              newRows[i].colD = Number(e.target.value);
                              setRevenueRows(newRows);
                            }}
                          />
                        </TableCell>
                        <TableCell className="py-2 text-right">
                           <input 
                            type="number"
                            className="w-full bg-transparent border-none text-[12px] font-black text-right focus:ring-0"
                            value={row.colE}
                            onChange={(e) => {
                              const newRows = [...revenueRows];
                              newRows[i].colE = Number(e.target.value);
                              setRevenueRows(newRows);
                            }}
                          />
                        </TableCell>
                        <TableCell className="py-2 text-right">
                           <input 
                            type="number"
                            className="w-full bg-transparent border-none text-[12px] font-black text-right focus:ring-0"
                            value={row.colF}
                            onChange={(e) => {
                              const newRows = [...revenueRows];
                              newRows[i].colF = Number(e.target.value);
                              setRevenueRows(newRows);
                            }}
                          />
                        </TableCell>
                        <TableCell className="pr-4 py-2">
                          <Button variant="ghost" size="icon" onClick={() => removeRow(i)} className="text-red-500 hover:bg-red-50">
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {revenueRows.length === 0 && (
                       <TableRow><TableCell colSpan={7} className="h-32 text-center text-[10px] font-black uppercase text-primary/30 tracking-widest">No revenue data added</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="expense" className="animate-in slide-in-from-right-4 duration-300">
              <div className="bg-white rounded-[2.5rem] border border-primary/5 shadow-premium overflow-hidden">
                <Table>
                  <TableHeader className="bg-primary/5">
                    <TableRow className="hover:bg-transparent border-primary/5">
                      <TableHead className="pl-8 text-[10px] font-black uppercase w-40">Bank Source</TableHead>
                      <TableHead className="text-[10px] font-black uppercase w-32">Date</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Description</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase w-40">Amount</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseRows.map((row, i) => (
                      <TableRow key={i} className="border-primary/5">
                        <TableCell className="pl-8 py-2">
                          <input 
                            className="w-full bg-transparent border-none text-[12px] font-black focus:ring-0 uppercase"
                            value={row.colA}
                            onChange={(e) => {
                              const newRows = [...expenseRows];
                              newRows[i].colA = e.target.value;
                              setExpenseRows(newRows);
                            }}
                          />
                        </TableCell>
                        <TableCell className="py-2">
                           <input 
                            className="w-full bg-transparent border-none text-[12px] font-bold focus:ring-0"
                            value={row.colB}
                            onChange={(e) => {
                              const newRows = [...expenseRows];
                              newRows[i].colB = e.target.value;
                              setExpenseRows(newRows);
                            }}
                          />
                        </TableCell>
                        <TableCell className="py-2">
                           <input 
                            className="w-full bg-transparent border-none text-[12px] font-bold focus:ring-0 uppercase"
                            value={row.colC}
                            onChange={(e) => {
                              const newRows = [...expenseRows];
                              newRows[i].colC = e.target.value;
                              setExpenseRows(newRows);
                            }}
                          />
                        </TableCell>
                        <TableCell className="py-2 text-right">
                           <input 
                            type="number"
                            className="w-full bg-transparent border-none text-[12px] font-black text-right focus:ring-0 text-orange-600"
                            value={row.colD}
                            onChange={(e) => {
                              const newRows = [...expenseRows];
                              newRows[i].colD = Number(e.target.value);
                              setExpenseRows(newRows);
                            }}
                          />
                        </TableCell>
                        <TableCell className="pr-4 py-2">
                          <Button variant="ghost" size="icon" onClick={() => removeRow(i)} className="text-red-500 hover:bg-red-50">
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {expenseRows.length === 0 && (
                       <TableRow><TableCell colSpan={5} className="h-32 text-center text-[10px] font-black uppercase text-primary/30 tracking-widest">No expense data added</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          <Button 
            variant="outline" 
            onClick={addRow} 
            className="w-full rounded-[1.5rem] border-dashed border-2 border-primary/20 hover:border-primary/40 text-[10px] font-black uppercase tracking-widest h-12"
          >
            <Plus size={16} className="mr-2" /> Add New {activeTab} Row
          </Button>
        </div>

        <DialogFooter className="bg-primary/5 p-6 border-t border-primary/5">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full text-[10px] font-black uppercase tracking-widest">Cancel</Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || (revenueRows.length === 0 && expenseRows.length === 0)}
            className="rounded-full bg-primary text-white hover:bg-primary/90 px-8 h-12 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
            Sync Records
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
