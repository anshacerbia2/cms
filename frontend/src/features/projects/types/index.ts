export type ProjectType = 'FIT' | 'REGULAR';
export type ProjectStatus = 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Project {
  id: string;
  code: string;
  name: string;
  refDocNo: string;
  value: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  description?: string | null;
  customerId: string;
  status: ProjectStatus;
  type: ProjectType;
  /** Issued only for FIT projects, which bill without a proposal. */
  salesCode?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; code: string; name: string };
  _count?: {
    proposals: number;
    invoices: number;
    salesItems: number;
  };
}

export interface ProjectQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: number;
  status?: ProjectStatus;
  type?: ProjectType;
}

export interface CreateProjectInput {
  name: string;
  refDocNo: string;
  value: number;
  startDate: string;
  endDate: string;
  dueDate: string;
  description?: string;
  customerId: number;
  type: ProjectType;
  status?: ProjectStatus;
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  id: string;
}
