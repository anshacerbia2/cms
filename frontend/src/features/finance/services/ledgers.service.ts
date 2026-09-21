import api from "@/lib/api";

export type SubLedgerNode = {
  id: number;
  ledgerId: number;
  /** Dipakai laporan keuangan; baris ber-code tidak bisa dihapus atau dinonaktifkan. */
  code: string | null;
  name: string;
  isActive: boolean;
  /** Jumlah transaksi yang memakainya. */
  usage: number;
};

export type LedgerNode = {
  id: number;
  code: string | null;
  name: string;
  orderIndex: number;
  isActive: boolean;
  usage: number;
  subLedgers: SubLedgerNode[];
};

export const ledgersService = {
  tree: async (): Promise<LedgerNode[]> => {
    const { data } = await api.get("/ledgers/tree");
    return data;
  },
  createLedger: async (payload: { name: string }) => (await api.post("/ledgers", payload)).data,
  updateLedger: async ({ id, ...payload }: { id: number; name?: string; orderIndex?: number; isActive?: boolean }) =>
    (await api.patch(`/ledgers/${id}`, payload)).data,
  deleteLedger: async (id: number) => (await api.delete(`/ledgers/${id}`)).data,
  createSubLedger: async ({ ledgerId, name }: { ledgerId: number; name: string }) =>
    (await api.post(`/ledgers/${ledgerId}/sub-ledgers`, { name })).data,
  updateSubLedger: async ({ id, ...payload }: { id: number; name?: string; isActive?: boolean }) =>
    (await api.patch(`/ledgers/sub-ledgers/${id}`, payload)).data,
  deleteSubLedger: async (id: number) => (await api.delete(`/ledgers/sub-ledgers/${id}`)).data,
};
