import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuthStore } from '@/store/authStore';
import api from '@/api/axios';
import { ShieldCheck, Command, Smartphone, ArrowLeft } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Langkah kedua login (Google Authenticator). Password yang benar belum
 * memberi sesi: server menjawab `verify` (akun sudah mendaftar) atau `setup`
 * (belum; ikut QR code), plus challenge yang berlaku 5 menit.
 */
type TwoFactorStep =
  | { kind: 'verify'; challenge: string }
  | { kind: 'setup'; challenge: string; secret: string; qrCode: string };

/** Kunci manual dikelompokkan per 4 huruf supaya mudah diketik ulang. */
const groupKey = (key: string) => key.match(/.{1,4}/g)?.join(' ') ?? key;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<TwoFactorStep | null>(null);
  const [code, setCode] = useState('');
  // Dikirim ke sini oleh expireSession() saat server menolak token yang kedaluwarsa.
  const [searchParams] = useSearchParams();
  const expired = searchParams.get('expired') === '1';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setLoading(true);
    setError(null);
    try {
      const response: any = await api.post('/auth/login', data);
      if (response.data.twoFactor) {
        setStep({ kind: response.data.twoFactor, ...response.data });
        setCode('');
        return;
      }
      // Sesinya sudah dipasang server sebagai cookie; yang diterima di sini hanya profil.
      setAuth(response.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      // `err` di sini sudah body respons (lihat api/axios.ts), bukan error axios.
      setError(
        err?.statusCode === 401
          ? 'Invalid email or password.'
          : err?.message || 'Login failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!step) return;
    setLoading(true);
    setError(null);
    try {
      const response: any = await api.post(`/auth/login/${step.kind}`, { challenge: step.challenge, code });
      setAuth(response.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      const message: string = err?.message || 'Verification failed. Please try again.';
      // Challenge habis (5 menit) atau akunnya berubah: ulang dari password.
      if (/expired/i.test(message)) backToPassword();
      setError(message);
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  function backToPassword() {
    setStep(null);
    setCode('');
    setError(null);
    form.setValue('password', '');
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface selection:bg-primary/10 selection:text-primary relative overflow-hidden">
      {/* Immersive Background Elements - Matching sq-revamp */}
      <div className="fixed -z-10 top-0 right-0 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[100px] pointer-events-none translate-x-1/4 -translate-y-1/4" />
      <div className="fixed -z-10 bottom-0 left-0 w-[600px] h-[600px] bg-sidebar-primary/[0.05] rounded-full blur-[100px] pointer-events-none -translate-x-1/4 translate-y-1/4" />

      <div className="w-full max-w-[420px] p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center rotate-3 shadow-premium mb-4">
            <Command className="text-white h-7 w-7 -rotate-3" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tighter uppercase font-headline text-primary text-center">
            PANCONVINCE {" "} 
            <span className="opacity-40 font-bold">ENTERPRISE OPERATIONS SYSTEM</span>
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1 text-center">
            Internal platform for project, procurement, and finance workflows.
          </p>
        </div>

        <Card className="border-border/40 shadow-premium bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="space-y-1 pt-8 px-8 pb-0">
            <CardTitle className="text-xl font-extrabold tracking-tight font-headline">
              {step?.kind === 'setup' ? 'Set up two-factor sign-in' : step ? 'Two-factor sign-in' : 'Welcome back'}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-medium">
              {step?.kind === 'setup'
                ? 'Your account now needs a code from Google Authenticator each time you sign in.'
                : step
                  ? 'Enter the 6-digit code shown in Google Authenticator.'
                  : 'Authorized access only. Please sign in to continue.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            {step ? (
              <form onSubmit={onSubmitCode} className="space-y-6">
                {step.kind === 'setup' && (
                  <ol className="space-y-4 text-[12px] font-medium text-primary/80">
                    <li>
                      <span className="font-extrabold text-primary">1.</span> Install{' '}
                      <span className="font-bold">Google Authenticator</span> on your phone (App Store or Google Play).
                    </li>
                    <li className="space-y-3">
                      <div>
                        <span className="font-extrabold text-primary">2.</span> In the app, tap <span className="font-bold">+</span> and
                        scan this QR code:
                      </div>
                      <img
                        src={step.qrCode}
                        alt="QR code for Google Authenticator"
                        className="mx-auto h-44 w-44 rounded-xl border border-border/60 bg-white p-2"
                      />
                      <div className="text-[11px] text-muted-foreground">
                        Can't scan? Choose "Enter a setup key" and type:
                        <div className="mt-1 select-all break-all rounded-lg bg-surface-sunken px-3 py-2 font-mono text-[12px] font-bold tracking-wider text-primary">
                          {groupKey(step.secret)}
                        </div>
                      </div>
                    </li>
                    <li>
                      <span className="font-extrabold text-primary">3.</span> Enter the 6-digit code the app shows:
                    </li>
                  </ol>
                )}

                <div className="space-y-2">
                  {step.kind === 'verify' && (
                    <div className="flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      <Smartphone className="h-3.5 w-3.5" /> Authenticator code
                    </div>
                  )}
                  <Input
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123 456"
                    maxLength={7}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))}
                    className="h-12 bg-surface-sunken border-transparent focus:bg-white focus:border-primary/20 transition-all rounded-xl shadow-inner text-center font-mono text-lg font-bold tracking-[0.4em]"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-[11px] font-bold text-destructive animate-in fade-in zoom-in-95">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-extrabold tracking-tight rounded-xl shadow-premium transition-all active:scale-[0.98]"
                  disabled={loading || code.replace(/\s/g, '').length !== 6}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      VERIFYING...
                    </div>
                  ) : step.kind === 'setup' ? (
                    'ACTIVATE AND SIGN IN'
                  ) : (
                    'VERIFY AND SIGN IN'
                  )}
                </Button>

                <button
                  type="button"
                  onClick={backToPassword}
                  className="mx-auto flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </button>
                {step.kind === 'verify' && (
                  <p className="text-center text-[10px] font-medium text-muted-foreground">
                    Lost your phone? Ask an administrator to reset your two-factor sign-in.
                  </p>
                )}
              </form>
            ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="name@example.com" 
                          {...field} 
                          className="h-11 bg-surface-sunken border-transparent focus:bg-white focus:border-primary/20 transition-all rounded-xl shadow-inner font-medium text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          {...field} 
                          className="h-11 bg-surface-sunken border-transparent focus:bg-white focus:border-primary/20 transition-all rounded-xl shadow-inner font-medium text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
                
                {expired && !error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-700 animate-in fade-in zoom-in-95">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    Your session has expired. Please sign in again.
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-[11px] font-bold text-destructive animate-in fade-in zoom-in-95">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-extrabold tracking-tight rounded-xl shadow-premium transition-all active:scale-[0.98]" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      AUTHENTICATING...
                    </div>
                  ) : (
                    'SIGN IN TO SYSTEM'
                  )}
                </Button>
              </form>
            </Form>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

