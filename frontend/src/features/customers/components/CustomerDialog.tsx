import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, UserPlus, MapPin, Building2, CreditCard, Info } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Customer, CreateCustomerInput } from "../types";

const billingOptionSchema = z.object({
  cpName: z.string().optional(),
  cpTitleDivision: z.string().optional(),
  cpEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  cpOfficeNumber: z.string().optional(),
  cpMobileNumber: z.string().optional(),
  isOverseas: z.boolean().default(false),
  address: z.string().optional(),
});

const picSchema = z.object({
  name: z.string().min(1, "PIC name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  position: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: z.string().optional(),
});

const formSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  status: z.enum(["Active", "Inactive"]),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountName: z.string().optional(),
  notes: z.string().optional(),
  billingOptions: z.array(billingOptionSchema).optional(),
  pics: z.array(picSchema).optional(),
});

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCustomerInput) => void;
  customer?: Customer | null;
  isSubmitting?: boolean;
}

export function CustomerDialog({
  open,
  onOpenChange,
  onSubmit,
  customer,
  isSubmitting,
}: CustomerDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      status: "Active",
      bankName: "",
      bankAccountNumber: "",
      bankAccountName: "",
      notes: "",
      billingOptions: [],
      pics: [],
    },
  });

  const { fields: billingFields, append: appendBilling, remove: removeBilling } = useFieldArray({
    control: form.control,
    name: "billingOptions",
  });

  const { fields: picFields, append: appendPic, remove: removePic } = useFieldArray({
    control: form.control,
    name: "pics",
  });

  useEffect(() => {
    if (customer && open) {
      form.reset({
        name: customer.name,
        status: customer.status,
        bankName: customer.bankName || "",
        bankAccountNumber: customer.bankAccountNumber || "",
        bankAccountName: customer.bankAccountName || "",
        notes: customer.notes || "",
        billingOptions: (customer.billingOptions || []).map(o => ({
          cpName: o.cpName || "",
          cpTitleDivision: o.cpTitleDivision || "",
          cpEmail: o.cpEmail || "",
          cpOfficeNumber: o.cpOfficeNumber || "",
          cpMobileNumber: o.cpMobileNumber || "",
          isOverseas: !!o.isOverseas,
          address: o.address || "",
        })),
        pics: (customer.pics || []).map(p => ({
          name: p.name || "",
          email: p.email || "",
          phone: p.phone || "",
          position: p.position || "",
          status: (p.status?.toLowerCase() === "active" ? "active" : "inactive") as "active" | "inactive",
          notes: p.notes || "",
        })),
      });
    } else if (open) {
      form.reset({
        name: "",
        status: "Active",
        bankName: "",
        bankAccountNumber: "",
        bankAccountName: "",
        notes: "",
        billingOptions: [],
        pics: [],
      });
    }
  }, [customer, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col rounded-3xl border-primary/5 shadow-premium overflow-hidden p-0">
        <div className="bg-primary/5 px-8 pt-8 pb-4 border-b border-primary/5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary tracking-tight uppercase flex items-center gap-3">
              <Building2 className="w-8 h-8" strokeWidth={2.5} />
              {customer ? "Modify Client Enterprise" : "Register New Client"}
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-2 opacity-70">
              {customer ? `Editing profile for repository index ${customer.code}` : "Configure enterprise identity and contact metadata."}
            </p>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-8 bg-primary/5 border-b border-primary/5">
                <TabsList className="bg-transparent h-12 gap-6 p-0">
                  <TabsTrigger value="general" className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 text-[10px] font-extrabold uppercase tracking-widest transition-all">
                    General Info
                  </TabsTrigger>
                  <TabsTrigger value="billing" className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 text-[10px] font-extrabold uppercase tracking-widest transition-all">
                    Billing Options
                  </TabsTrigger>
                  <TabsTrigger value="pics" className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 text-[10px] font-extrabold uppercase tracking-widest transition-all">
                    PIC Management
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                {/* GENERAL TAB */}
                <TabsContent value="general" className="m-0 space-y-8 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Info size={12} className="text-secondary" />
                            Organization Identity
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g. PT. Global Teknologi Solusi" 
                              {...field} 
                              className="h-12 rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 font-bold uppercase tracking-tight"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px] uppercase font-bold text-destructive" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            Deployment Status
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-primary/5 focus:ring-primary/10 font-bold uppercase tracking-tight">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-primary/5 shadow-premium bg-white">
                              <SelectItem value="Active" className="font-bold uppercase tracking-tight text-xs py-3">Active</SelectItem>
                              <SelectItem value="Inactive" className="font-bold uppercase tracking-tight text-xs py-3">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="col-span-2 space-y-4 pt-4">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary/40" />
                        <span className="text-[10px] font-extrabold text-primary/40 uppercase tracking-[0.2em] whitespace-nowrap">Bank Settlement</span>
                        <div className="h-px flex-1 bg-primary/5" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="bankName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Provider</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g. BCA / Mandiri" className="h-12 rounded-xl bg-muted/30 border-primary/5 font-bold uppercase tracking-tight" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="bankAccountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Account No</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="000-000-000" className="h-12 rounded-xl bg-muted/30 border-primary/5 font-bold uppercase tracking-tight" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Internal Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Any additional enterprise context..."
                              className="min-h-[120px] rounded-2xl bg-muted/30 border-primary/5 font-medium resize-none focus-visible:ring-primary/10 p-4"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* BILLING TAB */}
                <TabsContent value="billing" className="m-0 space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/5">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-tight">Billing Profiles</h3>
                        <p className="text-[10px] text-muted-foreground font-medium italic">Configure multiple invoice delivery addresses.</p>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => appendBilling({ cpName: "", isOverseas: false, address: "" })}
                      className="bg-primary/5 border-primary/10 hover:bg-primary/10 text-primary font-bold rounded-xl h-9 px-4 gap-2"
                    >
                      <Plus size={14} strokeWidth={3} />
                      <span className="text-[10px] uppercase tracking-widest">Add Profile</span>
                    </Button>
                  </div>

                  {billingFields.length === 0 ? (
                    <div className="h-40 border-2 border-dashed border-primary/5 rounded-3xl flex flex-col items-center justify-center gap-2 opacity-50 grayscale">
                      <MapPin size={24} className="text-muted-foreground" />
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">No billing profiles configured</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {billingFields.map((field, index) => (
                        <div key={field.id} className="p-6 rounded-3xl border border-primary/5 bg-white shadow-soft relative group transition-all hover:border-primary/20">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeBilling(index)}
                            className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white border border-destructive/10 text-destructive shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:text-white"
                          >
                            <Trash2 size={14} />
                          </Button>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`billingOptions.${index}.cpName`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground/70">Contact Name</FormLabel>
                                  <FormControl><Input {...field} className="h-10 rounded-lg bg-muted/20 border-primary/5 font-bold uppercase tracking-tight text-xs" /></FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`billingOptions.${index}.cpEmail`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground/70">Contact Email</FormLabel>
                                  <FormControl><Input {...field} className="h-10 rounded-lg bg-muted/20 border-primary/5 font-bold lowercase tracking-tight text-xs" /></FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`billingOptions.${index}.address`}
                              render={({ field }) => (
                                <FormItem className="col-span-2">
                                  <FormLabel className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground/70">Full Billing Address</FormLabel>
                                  <FormControl><Textarea {...field} className="min-h-[80px] rounded-lg bg-muted/20 border-primary/5 font-medium text-xs resize-none" /></FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* PICS TAB */}
                <TabsContent value="pics" className="m-0 space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/5">
                        <UserPlus className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-tight">Enterprise Staff</h3>
                        <p className="text-[10px] text-muted-foreground font-medium italic">Assign key personnel and decision makers.</p>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => appendPic({ name: "", status: "active" })}
                      className="bg-primary/5 border-primary/10 hover:bg-primary/10 text-primary font-bold rounded-xl h-9 px-4 gap-2"
                    >
                      <Plus size={14} strokeWidth={3} />
                      <span className="text-[10px] uppercase tracking-widest">Assign PIC</span>
                    </Button>
                  </div>

                  {picFields.length === 0 ? (
                    <div className="h-40 border-2 border-dashed border-primary/5 rounded-3xl flex flex-col items-center justify-center gap-2 opacity-50 grayscale">
                      <UserPlus size={24} className="text-muted-foreground" />
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">No personnel assigned</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {picFields.map((field, index) => (
                        <div key={field.id} className="p-5 rounded-2xl border border-primary/5 bg-white shadow-soft group relative hover:border-primary/20 transition-all">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removePic(index)}
                            className="absolute top-2 right-2 h-7 w-7 rounded-full text-destructive opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={12} />
                          </Button>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name={`pics.${index}.name`}
                              render={({ field }) => (
                                <FormItem className="col-span-1">
                                  <FormLabel className="text-[8px] font-extrabold uppercase tracking-widest opacity-50">Full Name</FormLabel>
                                  <FormControl><Input {...field} className="h-9 rounded-lg bg-muted/10 border-primary/5 font-bold uppercase text-[11px]" /></FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`pics.${index}.position`}
                              render={({ field }) => (
                                <FormItem className="col-span-1">
                                  <FormLabel className="text-[8px] font-extrabold uppercase tracking-widest opacity-50">Position</FormLabel>
                                  <FormControl><Input {...field} className="h-9 rounded-lg bg-muted/10 border-primary/5 font-bold uppercase text-[11px]" /></FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`pics.${index}.phone`}
                              render={({ field }) => (
                                <FormItem className="col-span-1">
                                  <FormLabel className="text-[8px] font-extrabold uppercase tracking-widest opacity-50">Direct Phone</FormLabel>
                                  <FormControl><Input {...field} className="h-9 rounded-lg bg-muted/10 border-primary/5 font-bold text-[11px]" /></FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>

              <DialogFooter className="px-8 py-6 bg-muted/10 border-t border-primary/5">
                <div className="flex w-full items-center justify-between">
                   <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest italic flex items-center gap-1.5 opacity-60">
                     <Info size={10} />
                     Ensure all mandatory data points are validated.
                   </p>
                   <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onOpenChange(false)}
                      className="h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-muted"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="h-11 px-10 rounded-xl bg-primary text-white font-extrabold uppercase tracking-widest text-[10px] shadow-premium active:scale-95 transition-all min-w-[160px]"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Processing Registry..." : customer ? "Commit Changes" : "Create Enterprise Account"}
                    </Button>
                   </div>
                </div>
              </DialogFooter>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
