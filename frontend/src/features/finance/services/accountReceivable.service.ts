import api from "@/lib/api";
import { PaginationParams, PaginatedResponse } from "../hooks/useFinance";

export const accountReceivableService = {
  getAR: async (params: PaginationParams): Promise<PaginatedResponse<any>> => {
    const { data } = await api.get("/finance/account-receivable", { params });
    return data;
  },

  getAllAR: async (year?: number): Promise<any[]> => {
    const { data } = await api.get("/finance/account-receivable/all", { params: { year } });
    return Array.isArray(data) ? data : (data as any).data || [];
  },

  createAR: async (payload: any): Promise<any> => {
    const { data } = await api.post("/finance/account-receivable", payload);
    return data;
  },

  createBulkAR: async (payload: any[]): Promise<any> => {
    const { data } = await api.post("/finance/account-receivable/bulk", payload);
    return data;
  },
};
