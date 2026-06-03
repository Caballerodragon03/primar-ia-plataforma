'use client';

/**
 * Phase 16 — Banner dinámico "Hay X potenciales compradores/vendedores"
 * que se actualiza con debounce mientras el usuario rellena el form de
 * /seller/lots/new o /buyer/orders/new.
 *
 * El backend cuenta SOLO counterparties con un pedido/lote ACTIVO que
 * cumpla criterios duros (producto + variedad compatible + incoterm +
 * calibres). No considera el resto del scoring porque no es relevante
 * para "¿hay alguien con quién matchear ahora mismo?".
 */
import { useEffect, useState } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n/LocaleProvider';

interface DraftPayload {
  productoId?: string;
  variedadId?: string | null;
  incoterms?: string[];
  calibres?: Array<{ calibre: string }>;
}

interface Props {
  /** 'lote' (seller is creating a lot, counterparties are buyers) or
   *  'pedido' (buyer is creating an order, counterparties are sellers). */
  kind: 'lote' | 'pedido';
  draft: DraftPayload;
}

const DEBOUNCE_MS = 500;

export function PotentialCounterpartiesBanner({ kind, draft }: Props) {
  const t = useT();
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!draft.productoId) {
      setCount(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.post<{ success: boolean; data: { count: number } }>(
          '/matching/preview-potential-counterparties',
          draft,
        );
        if (cancelled) return;
        setCount(data.data.count);
      } catch {
        if (!cancelled) setCount(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    draft.productoId,
    draft.variedadId,
    // El backend solo lee these arrays, así que serializamos para que el
    // useEffect detecte cambios cuando el contenido (no la referencia)
    // varía. Para arrays pequeños (incoterms ≤12, calibres ≤10) el coste
    // es despreciable.
    JSON.stringify(draft.incoterms ?? []),
    JSON.stringify(draft.calibres ?? []),
  ]);

  // No mostrar nada si no hay producto aún (UX: el banner no debe distraer
  // al usuario antes de que rellene lo mínimo).
  if (!draft.productoId) return null;

  const labelKey =
    kind === 'lote'
      ? 'potential.banner.lote'
      : 'potential.banner.pedido';

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-card px-4 py-3 flex items-center gap-3">
      <Users className="w-4 h-4 text-blue-700 flex-shrink-0" />
      <div className="text-sm text-blue-900 flex-1 min-w-0">
        {loading || count === null ? (
          <span className="flex items-center gap-2 text-blue-700">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t('potential.banner.calculating')}
          </span>
        ) : (
          <span>
            {t(labelKey)
              .replace('{n}', String(count))
              .replace(
                '{n_plural}',
                count === 1
                  ? t(kind === 'lote' ? 'potential.banner.singularBuyer' : 'potential.banner.singularSeller')
                  : t(kind === 'lote' ? 'potential.banner.pluralBuyer' : 'potential.banner.pluralSeller'),
              )}
          </span>
        )}
      </div>
    </div>
  );
}
