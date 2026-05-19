'use client';

/**
 * Phase 14M v3.7 — Error boundary específico para que un crash de página
 * durante el modo prueba no rompa la app entera. Si una pantalla revienta,
 * cerramos el tutorial automáticamente y mostramos un mensaje breve.
 */
import { Component, type ReactNode } from 'react';
import { useTutorialStore } from '@/store/tutorial.store';

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class TutorialErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error): void {
    // eslint-disable-next-line no-console
    console.error('[TutorialErrorBoundary] Caught error during tutorial mode:', error);
    // Cerramos el tutorial para que las próximas peticiones vayan al
    // backend real en vez de seguir interceptadas. El usuario puede
    // recargar la página y todo vuelve a la normalidad.
    if (useTutorialStore.getState().flow) {
      useTutorialStore.getState().end();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card rounded-2xl shadow-2xl p-6 max-w-md text-center">
            <h2 className="text-lg font-bold text-foreground mb-2">El tutorial encontró un error</h2>
            <p className="text-sm text-text-secondary mb-4">
              Hemos cerrado el modo prueba para que la app vuelva a funcionar con normalidad.
              Recarga la página para continuar.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
