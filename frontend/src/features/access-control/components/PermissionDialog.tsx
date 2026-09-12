import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { KeyRound } from "lucide-react";
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
import { Permission, CreatePermissionInput } from "../types";

const LABEL = "text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2";
const FIELD = "h-12 rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 font-bold tracking-tight";

const NO_METHOD = "__none__";

const formSchema = z.object({
  // The guard matches this string exactly, and the sidebar derives a page URL
  // from it, so the shape is enforced here as well as on the server.
  route: z
    .string()
    .min(1, "Route is required")
    .regex(/^[a-z0-9-]+\.[a-z0-9-]+$/, 'Use "module.action", e.g. projects.index'),
  method: z.string().optional(),
  path: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePermissionInput) => void;
  permission?: Permission | null;
  isSubmitting?: boolean;
}

export function PermissionDialog({
  open,
  onOpenChange,
  onSubmit,
  permission,
  isSubmitting,
}: PermissionDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { route: "", method: NO_METHOD, path: "", description: "" },
  });

  useEffect(() => {
    if (!open) return;

    form.reset({
      route: permission?.route ?? "",
      method: permission?.method ?? NO_METHOD,
      path: permission?.path ?? "",
      description: permission?.description ?? "",
    });
  }, [open, permission, form]);

  const handleSubmit = (values: FormValues) =>
    onSubmit({ ...values, method: values.method === NO_METHOD ? undefined : values.method });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl border-primary/5 shadow-premium">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-extrabold uppercase tracking-tight">
            <KeyRound size={18} />
            {permission ? "Edit Permission" : "New Permission"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="route"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL}>Route</FormLabel>
                  <FormControl>
                    <Input placeholder="projects.index" className={`${FIELD} font-mono`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>HTTP Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={FIELD}>
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_METHOD}>Any</SelectItem>
                        {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
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
                name="path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL}>Path</FormLabel>
                    <FormControl>
                      <Input placeholder="/projects/{id}" className={`${FIELD} font-mono`} {...field} />
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
                    <Input placeholder="View Projects" {...field} className={FIELD} />
                  </FormControl>
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
                {isSubmitting ? "Saving..." : permission ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
