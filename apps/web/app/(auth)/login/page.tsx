'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { Logo } from '@/components/brand/Logo';
import { LogoIcon } from '@/components/brand/LogoIcon';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { useT } from '@/lib/i18n/LocaleProvider';

// Phase 14M v3.38 — schema construido dentro del componente para que los
// mensajes de error sigan el idioma actual del usuario.

function dashboardPath(role: 'VENDEDOR' | 'COMPRADOR' | 'ADMIN') {
  if (role === 'COMPRADOR') return '/buyer';
  if (role === 'ADMIN') return '/admin/dashboard';
  return '/seller';
}

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);
  const bootstrapped = useAuthStore((s) => s._bootstrapped);
  const [serverError, setServerError] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    if (!bootstrapped || !user) return;
    const target = dashboardPath(user.role);
    router.replace(target);
    window.location.replace(target);
  }, [bootstrapped, router, user]);

  if (bootstrapped && user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <Logo variant="small" width={100} className="animate-pulse" />
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const loginSchema = z.object({
    email: z.string().email(t('auth.login.emailInvalid')),
    password: z.string().min(1, t('auth.login.passwordRequired')),
  });

  type LoginForm = z.infer<typeof loginSchema>;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {},
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      const res = await api.post('/auth/login', data);
      const { accessToken, refreshToken, user } = res.data.data as {
        accessToken: string;
        refreshToken?: string;
        user: { id: string; email: string; role: 'VENDEDOR' | 'COMPRADOR' | 'ADMIN'; estado: string; nombre: string; apellidos: string };
      };
      setAuth(user, accessToken, refreshToken);
      if (user.role === 'COMPRADOR') router.push('/buyer');
      else if (user.role === 'ADMIN') router.push('/admin/dashboard');
      else router.push('/seller');
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { error?: string; errorCode?: string } } })?.response?.data;
      // Si el backend envía un errorCode estable lo mapeamos a i18n para
      // respetar el idioma del usuario (ES/EN). Si no, fallback al mensaje
      // crudo del backend (puede estar en español por compat).
      const codeMap: Record<string, string> = {
        EMAIL_NOT_VERIFIED: t('auth.login.errEmailNotVerified'),
        ACCOUNT_REJECTED: t('auth.login.errAccountRejected'),
        ACCOUNT_SUSPENDED: t('auth.login.errAccountSuspended'),
        INVALID_CREDENTIALS: t('auth.login.errInvalidCredentials'),
      };
      const localized = resp?.errorCode ? codeMap[resp.errorCode] : undefined;
      setServerError(localized ?? resp?.error ?? t('auth.login.serverErrorFallback'));
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 items-center justify-center p-12">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />
        <div className="relative z-10 max-w-md text-center space-y-8 animate-fade-in">
          <div className="flex justify-center animate-float">
            <LogoIcon size={80} color="#D4A817" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground leading-tight whitespace-pre-line">
              {t('auth.login.heroTitle')}
            </h2>
            <p className="text-muted-foreground mt-4 text-base leading-relaxed">
              {t('auth.login.heroDesc')}
            </p>
          </div>
          <div className="flex items-center justify-center gap-8 pt-4 animate-stagger">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">101+</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('auth.login.statPreregistros')}</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">B2B</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('auth.login.statMarketplace')}</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">0%</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('auth.login.statSellerFee')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-background">
        <div className="w-full max-w-[420px] animate-fade-in">
          {/* Logo (mobile + desktop) */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <Logo variant="small" width={160} />
            </div>
            <p className="text-muted-foreground text-sm">{t('auth.login.tagline')}</p>
          </div>

          {/* Card */}
          <div className="bg-card rounded-2xl shadow-soft-md border border-border/50 p-8">
            <h2 className="text-xl font-semibold text-foreground mb-1">{t('auth.login.welcome')}</h2>
            <p className="text-sm text-muted-foreground mb-6">{t('auth.login.subtitleCard')}</p>

            {serverError && (
              <div role="alert" className="mb-5 flex items-start gap-2.5 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
              <Input
                label={t('auth.login.email')}
                type="email"
                placeholder={t('auth.login.emailPlaceholder')}
                autoComplete="email"
                required
                error={errors.email?.message}
                {...register('email')}
              />

              <div>
                <Input
                  label={t('auth.login.password')}
                  showPasswordToggle
                  autoComplete="current-password"
                  required
                  error={errors.password?.message}
                  {...register('password')}
                />
                <div className="text-right mt-1.5">
                  <Link href="/forgot-password" className="text-sm text-primary-dark hover:text-primary/80 transition-colors font-medium">
                    {t('auth.login.forgot')}
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                className="w-full mt-2 shadow-soft hover:shadow-soft-md"
              >
                {isSubmitting ? t('auth.login.submitting') : t('auth.login.submit')}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-3 text-muted-foreground">{t('auth.login.or')}</span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {t('auth.login.noAccount')}{' '}
              <Link href="/register" className="font-semibold text-foreground hover:text-primary transition-colors">
                {t('auth.login.registerNow')}
              </Link>
            </p>
          </div>

          <InstallAppButton />

          <p className="text-center text-xs text-muted-foreground mt-6">
            {t('auth.login.endorsedBy')}
          </p>
        </div>
      </div>
    </div>
  );
}
