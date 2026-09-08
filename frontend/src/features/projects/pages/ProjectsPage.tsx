import { useState } from "react";
import { Plus, Search, MoreVertical, Edit2, Trash2, Eye, Briefcase } from "lucide-react";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { useProjects } from "../hooks/useProjects";
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
import { ProjectDialog } from "../components/ProjectDialog";
import { Project, CreateProjectInput, ProjectStatus, ProjectType } from "../types";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  ACTIVE: "bg-green-50 text-green-600 border-green-100",
  INACTIVE: "bg-muted text-muted-foreground border-transparent",
  COMPLETED: "bg-blue-50 text-blue-600 border-blue-100",
  CANCELLED: "bg-rose-50 text-rose-600 border-rose-100",
};

const ALL = "ALL";

export default function ProjectsPage() {
  const { can } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const [type, setType] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);

  const { projectsQuery, createProject, updateProject, deleteProject } = useProjects({
    page,
    search: debouncedSearch,
    limit: 10,
    ...(type !== ALL ? { type: type as ProjectType } : {}),
    ...(status !== ALL ? { status: status as ProjectStatus } : {}),
  });

  const { data: response, isLoading, isFetching } = projectsQuery;
  const projects = response?.data || [];
  const meta = response?.meta;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(null);

  const handleCreate = () => {
    setSelectedProject(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: CreateProjectInput) => {
    try {
      if (selectedProject) {
        await updateProject.mutateAsync({ id: selectedProject.id, ...data });
        toast.success("Project updated successfully.");
      } else {
        await createProject.mutateAsync(data);
        toast.success("Project created successfully.");
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save project.");
    }
  };

  const handleDelete = async (project: Project) => {
    if (!confirm(`Delete project ${project.code}? This cannot be undone.`)) return;
    try {
      await deleteProject.mutateAsync(project.id);
      toast.success("Project deleted successfully.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete project.");
    }
  };

  const filterTriggerClass =
    "h-12 w-full sm:w-44 rounded-xl border-primary/10 bg-white shadow-sm text-muted-foreground font-bold text-xs uppercase tracking-widest";

  return (
    <PageContainer>
      <PageHeader
        title="Projects"
        description="Contract registry feeding the proposal and invoice pipeline."
        icon={Briefcase}
        actions={
          can("projects.create") && (
            <Button
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90 text-white font-extrabold px-6 rounded-xl shadow-premium transition-all active:scale-95 flex items-center gap-2 h-11"
            >
              <Plus size={18} strokeWidth={3} />
              <span>ADD PROJECT</span>
            </Button>
          )
        }
      />

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 p-2 rounded-2xl border border-primary/5 backdrop-blur-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Search by code, name, ref doc or customer..."
            className="pl-11 h-12 bg-white border-0 rounded-xl shadow-sm focus-visible:ring-primary/10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={type}
          onValueChange={(value) => {
            setType(value);
            setPage(1);
          }}
        >
          <SelectTrigger className={filterTriggerClass}>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Types</SelectItem>
            <SelectItem value="REGULAR">Regular</SelectItem>
            <SelectItem value="FIT">FIT</SelectItem>
          </SelectContent>
        </Select>
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
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table Section */}
      <div className="space-y-4">
        <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px] pl-8">Code</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="w-[130px]">Due Date</TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead className="w-[130px]">Status</TableHead>
                <TableHead className="w-[80px] text-right pr-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-8"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="pr-8"><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-muted-foreground font-medium uppercase text-xs tracking-widest">
                    No projects found
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id} className="whitespace-nowrap">
                    <TableCell className="pl-8 font-bold text-primary text-xs tracking-tight">
                      <div className="flex flex-col">
                        <span>{project.code}</span>
                        {project.salesCode && (
                          <span className="text-[10px] text-muted-foreground font-medium">{project.salesCode}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-[13px] text-primary uppercase tracking-tight">
                          {project.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {project.customer?.name} • {project.refDocNo}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          project.type === "FIT"
                            ? "bg-amber-50 text-amber-600 border-amber-100 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg"
                            : "bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground"
                        }
                      >
                        {project.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-[13px] text-primary tabular-nums">
                      {formatCurrency(project.value)}
                    </TableCell>
                    <TableCell className="text-[11px] font-medium text-muted-foreground">
                      {formatDate(project.dueDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground">
                          {project._count?.proposals || 0} PROP
                        </Badge>
                        <Badge variant="outline" className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground">
                          {project._count?.invoices || 0} INV
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_STYLES[project.status]}>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">{project.status}</span>
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
                            onClick={() => setDetailProject(project)}
                            className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                          >
                            <Eye size={14} />
                            <span>View Details</span>
                          </DropdownMenuItem>
                          {can("projects.update") && (
                            <DropdownMenuItem
                              onClick={() => handleEdit(project)}
                              className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground hover:text-primary focus:text-primary transition-colors"
                            >
                              <Edit2 size={14} />
                              <span>Edit Project</span>
                            </DropdownMenuItem>
                          )}
                          {can("projects.delete") && (
                            <>
                              <div className="h-px bg-muted mx-1 my-1" />
                              <DropdownMenuItem
                                onClick={() => handleDelete(project)}
                                className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-destructive hover:bg-destructive/5 transition-colors"
                              >
                                <Trash2 size={14} />
                                <span>Delete Project</span>
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

      <ProjectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        project={selectedProject}
        isSubmitting={createProject.isPending || updateProject.isPending}
      />

      <DetailModal
        open={!!detailProject}
        onOpenChange={(open) => !open && setDetailProject(null)}
        title={detailProject?.name || ""}
        subtitle={detailProject?.code}
        icon={<Briefcase className="w-8 h-8 text-secondary shrink-0" strokeWidth={2.5} />}
        data={
          detailProject
            ? [
                { label: "Customer", value: detailProject.customer?.name },
                { label: "Reference Doc No.", value: detailProject.refDocNo },
                { label: "Type", value: detailProject.type },
                { label: "Status", value: detailProject.status },
                { label: "Contract Value", value: formatCurrency(detailProject.value) },
                { label: "Sales Code", value: detailProject.salesCode },
                { label: "Start Date", value: formatDate(detailProject.startDate) },
                { label: "End Date", value: formatDate(detailProject.endDate) },
                { label: "Due Date", value: formatDate(detailProject.dueDate) },
                { label: "Proposals", value: detailProject._count?.proposals ?? 0 },
                { label: "Invoices", value: detailProject._count?.invoices ?? 0 },
                { label: "Sales Items", value: detailProject._count?.salesItems ?? 0 },
                { label: "Description", value: detailProject.description },
              ]
            : []
        }
      />
    </PageContainer>
  );
}
