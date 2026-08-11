import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export interface DetailItem {
  label: string;
  value: React.ReactNode;
}

interface DetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  data: DetailItem[];
  icon?: React.ReactNode;
}

export function DetailModal({
  open,
  onOpenChange,
  title,
  subtitle,
  data,
  icon = <Info className="w-8 h-8 text-secondary shrink-0" strokeWidth={2.5} />
}: DetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] rounded-3xl border-primary/5 shadow-premium overflow-hidden p-0 gap-0 bg-white">
        <div className="bg-white px-8 pt-8 pb-6 border-b border-primary/5 relative z-10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary tracking-tight uppercase flex items-center gap-3">
              {icon}
              {title}
            </DialogTitle>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-2 opacity-70">
                {subtitle}
              </p>
            )}
          </DialogHeader>
        </div>

        <div className="px-8 py-8 grid grid-cols-2 gap-6 relative z-10 max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-50/50">
          {data.map((item, idx) => (
            <div key={idx} className="space-y-2">
              <Label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                {item.label}
              </Label>
              <div className="min-h-[44px] h-auto py-2 rounded-xl bg-muted/20 border border-primary/10 shadow-none font-medium text-[13px] px-3 flex items-center text-primary break-words">
                {item.value !== null && item.value !== undefined && item.value !== "" ? (
                  item.value
                ) : (
                  <span className="text-muted-foreground/40 italic text-xs">N/A</span>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <DialogFooter className="px-8 pt-4 pb-8 border-t border-primary/5 gap-3 relative z-10 flex-row justify-end bg-white">
          <Button
            onClick={() => onOpenChange(false)}
            className="h-11 px-10 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold uppercase tracking-widest text-[10px] shadow-premium cursor-pointer"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
