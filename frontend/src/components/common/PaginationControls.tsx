import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaginationMeta } from "@/types/pagination";

interface PaginationControlsProps {
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
  isFetching?: boolean;
}

export function PaginationControls({ 
  meta, 
  onPageChange, 
  isFetching 
}: PaginationControlsProps) {
  if (!meta || meta.total === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-primary/5 mt-auto">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground opacity-60">
        Showing Page {meta.page} of {meta.lastPage} ({meta.total} Total)
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-primary/5 hover:bg-primary/5 text-primary"
          onClick={() => onPageChange(1)}
          disabled={meta.page === 1 || isFetching}
        >
          <ChevronsLeft size={14} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-primary/5 hover:bg-primary/5 text-primary"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={meta.page === 1 || isFetching}
        >
          <ChevronLeft size={14} />
        </Button>

        <div className="flex items-center gap-1 mx-2">
          {(() => {
            const pages = [];
            const { page, lastPage } = meta;
            const range = 1; // Number of neighbors to show

            for (let i = 1; i <= lastPage; i++) {
              if (
                i === 1 || 
                i === lastPage || 
                (i >= page - range && i <= page + range)
              ) {
                // If there's a gap between the first page and the current range
                if (pages.length > 0 && i > pages[pages.length - 1] + 1) {
                  pages.push(-1); // Indicator for ellipsis
                }
                pages.push(i);
              }
            }

            return pages.map((p, idx) => (
              p === -1 ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground opacity-30 text-[10px] font-bold">...</span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  className={`h-8 w-8 rounded-lg text-[10px] font-black transition-all ${
                    p === page 
                      ? "bg-primary text-white shadow-premium scale-110 z-10" 
                      : "border-primary/5 hover:bg-primary/5 text-muted-foreground font-medium"
                  }`}
                  onClick={() => onPageChange(p)}
                  disabled={isFetching}
                >
                  {p}
                </Button>
              )
            ));
          })()}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-primary/5 hover:bg-primary/5 text-primary"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={meta.page === meta.lastPage || isFetching}
        >
          <ChevronRight size={14} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-primary/5 hover:bg-primary/5 text-primary"
          onClick={() => onPageChange(meta.lastPage)}
          disabled={meta.page === meta.lastPage || isFetching}
        >
          <ChevronsRight size={14} />
        </Button>
      </div>
    </div>
  );
}
