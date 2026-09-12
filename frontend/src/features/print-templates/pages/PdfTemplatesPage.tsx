import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search, MoreVertical, Edit2, Trash2, Printer, CheckCircle2 } from "lucide-react";
import { useDebounce } from "use-debounce";
import { usePdfTemplates, usePdfTemplate } from "../hooks/usePdfTemplates";
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
import { PdfTemplateDialog } from "../components/PdfTemplateDialog";
import { PdfTemplate, CreatePdfTemplateInput } from "../types";

export default function PdfTemplatesPage() {
  const { can } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const { templatesQuery, createTemplate, updateTemplate, deleteTemplate, preview } =
    usePdfTemplates({ page, search: debouncedSearch, limit: 10 });

  const { data: response, isLoading } = templatesQuery;
  const templates = response?.data || [];
  const meta = response?.meta;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // The list omits html_content — it can be tens of kilobytes per row — so the
  // markup is fetched only for the template being edited.
  const { data: templateDetail } = usePdfTemplate(editingId);

  const handleCreate = () => {
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (template: PdfTemplate) => {
    setEditingId(template.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: CreatePdfTemplateInput) => {
    try {
      if (editingId) {
        await updateTemplate.mutateAsync({ id: editingId, ...data });
      } else {
        await createTemplate.mutateAsync(data);
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Failed to save template.");
    }
  };

  const handlePreview = async (html: string) => {
    try {
      return await preview.mutateAsync(html);
    } catch {
      return undefined;
    }
  };

  const handleDelete = async (template: PdfTemplate) => {
    if (!confirm(`Delete template "${template.name}"?`)) return;

    try {
      await deleteTemplate.mutateAsync(template.id);
    } catch (error: any) {
      // Refused when it is the only template of its type — printing would break.
      toast.error(error?.response?.data?.message ?? "Failed to delete template.");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Print Templates"
        description="HTML layouts for printed invoices and proposals. One active template per type."
        icon={Printer}
        actions={
          can("pdf-templates.create") && (
            <Button
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90 text-white font-extrabold px-6 rounded-xl shadow-premium transition-all active:scale-95 flex items-center gap-2 h-11"
            >
              <Plus size={18} strokeWidth={3} />
              <span>ADD TEMPLATE</span>
            </Button>
          )
        }
      />

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm shadow-sm">
        <div className="relative flex-1 w-full">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60"
            size={18}
          />
          <Input
            placeholder="Search templates..."
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10 font-medium"
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-primary/[0.02]">
                <TableRow className="hover:bg-transparent border-primary/5">
                  <TableHead className="pl-8 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Template</TableHead>
                  <TableHead className="w-[130px] text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Type</TableHead>
                  <TableHead className="w-[130px] text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Status</TableHead>
                  <TableHead className="w-[110px] text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60">Fields</TableHead>
                  <TableHead className="w-[80px] text-right pr-8 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i} className="border-primary/5">
                      <TableCell className="pl-8">
                        <Skeleton className="h-5 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-10" />
                      </TableCell>
                      <TableCell className="pr-8">
                        <Skeleton className="h-8 w-8 rounded-lg ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : templates.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-48 text-center text-muted-foreground font-medium uppercase text-xs tracking-widest"
                    >
                      No templates found
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((template) => (
                    <TableRow key={template.id} className="group hover:bg-primary/[0.02] border-primary/5 transition-all whitespace-nowrap">
                      <TableCell className="pl-8">
                        <div className="flex flex-col">
                          <span className="font-bold text-[13px] text-primary uppercase tracking-tight">
                            {template.name}
                          </span>
                          {template.description && (
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {template.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground"
                        >
                          {template.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {template.isActive ? (
                          <Badge
                            variant="outline"
                            className="gap-1 bg-green-50 text-green-600 border-green-100"
                          >
                            <CheckCircle2 size={11} />
                            <span className="text-[10px] font-extrabold uppercase tracking-widest">
                              In Use
                            </span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-muted text-muted-foreground border-transparent"
                          >
                            <span className="text-[10px] font-extrabold uppercase tracking-widest">
                              Inactive
                            </span>
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-[12px] font-bold text-muted-foreground">
                        {template.variables?.length ?? 0}
                      </TableCell>
                      <TableCell className="pr-8 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-9 w-9 p-0 rounded-xl hover:bg-primary/5 text-muted-foreground transition-all"
                            >
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 rounded-xl shadow-premium border-primary/10 p-1 bg-white backdrop-blur-xl"
                          >
                            {can("pdf-templates.update") && (
                              <DropdownMenuItem
                                onClick={() => handleEdit(template)}
                                className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                              >
                                <Edit2 size={14} />
                                <span>Edit</span>
                              </DropdownMenuItem>
                            )}
                            {can("pdf-templates.delete") && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(template)}
                                className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-red-500 hover:text-red-600 focus:text-red-600 transition-colors"
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </DropdownMenuItem>
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
        </div>

        <PaginationControls
          meta={meta}
          onPageChange={setPage}
          isFetching={templatesQuery.isFetching}
        />
      </div>

      <PdfTemplateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        template={editingId ? templateDetail : null}
        onPreview={handlePreview}
        isSubmitting={createTemplate.isPending || updateTemplate.isPending}
      />
    </PageContainer>
  );
}
