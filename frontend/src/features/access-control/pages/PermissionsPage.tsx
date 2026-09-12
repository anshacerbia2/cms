import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search, MoreVertical, Edit2, Trash2, KeyRound } from "lucide-react";
import { useDebounce } from "use-debounce";
import { usePermissions } from "../hooks/usePermissions";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControls } from "@/components/common/PaginationControls";
import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/common/PageContainer";
import { PermissionDialog } from "../components/PermissionDialog";
import { Permission, CreatePermissionInput } from "../types";

export default function PermissionsPage() {
  const { can } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { permissionsQuery, createPermission, updatePermission, deletePermission } =
    usePermissions({ page, search: debouncedSearch, limit: 15 });

  const { data: response, isLoading } = permissionsQuery;
  const permissions = response?.data || [];
  const meta = response?.meta;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Permission | null>(null);

  const handleCreate = () => {
    setSelected(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (permission: Permission) => {
    setSelected(permission);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: CreatePermissionInput) => {
    try {
      if (selected) {
        await updatePermission.mutateAsync({ id: selected.id, ...data });
      } else {
        await createPermission.mutateAsync(data);
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Failed to save permission.");
    }
  };

  const handleDelete = async (permission: Permission) => {
    if (!confirm(`Delete permission "${permission.route}"?`)) return;

    try {
      await deletePermission.mutateAsync(permission.id);
    } catch (error: any) {
      // Refused while a menu still points at it — that menu would be left with
      // no route to derive a URL from.
      toast.error(error?.response?.data?.message ?? "Failed to delete permission.");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Permissions"
        description="Every action the API can check, named module.action."
        icon={KeyRound}
        actions={
          can("permissions.create") && (
            <Button
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90 text-white font-extrabold px-6 rounded-xl shadow-premium transition-all active:scale-95 flex items-center gap-2 h-11"
            >
              <Plus size={18} strokeWidth={3} />
              <span>ADD PERMISSION</span>
            </Button>
          )
        }
      />

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm shadow-sm">
        <div className="relative flex-1 w-full">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60"
            size={18}
          />
          <Input
            placeholder="Search by route or description..."
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 font-medium"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-primary/[0.02]">
                <TableRow className="hover:bg-transparent border-primary/5">
                  <TableHead className="pl-8 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Route</TableHead>
                  <TableHead className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Description</TableHead>
                  <TableHead className="w-[130px] text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Method / Path</TableHead>
                  <TableHead className="w-[150px] text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Used By</TableHead>
                  <TableHead className="w-[80px] text-right pr-8 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i} className="border-primary/5">
                      <TableCell className="pl-8">
                        <Skeleton className="h-5 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </TableCell>
                      <TableCell className="pr-8">
                        <Skeleton className="h-8 w-8 rounded-lg ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : permissions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-48 text-center text-muted-foreground font-medium uppercase text-xs tracking-widest"
                    >
                      No permissions found
                    </TableCell>
                  </TableRow>
                ) : (
                  permissions.map((permission) => (
                    <TableRow key={permission.id} className="group hover:bg-primary/[0.02] border-primary/5 transition-all whitespace-nowrap">
                      <TableCell className="pl-8 font-mono text-[12px] font-bold text-primary">
                        {permission.route}
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground font-medium">
                        {permission.description || "—"}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground font-mono">
                        {permission.method || "ANY"}
                        {permission.path ? ` ${permission.path}` : ""}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Badge
                            variant="outline"
                            className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground"
                          >
                            {permission._count?.roles ?? 0} ROLE
                          </Badge>
                          {(permission._count?.menus ?? 0) > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground"
                            >
                              {permission._count?.menus} MENU
                            </Badge>
                          )}
                        </div>
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
                            {can("permissions.update") && (
                              <DropdownMenuItem
                                onClick={() => handleEdit(permission)}
                                className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                              >
                                <Edit2 size={14} />
                                <span>Edit</span>
                              </DropdownMenuItem>
                            )}
                            {can("permissions.delete") && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(permission)}
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
        </div>

        <PaginationControls
          meta={meta}
          onPageChange={setPage}
          isFetching={permissionsQuery.isFetching}
        />
      </div>

      <PermissionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        permission={selected}
        isSubmitting={createPermission.isPending || updatePermission.isPending}
      />
    </PageContainer>
  );
}
