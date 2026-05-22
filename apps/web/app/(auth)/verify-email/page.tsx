'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, MailCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';

/**
 * Phase 14M v3.32 — Página que cierra el flujo de verificación de email.
 *
 * El backend envía emails con un enlace `${CORS_ORIGIN}/verify-email?token=…`
 * pero esta página NO existía → cualquiera que pinchaba veía un 404 ("this
 * page doesn't exist"). Ahora lee el token de la query, lo manda al endpoint
 * GET /auth/verify-email/:token y muestra el resultado.
 */
type Status = 'loading' | 'success' | 'pending-admin' | 'error';

// Phase 14M v3.34 — Next.js 14 exige que useSearchParams se ejecute dentro
// de un <Suspense> boundary o falla el build con
// "useSearchParams() should be wrapped in a suspense boundary". El default
// export hace de wrapper y el VerifyEmailContent es el componente real.
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
          <h1 className="text-xl font-bold text-foreground">Verificando tu cuenta…</h1>
        </div>
      </div>
    </div>
  );
}

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [role, setRole] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Falta el token de verificación en la URL.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/auth/verify-email/${encodeURIComponent(token)}`);
        if (cancelled) return;
        const r = (data?.data?.role ?? data?.role ?? null) as string | null;
        setRole(r);
        // Phase 14M v3.35 — ambos roles ahora pasan por aprobación admin
        // (antes los compradores eran auto-VERIFICADO_ACTIVO). Tras
        // confirmar el email pueden hacer login pero el banner del
        // dashboard les indicará que están en espera.
        setStatus('pending-admin');
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          ?? 'No se pudo verificar el email. El enlace puede haber caducado o ya haber sido usado.';
        setErrorMsg(msg);
        setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

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
              <h1 className="text-xl font-bold text-foreground">Verificando tu cuenta…</h1>
              <p className="text-sm text-text-secondary">Un segundo, comprobando el enlace.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <h1 className="text-xl font-bold text-foreground">¡Email verificado!</h1>
              <p className="text-sm text-text-secondary">
                Tu cuenta está activa. Ya puedes iniciar sesión y empezar a usar Primar-IA.
              </p>
              <Link href="/login">
                <Button variant="primary" className="w-full mt-2">Iniciar sesión</Button>
              </Link>
            </>
          )}

          {status === 'pending-admin' && (
            <>
              <MailCheck className="w-12 h-12 text-yellow-500 mx-auto" />
              <h1 className="text-xl font-bold text-foreground">Email confirmado</h1>
              <p className="text-sm text-text-secondary">
                Hemos confirmado tu email. Tu cuenta está pendiente de aprobación manual por un
                administrador — suele tardar menos de 24 h hábiles. Te avisaremos por email
                cuando esté activa. Mientras tanto puedes hacer login y navegar la plataforma.
              </p>
              <Link href="/login">
                <Button variant="primary" className="w-full mt-2">Iniciar sesión</Button>
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-500 mx-auto" />
              <h1 className="text-xl font-bold text-foreground">No se pudo verificar</h1>
              <p className="text-sm text-text-secondary">{errorMsg}</p>
              <div className="flex flex-col gap-2 mt-2">
                <Link href="/login">
                  <Button variant="outline" className="w-full">Volver al login</Button>
                </Link>
                <Link href="/register">
                  <Button variant="ghost" className="w-full">Crear cuenta nueva</Button>
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-text-muted text-center mt-4">
          ¿Problemas? Contacta con soporte: soporte@primar-ia.com
        </p>
      </div>
    </div>
  );
}
