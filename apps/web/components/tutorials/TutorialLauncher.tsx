'use client';

/**
 * Phase 14M — Launcher del tutorial de introducción.
 *
 * Mira /auth/profile.tutorialesCompletados al montar el layout del
 * dashboard. Si NO incluye 'introduccion', renderiza <IntroTutorial>.
 *
 * El propio <IntroTutorial> persiste el estado tras terminar para que
 * no vuelva a salir.
 */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { IntroTutorial } from './IntroTutorial';

export function TutorialLauncher() {
  const [shouldRun, setShouldRun] = useState(false);
  const [role, setRole] = useState<'VENDEDOR' | 'COMPRADOR' | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/auth/profile')
      .then(({ data }) => {
        if (cancelled) return;
        const profile = (data?.data ?? data) as {
          role?: 'VENDEDOR' | 'COMPRADOR' | 'ADMIN';
          tutorialesCompletados?: string[] | null;
        };
        if (profile.role === 'ADMIN') return; // admin no necesita tutorial
        const done = Array.isArray(profile.tutorialesCompletados) ? profile.tutorialesCompletados : [];
        if (!done.includes('introduccion')) {
          setRole((profile.role ?? 'COMPRADOR') as 'VENDEDOR' | 'COMPRADOR');
          setShouldRun(true);
        }
      })
      .catch(() => { /* silencio: si falla el fetch, mejor no molestar */ });
    return () => { cancelled = true; };
  }, []);

  if (!shouldRun || !role) return null;
  return <IntroTutorial role={role} onComplete={() => setShouldRun(false)} />;
}
