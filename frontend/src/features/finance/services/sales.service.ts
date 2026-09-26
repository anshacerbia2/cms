import api from "@/lib/api";
import { PaginationParams, PaginatedResponse } from "../hooks/useFinance";


export const salesService = {
  getSales: async (params: PaginationParams): Promise<PaginatedResponse<any>> => {
    const { data } = await api.get("/finance/sales", { params });
    return data;
  },

  getAllSales: async (year?: number): Promise<any[]> => {
    const { data } = await api.get("/finance/sales/all", { params: { year } });
    return Array.isArray(data) ? data : (data as any).data || [];
  },


  createSales: async (payload: any): Promise<any> => {
    const { data } = await api.post("/finance/sales", payload);
    return data;
  },

  createBulkSales: async (payload: { data: any[], tagYear: number }): Promise<any> => {
    const { data } = await api.post("/finance/sales/bulk", payload);
    return data;
  },

  /** Menyisip baris di bawah `afterId` (null = paling atas); baris di bawahnya bergeser turun. */
  insertSales: async (payload: { rows: any[]; tagYear: number; afterId: number | null }): Promise<any> => {
    const { data } = await api.post("/finance/sales/insert", payload);
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
