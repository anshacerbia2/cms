import { useState } from "react";
import { Tag, Plus, Check, X, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { ProductCategory } from "../types";

interface CategoryManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ProductCategory[];
  onCreate: (data: { name: string; description?: string }) => Promise<unknown>;
  onUpdate: (data: { id: string; name: string; description?: string }) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  isBusy?: boolean;
}

/**
 * Inline manager rather than a page of its own: categories are a short list that
 * only matters while editing products, and the Products page is where they are
 * picked from.
 */
export function CategoryManagerDialog({
  open,
  onOpenChange,
  categories,
  onCreate,
  onUpdate,
  onDelete,
  isBusy,
}: CategoryManagerDialogProps) {
  const { can } = useAuthStore();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
      return true;
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Something went wrong.");
      return false;
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    if (await run(() => onCreate({ name: newName.trim() }))) setNewName("");
  };

  const handleSaveEdit = async (category: ProductCategory) => {
    if (!editName.trim()) return;
    if (await run(() => onUpdate({ id: category.id, name: editName.trim() }))) {
      setEditingId(null);
    }
  };

  const handleDelete = async (category: ProductCategory) => {
    if (!confirm(`Delete category "${category.name}"?`)) return;
    // The API refuses while products still reference it, and says how many.
    await run(() => onDelete(category.id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-extrabold uppercase tracking-tight">
            <Tag size={18} />
            Product Categories
          </DialogTitle>
        </DialogHeader>

        {can("product-categories.create") && (
          <div className="flex gap-2">
            <Input
              placeholder="New category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <Button onClick={handleCreate} disabled={isBusy || !newName.trim()} className="gap-1">
              <Plus size={16} strokeWidth={3} />
              Add
            </Button>
          </div>
        )}

        {error && (
          <p className="text-[12px] font-semibold text-red-600 bg-red-50 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
          {categories.length === 0 ? (
            <p className="text-center text-xs uppercase tracking-widest text-muted-foreground py-10">
              No categories yet
            </p>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-2 rounded-xl border border-primary/5 bg-white/60 px-3 py-2"
              >
                {editingId === category.id ? (
                  <>
                    <Input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveEdit(category);
                        }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="h-8"
                    />
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0 text-green-600"
                      onClick={() => handleSaveEdit(category)}
                      disabled={isBusy}
                    >
                      <Check size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground"
                      onClick={() => setEditingId(null)}
                    >
                      <X size={16} />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-bold text-[13px] text-primary tracking-tight">
                      {category.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      {category._count?.products ?? 0} PROD
                    </Badge>
                    {can("product-categories.update") && (
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                        onClick={() => {
                          setEditingId(category.id);
                          setEditName(category.name);
                          setError(null);
                        }}
                      >
                        <Pencil size={14} />
                      </Button>
                    )}
                    {can("product-categories.delete") && (
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                        onClick={() => handleDelete(category)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
