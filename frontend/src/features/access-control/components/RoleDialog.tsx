import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ShieldCheck, KeyRound, ListTree, Search } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Role, CreateRoleInput, PermissionGroup, Menu } from "../types";
import { flattenMenus } from "../hooks/useMenus";

const LABEL = "text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2";
const FIELD = "h-12 rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 font-bold tracking-tight";

const formSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateRoleInput) => void;
  role?: Role | null;
  permissionGroups: PermissionGroup[];
  menus: Menu[];
  isLoadingDetail?: boolean;
  isSubmitting?: boolean;
}

export function RoleDialog({
  open,
  onOpenChange,
  onSubmit,
  role,
  permissionGroups,
  menus,
  isLoadingDetail,
  isSubmitting,
}: RoleDialogProps) {
  const [permissionIds, setPermissionIds] = useState<Set<string>>(new Set());
  const [menuIds, setMenuIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", slug: "", description: "" },
  });

  useEffect(() => {
    if (!open) return;

    form.reset({
      name: role?.name ?? "",
      slug: role?.slug ?? "",
      description: role?.description ?? "",
    });
    setPermissionIds(new Set((role?.permissions ?? []).map((p) => p.permission.id)));
    setMenuIds(new Set((role?.menus ?? []).map((m) => m.menu.id)));
    setFilter("");
  }, [open, role, form]);

  const flatMenus = useMemo(() => flattenMenus(menus), [menus]);

  const visibleGroups = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return permissionGroups;

    return permissionGroups
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter(
          (p) =>
            p.route.toLowerCase().includes(needle) ||
            (p.description ?? "").toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [permissionGroups, filter]);

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  };

  const toggleModule = (group: PermissionGroup, checked: boolean) => {
    const next = new Set(permissionIds);
    for (const permission of group.permissions) {
      checked ? next.add(permission.id) : next.delete(permission.id);
    }
    setPermissionIds(next);
  };

  const handleSubmit = (values: FormValues) => {
    onSubmit({
      ...values,
      // Sent as absolute lists, matching the API: an empty array revokes everything.
      permissionIds: [...permissionIds].map(Number),
      menuIds: [...menuIds].map(Number),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border-primary/5 shadow-premium">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-extrabold uppercase tracking-tight">
            <ShieldCheck size={18} />
            {role ? `Edit ${role.name}` : "New Role"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>Role Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Finance Manager" {...field} className={FIELD} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="finance-manager" {...field} className={FIELD} />
                    </FormControl>
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
                    <Textarea
                      rows={2}
                      placeholder="What this role is for"
                      className="min-h-[80px] rounded-xl bg-muted/20 border-primary/5 font-medium text-xs resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Tabs defaultValue="permissions">
              <TabsList>
                <TabsTrigger value="permissions" className="gap-2">
                  <KeyRound size={14} />
                  Permissions
                  <Badge variant="outline" className="ml-1 text-[10px] font-bold">
                    {permissionIds.size}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="menus" className="gap-2">
                  <ListTree size={14} />
                  Sidebar
                  <Badge variant="outline" className="ml-1 text-[10px] font-bold">
                    {menuIds.size}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="permissions" className="space-y-3 pt-3">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    size={15}
                  />
                  <Input
                    placeholder="Filter permissions..."
                    className="pl-9 h-10 rounded-xl"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>

                <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                  {isLoadingDetail ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))
                  ) : visibleGroups.length === 0 ? (
                    <p className="text-center text-xs uppercase tracking-widest text-muted-foreground py-8">
                      No permissions match "{filter}"
                    </p>
                  ) : (
                    visibleGroups.map((group) => {
                      const allChecked = group.permissions.every((p) => permissionIds.has(p.id));

                      return (
                        <div
                          key={group.module}
                          className="rounded-xl border border-primary/5 bg-white/60 p-3"
                        >
                          <label className="flex items-center gap-2 cursor-pointer mb-2">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded accent-primary"
                              checked={allChecked}
                              onChange={(e) => toggleModule(group, e.target.checked)}
                            />
                            <span className="text-[11px] font-black uppercase tracking-widest text-primary">
                              {group.module}
                            </span>
                          </label>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pl-6">
                            {group.permissions.map((permission) => (
                              <label
                                key={permission.id}
                                className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1 hover:bg-primary/5 transition-colors"
                                title={permission.description ?? permission.route}
                              >
                                <input
                                  type="checkbox"
                                  className="h-3.5 w-3.5 rounded accent-primary"
                                  checked={permissionIds.has(permission.id)}
                                  onChange={() =>
                                    setPermissionIds(toggle(permissionIds, permission.id))
                                  }
                                />
                                <span className="text-[11px] font-semibold text-muted-foreground truncate">
                                  {permission.route.split(".")[1] ?? permission.route}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="menus" className="pt-3">
                <p className="text-[11px] text-muted-foreground mb-2">
                  Which sidebar entries this role sees. An entry still needs its
                  permission granted above to open.
                </p>
                <div className="max-h-72 overflow-y-auto space-y-0.5 pr-1">
                  {flatMenus.map(({ menu, label }) => (
                    <label
                      key={menu.id}
                      className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-primary/5 transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded accent-primary"
                        checked={menuIds.has(menu.id)}
                        onChange={() => setMenuIds(toggle(menuIds, menu.id))}
                      />
                      <span className="text-[12px] font-semibold text-muted-foreground">
                        {label}
                      </span>
                      {!menu.permission && (
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground"
                        >
                          Group
                        </Badge>
                      )}
                    </label>
                  ))}
                </div>
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
                {isSubmitting ? "Saving..." : role ? "Save Changes" : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
