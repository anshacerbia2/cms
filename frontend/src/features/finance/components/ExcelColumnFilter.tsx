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
import { cn } from "@/lib/utils";

interface ExcelColumnFilterProps {
  columnKey: string;
  label: string;
  data: any[];
  activeFilters: Set<string> | null;
  onFilterChange: (values: Set<string> | null) => void;
  onSort: (direction: 'asc' | 'desc') => void;
  currentSort?: { key: string, direction: 'asc' | 'desc' | null } | null;
  valueFormatter?: (val: any) => string;
  type?: 'text' | 'date';
  dateKey?: string;
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
  dateKey
}: ExcelColumnFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
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

    const sortedLabels = Array.from(dToR.keys()).sort((a, b) => {
      const numA = parseFloat(a.replace(/[^0-9,-]/g, '').replace(',', '.'));
      const numB = parseFloat(b.replace(/[^0-9,-]/g, '').replace(',', '.'));
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

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
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          "ml-1.5 p-1 rounded-md hover:bg-primary/5 transition-all inline-flex items-center cursor-pointer opacity-40 hover:opacity-100 group",
          activeFilters && "opacity-100 bg-secondary/10 text-secondary"
        )}>
          <Filter 
            className={cn("h-3 w-3 transition-transform", activeFilters && "fill-secondary/20")} 
            strokeWidth={1.5} 
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-3 bg-white/95 backdrop-blur-xl border-primary/10 shadow-2xl rounded-2xl" align="start">
        <div className="space-y-3">
          <div className="text-[11px] font-black uppercase text-primary tracking-widest pl-1">Filter: {label}</div>
          
          {/* Sorting */}
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
                "mr-1 h-3.5 w-3.5",
                currentSort?.key === columnKey && currentSort?.direction === 'asc' ? "text-secondary" : "text-primary/40"
              )} /> Sort A to Z
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
                "mr-1 h-3.5 w-3.5",
                currentSort?.key === columnKey && currentSort?.direction === 'desc' ? "text-secondary" : "text-primary/40"
              )} /> Sort Z to A
            </Button>
          </div>

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
          <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
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
                          <span className="text-[11px] font-medium text-primary/50 truncate">
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
                  <span className="text-[12px] font-bold text-primary truncate">
                    {valueFormatter ? valueFormatter(val) : (val || "(Blanks)")}
                  </span>
                </label>
              ))
            )}
          </div>

          <DropdownMenuSeparator className="bg-primary/5" />

          {/* Actions */}
          <div className="flex justify-between items-center pt-1">
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
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
