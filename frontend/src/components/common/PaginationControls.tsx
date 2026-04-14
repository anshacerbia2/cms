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
  if (!meta || meta.lastPage <= 1) return null;

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
           {/* Simple page indicator for now, can be expanded to show page numbers */}
           <span className="h-8 min-w-8 px-2 flex items-center justify-center rounded-lg bg-primary text-white text-[10px] font-black">
              {meta.page}
           </span>
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
