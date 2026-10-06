import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TYPE_LABELS,
  type NotificationChannel,
  type NotificationChannelInput,
  type NotificationChannelType,
} from "../hooks/useNotificationChannels";

const LABEL = "text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground";
const FIELD = "h-12 rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 font-bold tracking-tight";
const HELP = "text-[11px] text-muted-foreground";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Kosong = channel baru. */
  channel: NotificationChannel | null;
  isSubmitting: boolean;
  onSubmit: (input: NotificationChannelInput) => void;
};

const EMPTY = { name: "", telegramBotToken: "", telegramChatId: "", googleChatWebhookUrl: "" };

/**
 * Form channel. Kredensial yang sudah tersimpan tidak pernah dikirim balik oleh
 * server, jadi saat edit kolomnya kosong: diisi = diganti, dibiarkan = tetap.
 */
export function NotificationChannelDialog({ open, onOpenChange, channel, isSubmitting, onSubmit }: Props) {
  const [type, setType] = useState<NotificationChannelType>("TELEGRAM");
  const [isActive, setIsActive] = useState(true);
  const [values, setValues] = useState(EMPTY);
  const editing = !!channel;

  useEffect(() => {
    if (!open) return;
    setType(channel?.type ?? "TELEGRAM");
    setIsActive(channel?.isActive ?? true);
    setValues({ ...EMPTY, name: channel?.name ?? "" });
  }, [open, channel]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const filled = (v: string) => (v.trim() ? v.trim() : undefined);
    const credentials =
      type === "TELEGRAM"
        ? { telegramBotToken: filled(values.telegramBotToken), telegramChatId: filled(values.telegramChatId) }
        : { googleChatWebhookUrl: filled(values.googleChatWebhookUrl) };
    onSubmit({
      ...(editing ? {} : { type }),
      name: values.name.trim(),
      isActive,
      ...credentials,
    });
  };

  const keepHint = editing ? "Leave blank to keep the saved value." : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl border-primary/5 shadow-premium">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-extrabold uppercase tracking-tight">
            <BellRing size={18} />
            {editing ? `Edit ${channel!.name}` : "New Notification Channel"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className={LABEL}>Type</label>
            <Select value={type} onValueChange={(v) => setType(v as NotificationChannelType)} disabled={editing}>
              <SelectTrigger className={FIELD}><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            {editing && <p className={HELP}>The type cannot be changed. Add a new channel for another type.</p>}
          </div>

          <div className="space-y-1.5">
            <label className={LABEL}>Name</label>
            <Input required maxLength={100} placeholder="IT team" value={values.name} onChange={set("name")} className={FIELD} />
          </div>

          {type === "TELEGRAM" ? (
            <>
              <div className="space-y-1.5">
                <label className={LABEL}>Bot token</label>
                <Input
                  type="password"
                  autoComplete="off"
                  required={!editing}
                  placeholder={editing ? "•••••••• (saved)" : "123456789:ABC..."}
                  value={values.telegramBotToken}
                  onChange={set("telegramBotToken")}
                  className={FIELD}
                />
                <p className={HELP}>{keepHint ?? "From @BotFather in Telegram."}</p>
              </div>
              <div className="space-y-1.5">
                <label className={LABEL}>Chat ID</label>
                <Input
                  autoComplete="off"
                  required={!editing}
                  placeholder={editing ? "(saved)" : "-1001234567890"}
                  value={values.telegramChatId}
                  onChange={set("telegramChatId")}
                  className={FIELD}
                />
                <p className={HELP}>{keepHint ?? "Group IDs start with -100. Add the bot to the group first."}</p>
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <label className={LABEL}>Webhook URL</label>
              <Input
                type="password"
                autoComplete="off"
                required={!editing}
                placeholder={editing ? "•••••••• (saved)" : "https://chat.googleapis.com/v1/spaces/..."}
                value={values.googleChatWebhookUrl}
                onChange={set("googleChatWebhookUrl")}
                className={FIELD}
              />
              <p className={HELP}>{keepHint ?? "In the Google Chat space: Apps & integrations › Webhooks › Add webhook."}</p>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded accent-primary"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span className="text-[12px] font-semibold text-muted-foreground">Send security alerts to this channel</span>
          </label>

          <DialogFooter className="pt-5 border-t border-primary/5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 px-6 rounded-xl border-primary/10 font-bold text-xs uppercase tracking-widest"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-xs uppercase tracking-widest shadow-premium active:scale-95 transition-all"
            >
              {isSubmitting ? "Saving..." : editing ? "Save Changes" : "Add Channel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
