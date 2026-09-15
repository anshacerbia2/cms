import { useQuery } from "@tanstack/react-query";
import { fetchAccountColumns, type AccountColumn } from "../services/accountColumns.service";

/** The filter and sort machinery keys off strings, so each account gets one. */
export const accountKey = (id: number) => `acct_${id}`;

/** The account columns of one finance table for one year. */
export function useAccountColumns(resource: string, year?: number, options?: any) {
  const query = useQuery<AccountColumn[]>({
    queryKey: ["finance", resource, "accounts", year],
    queryFn: () => fetchAccountColumns(resource, year),
    ...options,
  });
  return query.data ?? [];
}

export type { AccountColumn };
