import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  children: ReactNode;
  /** Dipanggil saat pengguna menutup pesan error - misalnya untuk membatalkan baris yang sedang diketik. */
  onReset?: () => void;
  /** Judul pesan error; bawaannya untuk tabel ledger Bank Statement. */
  title?: string;
};

type State = { error: Error | null };

/**
 * Menangkap error render di tabel ledger.
 *
 * Tanpa ini, satu error saat render - misalnya waktu membuka baris untuk
 * disunting atau disisipi - melepas seluruh halaman dan yang tersisa layar
 * putih tanpa keterangan apa pun. Di sini yang hilang cuma tabelnya, pesan
 * error-nya tampil, dan halaman lain tetap bisa dipakai.
 */
export class LedgerErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Tetap dicatat lengkap di console, supaya bisa dilacak sampai komponennya.
    console.error('[ledger] render failed:', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="m-6 rounded-2xl border border-rose-200 bg-rose-50/60 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-rose-700">{this.props.title ?? 'The ledger table could not be displayed.'}</p>
            <p className="mt-1 text-[13px] text-rose-700/80 break-words font-mono">{error.message}</p>
            <p className="mt-2 text-[11px] text-rose-700/60">
              Full details are in the browser console (F12). Send the message above if this happens again.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4 h-8 rounded-lg text-[11px] font-bold"
              onClick={this.reset}
            >
              Close and show the table again
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
