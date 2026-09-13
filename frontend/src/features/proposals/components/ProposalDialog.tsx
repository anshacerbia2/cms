import { useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ClipboardList, Plus, Trash2, Info, Layers, Lock } from "lucide-react";
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
import { useProjectOptions } from "@/features/projects/hooks/useProjects";
import { useProducts } from "@/features/products/hooks/useProducts";
import { Proposal, CreateProposalInput, PricingModel } from "../types";
import { AmountInput } from "@/components/common/AmountInput";

const itemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().optional(),
  sellingPrice: z.string().min(1, "Required"),
  qty: z.string().optional(),
  title1Key: z.string().optional(),
  title1Value: z.string().optional(),
  title2Key: z.string().optional(),
  title2Value: z.string().optional(),
  title3Key: z.string().optional(),
  title3Value: z.string().optional(),
  title4Key: z.string().optional(),
  title4Value: z.string().optional(),
});

const formSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  pricingModel: z.enum(["A", "B", "C", "D"]),
  status: z.enum(["DRAFT", "SUBMITTED", "WIN", "LOSE", "CANCELLED"]),
  managementFeeType: z.enum(["NOMINAL", "PERCENT"]),
  managementFee: z.string().optional(),
  vatRate: z.string().optional(),
  note: z.string().optional(),
  pricingModelDescription: z.string().optional(),
  totalAmountItems: z.string().optional(),
  items: z.array(itemSchema),
})
  /**
   * The pricing model decides which of the fields below are required, so these
   * rules cannot live on the fields themselves. Without them the form submits
   * happily and the API answers with a toast — the user is told, but not where,
   * and whatever they typed is still on screen unmarked.
   *
   * These mirror the server exactly. If one side is ever changed, change both.
   */
  .superRefine((values, ctx) => {
    const TITLES = [1, 2, 3, 4] as const;

    if (values.vatRate && !["1", "11"].includes(values.vatRate.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vatRate"],
        message: "VAT rate must be 1 or 11",
      });
    }

    if (values.pricingModel === "A") {
      if (!values.totalAmountItems?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["totalAmountItems"],
          message: "Lump sum total is required for model A",
        });
      }
      return;
    }

    if (values.items.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: `Model ${values.pricingModel} bills per line item, so add at least one`,
      });
      return;
    }

    if (values.pricingModel === "A" || values.pricingModel === "B") return;

    // Models C and D multiply the price by each titled value. A row with no
    // titles totals to the bare price and looks deliberate; a key without its
    // value multiplies by nothing.
    values.items.forEach((item, index) => {
      let complete = 0;

      for (const slot of TITLES) {
        const key = (item as Record<string, unknown>)[`title${slot}Key`];
        const value = (item as Record<string, unknown>)[`title${slot}Value`];
        const hasKey = typeof key === "string" && key.trim() !== "";
        const hasValue = value !== undefined && value !== null && String(value).trim() !== "" && Number(value) !== 0;

        if (hasKey !== hasValue) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["items", index, hasKey ? `title${slot}Value` : `title${slot}Key`],
            message: "Label and value go together",
          });
        }
        if (hasKey && hasValue) complete++;
      }

      if (complete === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "title1Key"],
          message: "Add at least one label and value",
        });
      }
    });
  });

type FormValues = z.infer<typeof formSchema>;

const LABEL = "text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2";
const FIELD = "h-12 rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 font-bold tracking-tight";
const CELL = "h-10 rounded-lg bg-white border-primary/5 focus-visible:ring-primary/10 text-[13px]";

const PRICING_MODEL_HINTS: Record<PricingModel, string> = {
  A: "Lump sum — one line, total entered directly.",
  B: "Quantity × selling price per line.",
  C: "Selling price × up to four named multipliers.",
  D: "Selling price × up to four named multipliers.",
};

const num = (value?: string) => Number(value || 0) || 0;

/** Mirrors the backend pricing engine so the totals shown match what will be saved. */
const lineTotal = (model: PricingModel, item: FormValues["items"][number]) => {
  const price = num(item.sellingPrice);
  if (model === "B") return num(item.qty) * price;
  return [item.title1Value, item.title2Value, item.title3Value, item.title4Value].reduce(
    (acc, value) => (num(value) ? acc * num(value) : acc),
    price,
  );
};

const emptyItem = () => ({
  productId: "",
  description: "",
  sellingPrice: "",
  qty: "",
  title1Key: "",
  title1Value: "",
  title2Key: "",
  title2Value: "",
  title3Key: "",
  title3Value: "",
  title4Key: "",
  title4Value: "",
});

const DEFAULTS: FormValues = {
  projectId: "",
  pricingModel: "B",
  status: "DRAFT",
  managementFeeType: "PERCENT",
  managementFee: "0",
  vatRate: "11",
  note: "",
  pricingModelDescription: "",
  totalAmountItems: "",
  items: [],
};

interface ProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateProposalInput) => void;
  proposal?: Proposal | null;
  isSubmitting?: boolean;
}

export function ProposalDialog({
  open,
  onOpenChange,
  onSubmit,
  proposal,
  isSubmitting,
}: ProposalDialogProps) {
  // FIT projects bill directly, so they can never carry a proposal.
  const { data: projects = [] } = useProjectOptions({ type: "REGULAR" });
  const { productsQuery } = useProducts({ limit: 100 });
  const products = productsQuery.data?.data || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: DEFAULTS,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  // Rows already pulled onto an invoice are frozen by the backend; they are shown for
  // context but never resubmitted, or the rebuild would duplicate them.
  const billedItems = (proposal?.salesItems || []).filter((item) => item.invoiceId);

  useEffect(() => {
    if (!open) return;

    if (!proposal) {
      form.reset(DEFAULTS);
      return;
    }

    form.reset({
      projectId: proposal.projectId,
      pricingModel: proposal.pricingModel,
      status: proposal.status,
      managementFeeType: proposal.managementFeeType,
      managementFee: String(Number(proposal.managementFee ?? 0)),
      vatRate: String(proposal.vatRate ?? 0),
      note: proposal.note || "",
      pricingModelDescription: proposal.pricingModelDescription || "",
      totalAmountItems: String(Number(proposal.totalAmountItems ?? 0)),
      items: (proposal.salesItems || [])
        .filter((item) => !item.invoiceId)
        .map((item) => ({
          productId: item.productId || "",
          description: item.description || "",
          sellingPrice: String(Number(item.sellingPrice)),
          qty: item.title1Value != null ? String(item.title1Value) : "",
          title1Key: item.title1Key || "",
          title1Value: item.title1Value != null ? String(item.title1Value) : "",
          title2Key: item.title2Key || "",
          title2Value: item.title2Value != null ? String(item.title2Value) : "",
          title3Key: item.title3Key || "",
          title3Value: item.title3Value != null ? String(item.title3Value) : "",
          title4Key: item.title4Key || "",
          title4Value: item.title4Value != null ? String(item.title4Value) : "",
        })),
    });
  }, [proposal, form, open]);

  const watched = form.watch();
  const model = watched.pricingModel;

  const totals = useMemo(() => {
    const billedTotal = billedItems.reduce((acc, item) => acc + Number(item.totalPrice), 0);
    const base =
      model === "A"
        ? num(watched.totalAmountItems)
        : billedTotal + (watched.items || []).reduce((acc, item) => acc + lineTotal(model, item), 0);

    const fee = num(watched.managementFee);
    const managementFeeAmount = watched.managementFeeType === "PERCENT" ? (base * fee) / 100 : fee;
    const salesAmount = base + managementFeeAmount;
    const vatAmount = (salesAmount * num(watched.vatRate)) / 100;

    return { base, managementFeeAmount, salesAmount, vatAmount, invoiceAmount: salesAmount + vatAmount };
  }, [watched, model, billedItems]);

  const handleSubmit = (values: FormValues) => {
    const payload: CreateProposalInput = {
      projectId: Number(values.projectId),
      pricingModel: values.pricingModel,
      status: values.status,
      managementFeeType: values.managementFeeType,
      managementFee: num(values.managementFee),
      vatRate: Math.round(num(values.vatRate)),
      note: values.note || undefined,
      pricingModelDescription: values.pricingModelDescription || undefined,
    };

    if (values.pricingModel === "A") {
      payload.totalAmountItems = num(values.totalAmountItems);
      payload.items = [];
    } else {
      payload.items = values.items.map((item) => ({
        productId: item.productId ? Number(item.productId) : undefined,
        description: item.description || undefined,
        sellingPrice: num(item.sellingPrice),
        ...(values.pricingModel === "B"
          ? { qty: Math.round(num(item.qty)) }
          : {
              title1Key: item.title1Key || undefined,
              title1Value: item.title1Value ? Math.round(num(item.title1Value)) : undefined,
              title2Key: item.title2Key || undefined,
              title2Value: item.title2Value ? Math.round(num(item.title2Value)) : undefined,
              title3Key: item.title3Key || undefined,
              title3Value: item.title3Value ? Math.round(num(item.title3Value)) : undefined,
              title4Key: item.title4Key || undefined,
              title4Value: item.title4Value ? Math.round(num(item.title4Value)) : undefined,
            }),
      }));
    }

    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] h-[90vh] flex flex-col rounded-3xl border-primary/5 shadow-premium overflow-hidden p-0">
        <div className="bg-primary/5 px-8 pt-8 pb-4 border-b border-primary/5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary tracking-tight uppercase flex items-center gap-3">
              <ClipboardList className="w-8 h-8" strokeWidth={2.5} />
              {proposal ? "Modify Proposal" : "Create Proposal"}
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-2 opacity-70">
              {proposal ? `Editing ${proposal.code}` : "Price the scope; winning the proposal issues its sales code."}
            </p>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-8 bg-primary/5 border-b border-primary/5">
                <TabsList className="bg-transparent h-12 gap-6 p-0">
                  {["general", "items"].map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 text-[10px] font-extrabold uppercase tracking-widest transition-all"
                    >
                      {tab === "general" ? "General Info" : "Pricing Items"}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                <TabsContent value="general" className="m-0 space-y-8 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className={LABEL}>
                            <Info size={12} className="text-secondary" />
                            Project
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={FIELD}>
                                <SelectValue placeholder="Select a regular project" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {projects.map((project) => (
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

                    <FormField
                      control={form.control}
                      name="pricingModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={LABEL}>Pricing Model</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={FIELD}>
                                <SelectValue placeholder="Select model" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="A">Type A — Lump Sum</SelectItem>
                              <SelectItem value="B">Type B — Quantity</SelectItem>
                              <SelectItem value="C">Type C — Multipliers</SelectItem>
                              <SelectItem value="D">Type D — Multipliers</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                            {PRICING_MODEL_HINTS[field.value as PricingModel]}
                          </FormDescription>
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
                              <SelectItem value="DRAFT">DRAFT</SelectItem>
                              <SelectItem value="SUBMITTED">SUBMITTED</SelectItem>
                              <SelectItem value="WIN">WIN</SelectItem>
                              <SelectItem value="LOSE">LOSE</SelectItem>
                              <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                            WIN issues the sales code and freezes the proposal.
                          </FormDescription>
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
                          <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
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
                          <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
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
                            <Input type="number" min={0} step="1" {...field} className={FIELD} />
                          </FormControl>
                          <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="note"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className={LABEL}>Note</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Internal note for this proposal."
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
                  {billedItems.length > 0 && (
                    <div className="rounded-2xl border border-primary/10 bg-muted/20 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                        <Lock size={12} />
                        Already invoiced — kept as is
                      </div>
                      {billedItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-[12px] font-medium text-primary">
                          <span>{item.subheader || item.description || "Item"}</span>
                          <span className="tabular-nums font-bold">{formatCurrency(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {model === "A" ? (
                    <div className="grid grid-cols-2 gap-8">
                      <FormField
                        control={form.control}
                        name="totalAmountItems"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={LABEL}>Lump Sum Total (IDR)</FormLabel>
                            <FormControl>
                              <AmountInput value={field.value} onChange={field.onChange} className={FIELD} />
                            </FormControl>
                            <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pricingModelDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={LABEL}>Line Description</FormLabel>
                            <FormControl>
                              <Input placeholder="What the lump sum covers" {...field} className={FIELD} />
                            </FormControl>
                            <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fields.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-primary/10 py-10 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
                          No items yet
                        </div>
                      )}

                      {fields.map((fieldItem, index) => (
                        <div
                          key={fieldItem.id}
                          className="rounded-2xl border border-primary/10 bg-muted/20 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                              Item {index + 1}
                            </span>
                            <div className="flex items-center gap-4">
                              <span className="text-[12px] font-extrabold text-primary tabular-nums">
                                {formatCurrency(lineTotal(model, watched.items?.[index] || ({} as any)))}
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

                          <div className="grid grid-cols-4 gap-3">
                            <FormField
                              control={form.control}
                              name={`items.${index}.productId`}
                              render={({ field }) => (
                                <FormItem className="col-span-2">
                                  <FormLabel className={LABEL}>Product</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className={CELL}>
                                        <SelectValue placeholder="Optional" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {products.map((product) => (
                                        <SelectItem key={product.id} value={product.id}>
                                          {product.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`items.${index}.sellingPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={LABEL}>Selling Price</FormLabel>
                                  <FormControl>
                                    <AmountInput value={field.value} onChange={field.onChange} className={CELL} />
                                  </FormControl>
                                  <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                                </FormItem>
                              )}
                            />

                            {model === "B" ? (
                              <FormField
                                control={form.control}
                                name={`items.${index}.qty`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className={LABEL}>Qty</FormLabel>
                                    <FormControl>
                                      <Input type="number" min={0} step="1" {...field} className={CELL} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            ) : (
                              <FormField
                                control={form.control}
                                name={`items.${index}.description`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className={LABEL}>Description</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Optional" {...field} className={CELL} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>

                          {model === "B" ? (
                            <FormField
                              control={form.control}
                              name={`items.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={LABEL}>Description</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Falls back to the product description" {...field} className={CELL} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          ) : (
                            <div className="grid grid-cols-4 gap-3">
                              {([1, 2, 3, 4] as const).map((slot) => (
                                <div key={slot} className="grid grid-cols-2 gap-2">
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.title${slot}Key` as const}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className={LABEL}>Label {slot}</FormLabel>
                                        <FormControl>
                                          <Input placeholder="e.g. Days" {...field} className={CELL} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.title${slot}Value` as const}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className={LABEL}>Value</FormLabel>
                                        <FormControl>
                                          <Input type="number" min={0} step="1" {...field} className={CELL} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => append(emptyItem())}
                        className="h-11 w-full rounded-xl border-dashed border-primary/20 font-bold text-xs uppercase tracking-widest gap-2"
                      >
                        <Plus size={16} />
                        Add Item
                      </Button>
                    </div>
                  )}

                  <div className="rounded-2xl border border-primary/10 bg-primary/5 p-5 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/50">
                      <Layers size={12} />
                      Summary
                    </div>
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
                  </div>
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
                {isSubmitting ? "Saving..." : proposal ? "Save Changes" : "Create Proposal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
