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

  createBulkSales: async (payload: any[]): Promise<any> => {
    const { data } = await api.post("/finance/sales/bulk", payload);
    return data;
  },
};
