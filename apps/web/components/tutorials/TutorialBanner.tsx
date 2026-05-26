'use client';

/**
 * Phase 14M v3 — Banner persistente cuando el modo prueba está activo.
 *
 * Visible en TODA la app durante el tour: cinta amarilla en la parte
 * superior que recuerda al usuario que nada se está guardando. Botón
 * "Salir del tutorial" para abortar en cualquier momento.
 */
import { AlertTriangle } from 'lucide-react';
import { useTutorialStore } from '@/store/tutorial.store';
import { useT } from '@/lib/i18n/LocaleProvider';

export function TutorialBanner() {
  const t = useT();
  const { flow, end } = useTutorialStore();
  if (!flow) return null;

  const flowName = flow === 'crear-lote'
    ? t('tutorials.flow.crearLote')
    : t('tutorials.flow.hacerPedido');

  return (
    <div className="sticky top-0 z-[9000] bg-amber-100 border-b border-amber-300 px-4 py-1.5 flex items-center justify-between gap-3 text-amber-900 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">
          <strong>{t('tutorials.banner.testMode')}</strong> · {t('tutorials.banner.followingTour')} «{flowName}». {t('tutorials.banner.nothingSaved')}
        </span>
      </div>
      <button
        type="button"
        onClick={end}
        className="text-[11px] underline font-medium hover:text-amber-700 flex-shrink-0"
      >
        {t('tutorials.banner.exit')}
      </button>
    </div>
  );
}
