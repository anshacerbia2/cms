import api from "@/lib/api";

/** One account column of a finance table, as the server decides it. */
export interface AccountColumn {
  id: number;
  name: string;
  order: number | null;
}

/**
 * The accounts a year's rows were posted against, in the order to show them.
 *
 * Which accounts a table has columns for is a fact about the data now, not
 * about the component, so every finance table asks for it the same way.
 */
export async function fetchAccountColumns(resource: string, year?: number): Promise<AccountColumn[]> {
  const { data } = await api.get(`/finance/${resource}/accounts`, { params: { year } });
  return Array.isArray(data) ? data : [];
}
