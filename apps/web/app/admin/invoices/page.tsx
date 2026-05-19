'use client';

/**
 * Phase 14I — Ingresos propios de Primar-IA para presentar a Hacienda.
 *
 * Dos fuentes:
 *   1. Comisiones cobradas a compradores al firmar contrato (factura PDF
 *      generada por nosotros, IVA por régimen fiscal vendedor — Fase 5).
 *   2. Suscripciones recurrentes (facturación emitida por Stripe; el admin
 *      consulta cada suscripción individualmente en el dashboard Stripe).
 *
 * Reemplaza la pantalla legacy que decía "este listado ha sido retirado".
 */
import { useEffect, useState, useMemo } from 'react';
import { Receipt, ExternalLink, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface ComisionItem {
  id: string;
  matchId: string;
  fecha: string | null;
  comprador: { email: string; empresa: string | null; cifNif: string | null };
  vendedor: { email: string; empresa: string | null };
  importe: number;
  porcentaje: number;
  baseImponible: number;
  cantidadKg: number;
  stripeChargeId: string | null;
  facturaUrl: string | null;
}

interface SuscripcionItem {
  id: string;
  userId: string;
  email: string;
  empresa: string | null;
  cifNif: string | null;
  plan: string | null;
  tipo: 'vendedor' | 'comprador';
  precioMensual: number;
  estado: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  fechaInicio: string;
  trialEndsAt: string | null;
  cancelledAt: string | null;
}

interface IncomeData {
  comisiones: {
    items: ComisionItem[];
    totalMes: number;
    totalAno: number;
    totalHistorico: number;
    count: number;
  };
  suscripciones: {
    items: SuscripcionItem[];
    mrrTotal: number;
    activasCount: number;
    count: number;
  };
}

const fmtEur = (n: number) => `€${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export default function AdminPlatformIncomePage() {
  const [data, setData] = useState<IncomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'comisiones' | 'suscripciones'>('comisiones');

  useEffect(() => {
    api
      .get('/admin/platform-income')
      .then((res) => {
        setData((res.data as { data: IncomeData }).data);
      })
      .catch((err: unknown) => {
        setError(
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            'No se pudo cargar el listado de ingresos.',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const mrrAnual = useMemo(() => (data ? data.suscripciones.mrrTotal * 12 : 0), [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="bg-red-50 border border-red-200 rounded-card p-5">
          <p className="text-sm font-semibold text-red-900">No se pudo cargar el listado</p>
          <p className="text-xs text-red-700 mt-1">{error}</p>
          <Link href="/admin/dashboard" className="text-xs text-primary-dark hover:underline mt-3 inline-block">
            ← Volver al panel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
          <Receipt className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Ingresos de Primar-IA</h1>
          <p className="text-xs text-muted-foreground">
            Comisiones cobradas y suscripciones activas — para presentar a Hacienda.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Comisiones (mes)</p>
          <p className="text-xl font-bold text-foreground mt-1">{fmtEur(data.comisiones.totalMes)}</p>
        </div>
        <div className="bg-card border border-border rounded-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Comisiones (año)</p>
          <p className="text-xl font-bold text-foreground mt-1">{fmtEur(data.comisiones.totalAno)}</p>
        </div>
        <div className="bg-card border border-border rounded-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">MRR suscripciones</p>
          <p className="text-xl font-bold text-foreground mt-1">{fmtEur(data.suscripciones.mrrTotal)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{data.suscripciones.activasCount} activas</p>
        </div>
        <div className="bg-card border border-border rounded-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">ARR estimado</p>
          <p className="text-xl font-bold text-foreground mt-1">{fmtEur(mrrAnual)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('comisiones')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            tab === 'comisiones'
              ? 'border-primary-dark text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Comisiones cobradas ({data.comisiones.count})
        </button>
        <button
          onClick={() => setTab('suscripciones')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            tab === 'suscripciones'
              ? 'border-primary-dark text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Suscripciones ({data.suscripciones.count})
        </button>
      </div>

      {/* Comisiones */}
      {tab === 'comisiones' && (
        <div className="bg-card border border-border rounded-card overflow-hidden">
          {data.comisiones.items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Aún no hay comisiones cobradas. Las facturas se generan automáticamente al firmar cada contrato.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Fecha</th>
                    <th className="text-left px-3 py-2 font-medium">Comprador</th>
                    <th className="text-left px-3 py-2 font-medium">Vendedor</th>
                    <th className="text-right px-3 py-2 font-medium">Base</th>
                    <th className="text-right px-3 py-2 font-medium">%</th>
                    <th className="text-right px-3 py-2 font-medium">Comisión</th>
                    <th className="text-left px-3 py-2 font-medium">Stripe</th>
                    <th className="text-left px-3 py-2 font-medium">Factura</th>
                  </tr>
                </thead>
                <tbody>
                  {data.comisiones.items.map((c) => (
                    <tr key={c.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-3 py-2 text-xs text-text-secondary whitespace-nowrap">{fmtDate(c.fecha)}</td>
                      <td className="px-3 py-2 text-xs">
                        <div className="text-foreground">{c.comprador.empresa ?? c.comprador.email}</div>
                        {c.comprador.cifNif && (
                          <div className="text-[10px] text-muted-foreground">{c.comprador.cifNif}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-text-secondary">
                        {c.vendedor.empresa ?? c.vendedor.email}
                      </td>
                      <td className="px-3 py-2 text-xs text-right text-text-secondary">{fmtEur(c.baseImponible)}</td>
                      <td className="px-3 py-2 text-xs text-right text-text-secondary">
                        {(c.porcentaje * 100).toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-semibold text-foreground">
                        {fmtEur(c.importe)}
                      </td>
                      <td className="px-3 py-2 text-[10px] font-mono text-muted-foreground">
                        {c.stripeChargeId ? (
                          <a
                            href={`https://dashboard.stripe.com/payments/${c.stripeChargeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline inline-flex items-center gap-1"
                          >
                            {c.stripeChargeId.slice(0, 14)}…
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {c.facturaUrl ? (
                          <a
                            href={c.facturaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-dark hover:underline inline-flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            PDF
                          </a>
                        ) : (
                          <span className="text-[10px] text-amber-600">Pendiente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30">
                  <tr className="border-t border-border">
                    <td colSpan={5} className="px-3 py-2 text-xs font-semibold text-right">
                      Total histórico
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-right text-foreground">
                      {fmtEur(data.comisiones.totalHistorico)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Suscripciones */}
      {tab === 'suscripciones' && (
        <div className="bg-card border border-border rounded-card overflow-hidden">
          {data.suscripciones.items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Aún no hay suscripciones de pago. La facturación recurrente la emite Stripe directamente.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Cliente</th>
                    <th className="text-left px-3 py-2 font-medium">Plan</th>
                    <th className="text-left px-3 py-2 font-medium">Estado</th>
                    <th className="text-right px-3 py-2 font-medium">€/mes</th>
                    <th className="text-left px-3 py-2 font-medium">Desde</th>
                    <th className="text-left px-3 py-2 font-medium">Stripe</th>
                  </tr>
                </thead>
                <tbody>
                  {data.suscripciones.items.map((s) => (
                    <tr key={s.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-3 py-2 text-xs">
                        <div className="text-foreground">{s.empresa ?? s.email}</div>
                        <div className="text-[10px] text-muted-foreground">{s.cifNif ?? s.email}</div>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span className="font-semibold text-foreground">{s.plan ?? '—'}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">({s.tipo})</span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-badge text-[10px] font-medium ${
                            s.estado === 'ACTIVA'
                              ? 'bg-emerald-100 text-emerald-700'
                              : s.estado === 'TRIAL'
                              ? 'bg-blue-100 text-blue-700'
                              : s.estado === 'PAUSADA'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {s.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-semibold text-foreground">
                        {fmtEur(s.precioMensual)}
                      </td>
                      <td className="px-3 py-2 text-xs text-text-secondary whitespace-nowrap">{fmtDate(s.fechaInicio)}</td>
                      <td className="px-3 py-2 text-[10px] font-mono text-muted-foreground">
                        {s.stripeSubscriptionId ? (
                          <a
                            href={`https://dashboard.stripe.com/subscriptions/${s.stripeSubscriptionId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline inline-flex items-center gap-1"
                            title="Ver facturas en Stripe"
                          >
                            {s.stripeSubscriptionId.slice(0, 14)}…
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30">
                  <tr className="border-t border-border">
                    <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-right">
                      MRR total ({data.suscripciones.activasCount} activas)
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-right text-foreground">
                      {fmtEur(data.suscripciones.mrrTotal)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <div className="border-t border-border bg-blue-50/40 px-4 py-3 text-[11px] text-text-secondary">
            <strong className="text-foreground">Nota:</strong> Las facturas recurrentes de suscripción las
            emite Stripe directamente al cliente. Para descargarlas para Hacienda, accede al{' '}
            <a
              href="https://dashboard.stripe.com/invoices"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-dark hover:underline"
            >
              dashboard de Stripe → Facturas
            </a>{' '}
            o usa el enlace directo de cada suscripción.
          </div>
        </div>
      )}

      <div className="pt-2">
        <Link href="/admin/dashboard" className="text-xs text-primary-dark hover:underline">
          ← Volver al panel
        </Link>
      </div>
    </div>
  );
}
