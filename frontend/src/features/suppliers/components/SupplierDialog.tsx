import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, UserPlus, MapPin, Building2, CreditCard, Info, Mail, Phone, User } from "lucide-react";
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
import { Supplier, CreateSupplierInput } from "../types";

const picSchema = z.object({
  name: z.string().min(1, "PIC name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  position: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  notes: z.string().optional(),
});

const formSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  taxNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountName: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  notes: z.string().optional(),
  pics: z.array(picSchema).optional(),
});

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateSupplierInput) => void;
  supplier?: Supplier | null;
  isSubmitting?: boolean;
}

export function SupplierDialog({
  open,
  onOpenChange,
  onSubmit,
  supplier,
  isSubmitting,
}: SupplierDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      address: "",
      contactPerson: "",
      phone: "",
      email: "",
      taxNumber: "",
      bankName: "",
      bankAccountNumber: "",
      bankAccountName: "",
      status: "ACTIVE",
      notes: "",
      pics: [],
    },
  });

  const { fields: picFields, append: appendPic, remove: removePic } = useFieldArray({
    control: form.control,
    name: "pics",
  });

  useEffect(() => {
    if (supplier && open) {
      form.reset({
        name: supplier.name,
        address: supplier.address || "",
        contactPerson: supplier.contactPerson || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        taxNumber: supplier.taxNumber || "",
        bankName: supplier.bankName || "",
        bankAccountNumber: supplier.bankAccountNumber || "",
        bankAccountName: supplier.bankAccountName || "",
        status: supplier.status,
        notes: supplier.notes || "",
        pics: (supplier.pics || []).map(p => ({
          name: p.name || "",
          email: p.email || "",
          phone: p.phone || "",
          position: p.position || "",
          status: (p.status?.toUpperCase() === "ACTIVE" ? "ACTIVE" : "INACTIVE") as "ACTIVE" | "INACTIVE",
          notes: p.notes || "",
        })),
      });
    } else if (open) {
      form.reset({
        name: "",
        address: "",
        contactPerson: "",
        phone: "",
        email: "",
        taxNumber: "",
        bankName: "",
        bankAccountNumber: "",
        bankAccountName: "",
        status: "ACTIVE",
        notes: "",
        pics: [],
      });
    }
  }, [supplier, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] h-[90vh] flex flex-col rounded-3xl border-primary/5 shadow-premium overflow-hidden p-0">
        <div className="bg-primary/5 px-8 pt-8 pb-4 border-b border-primary/5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary tracking-tight uppercase flex items-center gap-3">
              <Building2 className="w-8 h-8" strokeWidth={2.5} />
              {supplier ? "Modify Supplier Profile" : "Register New Supplier"}
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-2 opacity-70">
              {supplier ? `Editing entry for internal code ${supplier.code}` : "Establish connection with a new enterprise provider."}
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
                  <TabsTrigger value="bank" className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 text-[10px] font-extrabold uppercase tracking-widest transition-all">
                    Payment & Tax
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
                            Provider Entity Name
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g. PT. Global Tech Indonesia" 
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
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Mail size={12} /> Email Address
                          </FormLabel>
                          <FormControl>
                            <Input {...field} className="h-11 rounded-xl bg-muted/20 border-primary/5 font-medium" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Phone size={12} /> Contact Number
                          </FormLabel>
                          <FormControl>
                            <Input {...field} className="h-11 rounded-xl bg-muted/20 border-primary/5 font-medium" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <User size={12} /> Lead Contact
                          </FormLabel>
                          <FormControl>
                            <Input {...field} className="h-11 rounded-xl bg-muted/20 border-primary/5 font-bold uppercase text-[11px]" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Registry Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-primary/5 font-bold text-xs uppercase">
                                <SelectValue placeholder="Select Status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-primary/5 shadow-premium">
                              <SelectItem value="ACTIVE" className="font-bold text-green-600">ACTIVE</SelectItem>
                              <SelectItem value="INACTIVE" className="font-bold text-muted-foreground">INACTIVE</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <MapPin size={12} /> Registered Address
                          </FormLabel>
                          <FormControl>
                            <Textarea {...field} className="min-h-[100px] rounded-2xl bg-muted/20 border-primary/5 font-medium text-xs resize-none" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* BANK TAB */}
                <TabsContent value="bank" className="m-0 space-y-8 animate-in fade-in duration-300">
                  <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-4">
                     <CreditCard className="w-10 h-10 text-primary opacity-50 mt-1" />
                     <div className="space-y-1">
                        <h4 className="text-xs font-extrabold uppercase tracking-widest">Financial Records</h4>
                        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">Configure the bank settlement details and tax identity for procurement transactions.</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="taxNumber"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest opacity-60">NPWP / Tax Identity</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="00.000.000.0-000.000" className="h-11 rounded-xl bg-muted/10 border-primary/5 font-bold tracking-widest" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest opacity-60">Bank Institution</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-11 rounded-xl bg-muted/10 border-primary/5 font-bold uppercase text-[11px]" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bankAccountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest opacity-60">Account Identifier</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-11 rounded-xl bg-muted/10 border-primary/5 font-bold tracking-wider" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bankAccountName"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className="text-[10px] font-extrabold uppercase tracking-widest opacity-60">Legal Account Holder</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-11 rounded-xl bg-muted/10 border-primary/5 font-bold uppercase" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* PICS TAB */}
                <TabsContent value="pics" className="m-0 space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/5">
                        <UserPlus className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-tight text-primary">Personnel Registry</h3>
                        <p className="text-[10px] text-muted-foreground font-medium italic opacity-70">Define key account managers and technical contacts.</p>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => appendPic({ name: "", status: "ACTIVE" })}
                      className="bg-primary/5 border-primary/10 hover:bg-primary/10 text-primary font-bold rounded-xl h-9 px-4 gap-2"
                    >
                      <Plus size={14} strokeWidth={3} />
                      <span className="text-[10px] uppercase tracking-widest">Assign Member</span>
                    </Button>
                  </div>

                  {picFields.length === 0 ? (
                    <div className="h-40 border-2 border-dashed border-primary/5 rounded-3xl flex flex-col items-center justify-center gap-2 opacity-50 grayscale transition-all">
                      <UserPlus size={24} className="text-muted-foreground" />
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">No personnel records found</p>
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
                                  <FormLabel className="text-[8px] font-extrabold uppercase tracking-widest opacity-50">Legal Name</FormLabel>
                                  <FormControl><Input {...field} className="h-9 rounded-lg bg-muted/10 border-primary/5 font-bold uppercase text-[11px]" /></FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`pics.${index}.position`}
                              render={({ field }) => (
                                <FormItem className="col-span-1">
                                  <FormLabel className="text-[8px] font-extrabold uppercase tracking-widest opacity-50">Designation</FormLabel>
                                  <FormControl><Input {...field} className="h-9 rounded-lg bg-muted/10 border-primary/5 font-bold uppercase text-[11px]" /></FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`pics.${index}.phone`}
                              render={({ field }) => (
                                <FormItem className="col-span-1">
                                  <FormLabel className="text-[8px] font-extrabold uppercase tracking-widest opacity-50">Direct Line</FormLabel>
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
                     Data integrity is enforced on submission.
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
                      {isSubmitting ? "Updating Repository..." : supplier ? "Commit Changes" : "Register Provider"}
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
