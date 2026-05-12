/* Public market analytics — no auth required.
   Shows aggregated platform prices + weekly sentiment summary from the MAPA bulletin. */
import Link from 'next/link';
import { TrendingUp, TrendingDown, ExternalLink, BarChart3, FileText } from 'lucide-react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface PriceRow {
  productoId: string;
  producto: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  totalKg: number;
  numTransacciones: number;
}

interface Highlights {
  alza: string[];
  baja: string[];
  sentimiento: string;
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

// Server component — runs on every request, no client-side fetch needed
export const revalidate = 120; // 2 min

async function getPrices(): Promise<{ prices: PriceRow[]; windowDays: number } | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/market/prices?days=30`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

async function getSentiment(): Promise<{ report: Report | null; sources: { boletinSemanal: string; powerBiNacional: string } } | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/market/sentiment`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

function sentimentBadge(s: string | undefined): { label: string; classes: string } {
  switch ((s ?? '').toLowerCase()) {
    case 'alcista':
      return { label: 'Alcista', classes: 'bg-green-100 text-green-800 border-green-200' };
    case 'bajista':
      return { label: 'Bajista', classes: 'bg-red-100 text-red-800 border-red-200' };
    case 'mixto':
      return { label: 'Mixto', classes: 'bg-amber-100 text-amber-800 border-amber-200' };
    default:
      return { label: 'Estable', classes: 'bg-blue-100 text-blue-800 border-blue-200' };
  }
}

export default async function MarketPage() {
  const [pricesData, sentimentData] = await Promise.all([getPrices(), getSentiment()]);
  const prices = pricesData?.prices ?? [];
  const report = sentimentData?.report ?? null;
  const sources = sentimentData?.sources;
  const sentiment = report?.highlights ? sentimentBadge(report.highlights.sentimiento) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Primar<span className="text-primary">-IA</span>
          </Link>
          <div className="flex gap-3 text-sm">
            <Link href="/login" className="text-secondary hover:underline">Iniciar sesión</Link>
            <Link href="/register" className="bg-primary text-gray-900 font-semibold px-4 py-1.5 rounded-button hover:opacity-90 transition-opacity">
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Análisis de Mercado</h1>
          <p className="text-secondary">
            Precios medios reales de la plataforma y resumen semanal del boletín oficial del MAPA
          </p>
        </section>

        {/* Weekly sentiment */}
        <section className="bg-white rounded-card border border-border p-6">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5 text-secondary" />
                <h2 className="text-xl font-semibold text-gray-900">Análisis Semanal</h2>
                {sentiment && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sentiment.classes}`}>
                    {sentiment.label}
                  </span>
                )}
              </div>
              {report && (
                <p className="text-xs text-text-muted">
                  Semana {report.semana} · {report.periodo}
                </p>
              )}
            </div>
            {report && (
              <a
                href={report.fuenteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-secondary hover:underline flex items-center gap-1"
              >
                Ver boletín oficial <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {report ? (
            <>
              <p className="text-sm text-gray-700 leading-relaxed mb-5 whitespace-pre-line">
                {report.resumen}
              </p>

              {report.highlights && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.highlights.alza?.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-input p-4">
                      <div className="flex items-center gap-2 mb-2 text-green-800 font-medium text-sm">
                        <TrendingUp className="w-4 h-4" /> Productos al alza
                      </div>
                      <ul className="space-y-1 text-sm text-green-900">
                        {report.highlights.alza.map((item, i) => (
                          <li key={i} className="leading-snug">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {report.highlights.baja?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-input p-4">
                      <div className="flex items-center gap-2 mb-2 text-red-800 font-medium text-sm">
                        <TrendingDown className="w-4 h-4" /> Productos a la baja
                      </div>
                      <ul className="space-y-1 text-sm text-red-900">
                        {report.highlights.baja.map((item, i) => (
                          <li key={i} className="leading-snug">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-text-muted italic">
              Aún no hay análisis disponible. El próximo informe se generará el lunes.
            </p>
          )}

          {sources && (
            <div className="mt-5 pt-4 border-t border-border text-xs text-text-muted">
              <p className="mb-1 font-medium">Fuentes oficiales:</p>
              <ul className="space-y-0.5">
                <li>
                  · <a href={sources.boletinSemanal} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                    Boletín semanal de precios de frutas y hortalizas — MAPA
                  </a>
                </li>
                <li>
                  · <a href={sources.powerBiNacional} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                    Precios medios nacionales (Power BI) — MAPA
                  </a>
                </li>
              </ul>
            </div>
          )}
        </section>

        {/* Platform prices */}
        <section className="bg-white rounded-card border border-border p-6">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-secondary" />
            <h2 className="text-xl font-semibold text-gray-900">Precios en Primar-IA</h2>
          </div>
          <p className="text-xs text-text-muted mb-5">
            Precios medios de transacciones confirmadas en los últimos {pricesData?.windowDays ?? 30} días
          </p>

          {prices.length === 0 ? (
            <p className="text-sm text-text-muted italic py-8 text-center">
              Aún no hay suficientes transacciones para mostrar precios medios.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-text-secondary border-b border-border">
                    <th className="pb-2 pr-4">Producto</th>
                    <th className="pb-2 pr-4 text-right">Precio medio</th>
                    <th className="pb-2 pr-4 text-right">Rango</th>
                    <th className="pb-2 pr-4 text-right">Volumen (kg)</th>
                    <th className="pb-2 text-right">Transacciones</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((p) => (
                    <tr key={p.productoId} className="border-b border-border/50 hover:bg-gray-50">
                      <td className="py-2.5 pr-4 font-medium text-gray-900">{p.producto}</td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-gray-900">
                        {p.avgPrice.toFixed(3)} €/kg
                      </td>
                      <td className="py-2.5 pr-4 text-right text-xs text-text-secondary">
                        {p.minPrice.toFixed(2)} – {p.maxPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-text-secondary">
                        {p.totalKg.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2.5 text-right text-text-secondary">{p.numTransacciones}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Upsell to premium analytics */}
        <section className="bg-gradient-to-r from-primary/10 to-amber-50 border border-primary/30 rounded-card p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            ¿Quieres ver análisis detallado por producto?
          </h3>
          <p className="text-sm text-text-secondary mb-4 max-w-xl mx-auto">
            Con cualquier suscripción accedes a histórico de precios diario, desglose por calibre,
            tendencias regionales y comparativa con el mercado oficial.
          </p>
          <Link
            href="/register"
            className="inline-block bg-primary text-gray-900 font-semibold px-6 py-2.5 rounded-button hover:opacity-90 transition-opacity"
          >
            Crear cuenta gratuita
          </Link>
        </section>
      </main>
    </div>
  );
}
