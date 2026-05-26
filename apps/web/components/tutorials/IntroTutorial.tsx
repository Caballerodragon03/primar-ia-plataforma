'use client';

/**
 * Phase 14M — Tutorial de introducción.
 *
 * Spotlight + tooltip que guía al usuario por los apartados principales
 * (sidebar, header, contenido) la PRIMERA vez que entra al dashboard.
 *
 * - Se dispara desde DashboardLayout cuando `tutorialesCompletados` no
 *   incluye 'introduccion'.
 * - Al terminar (o al hacer "Saltar"), marca el tutorial como completado
 *   vía POST /tutorials/introduccion/complete.
 * - Los selectores apuntan a atributos data-tutorial="..." colocados en
 *   los elementos clave (Sidebar, header, etc.).
 *
 * Mensajes en español. El último paso navega al usuario a /perfil para
 * que descubra el resto del catálogo.
 */
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { EventData, Step } from 'react-joyride';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n/LocaleProvider';

// react-joyride usa APIs del DOM en mount → cargar dinámicamente sin SSR.
const Joyride = dynamic(() => import('react-joyride').then((m) => m.Joyride), { ssr: false });

interface IntroTutorialProps {
  role: 'VENDEDOR' | 'COMPRADOR';
  onComplete: () => void;
}

export function IntroTutorial({ role, onComplete }: IntroTutorialProps) {
  const t = useT();
  const router = useRouter();
  const [run, setRun] = useState(true);

  const steps = useMemo<Step[]>(() => {
    const profileHref = role === 'VENDEDOR' ? '/seller/profile' : '/buyer/profile';
    return [
      {
        target: 'body',
        placement: 'center' as const,
        title: t('tutorials.intro.welcome.title'),
        content: t('tutorials.intro.welcome.content'),
        disableBeacon: true,
      },
      {
        target: '[data-tutorial="sidebar"]',
        placement: 'right' as const,
        title: t('tutorials.intro.sidebar.title'),
        content: role === 'VENDEDOR'
          ? t('tutorials.intro.sidebar.contentSeller')
          : t('tutorials.intro.sidebar.contentBuyer'),
      },
      {
        target: '[data-tutorial="header"]',
        placement: 'bottom' as const,
        title: t('tutorials.intro.header.title'),
        content: t('tutorials.intro.header.content'),
      },
      {
        target: 'body',
        placement: 'center' as const,
        title: t('tutorials.intro.panel.title'),
        content: role === 'VENDEDOR'
          ? t('tutorials.intro.panel.contentSeller')
          : t('tutorials.intro.panel.contentBuyer'),
        disableBeacon: true,
      },
      {
        target: 'body',
        placement: 'center' as const,
        title: t('tutorials.intro.reputation.title'),
        content: t('tutorials.intro.reputation.content'),
        disableBeacon: true,
      },
      {
        target: 'body',
        placement: 'center' as const,
        title: t('tutorials.intro.moreTutorials.title'),
        content: t('tutorials.intro.moreTutorials.content'),
        disableBeacon: true,
        data: { goToProfile: profileHref },
      },
    ];
  }, [role, t]);

  async function persistComplete() {
    try {
      await api.post('/tutorials/introduccion/complete');
    } catch {
      // silently fail — el siguiente render volvería a mostrarlo, que es
      // mejor que romper la UI.
    }
    onComplete();
  }

  async function handleCallback(data: EventData) {
    const { status, type } = data;
    const ended = type === 'tour:end' || status === 'finished' || status === 'skipped';
    if (!ended) return;
    setRun(false);
    // Phase 14M v3.5 — await la persistencia ANTES de navegar para que
    // la pantalla de Tutoriales del perfil refleje "Completado" al
    // recargar /auth/profile. Antes hacíamos fire-and-forget y la pantalla
    // se cargaba antes de que el POST llegara.
    await persistComplete();
    if (status !== 'skipped') {
      const profileHref = role === 'VENDEDOR' ? '/seller/profile' : '/buyer/profile';
      router.push(`${profileHref}?tab=tutoriales`);
    }
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      onEvent={(data) => { void handleCallback(data); }}
      locale={{
        back: t('tutorials.intro.locale.back'),
        close: t('tutorials.intro.locale.close'),
        last: t('tutorials.intro.locale.last'),
        next: t('tutorials.intro.locale.next'),
        open: t('tutorials.intro.locale.open'),
        skip: t('tutorials.intro.locale.skip'),
      }}
      options={{
        showProgress: true,
        buttons: ['skip', 'back', 'primary'],
        overlayClickAction: false,
        primaryColor: '#d4a017',
        textColor: '#0f172a',
        backgroundColor: '#ffffff',
        arrowColor: '#ffffff',
        overlayColor: 'rgba(15, 23, 42, 0.55)',
        zIndex: 10000,
      }}
    />
  );
}
