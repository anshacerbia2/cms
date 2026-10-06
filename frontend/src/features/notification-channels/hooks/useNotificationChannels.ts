import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";

export type NotificationChannelType = "TELEGRAM" | "GOOGLE_CHAT";

/** Kredensialnya tidak pernah dikirim server; `hint` adalah petunjuk tujuannya yang aman ditampilkan. */
export type NotificationChannel = {
  id: string;
  type: NotificationChannelType;
  name: string;
  hint: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Isian form. Kredensial yang dikosongkan saat edit berarti "tetap". */
export type NotificationChannelInput = {
  type?: NotificationChannelType;
  name?: string;
  isActive?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  googleChatWebhookUrl?: string;
};

export const TYPE_LABELS: Record<NotificationChannelType, string> = {
  TELEGRAM: "Telegram",
  GOOGLE_CHAT: "Google Chat",
};

const KEY = ["notification-channels"];
const messageOf = (error: any, fallback: string) => {
  const m = error?.response?.data?.message;
  return Array.isArray(m) ? m[0] : m || fallback;
};

export function useNotificationChannels() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const list = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<NotificationChannel[]> => (await api.get("/notification-channels")).data,
  });

  const create = useMutation({
    mutationFn: async (input: NotificationChannelInput) => (await api.post("/notification-channels", input)).data,
    onSuccess: () => {
      invalidate();
      toast.success("Notification channel added.");
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: NotificationChannelInput & { id: string }) =>
      (await api.patch(`/notification-channels/${id}`, input)).data,
    onSuccess: () => {
      invalidate();
      toast.success("Notification channel saved.");
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/notification-channels/${id}`)).data,
    onSuccess: () => {
      invalidate();
      toast.success("Notification channel deleted.");
    },
    onError: (error) => toast.error(messageOf(error, "Failed to delete the channel.")),
  });

  const test = useMutation({
    mutationFn: async (id: string) => (await api.post(`/notification-channels/${id}/test`)).data,
    onSuccess: () => toast.success("Test message sent. Check the chat."),
    onError: (error) => toast.error(messageOf(error, "The test message was not delivered.")),
  });

  return { list, create, update, remove, test, messageOf };
}
