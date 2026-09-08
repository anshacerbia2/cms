import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Briefcase, Info, CalendarDays, Coins } from "lucide-react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import { Project, CreateProjectInput } from "../types";

const formSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  refDocNo: z.string().min(1, "Reference document number is required"),
  customerId: z.string().min(1, "Customer is required"),
  type: z.enum(["FIT", "REGULAR"]),
  status: z.enum(["ACTIVE", "INACTIVE", "COMPLETED", "CANCELLED"]),
  value: z.string().min(1, "Contract value is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().optional(),
});

const LABEL = "text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2";
const FIELD = "h-12 rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 font-bold tracking-tight";

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : "");

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateProjectInput) => void;
  project?: Project | null;
  isSubmitting?: boolean;
}

export function ProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  project,
  isSubmitting,
}: ProjectDialogProps) {
  const { customersQuery } = useCustomers({ limit: 100 });
  const customers = customersQuery.data?.data || [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      refDocNo: "",
      customerId: "",
      type: "REGULAR",
      status: "ACTIVE",
      value: "",
      startDate: "",
      endDate: "",
      dueDate: "",
      description: "",
    },
  });

  useEffect(() => {
    if (!open) return;

    form.reset(
      project
        ? {
            name: project.name,
            refDocNo: project.refDocNo,
            customerId: project.customerId,
            type: project.type,
            status: project.status,
            value: String(Number(project.value)),
            startDate: toDateInput(project.startDate),
            endDate: toDateInput(project.endDate),
            dueDate: toDateInput(project.dueDate),
            description: project.description || "",
          }
        : {
            name: "",
            refDocNo: "",
            customerId: "",
            type: "REGULAR",
            status: "ACTIVE",
            value: "",
            startDate: "",
            endDate: "",
            dueDate: "",
            description: "",
          },
    );
  }, [project, form, open]);

  // The backend rejects a type switch once the project has proposals or invoices.
  const typeLocked =
    !!project && ((project._count?.proposals ?? 0) > 0 || (project._count?.invoices ?? 0) > 0);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit({
      name: values.name,
      refDocNo: values.refDocNo,
      customerId: Number(values.customerId),
      type: values.type,
      status: values.status,
      value: Number(values.value),
      startDate: values.startDate,
      endDate: values.endDate,
      dueDate: values.dueDate,
      description: values.description || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col rounded-3xl border-primary/5 shadow-premium overflow-hidden p-0">
        <div className="bg-primary/5 px-8 pt-8 pb-4 border-b border-primary/5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary tracking-tight uppercase flex items-center gap-3">
              <Briefcase className="w-8 h-8" strokeWidth={2.5} />
              {project ? "Modify Project" : "Register New Project"}
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-2 opacity-70">
              {project
                ? `Editing project ${project.code}`
                : "Regular projects bill through proposals; FIT projects bill directly."}
            </p>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
              <div className="grid grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className={LABEL}>
                        <Info size={12} className="text-secondary" />
                        Project Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Network Upgrade Phase II" {...field} className={FIELD} />
                      </FormControl>
                      <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL}>Customer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={FIELD}>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="refDocNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL}>Reference Doc No.</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. PO-2026-0142" {...field} className={FIELD} />
                      </FormControl>
                      <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL}>Project Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={typeLocked}>
                        <FormControl>
                          <SelectTrigger className={FIELD}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="REGULAR">REGULAR</SelectItem>
                          <SelectItem value="FIT">FIT</SelectItem>
                        </SelectContent>
                      </Select>
                      {typeLocked && (
                        <FormDescription className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                          Locked — this project already has proposals or invoices.
                        </FormDescription>
                      )}
                      <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
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
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                          <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                          <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                          <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className={LABEL}>
                        <Coins size={12} className="text-secondary" />
                        Contract Value (IDR)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="0.01" placeholder="0" {...field} className={FIELD} />
                      </FormControl>
                      <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                    </FormItem>
                  )}
                />

                <div className="col-span-2 flex items-center gap-2 pt-2">
                  <CalendarDays className="w-4 h-4 text-primary/40" />
                  <span className="text-[10px] font-extrabold text-primary/40 uppercase tracking-[0.2em] whitespace-nowrap">
                    Timeline
                  </span>
                  <div className="h-px flex-1 bg-primary/5" />
                </div>

                {([
                  ["startDate", "Start Date"],
                  ["endDate", "End Date"],
                  ["dueDate", "Due Date"],
                ] as const).map(([name, label]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={LABEL}>{label}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className={FIELD} />
                        </FormControl>
                        <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                      </FormItem>
                    )}
                  />
                ))}

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className={LABEL}>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Scope notes, delivery terms, anything the invoice should carry over."
                          {...field}
                          className="rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 min-h-24"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="px-8 py-5 border-t border-primary/5 bg-muted/20">
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
                disabled={isSubmitting}
                className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-xs uppercase tracking-widest shadow-premium active:scale-95 transition-all"
              >
                {isSubmitting ? "Saving..." : project ? "Save Changes" : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
