import { useEffect, useMemo, useState } from "react";
import { Package, Plus, Trash2, Copy, Unlink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { useProducts } from "@/features/products/hooks/useProducts";
import { useAuthStore } from "@/store/authStore";
import { useBoqs } from "../hooks/useBoqs";
import { Proposal, BoqItemInput } from "../types";
import { AmountInput } from "@/components/common/AmountInput";

interface DraftItem {
  productId: string;
  description: string;
  sellingPrice: string;
  qty: string;
  qtyUnit: string;
  freq: string;
  freqUnit: string;
}

const emptyDraft = (): DraftItem => ({
  productId: "",
  description: "",
  sellingPrice: "",
  qty: "1",
  qtyUnit: "",
  freq: "1",
  freqUnit: "",
});

const CELL = "h-10 rounded-lg bg-white border-primary/5 focus-visible:ring-primary/10 text-[13px]";
const LABEL = "text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground";

const num = (value: string) => Number(value || 0) || 0;

interface BoqDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal?: Proposal | null;
}

export function BoqDialog({ open, onOpenChange, proposal }: BoqDialogProps) {
  const { can } = useAuthStore();
  const proposalId = proposal ? Number(proposal.id) : undefined;
  const isWin = proposal?.status === "WIN";

  const { boqsQuery, createBoq, replicateBoqs, unbindBoqs, deleteBoq } = useBoqs(
    { proposalId, limit: 50 },
    open && !!proposalId,
  );
  // The library of BoQs not yet bound to any proposal — the source for replication.
  const { boqsQuery: libraryQuery } = useBoqs({ unbound: "true", limit: 50 }, open);
  const { productsQuery } = useProducts({ limit: 100 });
  const products = productsQuery.data?.data || [];

  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [replicateFrom, setReplicateFrom] = useState("");

  useEffect(() => {
    if (!open) {
      setDrafts([]);
      setReplicateFrom("");
    }
  }, [open]);

  const boqs = boqsQuery.data?.data || [];
  const library = libraryQuery.data?.data || [];

  const draftTotal = useMemo(
    () => drafts.reduce((acc, item) => acc + num(item.qty) * num(item.freq) * num(item.sellingPrice), 0),
    [drafts],
  );

  const patchDraft = (index: number, patch: Partial<DraftItem>) =>
    setDrafts((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const handleSaveDraft = async () => {
    const items: BoqItemInput[] = drafts
      .filter((item) => item.productId)
      .map((item) => ({
        productId: Number(item.productId),
        description: item.description || undefined,
        // Left blank, the backend falls back to the product's active price version.
        sellingPrice: item.sellingPrice ? num(item.sellingPrice) : undefined,
        qty: Math.round(num(item.qty)),
        qtyUnit: item.qtyUnit || undefined,
        freq: Math.round(num(item.freq)),
        freqUnit: item.freqUnit || undefined,
      }));

    if (items.length === 0) {
      toast.error("Add at least one item with a product selected.");
      return;
    }

    try {
      await createBoq.mutateAsync({ proposalId, items });
      toast.success("BoQ created successfully.");
      setDrafts([]);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create BoQ.");
    }
  };

  const handleReplicate = async () => {
    if (!replicateFrom) return;
    try {
      await replicateBoqs.mutateAsync({ boqIds: [Number(replicateFrom)], proposalId });
      toast.success("BoQ replicated into this proposal.");
      setReplicateFrom("");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to replicate BoQ.");
    }
  };

  const handleUnbind = async (id: string) => {
    try {
      await unbindBoqs.mutateAsync([Number(id)]);
      toast.success("BoQ unbound — it is back in the library.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to unbind BoQ.");
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete BoQ ${code}? This cannot be undone.`)) return;
    try {
      await deleteBoq.mutateAsync(id);
      toast.success("BoQ deleted successfully.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete BoQ.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] h-[90vh] flex flex-col rounded-3xl border-primary/5 shadow-premium overflow-hidden p-0">
        <div className="bg-primary/5 px-8 pt-8 pb-4 border-b border-primary/5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary tracking-tight uppercase flex items-center gap-3">
              <Package className="w-8 h-8" strokeWidth={2.5} />
              Bill of Quantities
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-2 opacity-70">
              {proposal ? `${proposal.code} — ${proposal.project?.name ?? ""}` : ""}
            </p>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar">
          {!isWin && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[12px] font-medium text-amber-700">
                A BoQ can only be bound to a proposal with status <strong>WIN</strong>. Existing rows are
                shown, but new ones cannot be added until the proposal is won.
              </p>
            </div>
          )}

          {/* Bound BoQs */}
          <div className="space-y-3">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/50">
              Bound to this proposal
            </div>

            {boqsQuery.isLoading ? (
              <Skeleton className="h-20 w-full rounded-2xl" />
            ) : boqs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-primary/10 py-8 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
                No BoQ bound yet
              </div>
            ) : (
              boqs.map((boq) => (
                <div key={boq.id} className="rounded-2xl border border-primary/10 bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-bold text-[13px] text-primary">{boq.code}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {boq._count?.items ?? boq.items?.length ?? 0} items
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-[13px] text-primary tabular-nums">
                        {formatCurrency(boq.totalAmountItems)}
                      </span>
                      {can("boqs.update") && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleUnbind(boq.id)}
                          className="h-8 px-2 rounded-lg text-muted-foreground hover:text-primary gap-1 text-[10px] font-bold uppercase tracking-wider"
                        >
                          <Unlink size={14} />
                          Unbind
                        </Button>
                      )}
                      {can("boqs.delete") && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleDelete(boq.id, boq.code)}
                          className="h-8 w-8 p-0 rounded-lg text-destructive hover:bg-destructive/5"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Replicate from the unbound library */}
          {can("boqs.update") && isWin && library.length > 0 && (
            <div className="space-y-3">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/50">
                Replicate from library
              </div>
              <div className="flex items-center gap-3">
                <Select value={replicateFrom} onValueChange={setReplicateFrom}>
                  <SelectTrigger className="h-11 flex-1 rounded-xl bg-muted/30 border-primary/5">
                    <SelectValue placeholder="Pick an unbound BoQ" />
                  </SelectTrigger>
                  <SelectContent>
                    {library.map((boq) => (
                      <SelectItem key={boq.id} value={boq.id}>
                        {boq.code} — {formatCurrency(boq.totalAmountItems)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReplicate}
                  disabled={!replicateFrom || replicateBoqs.isPending}
                  className="h-11 px-5 rounded-xl border-primary/10 font-bold text-xs uppercase tracking-widest gap-2"
                >
                  <Copy size={14} />
                  Replicate
                </Button>
              </div>
            </div>
          )}

          {/* New BoQ */}
          {can("boqs.create") && isWin && (
            <div className="space-y-3">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/50">
                New BoQ
              </div>

              {drafts.map((item, index) => (
                <div key={index} className="rounded-2xl border border-primary/10 bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                      Item {index + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-extrabold text-primary tabular-nums">
                        {formatCurrency(num(item.qty) * num(item.freq) * num(item.sellingPrice))}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setDrafts((current) => current.filter((_, i) => i !== index))}
                        className="h-8 w-8 p-0 rounded-lg text-destructive hover:bg-destructive/5"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <Label className={LABEL}>Product</Label>
                      <Select
                        value={item.productId}
                        onValueChange={(value) => patchDraft(index, { productId: value })}
                      >
                        <SelectTrigger className={CELL}>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className={LABEL}>Unit Price</Label>
                      <AmountInput
                        placeholder="Catalog price"
                        value={item.sellingPrice}
                        onChange={(v) => patchDraft(index, { sellingPrice: v })}
                        className={CELL}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className={LABEL}>Description</Label>
                      <Input
                        placeholder="Optional"
                        value={item.description}
                        onChange={(e) => patchDraft(index, { description: e.target.value })}
                        className={CELL}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className={LABEL}>Qty</Label>
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        value={item.qty}
                        onChange={(e) => patchDraft(index, { qty: e.target.value })}
                        className={CELL}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={LABEL}>Qty Unit</Label>
                      <Input
                        placeholder="Product unit"
                        value={item.qtyUnit}
                        onChange={(e) => patchDraft(index, { qtyUnit: e.target.value })}
                        className={CELL}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={LABEL}>Frequency</Label>
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        value={item.freq}
                        onChange={(e) => patchDraft(index, { freq: e.target.value })}
                        className={CELL}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={LABEL}>Freq Unit</Label>
                      <Input
                        placeholder="e.g. Month"
                        value={item.freqUnit}
                        onChange={(e) => patchDraft(index, { freqUnit: e.target.value })}
                        className={CELL}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => setDrafts((current) => [...current, emptyDraft()])}
                className="h-11 w-full rounded-xl border-dashed border-primary/20 font-bold text-xs uppercase tracking-widest gap-2"
              >
                <Plus size={16} />
                Add Item
              </Button>

              {drafts.length > 0 && (
                <div className="flex items-center justify-between rounded-2xl border border-primary/10 bg-primary/5 px-5 py-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/50">
                    Draft Total
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="font-extrabold text-[13px] text-primary tabular-nums">
                      {formatCurrency(draftTotal)}
                    </span>
                    <Button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={createBoq.isPending}
                      className="h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-[10px] uppercase tracking-widest"
                    >
                      {createBoq.isPending ? "Saving..." : "Save BoQ"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-8 py-5 border-t border-primary/5 bg-muted/20">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 px-10 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold uppercase tracking-widest text-[10px] shadow-premium"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
