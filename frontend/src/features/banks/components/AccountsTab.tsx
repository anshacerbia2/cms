import { useState, useEffect, useMemo } from "react";
import { Plus, MoreVertical, Edit2, Trash2, Search, Building2, Banknote, CreditCard, Eye } from "lucide-react";
import { useBanks } from "../hooks/useBanks";
import { useAuthStore } from "@/store/authStore";
import { DetailModal } from "@/components/common/DetailModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { InternalAccountDialog } from "./InternalAccountDialog";
import { InternalAccount } from "../types";
import { PaginationControls } from "@/components/common/PaginationControls";
import { useDebounce } from "use-debounce";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AccountsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("BANK");
  const [debouncedSearch] = useDebounce(search, 500);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedType, debouncedSearch]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<InternalAccount | null>(null);
  const [selectedViewAccount, setSelectedViewAccount] = useState<InternalAccount | null>(null);

  const { can } = useAuthStore();
  const { 
    internalAccountsQuery, 
    banksQuery,
    createInternalAccount,
    updateInternalAccount,
    deleteInternalAccount 
  } = useBanks({
    accounts: { search: debouncedSearch, limit: 1000, enabled: true },
    banks: { limit: 100, enabled: isDialogOpen }, // Only fetch banks when dialog is open
  });

  // Client-side filtering and pagination logic
  const filteredAccounts = useMemo(() => {
    const data = internalAccountsQuery.data?.data || [];
    return data.filter((acc: any) => 
      acc.type === selectedType
    );
  }, [internalAccountsQuery.data?.data, selectedType]);

  const pageSize = 6;
  const totalItems = filteredAccounts.length;
  const lastPage = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedAccounts = useMemo(() => {
    return filteredAccounts.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredAccounts, page, pageSize]);

  const customMeta = {
    total: totalItems,
    lastPage: lastPage,
    page: page,
    limit: pageSize,
  };

  const handleCreate = () => {
    setSelectedAccount(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (account: InternalAccount) => {
    setSelectedAccount(account);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this account?")) {
      await deleteInternalAccount.mutateAsync(id);
    }
  };

  const handleView = (account: InternalAccount) => {
    setSelectedViewAccount(account);
    setIsViewModalOpen(true);
  };

  const handleDialogSubmit = (data: any) => {
    if (selectedAccount) {
      updateInternalAccount.mutate({ id: selectedAccount.id, ...data }, {
        onSuccess: () => setIsDialogOpen(false)
      });
    } else {
      createInternalAccount.mutate(data, {
        onSuccess: () => setIsDialogOpen(false)
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col lg:flex-row items-center gap-4 bg-white/50 p-2 rounded-xl border border-primary/5 backdrop-blur-sm mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
          <Input 
            placeholder="Search accounts..." 
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 text-[13px] font-medium"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Type Filter - Select Dropdown */}
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full lg:w-[180px] h-12 px-5 bg-white border-0 rounded-xl shadow-sm flex items-center gap-2 text-muted-foreground font-bold transition-all cursor-pointer">
            <SelectValue placeholder="Account Type" />
          </SelectTrigger>
          <SelectContent>
            {["BANK", "CASH", "OTHER"].map((type) => (
              <SelectItem 
                key={type} 
                value={type} 
              >
                {type === 'CASH' ? 'Cash - Non Bank' : type === 'BANK' ? 'Bank' : 'Other'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="h-12 px-6 flex items-center justify-center rounded-xl bg-white border-0 shadow-sm text-primary font-bold text-[13px] whitespace-nowrap">
          {filteredAccounts.length} Results
        </div>

        {can('internal-accounts.create') && (
          <Button 
            onClick={handleCreate}
            className="h-12 px-6 bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-sm flex items-center justify-center gap-2 shrink-0 font-bold transition-all active:scale-95 cursor-pointer w-full lg:w-auto"
          >
            <Plus size={20} strokeWidth={3} />
            <span className="text-[13px]">New Account</span>
          </Button>
        )}
      </div>



      {internalAccountsQuery.isPending ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white/70 backdrop-blur-md p-6 rounded-xl border border-primary/5 flex flex-col justify-between relative overflow-hidden h-[240px]">
              <div>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                    <div className="flex flex-col pt-0.5">
                      <Skeleton className="h-3 w-32 rounded-md mb-1.5" />
                      <span className="font-bold text-[10px] uppercase tracking-widest bg-primary/5 animate-pulse text-transparent select-none rounded-md block w-fit">
                        BANK NAME
                      </span>
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                
                <div className="space-y-4 py-2 border-t border-primary/5">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-extrabold uppercase tracking-widest bg-primary/5 animate-pulse text-transparent select-none rounded-sm block w-fit">
                      Account No
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black tracking-widest bg-primary/10 animate-pulse text-transparent select-none rounded-md block w-fit">
                        0000000000000
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-extrabold uppercase tracking-widest bg-primary/5 animate-pulse text-transparent select-none rounded-sm block w-fit">
                      Branch Office
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase bg-primary/10 animate-pulse text-transparent select-none rounded-md block w-fit">
                        KCP BRANCH NAME PLACEHOLDER
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-primary/5 border-dashed gap-4">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] bg-primary/10 animate-pulse text-transparent select-none px-2 py-0.5 rounded-lg">
                  TYPE
                </span>
                <span className="text-[10px] font-bold uppercase tracking-tighter bg-primary/5 animate-pulse text-transparent select-none rounded-md">
                  SWIFT: XXXXXXXX
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {filteredAccounts.length === 0 ? (
            <div className="py-32 flex flex-col items-center justify-center gap-4 bg-white/30 backdrop-blur-sm rounded-[2rem] border border-dashed border-primary/10">
              <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center opacity-20">
                <Search size={32} />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary/30">No Accounts Found</p>
                <p className="text-[12px] font-medium text-muted-foreground/40 italic">Try adjusting your search or type filters</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedAccounts.map((account: any) => (
            <div key={account.id} className={`group bg-white/70 backdrop-blur-md p-6 rounded-xl shadow-premium border border-primary/5 hover:border-primary/20 transition-all flex flex-col justify-between relative overflow-hidden ${account.type === 'BANK' ? 'min-h-[240px]' : 'min-h-0'}`}>
               <div>
                  <div className="flex items-start justify-between mb-4 gap-2">
                    <div className={`flex ${account.type === 'BANK' ? 'items-start' : 'items-center'} gap-3`}>
                       <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                          {account.type === 'CASH' ? <Banknote className="w-5 h-5 text-primary" /> :
                           account.type === 'OTHER' ? <CreditCard className="w-5 h-5 text-primary" /> :
                           <Building2 className="w-5 h-5 text-primary" />}
                       </div>
                       <div className="space-y-1">
                          <h4 className="font-extrabold text-primary text-[11px] uppercase tracking-tight">
                            {account.type === 'BANK' ? (account.bank?.bankName || account.bank?.name) : account.holderName}
                          </h4>
                          <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase opacity-60 italic">
                            {account.type === 'BANK' ? account.holderName : (account.bank?.bankName || account.bank?.name || '')}
                          </p>
                       </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/5 cursor-pointer">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-primary/5 shadow-premium">
                        <DropdownMenuItem onClick={() => handleView(account)} className="text-[10px] font-bold uppercase cursor-pointer">
                          <Eye size={14} className="mr-2" /> View Details
                        </DropdownMenuItem>
                        {can('internal-accounts.update') && (
                          <DropdownMenuItem onClick={() => handleEdit(account)} className="text-[10px] font-bold uppercase cursor-pointer">
                            <Edit2 size={14} className="mr-2" /> Edit
                          </DropdownMenuItem>
                        )}
                        {can('internal-accounts.delete') && (
                          <DropdownMenuItem onClick={() => handleDelete(account.id)} className="text-[10px] font-bold uppercase text-destructive cursor-pointer">
                            <Trash2 size={14} className="mr-2" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {account.type === 'BANK' && (
                    <div className="space-y-4 py-2 border-t border-primary/5">
                      <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest">Account Number</span>
                          <span className="text-xs font-black text-primary tracking-widest">{account.accountNo || "-"}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest">Branch Location</span>
                          <span className="text-xs font-black text-primary tracking-widest uppercase">{account.branch || "-"}</span>
                      </div>
                    </div>
                  )}
               </div>

               <div className="flex items-center justify-between pt-4 border-t border-primary/5 border-dashed gap-4">
                  <Badge variant="outline" className="bg-secondary/10 border-secondary/20 text-[10px] font-black uppercase px-2 py-0.5 rounded-lg text-secondary tracking-[0.15em]">
                    {account.type}
                  </Badge>
                  {account.type === 'BANK' && (
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter opacity-50">SWIFT: {account.swiftCode || "-"}</span>
                  )}
               </div>
            </div>
          ))}
            </div>
          )}
        </>
      )}

      <PaginationControls 
        meta={customMeta} 
        onPageChange={setPage}
        isFetching={internalAccountsQuery.isFetching}
      />

      <InternalAccountDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        onSubmit={handleDialogSubmit}
        banks={banksQuery.data?.data || []}
        account={selectedAccount}
        isSubmitting={createInternalAccount.isPending || updateInternalAccount.isPending}
        isLoadingBanks={banksQuery.isPending}
      />

      <DetailModal
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        title="Account Details"
        subtitle={selectedViewAccount?.holderName}
        data={[
          { label: "Holder Name", value: selectedViewAccount?.holderName },
          { label: "Account Type", value: selectedViewAccount?.type },
          { label: "Account No", value: selectedViewAccount?.accountNo },
          { label: "Branch", value: selectedViewAccount?.branch },
          { label: "Swift Code", value: selectedViewAccount?.swiftCode },
          { label: "Bank Name", value: selectedViewAccount?.bank?.bankName || selectedViewAccount?.bank?.name },
        ]}
      />
    </div>
  );
}
