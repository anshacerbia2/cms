import React, { memo, useMemo, useRef, useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ledgerKey } from '../hooks/useLedgers';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  /** Pilihan dari master. Kosong = belum ada yang bisa dipilih (mis. Ledger belum diisi). */
  options: string[];
  onChange: (value: string) => void;
  /** Nilai diketik yang tidak ada di master: ditandai merah, tidak dibuang. */
  invalid?: boolean;
  /** Pesan saat tidak ada pilihan sama sekali. */
  emptyHint?: string;
};

/**
 * Dropdown Ledger / Sub Ledger 1 yang tetap bisa diketik.
 *
 * Inputnya tetap input biasa - navigasi Enter/panah, tempel dari Excel, dan
 * penanda `data-*` di tabel tetap jalan. Daftar pilihan muncul saat diklik atau
 * saat mulai mengetik, tersaring oleh ketikan. Selama daftar terbuka, panah dan
 * Enter memilih dari daftar; sesudah ditutup, tombol-tombol itu kembali ke tabel.
 */
export const LedgerCombo = memo(function LedgerCombo({
  value, options, onChange, invalid, emptyHint, className, onKeyDown, onBlur, onFocus, ...inputProps
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const shown = useMemo(() => {
    const q = ledgerKey(query);
    return q ? options.filter((o) => ledgerKey(o).includes(q)) : options;
  }, [options, query]);

  const openList = (q: string) => {
    setQuery(q);
    const list = q ? options.filter((o) => ledgerKey(o).includes(ledgerKey(q))) : options;
    // Dibuka tanpa ketikan: sorot yang sedang terpilih, supaya kelihatan posisinya.
    const current = q ? 0 : list.findIndex((o) => o === value);
    setActive(Math.max(0, current));
    setOpen(true);
  };

  const pick = (option: string) => {
    onChange(option);
    setOpen(false);
    setQuery('');
  };

  const scrollTo = (index: number) =>
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next = Math.min(Math.max(active + (e.key === 'ArrowDown' ? 1 : -1), 0), Math.max(shown.length - 1, 0));
        setActive(next);
        scrollTo(next);
        return;
      }
      if (e.key === 'Enter' && shown[active]) {
        e.preventDefault();
        pick(shown[active]);
        return;
      }
      if (e.key === 'Tab' && query && shown[active]) {
        pick(shown[active]); // lalu pindah sel seperti biasa
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
    } else if (e.key === 'ArrowDown' && e.altKey) {
      e.preventDefault();
      openList('');
      return;
    }
    onKeyDown?.(e);
  };

  return (
    <PopoverPrimitive.Root open={open && options.length + (emptyHint ? 1 : 0) > 0} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor asChild>
        <Input
          {...inputProps}
          ref={inputRef}
          value={value}
          autoComplete="off"
          aria-invalid={invalid || undefined}
          title={invalid ? `"${value}" is not in the master list` : inputProps.title}
          onChange={(e) => {
            onChange(e.target.value);
            openList(e.target.value);
          }}
          onMouseDown={() => (open ? setOpen(false) : openList(''))}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onBlur={(e) => {
            setOpen(false);
            setQuery('');
            // "cost of goods" diketik tangan -> "Cost of Goods", ejaan master.
            const hit = options.find((o) => ledgerKey(o) === ledgerKey(value));
            if (hit && hit !== value) onChange(hit);
            onBlur?.(e);
          }}
          className={cn(className, invalid && 'text-rose-600 bg-rose-50 underline decoration-dotted decoration-rose-400')}
        />
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={2}
          // Fokus tetap di input: yang mengetik tidak boleh terputus karena daftar muncul.
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (e.target === inputRef.current) e.preventDefault();
          }}
          className="z-[60] min-w-[var(--radix-popover-trigger-width)] w-max max-w-[22rem] rounded-lg border border-primary/10 bg-white p-1 shadow-premium"
        >
          {/*
            Di dalam dialog (form create), Radix Dialog mengunci scroll lewat
            react-remove-scroll: listener wheel/touchmove di document membatalkan
            scroll apa pun di luar isi dialog - dan daftar ini di-portal ke body.
            Event-nya dihentikan di sini sebelum sampai ke document, jadi daftar
            bisa di-scroll tanpa harus dipindah ke dalam dialog (yang overflow-nya
            tersembunyi dan akan memotong daftar di baris bawah).
          */}
          <div
            ref={listRef}
            className="max-h-64 overflow-y-auto overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {shown.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-muted-foreground">
                {options.length === 0 ? emptyHint : 'No matches'}
              </div>
            ) : (
              shown.map((option, i) => (
                <div
                  key={option}
                  data-index={i}
                  // mousedown, bukan click: kalau menunggu click, input sudah blur dan daftar sudah tertutup.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(option);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    'cursor-pointer rounded-md px-3 py-1.5 text-[13px] whitespace-nowrap',
                    i === active ? 'bg-primary/10 text-primary' : 'text-primary/80',
                    option === value && 'font-bold',
                  )}
                >
                  {option}
                </div>
              ))
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
});
