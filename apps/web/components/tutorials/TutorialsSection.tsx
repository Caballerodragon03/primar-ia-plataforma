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

interface TutorialItem {
  id: 'introduccion' | 'crear-lote' | 'hacer-pedido' | 'incidencia';
  title: string;
  description: string;
  estimatedMinutes: number;
  available: boolean; // false → próximamente
  roleFilter?: 'VENDEDOR' | 'COMPRADOR'; // si está, solo se muestra a ese rol
}

const CATALOG: TutorialItem[] = [
  {
    id: 'introduccion',
    title: 'Introducción a Primar-IA',
    description:
      'Recorrido por el menú, las notificaciones y tu panel. Incluye cómo se construye tu reputación con cada operación.',
    estimatedMinutes: 1,
    available: true,
  },
  {
    id: 'crear-lote',
    title: 'Crear tu primer lote',
    description: 'De la cosecha al lote publicado: fotos, calibres, precios y certificados.',
    estimatedMinutes: 2,
    available: false,
    roleFilter: 'VENDEDOR',
  },
  {
    id: 'hacer-pedido',
    title: 'Hacer tu primer pedido',
    description: 'Cómo definir calibres, precio máximo, incoterms y plazo de entrega para que los matches sean buenos.',
    estimatedMinutes: 2,
    available: false,
    roleFilter: 'COMPRADOR',
  },
  {
    id: 'incidencia',
    title: 'Abrir una incidencia',
    description: 'Qué hacer si algo no llega como debía: pasos para abrir disputa y resolución.',
    estimatedMinutes: 2,
    available: false,
  },
];

interface TutorialsSectionProps {
  role: 'VENDEDOR' | 'COMPRADOR';
}

export function TutorialsSection({ role }: TutorialsSectionProps) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);

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

  async function handleReset(id: string) {
    setResettingId(id);
    try {
      await api.post(`/tutorials/${id}/reset`);
      // Recargar la pantalla para que el dashboard vuelva a lanzar el
      // tutorial (lo recoge el TutorialLauncher en /auth/profile).
      window.location.assign('/');
    } catch {
      setResettingId(null);
    }
  }

  const visible = CATALOG.filter((t) => !t.roleFilter || t.roleFilter === role);

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-card border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground">Aprende a usar la plataforma</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Guías cortas para los flujos principales. No son obligatorias y puedes hacerlas en cualquier orden.
        </p>
      </div>

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Cargando…</p>
        ) : visible.map((t) => {
          const done = completed.includes(t.id);
          return (
            <div
              key={t.id}
              className={`bg-card rounded-card border p-4 flex items-start gap-3 ${
                done ? 'border-emerald-200 bg-emerald-50/40' : 'border-border'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : t.available ? (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Clock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
                  <span className="text-[10px] text-muted-foreground">~{t.estimatedMinutes} min</span>
                  {done && (
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-badge">
                      Completado
                    </span>
                  )}
                  {!t.available && (
                    <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-badge">
                      Próximamente
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary mt-1">{t.description}</p>
              </div>
              <div className="flex-shrink-0">
                {t.available && done && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleReset(t.id)}
                    loading={resettingId === t.id}
                    className="flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Repetir
                  </Button>
                )}
                {t.available && !done && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleReset(t.id)}
                    loading={resettingId === t.id}
                    className="flex items-center gap-1"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    Empezar
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
