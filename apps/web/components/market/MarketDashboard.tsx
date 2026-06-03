'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Lock,
  FileText,
  ChevronDown,
  ChevronUp,
  Minus,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

const PRIMARY = '#E1C44D';
const SECONDARY = '#0B2E33';

interface PriceRow {
  productoId: string;
  producto: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  totalKg: number;
  numTransacciones: number;
  deltaPct: number | null;
}

interface PriceHistoryPoint {
  dia: string;
  avgPrice: number;
  totalKg: number;
}

interface CalibreRow {
  calibre: string;
  avgPrice: number;
  totalKg: number;
  n: number;
}

interface ProductDetail {
  producto: { id: string; nombre: string; categoria: string | null };
  windowDays: number;
  priceHistory: PriceHistoryPoint[];
  calibreBreakdown: CalibreRow[];
}

interface Highlights {
  alza?: string[];
  baja?: string[];
  sentimiento?: string;
  // Phase 15 — versiones inglesas opcionales. Pueden faltar en reports
  // antiguos generados antes del soporte bilingüe (fallback a ES).
  resumen_en?: string;
  alza_en?: string[];
  baja_en?: string[];
}

interface Report {
  id: string;
  semana: string;
  periodo: string;
  resumen: string;
  highlights: Highlights | null;
  fuenteUrl: string;
  createdAt: string;
}

const WINDOWS = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '6m', days: 180 },
  { label: '1a', days: 365 },
];

function sentimentBadge(s?: string): { labelKey: MessageKey; classes: string } {
  switch ((s ?? '').toLowerCase()) {
    case 'alcista': return { labelKey: 'market.sentiment.alcista', classes: 'bg-green-100 text-green-800 border-green-200' };
    case 'bajista': return { labelKey: 'market.sentiment.bajista', classes: 'bg-red-100 text-red-800 border-red-200' };
    case 'mixto':   return { labelKey: 'market.sentiment.mixto', classes: 'bg-amber-100 text-amber-800 border-amber-200' };
    default:        return { labelKey: 'market.sentiment.estable', classes: 'bg-blue-100 text-blue-800 border-blue-200' };
  }
}

export function MarketDashboard() {
  const t = useT();
  const { locale } = useLocale();
  const numLoc = locale === 'en' ? 'en-GB' : 'es-ES';
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [days, setDays] = useState<number>(90);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<{ data: { prices: PriceRow[]; windowDays: number } }>(`/market/prices?days=${days}`),
      api.get<{ data: { report: Report | null } }>('/market/sentiment'),
    ])
      .then(([pricesRes, sentRes]) => {
        setPrices(pricesRes.data.data.prices ?? []);
        setReport(sentRes.data.data.report ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  const sentiment = report?.highlights ? sentimentBadge(report.highlights.sentimiento) : null;
  // Phase 15 — el report viene con resumen ES y opcionalmente versión EN
  // dentro de highlights. Si la UI está en inglés y hay EN, lo usamos;
  // si no, fallback a ES.
  const useEn = locale === 'en';
  const resumenLocalized = useEn && report?.highlights?.resumen_en
    ? report.highlights.resumen_en
    : report?.resumen ?? '';
  const alzaLocalized = useEn && report?.highlights?.alza_en && report.highlights.alza_en.length > 0
    ? report.highlights.alza_en
    : report?.highlights?.alza ?? [];
  const bajaLocalized = useEn && report?.highlights?.baja_en && report.highlights.baja_en.length > 0
    ? report.highlights.baja_en
    : report?.highlights?.baja ?? [];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t('market.analysisTitle')}</h1>
        <p className="text-sm text-text-secondary">
          {t('market.analysisDesc')}
        </p>
      </div>

      {/* Weekly sentiment summary */}
      {report && (
        <section className="bg-card border border-border rounded-card p-5">
          <div className="flex items-start justify-between mb-3 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-secondary" />
                <h2 className="text-base font-semibold text-foreground">{t('market.weekly.title')}</h2>
                {sentiment && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sentiment.classes}`}>
                    {t(sentiment.labelKey)}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted">
                {t('market.weekly.week')} {report.semana} · {report.periodo}
                {report.createdAt && (
                  <span className="ml-2 text-[10px] text-text-muted/70">
                    · {t('market.weekly.generated')} {new Date(report.createdAt).toLocaleDateString(numLoc, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                )}
              </p>
            </div>
            <a
              href={report.fuenteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-secondary hover:underline flex items-center gap-1"
            >
              {t('market.weekly.officialBulletin')} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{resumenLocalized}</p>
          {report.highlights && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {alzaLocalized.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-input p-3">
                  <div className="flex items-center gap-1.5 mb-1.5 text-green-800 font-medium text-xs">
                    <TrendingUp className="w-3.5 h-3.5" /> {t('market.weekly.alza')}
                  </div>
                  <ul className="space-y-0.5 text-xs text-green-900">
                    {alzaLocalized.map((x, i) => <li key={i}>• {x}</li>)}
                  </ul>
                </div>
              )}
              {bajaLocalized.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-input p-3">
                  <div className="flex items-center gap-1.5 mb-1.5 text-red-800 font-medium text-xs">
                    <TrendingDown className="w-3.5 h-3.5" /> {t('market.weekly.baja')}
                  </div>
                  <ul className="space-y-0.5 text-xs text-red-900">
                    {bajaLocalized.map((x, i) => <li key={i}>• {x}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Product list */}
      <section className="bg-card border border-border rounded-card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t('market.byProduct')}</h2>
            <p className="text-xs text-text-muted">
              {t('market.confirmedOpsDays').replace('{n}', String(days))}
            </p>
          </div>
          <div className="inline-flex rounded-input border border-border overflow-hidden text-xs">
            {WINDOWS.map((w) => (
              <button
                key={w.days}
                onClick={() => { setDays(w.days); setExpandedId(null); }}
                className={[
                  'px-3 py-1.5 font-medium transition-colors',
                  days === w.days ? 'bg-primary text-foreground' : 'bg-card text-text-secondary hover:bg-accent/50',
                ].join(' ')}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}
          </div>
        ) : prices.length === 0 ? (
          <p className="text-sm text-text-muted italic py-10 text-center">
            {t('market.emptyNotEnough')}
          </p>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_0.8fr_auto] gap-3 px-3 py-2 text-xs font-medium text-text-secondary border-b border-border">
              <span>{t('market.col.product2')}</span>
              <span className="text-right">{t('market.col.priceAvg2')}</span>
              <span className="text-right">{t('market.col.variation7d')}</span>
              <span className="text-right">{t('market.col.volume2')}</span>
              <span className="text-right">{t('market.col.txCount')}</span>
              <span />
            </div>

            {prices.map((p) => {
              const expanded = expandedId === p.productoId;
              return (
                <ProductRow
                  key={p.productoId}
                  row={p}
                  expanded={expanded}
                  windowDays={days}
                  onToggle={() => setExpandedId(expanded ? null : p.productoId)}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Row component ──────────────────────────────────────────────────────────────

function ProductRow({
  row,
  expanded,
  windowDays,
  onToggle,
}: {
  row: PriceRow;
  expanded: boolean;
  windowDays: number;
  onToggle: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const numLoc = locale === 'en' ? 'en-GB' : 'es-ES';
  const delta = row.deltaPct;
  const deltaColor =
    delta === null ? 'text-muted-foreground' :
    delta > 1 ? 'text-green-700' :
    delta < -1 ? 'text-red-700' :
    'text-muted-foreground';
  const DeltaIcon =
    delta === null ? Minus :
    delta > 1 ? TrendingUp :
    delta < -1 ? TrendingDown :
    Minus;

  return (
    <div className={[
      'border border-border rounded-input bg-card transition-shadow',
      expanded ? 'shadow-soft' : 'hover:bg-accent/50/60',
    ].join(' ')}>
      {/* Row summary */}
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr_0.8fr_auto] gap-3 px-3 py-3 text-sm text-left items-center"
      >
        <div className="font-medium text-foreground col-span-2 md:col-span-1">{row.producto}</div>
        <div className="text-right font-semibold text-foreground">{row.avgPrice.toLocaleString(numLoc, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} €/kg</div>
        <div className={`text-right font-medium ${deltaColor} flex items-center justify-end gap-1`}>
          <DeltaIcon className="w-3.5 h-3.5" />
          {delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`}
        </div>
        <div className="text-right text-text-secondary text-xs md:text-sm">
          {row.totalKg.toLocaleString(numLoc, { maximumFractionDigits: 0 })} kg
        </div>
        <div className="text-right text-text-secondary text-xs md:text-sm">
          {row.numTransacciones}
        </div>
        <div className="text-right">
          <span className="text-xs text-secondary font-medium flex items-center justify-end gap-1">
            {expanded ? t('market.row.hide') : t('market.row.more')}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-3 py-4 bg-muted/50/30">
          <ProductDetailLazy productoId={row.productoId} productName={row.producto} days={windowDays} />
        </div>
      )}
    </div>
  );
}

// ── Lazy-loaded detail ─────────────────────────────────────────────────────────

function ProductDetailLazy({
  productoId,
  productName,
  days,
}: {
  productoId: string;
  productName: string;
  days: number;
}) {
  const t = useT();
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setAccessDenied(false);
    setError(null);
    api
      .get<{ data: ProductDetail }>(`/market/premium/products/${productoId}?days=${days}`)
      .then(({ data }) => setDetail(data.data))
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) setAccessDenied(true);
        else setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('market.detail.loadFail'));
      })
      .finally(() => setLoading(false));
  }, [productoId, days]);

  if (accessDenied) {
    return (
      <div className="bg-gradient-to-br from-primary/10 to-amber-50 border border-primary/40 rounded-card p-6 text-center">
        <Lock className="w-8 h-8 text-secondary mx-auto mb-2" />
        <h3 className="text-base font-semibold text-foreground mb-1">
          {t('market.detail.lockedTitle')}
        </h3>
        <p className="text-xs text-text-secondary mb-3 max-w-md mx-auto">
          {t('market.detail.lockedDesc')}
        </p>
        <Link
          href="../subscription"
          className="inline-block bg-primary text-foreground font-semibold px-4 py-1.5 rounded-button hover:opacity-90 transition-opacity text-xs"
        >
          {t('market.detail.viewPlans')}
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-48 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</p>;
  }

  if (!detail) return null;

  return <ProductDetailContent detail={detail} productName={productName} />;
}

// ── Detail content (charts + tables) ───────────────────────────────────────────

function ProductDetailContent({ detail, productName }: { detail: ProductDetail; productName: string }) {
  const t = useT();
  const { locale } = useLocale();
  const numLoc = locale === 'en' ? 'en-GB' : 'es-ES';
  const hasHistory = detail.priceHistory.length > 0;
  const hasCalibres = detail.calibreBreakdown.length > 0;

  if (!hasHistory) {
    return (
      <p className="text-sm text-text-muted italic py-6 text-center">
        {t('market.detail.noDaily').replace('{product}', productName)}
      </p>
    );
  }

  const lastPrice = detail.priceHistory[detail.priceHistory.length - 1]?.avgPrice ?? 0;
  const firstPrice = detail.priceHistory[0]?.avgPrice ?? 0;
  const periodDelta = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
  const totalKg = detail.priceHistory.reduce((s, p) => s + p.totalKg, 0);

  const chartData = detail.priceHistory.map((p) => ({
    ...p,
    dia: new Date(p.dia).toLocaleDateString(numLoc, { day: '2-digit', month: 'short' }),
  }));

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label={t('market.detail.kpi.current')} value={`${lastPrice.toLocaleString(numLoc, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} €/kg`} />
        <Kpi
          label={t('market.detail.kpi.variation')}
          value={`${periodDelta >= 0 ? '+' : ''}${periodDelta.toFixed(1)}%`}
          positive={periodDelta >= 0}
        />
        <Kpi label={t('market.detail.kpi.totalVolume')} value={`${totalKg.toLocaleString(numLoc, { maximumFractionDigits: 0 })} kg`} />
        <Kpi label={t('market.detail.kpi.daysWithData')} value={detail.priceHistory.length.toString()} />
      </div>

      {/* Price history chart */}
      <div>
        <h3 className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">
          {t('market.detail.priceHistoryHeader')}
        </h3>
        <div className="h-56 bg-card rounded-input border border-border p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toLocaleString(numLoc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`} width={60} />
              <Tooltip
                formatter={(v: number) => [`${v.toLocaleString(numLoc, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} €/kg`, t('market.tooltip.priceAvg')]}
                contentStyle={{ fontSize: 12 }}
              />
              <Line type="monotone" dataKey="avgPrice" stroke={SECONDARY} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Calibre breakdown */}
      {hasCalibres && (
        <div>
          <h3 className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">
            {t('market.detail.calibreBreakdownHeader')}
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="h-56 bg-card rounded-input border border-border p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={detail.calibreBreakdown.map((c) => ({ ...c, calibre: c.calibre || t('market.detail.noCalibre') }))}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="calibre" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`} width={60} />
                  <Tooltip
                    formatter={(v: number) => [`${v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} €/kg`, 'Precio medio']}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="avgPrice" fill={PRIMARY} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto bg-card rounded-input border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-text-secondary border-b border-border">
                    <th className="py-2 px-3">{t('market.detail.col.calibre')}</th>
                    <th className="py-2 px-3 text-right">{t('market.detail.col.avgPrice')}</th>
                    <th className="py-2 px-3 text-right">{t('market.detail.col.volume')}</th>
                    <th className="py-2 px-3 text-right">{t('market.detail.col.ops')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.calibreBreakdown.map((c) => (
                    <tr key={c.calibre} className="border-b border-border/40 last:border-0">
                      <td className="py-1.5 px-3 font-medium text-foreground">{c.calibre || '—'}</td>
                      <td className="py-1.5 px-3 text-right">{c.avgPrice.toLocaleString(numLoc, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} €/kg</td>
                      <td className="py-1.5 px-3 text-right text-text-secondary">
                        {c.totalKg.toLocaleString(numLoc, { maximumFractionDigits: 0 })} kg
                      </td>
                      <td className="py-1.5 px-3 text-right text-text-secondary">{c.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  const color = positive === undefined
    ? 'text-foreground'
    : positive ? 'text-green-700' : 'text-red-700';
  return (
    <div className="bg-card rounded-input p-2.5 border border-border">
      <p className="text-[11px] text-text-muted mb-0.5 uppercase tracking-wide">{label}</p>
      <p className={`text-base font-semibold ${color}`}>{value}</p>
    </div>
  );
}
