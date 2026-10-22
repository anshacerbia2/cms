import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Smartphone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const LABEL = "text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2";
const CODE_FIELD =
  "h-12 rounded-xl bg-muted/30 border-primary/5 focus-visible:ring-primary/10 text-center font-mono text-lg font-bold tracking-[0.4em]";

type Status = { enabled: boolean; enabledAt: string | null };
type Enrollment = { challenge: string; secret: string; qrCode: string };

/** Kunci manual dikelompokkan per 4 huruf supaya mudah diketik ulang. */
const groupKey = (key: string) => key.match(/.{1,4}/g)?.join(" ") ?? key;
const errorMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message[0] : message || fallback;
};

/**
 * Verifikasi dua langkah (Google Authenticator) untuk akun sendiri - pilihan
 * tiap user. Menyalakan: scan QR, lalu masukkan kode dari aplikasinya.
 * Mematikan: butuh kode yang berlaku, supaya sesi yang tertinggal saja tidak cukup.
 */
export function TwoFactorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");

  const status = useQuery({
    queryKey: ["two-factor"],
    queryFn: async () => (await api.get<Status>("/auth/two-factor")).data,
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setEnrollment(null);
      setCode("");
    }
  }, [open]);

  const done = (message: string) => {
    toast.success(message);
    queryClient.invalidateQueries({ queryKey: ["two-factor"] });
    onOpenChange(false);
  };

  const start = useMutation({
    mutationFn: async () => (await api.post<Enrollment>("/auth/two-factor/setup")).data,
    onSuccess: (data) => {
      setEnrollment(data);
      setCode("");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not start the setup.")),
  });

  const enable = useMutation({
    mutationFn: () => api.post("/auth/two-factor/enable", { challenge: enrollment!.challenge, code }),
    onSuccess: () => done("Two-factor sign-in is now on. You will be asked for a code each time you sign in."),
    onError: (error) => {
      const message = errorMessage(error, "Could not turn on two-factor sign-in.");
      toast.error(message);
      setCode("");
      // QR kedaluwarsa (5 menit): mulai lagi dengan QR baru.
      if (/expired/i.test(message)) setEnrollment(null);
    },
  });

  const disable = useMutation({
    mutationFn: () => api.post("/auth/two-factor/disable", { code }),
    onSuccess: () => done("Two-factor sign-in is now off."),
    onError: (error) => {
      toast.error(errorMessage(error, "Could not turn off two-factor sign-in."));
      setCode("");
    },
  });

  const enabled = status.data?.enabled ?? false;
  const codeReady = code.replace(/\s/g, "").length === 6;
  const busy = start.isPending || enable.isPending || disable.isPending;

  const codeInput = (
    <div className="space-y-2">
      <label className={LABEL}>
        <Smartphone size={12} /> Code from Google Authenticator
      </label>
      <Input
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123 456"
        maxLength={7}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
        className={CODE_FIELD}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-primary/5 shadow-premium">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-extrabold uppercase tracking-tight">
            <ShieldCheck size={18} />
            Two-Factor Sign-In
          </DialogTitle>
          <DialogDescription className="text-xs font-medium">
            Ask for a code from Google Authenticator on your phone each time you sign in, so a password alone is not
            enough to get into your account.
          </DialogDescription>
        </DialogHeader>

        {status.isLoading ? (
          <div className="py-8 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Loading...</div>
        ) : enabled ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (codeReady) disable.mutate();
            }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-[12px] font-bold text-violet-700">
              <ShieldCheck size={16} className="shrink-0" />
              <span>
                On
                {status.data?.enabledAt && ` since ${new Date(status.data.enabledAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`}
                . To turn it off, enter a current code.
              </span>
            </div>
            {codeInput}
            <DialogFooter className="pt-5 border-t border-primary/5">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 px-6 rounded-xl border-primary/10 font-bold text-xs uppercase tracking-widest"
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={!codeReady || busy}
                className="h-11 px-8 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-extrabold text-xs uppercase tracking-widest"
              >
                {disable.isPending ? "Turning off..." : "Turn Off"}
              </Button>
            </DialogFooter>
          </form>
        ) : enrollment ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (codeReady) enable.mutate();
            }}
            className="space-y-4"
          >
            <ol className="space-y-4 text-[12px] font-medium text-primary/80">
              <li>
                <span className="font-extrabold text-primary">1.</span> Install{" "}
                <span className="font-bold">Google Authenticator</span> on your phone (App Store or Google Play).
              </li>
              <li className="space-y-3">
                <div>
                  <span className="font-extrabold text-primary">2.</span> In the app, tap <span className="font-bold">+</span> and scan
                  this QR code:
                </div>
                <img
                  src={enrollment.qrCode}
                  alt="QR code for Google Authenticator"
                  className="mx-auto h-44 w-44 rounded-xl border border-border/60 bg-white p-2"
                />
                <div className="text-[11px] text-muted-foreground">
                  Can't scan? Choose "Enter a setup key" and type:
                  <div className="mt-1 select-all break-all rounded-lg bg-muted/40 px-3 py-2 font-mono text-[12px] font-bold tracking-wider text-primary">
                    {groupKey(enrollment.secret)}
                  </div>
                </div>
              </li>
              <li>
                <span className="font-extrabold text-primary">3.</span> Enter the 6-digit code the app shows.
              </li>
            </ol>
            {codeInput}
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
                disabled={!codeReady || busy}
                className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-xs uppercase tracking-widest shadow-premium"
              >
                {enable.isPending ? "Turning on..." : "Turn On"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/10 bg-muted/30 px-4 py-3 text-[12px] font-bold text-muted-foreground">
              Off. You sign in with your password only.
            </div>
            <DialogFooter className="pt-5 border-t border-primary/5">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 px-6 rounded-xl border-primary/10 font-bold text-xs uppercase tracking-widest"
              >
                Close
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => start.mutate()}
                className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-xs uppercase tracking-widest shadow-premium"
              >
                {start.isPending ? "Preparing..." : "Set Up"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
