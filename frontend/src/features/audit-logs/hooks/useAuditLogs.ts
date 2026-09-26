import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export type AuditEntry = {
  id: string;
  occurredAt: string;
  table: string;
  rowId: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  source: "APP" | "SQL";
  user: { id: string | null; name: string | null; email: string } | null;
  dbUser: string;
  requestId: string | null;
  changedColumns: string[];
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  /** Nama rekening, untuk baris rincian per rekening (tabel *_amounts). */
  accountLabel: string | null;
};

export type AuditLogParams = {
  table?: string;
  rowId?: string;
  userId?: string;
  action?: string;
  requestId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export type AuditLogPage = {
  data: AuditEntry[];
  meta: { total: number; page: number; limit: number; lastPage: number };
};

export function useAuditLogs(params: AuditLogParams, enabled = true) {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: async (): Promise<AuditLogPage> => (await api.get("/audit-logs", { params })).data,
    enabled,
  });
}

export function useAuditLogUsers() {
  return useQuery({
    queryKey: ["audit-logs", "users"],
    queryFn: async (): Promise<{ id: string; name: string; email: string }[]> =>
      (await api.get("/audit-logs/users")).data,
  });
}
