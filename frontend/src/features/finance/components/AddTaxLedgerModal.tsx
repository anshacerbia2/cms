import React, { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, Calendar as CalendarIcon, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAccountPayable } from '../hooks/useAccountPayable';

interface AddTaxLedgerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  type: 'WAPU' | 'NON_WAPU';
}

interface TaxRow {
  colA: string; colB: string; colC: string; colD: string; colE: string;
  colF: string; colG: string; colH: string | number; colI: string | number;
  colJ: string | number; colK: string | number; colL: string;
  colM: string; colN: string;
}

export default function AddTaxLedgerModal({ open, onOpenChange, onSuccess, type }: AddTaxLedgerModalProps) {
  const { createBulkTaxLedger } = useAccountPayable();
  const [rows, setRows] = useState<TaxRow[]>([]);
  const [loading, setLoading] = useState(false);

  const NUMERIC_COLS: (keyof TaxRow)[] = ['colH', 'colI', 'colJ', 'colK'];

  const COL_ORDER: (keyof TaxRow)[] = type === 'WAPU' 
    ? ['colA', 'colB', 'colC', 'colD', 'colE', 'colF', 'colG', 'colH', 'colI', 'colJ', 'colK', 'colL', 'colM', 'colN']
    : ['colA', 'colB', 'colC', 'colD', 'colE', 'colF', 'colG', 'colH', 'colI', 'colJ', 'colK', 'colL', 'colM'];

  const getLabels = () => {
    if (type === 'WAPU') {
      return {
        colA: 'Masa', colB: 'Faktur', colC: 'No Faktur', colD: 'Client / Supplier', colE: 'Reference',
        colF: 'Sales', colG: 'Status', colH: 'PPN', colI: 'WAPU', colJ: 'WAPU Paid',
        colK: 'AP PPN WAPU', colL: 'Account', colM: 'Sub Ledger', colN: 'Period'
      };
    }
    return {
      colA: 'Masa', colB: 'Faktur', colC: 'No Faktur', colD: 'Client / Supplier', colE: 'Reference',
      colF: 'Sales', colG: 'Status', colH: 'PPN', colI: 'Non WAPU', colJ: 'Masukan',
      colK: 'Balance', colL: 'Account', colM: 'Sub Ledger', colN: 'Period'
    };
  };

  const labels = getLabels();

  useEffect(() => {
    if (open) {
      setRows(Array(5).fill(null).map(() => ({
        colA: '', colB: '', colC: '', colD: '', colE: '', colF: '', colG: '',
        colH: '', colI: '', colJ: '', colK: '', colL: '', colM: '', colN: ''
      })));
    }
  }, [open]);

  const addRow = () => {
    setRows([...rows, {
      colA: '', colB: '', colC: '', colD: '', colE: '', colF: '', colG: '',
      colH: '', colI: '', colJ: '', colK: '', colL: '', colM: '', colN: ''
    }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof TaxRow, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const parseSmartDate = (value: string) => {
    if (!value) return '';
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', jun: '06',
      jul: '07', agt: '08', ags: '08', sep: '09', okt: '10', nov: '11', des: '12',
      januari: '01', februari: '02', maret: '03', april: '04', juni: '06',
      juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12'
    };
    const parts = value.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
    if (parts.length === 3) {
      let d = '', m = '', y = '';
      if (parts[0].length === 4) { y = parts[0]; m = parts[1]; d = parts[2]; }
      else { d = parts[0]; m = parts[1]; y = parts[2]; }
      if (months[m]) m = months[m]; else m = m.padStart(2, '0');
      d = d.padStart(2, '0');
      if (y.length === 2) { const year = parseInt(y); y = year > 50 ? `19${y}` : `20${y}`; }
      const finalDate = `${y}-${m}-${d}`;
      return isValid(parseISO(finalDate)) ? finalDate : '';
    }
    return value.match(/^\d{4}-\d{2}-\d{2}$/) ? value : '';
  };

  const cleanNumber = (val: string) => {
    if (!val || val === '-' || val.trim() === '') return '0';
    let cleaned = val.replace(/\./g, '');
    cleaned = cleaned.replace(/,/g, '.');
    return cleaned.replace(/[^0-9.]/g, '');
  };

  const formatInput = (val: string | number) => {
    if (val === undefined || val === null || val === '') return '';
    const str = val.toString();
    const [int, dec] = str.split('.');
    const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return dec !== undefined ? `${formattedInt},${dec}` : formattedInt;
  };

  const parseDisplay = (val: string) => {
    let cleaned = val.replace(/\./g, '');
    cleaned = cleaned.replace(/,/g, '.');
    const parts = cleaned.split(".");
    if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
    if (cleaned.startsWith('.')) cleaned = '0' + cleaned;
    return cleaned.replace(/[^0-9.]/g, '');
  };

  const handlePaste = (e: React.ClipboardEvent, rowIndex: number, colKey: keyof TaxRow) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData.includes('\t') && !pasteData.includes('\n')) return;
    e.preventDefault();
    const pasteRows = pasteData.split(/\r?\n/).filter(row => row.trim() !== '');
    const newRows = [...rows];
    const startColIndex = COL_ORDER.indexOf(colKey);
    pasteRows.forEach((pasteRowText, i) => {
      const targetRowIndex = rowIndex + i;
      const pasteCols = pasteRowText.split('\t');
      if (targetRowIndex >= newRows.length) {
        newRows.push({
          colA: '', colB: '', colC: '', colD: '', colE: '', colF: '', colG: '',
          colH: '', colI: '', colJ: '', colK: '', colL: '', colM: '', colN: ''
        });
      }
      pasteCols.forEach((cellText, j) => {
        const targetColIndex = startColIndex + j;
        if (targetColIndex < COL_ORDER.length) {
          const field = COL_ORDER[targetColIndex];
          let value: any = cellText.trim();
          if (field === 'colA') value = parseSmartDate(value);
          if (NUMERIC_COLS.includes(field)) value = cleanNumber(value);
          newRows[targetRowIndex] = { ...newRows[targetRowIndex], [field]: value };
        }
      });
    });
    setRows(newRows);
    toast.success(`Pasted ${pasteRows.length} rows from Excel`);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colKey: keyof TaxRow) => {
    const colIndex = COL_ORDER.indexOf(colKey);
    if (e.key === 'F2') {
      e.preventDefault();
      const input = e.target as HTMLInputElement;
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (rowIndex === rows.length - 1) addRow();
      setTimeout(() => {
        const nextInput = document.querySelector(`input[data-row="${rowIndex + 1}"][data-col="${colKey}"]`) as HTMLInputElement;
        if (nextInput) { nextInput.focus(); nextInput.select(); }
      }, 50);
    } else if (e.key === 'ArrowDown') {
      if (rowIndex < rows.length - 1) {
        e.preventDefault();
        const nextInput = document.querySelector(`input[data-row="${rowIndex + 1}"][data-col="${colKey}"]`) as HTMLInputElement;
        if (nextInput) { nextInput.focus(); nextInput.select(); }
      }
    } else if (e.key === 'ArrowUp') {
      if (rowIndex > 0) {
        e.preventDefault();
        const nextInput = document.querySelector(`input[data-row="${rowIndex - 1}"][data-col="${colKey}"]`) as HTMLInputElement;
        if (nextInput) { nextInput.focus(); nextInput.select(); }
      }
    } else if (e.key === 'ArrowRight') {
      const input = e.target as HTMLInputElement;
      if (input.selectionStart === input.value.length || input.selectionStart !== input.selectionEnd) {
        if (colIndex < COL_ORDER.length - 1) {
          e.preventDefault();
          const nextColKey = COL_ORDER[colIndex + 1];
          const nextInput = document.querySelector(`input[data-row="${rowIndex}"][data-col="${nextColKey}"]`) as HTMLInputElement;
          if (nextInput) { nextInput.focus(); nextInput.select(); }
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.target as HTMLInputElement;
      if (input.selectionStart === 0 || input.selectionStart !== input.selectionEnd) {
        if (colIndex > 0) {
          e.preventDefault();
          const nextColKey = COL_ORDER[colIndex - 1];
          const nextInput = document.querySelector(`input[data-row="${rowIndex}"][data-col="${nextColKey}"]`) as HTMLInputElement;
          if (nextInput) { nextInput.focus(); nextInput.select(); }
        }
      }
    }
  };

  const handleSave = async () => {
    const validRows = rows.filter(row => row.colA || row.colC || row.colH);
    if (validRows.length === 0) {
      toast.error("Please add at least one valid record");
      return;
    }
    setLoading(true);
    try {
      const payload = validRows.map(row => ({
        ...row,
        type,
      }));
      await createBulkTaxLedger.mutateAsync(payload);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-[2rem] border-primary/10 shadow-premium">
        <DialogHeader className="p-4 md:p-8 pb-4 bg-primary/[0.02] border-b border-primary/5 text-left items-start sm:text-left sm:items-start">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full text-left items-start">
            <div className="space-y-1">
              <DialogTitle className="text-lg md:text-2xl font-black tracking-tight text-primary flex items-center gap-3">
                <ShieldCheck className="text-secondary shrink-0" size={20} />
                Bulk Tax Ledger Import ({type})
              </DialogTitle>
              <div className="text-muted-foreground text-xs md:text-sm font-medium">
                Batch creation of tax records. <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20 font-semibold px-1.5 py-0 inline-flex align-middle mx-1">EXCEL READY</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
               <Button variant="outline" size="sm" onClick={addRow} className="w-full md:w-auto rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2 cursor-pointer py-5 md:py-0">
                 <Plus size={14} /> Add Row
               </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-8 pt-4">
          <div className="rounded-2xl border border-primary/5 overflow-hidden shadow-sm bg-white">
            <Table className="min-w-[1800px]">
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap">
                  {COL_ORDER.map(col => (
                    <TableHead key={col} className={`text-[10px] font-black uppercase tracking-widest text-primary/40 px-4 border-r border-primary/5 leading-none ${NUMERIC_COLS.includes(col) ? 'text-right' : 'text-left'}`}>
                      {labels[col]}
                    </TableHead>
                  ))}
                  <TableHead className="w-16 shrink-0 text-center pr-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx} className="hover:bg-primary/[0.02] border-primary/5 transition-colors group h-9">
                    {COL_ORDER.map(col => {
                      const isNumeric = NUMERIC_COLS.includes(col);
                      const isDate = col === 'colA';
                      return (
                        <TableCell key={col} className="p-0 border-r border-primary/5 relative">
                          <div className="flex items-center w-full h-full">
                            {isDate && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-full w-8 shrink-0 bg-transparent hover:bg-transparent text-primary/30 hover:text-primary transition-colors rounded-none cursor-pointer">
                                    <CalendarIcon size={14} />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar mode="single" selected={row.colA ? parseISO(row.colA) : undefined} onSelect={(date) => date && updateRow(idx, 'colA', format(date, 'yyyy-MM-dd'))} initialFocus />
                                </PopoverContent>
                              </Popover>
                            )}
                            <Input
                              placeholder={isNumeric ? "0" : isDate ? "YYYY-MM-DD" : "-"}
                              value={isNumeric ? formatInput(row[col]) : row[col]}
                              onChange={(e) => updateRow(idx, col, isNumeric ? parseDisplay(e.target.value) : e.target.value)}
                              onBlur={(e) => isDate && updateRow(idx, 'colA', parseSmartDate(e.target.value))}
                              onKeyDown={(e) => handleKeyDown(e, idx, col)}
                              onPaste={(e) => handlePaste(e, idx, col)}
                              data-row={idx}
                              data-col={col}
                              className={`w-full h-9 border-none shadow-none focus-visible:ring-0 bg-transparent text-sm rounded-none px-4 placeholder:text-primary/20 leading-none ${isNumeric ? 'text-right' : 'text-left'}`}
                            />
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell className="p-0 text-center pr-8">
                      <div className="flex items-center justify-center h-9">
                        <Button variant="ghost" size="icon" onClick={() => removeRow(idx)} className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-sm opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-col gap-0 p-0 border-t border-primary/5 bg-primary/[0.02]">
          <div className="px-8 py-4 hidden md:flex flex-col gap-3 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider border-b border-primary/5">
            <div className="flex items-center flex-wrap gap-x-8 gap-y-3">
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded border border-primary/10 bg-white shadow-sm font-mono text-primary/80">TAB</kbd>
                <span>Next Cell</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-primary/10 bg-white shadow-sm font-mono text-primary/80">SHIFT</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 rounded border border-primary/10 bg-white shadow-sm font-mono text-primary/80">TAB</kbd>
                </div>
                <span>Prev Cell</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded border border-primary/10 bg-white shadow-sm font-mono text-primary/80">ENTER</kbd>
                <span>Next Row</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-primary/10 bg-white shadow-sm font-mono text-primary/80">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded border border-primary/10 bg-white shadow-sm font-mono text-primary/80">↓</kbd>
                </div>
                <span>Move Vertical</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded border border-primary/10 bg-white shadow-sm font-mono text-primary/80">F2</kbd>
                <span>Edit Cell</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-primary/10 bg-white shadow-sm font-mono text-primary/80">CTRL</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 rounded border border-primary/10 bg-white shadow-sm font-mono text-primary/80">V</kbd>
                </div>
                <span>Paste Excel</span>
              </div>
            </div>
            <div className="flex items-center gap-2 italic normal-case opacity-80 pt-1 border-t border-primary/[0.03]">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              Tip: Copy any rectangular range from Excel and paste — rows/cols expand automatically.
            </div>
          </div>
          <div className="px-8 py-4 flex items-center justify-end w-full gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold uppercase tracking-widest text-[11px] cursor-pointer">Cancel</Button>
            <Button onClick={handleSave} disabled={loading} className="rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[11px] px-8 gap-2 shadow-premium cursor-pointer">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />} {loading ? "Saving..." : "Save Tax Ledger"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
