import api from "@/lib/api";
import { PaginationParams, PaginatedResponse } from "../hooks/useFinance";

export const financeService = {
  getRevenue: async (params: PaginationParams): Promise<PaginatedResponse<any>> => {
    const { data } = await api.get("/finance/revenue", { params });
    return data;
  },

  bulkRevenue: async (items: any[]) => {
    const { data } = await api.post("/finance/revenue/bulk", items);
    return data;
  },

  getExpenses: async (params: PaginationParams): Promise<PaginatedResponse<any>> => {
    const { data } = await api.get("/finance/expenses", { params });
    return data;
  },

  bulkExpenses: async (items: any[]) => {
    const { data } = await api.post("/finance/expenses/bulk", items);
    return data;
  },

  getBalanceSheet: async (year?: string): Promise<any> => {
    const { data } = await api.get("/finance/balance-sheet", { params: { year } });
    return data;
  },

  getInterAccountTransfers: async (params: PaginationParams): Promise<PaginatedResponse<any>> => {
    const { data } = await api.get("/finance/inter-account-transfers", { params });
    return data;
  },

  getAllInterAccountTransfers: async (): Promise<any[]> => {
    const { data } = await api.get("/finance/inter-account-transfers/all");
    return Array.isArray(data) ? data : (data as any).data || [];
  },

  getPLSummary: async (): Promise<any[]> => {
    const { data } = await api.get("/finance/pl-summary");
    return data;
  },
  
  getPLStatement: async (year?: string): Promise<any> => {
    const { data } = await api.get("/finance/pl-statement", { params: { year } });
    return data;
  },

  getPLDetails: async (year?: string, ledger?: string): Promise<any[]> => {
    const { data } = await api.get("/finance/pl-details", { params: { year, ledger } });
    return data;
  },
};
