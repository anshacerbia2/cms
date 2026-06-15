import api from "@/lib/api";

export const equityService = {
  getProperties: async (year: number): Promise<Record<string, string>> => {
    const { data } = await api.get("/finance/equity-properties", { params: { year } });
    return data;
  },

  setProperties: async (year: number, properties: Record<string, string | null>): Promise<any> => {
    const { data } = await api.post("/finance/equity-properties", { year, properties });
    return data;
  },
};
