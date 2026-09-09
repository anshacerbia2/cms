export type PdfTemplateType = 'INVOICE' | 'PROPOSAL';

export interface TemplateVariable {
  name: string;
  label?: string;
}

export interface PdfTemplate {
  id: string;
  name: string;
  type: PdfTemplateType;
  /** Omitted from list responses — the markup is only loaded per template. */
  htmlContent?: string;
  variables?: TemplateVariable[] | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePdfTemplateInput {
  name: string;
  type: PdfTemplateType;
  htmlContent: string;
  variables?: TemplateVariable[];
  description?: string;
  isActive?: boolean;
}

export interface UpdatePdfTemplateInput extends Partial<CreatePdfTemplateInput> {
  id: string;
}

export interface PreviewResult {
  variables: string[];
  html: string;
}

export interface PdfTemplateQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: PdfTemplateType;
}
