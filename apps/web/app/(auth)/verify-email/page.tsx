'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, MailCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { useT } from '@/lib/i18n/LocaleProvider';

/**
 * Phase 14M v3.32 — Página que cierra el flujo de verificación de email.
 *
 * El backend envía emails con un enlace `${CORS_ORIGIN}/verify-email?token=…`
 * pero esta página NO existía → cualquiera que pinchaba veía un 404 ("this
 * page doesn't exist"). Ahora lee el token de la query, lo manda al endpoint
 * GET /auth/verify-email/:token y muestra el resultado.
 *
 * Phase 15 — internacionalizada: respeta el idioma del usuario (ES/EN) via
 * useT() en lugar de tener todas las copias en hardcoded ES.
 */
type Status = 'loading' | 'success' | 'pending-admin' | 'error';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <div className="bg-card border border-border rounded-card p-8 shadow-soft text-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Verifying…</h1>
        </div>
      </div>
    </div>
  );
}

function VerifyEmailContent() {
  const t = useT();
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg(t('auth.verify.tokenMissing'));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await api.get(`/auth/verify-email/${encodeURIComponent(token)}`);
        if (cancelled) return;
        // Phase 14M v3.35 — ambos roles ahora pasan por aprobación admin
        // (antes los compradores eran auto-VERIFICADO_ACTIVO). Tras
        // confirmar el email pueden hacer login pero el banner del
        // dashboard les indicará que están en espera.
        setStatus('pending-admin');
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          ?? t('auth.verify.body.errorDefault');
        setErrorMsg(msg);
        setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [token, t]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>

        <div className="bg-card border border-border rounded-card p-8 shadow-soft text-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
              <h1 className="text-xl font-bold text-foreground">{t('auth.verify.title.loading')}</h1>
              <p className="text-sm text-text-secondary">{t('auth.verify.subtitle.loading')}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <h1 className="text-xl font-bold text-foreground">{t('auth.verify.title.success')}</h1>
              <p className="text-sm text-text-secondary">
                {t('auth.verify.body.success')}
              </p>
              <Link href="/login">
                <Button variant="primary" className="w-full mt-2">{t('auth.verify.btn.signIn')}</Button>
              </Link>
            </>
          )}

          {status === 'pending-admin' && (
            <>
              <MailCheck className="w-12 h-12 text-yellow-500 mx-auto" />
              <h1 className="text-xl font-bold text-foreground">{t('auth.verify.title.pending')}</h1>
              <p className="text-sm text-text-secondary">
                {t('auth.verify.body.pending')}
              </p>
              <Link href="/login">
                <Button variant="primary" className="w-full mt-2">{t('auth.verify.btn.signIn')}</Button>
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-500 mx-auto" />
              <h1 className="text-xl font-bold text-foreground">{t('auth.verify.title.error')}</h1>
              <p className="text-sm text-text-secondary">{errorMsg}</p>
              <div className="flex flex-col gap-2 mt-2">
                <Link href="/login">
                  <Button variant="outline" className="w-full">{t('auth.verify.btn.backLogin')}</Button>
                </Link>
                <Link href="/register">
                  <Button variant="ghost" className="w-full">{t('auth.verify.btn.newAccount')}</Button>
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-text-muted text-center mt-4">
          {t('auth.verify.support')}
        </p>
      </div>
    </div>
  );
}
