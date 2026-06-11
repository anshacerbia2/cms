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
import { Plus, Trash2, Save, ClipboardPaste, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAccountReceivable } from '../hooks/useAccountReceivable';

interface AddArLedgerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  year: number;
}

interface ArRow {
  colB: string; colC: string; colD: string; colE: string;
  colF: string | number; colG: string | number; colH: string | number;
  colJ: string | number; colK: string | number;
  colL: string | number; colM: string | number; colN: string | number;
  colO: string | number; colP: string | number;
  colR: string | number; colS: string | number;
}

const COL_ORDER: (keyof ArRow)[] = [
  'colB', 'colC', 'colD', 'colE', 'colF', 'colG', 'colH', 'colJ', 'colK', 'colL', 'colM', 'colN', 'colO', 'colP', 'colR', 'colS'
];

const LABELS: Record<keyof ArRow, string> = {
  colB: 'Type', colC: 'Year', colD: 'Name', colE: 'Description',
  colF: 'EOY IDR', colG: 'EOY USD', colH: 'USD Rate',
  colJ: 'BCA Suhardjo', colK: 'BCA Juanda', colL: 'MANDIRI MP',
  colM: 'BRI Suhardjo', colN: 'Cash IDR', colO: 'Non CB',
  colP: 'PPn In and Out', colR: 'Outstanding IDR', colS: 'Outstanding USD'
};

const NUMERIC_COLS: (keyof ArRow)[] = ['colF', 'colG', 'colH', 'colJ', 'colK', 'colL', 'colM', 'colN', 'colO', 'colP', 'colR', 'colS'];

export default function AddArLedgerModal({ open, onOpenChange, onSuccess, year }: AddArLedgerModalProps) {
  const { createBulkAR } = useAccountReceivable();
  const [rows, setRows] = useState<ArRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setRows(Array(5).fill(null).map(() => ({
        colB: '', colC: '', colD: '', colE: '',
        colF: '', colG: '', colH: '', colJ: '', colK: '', colL: '', colM: '', colN: '',
        colO: '', colP: '', colR: '', colS: ''
      } as ArRow)));
    }
  }, [open]);

  const addRow = () => {
    setRows([...rows, {
      colB: '', colC: '', colD: '', colE: '',
      colF: '', colG: '', colH: '', colJ: '', colK: '', colL: '', colM: '', colN: '',
      colO: '', colP: '', colR: '', colS: ''
    } as ArRow]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof ArRow, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };



  const cleanNumber = (val: string) => {
    if (val === undefined || val === null) return '0';
    let strVal = val.toString().trim();
    if (strVal === '') return '0';
    const hasMinus = strVal.includes('-') || (strVal.startsWith('(') && strVal.endsWith(')'));
    let cleaned = strVal.replace(/\./g, '');
    cleaned = cleaned.replace(/,/g, '.');
    cleaned = cleaned.replace(/[^0-9.]/g, '');
    if (cleaned.length > 1 && cleaned.startsWith('0') && cleaned[1] !== '.') {
      cleaned = cleaned.replace(/^0+/, '');
      if (cleaned === '' || cleaned.startsWith('.')) cleaned = '0' + cleaned;
    }
    if (hasMinus) cleaned = '-' + cleaned;
    return cleaned === '-' ? '0' : cleaned;
  };

  const formatInput = (val: string | number) => {
    if (val === undefined || val === null || val === '') return '';
    const str = val.toString();
    if (str === '-') return '-';
    const isNegative = str.startsWith('-');
    const numStr = isNegative ? str.slice(1) : str;
    const [int, dec] = numStr.split('.');
    const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const formatted = dec !== undefined ? `${formattedInt},${dec}` : formattedInt;
    return isNegative ? `-${formatted}` : formatted;
  };

  const parseDisplay = (val: string) => {
    if (val === undefined || val === null) return '';
    let strVal = val.toString().trim();
    const hasMinus = strVal.includes('-') || (strVal.startsWith('(') && strVal.endsWith(')'));
    let cleaned = strVal.replace(/\./g, '');
    cleaned = cleaned.replace(/,/g, '.');
    cleaned = cleaned.replace(/[^0-9.]/g, '');
    const parts = cleaned.split(".");
    cleaned = parts[0] + (parts.length > 1 ? "." + parts.slice(1).join("") : "");
    if (cleaned.length > 1 && cleaned.startsWith('0') && cleaned[1] !== '.') {
      cleaned = cleaned.replace(/^0+/, '');
      if (cleaned === '' || cleaned.startsWith('.')) cleaned = '0' + cleaned;
    }
    if (cleaned.startsWith('.')) cleaned = '0' + cleaned;
    const result = hasMinus ? '-' + cleaned : cleaned;
    return result === '-' ? '-' : result;
  };

  const handlePaste = (e: React.ClipboardEvent, rowIndex: number, colKey: keyof ArRow) => {
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
          colB: '', colC: '', colD: '', colE: '',
          colF: '', colG: '', colH: '', colJ: '', colK: '', colL: '', colM: '', colN: '',
          colO: '', colP: '', colR: '', colS: ''
        } as ArRow);
      }
      pasteCols.forEach((cellText, j) => {
        const targetColIndex = startColIndex + j;
        if (targetColIndex < COL_ORDER.length) {
          const field = COL_ORDER[targetColIndex];
          let value: any = cellText.trim();
          if (NUMERIC_COLS.includes(field)) value = cleanNumber(value);
          newRows[targetRowIndex] = { ...newRows[targetRowIndex], [field]: value };
        }
      });
    });
    setRows(newRows);
    toast.success(`Pasted ${pasteRows.length} rows from Excel`);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colKey: keyof ArRow) => {
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
    const validRows = rows.filter(row => row.colD || row.colF || row.colR);
    if (validRows.length === 0) {
      toast.error("Please add at least one valid record");
      return;
    }
    setLoading(true);
    try {
      await createBulkAR.mutateAsync({ data: validRows, tagYear: year });
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
                <ClipboardPaste className="text-secondary shrink-0" size={20} />
                Bulk Account Receivable Import
              </DialogTitle>
              <div className="text-muted-foreground text-xs md:text-sm font-medium">
                Import massive AR datasets. <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20 font-semibold px-1.5 py-0 inline-flex align-middle mx-1">EXCEL READY</Badge>
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
                      {LABELS[col]}
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
                      return (
                        <TableCell key={col} className="p-0 border-r border-primary/5 relative">
                          <div className="flex items-center w-full h-full">
                            <Input
                              placeholder={isNumeric ? "0" : "-"}
                              value={isNumeric ? formatInput(row[col]) : row[col]}
                              onChange={(e) => updateRow(idx, col, isNumeric ? parseDisplay(e.target.value) : e.target.value)}
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />} {loading ? "Saving..." : "Save AR Records"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
