import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2, Eye, Truck } from "lucide-react";
import { useDebounce } from "use-debounce";
import { useSuppliers } from "../hooks/useSuppliers";
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
import { SupplierDialog } from "../components/SupplierDialog";
import { CreateSupplierInput, Supplier } from "../types";
import { PaginationControls } from "@/components/common/PaginationControls";

import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/common/PageContainer";

export default function SuppliersPage() {
  const { can } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { suppliersQuery, deleteSupplier, createSupplier, updateSupplier } = useSuppliers({
    page,
    search: debouncedSearch,
    limit: 10
  });

  const { data: response, isLoading, isFetching } = suppliersQuery;
  const suppliers = response?.data || [];
  const meta = response?.meta;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const handleCreate = () => {
    setSelectedSupplier(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: CreateSupplierInput) => {
    if (selectedSupplier) {
      await updateSupplier.mutateAsync({ id: selectedSupplier.id, ...data });
    } else {
      await createSupplier.mutateAsync(data);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      await deleteSupplier.mutateAsync(id);
    }
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Suppliers"
        description="Manage your enterprise supply chain and provider records."
        icon={Truck}
        actions={
          can('suppliers.create') && (
            <Button 
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90 text-white font-extrabold px-6 rounded-xl shadow-premium transition-all active:scale-95 flex items-center gap-2 h-11"
            >
              <Plus size={18} strokeWidth={3} />
              <span>ADD SUPPLIER</span>
            </Button>
          )
        }
      />

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
          <Input 
            placeholder="Search providers by name or code..." 
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 font-medium"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); 
            }}
          />
        </div>
        <Button variant="outline" className="h-12 px-5 rounded-xl border-primary/10 bg-white shadow-sm flex items-center gap-2 hover:bg-primary/5 transition-all text-muted-foreground font-bold">
          <Filter size={18} />
          <span className="text-xs uppercase tracking-widest">Filter</span>
        </Button>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-primary/[0.02]">
              <TableRow className="hover:bg-transparent border-primary/5">
                <TableHead className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Code</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Supplier Detail</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Engagement</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Registry Status</TableHead>
                <TableHead className="text-right text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Operations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-primary/5">
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-lg" /></TableCell>
                  </TableRow>
                ))
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground font-medium uppercase text-xs tracking-widest">
                    No suppliers matched your search criteria
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="group hover:bg-primary/[0.02] border-primary/5 transition-all">
                    <TableCell className="font-bold text-primary text-xs tracking-tight">
                      {supplier.code}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[13px] text-primary uppercase tracking-tight group-hover:text-secondary transition-colors">
                          {supplier.name}
                        </span>
                        {supplier.contactPerson && (
                          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                             <Truck className="w-3 h-3 opacity-50" /> {supplier.contactPerson}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-muted/30 border-primary/5 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground shadow-sm">
                          {supplier._count?.pics || 0} PERS
                        </Badge>
                        <Badge variant="outline" className="bg-muted/30 border-primary/5 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground shadow-sm">
                          {supplier._count?.products || 0} SKU
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge className={
                        supplier.status === 'ACTIVE' 
                          ? "bg-green-50 text-green-600 border-green-100/50 hover:bg-green-100" 
                          : "bg-muted text-muted-foreground border-transparent"
                        }
                        variant="outline"
                      >
                        <div className={`w-1 h-1 rounded-full mr-1.5 ${supplier.status === 'ACTIVE' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">{supplier.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-8 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-primary/5 text-muted-foreground transition-all">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-premium border-primary/10 p-1 bg-white backdrop-blur-xl animate-in zoom-in-95 duration-200">
                          <DropdownMenuItem className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors">
                            <Eye size={14} />
                            <span>View Profile</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleEdit(supplier)}
                            className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                          >
                            <Edit2 size={14} />
                            <span>Edit Provider</span>
                          </DropdownMenuItem>
                          <div className="h-px bg-muted mx-1 my-1" />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(supplier.id)}
                            className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-destructive hover:bg-destructive/5 transition-colors"
                          >
                            <Trash2 size={14} />
                            <span>Remove Access</span>
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

      <SupplierDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        supplier={selectedSupplier}
        isSubmitting={createSupplier.isPending || updateSupplier.isPending}
      />
    </PageContainer>
  );
}
