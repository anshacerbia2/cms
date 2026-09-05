import { useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowDownRight, Plus, Trash2, Info, Landmark, AlertTriangle } from "lucide-react";
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
  FormDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { useBanks } from "@/features/banks/hooks/useBanks";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import { useUnpaidInvoices } from "@/features/invoices/hooks/useInvoices";
import { ReceiveVoucher, CreateReceiveVoucherInput } from "../types";

const allocationSchema = z.object({
  invoiceId: z.string().min(1, "Pick an invoice"),
  amountApplied: z.string().optional(),
  pph23Deduction: z.string().optional(),
  bankCharge: z.string().optional(),
  ppnWapuDeduction: z.string().optional(),
  othersAdjustment: z.string().optional(),
  adjustmentDescription: z.string().optional(),
});

const formSchema = z.object({
  rvNumber: z.string().min(1, "RV number is required"),
  rvDate: z.string().min(1, "RV date is required"),
  amount: z.string().min(1, "Amount is required"),
  currency: z.enum(["IDR", "USD", "EUR", "GBP", "JPY", "KRW", "MYR", "HKD", "OTHERS"]),
  paymentForm: z.enum(["BANK", "CREDIT_CARD", "CASH"]),
  internalAccountId: z.string().optional(),
  paymentFormValue: z.string().optional(),
  payerType: z.enum(["CUSTOMER", "EMPLOYEE", "SUPPLIER", "OTHERS", "UNKNOWN"]),
  payerId: z.string().optional(),
  payerNameManual: z.string().optional(),
  purpose: z.enum([
    "INVOICE",
    "RETURN_REFUND",
    "RETURNING_DEPOSIT",
    "RETURNING_CASH_ADVANCE",
    "STAFF_LOAN",
    "OTHERS",
    "UNKNOWN",
  ]),
  description: z.string().optional(),
  allocations: z.array(allocationSchema),
});

type FormValues = z.infer<typeof formSchema>;

const LABEL = "text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2";
const FIELD = "h-12 rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 font-bold tracking-tight";
const CELL = "h-10 rounded-lg bg-white border-primary/5 focus-visible:ring-primary/10 text-[13px]";
const NONE = "NONE";

const num = (value?: string) => Number(value || 0) || 0;

/** Everything on an allocation row reduces the invoice's balance, not just the cash. */
const rowReduction = (row: FormValues["allocations"][number]) =>
  num(row.amountApplied) +
  num(row.pph23Deduction) +
  num(row.bankCharge) +
  num(row.ppnWapuDeduction) +
  num(row.othersAdjustment);

const emptyAllocation = () => ({
  invoiceId: "",
  amountApplied: "",
  pph23Deduction: "",
  bankCharge: "",
  ppnWapuDeduction: "",
  othersAdjustment: "",
  adjustmentDescription: "",
});

const DEFAULTS: FormValues = {
  rvNumber: "",
  rvDate: "",
  amount: "",
  currency: "IDR",
  paymentForm: "BANK",
  internalAccountId: NONE,
  paymentFormValue: "",
  payerType: "CUSTOMER",
  payerId: "",
  payerNameManual: "",
  purpose: "INVOICE",
  description: "",
  allocations: [],
};

interface ReceiveVoucherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateReceiveVoucherInput) => void;
  voucher?: ReceiveVoucher | null;
  isSubmitting?: boolean;
}

export function ReceiveVoucherDialog({
  open,
  onOpenChange,
  onSubmit,
  voucher,
  isSubmitting,
}: ReceiveVoucherDialogProps) {
  const { internalAccountsQuery } = useBanks({ accounts: { limit: 100, enabled: true } });
  const accounts = internalAccountsQuery.data?.data || [];
  const { customersQuery } = useCustomers({ limit: 100 });
  const customers = customersQuery.data?.data || [];
  const { data: unpaidInvoices = [] } = useUnpaidInvoices(open);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: DEFAULTS,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "allocations" });

  useEffect(() => {
    if (!open) return;

    if (!voucher) {
      form.reset(DEFAULTS);
      return;
    }

    form.reset({
      rvNumber: voucher.rvNumber,
      rvDate: voucher.rvDate.slice(0, 10),
      amount: String(Number(voucher.amount ?? 0)),
      currency: voucher.currency,
      paymentForm: voucher.paymentForm,
      internalAccountId: voucher.internalAccountId || NONE,
      paymentFormValue: voucher.paymentFormValue || "",
      payerType: voucher.payerType,
      payerId: voucher.payerId || "",
      payerNameManual: voucher.payerNameManual || "",
      purpose: voucher.purpose,
      description: voucher.description || "",
      allocations: (voucher.invoices || []).map((allocation) => ({
        invoiceId: allocation.invoiceId,
        amountApplied: String(Number(allocation.amountApplied ?? 0)),
        pph23Deduction: String(Number(allocation.pph23Deduction ?? 0)),
        bankCharge: String(Number(allocation.bankCharge ?? 0)),
        ppnWapuDeduction: String(Number(allocation.ppnWapuDeduction ?? 0)),
        othersAdjustment: String(Number(allocation.othersAdjustment ?? 0)),
        adjustmentDescription: allocation.adjustmentDescription || "",
      })),
    });
  }, [voucher, form, open]);

  const watched = form.watch();

  // An invoice this voucher already settled is no longer "unpaid", so it has to be
  // merged back in or editing the voucher would lose its own rows.
  const invoiceOptions = useMemo(() => {
    const options = new Map<string, { id: string; label: string; balanceDue?: string }>();

    for (const invoice of unpaidInvoices) {
      options.set(invoice.id, {
        id: invoice.id,
        label: `${invoice.invoiceNumber} — ${invoice.customer?.name ?? ""}`,
        balanceDue: invoice.balanceDue,
      });
    }
    for (const allocation of voucher?.invoices || []) {
      if (!options.has(allocation.invoiceId)) {
        options.set(allocation.invoiceId, {
          id: allocation.invoiceId,
          label: allocation.invoice
            ? `${allocation.invoice.invoiceNumber} (settled)`
            : `Invoice ${allocation.invoiceId}`,
        });
      }
    }

    return [...options.values()];
  }, [unpaidInvoices, voucher]);

  const totalApplied = (watched.allocations || []).reduce(
    (acc, row) => acc + num(row.amountApplied),
    0,
  );
  const unallocated = num(watched.amount) - totalApplied;

  const handleSubmit = (values: FormValues) => {
    const payload: CreateReceiveVoucherInput = {
      rvNumber: values.rvNumber,
      rvDate: values.rvDate,
      amount: num(values.amount),
      currency: values.currency,
      paymentForm: values.paymentForm,
      internalAccountId:
        values.internalAccountId && values.internalAccountId !== NONE
          ? Number(values.internalAccountId)
          : undefined,
      paymentFormValue: values.paymentFormValue || undefined,
      payerType: values.payerType,
      payerId: values.payerType === "CUSTOMER" && values.payerId ? Number(values.payerId) : undefined,
      payerNameManual: values.payerNameManual || undefined,
      purpose: values.purpose,
      description: values.description || undefined,
      invoiceAllocations:
        values.purpose === "INVOICE"
          ? values.allocations
              .filter((row) => row.invoiceId)
              .map((row) => ({
                invoiceId: Number(row.invoiceId),
                amountApplied: num(row.amountApplied),
                pph23Deduction: num(row.pph23Deduction),
                bankCharge: num(row.bankCharge),
                ppnWapuDeduction: num(row.ppnWapuDeduction),
                othersAdjustment: num(row.othersAdjustment),
                adjustmentDescription: row.adjustmentDescription || undefined,
              }))
          : [],
    };

    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] h-[90vh] flex flex-col rounded-3xl border-primary/5 shadow-premium overflow-hidden p-0">
        <div className="bg-primary/5 px-8 pt-8 pb-4 border-b border-primary/5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary tracking-tight uppercase flex items-center gap-3">
              <ArrowDownRight className="w-8 h-8" strokeWidth={2.5} />
              {voucher ? "Modify Receive Voucher" : "Record Receive Voucher"}
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-2 opacity-70">
              {voucher ? `Editing ${voucher.rvNumber}` : "Money in — allocate it against outstanding invoices."}
            </p>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-8 bg-primary/5 border-b border-primary/5">
                <TabsList className="bg-transparent h-12 gap-6 p-0">
                  {[
                    ["general", "Voucher"],
                    ["allocations", "Invoice Allocation"],
                  ].map(([value, label]) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 text-[10px] font-extrabold uppercase tracking-widest transition-all"
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                <TabsContent value="general" className="m-0 space-y-8 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="rvNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL}>
                            <Info size={12} className="text-secondary" />
                            RV Number
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. RV/2026/09/001" {...field} className={FIELD} />
                          </FormControl>
                          <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rvDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL}>RV Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className={FIELD} />
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
                          <FormLabel className={LABEL}>Amount Received</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} step="0.01" {...field} className={FIELD} />
                          </FormControl>
                          <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                        </FormItem>
                      )}
                    />

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
                              {["IDR", "USD", "EUR", "GBP", "JPY", "KRW", "MYR", "HKD", "OTHERS"].map((code) => (
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
                      name="paymentForm"
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
                              <SelectItem value="BANK">BANK</SelectItem>
                              <SelectItem value="CASH">CASH</SelectItem>
                              <SelectItem value="CREDIT_CARD">CREDIT CARD</SelectItem>
                            </SelectContent>
                          </Select>
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
                            Receiving Account
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={FIELD}>
                                <SelectValue placeholder="Where the money landed" />
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
                      name="payerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL}>Payer Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={FIELD}>
                                <SelectValue placeholder="Select payer type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {["CUSTOMER", "EMPLOYEE", "SUPPLIER", "OTHERS", "UNKNOWN"].map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    {watched.payerType === "CUSTOMER" ? (
                      <FormField
                        control={form.control}
                        name="payerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={LABEL}>Customer</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className={FIELD}>
                                  <SelectValue placeholder="Who paid" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {customers.map((customer) => (
                                  <SelectItem key={customer.id} value={customer.id}>
                                    {customer.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={form.control}
                        name="payerNameManual"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={LABEL}>Payer Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Who paid" {...field} className={FIELD} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="purpose"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL}>Purpose</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={FIELD}>
                                <SelectValue placeholder="Select purpose" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="INVOICE">Invoice Payment</SelectItem>
                              <SelectItem value="RETURN_REFUND">Return / Refund</SelectItem>
                              <SelectItem value="RETURNING_DEPOSIT">Returning Deposit</SelectItem>
                              <SelectItem value="RETURNING_CASH_ADVANCE">Returning Cash Advance</SelectItem>
                              <SelectItem value="STAFF_LOAN">Staff Loan</SelectItem>
                              <SelectItem value="OTHERS">Others</SelectItem>
                              <SelectItem value="UNKNOWN">Unknown</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                            Only Invoice Payment allocates against invoices.
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paymentFormValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL}>Reference</FormLabel>
                          <FormControl>
                            <Input placeholder="Transfer reference, cheque no., etc." {...field} className={FIELD} />
                          </FormControl>
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
                              placeholder="Anything worth recording about this receipt."
                              {...field}
                              className="rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 min-h-24"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="allocations" className="m-0 space-y-4 animate-in fade-in duration-300">
                  {watched.purpose !== "INVOICE" ? (
                    <div className="rounded-2xl border border-primary/10 bg-muted/20 p-5 text-[12px] font-medium text-muted-foreground">
                      This voucher is not an invoice payment, so it is not allocated against invoices.
                    </div>
                  ) : (
                    <>
                      {fields.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-primary/10 py-10 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
                          No allocation yet
                        </div>
                      )}

                      {fields.map((fieldItem, index) => {
                        const row = watched.allocations?.[index];
                        const option = invoiceOptions.find((item) => item.id === row?.invoiceId);

                        return (
                          <div
                            key={fieldItem.id}
                            className="rounded-2xl border border-primary/10 bg-muted/20 p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                                Allocation {index + 1}
                                {option?.balanceDue
                                  ? ` · outstanding ${formatCurrency(option.balanceDue)}`
                                  : ""}
                              </span>
                              <div className="flex items-center gap-4">
                                <span className="text-[12px] font-extrabold text-primary tabular-nums">
                                  {formatCurrency(rowReduction(row || ({} as any)))}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => remove(index)}
                                  className="h-8 w-8 p-0 rounded-lg text-destructive hover:bg-destructive/5"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>

                            <FormField
                              control={form.control}
                              name={`allocations.${index}.invoiceId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={LABEL}>Invoice</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className={CELL}>
                                        <SelectValue placeholder="Select an outstanding invoice" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {invoiceOptions.map((invoice) => (
                                        <SelectItem key={invoice.id} value={invoice.id}>
                                          {invoice.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-5 gap-3">
                              {([
                                ["amountApplied", "Cash Applied"],
                                ["pph23Deduction", "PPh23"],
                                ["bankCharge", "Bank Charge"],
                                ["ppnWapuDeduction", "PPN WAPU"],
                                ["othersAdjustment", "Others"],
                              ] as const).map(([name, label]) => (
                                <FormField
                                  key={name}
                                  control={form.control}
                                  name={`allocations.${index}.${name}` as const}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className={LABEL}>{label}</FormLabel>
                                      <FormControl>
                                        <Input type="number" step="0.01" placeholder="0" {...field} className={CELL} />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>

                            <FormField
                              control={form.control}
                              name={`allocations.${index}.adjustmentDescription`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={LABEL}>Adjustment Note</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Why the deduction" {...field} className={CELL} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        );
                      })}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => append(emptyAllocation())}
                        className="h-11 w-full rounded-xl border-dashed border-primary/20 font-bold text-xs uppercase tracking-widest gap-2"
                      >
                        <Plus size={16} />
                        Add Allocation
                      </Button>

                      <div className="rounded-2xl border border-primary/10 bg-primary/5 p-5 space-y-2">
                        <div className="flex justify-between text-[12px] font-medium text-muted-foreground">
                          <span>Voucher Amount</span>
                          <span className="tabular-nums font-bold text-primary">
                            {formatCurrency(num(watched.amount))}
                          </span>
                        </div>
                        <div className="flex justify-between text-[12px] font-medium text-muted-foreground">
                          <span>Cash Allocated</span>
                          <span className="tabular-nums font-bold text-primary">{formatCurrency(totalApplied)}</span>
                        </div>
                        <div className="flex justify-between border-t border-primary/10 pt-2 text-[13px] font-extrabold text-primary">
                          <span className="uppercase tracking-wider">Unallocated</span>
                          <span className="tabular-nums">{formatCurrency(unallocated)}</span>
                        </div>
                        {unallocated < 0 && (
                          <div className="flex items-start gap-2 pt-1 text-[11px] font-bold text-destructive">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                            Allocated cash exceeds the voucher amount — the backend will reject this.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </TabsContent>
              </div>
            </Tabs>

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
