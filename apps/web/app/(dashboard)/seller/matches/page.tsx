'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Star, Filter, TrendingUp, Zap, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { MatchCard, type Match } from '@/components/ui/MatchCard';
import { ContributeModal } from '@/components/ui/ContributeModal';
import { AutoDistributeModal } from '@/components/ui/AutoDistributeModal';
import { SimilarOffersSection } from '@/components/ui/SimilarOffersSection';
import { useT } from '@/lib/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

type Tab = 'best' | 'price' | 'distance' | 'newest';

interface IncotermPrefs {
  recommended: string;
  selected: string[];
  done: boolean;
}

function loadIncotermPrefs(): IncotermPrefs | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('primaria_incoterms');
    if (!raw) return null;
    return JSON.parse(raw) as IncotermPrefs;
  } catch {
    return null;
  }
}

// Phase 14M v3.41 — TABS ahora mapea key → MessageKey; el label se resuelve
// con useT() dentro del componente para que cambie con el toggle de idioma.
const TABS: { key: Tab; labelKey: MessageKey }[] = [
  { key: 'best', labelKey: 'matches.tab.best' },
  { key: 'price', labelKey: 'matches.tab.price' },
  { key: 'distance', labelKey: 'matches.tab.distance' },
  { key: 'newest', labelKey: 'matches.tab.newest' },
];

interface ApiMatchItem {
  id: string;
  loteId: string;
  pedidoId: string;
  cantidadKg: string;
  precioKg: string;
  calibresJson: unknown;
  estado: string;
  scoreMatching: number | null;
  scoreDetalle: unknown;
  createdAt?: string;
  pedido: {
    id: string;
    destinoFinal: string | null;
    calibresSolicitados: unknown;
    producto: { nombre: string };
    variedad: { nombre: string } | null;
    // The API `include` returns ALL pedido fields, including these two,
    // which the incoterm filter (Fix Phase 14D) needs to inspect.
    incoterm?: string;
    incotermsAceptados?: unknown;
  };
  lote: {
    id: string;
    calibres: unknown;
    direccionRecogida: string;
  };
  distanceKm?: number;
  coverage?: number;
}

function sortMatches(matches: Match[], tab: Tab): Match[] {
  const copy = [...matches];
  if (tab === 'best') {
    return copy.sort((a, b) => (b.scoreMatching ?? 0) - (a.scoreMatching ?? 0));
  }
  if (tab === 'price') {
    return copy.sort((a, b) => Number(a.precioKg) - Number(b.precioKg));
  }
  if (tab === 'distance') {
    return copy.sort((a, b) => {
      const da = a.distanceKm ?? Infinity;
      const db = b.distanceKm ?? Infinity;
      return da - db;
    });
  }
  // newest — sort by createdAt descending (not in Match type, keep original order as fallback)
  return copy;
}

function computeTotalProfit(matches: Match[]): number {
  return matches.reduce((sum, m) => {
    const qty = parseFloat(m.cantidadKg);
    const price = parseFloat(m.precioKg);
    return sum + (isNaN(qty) || isNaN(price) ? 0 : qty * price);
  }, 0);
}

/**
 * Phase 14M v3.33 — agrupado por fruta → variedad. Cuando hay 4+ matches,
 * los agrupamos en "Producto → Variedad" para que el vendedor no se pierda
 * en scroll. Con menos de 4, mantenemos el render plano (la jerarquía sería
 * over-engineering).
 */
const GROUP_THRESHOLD = 4;

type GroupedMatches = Array<{
  producto: string;
  variedades: Array<{ variedad: string; items: Match[] }>;
}>;

function groupMatches(matches: Match[]): GroupedMatches {
  const byProducto = new Map<string, Map<string, Match[]>>();
  for (const m of matches) {
    const prod = m.pedido.producto?.nombre ?? 'Sin producto';
    const vari = m.pedido.variedad?.nombre ?? 'Sin variedad';
    if (!byProducto.has(prod)) byProducto.set(prod, new Map());
    const vMap = byProducto.get(prod)!;
    if (!vMap.has(vari)) vMap.set(vari, []);
    vMap.get(vari)!.push(m);
  }
  return Array.from(byProducto.entries()).map(([producto, vMap]) => ({
    producto,
    variedades: Array.from(vMap.entries()).map(([variedad, items]) => ({ variedad, items })),
  }));
}

function MatchesList({ matches, onContribute }: { matches: Match[]; onContribute: (m: Match) => void }) {
  const t = useT();
  const pl = (count: number) => count === 1
    ? t('matches.group.matches.one')
    : t('matches.group.matches.many').replace('{n}', String(count));
  // < threshold → render plano para no fragmentar visualmente listas cortas.
  if (matches.length < GROUP_THRESHOLD) {
    return (
      <div className="space-y-3 animate-stagger">
        {matches.map((m) => (
          <MatchCard key={m.id} match={m} onContribute={onContribute} />
        ))}
      </div>
    );
  }
  const grouped = groupMatches(matches);
  return (
    <div className="space-y-6 animate-stagger">
      {grouped.map(({ producto, variedades }) => (
        <section key={producto} className="space-y-3">
          <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1.5 z-10 border-b border-border">
            <h2 className="text-base font-bold text-foreground">{producto}</h2>
            <span className="text-xs text-text-secondary">
              · {pl(variedades.reduce((s, v) => s + v.items.length, 0))}
            </span>
          </div>
          {variedades.map(({ variedad, items }) => (
            <div key={`${producto}::${variedad}`} className="space-y-3">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-1">
                {variedad} <span className="text-text-muted normal-case font-normal">({items.length})</span>
              </p>
              {items.map((m) => (
                <MatchCard key={m.id} match={m} onContribute={onContribute} />
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

export default function SellerMatchesPage() {
  const t = useT();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('best');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reservingAll, setReservingAll] = useState(false);
  const [autoDistOpen, setAutoDistOpen] = useState(false);
  const [incotermPrefs, setIncotermPrefs] = useState<IncotermPrefs | null>(null);
  const [incotermFilter, setIncotermFilter] = useState<Set<string>>(new Set());
  const [showIncotermFilter, setShowIncotermFilter] = useState(false);
  const [marketDemand, setMarketDemand] = useState<{ productoNombre: string; calibre: string; totalKg: number; orderCount: number }[]>([]);
  // Phase 15 — banner "Tinder-plus": matches generados pero ocultos hasta
  // dentro de 24 h por el retraso del plan gratuito.
  const [hiddenInfo, setHiddenInfo] = useState<{ hiddenByDelay: number; isFreeTier: boolean; nextVisibleAt: string | null } | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchMatches() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: ApiMatchItem[] }>(
        '/matching/seller/matches'
      );
      setMatches((res.data.data ?? []) as Match[]);
    } catch {
      setError(t('matches.loadError'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMatches();
    api.get<{ success: boolean; data: typeof marketDemand }>('/matching/seller/market-demand')
      .then(({ data }) => setMarketDemand(data.data ?? []))
      .catch(() => {});
    // Phase 15 — recuento de matches ocultos por el retraso de 24h del
    // plan gratuito (banner upgrade-prompt).
    api.get<{ success: boolean; data: { hiddenByDelay: number; isFreeTier: boolean; nextVisibleAt: string | null } }>('/matching/seller/hidden-matches')
      .then(({ data }) => setHiddenInfo(data.data))
      .catch(() => {});
    const prefs = loadIncotermPrefs();
    if (prefs?.done) {
      setIncotermPrefs(prefs);
      setIncotermFilter(new Set(prefs.selected));
    }

    // Auto-refresh matches every 30 seconds
    refreshTimerRef.current = setInterval(() => {
      fetchMatches();
      api.get<{ success: boolean; data: typeof marketDemand }>('/matching/seller/market-demand')
        .then(({ data }) => setMarketDemand(data.data ?? []))
        .catch(() => {});
      api.get<{ success: boolean; data: { hiddenByDelay: number; isFreeTier: boolean; nextVisibleAt: string | null } }>('/matching/seller/hidden-matches')
        .then(({ data }) => setHiddenInfo(data.data))
        .catch(() => {});
    }, 30_000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, []);

  // Filter matches by incoterm if filter is active.
  // Phase 14D — antes solo se comparaba contra el `pedido.incoterm` principal,
  // lo cual descartaba pedidos cuya lista `incotermsAceptados` SÍ incluía un
  // incoterm aceptado por el vendedor. Ahora el match pasa el filtro si:
  //   (a) el incoterm principal está en el filtro, O
  //   (b) ALGUNO de los incoterms aceptados por el comprador está en el filtro.
  const filtered = useMemo(() => {
    if (!incotermPrefs?.done || incotermFilter.size === 0) return matches;
    return matches.filter((m) => {
      const p = m.pedido as { incoterm?: string; incotermsAceptados?: unknown };
      const aceptados = Array.isArray(p.incotermsAceptados) ? (p.incotermsAceptados as string[]) : [];
      const candidatos = [p.incoterm, ...aceptados].filter((v): v is string => !!v);
      // Sin info de incoterm en el pedido → no descartar (defensivo).
      if (candidatos.length === 0) return true;
      return candidatos.some((c) => incotermFilter.has(c));
    });
  }, [matches, incotermFilter, incotermPrefs]);

  // Phase 14D — distinguir "no hay matches en absoluto" vs "el filtro los oculta"
  const hiddenByFilter = matches.length > 0 && filtered.length === 0;

  const sorted = useMemo(() => sortMatches(filtered, activeTab), [filtered, activeTab]);
  const totalProfit = useMemo(() => computeTotalProfit(filtered), [filtered]);

  function handleContribute(match: Match) {
    setSelectedMatch(match);
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    setSelectedMatch(null);
  }

  function handleModalSuccess() {
    fetchMatches();
  }

  async function handleReserveAll() {
    const pending = matches.filter(
      (m) => m.estado === 'PROPUESTO' || m.estado === 'ENVIADO_VENDEDOR'
    );
    if (pending.length === 0) return;

    const confirmed = window.confirm(
      `Accept all ${pending.length} pending matches? We'll contribute the maximum feasible quantity for each, sorted by profitability.`
    );
    if (!confirmed) return;

    setReservingAll(true);
    let failCount = 0;

    // Sort by scoreMatching desc (most profitable first)
    const sorted = [...pending].sort((a, b) => (b.scoreMatching ?? 0) - (a.scoreMatching ?? 0));

    // Track how much of each lot we've already committed in this batch
    const lotCommitted: Record<string, number> = {};

    for (const match of sorted) {
      try {
        type LoteCalibre = { calibre: string; cantidad_kg: number; precio_min_kg: number };
        type PedCalibre = { calibre: string; cantidad_kg: number; precio_max_kg: number };
        const loteCalibres = (match.lote?.calibres as LoteCalibre[] | null) ?? [];
        const pedidoCalibres = (match.pedido.calibresSolicitados as PedCalibre[] | null) ?? [];

        // Get already committed kg on this lot
        const loteKey = match.loteId ?? match.lote?.id ?? '';
        const alreadyCommitted = lotCommitted[loteKey] ?? 0;

        const calibresContribucion = loteCalibres
          .flatMap((lc) => {
            const pc = pedidoCalibres.find(
              (p) => p.calibre === lc.calibre && lc.precio_min_kg <= p.precio_max_kg
            );
            if (!pc) return [];
            // Remaining lot capacity for this calibre
            const availableKg = Math.max(0, lc.cantidad_kg - alreadyCommitted);
            const cantidad_kg = Math.min(availableKg, pc.cantidad_kg);
            if (cantidad_kg <= 0) return [];
            return [{ calibre: lc.calibre, cantidad_kg }];
          });

        if (calibresContribucion.length === 0 || calibresContribucion.every((c) => c.cantidad_kg <= 0)) {
          // Skip — no capacity left
          continue;
        }

        await api.post(`/matching/matches/${match.id}/contribute`, { calibresContribucion });

        // Track committed kg for this lot
        const totalContributed = calibresContribucion.reduce((s, c) => s + c.cantidad_kg, 0);
        lotCommitted[loteKey] = (lotCommitted[loteKey] ?? 0) + totalContributed;

      } catch {
        failCount += 1;
      }
    }

    setReservingAll(false);
    fetchMatches();

    if (failCount > 0) {
      alert(`${failCount} match${failCount > 1 ? 'es' : ''} could not be reserved. Please try again individually.`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t('matches.title')}</h1>
        <p className="text-sm text-text-secondary mt-1">
          {t('matches.subtitle')}
        </p>
      </div>

      {/* Phase 15 — Free-tier upgrade prompt: matches existen pero están
          ocultos hasta dentro de 24h. */}
      {hiddenInfo && hiddenInfo.isFreeTier && hiddenInfo.hiddenByDelay > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-300 rounded-card p-4 flex items-start gap-3 shadow-soft">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-200/70 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-800" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              {t('matches.hiddenByDelay.title')
                .replace('{n}', String(hiddenInfo.hiddenByDelay))
                .replace(
                  '{n_plural}',
                  hiddenInfo.hiddenByDelay === 1 ? 'match' : 'matches',
                )}
            </p>
            <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
              {t('matches.hiddenByDelay.body')}
            </p>
            {hiddenInfo.nextVisibleAt && (
              <p className="text-[11px] text-amber-800/80 mt-1">
                {t('matches.hiddenByDelay.nextVisible').replace(
                  '{when}',
                  new Date(hiddenInfo.nextVisibleAt).toLocaleString(undefined, {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                )}
              </p>
            )}
            <Link
              href="/seller/subscription"
              className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-button transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              {t('matches.hiddenByDelay.cta')}
            </Link>
          </div>
        </div>
      )}

      {/* Incoterm filter — shown when wizard has been completed */}
      {incotermPrefs?.done && (
        <div className="bg-card border border-border rounded-card px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-text-primary">
                {t('matches.incotermFilter')}
                {incotermPrefs.recommended && (
                  <span className="ml-2 text-xs text-text-secondary">
                    ({t('matches.incotermFilterRecommended')}: <span className="font-semibold text-primary">{incotermPrefs.recommended}</span>)
                  </span>
                )}
              </span>
              <span className="text-xs text-text-secondary">
                {t('matches.incotermFilterCount').replace('{n}', String(incotermFilter.size)).replace('{total}', String(incotermPrefs.selected.length))}
              </span>
            </div>
            <button
              onClick={() => setShowIncotermFilter((v) => !v)}
              className="text-xs text-primary-dark hover:underline"
            >
              {showIncotermFilter ? t('matches.hide') : t('matches.edit')}
            </button>
          </div>

          {showIncotermFilter && (
            <div className="mt-3 flex flex-wrap gap-2">
              {incotermPrefs.selected.map((code) => {
                const active = incotermFilter.has(code);
                const isRec = code === incotermPrefs.recommended;
                return (
                  <button
                    key={code}
                    onClick={() => setIncotermFilter((prev) => {
                      const next = new Set(prev);
                      active ? next.delete(code) : next.add(code);
                      return next;
                    })}
                    className={[
                      'px-3 py-1 rounded-badge text-xs font-medium border transition-colors',
                      active
                        ? isRec
                          ? 'bg-primary text-foreground border-primary'
                          : 'bg-primary/10 border-primary text-text-primary'
                        : 'bg-card border-border text-text-muted line-through',
                    ].join(' ')}
                  >
                    {code}{isRec ? ' ★' : ''}
                  </button>
                );
              })}
              <button
                onClick={() => setIncotermFilter(new Set(incotermPrefs.selected))}
                className="text-xs text-text-secondary hover:text-text-primary underline ml-1"
              >
                {t('matches.reset')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Automated Best Match banner — only when matches survive the filter,
          otherwise mostraba "€0,00" misleading. Phase 14D fix. */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-yellow-50 border border-primary/40 rounded-card px-5 py-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary flex-shrink-0 fill-primary" />
            <div>
              <p className="font-semibold text-text-primary text-sm">
                {t('matches.bestMatchTitle')}
              </p>
              <p className="text-xs text-text-secondary">
                {t('matches.bestMatchSub')}{' '}
                <span className="font-bold text-text-primary">
                  €{totalProfit.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="ml-1 text-text-secondary font-normal">{t('matches.bestMatchPotential')}</span>
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setAutoDistOpen(true)}
          >
            {t('matches.reviewAccept')}
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-input w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'px-4 py-1.5 text-sm font-medium rounded transition-colors duration-150',
              activeTab === tab.key
                ? 'bg-card text-text-primary shadow-soft'
                : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card rounded-card border border-border p-5 h-32 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-card px-5 py-4 text-sm text-red-600">
          {error}
          <button
            onClick={fetchMatches}
            className="ml-3 underline font-medium hover:no-underline"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {!loading && !error && sorted.length === 0 && (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Star className="w-8 h-8 text-muted-foreground/50" />
            </div>
            {/* Phase 14D — diferenciar: filtro oculta vs no hay matches. */}
            {hiddenByFilter ? (
              <>
                <p className="font-semibold text-text-primary mb-1">
                  {matches.length === 1
                    ? t('matches.empty.filterHides.one')
                    : t('matches.empty.filterHides.many').replace('{n}', String(matches.length))}
                </p>
                <p className="text-sm text-text-secondary max-w-sm">
                  {t('matches.empty.filterHidesDesc')}
                </p>
                <button
                  onClick={() => incotermPrefs && setIncotermFilter(new Set(incotermPrefs.selected))}
                  className="mt-4 text-xs text-primary-dark underline hover:no-underline"
                >
                  {t('matches.reset')}
                </button>
              </>
            ) : (
              <>
                <p className="font-semibold text-text-primary mb-1">{t('matches.empty.noMatches')}</p>
                <p className="text-sm text-text-secondary max-w-sm">
                  {t('matches.empty.noMatchesDesc')}
                </p>
              </>
            )}
          </div>

          {marketDemand.length > 0 && (
            <div className="bg-card border border-border rounded-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-text-primary text-sm">{t('matches.marketDemandTitle')}</h3>
                <span className="text-xs text-text-secondary">{t('matches.marketDemandSub')}</span>
              </div>
              <div className="divide-y divide-border">
                {marketDemand.map((d) => (
                  <div key={`${d.productoNombre}:${d.calibre}`} className="flex items-center justify-between py-3">
                    <div>
                      <span className="text-sm font-medium text-text-primary">{d.productoNombre}</span>
                      <span className="ml-2 text-xs bg-muted text-text-secondary px-2 py-0.5 rounded-badge">
                        {t('matches.marketDemandCalibre').replace('{c}', d.calibre)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-text-primary">
                        {d.totalKg.toLocaleString('es-ES')} kg
                      </p>
                      <p className="text-xs text-text-secondary">
                        {d.orderCount === 1
                          ? t('matches.marketDemandOrders.one')
                          : t('matches.marketDemandOrders.many').replace('{n}', String(d.orderCount))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && !error && sorted.length > 0 && (
        <MatchesList matches={sorted} onContribute={handleContribute} />
      )}

      {/* Phase 7 — Ofertas similares. Solo visible para vendedores; los
          compradores no tienen browse y por tanto no ven este componente. */}
      {!loading && !error && <SimilarOffersSection />}

      {/* Contribute modal */}
      <ContributeModal
        match={selectedMatch}
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />

      {/* Auto-distribute modal */}
      <AutoDistributeModal
        open={autoDistOpen}
        onClose={() => setAutoDistOpen(false)}
        onSuccess={() => fetchMatches()}
      />
    </div>
  );
}
