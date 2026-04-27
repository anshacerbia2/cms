import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Landmark, Hash, Building2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useBanks } from "../hooks/useBanks";
import { Bank } from "../types";
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

const formSchema = z.object({
  bankCode: z.string().length(3, "Bank code must be exactly 3 characters"),
  bankName: z.string().min(1, "Bank name is required"),
  bankBrand: z.string().optional(),
  bankAddress: z.string().optional(),
});

interface BankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bank?: Bank | null;
}

export function BankDialog({
  open,
  onOpenChange,
  bank,
}: BankDialogProps) {
  const { createBank, updateBank } = useBanks();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bankCode: "",
      bankName: "",
      bankBrand: "",
      bankAddress: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (bank) {
        form.reset({
          bankCode: bank.bankCode || "",
          bankName: bank.bankName || "",
          bankBrand: bank.bankBrand || "",
          bankAddress: bank.bankAddress || "",
        });
      } else {
        form.reset({
          bankCode: "",
          bankName: "",
          bankBrand: "",
          bankAddress: "",
        });
      }
    }
  }, [bank, form, open]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      if (bank) {
        await updateBank.mutateAsync({ id: bank.id, ...data });
        toast.success("Bank reference updated successfully");
      } else {
        await createBank.mutateAsync(data);
        toast.success("Bank reference registered successfully");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    }
  };

  const isSubmitting = createBank.isPending || updateBank.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl border-primary/5 shadow-premium overflow-hidden p-0 animate-in zoom-in-95 duration-200">
        <div className="bg-primary/5 px-8 pt-8 pb-6 border-b border-primary/5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary tracking-tight uppercase flex items-center gap-3">
              <Landmark className="w-8 h-8" strokeWidth={2.5} />
              Register Bank Reference
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-2 opacity-70">
              Establish a new financial institution entry in the master reference list.
            </p>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-8 py-8 space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="bankCode"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <Hash size={12} /> BIC Code
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="014" {...field} className="h-11 rounded-xl bg-muted/20 border-primary/5 font-black uppercase text-center tracking-[0.3em] text-xs" />
                    </FormControl>
                    <FormMessage className="text-[8px] uppercase font-bold text-destructive" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       Institution Name
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Bank Central Asia" {...field} className="h-11 rounded-xl bg-muted/20 border-primary/5 font-bold uppercase text-[11px] tracking-tight" />
                    </FormControl>
                    <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bankBrand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Building2 size={12} /> Trading Brand / Alias
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. BCA" {...field} className="h-11 rounded-xl bg-muted/20 border-primary/5 font-bold uppercase text-[11px] tracking-widest" />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bankAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <MapPin size={12} /> Headquarters Address
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="Head office address for official documentation..." {...field} className="min-h-[100px] rounded-2xl bg-muted/20 border-primary/5 font-medium text-xs resize-none" />
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
                className="h-11 px-10 rounded-xl bg-primary text-white font-extrabold uppercase tracking-widest text-[10px] shadow-premium active:scale-95 transition-all min-w-[170px]"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Linking..." : "Verify & Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
