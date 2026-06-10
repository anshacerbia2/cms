import api from "@/lib/api";
import { PaginationParams, PaginatedResponse } from "../hooks/useFinance";

export const depreciationService = {
  getAssets: async (params: PaginationParams): Promise<PaginatedResponse<any>> => {
    const { data } = await api.get("/finance/depreciation", { params });
    return data;
  },

  getAllAssets: async (year?: number): Promise<any[]> => {
    const { data } = await api.get("/finance/depreciation/all", { params: { year } });
    return Array.isArray(data) ? data : (data as any).data || [];
  },

  createBulkAssets: async (payload: { data: any[], tagYear: number }): Promise<any> => {
    const response = await api.post("/finance/depreciation/bulk", payload);
    return response.data;
  },
};
