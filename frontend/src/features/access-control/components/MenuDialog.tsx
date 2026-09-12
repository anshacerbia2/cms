import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ListTree } from "lucide-react";
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
import { Menu, Permission, CreateMenuInput } from "../types";
import { flattenMenus } from "../hooks/useMenus";

const LABEL = "text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2";
const FIELD = "h-12 rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 font-bold tracking-tight";

const NONE = "__none__";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  parentId: z.string().optional(),
  icon: z.string().optional(),
  permissionId: z.string().optional(),
  // Kept as a string like the other numeric inputs in this app; converted on submit.
  orderIndex: z.string().optional(),
  isVisible: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateMenuInput) => void;
  menu?: Menu | null;
  menus: Menu[];
  permissions: Permission[];
  isSubmitting?: boolean;
}

export function MenuDialog({
  open,
  onOpenChange,
  onSubmit,
  menu,
  menus,
  permissions,
  isSubmitting,
}: MenuDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      parentId: NONE,
      icon: "",
      permissionId: NONE,
      orderIndex: "0",
      isVisible: true,
    },
  });

  useEffect(() => {
    if (!open) return;

    form.reset({
      name: menu?.name ?? "",
      parentId: menu?.parentId ?? NONE,
      icon: menu?.icon ?? "",
      permissionId: menu?.permissionId ?? NONE,
      orderIndex: String(menu?.orderIndex ?? 0),
      isVisible: menu?.isVisible ?? true,
    });
  }, [open, menu, form]);

  // A menu cannot be its own parent or sit under one of its own children; the
  // API rejects both, and hiding them keeps the picker honest.
  const parentOptions = flattenMenus(menus).filter(({ menu: candidate }) => {
    if (!menu) return true;
    if (candidate.id === menu.id) return false;

    const isDescendant = (node: Menu): boolean =>
      (node.children ?? []).some((child) => child.id === candidate.id || isDescendant(child));
    return !isDescendant(menu);
  });

  const handleSubmit = (values: FormValues) =>
    onSubmit({
      name: values.name,
      icon: values.icon || undefined,
      orderIndex: values.orderIndex ? Number(values.orderIndex) : 0,
      isVisible: values.isVisible,
      // null detaches; the API treats an omitted key as "leave as is".
      parentId: values.parentId === NONE ? null : Number(values.parentId),
      permissionId: values.permissionId === NONE ? null : Number(values.permissionId),
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl border-primary/5 shadow-premium">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-extrabold uppercase tracking-tight">
            <ListTree size={18} />
            {menu ? "Edit Menu" : "New Menu"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL}>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Projects" {...field} className={FIELD} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL}>Parent</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className={FIELD}>
                        <SelectValue placeholder="Top level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Top level (group)</SelectItem>
                      {parentOptions.map(({ menu: option, label }) => (
                        <SelectItem key={option.id} value={option.id}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permissionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL}>Permission</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className={FIELD}>
                        <SelectValue placeholder="None (group header)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>None — group header</SelectItem>
                      {permissions.map((permission) => (
                        <SelectItem key={permission.id} value={permission.id}>
                          {permission.route}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    The sidebar link is derived from this route, so a menu without one
                    is not clickable.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>Icon</FormLabel>
                    <FormControl>
                      <Input placeholder="Briefcase" {...field} className={FIELD} />
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground">lucide-react name</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="orderIndex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>Order</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} className={FIELD} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isVisible"
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
                      Visible in sidebar
                    </span>
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isSubmitting ? "Saving..." : menu ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
