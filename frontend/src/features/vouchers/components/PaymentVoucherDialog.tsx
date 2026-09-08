import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowUpRight, Info, Landmark } from "lucide-react";
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
import { useBanks } from "@/features/banks/hooks/useBanks";
import { PaymentVoucher, CreatePaymentVoucherInput } from "../types";

const formSchema = z.object({
  pvNumber: z.string().min(1, "PV number is required"),
  issuingDate: z.string().min(1, "Issuing date is required"),
  dueDate: z.string().optional(),
  paymentDate: z.string().optional(),
  currency: z.string().min(1),
  amount: z.string().min(1, "Amount is required"),
  payableType: z.string().min(1, "Payee type is required"),
  payableNameManual: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  expenseType: z.string().optional(),
  sourcePaymentForm: z.string().min(1, "Payment form is required"),
  internalAccountId: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const LABEL = "text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2";
const FIELD = "h-12 rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 font-bold tracking-tight";
const NONE = "NONE";

const DEFAULTS: FormValues = {
  pvNumber: "",
  issuingDate: "",
  dueDate: "",
  paymentDate: "",
  currency: "IDR",
  amount: "",
  payableType: "SUPPLIER",
  payableNameManual: "",
  category: "",
  expenseType: "",
  sourcePaymentForm: "BANK",
  internalAccountId: NONE,
  description: "",
};

interface PaymentVoucherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePaymentVoucherInput) => void;
  voucher?: PaymentVoucher | null;
  isSubmitting?: boolean;
}

export function PaymentVoucherDialog({
  open,
  onOpenChange,
  onSubmit,
  voucher,
  isSubmitting,
}: PaymentVoucherDialogProps) {
  const { internalAccountsQuery } = useBanks({ accounts: { limit: 100, enabled: true } });
  const accounts = internalAccountsQuery.data?.data || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (!open) return;

    if (!voucher) {
      form.reset(DEFAULTS);
      return;
    }

    form.reset({
      pvNumber: voucher.pvNumber,
      issuingDate: voucher.issuingDate.slice(0, 10),
      dueDate: voucher.dueDate?.slice(0, 10) || "",
      paymentDate: voucher.paymentDate?.slice(0, 10) || "",
      currency: voucher.currency || "IDR",
      amount: String(Number(voucher.amount ?? 0)),
      payableType: voucher.payableType,
      payableNameManual: voucher.payableNameManual || "",
      category: voucher.category,
      expenseType: voucher.expenseType || "",
      sourcePaymentForm: voucher.sourcePaymentForm,
      internalAccountId: voucher.internalAccountId || NONE,
      description: voucher.description || "",
    });
  }, [voucher, form, open]);

  const handleSubmit = (values: FormValues) => {
    onSubmit({
      pvNumber: values.pvNumber,
      issuingDate: values.issuingDate,
      dueDate: values.dueDate || undefined,
      paymentDate: values.paymentDate || undefined,
      currency: values.currency,
      amount: Number(values.amount || 0),
      payableType: values.payableType,
      payableNameManual: values.payableNameManual || undefined,
      category: values.category,
      expenseType: values.expenseType || undefined,
      sourcePaymentForm: values.sourcePaymentForm,
      internalAccountId:
        values.internalAccountId && values.internalAccountId !== NONE
          ? Number(values.internalAccountId)
          : undefined,
      description: values.description || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col rounded-3xl border-primary/5 shadow-premium overflow-hidden p-0">
        <div className="bg-primary/5 px-8 pt-8 pb-4 border-b border-primary/5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary tracking-tight uppercase flex items-center gap-3">
              <ArrowUpRight className="w-8 h-8" strokeWidth={2.5} />
              {voucher ? "Modify Payment Voucher" : "Record Payment Voucher"}
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-2 opacity-70">
              {voucher ? `Editing ${voucher.pvNumber}` : "Money out — who is paid, from which account."}
            </p>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
              <div className="grid grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="pvNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL}>
                        <Info size={12} className="text-secondary" />
                        PV Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. PV/2026/09/001" {...field} className={FIELD} />
                      </FormControl>
                      <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL}>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="0.01" {...field} className={FIELD} />
                      </FormControl>
                      <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                    </FormItem>
                  )}
                />

                {([
                  ["issuingDate", "Issuing Date"],
                  ["dueDate", "Due Date"],
                  ["paymentDate", "Payment Date"],
                ] as const).map(([name, label]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL}>{label}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className={FIELD} />
                        </FormControl>
                        <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                      </FormItem>
                    )}
                  />
                ))}

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL}>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={FIELD}>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["IDR", "USD", "EUR", "SGD", "JPY"].map((code) => (
                            <SelectItem key={code} value={code}>
                              {code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payableType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL}>Payee Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={FIELD}>
                            <SelectValue placeholder="Select payee type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["SUPPLIER", "EMPLOYEE", "CUSTOMER", "INTERNAL", "OTHERS"].map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payableNameManual"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL}>Payee Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Who gets paid" {...field} className={FIELD} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL}>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Operational, Payroll" {...field} className={FIELD} />
                      </FormControl>
                      <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expenseType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL}>Expense Type</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} className={FIELD} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sourcePaymentForm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL}>Payment Form</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={FIELD}>
                            <SelectValue placeholder="Select form" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["BANK", "CASH", "CREDIT_CARD"].map((form) => (
                            <SelectItem key={form} value={form}>
                              {form.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="internalAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL}>
                        <Landmark size={12} className="text-secondary" />
                        Paying Account
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={FIELD}>
                            <SelectValue placeholder="Where the money left from" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE}>None</SelectItem>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.bank?.bankName || account.type} · {account.accountNo} ·{" "}
                              {account.holderName}
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
                    <FormItem className="col-span-2">
                      <FormLabel className={LABEL}>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What this payment covers."
                          {...field}
                          className="rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 min-h-24"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="px-8 py-5 border-t border-primary/5 bg-muted/20">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 px-6 rounded-xl border-primary/10 font-bold text-xs uppercase tracking-widest"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-xs uppercase tracking-widest shadow-premium active:scale-95 transition-all"
              >
                {isSubmitting ? "Saving..." : voucher ? "Save Changes" : "Record Voucher"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
