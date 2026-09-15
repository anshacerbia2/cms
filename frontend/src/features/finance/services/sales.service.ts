import api from "@/lib/api";
import { PaginationParams, PaginatedResponse } from "../hooks/useFinance";

/** One account column of the sales table, as the server decides it. */
export interface SalesAccount {
  id: number;
  name: string;
  order: number | null;
}

export const salesService = {
  getSales: async (params: PaginationParams): Promise<PaginatedResponse<any>> => {
    const { data } = await api.get("/finance/sales", { params });
    return data;
  },

  getAllSales: async (year?: number): Promise<any[]> => {
    const { data } = await api.get("/finance/sales/all", { params: { year } });
    return Array.isArray(data) ? data : (data as any).data || [];
  },

  /** The accounts this year's invoices were settled through, in display order. */
  getSalesAccounts: async (year?: number): Promise<SalesAccount[]> => {
    const { data } = await api.get("/finance/sales/accounts", { params: { year } });
    return Array.isArray(data) ? data : [];
  },

  createSales: async (payload: any): Promise<any> => {
    const { data } = await api.post("/finance/sales", payload);
    return data;
  },

  createBulkSales: async (payload: { data: any[], tagYear: number }): Promise<any> => {
    const { data } = await api.post("/finance/sales/bulk", payload);
    return data;
  },

  getSalesById: async (id: number): Promise<any> => {
    const { data } = await api.get(`/finance/sales/${id}`);
    return data;
  },

  updateSales: async (id: number, payload: any): Promise<any> => {
    const { data } = await api.patch(`/finance/sales/${id}`, payload);
    return data;
  },

  deleteSales: async (id: number): Promise<any> => {
    const { data } = await api.delete(`/finance/sales/${id}`);
    return data;
  },
};
