'use client';

/**
 * Phase 7 — "Ofertas similares" para vendedores.
 *
 * Renderiza la lista de pedidos del mismo producto que NO están matcheados
 * con los lotes del vendedor, con chips de diff que explican qué hace falta
 * cambiar para que encajen.
 *
 * No tiene equivalente comprador-side: los compradores no navegan el
 * marketplace, solo ven ofertas que les llegan.
 */
import { useEffect, useState } from 'react';
import { Sparkles, MapPin, Loader2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

interface DiffChange {
  field: 'calibre' | 'incoterm' | 'logistica' | 'precio' | 'terminoPago';
  label: string;
  hint: string;
}

interface SimilarOffer {
  pedidoId: string;
  loteId: string;
  productoNombre: string;
  variedadNombre: string | null;
  compradorEmpresa: string | null;
  compradorNombre: string;
  destinoFinal: string | null;
  fechaEntregaDeseada: string;
  diff: {
    changes: DiffChange[];
    severity: 'minor' | 'moderate' | 'major';
  };
}

// Phase 14M v3.41 — labels traducidos via useT, los estilos se quedan.
const SEVERITY_STYLES: Record<SimilarOffer['diff']['severity'], { dot: string; border: string; bg: string; labelKey: MessageKey }> = {
  minor: { dot: 'bg-green-500', border: 'border-green-200', bg: 'bg-green-50/40', labelKey: 'similar.severity.minor' },
  moderate: { dot: 'bg-amber-500', border: 'border-amber-200', bg: 'bg-amber-50/40', labelKey: 'similar.severity.moderate' },
  major: { dot: 'bg-red-500', border: 'border-red-200', bg: 'bg-red-50/40', labelKey: 'similar.severity.major' },
};

const FIELD_KEYS: Record<DiffChange['field'], MessageKey> = {
  calibre: 'similar.field.calibre',
  incoterm: 'similar.field.incoterm',
  logistica: 'similar.field.logistica',
  precio: 'similar.field.precio',
  terminoPago: 'similar.field.terminoPago',
};

function fmtDate(iso: string, locale: 'es' | 'en'): string {
  try {
    return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-GB' : 'es-ES', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export function SimilarOffersSection() {
  const t = useT();
  const { locale } = useLocale();
  const [offers, setOffers] = useState<SimilarOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ success: boolean; data: SimilarOffer[] }>('/matching/seller/similar-offers')
      .then(({ data }) => setOffers(data.data ?? []))
      .catch(() => setError(t('similar.errorLoading')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-card p-5 space-y-3 animate-pulse">
        <div className="h-4 bg-muted rounded w-40" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-card p-4 text-xs text-red-700">
        {error}
      </div>
    );
  }

  if (offers.length === 0) {
    // Show an empty-state hint instead of hiding so the seller learns the
    // section exists. Buyers don't see this section at all (different route).
    return (
      <div className="bg-card border border-border rounded-card p-5 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-text-primary text-sm">{t('similar.title')}</h3>
        </div>
        <p className="text-xs text-text-secondary">
          {t('similar.empty')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <div>
            <h3 className="font-semibold text-text-primary text-sm">{t('similar.title')}</h3>
            <p className="text-[11px] text-text-secondary">
              {offers.length === 1
                ? t('similar.headerSub.one')
                : t('similar.headerSub.many').replace('{n}', String(offers.length))}
            </p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-border">
        {offers.map((o) => {
          const style = SEVERITY_STYLES[o.diff.severity];
          return (
            <div key={o.pedidoId} className={`px-5 py-4 ${style.bg}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-text-primary">
                      {o.productoNombre}
                      {o.variedadNombre ? ` — ${o.variedadNombre}` : ''}
                    </p>
                    <span className="flex items-center gap-1 text-[10px] font-medium text-text-secondary">
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                      {t(style.labelKey)}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {o.compradorEmpresa ?? o.compradorNombre}
                    {o.destinoFinal && (
                      <>
                        <span className="mx-1.5">·</span>
                        <MapPin className="w-3 h-3 inline -mt-0.5" /> {o.destinoFinal}
                      </>
                    )}
                    <span className="mx-1.5">·</span>
                    {t('similar.delivery')}: {fmtDate(o.fechaEntregaDeseada, locale)}
                  </p>
                </div>
              </div>

              {/* Phase 14M v3.34/v3.41 — diff chips, cada uno con su botón
                  "Ajustar {campo}" que lleva al edit enfocado. Ahora i18n. */}
              <div className={`mt-3 space-y-1.5 pl-3 border-l-2 ${style.border}`}>
                {o.diff.changes.map((c, i) => {
                  const fieldLabel = t(FIELD_KEYS[c.field]);
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-baseline gap-1.5 flex-wrap text-[12px]">
                        <span className="font-semibold text-text-primary">{fieldLabel}:</span>
                        <span className="text-text-secondary" title={c.hint}>
                          {c.label.replace(`${fieldLabel}: `, '')}
                        </span>
                      </div>
                      <Link
                        href={`/seller/lots/${o.loteId}/edit?focus=${c.field}&pedidoId=${o.pedidoId}`}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-dark hover:bg-primary/10 px-2 py-1 rounded-badge transition-colors"
                      >
                        {t('similar.adjust')} {fieldLabel.toLowerCase()}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
