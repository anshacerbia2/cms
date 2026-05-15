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

  getBalanceSheet: async (date?: string): Promise<any> => {
    const { data } = await api.get("/finance/balance-sheet", { params: { date } });
    return data;
  },

  getDashboardActivities: async (): Promise<any[]> => {
    const { data } = await api.get("/finance/recent-activities");
    return data;
  },

  getAllInterAccountTransfers: async (): Promise<any[]> => {
    const { data } = await api.get("/finance/inter-account-transfers/all");
    return Array.isArray(data) ? data : (data as any).data || [];
  },

  getPLSummary: async (year?: string, date?: string): Promise<any[]> => {
    const { data } = await api.get("/finance/pl-summary", { params: { year, date } });
    return data;
  },
  
  getPLStatement: async (year?: string, date?: string): Promise<any> => {
    const { data } = await api.get("/finance/pl-statement", { params: { year, date } });
    return data;
  },

  getPLDetails: async (year?: string, ledger?: string, date?: string, subItem?: string): Promise<any[]> => {
    const { data } = await api.get("/finance/pl-details", { params: { year, ledger, date, subItem } });
    return data;
  },

  getSalesCogsDetails: async (year?: string, date?: string): Promise<any> => {
    const { data } = await api.get("/finance/sales-cogs-details", { params: { year, date } });
    return data;
  },

  getDepreciationDetails: async (): Promise<any[]> => {
    const { data } = await api.get("/finance/depreciation-details");
    return data;
  },

  getBSDetails: async (category: string, subItem?: string, date?: string, accountId?: string): Promise<any[]> => {
    const { data } = await api.get("/finance/balance-sheet-details", { params: { category, subItem, date, accountId } });
    return data;
  },
};
