import { memo } from 'react';
import { CornerDownRight, CornerUpRight, Edit2, Eye, History, Trash2 } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

/**
 * Kolom tabel PPN In/Out sesudah "No". Kolom 2025 dan 2026 digabung; DPP PPN
 * hanya ada di 2026, jadi baris 2025 tampil "-". Sales (tahun, colF) dari
 * workbook 2025 tetap tersimpan dan ikut ekspor, tapi tidak ditampilkan.
 * `total: false` - saldo berjalan tidak dijumlah di baris total.
 */
export const PPN_COLUMNS: { k: string; l: string; num?: boolean; isDate?: boolean; total?: false }[] = [
  { k: 'colA', l: 'Masa', isDate: true },
  { k: 'colB', l: 'PPN Type' },
  { k: 'colC', l: 'No Faktur' },
  { k: 'colD', l: 'Customer/Vendor' },
  { k: 'colE', l: 'Invoice No' },
  { k: 'dpp', l: 'DPP PPN', num: true },
  { k: 'status', l: 'Status' },
  { k: 'colH', l: 'PPN', num: true },
  { k: 'colI', l: 'WAPU', num: true },
  { k: 'colJ', l: 'PAID', num: true },
  { k: 'colK', l: 'AP PPN WAPU', num: true },
  { k: 'colM', l: 'Non WAPU', num: true },
  { k: 'colN', l: 'Masukan', num: true },
  { k: 'colO', l: 'AP PPN Non WAPU', num: true, total: false },
  { k: 'colP', l: 'Ledger' },
  { k: 'colQ', l: 'Sub Ledger-1' },
  { k: 'colR', l: 'Sub Ledger-2' },
  { k: 'colS', l: 'Sub Ledger-3' },
];

/** Sel "No" - row_no apa adanya; backend menjaganya 1, 2, 3 tanpa lubang. */
export const rowNoCell = 'px-4 w-20 tabular-nums text-primary/50';
export const formatRowNo = (rowNo: number | null | undefined) =>
  rowNo === null || rowNo === undefined ? '-' : String(rowNo);

type Props = {
  /** Baris yang sudah diformat untuk tampilan. */
  row: any;
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
  /** Sisip DI ATAS baris ini. Hanya diisi untuk baris No 1 - di tempat lain, sisip bawah baris di atasnya. */
  onInsertAbove?: (row: any) => void;
  onDelete: (id: number) => void;
};

/**
 * Satu baris PPN In/Out yang sedang tidak disunting.
 *
 * Dibungkus memo supaya baris yang tidak berubah tidak ikut dirender ulang
 * ketika halamannya berubah - misalnya saat mulai atau selesai menyunting.
 * Karena itu semua callback dari halaman harus stabil (useCallback).
 */
export const PpnDisplayRow = memo(function PpnDisplayRow({
  row, busy, canEdit, canCreate, canDelete, onView, onHistory, onEdit, onInsert, onInsertAbove, onDelete,
}: Props) {
  return (
    <TableRow className="hover:bg-slate-50/50 transition-colors whitespace-nowrap group">
      <TableCell className={rowNoCell}>{formatRowNo(row.rowNo)}</TableCell>
      {PPN_COLUMNS.map((c) => (
        <TableCell key={c.k} className={`px-4 ${c.num ? 'text-right font-bold text-primary/80' : 'text-primary/60'}`}>
          {row[c.k]}
        </TableCell>
      ))}
      <TableCell className="px-4">
        <div className="flex items-center justify-end gap-1">
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
          {canCreate && onInsertAbove && (
            <Button
              variant="ghost"
              size="icon"
              title="Insert a row above this one"
              className="h-7 w-7 text-primary/40 hover:text-secondary hover:bg-secondary/5 rounded-sm"
              disabled={busy}
              onClick={(e) => { e.stopPropagation(); onInsertAbove(row); }}
            >
              <CornerUpRight size={12} strokeWidth={2.5} />
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
