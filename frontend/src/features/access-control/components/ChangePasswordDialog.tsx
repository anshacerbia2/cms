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
import { User } from "../types";

const LABEL = "text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2";
const FIELD = "h-12 rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 font-bold tracking-tight";

const formSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

type FormValues = z.infer<typeof formSchema>;

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (password: string) => void;
  user?: User | null;
  isSubmitting?: boolean;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  onSubmit,
  user,
  isSubmitting,
}: ChangePasswordDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirm: "" },
  });

  useEffect(() => {
    if (open) form.reset({ password: "", confirm: "" });
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-primary/5 shadow-premium">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-extrabold uppercase tracking-tight">
            <KeyRound size={18} />
            Change Password
          </DialogTitle>
        </DialogHeader>

        <p className="text-[12px] text-muted-foreground">
          Setting a new password for <strong>{user?.name}</strong>. They are not
          signed out, but the old password stops working immediately.
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => onSubmit(values.password))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL}>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="At least 8 characters" {...field} className={FIELD} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL}>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} className={FIELD} />
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
                {isSubmitting ? "Saving..." : "Set Password"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
