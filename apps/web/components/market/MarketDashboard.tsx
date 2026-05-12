'use client';
import { useEffect, useMemo, useState } from 'react';
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
import { TrendingUp, TrendingDown, ExternalLink, Lock, FileText } from 'lucide-react';
import { api } from '@/lib/api';

const PRIMARY = '#E1C44D';
const SECONDARY = '#0B2E33';

type Product = { id: string; nombre: string; categoria?: string };

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
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string>('');
  const [days, setDays] = useState<number>(90);
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial: load product list + latest report (public)
  useEffect(() => {
    Promise.all([
      api.get<{ data: Product[] }>('/products'),
      api.get<{ data: { report: Report | null } }>('/market/sentiment'),
    ])
      .then(([prodRes, sentRes]) => {
        const list = prodRes.data.data ?? [];
        setProducts(list);
        if (list.length > 0 && list[0]) setProductId(list[0].id);
        setReport(sentRes.data.data.report ?? null);
      })
      .catch(() => setError('No se pudieron cargar los datos iniciales'))
      .finally(() => setLoading(false));
  }, []);

  // Fetch detail whenever product or window changes
  useEffect(() => {
    if (!productId) return;
    setDetailLoading(true);
    setAccessDenied(false);
    setError(null);
    api
      .get<{ data: ProductDetail }>(`/market/premium/products/${productId}?days=${days}`)
      .then(({ data }) => setDetail(data.data))
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          setAccessDenied(true);
          setDetail(null);
        } else {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          setError(msg ?? 'No se pudo cargar el detalle del producto');
        }
      })
      .finally(() => setDetailLoading(false));
  }, [productId, days]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId],
  );

  const sentiment = report?.highlights ? sentimentBadge(report.highlights.sentimiento) : null;

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 bg-gray-100 rounded animate-pulse w-64" />
        <div className="h-64 bg-gray-100 rounded-card animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Análisis de Mercado</h1>
        <p className="text-sm text-text-secondary">
          Tendencias por producto basadas en operaciones reales de la plataforma.
        </p>
      </div>

      {/* Weekly sentiment summary (always public, shown to all) */}
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

      {/* Per-product premium analytics */}
      <section className="bg-white border border-border rounded-card p-5">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Detalle por producto</h2>
            <p className="text-xs text-text-muted">Histórico diario y desglose por calibre</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="border border-border rounded-input px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            <div className="inline-flex rounded-input border border-border overflow-hidden text-xs">
              {WINDOWS.map((w) => (
                <button
                  key={w.days}
                  onClick={() => setDays(w.days)}
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
        </div>

        {accessDenied ? (
          <div className="bg-gradient-to-br from-primary/10 to-amber-50 border border-primary/40 rounded-card p-8 text-center">
            <Lock className="w-10 h-10 text-secondary mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              El análisis detallado requiere una suscripción activa
            </h3>
            <p className="text-sm text-text-secondary mb-4 max-w-md mx-auto">
              Accede a histórico de precios diario, desglose por calibre y comparativas
              regionales con cualquiera de nuestros planes de pago.
            </p>
            <Link
              href="../subscription"
              className="inline-block bg-primary text-gray-900 font-semibold px-5 py-2 rounded-button hover:opacity-90 transition-opacity text-sm"
            >
              Ver planes
            </Link>
          </div>
        ) : detailLoading ? (
          <div className="space-y-4">
            <div className="h-64 bg-gray-100 rounded animate-pulse" />
            <div className="h-40 bg-gray-100 rounded animate-pulse" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</p>
        ) : detail ? (
          <ProductDetailView detail={detail} productName={selectedProduct?.nombre ?? ''} />
        ) : null}
      </section>
    </div>
  );
}

function ProductDetailView({ detail, productName }: { detail: ProductDetail; productName: string }) {
  const hasHistory = detail.priceHistory.length > 0;
  const hasCalibres = detail.calibreBreakdown.length > 0;

  const lastPrice = hasHistory ? detail.priceHistory[detail.priceHistory.length - 1]?.avgPrice ?? 0 : 0;
  const firstPrice = hasHistory ? detail.priceHistory[0]?.avgPrice ?? 0 : 0;
  const delta = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

  const totalKg = detail.priceHistory.reduce((s, p) => s + p.totalKg, 0);

  // Format dates for chart
  const chartData = detail.priceHistory.map((p) => ({
    ...p,
    dia: new Date(p.dia).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
  }));

  if (!hasHistory) {
    return (
      <p className="text-sm text-text-muted italic py-8 text-center">
        Aún no hay suficientes transacciones confirmadas para {productName} en este periodo.
        El detalle aparecerá cuando se completen las primeras operaciones.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Precio medio actual" value={`${lastPrice.toFixed(3)} €/kg`} />
        <Kpi label="Variación periodo" value={`${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`} positive={delta >= 0} />
        <Kpi label="Volumen total" value={`${totalKg.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kg`} />
        <Kpi label="Días con datos" value={detail.priceHistory.length.toString()} />
      </div>

      {/* Price history chart */}
      <div>
        <h3 className="text-sm font-medium text-text-secondary mb-2">Histórico de precio medio (€/kg)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(2)}€`} />
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
          <h3 className="text-sm font-medium text-text-secondary mb-2">Desglose por calibre</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={detail.calibreBreakdown.map(c => ({ ...c, calibre: c.calibre || 'Sin calibre' }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="calibre" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(2)}€`} />
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(3)} €/kg`, 'Precio medio']}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="avgPrice" fill={PRIMARY} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-text-secondary border-b border-border">
                    <th className="pb-2 pr-3">Calibre</th>
                    <th className="pb-2 pr-3 text-right">Precio medio</th>
                    <th className="pb-2 pr-3 text-right">Volumen</th>
                    <th className="pb-2 text-right">Ops.</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.calibreBreakdown.map((c) => (
                    <tr key={c.calibre} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-medium text-gray-900">{c.calibre || '—'}</td>
                      <td className="py-2 pr-3 text-right">{c.avgPrice.toFixed(3)} €/kg</td>
                      <td className="py-2 pr-3 text-right text-text-secondary">
                        {c.totalKg.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kg
                      </td>
                      <td className="py-2 text-right text-text-secondary">{c.n}</td>
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
    <div className="bg-gray-50 rounded-input p-3">
      <p className="text-xs text-text-muted mb-0.5">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}
