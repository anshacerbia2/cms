import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2, Eye, Truck, Tag, Ruler } from "lucide-react";
import { useDebounce } from "use-debounce";
import { useProducts } from "../hooks/useProducts";
import { useSuppliers } from "../../suppliers/hooks/useSuppliers";
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductDialog } from "../components/ProductDialog";
import { CreateProductInput, Product } from "../types";
import { PaginationControls } from "@/components/common/PaginationControls";

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [debouncedSearch] = useDebounce(search, 500);

  const { productsQuery, categoriesQuery, deleteProduct, createProduct, updateProduct } = useProducts({
    page,
    search: debouncedSearch,
    categoryId: categoryId === "all" ? undefined : categoryId,
    limit: 10
  });

  const { suppliersQuery } = useSuppliers({ limit: 100 });

  const { data: response, isLoading, isFetching } = productsQuery;
  const products = response?.data || [];
  const meta = response?.meta;
  const categories = categoriesQuery.data?.data || [];
  const suppliers = suppliersQuery.data?.data || [];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleCreate = () => {
    setSelectedProduct(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: CreateProductInput) => {
    if (selectedProduct) {
      await updateProduct.mutateAsync({ id: selectedProduct.id, ...data });
    } else {
      await createProduct.mutateAsync(data);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      await deleteProduct.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary uppercase">Products</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Catalog management for technical equipment and service SKU records.</p>
        </div>
        <Button 
          onClick={handleCreate}
          className="bg-primary hover:bg-primary/90 text-white font-extrabold px-6 rounded-xl shadow-premium transition-all active:scale-95 flex items-center gap-2 h-11"
        >
          <Plus size={18} strokeWidth={3} />
          <span>ADD NEW PRODUCT</span>
        </Button>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col lg:flex-row items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
          <Input 
            placeholder="Search catalog by name or code..." 
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 font-medium"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); 
            }}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <Select value={categoryId} onValueChange={(val) => { setCategoryId(val); setPage(1); }}>
            <SelectTrigger className="h-12 w-full lg:w-[200px] rounded-xl border-primary/10 bg-white shadow-sm font-bold text-xs uppercase tracking-widest px-5">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-primary/50" />
                <SelectValue placeholder="Category" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-primary/5 shadow-premium">
              <SelectItem value="all" className="font-bold uppercase text-[10px]">ALL CATEGORIES</SelectItem>
              {categories.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id} className="font-bold uppercase text-[10px]">
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" className="h-12 px-5 rounded-xl border-primary/10 bg-white shadow-sm flex items-center gap-2 hover:bg-primary/5 transition-all text-muted-foreground font-bold">
            <Filter size={18} />
            <span className="text-xs uppercase tracking-widest hidden sm:inline">Advanced</span>
          </Button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-primary/[0.02]">
              <TableRow className="hover:bg-transparent border-primary/5">
                <TableHead className="pl-8 py-5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">SKU Code</TableHead>
                <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Product Detail</TableHead>
                <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Classification</TableHead>
                <TableHead className="py-5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Unit</TableHead>
                <TableHead className="pr-8 py-5 text-right text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Operations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-primary/5">
                    <TableCell className="pl-8 py-4"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="py-4"><Skeleton className="h-10 w-48" /></TableCell>
                    <TableCell className="py-4"><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="py-4"><Skeleton className="h-6 w-12" /></TableCell>
                    <TableCell className="pr-8 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-lg" /></TableCell>
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground font-medium uppercase text-xs tracking-widest">
                    No products found in this category
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id} className="group hover:bg-primary/[0.02] border-primary/5 transition-all">
                    <TableCell className="pl-8 py-4 font-bold text-primary text-xs tracking-tight">
                      {product.code}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[13px] text-primary uppercase tracking-tight group-hover:text-secondary transition-colors">
                          {product.name}
                        </span>
                        {product.supplier && (
                          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                             <Truck className="w-3 h-3 opacity-50" /> {product.supplier.name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      {product.category ? (
                        <Badge variant="outline" className="bg-primary/5 border-primary/10 text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-lg text-primary shadow-sm">
                          {product.category.name}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-30">Unclassified</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                       <div className="flex items-center gap-2">
                          <Ruler className="w-3.5 h-3.5 text-muted-foreground opacity-40" />
                          <span className="text-xs font-bold text-primary/80 uppercase tracking-tight">{product.unit}</span>
                       </div>
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
                            <span>Specifications</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleEdit(product)}
                            className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                          >
                            <Edit2 size={14} />
                            <span>Edit Item</span>
                          </DropdownMenuItem>
                          <div className="h-px bg-muted mx-1 my-1" />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(product.id)}
                            className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-destructive hover:bg-destructive/5 transition-colors"
                          >
                            <Trash2 size={14} />
                            <span>Delete SKU</span>
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

      <ProductDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        product={selectedProduct}
        categories={categories}
        suppliers={suppliers}
        isSubmitting={createProduct.isPending || updateProduct.isPending}
      />
    </div>
  );
}
