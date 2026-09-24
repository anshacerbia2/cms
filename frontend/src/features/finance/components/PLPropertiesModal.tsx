import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, ShieldCheck, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEquity } from '../hooks/useEquity';
import { parseAmountInput, singlePastedAmount } from "@/lib/utils";


interface PLPropertiesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
}

export default function PLPropertiesModal({ open, onOpenChange, year }: PLPropertiesModalProps) {
  const { properties, isLoading, updateProperties, isUpdating } = useEquity(year);
  const [form, setForm] = useState<Record<string, string>>({
    PL_NET_SALES: '0',
    PL_COGS: '0',
    PL_PERSONNEL_EXP: '0',
    PL_OFFICE_EXP: '0',
    PL_MARKETING_EXP: '0',
    PL_FINANCIAL_EXP: '0',
    PL_OTHER_INCOME: '0',
    PL_DEPRECIATION: '0',
    PL_INCOME_TAX: '0',
  });

  // --- Formatting Logic (Matches Bank Statement) ---
  const formatInput = (val: string | number) => {
    if (val === undefined || val === null || val === '') return '';
    let str = val.toString();
    const isNegative = str.startsWith('-');
    if (isNegative) str = str.slice(1);

    const [int, dec] = str.split('.');
    const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const result = dec !== undefined ? `${formattedInt},${dec}` : formattedInt;
    return isNegative ? `-${result}` : result;
  };

  const parseDisplay = (val: string) => parseAmountInput(val);

  useEffect(() => {
    if (properties && open) {
      const newForm = { ...form };
      Object.keys(form).forEach(key => {
        if (properties[key]) {
          newForm[key] = properties[key];
        } else {
          newForm[key] = '0';
        }
      });
      setForm(newForm);
    }
  }, [properties, open]);

  const handleSave = async () => {
    try {
      await updateProperties(form);
      toast.success("Profit & Loss properties updated successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update P&L properties");
    }
  };

  const handleInputPaste = (key: string, e: React.ClipboardEvent<HTMLInputElement>) => {
    const v = singlePastedAmount(e);
    if (v !== null) setForm(prev => ({ ...prev, [key]: v }));
  };

  const handleInputChange = (key: string, value: string) => {
    const parsed = parseDisplay(value);
    setForm(prev => ({ ...prev, [key]: parsed }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[2rem] border-primary/10 shadow-premium p-0 overflow-hidden">
        <DialogHeader className="p-8 bg-primary/[0.02] border-b border-primary/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <ShieldCheck size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight text-primary">Profit & Loss Settings</DialogTitle>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Fiscal Year {year} Overrides</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="animate-spin text-primary/20" size={32} />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">Fetching Configuration...</p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex gap-3 mb-8">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium text-blue-700 leading-relaxed">
                  These values will override the dynamic calculations in the Profit & Loss Statement. 
                  Leave as 0 to use automated calculations from ledger data.
                  <strong> Note: Enter all values as positive numbers; they will be subtracted automatically where appropriate (e.g., COGS, Expenses).</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {/* Revenue & COGS */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Revenue & COGS</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-1">Net Sales</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/20">IDR</span>
                      <Input 
                        placeholder="0"
                        value={formatInput(form.PL_NET_SALES)}
                        onChange={(e) => handleInputChange('PL_NET_SALES', e.target.value)}
                        onPaste={(e) => handleInputPaste('PL_NET_SALES', e)}
                        className="h-12 pl-12 bg-slate-50 border-0 focus-visible:ring-primary/10 font-bold text-primary rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-1">Cost of Goods Sold (COGS)</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/20">IDR</span>
                      <Input 
                        placeholder="0"
                        value={formatInput(form.PL_COGS)}
                        onChange={(e) => handleInputChange('PL_COGS', e.target.value)}
                        onPaste={(e) => handleInputPaste('PL_COGS', e)}
                        className="h-12 pl-12 bg-slate-50 border-0 focus-visible:ring-primary/10 font-bold text-rose-600 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Operating Expenses */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Operating Expenses</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-1">Personnel Expense</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/20">IDR</span>
                      <Input 
                        placeholder="0"
                        value={formatInput(form.PL_PERSONNEL_EXP)}
                        onChange={(e) => handleInputChange('PL_PERSONNEL_EXP', e.target.value)}
                        onPaste={(e) => handleInputPaste('PL_PERSONNEL_EXP', e)}
                        className="h-12 pl-12 bg-slate-50 border-0 focus-visible:ring-primary/10 font-bold text-rose-600 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-1">Office Expense</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/20">IDR</span>
                      <Input 
                        placeholder="0"
                        value={formatInput(form.PL_OFFICE_EXP)}
                        onChange={(e) => handleInputChange('PL_OFFICE_EXP', e.target.value)}
                        onPaste={(e) => handleInputPaste('PL_OFFICE_EXP', e)}
                        className="h-12 pl-12 bg-slate-50 border-0 focus-visible:ring-primary/10 font-bold text-rose-600 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-1">Marketing Expense</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/20">IDR</span>
                      <Input 
                        placeholder="0"
                        value={formatInput(form.PL_MARKETING_EXP)}
                        onChange={(e) => handleInputChange('PL_MARKETING_EXP', e.target.value)}
                        onPaste={(e) => handleInputPaste('PL_MARKETING_EXP', e)}
                        className="h-12 pl-12 bg-slate-50 border-0 focus-visible:ring-primary/10 font-bold text-rose-600 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-1">Financial Expense</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/20">IDR</span>
                      <Input 
                        placeholder="0"
                        value={formatInput(form.PL_FINANCIAL_EXP)}
                        onChange={(e) => handleInputChange('PL_FINANCIAL_EXP', e.target.value)}
                        onPaste={(e) => handleInputPaste('PL_FINANCIAL_EXP', e)}
                        className="h-12 pl-12 bg-slate-50 border-0 focus-visible:ring-primary/10 font-bold text-rose-600 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Other & Tax */}
                <div className="space-y-6 md:col-span-2 border-t border-primary/5 pt-6 mt-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Other Items & Tax</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-1">Other Income (Net)</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/20">IDR</span>
                        <Input 
                          placeholder="0"
                          value={formatInput(form.PL_OTHER_INCOME)}
                          onChange={(e) => handleInputChange('PL_OTHER_INCOME', e.target.value)}
                        onPaste={(e) => handleInputPaste('PL_OTHER_INCOME', e)}
                          className="h-12 pl-12 bg-slate-50 border-0 focus-visible:ring-primary/10 font-bold text-emerald-600 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-1">Depreciation</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/20">IDR</span>
                        <Input 
                          placeholder="0"
                          value={formatInput(form.PL_DEPRECIATION)}
                          onChange={(e) => handleInputChange('PL_DEPRECIATION', e.target.value)}
                        onPaste={(e) => handleInputPaste('PL_DEPRECIATION', e)}
                          className="h-12 pl-12 bg-slate-50 border-0 focus-visible:ring-primary/10 font-bold text-rose-600 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-1">Income Tax</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/20">IDR</span>
                        <Input 
                          placeholder="0"
                          value={formatInput(form.PL_INCOME_TAX)}
                          onChange={(e) => handleInputChange('PL_INCOME_TAX', e.target.value)}
                        onPaste={(e) => handleInputPaste('PL_INCOME_TAX', e)}
                          className="h-12 pl-12 bg-slate-50 border-0 focus-visible:ring-primary/10 font-bold text-rose-600 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-3 pt-4 border-t border-primary/5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-1">FINAL NET PROFIT (OVERRIDE EVERYTHING)</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/20">IDR</span>
                        <Input 
                          placeholder="0"
                          value={formatInput(form.PL_NET_PROFIT)}
                          onChange={(e) => handleInputChange('PL_NET_PROFIT', e.target.value)}
                        onPaste={(e) => handleInputPaste('PL_NET_PROFIT', e)}
                          className="h-12 pl-12 bg-primary/5 border-2 border-primary/10 focus-visible:ring-primary/20 font-black text-primary rounded-xl"
                        />
                      </div>
                      <p className="text-[9px] font-bold text-primary/40 uppercase tracking-tight mt-1 flex items-center gap-1">
                        <Info size={10} />
                        If this field is filled, it will ignore all other overrides above and transactions to set the final profit.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="p-8 border-t border-primary/5 flex gap-3">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="flex-1 h-12 rounded-xl font-bold uppercase text-[11px] tracking-widest"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isUpdating || isLoading}
            className="flex-1 h-12 bg-primary hover:bg-primary/90 text-white rounded-xl font-black uppercase text-[11px] tracking-widest gap-2 shadow-premium"
          >
            {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save P&L Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
