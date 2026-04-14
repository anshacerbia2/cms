import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
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
import { ShieldCheck, Command } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const { user, access_token } = response.data;
      setAuth(user, access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-extrabold tracking-tighter uppercase font-headline text-primary">
            CMS <span className="opacity-40 font-bold">Rekayasa</span>
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1">
            Enterprise Management System
          </p>
        </div>

        <Card className="border-border/40 shadow-premium bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="space-y-1 pt-8 px-8">
            <CardTitle className="text-xl font-extrabold tracking-tight font-headline">Welcome back</CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-medium">
              Authorized access only. Please sign in to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
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
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Security Key</FormLabel>
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
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
            <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.4em]">
              © 2026 ATI • SQ BCA ELITE MANAGEMENT VERSION 1.2.4
            </p>
        </div>
      </div>
    </div>
  );
}
