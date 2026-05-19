'use client';

/**
 * Phase 14M v3 — Orquestador del tour guiado en "modo prueba".
 *
 * Suscrito al useTutorialStore: cada paso del flow lleva una ruta
 * (push si hay que navegar), un target CSS (para el spotlight), un
 * texto, y opcionalmente un evento de autofill que el page receptor
 * escucha vía window.addEventListener.
 *
 * Pasos sin elemento UI (Stripe Checkout, QR físico) se renderizan
 * como modal explicativo en lugar de spotlight.
 */
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import type { Step } from 'react-joyride';
import { X } from 'lucide-react';
import { useTutorialStore } from '@/store/tutorial.store';
import { CREAR_LOTE_FLOW, HACER_PEDIDO_FLOW, type FlowStep } from './tutorialFlows';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

const Joyride = dynamic(() => import('react-joyride').then((m) => m.Joyride), { ssr: false });

export function TutorialRunner() {
  const { flow, step, next, end } = useTutorialStore();
  const router = useRouter();
  const pathname = usePathname();
  const [waitingForRoute, setWaitingForRoute] = useState(false);

  const flowSteps = useMemo<FlowStep[]>(() => {
    if (flow === 'crear-lote') return CREAR_LOTE_FLOW;
    if (flow === 'hacer-pedido') return HACER_PEDIDO_FLOW;
    return [];
  }, [flow]);

  const current: FlowStep | undefined = flowSteps[step];

  // Navega a la ruta del paso si no estamos ahí.
  useEffect(() => {
    if (!current) return;
    if (current.route && pathname !== current.route) {
      setWaitingForRoute(true);
      router.push(current.route);
    } else {
      setWaitingForRoute(false);
      // Dispatch autofill event si el paso lo pide.
      if (current.autofill) {
        // Pequeño delay para que el componente esté montado.
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('tutorial:autofill', {
              detail: { stepKey: current.key, data: current.autofill },
            }),
          );
        }, 300);
      }
    }
  }, [current, pathname, router]);

  // Persistir progreso al terminar.
  async function handleEnd() {
    if (flow) {
      try {
        await api.post(`/tutorials/${flow}/complete`);
      } catch { /* ignore */ }
    }
    end();
  }

  if (!flow || !current) return null;
  if (waitingForRoute) return null;

  // Paso tipo modal explicativo (sin elemento UI).
  if (current.kind === 'modal') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative z-10 bg-card rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-wider text-primary-dark font-semibold">
              Tutorial · paso {step + 1} de {flowSteps.length}
            </p>
            <button
              onClick={() => void handleEnd()}
              className="p-1 rounded hover:bg-muted text-muted-foreground"
              aria-label="Salir del tutorial"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">{current.title}</h2>
          <p className="text-sm text-text-secondary leading-relaxed">{current.content}</p>
          {current.note && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-card px-3 py-2 mt-3">
              {current.note}
            </p>
          )}
          <div className="flex justify-between mt-5">
            <Button type="button" variant="ghost" size="sm" onClick={() => void handleEnd()}>
              Salir
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                if (step + 1 >= flowSteps.length) void handleEnd();
                else next();
              }}
            >
              {step + 1 >= flowSteps.length ? 'Terminar' : 'Continuar'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Paso spotlight sobre la UI real.
  const joyrideStep: Step = {
    target: current.target ?? 'body',
    title: current.title,
    content: current.content,
    placement: current.placement ?? 'auto',
  };

  return (
    <Joyride
      steps={[joyrideStep]}
      run
      // run-once: cada paso se desmonta y se vuelve a montar.
      onEvent={(data) => {
        if (data.type === 'tour:end' || data.status === 'finished' || data.status === 'skipped') {
          if (step + 1 >= flowSteps.length) void handleEnd();
          else next();
        }
      }}
      locale={{
        back: 'Atrás',
        close: 'Salir',
        last: step + 1 >= flowSteps.length ? 'Terminar' : 'Continuar',
        next: 'Continuar',
        open: 'Abrir',
        skip: 'Salir del tutorial',
      }}
      continuous
      options={{
        buttons: ['skip', 'primary'],
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
