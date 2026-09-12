import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search, MoreVertical, Edit2, Trash2, ShieldCheck, Users } from "lucide-react";
import { useDebounce } from "use-debounce";
import { useRoles, useRole } from "../hooks/useRoles";
import { usePermissionGroups } from "../hooks/usePermissions";
import { useMenus } from "../hooks/useMenus";
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
import { RoleDialog } from "../components/RoleDialog";
import { Role, CreateRoleInput } from "../types";

export default function RolesPage() {
  const { can } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { rolesQuery, createRole, updateRole, deleteRole } = useRoles({
    page,
    search: debouncedSearch,
    limit: 10,
  });

  const { data: response, isLoading } = rolesQuery;
  const roles = response?.data || [];
  const meta = response?.meta;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // The list endpoint returns counts only; grants come from the detail endpoint,
  // so the dialog is filled from this second fetch once a row is picked.
  const { data: roleDetail, isLoading: isLoadingDetail } = useRole(editingId);
  const { data: permissionGroups = [] } = usePermissionGroups();
  const { menusQuery } = useMenus();

  const handleCreate = () => {
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (role: Role) => {
    setEditingId(role.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: CreateRoleInput) => {
    if (editingId) {
      await updateRole.mutateAsync({ id: editingId, ...data });
    } else {
      await createRole.mutateAsync(data);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (role: Role) => {
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;

    try {
      await deleteRole.mutateAsync(role.id);
    } catch (error: any) {
      // The API refuses to delete a role that still has users, because the
      // schema would silently null their role_id instead of failing.
      toast.error(error?.response?.data?.message ?? "Failed to delete role.");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Roles"
        description="Group permissions and sidebar access, then assign them to staff."
        icon={ShieldCheck}
        actions={
          can("roles.create") && (
            <Button
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90 text-white font-extrabold px-6 rounded-xl shadow-premium transition-all active:scale-95 flex items-center gap-2 h-11"
            >
              <Plus size={18} strokeWidth={3} />
              <span>ADD ROLE</span>
            </Button>
          )
        }
      />

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="relative flex-1 w-full">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <Input
            placeholder="Search by name or slug..."
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10"
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-8">Role</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="w-[220px]">Grants</TableHead>
                <TableHead className="w-[100px]">Users</TableHead>
                <TableHead className="w-[80px] text-right pr-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-8">
                      <Skeleton className="h-5 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-32 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-10" />
                    </TableCell>
                    <TableCell className="pr-8">
                      <Skeleton className="h-8 w-8 rounded-lg ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-48 text-center text-muted-foreground font-medium uppercase text-xs tracking-widest"
                  >
                    No roles found
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id} className="whitespace-nowrap">
                    <TableCell className="pl-8">
                      <div className="flex flex-col">
                        <span className="font-bold text-[13px] text-primary uppercase tracking-tight">
                          {role.name}
                        </span>
                        {role.description && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {role.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {role.slug}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge
                          variant="outline"
                          className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground"
                        >
                          {role._count?.permissions ?? 0} PERM
                        </Badge>
                        <Badge
                          variant="outline"
                          className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground"
                        >
                          {role._count?.menus ?? 0} MENU
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground">
                        <Users size={13} />
                        {role._count?.users ?? 0}
                      </span>
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
                          {can("roles.update") && (
                            <DropdownMenuItem
                              onClick={() => handleEdit(role)}
                              className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                            >
                              <Edit2 size={14} />
                              <span>Edit</span>
                            </DropdownMenuItem>
                          )}
                          {can("roles.delete") && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(role)}
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

        <PaginationControls
          meta={meta}
          onPageChange={setPage}
          isFetching={rolesQuery.isFetching}
        />
      </div>

      <RoleDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        role={editingId ? roleDetail : null}
        permissionGroups={permissionGroups}
        menus={menusQuery.data ?? []}
        isLoadingDetail={!!editingId && isLoadingDetail}
        isSubmitting={createRole.isPending || updateRole.isPending}
      />
    </PageContainer>
  );
}
