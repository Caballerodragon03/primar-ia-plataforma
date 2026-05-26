'use client';

/**
 * Phase 14M — Sección de tutoriales dentro del Perfil.
 *
 * Lista las guías disponibles con su estado (completado/pendiente/próximamente)
 * y permite reiniciar la "Introducción" para volver a verla.
 *
 * Por ahora solo "Introducción" es interactiva; el resto aparecen como
 * "Próximamente" para no prometer lo que aún no existe.
 */
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, PlayCircle, RotateCcw, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useTutorialStore } from '@/store/tutorial.store';
import { useT } from '@/lib/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

interface TutorialItem {
  id: 'introduccion' | 'crear-lote' | 'hacer-pedido' | 'incidencia';
  titleKey: MessageKey;
  descKey: MessageKey;
  estimatedMinutes: number;
  available: boolean; // false → próximamente
  roleFilter?: 'VENDEDOR' | 'COMPRADOR'; // si está, solo se muestra a ese rol
}

const CATALOG: TutorialItem[] = [
  {
    id: 'introduccion',
    titleKey: 'tutorials.catalog.intro.title',
    descKey: 'tutorials.catalog.intro.desc',
    estimatedMinutes: 1,
    available: true,
  },
  {
    id: 'crear-lote',
    titleKey: 'tutorials.catalog.crearLote.title',
    descKey: 'tutorials.catalog.crearLote.desc',
    estimatedMinutes: 3,
    available: true,
    roleFilter: 'VENDEDOR',
  },
  {
    id: 'hacer-pedido',
    titleKey: 'tutorials.catalog.hacerPedido.title',
    descKey: 'tutorials.catalog.hacerPedido.desc',
    estimatedMinutes: 3,
    available: true,
    roleFilter: 'COMPRADOR',
  },
  {
    id: 'incidencia',
    titleKey: 'tutorials.catalog.incidencia.title',
    descKey: 'tutorials.catalog.incidencia.desc',
    estimatedMinutes: 2,
    available: false,
  },
];

interface TutorialsSectionProps {
  role: 'VENDEDOR' | 'COMPRADOR';
}

export function TutorialsSection({ role }: TutorialsSectionProps) {
  const t = useT();
  const [completed, setCompleted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const startTutorialFlow = useTutorialStore((s) => s.start);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/auth/profile');
      const list = (res.data?.data ?? res.data)?.tutorialesCompletados;
      setCompleted(Array.isArray(list) ? (list as string[]) : []);
    } catch {
      setCompleted([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // Phase 14M v2 — la introducción es spotlight global y necesita el
  // layout del dashboard. Los demás tutoriales son slideshow inline
  // que abrimos en la propia pantalla del perfil.
  async function handleStart(id: string) {
    if (id === 'introduccion') {
      setResettingId(id);
      try {
        await api.post(`/tutorials/${id}/reset`);
        const dashboardHref = role === 'VENDEDOR' ? '/seller' : '/buyer';
        window.location.assign(dashboardHref);
      } catch {
        setResettingId(null);
      }
      return;
    }
    if (id === 'crear-lote' || id === 'hacer-pedido') {
      // Si ya estaba completado, lo desmarcamos para volver a empezar.
      if (completed.includes(id)) {
        try { await api.post(`/tutorials/${id}/reset`); } catch { /* ignore */ }
      }
      // Activa el "modo prueba" y deja que el TutorialRunner del layout
      // tome el control desde el primer paso. El runner navega solo a
      // /seller/dashboard o /buyer/dashboard según el flow.
      startTutorialFlow(id);
    }
  }

  const visible = CATALOG.filter((it) => !it.roleFilter || it.roleFilter === role);

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-card border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground">{t('tutorials.section.title')}</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {t('tutorials.section.subtitle')}
        </p>
      </div>

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t('tutorials.section.loading')}</p>
        ) : visible.map((it) => {
          const done = completed.includes(it.id);
          return (
            <div
              key={it.id}
              className={`bg-card rounded-card border p-4 flex items-start gap-3 ${
                done ? 'border-emerald-200 bg-emerald-50/40' : 'border-border'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : it.available ? (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Clock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-foreground">{t(it.titleKey)}</h3>
                  <span className="text-[10px] text-muted-foreground">~{it.estimatedMinutes} {t('tutorials.section.minutes')}</span>
                  {done && (
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-badge">
                      {t('tutorials.section.completed')}
                    </span>
                  )}
                  {!it.available && (
                    <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-badge">
                      {t('tutorials.section.comingSoon')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary mt-1">{t(it.descKey)}</p>
              </div>
              <div className="flex-shrink-0">
                {it.available && done && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleStart(it.id)}
                    loading={resettingId === it.id}
                    className="flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('tutorials.section.replay')}
                  </Button>
                )}
                {it.available && !done && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleStart(it.id)}
                    loading={resettingId === it.id}
                    className="flex items-center gap-1"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    {t('tutorials.section.start')}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
