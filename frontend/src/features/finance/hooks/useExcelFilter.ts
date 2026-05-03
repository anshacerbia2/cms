import { useState, useMemo } from "react";

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc' | null;
}

interface UseExcelFilterOptions<T> {
  data: T[];
  initialSort?: SortConfig;
  searchFields: (keyof T)[];
}

/**
 * useExcelFilter - A custom hook for cascading (chaining) filters, 
 * global search, and sorting logic. Designed specifically to power 
 * the ExcelColumnFilter component across financial ledgers.
 * 
 * Logic abstracted from the BankMutation master ledger.
 */
export function useExcelFilter<T extends Record<string, any>>({ 
  data, 
  initialSort = { key: '', direction: null },
  searchFields 
}: UseExcelFilterOptions<T>) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, Set<string> | null>>({});
  const [sort, setSort] = useState<SortConfig>(initialSort);

  // 1. Get Cascading Data (for dropdown options in ExcelColumnFilter)
  const getCascadingData = (excludeKey: string) => {
    let result = [...data];
    
    // Apply Global Search
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(row => 
        searchFields.some(field => String(row[field] || "").toLowerCase().includes(term))
      );
    }
    
    // Apply all OTHER column filters
    Object.entries(filters).forEach(([key, values]) => {
      if (key !== excludeKey && values && values.size > 0) {
        result = result.filter(row => values.has(String(row[key] || "")));
      }
    });
    
    return result;
  };

  // 2. Final Filtered & Sorted Result (for table display)
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Search
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(row => 
        searchFields.some(field => String(row[field] || "").toLowerCase().includes(term))
      );
    }

    // Column Filters
    Object.entries(filters).forEach(([key, values]) => {
      if (values && values.size > 0) {
        result = result.filter(row => values.has(String(row[key] || "")));
      }
    });

    // Sort
    if (sort.key && sort.direction) {
      result.sort((a, b) => {
        const valA = a[sort.key];
        const valB = b[sort.key];

        // 1. Better Date Sorting Detection
        // If it looks like a formatted date (e.g. "03 Mei 2026") or raw date
        const isDateKey = sort.key.toLowerCase().includes('date') || 
                          sort.key === 'colA' || 
                          sort.key === 'colC' || // For AR and Sales
                          sort.key === 'colL';   // For Sales

        if (isDateKey) {
          // Try to parse. If it fails (like "Mei"), we might need a better parser 
          // or just fallback to string sort which usually works for DD MMM YYYY if months are numeric, 
          // but here they are strings. 
          // However, for now, we'll keep the basic Date parse but add a fallback.
          const dateA = new Date(valA).getTime();
          const dateB = new Date(valB).getTime();
          if (!isNaN(dateA) && !isNaN(dateB)) {
             return sort.direction === 'asc' ? dateA - dateB : dateB - dateA;
          }
        }

        // 2. Numeric Sort (Handle currencies/numbers)
        const numA = typeof valA === 'number' ? valA : parseFloat(String(valA).replace(/[^0-9.-]+/g, ""));
        const numB = typeof valB === 'number' ? valB : parseFloat(String(valB).replace(/[^0-9.-]+/g, ""));
        
        if (!isNaN(numA) && !isNaN(numB) && String(valA).match(/[0-9]/)) {
          return sort.direction === 'asc' ? numA - numB : numB - numA;
        }
        
        // 3. String Sort Fallback
        const strA = String(valA || "").toLowerCase();
        const strB = String(valB || "").toLowerCase();
        return sort.direction === 'asc' 
          ? strA.localeCompare(strB, undefined, { numeric: true }) 
          : strB.localeCompare(strA, undefined, { numeric: true });
      });
    }

    return result;
  }, [data, search, filters, sort, searchFields]);

  const clearFilters = () => {
    setFilters({});
    setSearch("");
    setPage(1);
  };

  const isAnyFilterActive = search !== "" || Object.values(filters).some(s => s && s.size > 0);

  return {
    page,
    setPage,
    search,
    setSearch,
    filters,
    setFilters,
    sort,
    setSort,
    getCascadingData,
    filteredAndSortedData,
    clearFilters,
    isAnyFilterActive
  };
}
