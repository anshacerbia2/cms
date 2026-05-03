import api from "@/lib/api";
import { PaginationParams, PaginatedResponse } from "../hooks/useFinance";

export const depreciationService = {
  getAssets: async (params: PaginationParams): Promise<PaginatedResponse<any>> => {
    const { data } = await api.get("/finance/depreciation", { params });
    return data;
  },

  getAllAssets: async (): Promise<any[]> => {
    const { data } = await api.get("/finance/depreciation/all");
    return Array.isArray(data) ? data : (data as any).data || [];
  },

  createBulkAssets: async (data: any[]): Promise<any> => {
    const response = await api.post("/finance/depreciation/bulk", data);
    return response.data;
  },
};
