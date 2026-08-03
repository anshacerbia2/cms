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
import { Plus, Trash2, Save, ClipboardPaste, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { usePpnInOut } from '../hooks/usePpnInOut';
import { isValid, parseISO, format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface AddPpnInOutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  year: number;
}

interface PpnInOutRow {
  colA: string; colB: string | number; colC: string | number; colD: string | number;
  colE: string | number; colF: string | number; colG: string | number;
  colH: string | number; colI: string | number; colJ: string | number;
  colK: string | number; colM: string | number;
  colN: string | number; colO: string | number; colP: string | number;
  colQ: string | number; colR: string | number; colS: string | number;
}

const COL_ORDER: (keyof PpnInOutRow)[] = [
  'colA', 'colB', 'colC', 'colD', 'colE', 'colF', 'colG', 'colH', 'colI', 'colJ',
  'colK', 'colM', 'colN', 'colO', 'colP', 'colQ', 'colR', 'colS'
];

const VISIBLE_COLS = COL_ORDER;

const LABELS: Record<keyof PpnInOutRow, string> = {
  colA: 'Masa', colB: 'Col B', colC: 'No Faktur', colD: 'Client/Suplier',
  colE: 'Invoice No', colF: 'Sales', colG: 'Status', colH: 'PPN',
  colI: 'WAPU', colJ: 'PAID', colK: 'AP PPN WAPU',
  colM: 'Non WAPU', colN: 'Masukan', colO: 'AP PPN Non WAPU',
  colP: 'Ledger', colQ: 'Sub Ledger-1', colR: 'Sub Ledger-2', colS: 'Sub Ledger-3'
};

const NUMERIC_COLS: (keyof PpnInOutRow)[] = [
  'colG', 'colH', 'colI', 'colJ', 'colK', 'colM', 'colN', 'colO'
];

export default function AddPpnInOutModal({ open, onOpenChange, onSuccess, year }: AddPpnInOutModalProps) {
  const { createBulkPpnInOut } = usePpnInOut();
  const [rows, setRows] = useState<PpnInOutRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setRows(Array(5).fill(null).map(() => ({
        colA: '', colB: '', colC: '', colD: '', colE: '', colF: '', colG: '',
        colH: '', colI: '', colJ: '', colK: '', colM: '', colN: '', colO: '',
        colP: '', colQ: '', colR: '', colS: ''
      })));
    }
  }, [open]);

  const addRow = () => {
    setRows([...rows, {
      colA: '', colB: '', colC: '', colD: '', colE: '', colF: '', colG: '',
      colH: '', colI: '', colJ: '', colK: '', colM: '', colN: '', colO: '',
      colP: '', colQ: '', colR: '', colS: ''
    }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof PpnInOutRow, value: any) => {
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

  const handlePaste = (e: React.ClipboardEvent, rowIndex: number, colKey: keyof PpnInOutRow) => {
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
          colH: '', colI: '', colJ: '', colK: '', colM: '', colN: '', colO: '',
          colP: '', colQ: '', colR: '', colS: ''
        });
      }
      pasteCols.forEach((cellText, j) => {
        const targetColIndex = startColIndex + j;
        if (targetColIndex < COL_ORDER.length) {
          const field = COL_ORDER[targetColIndex];
          let value: any = cellText.trim();
          if (NUMERIC_COLS.includes(field)) value = cleanNumber(value);
          else if (field === 'colF') value = value.replace(/[^0-9]/g, '');
          else if (field === 'colA') value = parseSmartDate(value);
          newRows[targetRowIndex] = { ...newRows[targetRowIndex], [field]: value };
        }
      });
    });
    setRows(newRows);
    toast.success(`Pasted ${pasteRows.length} rows from Excel`);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colKey: keyof PpnInOutRow) => {
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
    const validRows = rows.filter(row => row.colA || row.colC || row.colD);
    if (validRows.length === 0) {
      toast.error("Please add at least one valid record");
      return;
    }
    setLoading(true);
    try {
      await createBulkPpnInOut.mutateAsync({ data: validRows, tagYear: year });
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
                Bulk PPN In/Out Import
              </DialogTitle>
              <div className="text-muted-foreground text-xs md:text-sm font-medium">
                Standard PPN In/Out ledger ingestion. <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20 font-semibold px-1.5 py-0 inline-flex align-middle mx-1">EXCEL READY</Badge>
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
                            {col === 'colA' ? (
                              <>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-full w-8 shrink-0 bg-transparent hover:bg-transparent text-primary/30 hover:text-primary transition-colors rounded-none cursor-pointer"
                                    >
                                      <CalendarIcon size={14} />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 overflow-hidden" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={row.colA ? parseISO(row.colA) : undefined}
                                      onSelect={(date) => {
                                        if (date) {
                                          updateRow(idx, 'colA', format(date, 'yyyy-MM-dd'));
                                        }
                                      }}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <Input
                                  placeholder="YYYY-MM-DD"
                                  value={row.colA}
                                  onChange={(e) => updateRow(idx, 'colA', e.target.value)}
                                  onBlur={(e) => updateRow(idx, 'colA', parseSmartDate(e.target.value))}
                                  onPaste={(e) => handlePaste(e, idx, 'colA')}
                                  onKeyDown={(e) => handleKeyDown(e, idx, 'colA')}
                                  data-row={idx}
                                  data-col="colA"
                                  className="h-9 w-full rounded-none border-0 bg-transparent px-4 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-secondary/40 focus-visible:bg-secondary/5 font-medium text-[13px] text-left transition-colors pl-0"
                                />
                              </>
                            ) : (
                              <Input
                                placeholder={isNumeric ? "0" : "-"}
                                value={isNumeric ? formatInput(row[col]) : row[col]}
                                onChange={(e) => {
                                  let val = e.target.value;
                                  if (isNumeric) val = parseDisplay(val);
                                  else if (col === 'colF') val = val.replace(/[^0-9]/g, '');
                                  updateRow(idx, col, val);
                                }}
                                onPaste={(e) => handlePaste(e, idx, col)}
                                onKeyDown={(e) => handleKeyDown(e, idx, col)}
                                data-row={idx}
                                data-col={col}
                                className={`h-9 w-full rounded-none border-0 bg-transparent px-4 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-secondary/40 focus-visible:bg-secondary/5 font-medium text-[13px] ${isNumeric ? 'text-right' : 'text-left'} transition-colors`}
                              />
                            )}
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
              {loading ? "Saving..." : `Save ${rows.filter(r => r.colA || r.colC || r.colD).length} Records`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
