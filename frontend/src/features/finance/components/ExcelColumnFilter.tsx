import { useMemo, useState, useEffect } from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, Search, ArrowUpAZ, ArrowDownZA, ChevronRight, ChevronDown } from "lucide-react";
import { cn, compareCellValues } from "@/lib/utils";

interface ExcelColumnFilterProps {
  columnKey: string;
  label: string;
  data: any[];
  activeFilters: Set<string> | null;
  onFilterChange: (values: Set<string> | null) => void;
  onSort?: (direction: 'asc' | 'desc') => void;
  currentSort?: { key: string, direction: 'asc' | 'desc' | null } | null;
  valueFormatter?: (val: any) => string;
  type?: 'text' | 'date';
  dateKey?: string;
  /** Hanya tombol urut - tanpa pencarian dan daftar nilai. Untuk kolom seperti "No". */
  sortOnly?: boolean;
  /** Label tombol urut naik/turun; default "A to Z" / "Z to A". */
  sortLabels?: [string, string];
  /** Rentang angka yang sedang aktif (inklusif). Dipakai bersama `onRangeChange`. */
  range?: { min: number | null; max: number | null };
  /** Kalau diisi, popup menampilkan input rentang angka Dari / Sampai. */
  onRangeChange?: (range: { min: number | null; max: number | null }) => void;
}

interface DateTree {
  [year: string]: {
    [month: string]: Set<string>;
  };
}

export function ExcelColumnFilter({ 
  columnKey, 
  label, 
  data, 
  activeFilters, 
  onFilterChange,
  onSort,
  currentSort,
  valueFormatter,
  type = 'text',
  dateKey,
  sortOnly = false,
  sortLabels = ['A to Z', 'Z to A'],
  range,
  onRangeChange,
}: ExcelColumnFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Isian rentang selama popup terbuka; baru berlaku saat Terapkan / Enter.
  const [rangeDraft, setRangeDraft] = useState({ min: '', max: '' });
  useEffect(() => {
    if (isOpen) setRangeDraft({ min: range?.min?.toString() ?? '', max: range?.max?.toString() ?? '' });
  }, [isOpen, range]);
  const isRangeActive = !!range && (range.min !== null || range.max !== null);
  const applyRange = () => {
    const num = (v: string) => (v.trim() === '' || Number.isNaN(Number(v)) ? null : Number(v));
    let min = num(rangeDraft.min);
    let max = num(rangeDraft.max);
    if (min !== null && max !== null && min > max) [min, max] = [max, min];
    onRangeChange?.({ min, max });
    setIsOpen(false);
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const { uniqueValues, displayToRawMap, dateTree } = useMemo(() => {
    const dToR = new Map<string, Set<string>>();
    const tree: DateTree = {};

    data.forEach(item => {
      const rawVal = String(item[columnKey] || "");
      const displayedVal = valueFormatter ? valueFormatter(item[columnKey]) : (rawVal || "(Blanks)");
      
      if (!dToR.has(displayedVal)) {
        dToR.set(displayedVal, new Set());
      }
      dToR.get(displayedVal)!.add(rawVal);

      // Build Date Tree if type is date
      if (type === 'date') {
        const dateVal = dateKey ? item[dateKey] : item[columnKey];
        let year = "(Blanks)";
        let month = "(Blanks)";

        if (dateVal) {
          const d = new Date(dateVal);
          if (!isNaN(d.getTime())) {
            year = d.getFullYear().toString();
            month = d.toLocaleString('en-US', { month: 'long' });
          }
        }

        if (!tree[year]) tree[year] = {};
        if (!tree[year][month]) tree[year][month] = new Set();
        tree[year][month].add(displayedVal);
      }
    });

    const sortedLabels = Array.from(dToR.keys()).sort(compareCellValues);

    return { uniqueValues: sortedLabels, displayToRawMap: dToR, dateTree: tree };
  }, [data, columnKey, valueFormatter, type, dateKey]);

  // Handle local checkbox state
  const [tempFilters, setTempFilters] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      // Find which displayed values are currently active based on raw filters
      if (activeFilters) {
        const activeLabels = new Set<string>();
        uniqueValues.forEach(label => {
          const raws = displayToRawMap.get(label);
          if (raws && Array.from(raws).some(r => activeFilters.has(r))) {
            activeLabels.add(label);
          }
        });
        setTempFilters(activeLabels);
      } else {
        setTempFilters(new Set(uniqueValues));
      }
      setSearchTerm("");
    }
  }, [isOpen, activeFilters, uniqueValues, displayToRawMap]);

  const filteredUniqueValues = uniqueValues.filter(v => 
    v.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleValue = (val: string) => {
    const newFilters = new Set(tempFilters);
    if (newFilters.has(val)) {
      newFilters.delete(val);
    } else {
      newFilters.add(val);
    }
    setTempFilters(newFilters);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setTempFilters(new Set(uniqueValues));
    } else {
      setTempFilters(new Set());
    }
  };

  const isAllSelected = tempFilters.size === uniqueValues.length;

  const handleApply = () => {
    if (tempFilters.size === uniqueValues.length) {
      onFilterChange(null);
    } else {
      // Convert selected labels back to ALL corresponding raw values
      const rawToFilter = new Set<string>();
      tempFilters.forEach(label => {
        const raws = displayToRawMap.get(label);
        raws?.forEach(r => rawToFilter.add(r));
      });
      onFilterChange(rawToFilter);
    }
    setIsOpen(false);
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const isYearSelected = (year: string) => {
    const months = dateTree[year];
    return Object.values(months).every(labels => 
      Array.from(labels).every(l => tempFilters.has(l))
    );
  };

  const isYearIndeterminate = (year: string) => {
    const months = dateTree[year];
    const allLabels = Object.values(months).flatMap(s => Array.from(s));
    const selectedCount = allLabels.filter(l => tempFilters.has(l)).length;
    return selectedCount > 0 && selectedCount < allLabels.length;
  };

  const isMonthSelected = (year: string, month: string) => {
    const labels = dateTree[year][month];
    return Array.from(labels).every(l => tempFilters.has(l));
  };

  const isMonthIndeterminate = (year: string, month: string) => {
    const labels = Array.from(dateTree[year][month]);
    const selectedCount = labels.filter(l => tempFilters.has(l)).length;
    return selectedCount > 0 && selectedCount < labels.length;
  };

  const toggleYear = (year: string) => {
    const months = dateTree[year];
    const allLabels = Object.values(months).flatMap(s => Array.from(s));
    const isSelected = isYearSelected(year);
    
    const newFilters = new Set(tempFilters);
    allLabels.forEach(l => {
      if (isSelected) newFilters.delete(l);
      else newFilters.add(l);
    });
    setTempFilters(newFilters);
  };

  const toggleMonth = (year: string, month: string) => {
    const labels = Array.from(dateTree[year][month]);
    const isSelected = isMonthSelected(year, month);
    
    const newFilters = new Set(tempFilters);
    labels.forEach(l => {
      if (isSelected) newFilters.delete(l);
      else newFilters.add(l);
    });
    setTempFilters(newFilters);
  };

  return (
    // modal={false}: tanpa ini Radix mengunci scroll halaman selama popup
    // terbuka, jadi popup yang muncul di dekat tepi layar tidak bisa dijangkau.
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          "ml-1.5 p-1 rounded-md hover:bg-primary/5 transition-all inline-flex items-center cursor-pointer opacity-40 hover:opacity-100 group",
          (activeFilters || isRangeActive || (sortOnly && currentSort?.key === columnKey && currentSort?.direction)) && "opacity-100 bg-secondary/10 text-secondary"
        )}>
          <Filter 
            className={cn("h-3 w-3 transition-transform", activeFilters && "fill-secondary/20")} 
            strokeWidth={1.5} 
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        // Radix menggeser popup agar tetap di dalam layar; lebar dan tingginya juga
        // dibatasi ukuran layar supaya isi yang panjang tidak menjorok keluar.
        // Popup jadi kolom flex: hanya daftar nilai yang ikut scroll, sehingga judul,
        // tombol urut, pencarian, dan tombol OK selalu kelihatan di layar pendek.
        collisionPadding={12}
        className="flex flex-col overflow-hidden w-[22rem] max-w-[calc(100vw-1.5rem)] max-h-[min(var(--radix-dropdown-menu-content-available-height,100vh),calc(100vh_-_2rem))] p-3 bg-white/95 backdrop-blur-xl border-primary/10 shadow-2xl rounded-2xl z-[150]"
      >
        <div className="flex min-h-0 flex-1 flex-col space-y-3">
          <div className="text-[11px] font-black uppercase text-primary tracking-widest pl-1">{sortOnly ? 'Sort' : 'Filter'}: {label}</div>
          
          {/* Sorting */}
          {onSort && (
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-9 text-[10px] font-black uppercase tracking-tight bg-white border-0 hover:bg-primary/[0.03] justify-start px-2.5 rounded-xl shadow-sm transition-none",
                  currentSort?.key === columnKey && currentSort?.direction === 'asc' && "bg-secondary/10 text-secondary hover:bg-secondary/15"
                )}
                onClick={() => { onSort('asc'); setIsOpen(false); }}
              >
                <ArrowUpAZ className={cn(
                  "mr-1.5 h-3.5 w-3.5 opacity-60",
                  currentSort?.key === columnKey && currentSort?.direction === 'asc' && "opacity-100 text-secondary"
                )} />
                {sortLabels[0]}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-9 text-[10px] font-black uppercase tracking-tight bg-white border-0 hover:bg-primary/[0.03] justify-start px-2.5 rounded-xl shadow-sm transition-none",
                  currentSort?.key === columnKey && currentSort?.direction === 'desc' && "bg-secondary/10 text-secondary hover:bg-secondary/15"
                )}
                onClick={() => { onSort('desc'); setIsOpen(false); }}
              >
                <ArrowDownZA className={cn(
                  "mr-1.5 h-3.5 w-3.5 opacity-60",
                  currentSort?.key === columnKey && currentSort?.direction === 'desc' && "opacity-100 text-secondary"
                )} />
                {sortLabels[1]}
              </Button>
            </div>
          )}

          {onRangeChange && (
            <>
              <DropdownMenuSeparator className="bg-primary/5" />
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase text-primary/50 tracking-widest pl-1">Range</div>
                <div className="flex items-center gap-2">
                  {(['min', 'max'] as const).map((k) => (
                    <Input
                      key={k}
                      type="number"
                      inputMode="numeric"
                      placeholder={k === 'min' ? 'From' : 'To'}
                      value={rangeDraft[k]}
                      onChange={(e) => setRangeDraft((d) => ({ ...d, [k]: e.target.value }))}
                      // Menu Radix menangkap ketikan untuk pencarian item; di input ini tidak.
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') applyRange();
                      }}
                      className="h-9 text-[12px] font-bold bg-white border-0 rounded-xl shadow-sm focus-visible:ring-0 text-primary"
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-[10px] font-black uppercase bg-white shadow-sm rounded-xl"
                    onClick={() => { onRangeChange({ min: null, max: null }); setIsOpen(false); }}
                  >
                    Clear
                  </Button>
                  <Button size="sm" className="h-8 text-[10px] font-black uppercase rounded-xl" onClick={applyRange}>
                    Apply
                  </Button>
                </div>
              </div>
            </>
          )}

          {!sortOnly && (
          <>
          <DropdownMenuSeparator className="bg-primary/5" />

          {/* Search */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-primary/30" />
            <Input
              placeholder="Search values..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 text-[11px] font-bold bg-white border-0 focus-visible:ring-0 text-primary rounded-xl shadow-sm placeholder:text-primary/20"
            />
          </div>

          {/* List */}
          {/* Nilai yang panjang digeser ke samping, bukan dipotong. Baris-barisnya
              selebar isinya (min-w-max) supaya scroll mendatar benar-benar jalan. */}
          <div className="min-h-0 flex-1 max-h-64 overflow-y-auto overflow-x-auto pr-1 custom-scrollbar">
            <div className="space-y-0.5 min-w-max">
            <label className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors">
              <input 
                type="checkbox" 
                className="h-3.5 w-3.5 rounded border-primary/20 text-primary focus:ring-primary/20 accent-primary"
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              <span className="text-[12px] font-black uppercase text-primary tracking-tight">(Select All)</span>
            </label>

            {type === 'date' && !searchTerm ? (
              // Hierarchical Date Tree
              Object.keys(dateTree).sort((a, b) => b.localeCompare(a)).map(year => (
                <div key={year} className="space-y-0.5">
                  <div className="flex items-center p-1.5 rounded-lg hover:bg-primary/5 transition-colors group/year">
                    {year !== "(Blanks)" ? (
                      <button 
                        onClick={() => toggleExpand(year)}
                        className="p-1 hover:bg-primary/10 rounded mr-1 cursor-pointer"
                      >
                        {expandedItems.has(year) ? <ChevronDown size={12} className="text-primary/40" /> : <ChevronRight size={12} className="text-primary/40" />}
                      </button>
                    ) : (
                      <div className="w-6" />
                    )}
                    <label className="flex items-center space-x-2.5 flex-grow cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="h-3.5 w-3.5 rounded border-primary/20 text-primary focus:ring-primary/20 accent-primary"
                          checked={isYearSelected(year)}
                          ref={el => { if (el) el.indeterminate = isYearIndeterminate(year); }}
                          onChange={() => toggleYear(year)}
                        />
                      <span className="text-[12px] font-bold text-primary">{year}</span>
                    </label>
                  </div>

                  {year !== "(Blanks)" && expandedItems.has(year) && Object.keys(dateTree[year]).sort((a, b) => {
                    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                    return months.indexOf(a) - months.indexOf(b);
                  }).map(month => (
                    <div key={month} className="ml-6 space-y-0.5">
                      <div className="flex items-center p-1.5 rounded-lg hover:bg-primary/5 transition-colors group/month">
                        <button 
                          onClick={() => toggleExpand(`${year}-${month}`)}
                          className="p-1 hover:bg-primary/10 rounded mr-1 cursor-pointer"
                        >
                          {expandedItems.has(`${year}-${month}`) ? <ChevronDown size={12} className="text-primary/40" /> : <ChevronRight size={12} className="text-primary/40" />}
                        </button>
                        <label className="flex items-center space-x-2.5 flex-grow cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="h-3.5 w-3.5 rounded border-primary/20 text-primary focus:ring-primary/20 accent-primary"
                              checked={isMonthSelected(year, month)}
                              ref={el => { if (el) el.indeterminate = isMonthIndeterminate(year, month); }}
                              onChange={() => toggleMonth(year, month)}
                            />
                          <span className="text-[11px] font-medium text-primary/70">{month}</span>
                        </label>
                      </div>

                      {expandedItems.has(`${year}-${month}`) && Array.from(dateTree[year][month]).sort((a, b) => {
                        const dayA = parseInt(a.split(' ')[0]) || 0;
                        const dayB = parseInt(b.split(' ')[0]) || 0;
                        return dayA - dayB;
                      }).map(val => (
                        <label key={val} className="flex items-center space-x-2.5 p-1.5 ml-10 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors">
                          <input 
                            type="checkbox" 
                            className="h-3.5 w-3.5 rounded border-primary/20 text-primary focus:ring-primary/20 accent-primary"
                            checked={tempFilters.has(val)}
                            onChange={() => toggleValue(val)}
                          />
                          <span className="text-[11px] font-medium text-primary/50 whitespace-nowrap">
                            {val}
                          </span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              // Standard Flat List (Used for text or when searching)
              filteredUniqueValues.map(val => (
                <label key={val} className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    className="h-3.5 w-3.5 rounded border-primary/20 text-primary focus:ring-primary/20 accent-primary"
                    checked={tempFilters.has(val)}
                    onChange={() => toggleValue(val)}
                  />
                  <span className="text-[12px] font-bold text-primary whitespace-nowrap">
                    {valueFormatter ? valueFormatter(val) : (val || "(Blanks)")}
                  </span>
                </label>
              ))
            )}
            </div>
          </div>

          <DropdownMenuSeparator className="bg-primary/5" />

          {/* Actions */}
          <div className="flex shrink-0 justify-between items-center pt-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-[10px] font-black uppercase text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => {
                onFilterChange(null);
                setIsOpen(false);
              }}
            >
              Clear
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-3 text-[11px] font-bold text-primary hover:bg-primary/5"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                className="h-8 px-5 text-[11px] font-bold bg-primary hover:bg-primary/90 text-white rounded-lg shadow-lg shadow-primary/20"
                onClick={handleApply}
              >
                OK
              </Button>
            </div>
          </div>
          </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
