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
import { useInterAccount } from '../hooks/useInterAccount';
import { parseAmountInput } from "@/lib/utils";

interface AddInterAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  year: number;
}

interface InterAccountRow {
  colB: string; colC: string | number; colD: string | number;
  colE: string | number; colF: string | number; colG: string | number;
  colH: string | number; colI: string | number; colJ: string | number;
  colK: string | number; colL: string | number; colM: string | number;
  colN: string | number; colO: string | number;
}

const COL_ORDER: (keyof InterAccountRow)[] = [
  'colB', 'colC', 'colD', 'colE', 'colF', 'colG', 'colH', 'colI', 'colJ',
  'colK', 'colL', 'colM', 'colN', 'colO'
];

const VISIBLE_COLS = COL_ORDER;

const LABELS: Record<keyof InterAccountRow, string> = {
  colB: 'Description', colC: 'BCA Sahardjo', colD: 'BCA Juanda',
  colE: 'Mandiri Mid Plaza', colF: 'BRI Sahardjo', colG: 'BTN', colH: 'BJB',
  colI: 'Bank Raya', colJ: 'BRI Tebet', colK: 'Manidiri Plaza Mandiri', colL: 'BNI',
  colM: 'Cash IDR', colN: 'Non Cash Bank', colO: 'PPn In and Out'
};

const NUMERIC_COLS: (keyof InterAccountRow)[] = [
  'colC', 'colD', 'colE', 'colF', 'colG', 'colH', 'colI', 'colJ', 'colK', 'colL', 'colM', 'colN', 'colO'
];

export default function AddInterAccountModal({ open, onOpenChange, onSuccess, year }: AddInterAccountModalProps) {
  const { createBulkInterAccount } = useInterAccount({ page: 1 });
  const [rows, setRows] = useState<InterAccountRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setRows(Array(5).fill(null).map(() => ({
        colB: '', colC: '', colD: '', colE: '', colF: '', colG: '',
        colH: '', colI: '', colJ: '', colK: '', colL: '', colM: '', colN: '', colO: ''
      })));
    }
  }, [open]);

  const addRow = () => {
    setRows([...rows, {
      colB: '', colC: '', colD: '', colE: '', colF: '', colG: '',
      colH: '', colI: '', colJ: '', colK: '', colL: '', colM: '', colN: '', colO: ''
    }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof InterAccountRow, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const cleanNumber = (val: string) => {
    const parsed = parseAmountInput(val);
    return parsed === '' || parsed === '-' ? '0' : parsed;
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

  const parseDisplay = (val: string) => parseAmountInput(val);

  const handlePaste = (e: React.ClipboardEvent, rowIndex: number, colKey: keyof InterAccountRow) => {
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
          colB: '', colC: '', colD: '', colE: '', colF: '', colG: '',
          colH: '', colI: '', colJ: '', colK: '', colL: '', colM: '', colN: '', colO: ''
        });
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

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colKey: keyof InterAccountRow) => {
    const colIndex = VISIBLE_COLS.indexOf(colKey);
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
        if (colIndex < VISIBLE_COLS.length - 1) {
          e.preventDefault();
          const nextColKey = VISIBLE_COLS[colIndex + 1];
          const nextInput = document.querySelector(`input[data-row="${rowIndex}"][data-col="${nextColKey}"]`) as HTMLInputElement;
          if (nextInput) { nextInput.focus(); nextInput.select(); }
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.target as HTMLInputElement;
      if (input.selectionStart === 0 || input.selectionStart !== input.selectionEnd) {
        if (colIndex > 0) {
          e.preventDefault();
          const nextColKey = VISIBLE_COLS[colIndex - 1];
          const nextInput = document.querySelector(`input[data-row="${rowIndex}"][data-col="${nextColKey}"]`) as HTMLInputElement;
          if (nextInput) { nextInput.focus(); nextInput.select(); }
        }
      }
    }
  };

  const handleSave = async () => {
    const validRows = rows.filter(row => row.colB || row.colC || row.colD);
    if (validRows.length === 0) {
      toast.error("Please add at least one valid record");
      return;
    }
    setLoading(true);
    try {
      await createBulkInterAccount.mutateAsync({ data: validRows, tagYear: year });
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
                Bulk Inter-Account Import
              </DialogTitle>
              <div className="text-muted-foreground text-xs md:text-sm font-medium">
                Standard Inter-Account ledger ingestion. <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20 font-semibold px-1.5 py-0 inline-flex align-middle mx-1">EXCEL READY</Badge>
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
            <Table className="min-w-[2200px]">
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-primary/5 whitespace-nowrap">
                  {VISIBLE_COLS.map(col => (
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
                    {VISIBLE_COLS.map(col => {
                      const isNumeric = NUMERIC_COLS.includes(col);
                      return (
                        <TableCell key={col} className="p-0 border-r border-primary/5 relative">
                          <div className="flex items-center w-full h-full">
                            <Input
                              placeholder={isNumeric ? "0" : "-"}
                              value={isNumeric ? formatInput(row[col]) : row[col]}
                              onChange={(e) => {
                                let val = e.target.value;
                                if (isNumeric) val = parseDisplay(val);
                                updateRow(idx, col, val);
                              }}
                              onPaste={(e) => handlePaste(e, idx, col)}
                              onKeyDown={(e) => handleKeyDown(e, idx, col)}
                              data-row={idx}
                              data-col={col}
                              className={`h-9 w-full rounded-none border-0 bg-transparent px-4 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-secondary/40 focus-visible:bg-secondary/5 font-medium text-[13px] ${isNumeric ? 'text-right' : 'text-left'} transition-colors`}
                            />
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell className="p-0 pr-4">
                      <div className="flex items-center justify-end h-full w-full pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-50/50 rounded-lg"
                          onClick={() => removeRow(idx)}
                        >
                          <Trash2 size={13} />
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
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              Tip: Copy any rectangular range from Excel and paste — rows/cols expand automatically.
            </div>
          </div>
          <div className="px-8 py-4 flex items-center justify-end w-full gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold uppercase tracking-widest text-[11px] h-12 px-6 cursor-pointer">Cancel</Button>
            <Button onClick={handleSave} disabled={loading} className="rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[11px] h-12 px-8 gap-2 shadow-premium cursor-pointer">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />} 
              {loading ? "Saving..." : `Save ${rows.filter(r => r.colB || r.colC || r.colD).length} Records`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
