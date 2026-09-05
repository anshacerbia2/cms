import { useState } from "react";
import { Plus, Search, MoreVertical, Edit2, Trash2, Eye, FileText } from "lucide-react";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { useInvoices, useInvoice } from "../hooks/useInvoices";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { DetailModal } from "@/components/common/DetailModal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { InvoiceDialog } from "../components/InvoiceDialog";
import { Invoice, CreateInvoiceInput, InvoiceStatus, InvoicePaymentStatus } from "../types";

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  PREPARED: "bg-muted text-muted-foreground border-transparent",
  SENT: "bg-blue-50 text-blue-600 border-blue-100",
  REVISED: "bg-amber-50 text-amber-600 border-amber-100",
  VOID: "bg-rose-50 text-rose-600 border-rose-100",
};

const PAYMENT_STYLES: Record<InvoicePaymentStatus, string> = {
  UNPAID: "bg-rose-50 text-rose-600 border-rose-100",
  PARTLY_PAID: "bg-amber-50 text-amber-600 border-amber-100",
  FULLY_PAID: "bg-green-50 text-green-600 border-green-100",
};

const ALL = "ALL";

export default function InvoicesPage() {
  const { can } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const [status, setStatus] = useState<string>(ALL);
  const [paymentStatus, setPaymentStatus] = useState<string>(ALL);

  const { invoicesQuery, createInvoice, updateInvoice, deleteInvoice } = useInvoices({
    page,
    search: debouncedSearch,
    limit: 10,
    ...(status !== ALL ? { status: status as InvoiceStatus } : {}),
    ...(paymentStatus !== ALL ? { paymentStatus: paymentStatus as InvoicePaymentStatus } : {}),
  });

  const { data: response, isLoading, isFetching } = invoicesQuery;
  const invoices = response?.data || [];
  const meta = response?.meta;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  // The list omits sales items and voucher links; the editor and detail view need both.
  const { data: editingInvoice } = useInvoice(editingId);
  const { data: detailInvoice } = useInvoice(detailId);

  const handleCreate = () => {
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: CreateInvoiceInput) => {
    try {
      if (editingId) {
        await updateInvoice.mutateAsync({ id: editingId, ...data });
        toast.success("Invoice updated successfully.");
      } else {
        await createInvoice.mutateAsync(data);
        toast.success("Invoice issued successfully.");
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save invoice.");
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm(`Delete invoice ${invoice.code}? This cannot be undone.`)) return;
    try {
      await deleteInvoice.mutateAsync(invoice.id);
      toast.success("Invoice deleted successfully.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete invoice.");
    }
  };

  const filterTriggerClass =
    "h-12 w-full sm:w-44 rounded-xl border-primary/10 bg-white shadow-sm text-muted-foreground font-bold text-xs uppercase tracking-widest";

  return (
    <PageContainer>
      <PageHeader
        title="Invoices"
        description="What has been billed, what has been received, and what is still outstanding."
        icon={FileText}
        actions={
          can("invoices.create") && (
            <Button
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90 text-white font-extrabold px-6 rounded-xl shadow-premium transition-all active:scale-95 flex items-center gap-2 h-11"
            >
              <Plus size={18} strokeWidth={3} />
              <span>ISSUE INVOICE</span>
            </Button>
          )
        }
      />

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Search by code, invoice number, project or customer..."
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className={filterTriggerClass}>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Statuses</SelectItem>
            <SelectItem value="PREPARED">Prepared</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="REVISED">Revised</SelectItem>
            <SelectItem value="VOID">Void</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={paymentStatus}
          onValueChange={(value) => {
            setPaymentStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className={filterTriggerClass}>
            <SelectValue placeholder="All payments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Payments</SelectItem>
            <SelectItem value="UNPAID">Unpaid</SelectItem>
            <SelectItem value="PARTLY_PAID">Partly Paid</SelectItem>
            <SelectItem value="FULLY_PAID">Fully Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[190px] pl-8">Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="w-[110px]">Due</TableHead>
                <TableHead className="text-right">Invoice Amount</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead className="w-[120px]">Payment</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead className="w-[80px] text-right pr-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-8"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="pr-8"><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center text-muted-foreground font-medium uppercase text-xs tracking-widest">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id} className="whitespace-nowrap">
                    <TableCell className="pl-8 font-bold text-primary text-xs tracking-tight">
                      <div className="flex flex-col">
                        <span>{invoice.invoiceNumber}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{invoice.code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-[13px] text-primary uppercase tracking-tight">
                          {invoice.customer?.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {invoice.projectName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[11px] font-medium text-muted-foreground">
                      {formatDate(invoice.dueDate)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-[13px] text-primary tabular-nums">
                      {formatCurrency(invoice.invoiceAmount)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-[13px] text-muted-foreground tabular-nums">
                      {formatCurrency(invoice.totalReceivedAmount)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-[13px] text-primary tabular-nums">
                      {formatCurrency(invoice.balanceDue)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={PAYMENT_STYLES[invoice.paymentStatus]}>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">
                          {invoice.paymentStatus.replace("_", " ")}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_STYLES[invoice.status]}>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">{invoice.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-primary/5 text-muted-foreground transition-all">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-premium border-primary/10 p-1 bg-white backdrop-blur-xl">
                          <DropdownMenuItem
                            onClick={() => setDetailId(invoice.id)}
                            className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                          >
                            <Eye size={14} />
                            <span>View Details</span>
                          </DropdownMenuItem>
                          {can("invoices.update") && (
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingId(invoice.id);
                                setIsDialogOpen(true);
                              }}
                              className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                            >
                              <Edit2 size={14} />
                              <span>Edit Invoice</span>
                            </DropdownMenuItem>
                          )}
                          {can("invoices.delete") && (
                            <>
                              <div className="h-px bg-muted mx-1 my-1" />
                              <DropdownMenuItem
                                onClick={() => handleDelete(invoice)}
                                className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-destructive hover:bg-destructive/5 transition-colors"
                              >
                                <Trash2 size={14} />
                                <span>Delete Invoice</span>
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

        <PaginationControls meta={meta} onPageChange={setPage} isFetching={isFetching} />
      </div>

      <InvoiceDialog
        open={isDialogOpen && (!editingId || !!editingInvoice)}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingId(null);
        }}
        onSubmit={handleSubmit}
        invoice={editingId ? editingInvoice : null}
        isSubmitting={createInvoice.isPending || updateInvoice.isPending}
      />

      <DetailModal
        open={!!detailId && !!detailInvoice}
        onOpenChange={(open) => !open && setDetailId(null)}
        title={detailInvoice?.invoiceNumber || ""}
        subtitle={detailInvoice?.code}
        icon={<FileText className="w-8 h-8 text-secondary shrink-0" strokeWidth={2.5} />}
        data={
          detailInvoice
            ? [
                { label: "Customer", value: detailInvoice.customer?.name },
                { label: "Project", value: detailInvoice.projectName },
                { label: "Sales Code", value: detailInvoice.salesCode },
                { label: "Due Date", value: formatDate(detailInvoice.dueDate) },
                { label: "Billing Type", value: detailInvoice.billingType.replace("_", " ") },
                { label: "Tax Type", value: detailInvoice.taxType.replace(/_/g, " ") },
                { label: "Items Total", value: formatCurrency(detailInvoice.totalAmount) },
                { label: "Management Fee", value: formatCurrency(detailInvoice.managementFeeAmount) },
                { label: "Sales Amount", value: formatCurrency(detailInvoice.salesAmount) },
                { label: `VAT (${detailInvoice.vatRate}%)`, value: formatCurrency(detailInvoice.vatAmount) },
                { label: "Invoice Amount", value: formatCurrency(detailInvoice.invoiceAmount) },
                { label: "Received", value: formatCurrency(detailInvoice.totalReceivedAmount) },
                { label: "PPh23 Withheld", value: formatCurrency(detailInvoice.totalPph23Deduction) },
                { label: "Bank Charges", value: formatCurrency(detailInvoice.totalBankCharge) },
                { label: "Balance Due", value: formatCurrency(detailInvoice.balanceDue) },
                { label: "Payment Status", value: detailInvoice.paymentStatus.replace("_", " ") },
                {
                  label: "Settlement Account",
                  value: detailInvoice.internalAccount
                    ? `${detailInvoice.internalAccount.bank?.bankName ?? detailInvoice.internalAccount.type} · ${detailInvoice.internalAccount.accountNo ?? ""}`
                    : null,
                },
                { label: "Receive Vouchers", value: detailInvoice.receiveVouchers?.length ?? 0 },
                { label: "Description", value: detailInvoice.description },
              ]
            : []
        }
      />
    </PageContainer>
  );
}
