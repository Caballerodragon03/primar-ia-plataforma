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
}

interface Report {
  id: string;
  semana: string;
  periodo: string;
  resumen: string;
  highlights: Highlights | null;
  fuenteUrl: string;
}

const WINDOWS = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '6m', days: 180 },
  { label: '1a', days: 365 },
];

function sentimentBadge(s?: string): { label: string; classes: string } {
  switch ((s ?? '').toLowerCase()) {
    case 'alcista': return { label: 'Alcista', classes: 'bg-green-100 text-green-800 border-green-200' };
    case 'bajista': return { label: 'Bajista', classes: 'bg-red-100 text-red-800 border-red-200' };
    case 'mixto':   return { label: 'Mixto',   classes: 'bg-amber-100 text-amber-800 border-amber-200' };
    default:        return { label: 'Estable', classes: 'bg-blue-100 text-blue-800 border-blue-200' };
  }
}

export function MarketDashboard() {
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

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Análisis de Mercado</h1>
        <p className="text-sm text-text-secondary">
          Precios reales en Primar-IA y análisis semanal del boletín oficial del MAPA.
        </p>
      </div>

      {/* Weekly sentiment summary */}
      {report && (
        <section className="bg-white border border-border rounded-card p-5">
          <div className="flex items-start justify-between mb-3 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-secondary" />
                <h2 className="text-base font-semibold text-gray-900">Análisis semanal — Boletín MAPA</h2>
                {sentiment && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sentiment.classes}`}>
                    {sentiment.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted">Semana {report.semana} · {report.periodo}</p>
            </div>
            <a
              href={report.fuenteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-secondary hover:underline flex items-center gap-1"
            >
              Boletín oficial <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{report.resumen}</p>
          {report.highlights && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.highlights.alza && report.highlights.alza.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-input p-3">
                  <div className="flex items-center gap-1.5 mb-1.5 text-green-800 font-medium text-xs">
                    <TrendingUp className="w-3.5 h-3.5" /> Al alza
                  </div>
                  <ul className="space-y-0.5 text-xs text-green-900">
                    {report.highlights.alza.map((x, i) => <li key={i}>• {x}</li>)}
                  </ul>
                </div>
              )}
              {report.highlights.baja && report.highlights.baja.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-input p-3">
                  <div className="flex items-center gap-1.5 mb-1.5 text-red-800 font-medium text-xs">
                    <TrendingDown className="w-3.5 h-3.5" /> A la baja
                  </div>
                  <ul className="space-y-0.5 text-xs text-red-900">
                    {report.highlights.baja.map((x, i) => <li key={i}>• {x}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Product list */}
      <section className="bg-white border border-border rounded-card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Mercado por producto</h2>
            <p className="text-xs text-text-muted">
              Operaciones confirmadas en los últimos {days} días
            </p>
          </div>
          <div className="inline-flex rounded-input border border-border overflow-hidden text-xs">
            {WINDOWS.map((w) => (
              <button
                key={w.days}
                onClick={() => { setDays(w.days); setExpandedId(null); }}
                className={[
                  'px-3 py-1.5 font-medium transition-colors',
                  days === w.days ? 'bg-primary text-gray-900' : 'bg-white text-text-secondary hover:bg-gray-50',
                ].join(' ')}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : prices.length === 0 ? (
          <p className="text-sm text-text-muted italic py-10 text-center">
            Aún no hay suficientes transacciones confirmadas para mostrar datos de mercado.
          </p>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_0.8fr_auto] gap-3 px-3 py-2 text-xs font-medium text-text-secondary border-b border-border">
              <span>Producto</span>
              <span className="text-right">Precio medio</span>
              <span className="text-right">Variación (7d)</span>
              <span className="text-right">Volumen</span>
              <span className="text-right">Transacciones</span>
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
  const delta = row.deltaPct;
  const deltaColor =
    delta === null ? 'text-gray-400' :
    delta > 1 ? 'text-green-700' :
    delta < -1 ? 'text-red-700' :
    'text-gray-600';
  const DeltaIcon =
    delta === null ? Minus :
    delta > 1 ? TrendingUp :
    delta < -1 ? TrendingDown :
    Minus;

  return (
    <div className={[
      'border border-border rounded-input bg-white transition-shadow',
      expanded ? 'shadow-sm' : 'hover:bg-gray-50/60',
    ].join(' ')}>
      {/* Row summary */}
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr_0.8fr_auto] gap-3 px-3 py-3 text-sm text-left items-center"
      >
        <div className="font-medium text-gray-900 col-span-2 md:col-span-1">{row.producto}</div>
        <div className="text-right font-semibold text-gray-900">{row.avgPrice.toFixed(3)} €/kg</div>
        <div className={`text-right font-medium ${deltaColor} flex items-center justify-end gap-1`}>
          <DeltaIcon className="w-3.5 h-3.5" />
          {delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`}
        </div>
        <div className="text-right text-text-secondary text-xs md:text-sm">
          {row.totalKg.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kg
        </div>
        <div className="text-right text-text-secondary text-xs md:text-sm">
          {row.numTransacciones}
        </div>
        <div className="text-right">
          <span className="text-xs text-secondary font-medium flex items-center justify-end gap-1">
            {expanded ? 'Ocultar' : 'Más detalles'}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-3 py-4 bg-gray-50/30">
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
        else setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al cargar el detalle');
      })
      .finally(() => setLoading(false));
  }, [productoId, days]);

  if (accessDenied) {
    return (
      <div className="bg-gradient-to-br from-primary/10 to-amber-50 border border-primary/40 rounded-card p-6 text-center">
        <Lock className="w-8 h-8 text-secondary mx-auto mb-2" />
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          El análisis detallado requiere suscripción
        </h3>
        <p className="text-xs text-text-secondary mb-3 max-w-md mx-auto">
          Accede a histórico de precios diario y desglose por calibre con cualquiera de nuestros planes.
        </p>
        <Link
          href="../subscription"
          className="inline-block bg-primary text-gray-900 font-semibold px-4 py-1.5 rounded-button hover:opacity-90 transition-opacity text-xs"
        >
          Ver planes
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-32 bg-gray-100 rounded animate-pulse" />
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
  const hasHistory = detail.priceHistory.length > 0;
  const hasCalibres = detail.calibreBreakdown.length > 0;

  if (!hasHistory) {
    return (
      <p className="text-sm text-text-muted italic py-6 text-center">
        Aún no hay suficientes datos diarios de {productName} en este periodo.
      </p>
    );
  }

  const lastPrice = detail.priceHistory[detail.priceHistory.length - 1]?.avgPrice ?? 0;
  const firstPrice = detail.priceHistory[0]?.avgPrice ?? 0;
  const periodDelta = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
  const totalKg = detail.priceHistory.reduce((s, p) => s + p.totalKg, 0);

  const chartData = detail.priceHistory.map((p) => ({
    ...p,
    dia: new Date(p.dia).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
  }));

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="Precio actual" value={`${lastPrice.toFixed(3)} €/kg`} />
        <Kpi
          label="Var. en periodo"
          value={`${periodDelta >= 0 ? '+' : ''}${periodDelta.toFixed(1)}%`}
          positive={periodDelta >= 0}
        />
        <Kpi label="Volumen total" value={`${totalKg.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kg`} />
        <Kpi label="Días con datos" value={detail.priceHistory.length.toString()} />
      </div>

      {/* Price history chart */}
      <div>
        <h3 className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">
          Histórico diario de precio medio
        </h3>
        <div className="h-56 bg-white rounded-input border border-border p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(2)}€`} width={50} />
              <Tooltip
                formatter={(v: number) => [`${v.toFixed(3)} €/kg`, 'Precio medio']}
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
            Desglose por calibre
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="h-56 bg-white rounded-input border border-border p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={detail.calibreBreakdown.map((c) => ({ ...c, calibre: c.calibre || 'Sin calibre' }))}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="calibre" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(2)}€`} width={50} />
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(3)} €/kg`, 'Precio medio']}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="avgPrice" fill={PRIMARY} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto bg-white rounded-input border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-text-secondary border-b border-border">
                    <th className="py-2 px-3">Calibre</th>
                    <th className="py-2 px-3 text-right">Precio medio</th>
                    <th className="py-2 px-3 text-right">Volumen</th>
                    <th className="py-2 px-3 text-right">Ops.</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.calibreBreakdown.map((c) => (
                    <tr key={c.calibre} className="border-b border-border/40 last:border-0">
                      <td className="py-1.5 px-3 font-medium text-gray-900">{c.calibre || '—'}</td>
                      <td className="py-1.5 px-3 text-right">{c.avgPrice.toFixed(3)} €/kg</td>
                      <td className="py-1.5 px-3 text-right text-text-secondary">
                        {c.totalKg.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kg
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
    ? 'text-gray-900'
    : positive ? 'text-green-700' : 'text-red-700';
  return (
    <div className="bg-white rounded-input p-2.5 border border-border">
      <p className="text-[10px] text-text-muted mb-0.5 uppercase tracking-wide">{label}</p>
      <p className={`text-base font-semibold ${color}`}>{value}</p>
    </div>
  );
}
