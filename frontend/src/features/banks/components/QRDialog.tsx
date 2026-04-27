import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { QrCode, Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface QRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  data: string;
}

export function QRDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  data,
}: QRDialogProps) {
  const [copied, setCopied] = useState(false);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(data);
    setCopied(true);
    toast.success("Details copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${title.toLowerCase().replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("QR Code downloaded successfully");
    } catch (error) {
      toast.error("Failed to download QR Code");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] border-primary/5 shadow-premium overflow-hidden p-0 bg-white">
        <div className="bg-primary/5 px-8 pt-10 pb-8 text-center border-b border-primary/5">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 shadow-inner ring-4 ring-white">
            <QrCode className="w-8 h-8 text-primary" strokeWidth={2.5} />
          </div>
          <DialogTitle className="text-xl font-black text-primary tracking-tight uppercase mb-2">
            {title}
          </DialogTitle>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-60">
            {subtitle}
          </p>
        </div>

        <div className="px-10 py-10 flex flex-col items-center">
          <div className="relative group p-4 bg-white rounded-[2rem] shadow-xl border border-primary/5 ring-8 ring-primary/5 mb-8 transition-transform hover:scale-105 duration-300">
            <img 
              src={qrUrl} 
              alt="Bank QR Code" 
              className="w-48 h-48 rounded-xl select-none pointer-events-none"
            />
            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors rounded-[2rem]" />
          </div>

          <div className="w-full space-y-3">
            <Button 
              onClick={handleDownload}
              className="w-full h-12 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px] shadow-lg active:scale-95 transition-all gap-2"
            >
              <Download size={16} /> Download PNG
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={handleCopy}
                className="flex-1 h-11 rounded-xl border-primary/10 font-bold uppercase text-[10px] tracking-widest gap-2 bg-white hover:bg-primary/5 transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy Data"}
              </Button>
            </div>
          </div>

          <p className="mt-8 text-[9px] font-medium text-muted-foreground/40 text-center leading-relaxed">
            Scan this QR code to quickly access settlement details.<br />
            Powered by Panconvince Enterprise Finance.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
