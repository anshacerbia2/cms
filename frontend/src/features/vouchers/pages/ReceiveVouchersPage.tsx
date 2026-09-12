import { useState } from "react";
import { Plus, Search, MoreVertical, Edit2, Trash2, Eye, ArrowDownRight } from "lucide-react";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { useReceiveVouchers, useReceiveVoucher } from "../hooks/useVouchers";
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
import { ReceiveVoucherDialog } from "../components/ReceiveVoucherDialog";
import { ReceiveVoucher, CreateReceiveVoucherInput } from "../types";

const ALL = "ALL";

export default function ReceiveVouchersPage() {
  const { can } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const [purpose, setPurpose] = useState<string>(ALL);

  const { receiveVouchersQuery, createReceiveVoucher, updateReceiveVoucher, deleteReceiveVoucher } =
    useReceiveVouchers({
      page,
      search: debouncedSearch,
      limit: 10,
      ...(purpose !== ALL ? { purpose } : {}),
    });

  const { data: response, isLoading, isFetching } = receiveVouchersQuery;
  const vouchers = response?.data || [];
  const meta = response?.meta;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: editingVoucher } = useReceiveVoucher(editingId);
  const { data: detailVoucher } = useReceiveVoucher(detailId);

  const handleSubmit = async (data: CreateReceiveVoucherInput) => {
    try {
      if (editingId) {
        await updateReceiveVoucher.mutateAsync({ id: editingId, ...data });
        toast.success("Receive voucher updated successfully.");
      } else {
        await createReceiveVoucher.mutateAsync(data);
        toast.success("Receive voucher recorded successfully.");
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save receive voucher.");
    }
  };

  const handleDelete = async (voucher: ReceiveVoucher) => {
    if (!confirm(`Delete ${voucher.rvNumber}? The invoices it settled go back to outstanding.`)) return;
    try {
      await deleteReceiveVoucher.mutateAsync(voucher.id);
      toast.success("Receive voucher deleted successfully.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete receive voucher.");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Receive Vouchers"
        description="Money in, allocated against the invoices it settles."
        icon={ArrowDownRight}
        actions={
          can("receive-vouchers.create") && (
            <Button
              onClick={() => {
                setEditingId(null);
                setIsDialogOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 text-white font-extrabold px-6 rounded-xl shadow-premium transition-all active:scale-95 flex items-center gap-2 h-11"
            >
              <Plus size={18} strokeWidth={3} />
              <span>ADD RV</span>
            </Button>
          )
        }
      />

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Search by RV number, payer or description..."
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={purpose}
          onValueChange={(value) => {
            setPurpose(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-52 h-12 px-5 bg-white border-0 rounded-xl shadow-sm flex items-center gap-2 text-muted-foreground font-bold transition-all cursor-pointer">
            <SelectValue placeholder="All purposes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Purposes</SelectItem>
            <SelectItem value="INVOICE">Invoice Payment</SelectItem>
            <SelectItem value="RETURN_REFUND">Return / Refund</SelectItem>
            <SelectItem value="RETURNING_DEPOSIT">Returning Deposit</SelectItem>
            <SelectItem value="RETURNING_CASH_ADVANCE">Returning Cash Advance</SelectItem>
            <SelectItem value="STAFF_LOAN">Staff Loan</SelectItem>
            <SelectItem value="OTHERS">Others</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px] pl-8">RV Number</TableHead>
                <TableHead className="w-[110px]">Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Received Into</TableHead>
                <TableHead>Allocated To</TableHead>
                <TableHead className="w-[150px]">Purpose</TableHead>
                <TableHead className="w-[80px] text-right pr-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-8"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="pr-8"><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : vouchers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground font-medium uppercase text-xs tracking-widest">
                    No receive vouchers found
                  </TableCell>
                </TableRow>
              ) : (
                vouchers.map((voucher) => (
                  <TableRow key={voucher.id} className="whitespace-nowrap">
                    <TableCell className="pl-8 font-bold text-primary text-xs tracking-tight">
                      <div className="flex flex-col">
                        <span>{voucher.rvNumber}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {voucher.payerNameManual || voucher.payerType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[11px] font-medium text-muted-foreground">
                      {formatDate(voucher.rvDate)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-[13px] text-primary tabular-nums">
                      {formatCurrency(voucher.amount, voucher.currency)}
                    </TableCell>
                    <TableCell className="text-[11px] font-medium text-muted-foreground">
                      {voucher.internalAccount
                        ? `${voucher.internalAccount.bank?.bankName ?? voucher.internalAccount.type} · ${voucher.internalAccount.accountNo ?? ""}`
                        : voucher.paymentForm}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        {(voucher.invoices || []).length === 0 ? (
                          <span className="text-[11px] text-muted-foreground/50 italic">Unallocated</span>
                        ) : (
                          (voucher.invoices || []).map((allocation) => (
                            <Badge
                              key={allocation.id ?? allocation.invoiceId}
                              variant="outline"
                              className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground"
                            >
                              {allocation.invoice?.invoiceNumber ?? `#${allocation.invoiceId}`}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground">
                        {voucher.purpose.replace(/_/g, " ")}
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
                            onClick={() => setDetailId(voucher.id)}
                            className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                          >
                            <Eye size={14} />
                            <span>View Details</span>
                          </DropdownMenuItem>
                          {can("receive-vouchers.update") && (
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingId(voucher.id);
                                setIsDialogOpen(true);
                              }}
                              className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                            >
                              <Edit2 size={14} />
                              <span>Edit RV</span>
                            </DropdownMenuItem>
                          )}
                          {can("receive-vouchers.delete") && (
                            <>
                              <div className="h-px bg-muted mx-1 my-1" />
                              <DropdownMenuItem
                                onClick={() => handleDelete(voucher)}
                                className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-destructive hover:bg-destructive/5 transition-colors"
                              >
                                <Trash2 size={14} />
                                <span>Delete RV</span>
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

      <ReceiveVoucherDialog
        open={isDialogOpen && (!editingId || !!editingVoucher)}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingId(null);
        }}
        onSubmit={handleSubmit}
        voucher={editingId ? editingVoucher : null}
        isSubmitting={createReceiveVoucher.isPending || updateReceiveVoucher.isPending}
      />

      <DetailModal
        open={!!detailId && !!detailVoucher}
        onOpenChange={(open) => !open && setDetailId(null)}
        title={detailVoucher?.rvNumber || ""}
        subtitle={detailVoucher ? formatDate(detailVoucher.rvDate) : undefined}
        icon={<ArrowDownRight className="w-8 h-8 text-secondary shrink-0" strokeWidth={2.5} />}
        data={
          detailVoucher
            ? [
                { label: "Amount", value: formatCurrency(detailVoucher.amount, detailVoucher.currency) },
                { label: "Payment Form", value: detailVoucher.paymentForm.replace("_", " ") },
                { label: "Reference", value: detailVoucher.paymentFormValue },
                { label: "Payer Type", value: detailVoucher.payerType },
                { label: "Payer", value: detailVoucher.payerNameManual },
                { label: "Purpose", value: detailVoucher.purpose.replace(/_/g, " ") },
                {
                  label: "Received Into",
                  value: detailVoucher.internalAccount
                    ? `${detailVoucher.internalAccount.bank?.bankName ?? detailVoucher.internalAccount.type} · ${detailVoucher.internalAccount.accountNo ?? ""}`
                    : null,
                },
                {
                  label: "Cash Allocated",
                  value: formatCurrency(
                    (detailVoucher.invoices || []).reduce(
                      (acc, allocation) => acc + Number(allocation.amountApplied),
                      0,
                    ),
                  ),
                },
                {
                  label: "Allocations",
                  value:
                    (detailVoucher.invoices || []).length === 0 ? null : (
                      <div className="flex flex-col gap-1 py-1">
                        {(detailVoucher.invoices || []).map((allocation) => (
                          <span key={allocation.id ?? allocation.invoiceId} className="text-[12px]">
                            {allocation.invoice?.invoiceNumber ?? `#${allocation.invoiceId}`} ·{" "}
                            {formatCurrency(allocation.amountApplied)}
                            {Number(allocation.pph23Deduction) > 0
                              ? ` · PPh23 ${formatCurrency(allocation.pph23Deduction)}`
                              : ""}
                            {Number(allocation.bankCharge) > 0
                              ? ` · charge ${formatCurrency(allocation.bankCharge)}`
                              : ""}
                          </span>
                        ))}
                      </div>
                    ),
                },
                { label: "Description", value: detailVoucher.description },
              ]
            : []
        }
      />
    </PageContainer>
  );
}
