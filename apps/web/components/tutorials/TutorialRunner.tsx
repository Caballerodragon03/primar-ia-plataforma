'use client';

/**
 * Phase 14M v3.3 — Orquestador del tour guiado en "modo prueba".
 *
 * Cambio clave vs v3.x previa: ahora hay UN ÚNICO Joyride que recibe
 * TODOS los pasos del flow y avanza controlado vía `stepIndex`. Antes
 * montábamos/desmontábamos un Joyride por paso y eso rompía el avance
 * (la burbuja siguiente no salía sola).
 *
 * Los pasos de tipo 'modal' (Stripe/QR/explicativos sin elemento UI)
 * se renderizan como step de joyride con target='body' + placement='center'
 * para que se vean centrados a pantalla completa.
 */
import { useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import type { Step, EventData } from 'react-joyride';
import { useTutorialStore } from '@/store/tutorial.store';
import { CREAR_LOTE_FLOW, HACER_PEDIDO_FLOW, type FlowStep } from './tutorialFlows';
import { api } from '@/lib/api';

const Joyride = dynamic(() => import('react-joyride').then((m) => m.Joyride), { ssr: false });

export function TutorialRunner() {
  const { flow, step, next, goto, end } = useTutorialStore();
  const router = useRouter();
  const pathname = usePathname();

  const flowSteps = useMemo<FlowStep[]>(() => {
    if (flow === 'crear-lote') return CREAR_LOTE_FLOW;
    if (flow === 'hacer-pedido') return HACER_PEDIDO_FLOW;
    return [];
  }, [flow]);

  const current = flowSteps[step];

  // Si el paso actual exige otra ruta, navega ahí. Esto pasa entre
  // /seller → /seller/lots → /seller/lots/new etc.
  useEffect(() => {
    if (!current) return;
    if (current.route && pathname !== current.route) {
      router.push(current.route);
    }
  }, [current, pathname, router]);

  // Cuando estamos en la ruta correcta, dispara autofill si el paso lo
  // pide. Pequeño delay para dar tiempo a montar la pantalla.
  useEffect(() => {
    if (!current) return;
    if (current.route && pathname !== current.route) return;
    if (!current.autofill) return;
    const t = setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('tutorial:autofill', {
          detail: { stepKey: current.key, data: current.autofill },
        }),
      );
    }, 350);
    return () => clearTimeout(t);
  }, [current, pathname]);

  // Persistir progreso al terminar.
  async function handleEnd() {
    if (flow) {
      try {
        await api.post(`/tutorials/${flow}/complete`);
      } catch { /* ignore */ }
    }
    end();
  }

  // Convertimos cada FlowStep a Step de joyride. Los pasos 'modal' usan
  // body + center; los 'spotlight' usan el target real.
  const joyrideSteps: Step[] = useMemo(() => {
    return flowSteps.map((s) => {
      const baseContent = s.note ? `${s.content}\n\n⚠️ ${s.note}` : s.content;
      return {
        target: s.kind === 'modal' ? 'body' : (s.target ?? 'body'),
        title: s.title,
        content: baseContent,
        placement: s.kind === 'modal' ? 'center' : (s.placement ?? 'auto'),
      };
    });
  }, [flowSteps]);

  if (!flow || flowSteps.length === 0) return null;

  function handleCallback(data: EventData) {
    const { type, action, index, status } = data;
    // Fin del tour (último paso o usuario salta).
    if (status === 'finished' || status === 'skipped') {
      void handleEnd();
      return;
    }
    if (type === 'tour:end') {
      void handleEnd();
      return;
    }
    // El usuario pulsa Next o Back en una burbuja. Sincronizamos el
    // store con el índice que reclama joyride.
    if (type === 'step:after') {
      if (action === 'next') {
        const target = index + 1;
        if (target >= flowSteps.length) void handleEnd();
        else next();
        return;
      }
      if (action === 'prev') {
        goto(Math.max(0, index - 1));
        return;
      }
      if (action === 'close' || action === 'skip') {
        void handleEnd();
        return;
      }
    }
    // target_not_found: avanza igualmente para no atascar el tour.
    if (type === 'error:target_not_found') {
      const target = index + 1;
      if (target >= flowSteps.length) void handleEnd();
      else next();
    }
  }

  return (
    <Joyride
      steps={joyrideSteps}
      stepIndex={step}
      run
      continuous
      onEvent={handleCallback}
      locale={{
        back: 'Atrás',
        close: 'Salir',
        last: 'Terminar',
        next: 'Continuar',
        open: 'Abrir',
        skip: 'Salir del tutorial',
      }}
      options={{
        buttons: ['skip', 'back', 'primary'],
        overlayClickAction: false,
        scrollOffset: 80,
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
