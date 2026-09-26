import { memo } from 'react';
import { CornerDownRight, Edit2, Eye, History, Trash2 } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

/**
 * Nomor urut baris untuk kolom "No". `row_no` diberi jarak 1000 supaya bisa
 * menyisip di tengah, dan backend merapatkannya lagi sesudah setiap sisip atau
 * hapus - jadi dibagi 1000 hasilnya selalu 1, 2, 3 berurutan.
 */
export const formatRowNo = (rowNo: number | null | undefined) =>
  rowNo === null || rowNo === undefined
    ? '-'
    : (rowNo / 1000).toLocaleString('en-US', { maximumFractionDigits: 3, useGrouping: false });

/** Sel "No" - hanya di rekening Non CB. */
export const rowNoCell = 'pl-4 w-20 text-primary/50 tabular-nums';

type Props = {
  /** Baris yang sudah diformat untuk tampilan. */
  row: any;
  /** Tampilkan kolom "No" (row_no) di paling kiri - hanya untuk Non CB. */
  showRowNo?: boolean;
  /** Ada baris lain yang sedang diketik - tombol edit/sisip dikunci. */
  busy: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  onView: (row: any) => void;
  /** Riwayat perubahan baris ini. Tidak diisi kalau user tidak berhak melihat activity log. */
  onHistory?: (row: any) => void;
  onEdit: (row: any) => void;
  onInsert: (row: any) => void;
  onDelete: (id: number) => void;
};

/**
 * Satu baris ledger yang sedang tidak disunting.
 *
 * Dibungkus memo supaya baris yang tidak berubah tidak ikut dirender ulang
 * ketika halamannya berubah - misalnya saat mulai atau selesai menyunting.
 * BCA Sahardjo menampilkan semua barisnya tanpa paginasi, jadi ini ratusan
 * baris sekaligus. Karena itu semua callback dari halaman harus stabil
 * (useCallback); kalau tidak, memo tidak berguna.
 */
export const LedgerDisplayRow = memo(function LedgerDisplayRow({
  row, showRowNo, busy, canEdit, canCreate, canDelete, onView, onHistory, onEdit, onInsert, onDelete,
}: Props) {
  return (
    <TableRow className="hover:bg-slate-50 transition-colors whitespace-nowrap group">
      {showRowNo && <TableCell className={rowNoCell}>{formatRowNo(row.rowNo)}</TableCell>}
      <TableCell className="text-primary/60">{row.colA}</TableCell>
      <TableCell className="font-medium text-primary transition-colors max-w-md truncate" title={row.colB}>
        {row.colB}
      </TableCell>
      <TableCell className="text-right text-rose-600 pr-4 font-bold">{row.colC}</TableCell>
      <TableCell className="text-right text-emerald-600 pr-4 font-bold">{row.colD}</TableCell>
      <TableCell className="text-right pr-4 text-primary font-bold">{row.colE}</TableCell>
      <TableCell className="tracking-tighter" title={row.colF}>{row.colF}</TableCell>
      <TableCell className="text-primary truncate max-w-[150px]" title={row.colG}>{row.colG}</TableCell>
      <TableCell className="text-primary truncate max-w-[150px]" title={row.colH}>{row.colH}</TableCell>
      <TableCell className="text-primary truncate max-w-[150px]" title={row.colI}>{row.colI}</TableCell>
      <TableCell className="pr-4">
        <div className="flex items-center justify-end gap-1 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-primary/40 hover:text-primary hover:bg-primary/5 rounded-sm"
            onClick={(e) => { e.stopPropagation(); onView(row); }}
          >
            <Eye size={12} strokeWidth={2.5} />
          </Button>
          {onHistory && (
            <Button
              variant="ghost"
              size="icon"
              title="History"
              className="h-7 w-7 text-primary/40 hover:text-primary hover:bg-primary/5 rounded-sm"
              onClick={(e) => { e.stopPropagation(); onHistory(row); }}
            >
              <History size={12} strokeWidth={2.5} />
            </Button>
          )}
          {canEdit && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-primary/40 hover:text-primary hover:bg-primary/5 rounded-sm"
              disabled={busy}
              onClick={(e) => { e.stopPropagation(); onEdit(row); }}
            >
              <Edit2 size={12} strokeWidth={2.5} />
            </Button>
          )}
          {canCreate && (
            <Button
              variant="ghost"
              size="icon"
              title="Insert a row below this one"
              className="h-7 w-7 text-primary/40 hover:text-secondary hover:bg-secondary/5 rounded-sm"
              disabled={busy}
              onClick={(e) => { e.stopPropagation(); onInsert(row); }}
            >
              <CornerDownRight size={12} strokeWidth={2.5} />
            </Button>
          )}
          {canDelete && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-rose-500/40 hover:text-rose-600 hover:bg-rose-50 rounded-sm"
              onClick={(e) => { e.stopPropagation(); onDelete(row.id); }}
            >
              <Trash2 size={12} strokeWidth={2.5} />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});
