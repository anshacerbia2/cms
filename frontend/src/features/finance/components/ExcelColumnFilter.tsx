import { useMemo, useState, useEffect } from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, Search, ArrowUpAZ, ArrowDownZA } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExcelColumnFilterProps {
  columnKey: string;
  label: string;
  data: any[];
  activeFilters: Set<string> | null;
  onFilterChange: (values: Set<string> | null) => void;
  onSort: (direction: 'asc' | 'desc') => void;
  valueFormatter?: (val: any) => string;
}

export function ExcelColumnFilter({ 
  columnKey, 
  label, 
  data, 
  activeFilters, 
  onFilterChange,
  onSort,
  valueFormatter
}: ExcelColumnFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const uniqueValues = useMemo(() => {
    const values = new Set<string>();
    data.forEach(item => {
      const val = item[columnKey];
      if (val !== undefined && val !== null) {
        values.add(String(val));
      }
    });
    return Array.from(values).sort((a, b) => {
      // Numerical sort if possible
      const numA = Number(a);
      const numB = Number(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      // Default alphabetical sort
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [data, columnKey]);

  // Handle local checkbox state
  // We sync with activeFilters when opening
  const [tempFilters, setTempFilters] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setTempFilters(activeFilters ? new Set(activeFilters) : new Set(uniqueValues));
      setSearchTerm("");
    }
  }, [isOpen, activeFilters, uniqueValues]);

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
      onFilterChange(new Set(tempFilters));
    }
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          "ml-1 p-1.5 rounded-md hover:bg-primary/10 transition-colors inline-flex items-center cursor-pointer",
          activeFilters && "text-primary bg-primary/20 ring-1 ring-primary/30"
        )}>
          <Filter className={cn("h-3 w-3", activeFilters ? "fill-primary/20" : "text-muted-foreground/50")} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-3 bg-white/95 backdrop-blur-xl border-primary/10 shadow-2xl rounded-2xl" align="start">
        <div className="space-y-3">
          <div className="text-[11px] font-black uppercase text-primary tracking-widest pl-1">Filter: {label}</div>
          
          {/* Sorting */}
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-[11px] font-bold border-primary/10 hover:bg-primary/5 justify-start px-2"
              onClick={() => { onSort('asc'); setIsOpen(false); }}
            >
              <ArrowUpAZ className="mr-2 h-3.5 w-3.5 text-primary" /> Sort A to Z
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-[11px] font-bold border-primary/10 hover:bg-primary/5 justify-start px-2"
              onClick={() => { onSort('desc'); setIsOpen(false); }}
            >
              <ArrowDownZA className="mr-2 h-3.5 w-3.5 text-primary" /> Sort Z to A
            </Button>
          </div>

          <DropdownMenuSeparator className="bg-primary/5" />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-primary" />
            <Input
              placeholder="Search values..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-[12px] font-bold bg-primary/[0.03] border-primary/10 focus-visible:ring-primary/20 text-primary"
            />
          </div>

          {/* List */}
          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
            <label className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors">
              <input 
                type="checkbox" 
                className="h-3.5 w-3.5 rounded border-primary/20 text-primary focus:ring-primary/20 accent-primary"
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              <span className="text-[12px] font-black uppercase text-primary tracking-tight">(Select All)</span>
            </label>
            {filteredUniqueValues.map(val => (
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
            ))}
          </div>

          <DropdownMenuSeparator className="bg-primary/5" />

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
