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

const SEVERITY_STYLES: Record<SimilarOffer['diff']['severity'], { dot: string; border: string; bg: string; label: string }> = {
  minor: {
    dot: 'bg-green-500',
    border: 'border-green-200',
    bg: 'bg-green-50/40',
    label: 'Cambio menor',
  },
  moderate: {
    dot: 'bg-amber-500',
    border: 'border-amber-200',
    bg: 'bg-amber-50/40',
    label: 'Requiere ajustes',
  },
  major: {
    dot: 'bg-red-500',
    border: 'border-red-200',
    bg: 'bg-red-50/40',
    label: 'Diferencias grandes',
  },
};

const FIELD_LABELS: Record<DiffChange['field'], string> = {
  calibre: 'Calibre',
  incoterm: 'Incoterm',
  logistica: 'Logística',
  precio: 'Precio',
  terminoPago: 'Pago',
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export function SimilarOffersSection() {
  const [offers, setOffers] = useState<SimilarOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ success: boolean; data: SimilarOffer[] }>('/matching/seller/similar-offers')
      .then(({ data }) => setOffers(data.data ?? []))
      .catch(() => setError('No se pudieron cargar las ofertas similares.'))
      .finally(() => setLoading(false));
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
          <h3 className="font-semibold text-text-primary text-sm">Ofertas similares</h3>
        </div>
        <p className="text-xs text-text-secondary">
          No hay pedidos cercanos a tus lotes ahora mismo. Te avisaremos cuando aparezca alguno.
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
            <h3 className="font-semibold text-text-primary text-sm">Ofertas similares</h3>
            <p className="text-[11px] text-text-secondary">
              {offers.length} pedido{offers.length !== 1 ? 's' : ''} cercano{offers.length !== 1 ? 's' : ''} a tus lotes — ajusta condiciones para encajar
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
                      {style.label}
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
                    Entrega: {fmtDate(o.fechaEntregaDeseada)}
                  </p>
                </div>
                <Link
                  href={`/seller/lots/${o.loteId}/edit`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-dark hover:underline"
                >
                  Ajustar mi lote
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Diff chips */}
              <div className={`mt-3 flex flex-wrap gap-1.5 pl-1 border-l-2 ${style.border}`}>
                {o.diff.changes.map((c, i) => (
                  <span
                    key={i}
                    title={c.hint}
                    className="ml-1.5 inline-flex items-center gap-1 text-[11px] bg-card border border-border rounded-badge px-2 py-0.5 text-text-secondary"
                  >
                    <span className="font-medium text-text-primary">{FIELD_LABELS[c.field]}:</span>
                    {c.label.replace(`${FIELD_LABELS[c.field]}: `, '')}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
