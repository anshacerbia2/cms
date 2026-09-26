import { memo } from 'react';
import { CornerDownRight, Edit2, Eye, History, Trash2 } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { accountKey, type AccountColumn } from '@/features/finance/hooks/useAccountColumns';

/** Sel "No" - row_no apa adanya; backend menjaganya 1, 2, 3 tanpa lubang. */
export const rowNoCell = 'pl-8 px-4 w-20 tabular-nums text-primary/50';
export const formatRowNo = (rowNo: number | null | undefined) =>
  rowNo === null || rowNo === undefined ? '-' : String(rowNo);

type Props = {
  /** Baris yang sudah diformat untuk tampilan. */
  row: any;
  accountColumns: AccountColumn[];
  /** Ada baris lain yang sedang diketik - tombol sunting/sisip dikunci. */
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
 * Satu baris Sales yang sedang tidak disunting.
 *
 * Dibungkus memo supaya baris yang tidak berubah tidak ikut dirender ulang
 * ketika halamannya berubah - misalnya saat mulai atau selesai menyunting.
 * Karena itu semua callback dari halaman harus stabil (useCallback); kalau
 * tidak, memo tidak berguna.
 */
export const SalesDisplayRow = memo(function SalesDisplayRow({
  row, accountColumns, busy, canEdit, canCreate, canDelete, onView, onHistory, onEdit, onInsert, onDelete,
}: Props) {
  return (
    <TableRow className="border-primary/5 hover:bg-primary/[0.01] transition-colors whitespace-nowrap group">
      <TableCell className={rowNoCell}>{formatRowNo(row.rowNo)}</TableCell>
      <TableCell className="px-4 w-40">{row.colB}</TableCell>
      <TableCell className="px-4 w-32">{row.colC}</TableCell>
      <TableCell className="px-4 w-20">{row.colD}</TableCell>
      <TableCell className="px-4 w-48">{row.colE}</TableCell>
      <TableCell className="px-4 w-32">{row.colF}</TableCell>
      <TableCell className="px-4 w-64 truncate max-w-[200px]">{row.colG}</TableCell>

      <TableCell className="px-4 w-40 text-right">{row.colH}</TableCell>
      <TableCell className="px-4 w-40 text-right">{row.colI}</TableCell>
      <TableCell className="px-4 w-40 text-right">{row.colJ}</TableCell>
      <TableCell className="px-4 w-40 text-right">{row.colK}</TableCell>

      {accountColumns.map((account) => (
        <TableCell key={account.id} className="px-4 w-40 text-right">{row[accountKey(account.id)]}</TableCell>
      ))}

      <TableCell className="px-4 w-40 text-right font-bold">{row.colX}</TableCell>
      <TableCell className="px-4 w-40 text-right">{row.colZ}</TableCell>
      <TableCell className="px-4 w-40 text-right">{row.colAA}</TableCell>
      <TableCell className="px-4 w-40 text-right">{row.colAB}</TableCell>
      <TableCell className="px-4 w-40 text-right">{row.colAC}</TableCell>
      <TableCell className="pr-8 w-64">{row.colAD}</TableCell>
      <TableCell className="px-4 text-center">
        <div className="flex items-center justify-center gap-1">
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
              title="Edit"
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
