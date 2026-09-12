import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UserCog } from "lucide-react";
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
import { User, Role, CreateUserInput } from "../types";

const LABEL = "text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2";
const FIELD = "h-12 rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 font-bold tracking-tight";

const NO_ROLE = "__none__";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  // Required when creating, ignored when editing — an existing user's password
  // is changed through its own action so an edit cannot reset it by accident.
  password: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
  roleId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateUserInput) => void;
  user?: User | null;
  roles: Role[];
  isSubmitting?: boolean;
}

export function UserDialog({
  open,
  onOpenChange,
  onSubmit,
  user,
  roles,
  isSubmitting,
}: UserDialogProps) {
  const isEdit = !!user;

  const form = useForm<FormValues>({
    resolver: zodResolver(
      formSchema.refine((values) => isEdit || (values.password ?? "").length >= 8, {
        path: ["password"],
        message: "Password must be at least 8 characters",
      }),
    ),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      location: "",
      status: "ACTIVE",
      roleId: NO_ROLE,
    },
  });

  useEffect(() => {
    if (!open) return;

    form.reset({
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
      phone: user?.phone ?? "",
      location: user?.location ?? "",
      status: user?.status ?? "ACTIVE",
      roleId: user?.roleId ?? NO_ROLE,
    });
  }, [open, user, form]);

  const handleSubmit = (values: FormValues) => {
    const { password, roleId, ...rest } = values;

    onSubmit({
      ...rest,
      ...(isEdit ? {} : { password: password as string }),
      ...(roleId && roleId !== NO_ROLE ? { roleId: Number(roleId) } : {}),
    } as CreateUserInput);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl border-primary/5 shadow-premium">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-extrabold uppercase tracking-tight">
            <UserCog size={18} />
            {isEdit ? `Edit ${user!.name}` : "New Staff Member"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL}>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} className={FIELD} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL}>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jane@company.com" {...field} className={FIELD} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEdit && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="At least 8 characters" {...field} className={FIELD} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="0812..." {...field} className={FIELD} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Jakarta" {...field} className={FIELD} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={FIELD}>
                          <SelectValue placeholder="No role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_ROLE}>No role</SelectItem>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      A user with no role has no permissions at all.
                    </p>
                    <FormMessage />
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
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      Anything but Active blocks sign-in and invalidates existing sessions.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
