import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2, Shield, Mail, KeyRound } from "lucide-react";
import { useDebounce } from "use-debounce";
import { useUsers } from "@/features/access-control/hooks/useUsers";
import { useRoles } from "@/features/access-control/hooks/useRoles";
import { UserDialog } from "@/features/access-control/components/UserDialog";
import { ChangePasswordDialog } from "@/features/access-control/components/ChangePasswordDialog";
import { User, CreateUserInput } from "@/features/access-control/types";
import { useAuthStore } from "@/store/authStore";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControls } from "@/components/common/PaginationControls";

import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/common/PageContainer";
import { Users } from "lucide-react";

export default function StaffPage() {
  const { can } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { usersQuery, createUser, updateUser, changePassword, deleteUser } = useUsers({
    page,
    search: debouncedSearch,
    limit: 10
  });

  // Every role, for the assignment dropdown — there are only a handful of them.
  const { rolesQuery } = useRoles({ limit: 100 });
  const roles = rolesQuery.data?.data ?? [];

  const { data: response, isLoading, isFetching } = usersQuery;
  const users = response?.data || [];
  const meta = response?.meta;

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);

  const handleCreate = () => {
    setSelected(null);
    setIsUserDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelected(user);
    setIsUserDialogOpen(true);
  };

  const handleChangePassword = (user: User) => {
    setSelected(user);
    setIsPasswordDialogOpen(true);
  };

  const handleSubmit = async (data: CreateUserInput) => {
    try {
      if (selected) {
        await updateUser.mutateAsync({ id: selected.id, ...data });
      } else {
        await createUser.mutateAsync(data);
      }
      setIsUserDialogOpen(false);
    } catch (error: any) {
      alert(error?.response?.data?.message ?? "Failed to save staff member.");
    }
  };

  const handleSubmitPassword = async (password: string) => {
    if (!selected) return;

    try {
      await changePassword.mutateAsync({ id: selected.id, password });
      setIsPasswordDialogOpen(false);
    } catch (error: any) {
      alert(error?.response?.data?.message ?? "Failed to change password.");
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Remove ${user.name}? This cannot be undone.`)) return;

    try {
      await deleteUser.mutateAsync(user.id);
    } catch (error: any) {
      // Refused when it is the account you are signed in as.
      alert(error?.response?.data?.message ?? "Failed to remove staff member.");
    }
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Staff Management"
        description="Control system access levels and internal team credentials."
        icon={Users}
        actions={
          can('users.create') && (
            <Button 
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90 text-white font-extrabold px-6 rounded-xl shadow-premium transition-all active:scale-95 flex items-center gap-2 h-11"
            >
              <Plus size={18} strokeWidth={3} />
              <span>ADD STAFF</span>
            </Button>
          )
        }
      />

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
          <Input 
            placeholder="Search staff by name, email or code..." 
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 font-medium"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); 
            }}
          />
        </div>
        <Button variant="outline" className="h-12 px-5 rounded-xl border-primary/10 bg-white shadow-sm flex items-center gap-2 hover:bg-primary/5 transition-all text-muted-foreground font-bold">
          <Filter size={18} />
          <span className="text-xs uppercase tracking-widest">Filter</span>
        </Button>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-primary/[0.02]">
              <TableRow className="hover:bg-transparent border-primary/5">
                <TableHead className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Profile</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Credentials</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Privileges</TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Status</TableHead>
                <TableHead className="text-right text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-primary/5">
                    <TableCell><Skeleton className="h-12 w-12 rounded-xl" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-lg" /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground font-medium uppercase text-xs tracking-widest">
                    No staff members found in registry
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="group hover:bg-primary/[0.02] border-primary/5 transition-all">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-bold text-sm border border-primary/10">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-[13px] text-primary uppercase tracking-tight group-hover:text-secondary transition-colors italic">
                            {user.name}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-bold tracking-[0.1em] uppercase opacity-60 mt-0.5">
                             ID: {user.id.substring(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary/80 lowercase">
                          <Mail size={12} className="opacity-40" /> {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-primary/5 border-primary/10 text-[9px] font-extrabold uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg text-primary shadow-sm flex w-fit items-center gap-1.5">
                        <Shield size={10} className="text-secondary" />
                        {user.role?.name ?? "No Role"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        user.status === 'ACTIVE'
                          ? "bg-green-50 text-green-600 border-green-100/50 hover:bg-green-100"
                          : user.status === 'SUSPENDED'
                            ? "bg-red-50 text-red-600 border-red-100/50 hover:bg-red-100"
                            : "bg-muted text-muted-foreground border-transparent"
                        }
                        variant="outline"
                      >
                        <div className={`w-1 h-1 rounded-full mr-1.5 ${
                          user.status === 'ACTIVE'
                            ? 'bg-green-500'
                            : user.status === 'SUSPENDED'
                              ? 'bg-red-500'
                              : 'bg-muted-foreground'
                        }`} />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">{user.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-primary/5 text-muted-foreground transition-all">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-premium border-primary/10 p-1 bg-white backdrop-blur-xl animate-in zoom-in-95 duration-200">
                          {can('users.update') && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleEdit(user)}
                                className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                              >
                                <Edit2 size={14} />
                                <span>Edit Member</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleChangePassword(user)}
                                className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                              >
                                <KeyRound size={14} />
                                <span>Change Password</span>
                              </DropdownMenuItem>
                            </>
                          )}
                          {can('users.delete') && (
                            <>
                              <div className="h-px bg-muted mx-1 my-1" />
                              <DropdownMenuItem
                                onClick={() => handleDelete(user)}
                                className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-destructive hover:bg-destructive/5 transition-colors"
                              >
                                <Trash2 size={14} />
                                <span>Revoke Access</span>
                              </DropdownMenuItem>
                            </>
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
          isFetching={isFetching}
        />
      </div>

      <UserDialog
        open={isUserDialogOpen}
        onOpenChange={setIsUserDialogOpen}
        onSubmit={handleSubmit}
        user={selected}
        roles={roles}
        isSubmitting={createUser.isPending || updateUser.isPending}
      />

      <ChangePasswordDialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        onSubmit={handleSubmitPassword}
        user={selected}
        isSubmitting={changePassword.isPending}
      />
    </PageContainer>
  );
}
