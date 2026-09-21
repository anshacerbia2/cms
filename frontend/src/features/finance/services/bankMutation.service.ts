import api from "@/lib/api";

export const bankMutationService = {
  getAllTransactions: async (accountId?: string, year?: string, startDate?: string, endDate?: string): Promise<any[]> => {
    const { data } = await api.get("/bank-mutation/transactions/all", { params: { accountId, year, startDate, endDate } });
    return Array.isArray(data) ? data : (data as any).data || [];
  },

  createBulkTransactions: async (payload: { data: any[]; accountId: string; tagYear: number; startingBalance?: string }): Promise<any> => {
    const { data } = await api.post("/bank-mutation/transactions/bulk", payload);
    return data;
  },

  /** Menyisip satu atau lebih baris tepat di bawah `afterId`; afterId null = paling atas. */
  insertTransaction: async (payload: {
    rows: any[];
    accountId: string;
    tagYear: number;
    afterId: number | null;
  }): Promise<any> => {
    const { data } = await api.post("/bank-mutation/transactions/insert", payload);
    return data;
  },

  getAnchorBalance: async (accountId: string, year: number): Promise<any> => {
    const { data } = await api.get(`/bank-mutation/anchor-balance/${accountId}/${year}`);
    return data;
  },

  getFiscalPeriods: async (accountId: string, year?: number): Promise<any> => {
    const { data } = await api.get("/bank-mutation/fiscal-periods", { params: { accountId, year } });
    return data;
  },

  recalculateLedger: async (payload: { accountId: string; year: number }): Promise<any> => {
    const { data } = await api.post("/bank-mutation/recalculate", payload);
    return data;
  },

  closeYear: async (payload: { accountId: string; year: number; userId: string }): Promise<any> => {
    const { data } = await api.post("/bank-mutation/close-year", payload);
    return data;
  },

  updateTransaction: async (id: number, payload: any): Promise<any> => {
    const { data } = await api.put(`/bank-mutation/transactions/${id}`, payload);
    return data;
  },

  getTransaction: async (id: number): Promise<any> => {
    const { data } = await api.get(`/bank-mutation/transactions/${id}`);
    return data;
  },

  deleteTransaction: async (id: number): Promise<any> => {
    const { data } = await api.delete(`/bank-mutation/transactions/${id}`);
    return data;
  },
};
