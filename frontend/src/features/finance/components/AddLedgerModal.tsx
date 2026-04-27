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
import { Plus, Trash2, Save, ClipboardPaste, Calendar as CalendarIcon, Wallet, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useFinance } from '../hooks/useFinance';
import { Loader2 } from 'lucide-react';
import Decimal from 'decimal.js';


interface AddLedgerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  selectedAccount: any;
  year: number;
  isPeriodClosed?: boolean;
}

interface LedgerRow {
  colA: string; // Date
  colB: string; // Description
  colC: string | number; // Debit
  colD: string | number; // Credit
  colE: string | number; // Saldo
  colF: string; // Ledger
  colG: string; // Sub Ledger 1
  colH: string; // Sub Ledger 2
  colI: string; // Sub Ledger 3
  colJ: string; // Sub Ledger 4
}

export default function AddLedgerModal({ open, onOpenChange, onSuccess, selectedAccount, year }: AddLedgerModalProps) {
  const { getAnchorBalance, createBulkTransactions } = useFinance();
  const [startingBalance, setStartingBalance] = useState<string>('0');
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Fetch the smart anchor balance (Last Transaction OR Opening Balance)
  const { data: anchorData, isLoading: isBalanceLoading } = getAnchorBalance(selectedAccount?.id, year, {
    enabled: open && !!selectedAccount?.id
  });

  useEffect(() => {
    if (anchorData) {
      // Use "at least 2 decimals" logic: 
      // If it has fewer than 2 decimals, force 2 (e.g. 100 -> 100.00)
      // If it has 2 or more, keep all of them (don't truncate)
      const val = new Decimal(anchorData.balance ?? 0);
      const initialValue = val.decimalPlaces() < 2 ? val.toFixed(2) : val.toString();
      setStartingBalance(initialValue);
    }
  }, [anchorData]);

  // Saldo (colE) is now calculated during render (Derived State) to avoid state sync issues.

  const colOrder: (keyof LedgerRow)[] = ['colA', 'colB', 'colC', 'colD', 'colE', 'colF', 'colG', 'colH', 'colI', 'colJ'];

  // Initialize with some empty rows
  useEffect(() => {
    if (open) {
      setRows(Array(5).fill(null).map(() => ({
        colA: '',
        colB: '',
        colC: '',
        colD: '',
        colE: '',
        colF: '',
        colG: '',
        colH: '',
        colI: '',
        colJ: '',
      })));
    }
  }, [open]);

  const addRow = () => {
    setRows([...rows, {
      colA: '',
      colB: '',
      colC: '',
      colD: '',
      colE: '',
      colF: '',
      colG: '',
      colH: '',
      colI: '',
      colJ: '',
    }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof LedgerRow, value: any) => {
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
      juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12',
      may: '05', aug: '08', oct: '10', dec: '12',
      january: '01', february: '02', march: '03', june: '06',
      july: '07', august: '08', october: '10', december: '12'
    };

    // Remove unwanted chars and split
    const parts = value.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
    
    if (parts.length === 3) {
      let d = '', m = '', y = '';

      if (parts[0].length === 4) {
        y = parts[0];
        m = parts[1];
        d = parts[2];
      } else {
        d = parts[0];
        m = parts[1];
        y = parts[2];
      }

      if (months[m]) {
        m = months[m];
      } else {
        m = m.padStart(2, '0');
      }

      d = d.padStart(2, '0');
      
      if (y.length === 2) {
        const year = parseInt(y);
        y = year > 50 ? `19${y}` : `20${y}`;
      }

      const finalDate = `${y}-${m}-${d}`;
      return isValid(parseISO(finalDate)) ? finalDate : '';
    }

    // If it's already YYYY-MM-DD but invalid, clear it
    if (value.match(/^\d{4}-\d{2}-\d{2}$/) && !isValid(parseISO(value))) {
      return '';
    }

    return value.match(/^\d{4}-\d{2}-\d{2}$/) ? value : '';
  };

  const cleanNumber = (val: string) => {
    if (!val || val === '-' || val.trim() === '') return '0';
    // Indonesian Excel: 75.000.000,00 -> 75000000.00
    let cleaned = val.replace(/\./g, ''); // Remove thousand dots
    cleaned = cleaned.replace(/,/g, '.'); // Convert decimal comma to dot
    return cleaned.replace(/[^0-9.]/g, ''); // Final safety strip
  };

  // FOR INPUTS: Clean thousands separator but NO forced decimals (so user can type easily)
  const formatInput = (val: string | number) => {
    if (val === undefined || val === null || val === '') return '';
    const str = val.toString();
    const [int, dec] = str.split('.');
    const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return dec !== undefined ? `${formattedInt},${dec}` : formattedInt;
  };

  // FOR DISPLAY: Force at least 2 decimals for a clean accounting look
  const formatAccounting = (val: string | number) => {
    if (val === undefined || val === null || val === '') return '';
    const str = val.toString();
    const [int, dec] = str.split('.');
    const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    if (dec === undefined) {
      return `${formattedInt},00`;
    }
    const paddedDec = dec.length < 2 ? dec.padEnd(2, '0') : dec;
    return `${formattedInt},${paddedDec}`;
  };

  const parseDisplay = (val: string) => {
    let cleaned = val.replace(/\./g, ''); // Remove dots
    cleaned = cleaned.replace(/,/g, '.'); // Convert comma to dot
    // Ensure only one dot
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("");
    }
    // Handle leading dot
    if (cleaned.startsWith('.')) cleaned = '0' + cleaned;
    
    // Trim leading zeros (e.g. "05" -> "5", but "0.5" stays "0.5")
    if (cleaned.length > 1 && cleaned.startsWith('0') && cleaned[1] !== '.') {
      cleaned = cleaned.replace(/^0+/, '');
      if (cleaned === '' || cleaned.startsWith('.')) cleaned = '0' + cleaned;
    }
    
    return cleaned.replace(/[^0-9.]/g, '');
  };

  const handlePaste = (e: React.ClipboardEvent, rowIndex: number, colKey: keyof LedgerRow) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData.includes('\t') && !pasteData.includes('\n')) return; // Regular paste

    e.preventDefault();
    const pasteRows = pasteData.split(/\r?\n/).filter(row => row.trim() !== '');
    const newRows = [...rows];

    const startColIndex = colOrder.indexOf(colKey);

    pasteRows.forEach((pasteRowText, i) => {
      const targetRowIndex = rowIndex + i;
      const pasteCols = pasteRowText.split('\t');

      // Ensure we have a row in our state
      if (targetRowIndex >= newRows.length) {
        newRows.push({
          colA: '', colB: '', colC: 0, colD: 0, colE: 0, colF: '', colG: '', colH: '', colI: '', colJ: ''
        });
      }

      pasteCols.forEach((cellText, j) => {
        const targetColIndex = startColIndex + j;
        if (targetColIndex < colOrder.length) {
          const field = colOrder[targetColIndex];
          let value: any = cellText.trim();
          
          // Basic type conversion
          // Smart Date Parsing for colA
          if (field === 'colA') {
            value = parseSmartDate(value);
          }
          
          // Numeric cleaning for Debit, Credit, and Ledger
          if (field === 'colC' || field === 'colD' || field === 'colE') {
            value = cleanNumber(value);
          }
          
          newRows[targetRowIndex] = { ...newRows[targetRowIndex], [field]: value };
        } else {
          // If pasteCols > colOrder, we just ignore the extra columns to prevent data corruption
          console.warn(`Pasted column at index ${targetColIndex} exceeds form columns. Ignoring data: ${cellText}`);
        }
      });
    });

    setRows(newRows);
    toast.success(`Pasted ${pasteRows.length} rows from Excel`);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colKey: keyof LedgerRow) => {
    const colIndex = colOrder.indexOf(colKey);
    
    if (e.key === 'F2') {
      e.preventDefault();
      const input = e.target as HTMLInputElement;
      const val = input.value;
      input.setSelectionRange(val.length, val.length);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (rowIndex === rows.length - 1) {
        addRow();
        // Wait for the new row to render
        setTimeout(() => {
          const nextInput = document.querySelector(`input[data-row="${rowIndex + 1}"][data-col="${colKey}"]`) as HTMLInputElement;
          if (nextInput) {
            nextInput.focus();
            nextInput.select();
          }
        }, 50);
      } else {
        const nextInput = document.querySelector(`input[data-row="${rowIndex + 1}"][data-col="${colKey}"]`) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    } else if (e.key === 'ArrowDown') {
      if (rowIndex < rows.length - 1) {
        e.preventDefault();
        const nextInput = document.querySelector(`input[data-row="${rowIndex + 1}"][data-col="${colKey}"]`) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    } else if (e.key === 'ArrowUp') {
      if (rowIndex > 0) {
        e.preventDefault();
        const nextInput = document.querySelector(`input[data-row="${rowIndex - 1}"][data-col="${colKey}"]`) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    } else if (e.key === 'ArrowRight') {
      // Only move if cursor is at the end or text is selected
      const input = e.target as HTMLInputElement;
      if (input.selectionStart === input.value.length || input.selectionStart !== input.selectionEnd) {
        if (colIndex < colOrder.length - 1) {
          e.preventDefault();
          const nextColKey = colOrder[colIndex + 1];
          const nextInput = document.querySelector(`input[data-row="${rowIndex}"][data-col="${nextColKey}"]`) as HTMLInputElement;
          if (nextInput) {
            nextInput.focus();
            nextInput.select();
          }
        }
      }
    } else if (e.key === 'ArrowLeft') {
      // Only move if cursor is at the beginning or text is selected
      const input = e.target as HTMLInputElement;
      if (input.selectionStart === 0 || input.selectionStart !== input.selectionEnd) {
        if (colIndex > 0) {
          e.preventDefault();
          const nextColKey = colOrder[colIndex - 1];
          const nextInput = document.querySelector(`input[data-row="${rowIndex}"][data-col="${nextColKey}"]`) as HTMLInputElement;
          if (nextInput) {
            nextInput.focus();
            nextInput.select();
          }
        }
      }
    }
  };

  const handleSave = async () => {
    // Only rows with valid Date, Description, and some Amount (Debit/Credit)
    const validRows = rows.filter(r => 
      r.colA !== "" && 
      r.colB.trim() !== "" && 
      (new Decimal(r.colC || 0).gt(0) || new Decimal(r.colD || 0).gt(0))
    );

    if (validRows.length === 0) {
      toast.error("Please fill at least one valid row (Date, Description, and Amount required)");
      return;
    }

    const targetYear = Number(year);
    const invalidYearRow = validRows.find(r => {
      const d = parseISO(r.colA);
      return isValid(d) && d.getFullYear() !== targetYear;
    });

    if (invalidYearRow) {
      toast.error(`Some transactions are not in the year ${year}. Please check your dates.`);
      return;
    }

    setLoading(true);
    try {
      // 1. If it's initial load (INITIAL status), save the starting balance first
      // 2. Save bulk transactions with optional startingBalance for INITIAL state
      // 2. Save bulk transactions with startingBalance to ensure FiscalPeriod is established
      await createBulkTransactions()({
        data: validRows,
        accountId: selectedAccount.id,
        year: Number(year),
        // CRITICAL: Only send startingBalance if the user is allowed to edit it (Initial Migration/Setup).
        // If not editable, we rely on backend's carry-forward calculation.
        startingBalance: anchorData?.canEdit ? startingBalance.toString() : undefined
      });
      toast.success(`Successfully saved ${validRows.length} transactions and synchronized balances.`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || "Failed to save transactions";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-[2rem] border-primary/10 shadow-premium">
        <DialogHeader className="p-4 md:p-8 pb-4 bg-primary/[0.02] border-b border-primary/5 text-left items-start sm:text-left sm:items-start">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full text-left items-start">
            <div className="space-y-1">
              <DialogTitle className="text-lg md:text-2xl font-black tracking-tight text-primary flex items-center gap-3">
                <ClipboardPaste className="text-secondary shrink-0" size={20} />
                Bulk Add Ledger Entries
              </DialogTitle>
              <div className="text-muted-foreground text-xs md:text-sm font-medium">
                Input multiple transactions for <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20 font-semibold px-1.5 py-0 inline-flex align-middle mx-1">{selectedAccount?.bank?.bankBrand || selectedAccount?.holderName}</Badge>
                in fiscal year <span className="text-primary font-semibold ml-1">{year}</span>
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
          {/* Refined Minimalist Starting Balance Bar */}
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/[0.03] flex items-center justify-center border border-primary/5 shadow-inner">
                   <Wallet size={20} className="text-primary/40" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/30 block leading-none mb-1">Period Balance Anchor</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-primary capitalize">{selectedAccount?.bank?.bankBrand || selectedAccount?.holderName}</span>
                    <span className="text-xs font-medium text-muted-foreground/50">
                      — {anchorData?.referredYear ? `Referred from ${anchorData.referredYear}` : `Fiscal Year ${year}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/40">Balance</span>
                  <div className="flex items-center gap-3">
                     {isBalanceLoading ? (
                      <Loader2 size={16} className="animate-spin text-primary/30" />
                    ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-400">IDR</span>
                      <Input 
                        type="text"
                        disabled={anchorData?.canEdit === false}
                        value={formatInput(startingBalance)}
                        onChange={(e) => setStartingBalance(parseDisplay(e.target.value))}
                        className={`w-40 h-8 border-none shadow-none focus-visible:ring-0 text-base font-bold p-0 text-right transition-all rounded-sm px-2 ${
                          anchorData?.canEdit !== false
                            ? 'bg-slate-100 text-slate-900 ring-1 ring-slate-200' 
                            : 'bg-slate-200/60 text-slate-700 ring-1 ring-transparent'
                        }`}
                      />
                      <div className="flex items-center gap-2 ml-2">
                        <div className={`h-2 w-2 rounded-full shadow-sm ${
                          anchorData?.status === 'CLOSED' ? 'bg-red-500 animate-pulse' :
                          anchorData?.status === 'ONGOING' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                        <span className={`text-[10px] font-bold uppercase tracking-tight ${
                          anchorData?.status === 'CLOSED' ? 'text-red-600' :
                          anchorData?.status === 'ONGOING' ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {anchorData?.status || 'OPEN'}
                        </span>
                      </div>
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Warning Banners based on Status & Reason */}
            {!isBalanceLoading && anchorData && (
              <div>
                <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                  (anchorData.status === 'CLOSED' && anchorData.referredYear === year)
                    ? 'bg-red-50 border-red-100 text-red-700' 
                    : 'bg-blue-50 border-blue-100 text-blue-700'
                }`}>
                  {(anchorData.status === 'CLOSED' && anchorData.referredYear === year) ? <AlertCircle size={14} className="shrink-0" /> : <RefreshCw size={14} className="shrink-0" />}
                  <p className="text-[11px] font-bold leading-tight">
                    {anchorData.message} 
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-primary/5 overflow-hidden shadow-sm bg-white">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-primary/5">
                  <TableHead className="w-44 min-w-[176px] shrink-0 text-[10px] font-black uppercase tracking-widest text-primary/40 pl-8 border-r border-primary/5 leading-none">Tanggal</TableHead>
                  <TableHead className="min-w-[300px] shrink-0 text-[10px] font-black uppercase tracking-widest text-primary/40 px-4 border-r border-primary/5 leading-none">Keterangan</TableHead>
                  <TableHead className="w-40 min-w-[160px] shrink-0 text-[10px] font-black uppercase tracking-widest text-primary/40 text-right px-4 border-r border-primary/5 leading-none">Debet</TableHead>
                  <TableHead className="w-40 min-w-[160px] shrink-0 text-[10px] font-black uppercase tracking-widest text-primary/40 text-right px-4 border-r border-primary/5 leading-none">Kredit</TableHead>
                  <TableHead className="w-40 min-w-[160px] shrink-0 text-[10px] font-black uppercase tracking-widest text-primary/40 text-right px-4 border-r border-primary/5 leading-none">Saldo</TableHead>
                  <TableHead className="w-40 min-w-[160px] shrink-0 text-[10px] font-black uppercase tracking-widest text-primary/40 px-4 border-r border-primary/5 leading-none">Ledger</TableHead>
                  <TableHead className="w-40 min-w-[160px] shrink-0 text-[10px] font-black uppercase tracking-widest text-primary/40 px-4 border-r border-primary/5 leading-none">Sub Ledger 1</TableHead>
                  <TableHead className="w-40 min-w-[160px] shrink-0 text-[10px] font-black uppercase tracking-widest text-primary/40 px-4 border-r border-primary/5 leading-none">Sub Ledger 2</TableHead>
                  <TableHead className="w-40 min-w-[160px] shrink-0 text-[10px] font-black uppercase tracking-widest text-primary/40 px-4 border-r border-primary/5 leading-none">Sub Ledger 3</TableHead>
                  <TableHead className="w-40 min-w-[160px] shrink-0 text-[10px] font-black uppercase tracking-widest text-primary/40 px-4 border-r border-primary/5 leading-none">Sub Ledger 4</TableHead>
                  <TableHead className="w-16 shrink-0 text-center pr-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  let runningBalance = new Decimal(startingBalance || '0');
                  let totalDebit = new Decimal(0);
                  let totalCredit = new Decimal(0);
                  
                  const renderedRows = rows.map((row, index) => {
                    const debit = new Decimal(row.colC || 0);
                    const credit = new Decimal(row.colD || 0);
                    const rowSaldo = runningBalance.minus(debit).plus(credit);
                    
                    totalDebit = totalDebit.plus(debit);
                    totalCredit = totalCredit.plus(credit);
                    runningBalance = rowSaldo;

                    return (
                      <TableRow key={index} className="hover:bg-primary/[0.02] border-primary/5 transition-colors group h-9">
                        <TableCell className="p-0 border-r border-primary/5 relative">
                          <div className="flex items-center w-full h-full">
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
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={row.colA ? parseISO(row.colA) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      updateRow(index, 'colA', format(date, 'yyyy-MM-dd'));
                                    }
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <Input 
                              placeholder="YYYY-MM-DD"
                              value={row.colA} 
                              onChange={(e) => updateRow(index, 'colA', e.target.value)}
                              onBlur={(e) => {
                                const formatted = parseSmartDate(e.target.value);
                                updateRow(index, 'colA', formatted);
                              }}
                              onKeyDown={(e) => handleKeyDown(e, index, 'colA')}
                              onPaste={(e) => handlePaste(e, index, 'colA')}
                              data-row={index}
                              data-col="colA"
                              className="w-full h-9 border-none shadow-none focus-visible:ring-0 bg-transparent text-sm rounded-none pl-0 pr-4 placeholder:text-primary/20 leading-none"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="p-0 border-r border-primary/5">
                          <Input 
                            placeholder="Transaction description..." 
                            value={row.colB} 
                            onChange={(e) => updateRow(index, 'colB', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 'colB')}
                            onPaste={(e) => handlePaste(e, index, 'colB')}
                            data-row={index}
                            data-col="colB"
                            className="w-full h-9 border-none shadow-none focus-visible:ring-0 bg-transparent font-medium text-sm rounded-none px-4 placeholder:text-primary/20 leading-none"
                          />
                        </TableCell>
                        <TableCell className="p-0 border-r border-primary/5">
                          <Input 
                            type="text" 
                            placeholder="0"
                            value={formatInput(row.colC)} 
                            onChange={(e) => updateRow(index, 'colC', parseDisplay(e.target.value))}
                            onKeyDown={(e) => handleKeyDown(e, index, 'colC')}
                            onPaste={(e) => handlePaste(e, index, 'colC')}
                            data-row={index}
                            data-col="colC"
                            className="w-full h-9 border-none shadow-none focus-visible:ring-0 bg-transparent text-sm text-right text-red-500 rounded-none px-4 placeholder:text-primary/20 leading-none"
                          />
                        </TableCell>
                        <TableCell className="p-0 border-r border-primary/5">
                          <Input 
                            type="text" 
                            placeholder="0"
                            value={formatInput(row.colD)} 
                            onChange={(e) => updateRow(index, 'colD', parseDisplay(e.target.value))}
                            onKeyDown={(e) => handleKeyDown(e, index, 'colD')}
                            onPaste={(e) => handlePaste(e, index, 'colD')}
                            data-row={index}
                            data-col="colD"
                            className="w-full h-9 border-none shadow-none focus-visible:ring-0 bg-transparent text-sm text-right text-emerald-600 rounded-none px-4 placeholder:text-primary/20 leading-none"
                          />
                        </TableCell>
                        <TableCell className="p-0 border-r border-primary/5 bg-primary/[0.01]">
                          <Input 
                            placeholder="0" 
                            value={formatAccounting(rowSaldo.toString())} 
                            readOnly
                            tabIndex={-1}
                            className="w-full h-9 border-none shadow-none focus-visible:ring-0 bg-transparent text-sm text-right font-bold text-primary/40 rounded-none px-4 leading-none select-none"
                          />
                        </TableCell>
                        <TableCell className="p-0 border-r border-primary/5">
                          <Input 
                            placeholder="Ledger..." 
                            value={row.colF} 
                            onChange={(e) => updateRow(index, 'colF', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 'colF')}
                            onPaste={(e) => handlePaste(e, index, 'colF')}
                            data-row={index}
                            data-col="colF"
                            className="w-full h-9 border-none shadow-none focus-visible:ring-0 bg-transparent text-sm rounded-none px-4 placeholder:text-primary/20 leading-none"
                          />
                        </TableCell>
                        <TableCell className="p-0 border-r border-primary/5">
                          <Input 
                            placeholder="SL 1" 
                            value={row.colG} 
                            onChange={(e) => updateRow(index, 'colG', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 'colG')}
                            onPaste={(e) => handlePaste(e, index, 'colG')}
                            data-row={index}
                            data-col="colG"
                            className="w-full h-9 border-none shadow-none focus-visible:ring-0 bg-transparent text-sm rounded-none px-4 placeholder:text-primary/20 leading-none"
                          />
                        </TableCell>
                        <TableCell className="p-0 border-r border-primary/5">
                          <Input 
                            placeholder="SL 2" 
                            value={row.colH} 
                            onChange={(e) => updateRow(index, 'colH', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 'colH')}
                            onPaste={(e) => handlePaste(e, index, 'colH')}
                            data-row={index}
                            data-col="colH"
                            className="w-full h-9 border-none shadow-none focus-visible:ring-0 bg-transparent text-sm rounded-none px-4 placeholder:text-primary/20 leading-none"
                          />
                        </TableCell>
                        <TableCell className="p-0 border-r border-primary/5">
                          <Input 
                            placeholder="SL 3" 
                            value={row.colI} 
                            onChange={(e) => updateRow(index, 'colI', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 'colI')}
                            onPaste={(e) => handlePaste(e, index, 'colI')}
                            data-row={index}
                            data-col="colI"
                            className="w-full h-9 border-none shadow-none focus-visible:ring-0 bg-transparent text-sm rounded-none px-4 placeholder:text-primary/20 leading-none"
                          />
                        </TableCell>
                        <TableCell className="p-0 border-r border-primary/5">
                          <Input 
                            placeholder="SL 4" 
                            value={row.colJ} 
                            onChange={(e) => updateRow(index, 'colJ', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 'colJ')}
                            onPaste={(e) => handlePaste(e, index, 'colJ')}
                            data-row={index}
                            data-col="colJ"
                            className="w-full h-9 border-none shadow-none focus-visible:ring-0 bg-transparent text-sm rounded-none px-4 placeholder:text-primary/20 leading-none"
                          />
                        </TableCell>
                        <TableCell className="p-0 text-center pr-8">
                          <div className="flex items-center justify-center h-9">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeRow(index)}
                              className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-sm opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  });

                  return (
                    <>
                      {renderedRows}
                      <TableRow className="bg-secondary/10 border-t-2 border-secondary/30 hover:bg-secondary/10 transition-none h-9 font-bold">
                        <TableCell className="pl-8 text-[11px] text-secondary uppercase tracking-[0.2em] border-r border-secondary/20">Total</TableCell>
                        <TableCell className="border-r border-secondary/20" />
                        <TableCell className="text-right px-4 text-sm text-red-500 border-r border-secondary/20 whitespace-nowrap">
                          {formatAccounting(totalDebit.toString())}
                        </TableCell>
                        <TableCell className="text-right px-4 text-sm text-emerald-600 border-r border-secondary/20 whitespace-nowrap">
                          {formatAccounting(totalCredit.toString())}
                        </TableCell>
                        <TableCell colSpan={7} className="pr-8 bg-secondary/[0.03]" />
                      </TableRow>
                    </>
                  );
                })()}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-col gap-0 p-0 border-t border-primary/5 bg-primary/[0.02]">
          {/* Keyboard Shortcuts Legend - Vertical Column Layout */}
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

          {/* Action Buttons */}
          <div className="px-8 py-4 flex items-center justify-end w-full gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold uppercase tracking-widest text-[11px] cursor-pointer">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={loading}
              className="rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[11px] px-8 gap-2 shadow-premium cursor-pointer"
            >
              {loading ? "Saving..." : <><Save size={16} /> Save Transactions</>}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
