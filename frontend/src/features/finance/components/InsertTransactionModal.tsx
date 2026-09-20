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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarIcon, CornerDownRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useBankMutation } from '../hooks/useBankMutation';
import { cn, formatInputAmount, cleanInputAmount } from '@/lib/utils';

interface InsertTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Baris yang akan berada tepat di atas baris baru; null berarti paling atas. */
  afterRow: any | null;
  accountId: string | undefined;
  year: number;
  onSuccess: () => void;
}

/**
 * Menambah satu baris di posisi tertentu, bukan di ujung daftar.
 *
 * Baris di bawahnya turun satu posisi tanpa disentuh: yang menentukan urutan
 * adalah nomor urut baris, bukan banyaknya baris di atasnya. Jadi id, nilai, dan
 * isi baris-baris lain tetap seperti semula.
 */
export default function InsertTransactionModal({
  open,
  onOpenChange,
  afterRow,
  accountId,
  year,
  onSuccess,
}: InsertTransactionModalProps) {
  const { insertTransaction } = useBankMutation();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    colA: '',
    colB: '',
    colC: '0',
    colD: '0',
    colF: '',
    colG: '',
    colH: '',
    colI: '',
  });

  useEffect(() => {
    if (!open) {
      setFormData({ colA: '', colB: '', colC: '0', colD: '0', colF: '', colG: '', colH: '', colI: '' });
      return;
    }
    // Diawali dengan tanggal dan ledger baris di atasnya, karena baris yang
    // disisipkan hampir selalu bagian dari kejadian yang sama.
    setFormData({
      colA: afterRow?.colA ? format(new Date(afterRow.colA), 'yyyy-MM-dd') : '',
      colB: '',
      colC: '0',
      colD: '0',
      colF: afterRow?.colF || '',
      colG: afterRow?.colG || '',
      colH: '',
      colI: '',
    });
  }, [open, afterRow]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) setFormData((prev) => ({ ...prev, colA: format(date, 'yyyy-MM-dd') }));
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return undefined;
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? parsed : undefined;
  };

  const handleSubmit = async () => {
    if (!formData.colA || !formData.colB) {
      toast.error('Date and Description are required.');
      return;
    }
    if (!accountId) {
      toast.error('No account selected.');
      return;
    }

    try {
      setLoading(true);
      await insertTransaction()({
        data: formData,
        accountId,
        tagYear: year,
        afterId: afterRow ? Number(afterRow.id) : null,
      });
      toast.success(
        afterRow ? 'Row inserted below the selected transaction.' : 'Row inserted at the top.',
      );
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to insert transaction.');
    } finally {
      setLoading(false);
    }
  };

  const anchorLabel = afterRow
    ? String(afterRow.colB || '').slice(0, 60) || `transaction ${afterRow.id}`
    : 'the top of the ledger';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-3xl border-primary/5 shadow-premium overflow-hidden p-0 gap-0 bg-white">

        <div className="bg-white px-8 pt-8 pb-6 border-b border-primary/5 relative z-10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary tracking-tight uppercase flex items-center gap-3">
              <CornerDownRight className="w-8 h-8 text-secondary shrink-0" strokeWidth={2.5} />
              Insert Row
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-2 opacity-70">
              Below {anchorLabel}
            </p>
          </DialogHeader>
        </div>

        <div className="px-8 py-8 grid grid-cols-2 gap-6 relative z-10">
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left h-11 rounded-xl bg-muted/20 border border-primary/10 shadow-none font-medium text-[13px] hover:bg-muted/30 focus-visible:border-primary/30 transition-all",
                    !formData.colA && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                  {formData.colA ? format(parseISO(formData.colA), 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 overflow-hidden" align="start">
                <Calendar
                  mode="single"
                  selected={parseDate(formData.colA)}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2 col-span-2 sm:col-span-1 flex items-end">
            <p className="text-[11px] text-muted-foreground font-medium leading-relaxed pb-2">
              Rows below keep their values and move down one position.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Debit</Label>
            <Input
              name="colC"
              value={formatInputAmount(formData.colC)}
              onChange={(e) => setFormData(prev => ({ ...prev, colC: cleanInputAmount(e.target.value) }))}
              className="h-11 rounded-xl bg-muted/20 border border-primary/10 shadow-none font-medium text-[13px] text-right focus-visible:border-primary/30 transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Credit</Label>
            <Input
              name="colD"
              value={formatInputAmount(formData.colD)}
              onChange={(e) => setFormData(prev => ({ ...prev, colD: cleanInputAmount(e.target.value) }))}
              className="h-11 rounded-xl bg-muted/20 border border-primary/10 shadow-none font-medium text-[13px] text-right focus-visible:border-primary/30 transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Ledger</Label>
            <Input
              name="colF"
              value={formData.colF}
              onChange={handleChange}
              className="h-11 rounded-xl bg-muted/20 border border-primary/10 shadow-none font-medium text-[13px] focus-visible:border-primary/30 transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Sub Ledger - 1</Label>
            <Input
              name="colG"
              value={formData.colG}
              onChange={handleChange}
              className="h-11 rounded-xl bg-muted/20 border border-primary/10 shadow-none font-medium text-[13px] focus-visible:border-primary/30 transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Sub Ledger - 2</Label>
            <Input
              name="colH"
              value={formData.colH}
              onChange={handleChange}
              className="h-11 rounded-xl bg-muted/20 border border-primary/10 shadow-none font-medium text-[13px] focus-visible:border-primary/30 transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Sub Ledger - 3</Label>
            <Input
              name="colI"
              value={formData.colI}
              onChange={handleChange}
              className="h-11 rounded-xl bg-muted/20 border border-primary/10 shadow-none font-medium text-[13px] focus-visible:border-primary/30 transition-all"
            />
          </div>

          <div className="space-y-2 col-span-2">
            <Label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Description</Label>
            <Textarea
              name="colB"
              value={formData.colB}
              onChange={handleChange as any}
              className="min-h-[80px] rounded-xl bg-muted/20 border border-primary/10 shadow-none font-medium text-[13px] focus-visible:border-primary/30 transition-all resize-none"
            />
          </div>
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
            disabled={loading}
            className="h-11 px-10 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold uppercase tracking-widest text-[10px] shadow-premium cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Inserting...
              </>
            ) : (
              'Insert Row'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
