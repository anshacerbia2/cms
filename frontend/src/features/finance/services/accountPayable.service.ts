import api from "@/lib/api";
import { PaginationParams, PaginatedResponse } from "../hooks/useFinance";

export const accountPayableService = {
  getAP: async (params: PaginationParams): Promise<PaginatedResponse<any>> => {
    const { data } = await api.get("/finance/account-payable", { params });
    return data;
  },

  getAllAP: async (year?: number): Promise<any[]> => {
    const { data } = await api.get("/finance/account-payable/all", { params: { year } });
    return Array.isArray(data) ? data : (data as any).data || [];
  },

  getApTaxLedger: async (params: PaginationParams & { type?: 'WAPU' | 'NON_WAPU' }): Promise<PaginatedResponse<any>> => {
    const { data } = await api.get("/finance/account-payable/tax-ledger", { params });
    return data;
  },

  getAllApTaxLedger: async (params: { type?: 'WAPU' | 'NON_WAPU' }): Promise<any[]> => {
    const { data } = await api.get("/finance/account-payable/tax-ledger/all", { params });
    return data;
  },

  createAP: async (payload: any): Promise<any> => {
    const { data } = await api.post("/finance/account-payable", payload);
    return data;
  },

  createBulkAP: async (payload: { data: any[], tagYear: number }): Promise<any> => {
    const { data } = await api.post("/finance/account-payable/bulk", payload);
    return data;
  },

  createTaxLedger: async (payload: any): Promise<any> => {
    const { data } = await api.post("/finance/account-payable/tax-ledger", payload);
    return data;
  },

  createBulkTaxLedger: async (payload: { data: any[], tagYear: number }): Promise<any> => {
    const { data } = await api.post("/finance/account-payable/tax-ledger/bulk", payload);
    return data;
  },
};
