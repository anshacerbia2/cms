import { useState } from "react";
import { Plus, Search, MoreVertical, Edit2, Trash2, Eye, ClipboardList, Package } from "lucide-react";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { useProposals, useProposal } from "../hooks/useProposals";
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
import { ProposalDialog } from "../components/ProposalDialog";
import { BoqDialog } from "../components/BoqDialog";
import { Proposal, CreateProposalInput, ProposalStatus, PricingModel } from "../types";

const STATUS_STYLES: Record<ProposalStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground border-transparent",
  SUBMITTED: "bg-blue-50 text-blue-600 border-blue-100",
  WIN: "bg-green-50 text-green-600 border-green-100",
  LOSE: "bg-rose-50 text-rose-600 border-rose-100",
  CANCELLED: "bg-amber-50 text-amber-600 border-amber-100",
};

const ALL = "ALL";

export default function ProposalsPage() {
  const { can } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const [status, setStatus] = useState<string>(ALL);
  const [pricingModel, setPricingModel] = useState<string>(ALL);

  const { proposalsQuery, createProposal, updateProposal, deleteProposal } = useProposals({
    page,
    search: debouncedSearch,
    limit: 10,
    ...(status !== ALL ? { status: status as ProposalStatus } : {}),
    ...(pricingModel !== ALL ? { pricingModel: pricingModel as PricingModel } : {}),
  });

  const { data: response, isLoading, isFetching } = proposalsQuery;
  const proposals = response?.data || [];
  const meta = response?.meta;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [boqProposal, setBoqProposal] = useState<Proposal | null>(null);

  // The list endpoint omits sales items, so both the editor and the detail view
  // load the full proposal on demand.
  const { data: editingProposal } = useProposal(editingId);
  const { data: detailProposal } = useProposal(detailId);

  const handleCreate = () => {
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (proposal: Proposal) => {
    setEditingId(proposal.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: CreateProposalInput) => {
    try {
      if (editingId) {
        await updateProposal.mutateAsync({ id: editingId, ...data });
        toast.success("Proposal updated successfully.");
      } else {
        await createProposal.mutateAsync(data);
        toast.success("Proposal created successfully.");
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save proposal.");
    }
  };

  const handleDelete = async (proposal: Proposal) => {
    if (!confirm(`Delete proposal ${proposal.code}? This cannot be undone.`)) return;
    try {
      await deleteProposal.mutateAsync(proposal.id);
      toast.success("Proposal deleted successfully.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete proposal.");
    }
  };

  const filterTriggerClass =
    "h-12 w-full sm:w-44 rounded-xl border-primary/10 bg-white shadow-sm text-muted-foreground font-bold text-xs uppercase tracking-widest";

  return (
    <PageContainer>
      <PageHeader
        title="Proposals"
        description="Priced scope per project — winning one issues the sales code invoices bill against."
        icon={ClipboardList}
        actions={
          can("proposals.create") && (
            <Button
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90 text-white font-extrabold px-6 rounded-xl shadow-premium transition-all active:scale-95 flex items-center gap-2 h-11"
            >
              <Plus size={18} strokeWidth={3} />
              <span>ADD PROPOSAL</span>
            </Button>
          )
        }
      />

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Search by code, sales code, project or customer..."
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
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="WIN">Win</SelectItem>
            <SelectItem value="LOSE">Lose</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={pricingModel}
          onValueChange={(value) => {
            setPricingModel(value);
            setPage(1);
          }}
        >
          <SelectTrigger className={filterTriggerClass}>
            <SelectValue placeholder="All models" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Models</SelectItem>
            <SelectItem value="A">Type A</SelectItem>
            <SelectItem value="B">Type B</SelectItem>
            <SelectItem value="C">Type C</SelectItem>
            <SelectItem value="D">Type D</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px] pl-8">Code</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="w-[90px]">Model</TableHead>
                <TableHead className="text-right">Items Total</TableHead>
                <TableHead className="text-right">Invoice Amount</TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[80px] text-right pr-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-8"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="pr-8"><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : proposals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-muted-foreground font-medium uppercase text-xs tracking-widest">
                    No proposals found
                  </TableCell>
                </TableRow>
              ) : (
                proposals.map((proposal) => (
                  <TableRow key={proposal.id} className="whitespace-nowrap">
                    <TableCell className="pl-8 font-bold text-primary text-xs tracking-tight">
                      <div className="flex flex-col">
                        <span>{proposal.code}</span>
                        {proposal.salesCode && (
                          <span className="text-[10px] text-muted-foreground font-medium">{proposal.salesCode}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-[13px] text-primary uppercase tracking-tight">
                          {proposal.project?.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {proposal.project?.customer?.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground">
                        TYPE {proposal.pricingModel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-[13px] text-primary tabular-nums">
                      {formatCurrency(proposal.totalAmountItems)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-[13px] text-primary tabular-nums">
                      {formatCurrency(proposal.invoiceAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground">
                          {proposal._count?.salesItems || 0} ITEM
                        </Badge>
                        <Badge variant="outline" className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground">
                          {proposal._count?.boqs || 0} BOQ
                        </Badge>
                        <Badge variant="outline" className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground">
                          {proposal._count?.invoices || 0} INV
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_STYLES[proposal.status]}>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">{proposal.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-primary/5 text-muted-foreground transition-all">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-premium border-primary/10 p-1 bg-white backdrop-blur-xl">
                          <DropdownMenuItem
                            onClick={() => setDetailId(proposal.id)}
                            className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                          >
                            <Eye size={14} />
                            <span>View Details</span>
                          </DropdownMenuItem>
                          {can("boqs.index") && (
                            <DropdownMenuItem
                              onClick={() => setBoqProposal(proposal)}
                              className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                            >
                              <Package size={14} />
                              <span>Manage BoQ</span>
                            </DropdownMenuItem>
                          )}
                          {can("proposals.update") && proposal.status !== "WIN" && (
                            <DropdownMenuItem
                              onClick={() => handleEdit(proposal)}
                              className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                            >
                              <Edit2 size={14} />
                              <span>Edit Proposal</span>
                            </DropdownMenuItem>
                          )}
                          {can("proposals.delete") && (
                            <>
                              <div className="h-px bg-muted mx-1 my-1" />
                              <DropdownMenuItem
                                onClick={() => handleDelete(proposal)}
                                className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-destructive hover:bg-destructive/5 transition-colors"
                              >
                                <Trash2 size={14} />
                                <span>Delete Proposal</span>
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

      <ProposalDialog
        open={isDialogOpen && (!editingId || !!editingProposal)}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingId(null);
        }}
        onSubmit={handleSubmit}
        proposal={editingId ? editingProposal : null}
        isSubmitting={createProposal.isPending || updateProposal.isPending}
      />

      <BoqDialog
        open={!!boqProposal}
        onOpenChange={(open) => !open && setBoqProposal(null)}
        proposal={boqProposal}
      />

      <DetailModal
        open={!!detailId && !!detailProposal}
        onOpenChange={(open) => !open && setDetailId(null)}
        title={detailProposal?.code || ""}
        subtitle={detailProposal?.project?.name}
        icon={<ClipboardList className="w-8 h-8 text-secondary shrink-0" strokeWidth={2.5} />}
        data={
          detailProposal
            ? [
                { label: "Customer", value: detailProposal.project?.customer?.name },
                { label: "Sales Code", value: detailProposal.salesCode },
                { label: "Pricing Model", value: `Type ${detailProposal.pricingModel}` },
                { label: "Status", value: detailProposal.status },
                { label: "Items Total", value: formatCurrency(detailProposal.totalAmountItems) },
                {
                  label: "Management Fee",
                  value: `${formatCurrency(detailProposal.calculatedManagementFee)} (${
                    detailProposal.managementFeeType === "PERCENT"
                      ? `${Number(detailProposal.managementFee)}%`
                      : "nominal"
                  })`,
                },
                { label: "Sales Amount", value: formatCurrency(detailProposal.salesAmount) },
                { label: `VAT (${detailProposal.vatRate}%)`, value: formatCurrency(detailProposal.vatAmount) },
                { label: "Invoice Amount", value: formatCurrency(detailProposal.invoiceAmount) },
                { label: "Sales Items", value: detailProposal.salesItems?.length ?? 0 },
                { label: "Created", value: formatDate(detailProposal.createdAt) },
                { label: "Note", value: detailProposal.note },
              ]
            : []
        }
      />
    </PageContainer>
  );
}
