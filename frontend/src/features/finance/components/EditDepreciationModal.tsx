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
import { Save, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useDepreciation } from '../hooks/useDepreciation';
import { cn, formatInputAmount, cleanInputAmount } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toSubmitAmount } from "@/lib/utils";

interface EditDepreciationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: number | null;
  onSuccess: () => void;
}

const COL_ORDER = [
  'type', 'colA', 'colB', 'colC', 'colD', 'colE', 'colF', 'colG', 'colH', 'colI', 'colJ', 
  'colK', 'colL', 'colM', 'colN', 'colO', 'colP', 'colQ', 'colR', 'colS', 'colT', 'colU'
];

const LABELS: Record<string, string> = {
  type: 'Category', colA: 'Date', colB: 'Source', colC: 'Description',
  colD: 'Purchase Price', colE: 'Month', colF: 'S/D 2024', colG: 'Jan',
  colH: 'Feb', colI: 'Mar', colJ: 'Apr', colK: 'May', colL: 'Jun', colM: 'Jul',
  colN: 'Aug', colO: 'Sep', colP: 'Oct', colQ: 'Nov', colR: 'Dec',
  colS: 'Total 2025', colT: 'S/D 2025', colU: 'Book Value'
};

const NUMERIC_COLS = [
  'colD', 'colF', 'colG', 'colH', 'colI', 'colJ', 'colK', 'colL', 'colM', 
  'colN', 'colO', 'colP', 'colQ', 'colR', 'colS', 'colT', 'colU'
];

const DATE_COLS = ['colA'];

export default function EditDepreciationModal({ open, onOpenChange, recordId, onSuccess }: EditDepreciationModalProps) {
  const { updateAsset, getAssetById } = useDepreciation();
  const [loading, setLoading] = useState(false);

  const { data: record, isLoading: isFetching } = getAssetById(open ? recordId : null);

  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open && record) {
      const initialData: Record<string, any> = {};
      COL_ORDER.forEach(col => {
        if (DATE_COLS.includes(col)) {
          initialData[col] = record[col] ? format(new Date(record[col]), 'yyyy-MM-dd') : '';
        } else if (NUMERIC_COLS.includes(col)) {
          let val = record[col];
          if (val !== null && val !== undefined) {
             const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
             initialData[col] = isNaN(parsed) ? '' : parsed.toString();
          } else {
             initialData[col] = '';
          }
        } else {
          initialData[col] = record[col] || '';
        }
      });
      setFormData(initialData);
    } else if (!open) {
      setFormData({});
    }
  }, [open, record]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (NUMERIC_COLS.includes(name)) {
      setFormData((prev) => ({ ...prev, [name]: cleanInputAmount(value) }));
    } else if (name === 'colE') {
      setFormData((prev) => ({ ...prev, [name]: value.replace(/[^0-9]/g, '') }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDateSelect = (colName: string, date: Date | undefined) => {
    if (date) {
      setFormData((prev) => ({ ...prev, [colName]: format(date, 'yyyy-MM-dd') }));
    }
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return undefined;
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? parsed : undefined;
  };

  const handleSubmit = async () => {
    if (!recordId) return;

    try {
      setLoading(true);
      const payload: any = { ...formData };
      NUMERIC_COLS.forEach(key => {
        if (payload[key]) {
           payload[key] = toSubmitAmount(payload[key]);
        }
      });
      await updateAsset.mutateAsync({
        id: recordId,
        data: payload
      });
      toast.success('Depreciation record updated successfully.');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update depreciation record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] rounded-3xl border-primary/5 shadow-premium overflow-hidden p-0 gap-0 bg-white">
        
        <div className="bg-white px-8 pt-8 pb-6 border-b border-primary/5 relative z-10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary tracking-tight uppercase flex items-center gap-3">
              <Save className="w-8 h-8 text-secondary shrink-0" strokeWidth={2.5} />
              Edit Depreciation
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-2 opacity-70">
              Editing parameters for record {String(recordId)?.slice(-6)}
            </p>
          </DialogHeader>
        </div>

        {isFetching ? (
          <div className="p-12 flex flex-col items-center justify-center gap-4 text-primary/40 relative z-10 min-h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-semibold tracking-widest uppercase">Loading record...</p>
          </div>
        ) : !recordId ? null : (
          <>
            <div className="px-8 py-8 grid grid-cols-2 md:grid-cols-3 gap-6 relative z-10 max-h-[60vh] overflow-y-auto">
              {COL_ORDER.map((col) => (
                <div key={col} className="space-y-2">
                  <Label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">{LABELS[col]}</Label>
                  
                  {col === 'type' ? (
                    <Select value={formData[col] || ''} onValueChange={(val) => setFormData(prev => ({ ...prev, [col]: val }))}>
                      <SelectTrigger className="w-full h-11 rounded-xl bg-muted/20 border border-primary/10 shadow-none font-medium text-[13px] focus:ring-0 transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OFFICE_EQUIPMENT">OFFICE EQUIPMENT</SelectItem>
                        <SelectItem value="VEHICLE">VEHICLE</SelectItem>
                        <SelectItem value="INTANGIBLE_ASSET">INTANGIBLE ASSET</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : DATE_COLS.includes(col) ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left h-11 rounded-xl bg-muted/20 border border-primary/10 shadow-none font-medium text-[13px] hover:bg-muted/30 focus-visible:border-primary/30 transition-all",
                            !formData[col] && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                          {formData[col] ? format(parseISO(formData[col]), 'PPP') : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 overflow-hidden" align="start">
                        <Calendar
                          mode="single"
                          selected={parseDate(formData[col])}
                          onSelect={(date) => handleDateSelect(col, date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  ) : NUMERIC_COLS.includes(col) ? (
                    <Input 
                      name={col} 
                      value={formatInputAmount(formData[col] || '')} 
                      onChange={handleChange} 
                      className="h-11 rounded-xl bg-muted/20 border border-primary/10 shadow-none font-medium text-[13px] text-right focus-visible:border-primary/30 transition-all"
                    />
                  ) : (
                    <Input 
                      name={col} 
                      value={formData[col] || ''} 
                      onChange={handleChange} 
                      className="h-11 rounded-xl bg-muted/20 border border-primary/10 shadow-none font-medium text-[13px] focus-visible:border-primary/30 transition-all"
                    />
                  )}
                </div>
              ))}
            </div>

            <DialogFooter className="px-8 pt-4 pb-8 border-t border-primary/5 gap-3 relative z-10 flex-row justify-end">
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
                disabled={loading || isFetching}
                className="h-11 px-10 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold uppercase tracking-widest text-[10px] shadow-premium cursor-pointer"
              >
                {loading ? "Committing..." : "Commit Changes"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
