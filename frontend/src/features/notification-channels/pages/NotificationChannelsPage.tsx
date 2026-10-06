import { useState } from "react";
import { toast } from "sonner";
import { BellRing, Edit2, MoreVertical, Plus, Send, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/common/PageHeader";
import { PageContainer } from "@/components/common/PageContainer";
import { NotificationChannelDialog } from "../components/NotificationChannelDialog";
import {
  TYPE_LABELS,
  useNotificationChannels,
  type NotificationChannel,
  type NotificationChannelInput,
} from "../hooks/useNotificationChannels";

const HEAD = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary/60";
const ITEM = "gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider transition-colors";

/**
 * Ke mana alert keamanan dikirim: akun yang terkunci setelah 10 kali gagal
 * login, dan IP yang melewati batas percobaan. Setiap channel aktif menerima
 * alert yang sama; tanpa channel aktif, alert hanya tercatat di log server.
 */
export default function NotificationChannelsPage() {
  const { can } = useAuthStore();
  const { list, create, update, remove, test, messageOf } = useNotificationChannels();
  const channels = list.data ?? [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationChannel | null>(null);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (c: NotificationChannel) => { setEditing(c); setDialogOpen(true); };

  const submit = async (input: NotificationChannelInput) => {
    try {
      if (editing) await update.mutateAsync({ id: editing.id, ...input });
      else await create.mutateAsync(input);
      setDialogOpen(false);
    } catch (error) {
      toast.error(messageOf(error, "Failed to save the channel."));
    }
  };

  const toggle = (c: NotificationChannel) =>
    update.mutate({ id: c.id, isActive: !c.isActive }, { onError: (e) => toast.error(messageOf(e, "Failed to save.")) });

  const del = (c: NotificationChannel) => {
    if (confirm(`Delete notification channel "${c.name}"? Alerts will no longer be sent there.`)) remove.mutate(c.id);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Notification Channels"
        description="Where security alerts are sent: an account locked after repeated failed sign-ins, or an IP over the sign-in limit."
        icon={BellRing}
        actions={
          can("notification-channels.create") && (
            <Button
              onClick={openNew}
              className="bg-primary hover:bg-primary/90 text-white font-extrabold px-6 rounded-xl shadow-premium transition-all active:scale-95 flex items-center gap-2 h-11"
            >
              <Plus size={18} strokeWidth={3} />
              <span>ADD CHANNEL</span>
            </Button>
          )
        }
      />

      {!list.isLoading && !channels.some((c) => c.isActive) && (
        <div className="px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-[12px] font-semibold">
          No active channel: alerts are only written to the server log.
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-premium border border-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-primary/[0.02]">
              <TableRow className="hover:bg-transparent border-primary/5">
                <TableHead className={`pl-8 ${HEAD}`}>Channel</TableHead>
                <TableHead className={`w-[140px] ${HEAD}`}>Type</TableHead>
                <TableHead className={HEAD}>Destination</TableHead>
                <TableHead className={`w-[130px] ${HEAD}`}>Status</TableHead>
                <TableHead className={`w-[80px] text-right pr-8 ${HEAD}`}></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <TableRow key={i} className="border-primary/5">
                    <TableCell className="pl-8"><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-56" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="pr-8"><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : channels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-muted-foreground font-medium uppercase text-xs tracking-widest">
                    No channels yet
                  </TableCell>
                </TableRow>
              ) : (
                channels.map((c) => (
                  <TableRow key={c.id} className="group hover:bg-primary/[0.02] border-primary/5 transition-all whitespace-nowrap">
                    <TableCell className="pl-8 font-bold text-[13px] text-primary">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-muted/30 border-primary/5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg text-muted-foreground">
                        {TYPE_LABELS[c.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground tabular-nums">{c.hint}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        disabled={!can("notification-channels.update") || update.isPending}
                        onClick={() => toggle(c)}
                        title={c.isActive ? "Click to pause alerts to this channel" : "Click to send alerts to this channel"}
                        className="disabled:cursor-default"
                      >
                        <Badge
                          variant="outline"
                          className={c.isActive ? "bg-green-50 text-green-600 border-green-100" : "bg-muted text-muted-foreground border-transparent"}
                        >
                          <span className="text-[10px] font-extrabold uppercase tracking-widest">{c.isActive ? "Active" : "Paused"}</span>
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-primary/5 text-muted-foreground transition-all">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-premium border-primary/10 p-1 bg-white backdrop-blur-xl">
                          {can("notification-channels.update") && (
                            <DropdownMenuItem
                              disabled={test.isPending}
                              onClick={() => test.mutate(c.id)}
                              className={`${ITEM} text-muted-foreground hover:text-primary focus:text-primary`}
                            >
                              <Send size={14} />
                              <span>Send test</span>
                            </DropdownMenuItem>
                          )}
                          {can("notification-channels.update") && (
                            <DropdownMenuItem onClick={() => openEdit(c)} className={`${ITEM} text-muted-foreground hover:text-primary focus:text-primary`}>
                              <Edit2 size={14} />
                              <span>Edit</span>
                            </DropdownMenuItem>
                          )}
                          {can("notification-channels.delete") && (
                            <DropdownMenuItem onClick={() => del(c)} className={`${ITEM} text-red-500 hover:text-red-600 focus:text-red-600`}>
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <NotificationChannelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        channel={editing}
        isSubmitting={create.isPending || update.isPending}
        onSubmit={submit}
      />
    </PageContainer>
  );
}
