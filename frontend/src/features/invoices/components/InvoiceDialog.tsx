import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FileText, Info, Lock, Landmark } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useProjectOptions } from "@/features/projects/hooks/useProjects";
import { useProposalOptions, useProposal } from "@/features/proposals/hooks/useProposals";
import { useCustomer } from "@/features/customers/hooks/useCustomers";
import { useBanks } from "@/features/banks/hooks/useBanks";
import { Invoice, CreateInvoiceInput } from "../types";
import { AmountInput } from "@/components/common/AmountInput";

const formSchema = z.object({
  source: z.enum(["PROPOSAL", "FIT"]),
  proposalId: z.string().optional(),
  projectId: z.string().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  dueDate: z.string().min(1, "Due date is required"),
  billingType: z.enum(["PARTLY_PAYMENT", "FULL_AMOUNT"]),
  taxType: z.enum(["NO_TAX", "TAX_NON_WAPU", "TAX_WAPU"]),
  status: z.enum(["VOID", "REVISED", "PREPARED", "SENT"]),
  description: z.string().optional(),
  billingOptionId: z.string().optional(),
  internalAccountId: z.string().optional(),
  itemIds: z.array(z.string()),
  totalAmount: z.string().optional(),
  managementFeeType: z.enum(["NOMINAL", "PERCENT"]),
  managementFee: z.string().optional(),
  vatRate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const LABEL = "text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2";
const FIELD = "h-12 rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 font-bold tracking-tight";
const NONE = "NONE";

const num = (value?: string) => Number(value || 0) || 0;

const DEFAULTS: FormValues = {
  source: "PROPOSAL",
  proposalId: "",
  projectId: "",
  invoiceNumber: "",
  dueDate: "",
  billingType: "FULL_AMOUNT",
  taxType: "TAX_NON_WAPU",
  status: "PREPARED",
  description: "",
  billingOptionId: NONE,
  internalAccountId: NONE,
  itemIds: [],
  totalAmount: "",
  managementFeeType: "PERCENT",
  managementFee: "0",
  vatRate: "11",
};

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateInvoiceInput) => void;
  invoice?: Invoice | null;
  isSubmitting?: boolean;
}

export function InvoiceDialog({
  open,
  onOpenChange,
  onSubmit,
  invoice,
  isSubmitting,
}: InvoiceDialogProps) {
  // Only a won proposal has a sales code to bill against; FIT projects bill directly.
  const { data: proposals = [] } = useProposalOptions({ status: "WIN" });
  const { data: fitProjects = [] } = useProjectOptions({ type: "FIT" });
  const { internalAccountsQuery } = useBanks({ accounts: { limit: 100, enabled: true } });
  const accounts = internalAccountsQuery.data?.data || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: DEFAULTS,
  });

  const watched = form.watch();
  const { data: selectedProposal } = useProposal(
    watched.source === "PROPOSAL" ? watched.proposalId || null : null,
  );

  const customerId =
    watched.source === "PROPOSAL"
      ? selectedProposal?.project?.customerId
      : fitProjects.find((project) => project.id === watched.projectId)?.customerId;

  const { data: customer } = useCustomer(customerId);
  const billingOptions = customer?.billingOptions || [];

  // Once cash has been applied the backend freezes the figures the RV reconciled against.
  const hasVouchers = (invoice?.receiveVouchers?.length ?? 0) > 0;

  useEffect(() => {
    if (!open) return;

    if (!invoice) {
      form.reset(DEFAULTS);
      return;
    }

    form.reset({
      source: invoice.proposalId ? "PROPOSAL" : "FIT",
      proposalId: invoice.proposalId || "",
      projectId: invoice.projectId || "",
      invoiceNumber: invoice.invoiceNumber,
      dueDate: invoice.dueDate.slice(0, 10),
      billingType: invoice.billingType,
      taxType: invoice.taxType,
      status: invoice.status,
      description: invoice.description || "",
      billingOptionId: invoice.billingOptionId || NONE,
      internalAccountId: invoice.internalAccountId || NONE,
      itemIds: (invoice.salesItems || []).map((item) => item.id),
      totalAmount: String(Number(invoice.totalAmount ?? 0)),
      managementFeeType: invoice.managementFeeType,
      managementFee: String(Number(invoice.managementFee ?? 0)),
      vatRate: String(invoice.vatRate ?? 0),
    });
  }, [invoice, form, open]);

  // Items still available to bill: unbilled ones, plus the ones this invoice already holds.
  const availableItems = (selectedProposal?.salesItems || []).filter(
    (item) => !item.invoiceId || (invoice && item.invoiceId === invoice.id),
  );

  const totals = useMemo(() => {
    const base =
      watched.source === "FIT"
        ? num(watched.totalAmount)
        : watched.billingType === "FULL_AMOUNT"
          ? availableItems.reduce((acc, item) => acc + Number(item.totalPrice), 0)
          : availableItems
              .filter((item) => watched.itemIds?.includes(item.id))
              .reduce((acc, item) => acc + Number(item.totalPrice), 0);

    const feeType =
      watched.source === "FIT" ? watched.managementFeeType : selectedProposal?.managementFeeType;
    const feeValue =
      watched.source === "FIT" ? num(watched.managementFee) : Number(selectedProposal?.managementFee ?? 0);

    // A proposal's nominal fee is prorated across the items actually billed.
    const proposalTotal = Number(selectedProposal?.totalAmountItems ?? 0);
    const managementFeeAmount =
      feeType === "PERCENT"
        ? (base * feeValue) / 100
        : watched.source === "FIT" || proposalTotal === 0
          ? feeValue
          : feeValue * (base / proposalTotal);

    const salesAmount = base + managementFeeAmount;
    const vatRate =
      watched.source === "FIT" ? num(watched.vatRate) : Number(selectedProposal?.vatRate ?? 0);
    const vatAmount = watched.taxType === "NO_TAX" ? 0 : (salesAmount * vatRate) / 100;

    return { base, managementFeeAmount, salesAmount, vatAmount, invoiceAmount: salesAmount + vatAmount };
  }, [watched, selectedProposal, availableItems]);

  const toggleItem = (id: string) => {
    const current = form.getValues("itemIds") || [];
    form.setValue(
      "itemIds",
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      { shouldDirty: true },
    );
  };

  const handleSubmit = (values: FormValues) => {
    if (!customerId) {
      form.setError("root", { message: "Pick a proposal or FIT project first." });
      return;
    }

    const payload: CreateInvoiceInput = {
      customerId: Number(customerId),
      invoiceNumber: values.invoiceNumber,
      dueDate: values.dueDate,
      billingType: values.billingType,
      taxType: values.taxType,
      status: values.status,
      description: values.description || undefined,
      billingOptionId: values.billingOptionId !== NONE ? Number(values.billingOptionId) : undefined,
      internalAccountId: values.internalAccountId !== NONE ? Number(values.internalAccountId) : undefined,
    };

    if (values.source === "FIT") {
      payload.projectId = Number(values.projectId);
      payload.totalAmount = num(values.totalAmount);
      payload.managementFeeType = values.managementFeeType;
      payload.managementFee = num(values.managementFee);
      payload.vatRate = Math.round(num(values.vatRate));
    } else {
      payload.proposalId = Number(values.proposalId);
      if (values.billingType === "PARTLY_PAYMENT") {
        payload.itemIds = (values.itemIds || []).map(Number);
      }
    }

    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] h-[90vh] flex flex-col rounded-3xl border-primary/5 shadow-premium overflow-hidden p-0">
        <div className="bg-primary/5 px-8 pt-8 pb-4 border-b border-primary/5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary tracking-tight uppercase flex items-center gap-3">
              <FileText className="w-8 h-8" strokeWidth={2.5} />
              {invoice ? "Modify Invoice" : "Issue Invoice"}
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-2 opacity-70">
              {invoice ? `Editing ${invoice.code}` : "Bill a won proposal, or a FIT project directly."}
            </p>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-8 bg-primary/5 border-b border-primary/5">
                <TabsList className="bg-transparent h-12 gap-6 p-0">
                  {[
                    ["general", "Billing Source"],
                    ["items", "Amounts"],
                    ["settlement", "Settlement"],
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
                {hasVouchers && (
                  <div className="mb-6 rounded-2xl border border-primary/10 bg-muted/30 p-4 flex items-start gap-3">
                    <Lock className="w-4 h-4 text-primary/50 mt-0.5 shrink-0" />
                    <p className="text-[12px] font-medium text-muted-foreground">
                      This invoice has receive vouchers applied, so its tax type, amount and customer
                      are frozen. Detach the vouchers first to change them.
                    </p>
                  </div>
                )}

                <TabsContent value="general" className="m-0 space-y-8 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL}>
                            <Info size={12} className="text-secondary" />
                            Billing Source
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!!invoice}>
                            <FormControl>
                              <SelectTrigger className={FIELD}>
                                <SelectValue placeholder="Select source" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PROPOSAL">Won Proposal</SelectItem>
                              <SelectItem value="FIT">FIT Project</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                        </FormItem>
                      )}
                    />

                    {watched.source === "PROPOSAL" ? (
                      <FormField
                        control={form.control}
                        name="proposalId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={LABEL}>Proposal</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!!invoice}>
                              <FormControl>
                                <SelectTrigger className={FIELD}>
                                  <SelectValue placeholder="Select a won proposal" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {proposals.map((proposal) => (
                                  <SelectItem key={proposal.id} value={proposal.id}>
                                    {proposal.code} — {proposal.project?.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={form.control}
                        name="projectId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={LABEL}>FIT Project</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!!invoice}>
                              <FormControl>
                                <SelectTrigger className={FIELD}>
                                  <SelectValue placeholder="Select a FIT project" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {fitProjects.map((project) => (
                                  <SelectItem key={project.id} value={project.id}>
                                    {project.code} — {project.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormItem>
                      <FormLabel className={LABEL}>Customer</FormLabel>
                      <Input
                        value={customer?.name || ""}
                        readOnly
                        placeholder="Derived from the billing source"
                        className={`${FIELD} opacity-70`}
                      />
                    </FormItem>

                    <FormField
                      control={form.control}
                      name="invoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL}>Invoice Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. INV/2026/09/001" {...field} className={FIELD} />
                          </FormControl>
                          <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL}>Due Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className={FIELD} />
                          </FormControl>
                          <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL}>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={FIELD}>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PREPARED">PREPARED</SelectItem>
                              <SelectItem value="SENT">SENT</SelectItem>
                              <SelectItem value="REVISED">REVISED</SelectItem>
                              <SelectItem value="VOID">VOID</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
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
                              placeholder="What this invoice covers."
                              {...field}
                              className="rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 min-h-24"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="items" className="m-0 space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="billingType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL}>Billing Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={FIELD}>
                                <SelectValue placeholder="Select billing type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="FULL_AMOUNT">Full Amount</SelectItem>
                              <SelectItem value="PARTLY_PAYMENT">Partly Payment</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                            Full bills every item at once and only works on a proposal with no other
                            invoice.
                          </FormDescription>
                          <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="taxType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL}>Tax Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={hasVouchers}>
                            <FormControl>
                              <SelectTrigger className={FIELD}>
                                <SelectValue placeholder="Select tax type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="TAX_NON_WAPU">Taxed — Non WAPU</SelectItem>
                              <SelectItem value="TAX_WAPU">Taxed — WAPU</SelectItem>
                              <SelectItem value="NO_TAX">No Tax</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                            No Tax invoices carry no VAT and settle to the non-VAT account.
                          </FormDescription>
                          <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {watched.source === "FIT" ? (
                    <div className="grid grid-cols-2 gap-8">
                      <FormField
                        control={form.control}
                        name="totalAmount"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className={LABEL}>Billed Amount (IDR)</FormLabel>
                            <FormControl>
                              <AmountInput
                                value={field.value}
                                onChange={field.onChange}
                                disabled={hasVouchers}
                                className={FIELD}
                              />
                            </FormControl>
                            <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="managementFeeType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={LABEL}>Management Fee Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className={FIELD}>
                                  <SelectValue placeholder="Select fee type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="PERCENT">PERCENT</SelectItem>
                                <SelectItem value="NOMINAL">NOMINAL</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="managementFee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={LABEL}>
                              Management Fee {watched.managementFeeType === "PERCENT" ? "(%)" : "(IDR)"}
                            </FormLabel>
                            <FormControl>
                              {watched.managementFeeType === "NOMINAL" ? (
                                <AmountInput value={field.value} onChange={field.onChange} className={FIELD} />
                              ) : (
                                <Input type="number" min={0} step="0.01" {...field} className={FIELD} />
                              )}
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="vatRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={LABEL}>VAT Rate (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                step="1"
                                {...field}
                                disabled={watched.taxType === "NO_TAX"}
                                className={FIELD}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/50">
                        {watched.billingType === "FULL_AMOUNT"
                          ? "Every available item is billed"
                          : "Select the items to bill"}
                      </div>

                      {!selectedProposal ? (
                        <div className="rounded-2xl border border-dashed border-primary/10 py-8 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
                          Pick a proposal first
                        </div>
                      ) : availableItems.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-primary/10 py-8 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
                          No items left to bill on this proposal
                        </div>
                      ) : (
                        availableItems.map((item) => {
                          const selected =
                            watched.billingType === "FULL_AMOUNT" ||
                            (watched.itemIds || []).includes(item.id);

                          return (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() =>
                                watched.billingType === "PARTLY_PAYMENT" && toggleItem(item.id)
                              }
                              disabled={watched.billingType === "FULL_AMOUNT"}
                              className={`w-full flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                                selected
                                  ? "border-primary/30 bg-primary/5"
                                  : "border-primary/10 bg-muted/20 hover:bg-muted/40"
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-[13px] text-primary">
                                  {item.subheader || item.description || "Item"}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {formatCurrency(item.sellingPrice)}
                                  {item.title1Key ? ` · ${item.title1Key} ${item.title1Value}` : ""}
                                </span>
                              </div>
                              <span className="font-extrabold text-[13px] text-primary tabular-nums">
                                {formatCurrency(item.totalPrice)}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}

                  <div className="rounded-2xl border border-primary/10 bg-primary/5 p-5 space-y-2">
                    {([
                      ["Items Total", totals.base],
                      ["Management Fee", totals.managementFeeAmount],
                      ["Sales Amount", totals.salesAmount],
                      ["VAT", totals.vatAmount],
                    ] as const).map(([label, value]) => (
                      <div key={label} className="flex justify-between text-[12px] font-medium text-muted-foreground">
                        <span>{label}</span>
                        <span className="tabular-nums font-bold text-primary">{formatCurrency(value)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-primary/10 pt-2 text-[13px] font-extrabold text-primary">
                      <span className="uppercase tracking-wider">Invoice Amount</span>
                      <span className="tabular-nums">{formatCurrency(totals.invoiceAmount)}</span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 pt-1">
                      Balance due starts at the invoice amount, not the items total.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="settlement" className="m-0 space-y-8 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="billingOptionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL}>Billing Option</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={FIELD}>
                                <SelectValue placeholder="Customer billing contact" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={NONE}>None</SelectItem>
                              {billingOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.cpName || option.address || `Option ${option.id}`}
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
                            Settlement Account
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={FIELD}>
                                <SelectValue placeholder="Where the customer pays" />
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
                          {watched.taxType === "NO_TAX" && (
                            <FormDescription className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                              No Tax — settle to the company's non-VAT account.
                            </FormDescription>
                          )}
                          <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {invoice && (
                    <div className="rounded-2xl border border-primary/10 bg-muted/20 p-5 space-y-2">
                      <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/50">
                        Reconciliation
                      </div>
                      {([
                        ["Received", invoice.totalReceivedAmount],
                        ["PPh23 Withheld", invoice.totalPph23Deduction],
                        ["Bank Charges", invoice.totalBankCharge],
                        ["Balance Due", invoice.balanceDue],
                      ] as const).map(([label, value]) => (
                        <div key={label} className="flex justify-between text-[12px] font-medium text-muted-foreground">
                          <span>{label}</span>
                          <span className="tabular-nums font-bold text-primary">{formatCurrency(value)}</span>
                        </div>
                      ))}
                      <div className="pt-1">
                        <Badge variant="outline" className="bg-white border-primary/10 text-[10px] font-extrabold uppercase tracking-widest">
                          {invoice.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter className="px-8 py-5 border-t border-primary/5 bg-muted/20">
              {form.formState.errors.root && (
                <span className="mr-auto text-[10px] font-bold uppercase tracking-wider text-destructive">
                  {form.formState.errors.root.message}
                </span>
              )}
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
                {isSubmitting ? "Saving..." : invoice ? "Save Changes" : "Issue Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
