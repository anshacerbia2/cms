import { useState } from "react";
import { Plus, Search, MoreVertical, Edit2, Trash2, Eye, ArrowUpRight } from "lucide-react";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { usePaymentVouchers } from "../hooks/useVouchers";
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
import { DetailModal } from "@/components/common/DetailModal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentVoucherDialog } from "../components/PaymentVoucherDialog";
import { PaymentVoucher, CreatePaymentVoucherInput } from "../types";

export default function PaymentVouchersPage() {
  const { can } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { paymentVouchersQuery, createPaymentVoucher, updatePaymentVoucher, deletePaymentVoucher } =
    usePaymentVouchers({ page, search: debouncedSearch, limit: 10 });

  const { data: response, isLoading, isFetching } = paymentVouchersQuery;
  const vouchers = response?.data || [];
  const meta = response?.meta;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<PaymentVoucher | null>(null);
  const [detailVoucher, setDetailVoucher] = useState<PaymentVoucher | null>(null);

  const handleSubmit = async (data: CreatePaymentVoucherInput) => {
    try {
      if (selectedVoucher) {
        await updatePaymentVoucher.mutateAsync({ id: selectedVoucher.id, ...data });
        toast.success("Payment voucher updated successfully.");
      } else {
        await createPaymentVoucher.mutateAsync(data);
        toast.success("Payment voucher recorded successfully.");
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save payment voucher.");
    }
  };

  const handleDelete = async (voucher: PaymentVoucher) => {
    if (!confirm(`Delete ${voucher.pvNumber}? This cannot be undone.`)) return;
    try {
      await deletePaymentVoucher.mutateAsync(voucher.id);
      toast.success("Payment voucher deleted successfully.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete payment voucher.");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Payment Vouchers"
        description="Money out — who was paid, for what, from which account."
        icon={ArrowUpRight}
        actions={
          can("payment-vouchers.create") && (
            <Button
              onClick={() => {
                setSelectedVoucher(null);
                setIsDialogOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 text-white font-extrabold px-6 rounded-xl shadow-premium transition-all active:scale-95 flex items-center gap-2 h-11"
            >
              <Plus size={18} strokeWidth={3} />
              <span>ADD PV</span>
            </Button>
          )
        }
      />

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Search by PV number, payee or description..."
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
                <TableHead className="w-[180px] pl-8">PV Number</TableHead>
                <TableHead className="w-[110px]">Issued</TableHead>
                <TableHead>Payee</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Paid From</TableHead>
                <TableHead className="w-[140px]">Category</TableHead>
                <TableHead className="w-[80px] text-right pr-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-8"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="pr-8"><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : vouchers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground font-medium uppercase text-xs tracking-widest">
                    No payment vouchers found
                  </TableCell>
                </TableRow>
              ) : (
                vouchers.map((voucher) => (
                  <TableRow key={voucher.id} className="whitespace-nowrap">
                    <TableCell className="pl-8 font-bold text-primary text-xs tracking-tight">
                      {voucher.pvNumber}
                    </TableCell>
                    <TableCell className="text-[11px] font-medium text-muted-foreground">
                      {formatDate(voucher.issuingDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-[13px] text-primary uppercase tracking-tight">
                          {voucher.payableNameManual || voucher.payableType}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {voucher.expenseType || voucher.payableType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-[13px] text-primary tabular-nums">
                      {formatCurrency(voucher.amount, voucher.currency)}
                    </TableCell>
                    <TableCell className="text-[11px] font-medium text-muted-foreground">
                      {voucher.internalAccount
                        ? `${voucher.internalAccount.bank?.bankName ?? voucher.internalAccount.type} · ${voucher.internalAccount.accountNo ?? ""}`
                        : voucher.sourcePaymentForm}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground">
                        {voucher.category}
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
                            onClick={() => setDetailVoucher(voucher)}
                            className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                          >
                            <Eye size={14} />
                            <span>View Details</span>
                          </DropdownMenuItem>
                          {can("payment-vouchers.update") && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedVoucher(voucher);
                                setIsDialogOpen(true);
                              }}
                              className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                            >
                              <Edit2 size={14} />
                              <span>Edit PV</span>
                            </DropdownMenuItem>
                          )}
                          {can("payment-vouchers.delete") && (
                            <>
                              <div className="h-px bg-muted mx-1 my-1" />
                              <DropdownMenuItem
                                onClick={() => handleDelete(voucher)}
                                className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-destructive hover:bg-destructive/5 transition-colors"
                              >
                                <Trash2 size={14} />
                                <span>Delete PV</span>
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

      <PaymentVoucherDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        voucher={selectedVoucher}
        isSubmitting={createPaymentVoucher.isPending || updatePaymentVoucher.isPending}
      />

      <DetailModal
        open={!!detailVoucher}
        onOpenChange={(open) => !open && setDetailVoucher(null)}
        title={detailVoucher?.pvNumber || ""}
        subtitle={detailVoucher ? formatDate(detailVoucher.issuingDate) : undefined}
        icon={<ArrowUpRight className="w-8 h-8 text-secondary shrink-0" strokeWidth={2.5} />}
        data={
          detailVoucher
            ? [
                { label: "Amount", value: formatCurrency(detailVoucher.amount, detailVoucher.currency) },
                { label: "Payee Type", value: detailVoucher.payableType },
                { label: "Payee", value: detailVoucher.payableNameManual },
                { label: "Category", value: detailVoucher.category },
                { label: "Expense Type", value: detailVoucher.expenseType },
                { label: "Payment Form", value: detailVoucher.sourcePaymentForm.replace("_", " ") },
                {
                  label: "Paid From",
                  value: detailVoucher.internalAccount
                    ? `${detailVoucher.internalAccount.bank?.bankName ?? detailVoucher.internalAccount.type} · ${detailVoucher.internalAccount.accountNo ?? ""}`
                    : null,
                },
                { label: "Due Date", value: detailVoucher.dueDate ? formatDate(detailVoucher.dueDate) : null },
                {
                  label: "Payment Date",
                  value: detailVoucher.paymentDate ? formatDate(detailVoucher.paymentDate) : null,
                },
                { label: "Description", value: detailVoucher.description },
              ]
            : []
        }
      />
    </PageContainer>
  );
}
