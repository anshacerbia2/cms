import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Printer, Eye, Code2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PdfTemplate, CreatePdfTemplateInput } from "../types";

const LABEL = "text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2";
const FIELD = "h-12 rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 font-bold tracking-tight";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["INVOICE", "PROPOSAL"]),
  htmlContent: z.string().min(1, "Template markup is required"),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

/** Placeholders the print service fills, so the editor can list what is available. */
const AVAILABLE: Record<string, string[]> = {
  INVOICE: [
    "invoice_code", "invoice_number", "invoice_date", "due_date", "customer_name",
    "bill_to", "bill_to_contact", "project_name", "project_description", "sales_code",
    "tax_type", "billing_type", "status", "payment_status", "bank_name", "bank_account",
    "bank_account_name", "bank_branch", "notes", "items_rows", "totals_rows",
  ],
  PROPOSAL: [
    "proposal_code", "proposal_date", "sales_code", "status", "customer_name",
    "project_name", "project_description", "pricing_model", "pricing_model_description",
    "notes", "items_rows", "totals_rows",
  ],
};

interface PdfTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePdfTemplateInput) => void;
  template?: PdfTemplate | null;
  onPreview: (html: string) => Promise<{ html: string } | undefined>;
  isSubmitting?: boolean;
}

export function PdfTemplateDialog({
  open,
  onOpenChange,
  onSubmit,
  template,
  onPreview,
  isSubmitting,
}: PdfTemplateDialogProps) {
  const [previewHtml, setPreviewHtml] = useState<string>("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "INVOICE",
      htmlContent: "",
      description: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (!open) return;

    form.reset({
      name: template?.name ?? "",
      type: template?.type ?? "INVOICE",
      htmlContent: template?.htmlContent ?? "",
      description: template?.description ?? "",
      isActive: template?.isActive ?? true,
    });
    setPreviewHtml("");
  }, [open, template, form]);

  const type = form.watch("type");
  const markup = form.watch("htmlContent");

  const handlePreview = async () => {
    const result = await onPreview(markup);
    if (result) setPreviewHtml(result.html);
  };

  // Placeholders present in the markup but not produced by the print service.
  const used = new Set([...markup.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((m) => m[1]));
  const unknown = [...used].filter((name) => !AVAILABLE[type]?.includes(name));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border-primary/5 shadow-premium">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-extrabold uppercase tracking-tight">
            <Printer size={18} />
            {template ? `Edit ${template.name}` : "New Print Template"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel className={LABEL}>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Default Invoice" {...field} className={FIELD} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={FIELD}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INVOICE">Invoice</SelectItem>
                        <SelectItem value="PROPOSAL">Proposal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL}>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Standard A4 layout" {...field} className={FIELD} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded accent-primary"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    <span className="text-[12px] font-semibold text-muted-foreground">
                      Use this template when printing {type.toLowerCase()}s
                    </span>
                  </label>
                  <p className="text-[10px] text-muted-foreground">
                    Only one template per type is used; saving this as active turns the
                    others off.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Tabs defaultValue="markup">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="markup" className="gap-2">
                    <Code2 size={14} />
                    Markup
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-2" onClick={handlePreview}>
                    <Eye size={14} />
                    Preview
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="markup" className="space-y-3 pt-3">
                <FormField
                  control={form.control}
                  name="htmlContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          rows={16}
                          spellCheck={false}
                          className="rounded-xl bg-muted/20 border-primary/5 resize-none font-mono text-[11px] leading-relaxed"
                          placeholder="<div>{{invoice_code}}</div>"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {unknown.length > 0 && (
                  <p className="text-[11px] text-amber-600 font-semibold">
                    Not filled for {type.toLowerCase()}s, will render blank:{" "}
                    {unknown.join(", ")}
                  </p>
                )}

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">
                    Available placeholders
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(AVAILABLE[type] ?? []).map((name) => (
                      <Badge
                        key={name}
                        variant="outline"
                        className={`font-mono text-[10px] cursor-pointer transition-colors ${
                          used.has(name)
                            ? "bg-primary/10 border-primary/20 text-primary"
                            : "text-muted-foreground"
                        }`}
                        onClick={() =>
                          form.setValue("htmlContent", `${markup}{{${name}}}`, {
                            shouldDirty: true,
                          })
                        }
                      >
                        {`{{${name}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="pt-3">
                {previewHtml ? (
                  <iframe
                    title="Template preview"
                    // Sandboxed with no allow-scripts: the preview renders untrusted
                    // markup the user is editing, and must not run inside the app.
                    sandbox=""
                    srcDoc={previewHtml}
                    className="w-full h-[420px] rounded-xl border border-primary/10 bg-white"
                  />
                ) : (
                  <div className="h-[420px] rounded-xl border border-dashed border-primary/10 flex items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">
                    Rendering preview…
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-5 border-t border-primary/5">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 px-6 rounded-xl border-primary/10 font-bold text-xs uppercase tracking-widest"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-xs uppercase tracking-widest shadow-premium active:scale-95 transition-all">
                {isSubmitting ? "Saving..." : template ? "Save Changes" : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
