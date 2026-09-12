import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2, Eye } from "lucide-react";
import { useDebounce } from "use-debounce";
import { useCustomers, useCustomer } from "../hooks/useCustomers";
import { useAuthStore } from "@/store/authStore";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerDialog } from "../components/CustomerDialog";
import { Customer, CreateCustomerInput } from "../types";
import { PaginationControls } from "@/components/common/PaginationControls";

import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/common/PageContainer";
import { DetailModal } from "@/components/common/DetailModal";
import { Users } from "lucide-react";

export default function CustomersPage() {
  const { can } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { customersQuery, deleteCustomer, createCustomer, updateCustomer } = useCustomers({
    page,
    search: debouncedSearch,
    limit: 10
  });

  const { data: response, isLoading, isFetching } = customersQuery;
  const customers = response?.data || [];
  const meta = response?.meta;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  // The list response carries only counts; billing options and PICs come from
  // the detail endpoint.
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data: detailCustomer } = useCustomer(detailId);

  const handleCreate = () => {
    setSelectedCustomer(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: CreateCustomerInput) => {
    if (selectedCustomer) {
      await updateCustomer.mutateAsync({ id: selectedCustomer.id, ...data });
    } else {
      await createCustomer.mutateAsync(data);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      await deleteCustomer.mutateAsync(id);
    }
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Customers"
        description="Enterprise client directory and relationship management."
        icon={Users}
        actions={
          can('customers.create') && (
            <Button 
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90 text-white font-extrabold px-6 rounded-xl shadow-premium transition-all active:scale-95 flex items-center gap-2 h-11"
            >
              <Plus size={18} strokeWidth={3} />
              <span>ADD CLIENT</span>
            </Button>
          )
        }
      />

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search by code or name..." 
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset to first page
            }}
          />
        </div>
        <Button variant="outline" className="h-12 px-5 rounded-xl border-0 bg-white shadow-sm flex items-center gap-2 hover:bg-primary/5 transition-all text-muted-foreground font-bold cursor-pointer">
          <Filter size={18} />
          <span>Filters</span>
        </Button>
      </div>

      {/* Table Section */}
      <div className="space-y-4">
        <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px] pl-8">Code</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[80px] text-right pr-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-8"><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="pr-8"><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground font-medium uppercase text-xs tracking-widest">
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id} className="whitespace-nowrap">
                    <TableCell className="pl-8 font-bold text-primary text-xs tracking-tight">
                      {customer.code}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-[13px] text-primary transition-colors uppercase tracking-tight">
                          {customer.name}
                        </span>
                        {customer.bankName && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {customer.bankName} • {customer.bankAccountNumber}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground">
                          {customer._count?.billingOptions || 0} OPT
                        </Badge>
                        <Badge variant="outline" className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground">
                          {customer._count?.pics || 0} PIC
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        customer.status === 'ACTIVE' 
                          ? "bg-green-50 text-green-600 border-green-100 hover:bg-green-100" 
                          : "bg-muted text-muted-foreground border-transparent"
                        }
                        variant="outline"
                      >
                        <div className={`w-1 h-1 rounded-full mr-1.5 ${customer.status === 'ACTIVE' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">{customer.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-primary/5 text-muted-foreground transition-all">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-premium border-primary/10 p-1 bg-white backdrop-blur-xl">
                          <DropdownMenuItem
                            onClick={() => setDetailId(customer.id)}
                            className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                          >
                            <Eye size={14} />
                            <span>View Details</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleEdit(customer)}
                            className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                          >
                            <Edit2 size={14} />
                            <span>Edit Client</span>
                          </DropdownMenuItem>
                          <div className="h-px bg-muted mx-1 my-1" />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(customer.id)}
                            className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-destructive hover:bg-destructive/5 transition-colors"
                          >
                            <Trash2 size={14} />
                            <span>Delete Account</span>
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
          meta={meta}
          onPageChange={setPage}
          isFetching={isFetching}
        />
      </div>

      <CustomerDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        customer={selectedCustomer}
        isSubmitting={createCustomer.isPending || updateCustomer.isPending}
      />

      <DetailModal
        open={!!detailId && !!detailCustomer}
        onOpenChange={(open) => !open && setDetailId(null)}
        title={detailCustomer?.name || ""}
        subtitle={detailCustomer?.code}
        icon={<Users className="w-8 h-8 text-secondary shrink-0" strokeWidth={2.5} />}
        data={
          detailCustomer
            ? [
                { label: "Code", value: detailCustomer.code },
                { label: "Status", value: detailCustomer.status },
                { label: "Bank", value: detailCustomer.bankName || "—" },
                { label: "Account Number", value: detailCustomer.bankAccountNumber || "—" },
                { label: "Account Name", value: detailCustomer.bankAccountName || "—" },
                {
                  label: "Billing Options",
                  value:
                    detailCustomer.billingOptions?.length
                      ? detailCustomer.billingOptions
                          .map((o) => o.cpName || o.address || "—")
                          .join(", ")
                      : "—",
                },
                {
                  label: "PICs",
                  value:
                    detailCustomer.pics?.length
                      ? detailCustomer.pics.map((pic) => pic.name).join(", ")
                      : "—",
                },
                { label: "Notes", value: detailCustomer.notes || "—" },
              ]
            : []
        }
      />
    </PageContainer>
  );
}
