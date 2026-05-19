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

// react-joyride usa APIs del DOM en mount → cargar dinámicamente sin SSR.
const Joyride = dynamic(() => import('react-joyride').then((m) => m.Joyride), { ssr: false });

interface IntroTutorialProps {
  role: 'VENDEDOR' | 'COMPRADOR';
  onComplete: () => void;
}

export function IntroTutorial({ role, onComplete }: IntroTutorialProps) {
  const router = useRouter();
  const [run, setRun] = useState(true);

  const steps = useMemo<Step[]>(() => {
    const profileHref = role === 'VENDEDOR' ? '/seller/profile' : '/buyer/profile';
    const reputacionMsg =
      'Tu puntuación se calcula con cada operación: cuantas más transacciones cierres con éxito, ' +
      'mejor reputación tendrás en la plataforma — y mejores condiciones desbloquearás.';
    return [
      {
        target: 'body',
        placement: 'center' as const,
        title: '¡Bienvenido a Primar-IA!',
        content:
          'En este recorrido te enseñamos los apartados principales en menos de 1 minuto. ' +
          'Puedes saltarlo cuando quieras y verlo de nuevo desde tu perfil.',
        disableBeacon: true,
      },
      {
        target: '[data-tutorial="sidebar"]',
        placement: 'right' as const,
        title: 'Menú principal',
        content:
          role === 'VENDEDOR'
            ? 'Desde aquí accedes a tus Lotes, Matches con compradores, Contratos, Mensajes y más.'
            : 'Desde aquí accedes a tus Pedidos, Mensajes, Contratos, Estadísticas y más.',
      },
      {
        target: '[data-tutorial="header"]',
        placement: 'bottom' as const,
        title: 'Notificaciones y cuenta',
        content:
          'Arriba a la derecha verás tus notificaciones, el acceso al perfil y la opción de cerrar sesión.',
      },
      {
        // Phase 14M v2 — paso 4 con placement center sobre body para
        // evitar que el tooltip se salga de pantalla cuando el contenido
        // principal ocupa todo el viewport.
        target: 'body',
        placement: 'center' as const,
        title: 'Tu panel',
        content:
          role === 'VENDEDOR'
            ? 'En el panel verás tus lotes activos, matches pendientes y operaciones en curso. ' +
              'Crea un lote y la plataforma lo emparejará automáticamente con compradores compatibles.'
            : 'En el panel verás tus pedidos activos y las ofertas de los vendedores. ' +
              'Crea un pedido y la plataforma te traerá lotes que encajen con tus calibres y precio.',
        disableBeacon: true,
      },
      {
        target: 'body',
        placement: 'center' as const,
        title: 'Tu reputación se construye operando',
        content: reputacionMsg,
        disableBeacon: true,
      },
      {
        target: 'body',
        placement: 'center' as const,
        title: 'Más tutoriales en tu perfil',
        content:
          'En Perfil → Tutoriales tienes guías para los flujos principales (crear lote, hacer pedido, ' +
          'abrir una incidencia…). Te llevamos ahora para que les eches un vistazo.',
        disableBeacon: true,
        data: { goToProfile: profileHref },
      },
    ];
  }, [role]);

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
        back: 'Atrás',
        close: 'Cerrar',
        last: 'Ir a mi perfil',
        next: 'Siguiente',
        open: 'Abrir',
        skip: 'Saltar tutorial',
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
