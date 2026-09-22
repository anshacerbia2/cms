import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import * as z from "zod";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { strongPassword, PASSWORD_RULE_MESSAGE } from "@/lib/password";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const LABEL = "text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2";
const FIELD = "h-12 rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 font-bold tracking-tight";

const formSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: strongPassword,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Passwords do not match" })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current one",
  });

type FormValues = z.infer<typeof formSchema>;

/** Ganti password akun sendiri - untuk semua user, termasuk yang view-only. */
export function ChangeOwnPasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });

  useEffect(() => {
    if (open) form.reset({ currentPassword: "", newPassword: "", confirm: "" });
  }, [open, form]);

  const change = useMutation({
    mutationFn: (v: FormValues) =>
      api.patch("/auth/password", { currentPassword: v.currentPassword, newPassword: v.newPassword }),
    onSuccess: () => {
      toast.success("Password changed successfully.");
      onOpenChange(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message;
      toast.error(Array.isArray(message) ? message[0] : message || "Failed to change password.");
    },
  });

  const field = (name: keyof FormValues, label: string, placeholder?: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className={LABEL}>{label}</FormLabel>
          <FormControl>
            <Input type="password" autoComplete={name === "currentPassword" ? "current-password" : "new-password"} placeholder={placeholder} {...field} className={FIELD} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-primary/5 shadow-premium">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-extrabold uppercase tracking-tight">
            <KeyRound size={18} />
            Change Password
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => change.mutate(v))} className="space-y-4">
            {field("currentPassword", "Current Password")}
            {field("newPassword", "New Password", PASSWORD_RULE_MESSAGE)}
            {field("confirm", "Confirm New Password")}

            <DialogFooter className="pt-5 border-t border-primary/5">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 px-6 rounded-xl border-primary/10 font-bold text-xs uppercase tracking-widest"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={change.isPending}
                className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-xs uppercase tracking-widest shadow-premium"
              >
                {change.isPending ? "Saving..." : "Save Password"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
