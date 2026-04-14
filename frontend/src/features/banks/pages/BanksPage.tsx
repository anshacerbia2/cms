import { useState } from "react";
import { Plus, Building2, CreditCard, MoreVertical, Edit2, Trash2, Landmark, MapPin, Hash, User } from "lucide-react";
import { useBanks } from "../hooks/useBanks";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { InternalAccountDialog } from "../components/InternalAccountDialog";
import { BankDialog } from "../components/BankDialog";
import { CreateInternalAccountInput, CreateBankInput, InternalAccount } from "../types";
import { PaginationControls } from "@/components/common/PaginationControls";
import { useDebounce } from "use-debounce";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function BanksPage() {
  const [activeTab, setActiveTab] = useState("accounts");
  
  // Pagination & Search States
  const [bankPage, setBankPage] = useState(1);
  const [bankSearch, setBankSearch] = useState("");
  const [debouncedBankSearch] = useDebounce(bankSearch, 500);

  const [accountPage, setAccountPage] = useState(1);
  const [accountSearch, setAccountSearch] = useState("");
  const [debouncedAccountSearch] = useDebounce(accountSearch, 500);

  const { 
    banksQuery, 
    internalAccountsQuery, 
    createBank, 
    createInternalAccount, 
    updateInternalAccount,
    deleteInternalAccount 
  } = useBanks({
    banks: { page: bankPage, search: debouncedBankSearch, limit: 10 },
    accounts: { page: accountPage, search: debouncedAccountSearch, limit: 6 }
  });

  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<InternalAccount | null>(null);

  const handleCreateAccount = () => {
    setSelectedAccount(null);
    setIsAccountDialogOpen(true);
  };

  const handleEditAccount = (account: InternalAccount) => {
    setSelectedAccount(account);
    setIsAccountDialogOpen(true);
  };

  const handleSubmitAccount = async (data: CreateInternalAccountInput) => {
    if (selectedAccount) {
      await updateInternalAccount.mutateAsync({ id: selectedAccount.id, ...data });
    } else {
      await createInternalAccount.mutateAsync(data);
    }
    setIsAccountDialogOpen(false);
  };

  const handleCreateBank = () => {
    setIsBankDialogOpen(true);
  };

  const handleSubmitBank = async (data: CreateBankInput) => {
    await createBank.mutateAsync(data);
    setIsBankDialogOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary uppercase">Financial Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Manage corporate bank accounts and financial institution references.</p>
        </div>
        <div className="flex gap-3">
           <Button 
            variant="outline"
            onClick={handleCreateBank}
            className="border-primary/10 hover:bg-primary/5 text-primary font-bold px-5 rounded-xl transition-all h-11"
          >
            <Landmark size={18} className="mr-2" />
            <span>ADD BANK REF</span>
          </Button>
          <Button 
            onClick={handleCreateAccount}
            className="bg-primary hover:bg-primary/90 text-white font-extrabold px-6 rounded-xl shadow-premium transition-all active:scale-95 h-11"
          >
            <Plus size={18} strokeWidth={3} className="mr-2" />
            <span>NEW ACCOUNT</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/50 p-1 border border-primary/5 rounded-2xl h-14 w-full justify-start gap-2 shadow-sm backdrop-blur-sm">
          <TabsTrigger value="accounts" className="rounded-xl px-6 font-extrabold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            Company Accounts
          </TabsTrigger>
          <TabsTrigger value="banks" className="rounded-xl px-6 font-extrabold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            Bank Master List
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col lg:flex-row items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm shadow-sm mb-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
            <Input 
              placeholder={activeTab === "accounts" ? "Search accounts by holder or number..." : "Search banks by name or code..."}
              className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 font-medium"
              value={activeTab === "accounts" ? accountSearch : bankSearch}
              onChange={(e) => {
                if (activeTab === "accounts") {
                  setAccountSearch(e.target.value);
                  setAccountPage(1);
                } else {
                  setBankSearch(e.target.value);
                  setBankPage(1);
                }
              }}
            />
          </div>
        </div>

        {/* ACCOUNTS TAB */}
        <TabsContent value="accounts" className="animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {internalAccountsQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-3xl bg-muted" />
              ))
            ) : internalAccountsQuery.data?.data.length === 0 ? (
              <div className="col-span-full h-48 flex items-center justify-center border-2 border-dashed border-primary/5 rounded-3xl opacity-50 grayscale transition-all">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">No accounts configured yet</p>
              </div>
            ) : (
                internalAccountsQuery.data?.data.map((account: any) => (
                <div key={account.id} className="group relative bg-white rounded-3xl p-6 shadow-premium border border-primary/5 hover:border-primary/20 transition-all flex flex-col justify-between overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                            <MoreVertical size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl shadow-premium p-1">
                           <DropdownMenuItem onClick={() => handleEditAccount(account)} className="gap-2 font-bold text-[10px] uppercase px-3 py-2">
                             <Edit2 size={12} /> Edit Account
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => deleteInternalAccount.mutate(account.id)} className="gap-2 font-bold text-[10px] uppercase px-3 py-2 text-destructive">
                             <Trash2 size={12} /> Remove
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center">
                          {account.type === 'Credit Card' ? <CreditCard className="w-5 h-5 text-primary" /> : <Building2 className="w-5 h-5 text-primary" />}
                       </div>
                       <div>
                          <h4 className="font-extrabold text-primary text-[11px] uppercase tracking-tight">{account.holderName}</h4>
                          <p className="text-[9px] text-muted-foreground font-bold tracking-widest uppercase opacity-60 italic">{account.bank?.bankName}</p>
                       </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-primary/5">
                        <div className="flex items-center justify-between">
                            <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest">Account Number</span>
                            <span className="text-xs font-black text-primary tracking-widest">{account.accountNo}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest">Branch Location</span>
                            <span className="text-[10px] font-bold text-primary/80 uppercase">{account.branch || "N/A"}</span>
                        </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between pt-4 border-t border-primary/5 border-dashed">
                      <Badge variant="outline" className="bg-primary/5 border-primary/10 text-[8px] font-black uppercase px-2 py-0.5 rounded-lg text-primary shadow-sm">
                        {account.type}
                      </Badge>
                      <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter opacity-50">SWIFT: {account.swiftCode || "-"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <PaginationControls 
            meta={internalAccountsQuery.data?.meta}
            onPageChange={setAccountPage}
            isFetching={internalAccountsQuery.isFetching}
          />
        </TabsContent>

        {/* BANKS MASTER TAB */}
        <TabsContent value="banks" className="animate-in fade-in duration-300">
           <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-hidden">
              <Table>
                <TableHeader className="bg-primary/[0.02]">
                  <TableRow className="hover:bg-transparent border-primary/5">
                    <TableHead className="pl-8 py-5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">BIC Code</TableHead>
                    <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Institution</TableHead>
                    <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Headquarters</TableHead>
                    <TableHead className="pr-8 py-5 text-right text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {banksQuery.isLoading ? (
                     Array.from({ length: 3 }).map((_, i) => (
                       <TableRow key={i} className="border-primary/5">
                         <TableCell className="pl-8 py-4"><Skeleton className="h-4 w-12" /></TableCell>
                         <TableCell className="py-4"><Skeleton className="h-6 w-32" /></TableCell>
                         <TableCell className="py-4"><Skeleton className="h-6 w-48" /></TableCell>
                         <TableCell className="pr-8 py-4 text-right text-xs">REF-ACTIVE</TableCell>
                       </TableRow>
                     ))
                    ) : banksQuery.data?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-48 text-center border-none">
                           <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground opacity-50">No banks found</p>
                        </TableCell>
                      </TableRow>
                    ) : banksQuery.data?.data.map((bank: any) => (
                      <TableRow key={bank.id} className="hover:bg-primary/[0.02] border-primary/5 transition-all group">
                        <TableCell className="pl-8 py-4">
                           <Badge variant="outline" className="font-black text-[10px] tracking-widest text-primary border-primary/20 bg-primary/5">
                              {bank.bankCode}
                           </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                           <div className="flex flex-col">
                              <span className="font-bold text-[13px] text-primary uppercase tracking-tight group-hover:text-secondary transition-colors italic">{bank.bankName}</span>
                              <span className="text-[9px] text-muted-foreground font-bold tracking-[0.1em] uppercase opacity-60 mt-0.5">{bank.bankBrand}</span>
                           </div>
                        </TableCell>
                        <TableCell className="py-4">
                           <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground leading-relaxed max-w-xs line-clamp-1">
                              <MapPin size={12} className="opacity-40 shrink-0" /> {bank.bankAddress || "Reference Address Not Set"}
                           </div>
                        </TableCell>
                        <TableCell className="pr-8 py-4 text-right">
                           <Badge className="bg-primary/5 text-primary border-primary/10 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg shadow-sm">
                              VERIFIED
                           </Badge>
                        </TableCell>
                     </TableRow>
                   ))}
                </TableBody>
              </Table>
           </div>
        </TabsContent>
      </Tabs>

      <InternalAccountDialog 
        open={isAccountDialogOpen}
        onOpenChange={setIsAccountDialogOpen}
        onSubmit={handleSubmitAccount}
        banks={banksQuery.data?.data || []}
        account={selectedAccount}
        isSubmitting={createInternalAccount.isPending || updateInternalAccount.isPending}
      />

      <BankDialog
        open={isBankDialogOpen}
        onOpenChange={setIsBankDialogOpen}
        onSubmit={handleSubmitBank}
        isSubmitting={createBank.isPending}
      />
    </div>
  );
}
