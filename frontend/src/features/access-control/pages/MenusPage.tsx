import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  ListTree,
  CornerDownRight,
  EyeOff,
} from "lucide-react";
import { useMenus } from "../hooks/useMenus";
import { usePermissionGroups } from "../hooks/usePermissions";
import { useAuthStore } from "@/store/authStore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/common/PageContainer";
import { MenuDialog } from "../components/MenuDialog";
import { Menu, CreateMenuInput } from "../types";

/** Depth-first walk so children render directly beneath their parent, indented. */
const walk = (menus: Menu[], depth = 0): { menu: Menu; depth: number }[] =>
  menus.flatMap((menu) => [{ menu, depth }, ...walk(menu.children ?? [], depth + 1)]);

export default function MenusPage() {
  const { can } = useAuthStore();
  const { menusQuery, createMenu, updateMenu, deleteMenu } = useMenus();
  const { data: permissionGroups = [] } = usePermissionGroups();

  const menus = menusQuery.data ?? [];
  const rows = walk(menus);
  const permissions = permissionGroups.flatMap((group) => group.permissions);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Menu | null>(null);

  const handleCreate = () => {
    setSelected(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (menu: Menu) => {
    setSelected(menu);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: CreateMenuInput) => {
    try {
      if (selected) {
        await updateMenu.mutateAsync({ id: selected.id, ...data });
      } else {
        await createMenu.mutateAsync(data);
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Failed to save menu.");
    }
  };

  const handleDelete = async (menu: Menu) => {
    if (!confirm(`Delete menu "${menu.name}"?`)) return;

    try {
      await deleteMenu.mutateAsync(menu.id);
    } catch (error: any) {
      // Refused while it still has children, which would otherwise be promoted
      // to top level rather than removed.
      toast.error(error?.response?.data?.message ?? "Failed to delete menu.");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Menus"
        description="The sidebar tree. Each entry links to a permission, and the URL is derived from it."
        icon={ListTree}
        actions={
          can("menus.create") && (
            <Button
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90 text-white font-extrabold px-6 rounded-xl shadow-premium transition-all active:scale-95 flex items-center gap-2 h-11"
            >
              <Plus size={18} strokeWidth={3} />
              <span>ADD MENU</span>
            </Button>
          )
        }
      />

      <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-8">Menu</TableHead>
              <TableHead className="w-[240px]">Permission Route</TableHead>
              <TableHead className="w-[100px]">Order</TableHead>
              <TableHead className="w-[120px]">Roles</TableHead>
              <TableHead className="w-[80px] text-right pr-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {menusQuery.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-8">
                    <Skeleton className="h-5 w-44" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </TableCell>
                  <TableCell className="pr-8">
                    <Skeleton className="h-8 w-8 rounded-lg ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-48 text-center text-muted-foreground font-medium uppercase text-xs tracking-widest"
                >
                  No menus found
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ menu, depth }) => (
                <TableRow key={menu.id} className="whitespace-nowrap">
                  <TableCell className="pl-8">
                    <div
                      className="flex items-center gap-2"
                      style={{ paddingLeft: depth * 20 }}
                    >
                      {depth > 0 && (
                        <CornerDownRight size={13} className="text-muted-foreground/50" />
                      )}
                      <span
                        className={
                          depth === 0
                            ? "font-black text-[12px] text-primary uppercase tracking-widest"
                            : "font-bold text-[13px] text-primary tracking-tight"
                        }
                      >
                        {menu.name}
                      </span>
                      {!menu.isVisible && (
                        <Badge
                          variant="outline"
                          className="gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground"
                        >
                          <EyeOff size={10} />
                          Hidden
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {menu.permission?.route ?? (
                      <span className="italic opacity-60">group header</span>
                    )}
                  </TableCell>
                  <TableCell className="text-[12px] font-bold text-muted-foreground">
                    {menu.orderIndex}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground"
                    >
                      {menu._count?.roles ?? 0} ROLE
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-8 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-9 w-9 p-0 rounded-xl hover:bg-primary/5 text-muted-foreground transition-all"
                        >
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 rounded-xl shadow-premium border-primary/10 p-1 bg-white backdrop-blur-xl"
                      >
                        {can("menus.update") && (
                          <DropdownMenuItem
                            onClick={() => handleEdit(menu)}
                            className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </DropdownMenuItem>
                        )}
                        {can("menus.delete") && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(menu)}
                            className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-red-500 hover:text-red-600 focus:text-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <MenuDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        menu={selected}
        menus={menus}
        permissions={permissions}
        isSubmitting={createMenu.isPending || updateMenu.isPending}
      />
    </PageContainer>
  );
}
