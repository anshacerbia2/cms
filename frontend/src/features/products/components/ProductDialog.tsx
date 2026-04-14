import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Package, Info, Tag, Truck, Ruler } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Product, CreateProductInput, ProductCategory } from "../types";
import { Supplier } from "../../suppliers/types";

const formSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  unit: z.string().min(1, "Unit of measure is required"),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
});

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateProductInput) => void;
  product?: Product | null;
  categories: ProductCategory[];
  suppliers: Supplier[];
  isSubmitting?: boolean;
}

export function ProductDialog({
  open,
  onOpenChange,
  onSubmit,
  product,
  categories,
  suppliers,
  isSubmitting,
}: ProductDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      unit: "Unit",
      categoryId: "",
      supplierId: "",
    },
  });

  useEffect(() => {
    if (product && open) {
      form.reset({
        name: product.name,
        description: product.description || "",
        unit: product.unit,
        categoryId: product.categoryId || "",
        supplierId: product.supplierId || "",
      });
    } else if (open) {
      form.reset({
        name: "",
        description: "",
        unit: "Unit",
        categoryId: "",
        supplierId: "",
      });
    }
  }, [product, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-3xl border-primary/5 shadow-premium overflow-hidden p-0">
        <div className="bg-primary/5 px-8 pt-8 pb-6 border-b border-primary/5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary tracking-tight uppercase flex items-center gap-3">
              <Package className="w-8 h-8" strokeWidth={2.5} />
              {product ? "Edit Product" : "Add New Product"}
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-2 opacity-70">
              {product ? `Updating technical specifications for ${product.code}` : "Define a new item in the enterprise inventory repository."}
            </p>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-8 py-8 space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Info size={12} className="text-secondary" />
                    Commercial Item Name
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Cisco Catalyst 9200L" 
                      {...field} 
                      className="h-12 rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 font-bold uppercase tracking-tight"
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Tag size={12} /> Domain Category
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-primary/5 font-bold text-xs uppercase">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-primary/5 shadow-premium">
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} className="font-bold uppercase text-[10px]">
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Ruler size={12} /> Measurement Unit
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Pcs / Unit / Roll" className="h-11 rounded-xl bg-muted/20 border-primary/5 font-bold uppercase text-[11px]" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Truck size={12} /> Preferred Supplier
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-primary/5 font-bold text-xs uppercase">
                        <SelectValue placeholder="Assign Supplier (Optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl border-primary/5 shadow-premium max-h-[280px]">
                      <SelectItem value="none" className="font-bold uppercase text-[10px] text-muted-foreground italic">None / Multiple</SelectItem>
                      {suppliers.map((sup) => (
                        <SelectItem key={sup.id} value={sup.id} className="font-bold uppercase text-[10px]">
                          {sup.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Technical Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="min-h-[100px] rounded-2xl bg-muted/20 border-primary/5 font-medium text-xs resize-none" />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 border-t border-primary/5 gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-11 px-10 rounded-xl bg-primary text-white font-extrabold uppercase tracking-widest text-[10px] shadow-premium active:scale-95 transition-all min-w-[160px]"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : product ? "Save Changes" : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
