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
import { Save, ShieldCheck, Info, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useEquity } from '../hooks/useEquity';
import { parseAmountInput } from "@/lib/utils";


interface EquityPropertiesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
}

export default function EquityPropertiesModal({ open, onOpenChange, year }: EquityPropertiesModalProps) {
  const { properties, isLoading, updateProperties, isUpdating } = useEquity(year);
  const [form, setForm] = useState<Record<string, string>>({
    SHARED_CAPITAL: '',
    RE_PREV_YEARS: '',
    DIVIDENDS: '',
    PL_NET_PROFIT: '',
  });

  useEffect(() => {
    if (properties && Object.keys(properties).length > 0) {
      setForm({
        SHARED_CAPITAL: properties.SHARED_CAPITAL ?? '',
        RE_PREV_YEARS: properties.RE_PREV_YEARS ?? '',
        DIVIDENDS: properties.DIVIDENDS ?? '',
        PL_NET_PROFIT: properties.PL_NET_PROFIT ?? '',
      });
    } else {
       setForm({
        SHARED_CAPITAL: '',
        RE_PREV_YEARS: '',
        DIVIDENDS: '',
        PL_NET_PROFIT: '',
      });
    }
  }, [properties, open]);

  const handleSave = async () => {
    try {
      const payload: Record<string, string | null> = {};
      for (const [key, value] of Object.entries(form)) {
        payload[key] = value === '' ? null : value;
      }
      await updateProperties(payload);
      toast.success("Equity properties updated successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update equity properties");
    }
  };

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

  const handleInputChange = (key: string, value: string) => {
    const parsed = parseDisplay(value);
    setForm(prev => ({ ...prev, [key]: parsed }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[2rem] border-primary/10 shadow-premium p-0 overflow-hidden">
        <DialogHeader className="p-8 bg-primary/[0.02] border-b border-primary/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <ShieldCheck size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight text-primary">Equity Settings</DialogTitle>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Fiscal Year {year}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="animate-spin text-primary/20" size={32} />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">Fetching Configuration...</p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex gap-3">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium text-blue-700 leading-relaxed">
                  These values will override the dynamic calculations in the Balance Sheet. 
                  Use this to set opening balances or adjust historical equity items.
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-1">Shared Capital</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/20">IDR</span>
                    <Input 
                      placeholder="0"
                      value={formatInput(form.SHARED_CAPITAL)}
                      onChange={(e) => handleInputChange('SHARED_CAPITAL', e.target.value)}
                      className="h-12 pl-12 bg-slate-50 border-0 focus-visible:ring-primary/10 font-bold text-primary rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-1">Previous Years' Earnings (RE Opening)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/20">IDR</span>
                    <Input 
                      placeholder="0"
                      value={formatInput(form.RE_PREV_YEARS)}
                      onChange={(e) => handleInputChange('RE_PREV_YEARS', e.target.value)}
                      className="h-12 pl-12 bg-slate-50 border-0 focus-visible:ring-primary/10 font-bold text-primary rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-1">Profit (Loss) Current Year</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/20">IDR</span>
                    <Input 
                      placeholder="0"
                      value={formatInput(form.PL_NET_PROFIT)}
                      onChange={(e) => handleInputChange('PL_NET_PROFIT', e.target.value)}
                      className="h-12 pl-12 bg-slate-50 border-0 focus-visible:ring-primary/10 font-bold text-emerald-600 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-1">Dividends (Current Year)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/20">IDR</span>
                    <Input 
                      placeholder="0"
                      value={formatInput(form.DIVIDENDS)}
                      onChange={(e) => handleInputChange('DIVIDENDS', e.target.value)}
                      className="h-12 pl-12 bg-slate-50 border-0 focus-visible:ring-primary/10 font-bold text-rose-600 rounded-xl"
                    />
                  </div>
                  <p className="text-[9px] font-bold text-rose-400 uppercase tracking-tight flex items-center gap-1.5 ml-1">
                    <AlertCircle size={10} />
                    Enter as positive number (will be deducted from RE)
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="p-8 pt-0 flex gap-3">
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
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
