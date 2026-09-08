import { Project } from '@/features/projects/types';

export type ProposalStatus = 'DRAFT' | 'SUBMITTED' | 'WIN' | 'LOSE' | 'CANCELLED';
/** A: lump sum · B: qty × price · C/D: price × up to four multipliers. */
export type PricingModel = 'A' | 'B' | 'C' | 'D';
export type ManagementFeeType = 'NOMINAL' | 'PERCENT';

export interface SalesItem {
  id: string;
  proposalId?: string | null;
  invoiceId?: string | null;
  projectId?: string | null;
  productId?: string | null;
  productPriceVersionId?: string | null;
  description?: string | null;
  sellingPrice: string;
  totalPrice: string;
  title1Key?: string | null;
  title1Value?: number | null;
  title2Key?: string | null;
  title2Value?: number | null;
  title3Key?: string | null;
  title3Value?: number | null;
  title4Key?: string | null;
  title4Value?: number | null;
  header?: string | null;
  subheader?: string | null;
  headerOrder?: number;
  product?: { id: string; code: string; name: string };
}

export interface Proposal {
  id: string;
  code: string;
  projectId: string;
  salesCode?: string | null;
  note?: string | null;
  status: ProposalStatus;
  pricingModel: PricingModel;
  pricingModelDescription?: string | null;
  managementFeeType: ManagementFeeType;
  managementFee: string;
  vatRate: number;
  totalAmountItems: string;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  salesItems?: SalesItem[];
  _count?: {
    salesItems: number;
    boqs: number;
    invoices: number;
  };
  /** Appended by the backend, mirroring the legacy accessors. */
  calculatedManagementFee: number;
  salesAmount: number;
  vatAmount: number;
  invoiceAmount: number;
}

export interface ProposalItemInput {
  productId?: number;
  productPriceVersionId?: number;
  description?: string;
  sellingPrice: number;
  qty?: number;
  title1Key?: string;
  title1Value?: number;
  title2Key?: string;
  title2Value?: number;
  title3Key?: string;
  title3Value?: number;
  title4Key?: string;
  title4Value?: number;
  header?: string;
  subheader?: string;
  headerOrder?: number;
}

export interface CreateProposalInput {
  projectId: number;
  note?: string;
  status?: ProposalStatus;
  pricingModel: PricingModel;
  managementFeeType?: ManagementFeeType;
  managementFee?: number;
  vatRate?: number;
  pricingModelDescription?: string;
  totalAmountItems?: number;
  items?: ProposalItemInput[];
}

export interface UpdateProposalInput extends Partial<CreateProposalInput> {
  id: string;
}

export interface ProposalQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: number;
  status?: ProposalStatus;
  pricingModel?: PricingModel;
}

export interface BoqItem {
  id: string;
  boqId: string;
  productId: string;
  productPriceVersionId?: string | null;
  description?: string | null;
  sellingPrice: string;
  qty: number;
  qtyUnit?: string | null;
  freq: number;
  freqUnit?: string | null;
  totalPrice: string;
  product?: { id: string; code: string; name: string; unit?: string };
}

export interface Boq {
  id: string;
  code: string;
  proposalId?: string | null;
  totalAmountItems: string;
  createdAt: string;
  updatedAt: string;
  items?: BoqItem[];
  proposal?: { id: string; code: string; status: ProposalStatus; salesCode?: string | null };
  _count?: { items: number };
}

export interface BoqItemInput {
  productId: number;
  description?: string;
  /** Omitted means "use the product's active price version". */
  sellingPrice?: number;
  qty: number;
  qtyUnit?: string;
  freq: number;
  freqUnit?: string;
}

export interface CreateBoqInput {
  proposalId?: number;
  items: BoqItemInput[];
}
