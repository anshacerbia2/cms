import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Landmark, Hash, User, MapPin, Globe } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InternalAccount, CreateInternalAccountInput, Bank } from "../types";

const formSchema = z.object({
  bankId: z.string().optional(),
  type: z.enum(["BANK", "CASH", "OTHER"]),
  accountNo: z.string().optional(),
  branch: z.string().optional(),
  swiftCode: z.string().optional(),
  holderName: z.string().min(1, "Account holder name is required"),
  isNonVatSettlement: z.boolean().optional(),
});

interface InternalAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateInternalAccountInput) => void;
  banks: Bank[];
  account?: InternalAccount | null;
  isSubmitting?: boolean;
  isLoadingBanks?: boolean;
}

export function InternalAccountDialog({
  open,
  onOpenChange,
  onSubmit,
  banks,
  account,
  isSubmitting,
  isLoadingBanks,
}: InternalAccountDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bankId: "",
      type: "BANK",
      accountNo: "",
      branch: "",
      swiftCode: "",
      holderName: "PT PANCONVINCE",
      isNonVatSettlement: false,
    },
  });

  useEffect(() => {
    if (account && open) {
      form.reset({
        bankId: account.bankId ? String(account.bankId) : "",
        type: account.type,
        accountNo: account.accountNo || "",
        branch: account.branch || "",
        swiftCode: account.swiftCode || "",
        holderName: account.holderName,
        isNonVatSettlement: account.isNonVatSettlement ?? false,
      });
    } else if (open) {
      form.reset({
        bankId: "",
        type: "BANK",
        accountNo: "",
        branch: "",
        swiftCode: "",
        holderName: "PT PANCONVINCE",
      isNonVatSettlement: false,
      });
    }
  }, [account, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] rounded-3xl border-primary/5 shadow-premium overflow-hidden p-0 bg-white">
        <div className="bg-white px-8 pt-8 pb-6 border-b border-primary/5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary tracking-tight uppercase flex items-center gap-3">
              <Landmark className="w-8 h-8" strokeWidth={2.5} />
              {account ? "Modify Corporate Account" : "Register Company Account"}
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-2 opacity-70">
              {account ? `Editing parameters for internal account ${account.accountNo}` : "Configure a new financial settlement gateway for operations."}
            </p>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-8 py-8 space-y-6">
            <FormField
              control={form.control}
              name="bankId"
              render={({ field }) => (
                <FormItem className={form.watch("type") === "CASH" || form.watch("type") === "OTHER" ? "opacity-50 pointer-events-none" : ""}>
                  <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Landmark size={12} className="text-secondary" /> Banking Institution
                  </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={form.watch("type") === "CASH" || form.watch("type") === "OTHER"}
                    >
                      <FormControl>
                        <SelectTrigger className="shadow-none bg-muted/20 border border-primary/10 h-11 rounded-xl focus-visible:border-primary/30 transition-all">
                          <SelectValue placeholder={form.watch("type") === "CASH" || form.watch("type") === "OTHER" ? "N/A FOR CASH/OTHER" : "Select Parent Bank"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingBanks ? (
                          <div className="p-1 space-y-1">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="px-2 py-1.5">
                                <span className="font-bold uppercase text-[10px] bg-primary/10 animate-pulse text-transparent select-none rounded-md block w-full">
                                  LOADING BANK MASTER REFERENCE...
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : banks.length === 0 ? (
                          <div className="p-4 text-center">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-40 italic">No banks available</p>
                          </div>
                        ) : (
                          banks.map((bank) => (
                            <SelectItem key={bank.id} value={String(bank.id)}>
                              {bank.name || bank.bankName} {bank.bankCode ? `(${bank.bankCode})` : ""}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       Account Category
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="shadow-none bg-muted/20 border border-primary/10 h-11 rounded-xl focus-visible:border-primary/30 transition-all font-black tracking-widest text-[10px] uppercase">
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BANK">BANK ACCOUNT</SelectItem>
                        <SelectItem value="CASH">CASH/PETTY CASH</SelectItem>
                        <SelectItem value="OTHER">OTHER/EQUITY</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Hash size={12} /> Account Identifier
                    </FormLabel>
                    <FormControl>
                      <Input {...field} className="h-11 rounded-xl bg-muted/20 border border-primary/10 shadow-none font-black tracking-widest focus-visible:border-primary/30 transition-all" />
                    </FormControl>
                    <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="holderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <User size={12} /> Registered Holder
                  </FormLabel>
                  <FormControl>
                    <Input {...field} className="h-11 rounded-xl bg-muted/20 border border-primary/10 shadow-none font-extrabold uppercase tracking-tight focus-visible:border-primary/30 transition-all" />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isNonVatSettlement"
              render={({ field }) => (
                <FormItem>
                  <label className="flex items-start gap-2.5 cursor-pointer rounded-xl bg-muted/20 border border-primary/10 px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 mt-0.5 rounded accent-primary"
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    <span>
                      <span className="block text-[11px] font-extrabold uppercase tracking-widest text-primary">
                        Non-VAT settlement account
                      </span>
                      <span className="block text-[10px] text-muted-foreground font-medium mt-0.5">
                        No Tax invoices must settle here. While no account is marked, the
                        rule is not enforced.
                      </span>
                    </span>
                  </label>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="branch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <MapPin size={12} /> Branch Name
                    </FormLabel>
                    <FormControl>
                      <Input {...field} className="h-11 rounded-xl bg-muted/20 border border-primary/10 shadow-none font-bold uppercase text-[10px] focus-visible:border-primary/30 transition-all" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="swiftCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Globe size={12} /> SWIFT Code
                    </FormLabel>
                    <FormControl>
                      <Input {...field} className="h-11 rounded-xl bg-muted/20 border border-primary/10 shadow-none font-bold tracking-widest focus-visible:border-primary/30 transition-all" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

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
                {isSubmitting ? "Committing..." : account ? "Commit Changes" : "Confirm Registry"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
