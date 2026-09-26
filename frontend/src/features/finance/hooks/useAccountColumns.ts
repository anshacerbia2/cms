import { useQuery } from "@tanstack/react-query";
import { fetchAccountColumns, type AccountColumn } from "../services/accountColumns.service";

/** The filter and sort machinery keys off strings, so each account gets one. */
export const accountKey = (id: number) => `acct_${id}`;

/**
 * One shared empty list: a fresh `[]` on every render would count as a change
 * to the memoised rows that take it and re-render all of them each time.
 */
const NO_COLUMNS: AccountColumn[] = [];

/** The account columns of one finance table for one year. */
export function useAccountColumns(resource: string, year?: number, options?: any) {
  const query = useQuery<AccountColumn[]>({
    queryKey: ["finance", resource, "accounts", year],
    queryFn: () => fetchAccountColumns(resource, year),
    ...options,
  });
  return query.data ?? NO_COLUMNS;
}

export type { AccountColumn };
