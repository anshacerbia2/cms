import { useState } from 'react';
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
import { toast } from 'sonner';
import { useAccountReceivable } from '../hooks/useAccountReceivable';
import { useAccountPayable } from '../hooks/useAccountPayable';
import { Loader2, Plus, Landmark, ReceiptText, FileSpreadsheet } from 'lucide-react';

type FormMode = 'AR' | 'AP_SUMMARY' | 'TAX_LEDGER_WAPU' | 'TAX_LEDGER_NON_WAPU';

interface AddFinanceRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  mode: FormMode;
}

export function AddFinanceRecordModal({ open, onOpenChange, onSuccess, mode }: AddFinanceRecordModalProps) {
  const { createAR } = useAccountReceivable();
  const { createAP, createTaxLedger } = useAccountPayable();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const getTitle = () => {
    switch (mode) {
      case 'AR': return 'Add Account Receivable';
      case 'AP_SUMMARY': return 'Add Account Payable Summary';
      case 'TAX_LEDGER_WAPU': return 'Add AP PPN WAPU Entry';
      case 'TAX_LEDGER_NON_WAPU': return 'Add AP PPN Non-WAPU Entry';
    }
  };

  const getIcon = () => {
    switch (mode) {
      case 'AR': return <ReceiptText className="text-emerald-500" size={24} />;
      case 'AP_SUMMARY': return <Landmark className="text-secondary" size={24} />;
      default: return <FileSpreadsheet className="text-blue-500" size={24} />;
    }
  };

  // Define fields based on mode
  const fields = mode === 'AR' ? [
    { key: 'colA', label: 'Masa', type: 'text', placeholder: 'e.g. SEP-24' },
    { key: 'colB', label: 'Tgl Invoice', type: 'date' },
    { key: 'colC', label: 'No Invoice', type: 'text' },
    { key: 'colD', label: 'Client', type: 'text' },
    { key: 'colE', label: 'Keterangan', type: 'text' },
    { key: 'colF', label: 'DPP IDR', type: 'number' },
    { key: 'colG', label: 'PPN IDR', type: 'number' },
    { key: 'colH', label: 'Total IDR', type: 'number' },
    { key: 'colI', label: 'Tgl Lunas', type: 'date' },
    { key: 'colJ', label: 'BCA Sahardjo', type: 'number' },
    { key: 'colK', label: 'BCA Juanda', type: 'number' },
    { key: 'colL', label: 'Mandiri MidPlaza', type: 'number' },
    { key: 'colM', label: 'Mandiri KCP', type: 'number' },
    { key: 'colN', label: 'BRI Sahardjo', type: 'number' },
    { key: 'colO', label: 'BRI Tebet', type: 'number' },
    { key: 'colP', label: 'BTN', type: 'number' },
    { key: 'colQ', label: 'Reference', type: 'text' },
    { key: 'colR', label: 'Outstanding IDR', type: 'number' },
  ] : mode === 'AP_SUMMARY' ? [
    { key: 'colB', label: 'Year', type: 'number' },
    { key: 'colC', label: 'Vendor', type: 'text' },
    { key: 'colD', label: 'Keterangan', type: 'text' },
    { key: 'colE', label: 'EOY IDR', type: 'number' },
    { key: 'colF', label: 'Field F', type: 'text' },
    { key: 'colG', label: 'Field G', type: 'text' },
    { key: 'colI', label: 'BCA Sahardjo', type: 'number' },
    { key: 'colJ', label: 'BCA Juanda', type: 'number' },
    { key: 'colK', label: 'Mandiri Mid Plaza', type: 'number' },
    { key: 'colL', label: 'BTN', type: 'number' },
    { key: 'colM', label: 'BRI Sahardjo', type: 'number' },
    { key: 'colN', label: 'BRI Tebet', type: 'number' },
    { key: 'colO', label: 'Cash IDR', type: 'number' },
    { key: 'colP', label: 'Non CB', type: 'number' },
    { key: 'colQ', label: 'AP PPN', type: 'number' },
    { key: 'colS', label: 'Outstanding IDR', type: 'number' },
  ] : [
    { key: 'colA', label: 'Masa', type: 'date' },
    { key: 'colB', label: 'Faktur', type: 'text' },
    { key: 'colC', label: 'No Faktur', type: 'text' },
    { key: 'colD', label: 'Client / Supplier', type: 'text' },
    { key: 'colE', label: 'Reference', type: 'text' },
    { key: 'colF', label: 'Sales', type: 'number' },
    { key: 'colG', label: 'Status', type: 'text' },
    { key: 'colH', label: 'PPN', type: 'number' },
    { key: 'colI', label: 'WAPU / Non-WAPU', type: 'number' },
    { key: 'colJ', label: 'Paid / Masukan', type: 'number' },
    { key: 'colK', label: 'AP PPN / Balance', type: 'number' },
    { key: 'colL', label: 'Account', type: 'text' },
    { key: 'colM', label: 'Sub Ledger', type: 'text' },
    { key: 'colN', label: 'Period', type: 'text' },
  ];

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (mode === 'AR') {
        await createAR.mutateAsync(formData);
      } else if (mode === 'AP_SUMMARY') {
        await createAP.mutateAsync(formData);
      } else {
        await createTaxLedger.mutateAsync({
          ...formData,
          type: mode === 'TAX_LEDGER_WAPU' ? 'WAPU' : 'NON_WAPU'
        });
      }
      
      toast.success('Record created successfully');
      setFormData({});
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to create record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-[2rem] border-primary/10 shadow-premium">
        <DialogHeader className="p-8 pb-4 bg-primary/[0.02] border-b border-primary/5">
          <DialogTitle className="text-2xl font-black tracking-tight text-primary flex items-center gap-3">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-8 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-1">
                  {field.label}
                </Label>
                <Input 
                  type={field.type}
                  placeholder={field.placeholder || `Enter ${field.label}...`}
                  value={formData[field.key] || ''}
                  onChange={(e) => handleInputChange(field.key, e.target.value)}
                  className="h-12 bg-slate-50 border-slate-100 rounded-xl focus-visible:ring-secondary/20 font-medium text-sm transition-all"
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="p-8 pt-4 bg-primary/[0.02] border-t border-primary/5 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold uppercase tracking-widest text-[11px]">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="h-12 px-8 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-premium font-black uppercase tracking-widest text-[11px] gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            Create Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
