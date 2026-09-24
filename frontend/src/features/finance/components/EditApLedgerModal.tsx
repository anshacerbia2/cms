import React, { useState, useEffect } from 'react';
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
import { Save } from 'lucide-react';
import { useAccountPayable } from '../hooks/useAccountPayable';
import { cn, cleanInputAmount, formatInputAmount } from '@/lib/utils';
import { parseAmountInput } from "@/lib/utils";

interface EditApLedgerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any | null;
  onSuccess: () => void;
}

const LABELS = {
  colA: 'Payable', colB: 'Year', colC: 'Vendor', colD: 'Keterangan',
  colE: 'IDR',
  /* colH: 'Col F', colI: 'Col G', */
  colK: 'BCA Shardjo', colL: 'BCA Juanda', colM: 'Mandiri Mid Plaza',
  colN: 'BTN', colO: 'BRI Shardjo', colP: 'BRI Tebet',
  colQ: 'Cash IDR', colR: 'Non CB', colS: 'AP In and Out',
  colU: 'Outstanding IDR',
};

const NUMERIC_COLS = [
  'colE', 'colK', 'colL', 'colM', 'colN',
  'colO', 'colP', 'colQ', 'colR', 'colS', 'colU',
];

export default function EditApLedgerModal({ open, onOpenChange, record, onSuccess }: EditApLedgerModalProps) {
  const { updateAP } = useAccountPayable();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (open && record) {
      const initData: any = {};
      Object.keys(LABELS).forEach((key) => {
        let val = record[key];
        if (NUMERIC_COLS.includes(key)) {
           if (val !== null && val !== undefined) {
             const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
             val = isNaN(parsed) ? '' : parsed.toString();
           } else {
             val = '';
           }
        }
        initData[key] = val || '';
      });
      setFormData(initData);
    } else {
      setFormData({});
    }
  }, [open, record]);



  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (NUMERIC_COLS.includes(name)) {
      setFormData((prev: any) => ({ ...prev, [name]: cleanInputAmount(value) }));
    } else if (name === 'colB') {
      setFormData((prev: any) => ({ ...prev, [name]: value.replace(/[^0-9]/g, '') }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    if (!record?.id) return;
    try {
      setLoading(true);
      const payload: any = { ...formData };
      NUMERIC_COLS.forEach(key => {
        if (payload[key]) {
           payload[key] = parseAmountInput(payload[key]);
        }
      });
      
      await updateAP.mutateAsync({
        id: record.id,
        data: payload
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      // toast is handled in hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] rounded-3xl border-primary/5 shadow-premium overflow-hidden p-0 gap-0 bg-white">
        <div className="bg-white px-8 pt-8 pb-6 border-b border-primary/5 relative z-10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary tracking-tight uppercase flex items-center gap-3">
              <Save className="w-8 h-8 text-secondary shrink-0" strokeWidth={2.5} />
              Edit Account Payable
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-2 opacity-70">
              Editing parameters for payable {String(record?.id)?.slice(-6)}
            </p>
          </DialogHeader>
        </div>

        <div className="px-8 py-8 grid grid-cols-2 gap-6 relative z-10 max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-50/50">
          {Object.entries(LABELS).map(([key, label]) => {
            const isNumeric = NUMERIC_COLS.includes(key);
            return (
              <div key={key} className="space-y-2">
                <Label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">{label}</Label>
                <Input
                  name={key}
                  value={isNumeric ? formatInputAmount(formData[key]) : (formData[key] || '')}
                  onChange={handleChange}
                  className={cn(
                    "h-11 rounded-xl bg-muted/20 border border-primary/10 shadow-none font-medium text-[13px] focus-visible:border-primary/30 transition-all",
                    isNumeric && "text-right"
                  )}
                />
              </div>
            );
          })}
        </div>

        <DialogFooter className="px-8 pt-4 pb-8 border-t border-primary/5 gap-3 relative z-10 flex-row justify-end bg-white">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="h-11 px-10 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold uppercase tracking-widest text-[10px] shadow-premium cursor-pointer"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
