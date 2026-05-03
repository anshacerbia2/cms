import { useState } from "react";
import { Plus, MoreVertical, Edit2, Trash2, Search, MapPin, Landmark, QrCode } from "lucide-react";
import { useBanks } from "../hooks/useBanks";
import { QRDialog } from "./QRDialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { BankDialog } from "./BankDialog";
import { Bank } from "../types";
import { PaginationControls } from "@/components/common/PaginationControls";
import { useDebounce } from "use-debounce";
import { Input } from "@/components/ui/input";

export function BanksTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [qrData, setQrData] = useState<{ title: string, subtitle: string, data: string }>({ title: "", subtitle: "", data: "" });

  const { 
    banksQuery, 
  } = useBanks({
    banks: { page, search: debouncedSearch, limit: 10, enabled: true },
  });

  const handleCreate = () => {
    setSelectedBank(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (bank: Bank) => {
    setSelectedBank(bank);
    setIsDialogOpen(true);
  };

  const handleShowQR = (bank: Bank) => {
    setQrData({
      title: bank.bankName,
      subtitle: `Bank Reference: ${bank.bankCode}`,
      data: JSON.stringify({
        name: bank.bankName,
        code: bank.bankCode,
        brand: bank.bankBrand,
        address: bank.bankAddress
      })
    });
    setIsQRDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col lg:flex-row items-center gap-4 bg-white/50 p-2 rounded-xl border border-primary/5 backdrop-blur-sm mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
          <Input 
            placeholder="Search banks..." 
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 text-[13px] font-medium"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Button 
          onClick={handleCreate}
          className="h-12 px-6 bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-sm flex items-center justify-center gap-2 shrink-0 font-bold transition-all active:scale-95 cursor-pointer w-full lg:w-auto"
        >
          <Plus size={20} strokeWidth={3} />
          <span className="text-[13px]">Add Bank Ref</span>
        </Button>
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-premium border border-primary/5 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bank Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Short Name</TableHead>
              <TableHead>HQ Address</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banksQuery.isPending ? (
              [1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i} className="border-primary/5 hover:bg-transparent">
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-9 w-9 rounded-xl" />
                      <div className="flex flex-col">
                        <Skeleton className="h-3 w-32 rounded-md" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[11px] font-black uppercase tracking-widest bg-primary/10 animate-pulse text-transparent select-none rounded-md px-2 py-1">
                      CODE
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] bg-primary/10 animate-pulse text-transparent select-none rounded-lg px-2.5 py-1">
                      BRAND NAME
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <span className="text-[10px] font-bold uppercase bg-primary/10 animate-pulse text-transparent select-none rounded-md">
                        HEADQUARTERS ADDRESS PLACEHOLDER STRT
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 rounded-xl ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : banksQuery.data?.data.length === 0 ? (
              <TableRow className="border-primary/5 hover:bg-transparent">
                <TableCell colSpan={5} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-20">
                    <Search size={40} strokeWidth={1} />
                    <p className="text-xs font-bold uppercase tracking-widest">No banks found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              banksQuery.data?.data.map((bank: any) => (
                <TableRow key={bank.id} className="group whitespace-nowrap">
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Landmark size={18} className="text-primary" />
                      </div>
                      <span className="font-extrabold text-primary text-xs uppercase tracking-tight">{bank.bankName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded-md opacity-80">{bank.bankCode}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] font-black text-secondary uppercase tracking-[0.15em] bg-secondary/10 px-2.5 py-1 rounded-lg">
                      {bank.bankBrand}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-primary/60">
                      <MapPin size={14} className="shrink-0" />
                      <span className="text-[10px] font-bold uppercase line-clamp-1">{bank.bankAddress || "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/5 cursor-pointer">
                          <MoreVertical size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-primary/5 shadow-premium">
                        <DropdownMenuItem onClick={() => handleEdit(bank)} className="text-[10px] font-bold uppercase cursor-pointer">
                          <Edit2 size={14} className="mr-2" /> Edit Reference
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShowQR(bank)} className="text-[10px] font-bold uppercase cursor-pointer">
                          <QrCode size={14} className="mr-2" /> View QR Code
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-[10px] font-bold uppercase text-destructive cursor-pointer">
                          <Trash2 size={14} className="mr-2" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationControls 
        meta={banksQuery.data?.meta} 
        onPageChange={setPage}
        isFetching={banksQuery.isFetching}
      />

      <BankDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        bank={selectedBank}
      />

      <QRDialog 
        open={isQRDialogOpen}
        onOpenChange={setIsQRDialogOpen}
        {...qrData}
      />
    </div>
  );
}
