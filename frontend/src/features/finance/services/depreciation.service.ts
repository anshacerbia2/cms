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

  getAssetById: async (id: number): Promise<any> => {
    const { data } = await api.get(`/finance/depreciation/${id}`);
    return data;
  },

  updateAsset: async (id: number, payload: any): Promise<any> => {
    const { data } = await api.patch(`/finance/depreciation/${id}`, payload);
    return data;
  },

  deleteAsset: async (id: number): Promise<any> => {
    const { data } = await api.delete(`/finance/depreciation/${id}`);
    return data;
  },
};
