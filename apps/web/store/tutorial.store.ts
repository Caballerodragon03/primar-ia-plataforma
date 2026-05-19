/**
 * Phase 14M v3 — Estado global del "modo prueba" para tutoriales guiados.
 *
 * Cuando tutorialMode != null, el axios interceptor intercepta cualquier
 * mutación (POST/PATCH/DELETE) sobre los endpoints críticos del flujo
 * (lots, matching, contracts, negotiations, valoraciones) y devuelve
 * respuestas mockeadas sin tocar el backend.
 *
 * Cuando el tour termina (o se cancela), se desactiva. NINGÚN dato
 * tutorial se persiste.
 */
import { create } from 'zustand';

export type TutorialFlowId = 'crear-lote' | 'hacer-pedido';

interface TutorialState {
  // Flow activo (null = modo normal).
  flow: TutorialFlowId | null;
  // Índice del paso actual dentro del flow.
  step: number;
  // Datos simulados que se devuelven cuando el interceptor los pide.
  // Se rellenan paso a paso a medida que el usuario "crea" cosas.
  mock: {
    lote?: Record<string, unknown>;
    match?: Record<string, unknown>;
    contract?: Record<string, unknown>;
    transaccion?: Record<string, unknown>;
  };
  // Acciones
  start: (flow: TutorialFlowId) => void;
  next: () => void;
  goto: (step: number) => void;
  end: () => void;
  setMock: (patch: Partial<TutorialState['mock']>) => void;
}

export const useTutorialStore = create<TutorialState>((set) => ({
  flow: null,
  step: 0,
  mock: {},
  start: (flow) => set({ flow, step: 0, mock: {} }),
  next: () => set((s) => ({ step: s.step + 1 })),
  goto: (step) => set({ step }),
  end: () => set({ flow: null, step: 0, mock: {} }),
  setMock: (patch) => set((s) => ({ mock: { ...s.mock, ...patch } })),
}));

// IDs ficticios usados por todos los flows para que las pantallas reales
// los puedan correlacionar.
export const TUTORIAL_IDS = {
  LOTE: 'tutorial-lote-NB24C',
  MATCH: 'tutorial-match-MX42',
  PEDIDO: 'tutorial-pedido-PD7K9',
  TRANSACCION: 'tutorial-tx-TX99',
  PRODUCTO: 'tutorial-prod-AGCT',
  VARIEDAD: 'tutorial-var-HASS',
} as const;
