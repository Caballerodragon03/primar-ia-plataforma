'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Download, Edit2, X, XCircle, QrCode, Zap, Lock, MessageSquare, FileText, CheckCircle2, Package, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CoverageBar } from '@/components/ui/CoverageBar';
// Phase 14M v3.11 — PaymentModal (flujo escrow v1) retirado. El comprador
// ahora paga solo la comisión vía /buyer/contracts/[matchId].
import { DisputeModal } from '@/components/ui/DisputeModal';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { RatingModal } from '@/components/RatingModal';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

interface Match {
  id: string;
  cantidadKg: string;
  precioKg: string;
  estado: string;
  scoreMatching?: number | null;
  lote: {
    vendedor: {
      id: string;
      nombre: string;
      apellidos: string;
      scoreFiabilidad?: number | null;
      scoreStatus?: 'NEW_USER' | 'ACTIVE' | 'RESTRICTED';
    };
  };
  transaccion?: { id: string } | null;
}

interface OrderDetail {
  id: string;
  estado: string;
  producto: { nombre: string };
  variedad?: { nombre: string };
  calibresSolicitados: unknown;
  incoterm: string;
  destinoFinal?: string;
  frecuencia?: string;
  costoLogisticaEstimado?: number;
  notasAdicionales?: string;
  fechaEntregaDeseada?: string;
  stripePaymentIntentId?: string;
  contratoPdfUrl?: string;
  coverage: number;
  totalKg: number;
  matches: Match[];
  // Phase 14M v3.25 — número de matches generados que aún no son visibles
  // (delayed por el plan free). El banner amarillo lo usa para nudge upsell.
  hiddenMatchesCount?: number;
}

interface ContractInfo {
  firmaComprador: string | null;
  firmaVendedor: string | null;
  qrToken: string | null;
  qrUsado: boolean;
  hasRated: boolean;
  fotosLoteUrls: string[];
  vendedorId: string;
  compradorId: string;
}

type CalibreItem = { calibre: string; cantidad_kg: number; precio_max_kg: number };

const MATCH_STATE_LABEL_KEYS: Record<string, MessageKey> = {
  PROPUESTO: 'orderDetail.matchEstado.PROPUESTO',
  ENVIADO_VENDEDOR: 'orderDetail.matchEstado.ENVIADO_VENDEDOR',
  ACEPTADO_VENDEDOR: 'orderDetail.matchEstado.ACEPTADO_VENDEDOR',
  RECHAZADO_VENDEDOR: 'orderDetail.matchEstado.RECHAZADO_VENDEDOR',
  PENDIENTE_PAGO: 'orderDetail.matchEstado.PENDIENTE_PAGO',
  CONFIRMADO: 'orderDetail.matchEstado.CONFIRMADO',
  CANCELADO: 'orderDetail.matchEstado.CANCELADO',
};

function DeliveryConfirmInline({ transaccionId, onConfirmed }: { transaccionId: string; onConfirmed: () => void }) {
  const t = useT();
  const [code, setCode] = useState('');
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    if (!code.trim()) { alert(t('orderDetail.codeMissing')); return; }
    setConfirming(true);
    try {
      await api.post(`/contracts/${transaccionId}/confirm-delivery`, { qrToken: code.trim() });
      onConfirmed();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('orderDetail.codeFail');
      alert(msg);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="p-4 space-y-3 bg-amber-50 border-t border-amber-100">
      <p className="text-xs font-semibold text-amber-900">{t('orderDetail.deliveryReceivedPrompt')}</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t('orderDetail.qrCodePlaceholder')}
          className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
        />
        <Button variant="primary" size="sm" loading={confirming} onClick={handleConfirm}>
          {t('orderDetail.confirm')}
        </Button>
      </div>
      <p className="text-[11px] text-amber-700">{t('orderDetail.qrHelp')}</p>
    </div>
  );
}

export default function OrderDetailPage() {
  const t = useT();
  const { locale } = useLocale();
  const dateLoc = locale === 'en' ? 'en-GB' : 'es-ES';
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { id } = params;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // PaymentModal state retirado en v3.11
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [cancelling, setCancelling] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeTransaccionId, setDisputeTransaccionId] = useState<string>('');
  const [disputeOrderInfo, setDisputeOrderInfo] = useState<{ product: string; seller: string; kg: number } | undefined>(undefined);
  const [txInfoMap, setTxInfoMap] = useState<Record<string, ContractInfo>>({});
  const [ratingTx, setRatingTx] = useState<{ transaccionId: string; vendedorId: string } | null>(null);
  // Track which match is being rejected (X button) so we can disable it
  // while the request is in-flight.
  const [rejectingMatchId, setRejectingMatchId] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data.data);
      // Fetch contract info for any match that has a transaction (created when seller accepts)
      const confirmedMatches = (data.data.matches ?? []).filter(
        (m: Match) => m.transaccion?.id !== undefined && m.transaccion?.id !== null
      );
      if (confirmedMatches.length > 0) {
        const infos = await Promise.allSettled(
          confirmedMatches.map((m: Match) =>
            api.get(`/contracts/${m.transaccion!.id}/info`).then((r) => ({ id: m.transaccion!.id, info: r.data.data }))
          )
        );
        const map: Record<string, ContractInfo> = {};
        infos.forEach((r) => {
          if (r.status === 'fulfilled') map[r.value.id] = r.value.info;
        });
        setTxInfoMap(map);
      }
    } catch {
      setError(t('orderDetail.loadFail'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const handlePaymentSuccess = () => { fetchOrder(); };

  const handleCancel = async () => {
    if (!order) return;
    const hasContributions = order.matches.some((m) =>
      ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'].includes(m.estado)
    );
    const msg = hasContributions
      ? t('orderDetail.cancelConfirmWithContrib')
      : t('orderDetail.cancelConfirm');
    if (!confirm(msg)) return;
    setCancelling(true);
    try {
      const { data } = await api.delete(`/orders/${id}`);
      if (data.data?.partialCancel) {
        alert(data.message);
        fetchOrder();
        setCancelling(false);
      } else {
        router.push('/buyer/orders');
      }
    } catch (err: unknown) {
      const errMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? t('orderDetail.cancelFail');
      setError(errMsg);
      setCancelling(false);
    }
  };

  // Phase 14M v3.25 — reject (X) a vendor's proposal from the buyer side.
  // Reuses the existing /contracts/match/:id/cancel endpoint, which sets
  // contratoEstado=CANCELADO and records canceladoPor=buyerId. The matching
  // engine won't re-create this specific lote↔pedido match (only PROPUESTO /
  // ENVIADO_VENDEDOR are upsertable; CANCELADO is terminal).
  const handleRejectMatch = async (matchId: string) => {
    if (!confirm(t('orderDetail.rejectConfirm'))) return;
    setRejectingMatchId(matchId);
    try {
      await api.post(`/contracts/match/${matchId}/cancel`, {
        motivo: t('orderDetail.rejectReason'),
      });
      await fetchOrder();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('orderDetail.rejectFail');
      alert(msg);
    } finally {
      setRejectingMatchId(null);
    }
  };

const openDisputeModal = (match: Match) => {
    if (!match.transaccion?.id || !order) return;
    const pName = order.variedad
      ? `${order.producto.nombre} — ${order.variedad.nombre}`
      : order.producto.nombre;
    setDisputeTransaccionId(match.transaccion.id);
    setDisputeOrderInfo({
      product: pName,
      seller: `${match.lote.vendedor.nombre} ${match.lote.vendedor.apellidos}`.trim(),
      kg: Number(match.cantidadKg),
    });
    setDisputeModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse max-w-4xl mx-auto">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="h-48 bg-muted rounded-card" />
        <div className="h-64 bg-muted rounded-card" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">{error ?? t('orderDetail.notFound')}</p>
        <Button variant="outline" onClick={() => router.push('/buyer/orders')}>{t('orderDetail.backToOrders')}</Button>
      </div>
    );
  }

  const shortId = `ORD${order.id.slice(-5).toUpperCase()}`;
  const productName = order.variedad
    ? `${order.producto.nombre} — ${order.variedad.nombre}`
    : order.producto.nombre;

  const calibres = (order.calibresSolicitados ?? []) as CalibreItem[];
  // Phase 14M v3.12 — logisticsCost ya no se renderiza, queda solo
  // como referencia interna para pedidos antiguos.
  void order.costoLogisticaEstimado;
  const displayCoverage = ['CERRADO', 'TOTALMENTE_CUBIERTO'].includes(order.estado) ? 100 : order.coverage;

  // Only show pre-authorize for matches the seller has explicitly accepted
  const acceptedMatches = order.matches.filter((m) =>
    ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO'].includes(m.estado),
  );
  const canPay = acceptedMatches.length > 0 && !order.stripePaymentIntentId;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link href="/buyer/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {t('orderDetail.backToOrders')}
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{t('orderDetail.title')} #{shortId}: {productName}</h1>
            <StatusBadge status={order.estado} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">{t('orderDetail.coverage')}</span>
            <CoverageBar percentage={displayCoverage} className="w-48" />
            <span className="text-sm font-semibold text-foreground">{Math.round(displayCoverage)}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {['BORRADOR', 'ACTIVO', 'PARCIALMENTE_CUBIERTO'].includes(order.estado) && (
            <Link href={`/buyer/orders/${id}/edit`}>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Edit2 className="w-4 h-4" /> {t('orderDetail.edit')}
              </Button>
            </Link>
          )}
          {!['CANCELADO', 'CERRADO', 'TOTALMENTE_CUBIERTO'].includes(order.estado) && (
            <Button variant="ghost" size="sm" loading={cancelling} onClick={handleCancel} className="flex items-center gap-1">
              <X className="w-4 h-4" /> {t('orderDetail.close')}
            </Button>
          )}
          {order.contratoPdfUrl && (
            <a href={order.contratoPdfUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="primary" size="sm"><Download className="w-4 h-4" /> {t('orderDetail.contract')}</Button>
            </a>
          )}
        </div>
      </div>

      {/* Phase 14M v3.25 — banner CTA para plan free: hay matches generados
          ocultos por el delay de 24h. Convierte la espera en oportunidad de
          upsell. Lo mostramos cuando hiddenMatchesCount>0 (backend computa
          esto consultando visibleDesde > now). */}
      {(order.hiddenMatchesCount ?? 0) > 0 && order.estado !== 'CERRADO' && (
        <Link
          href="/buyer/subscription"
          className="block bg-yellow-50 border border-yellow-200 rounded-card p-4 hover:bg-yellow-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-yellow-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-900">
                {((order.hiddenMatchesCount ?? 0) === 1
                  ? t('orderDetail.hiddenMatches.one')
                  : t('orderDetail.hiddenMatches.many')).replace('{n}', String(order.hiddenMatchesCount))}
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                {t('lotDetail.hiddenMatchesDesc')}
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Closed order banner */}
      {order.estado === 'CERRADO' && (
        <div className="bg-green-50 border border-green-200 rounded-card p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-900">{t('orderDetail.closedTitle')}</p>
            <p className="text-xs text-green-700 mt-0.5">{t('orderDetail.closedDesc')}</p>
          </div>
        </div>
      )}

      {/* Phase 14M v3.11 — banner v2: firmar contrato + pagar comisión.
          Antes: "Pre-Authorize Payment" del flujo legacy v1 que cobraba
          la mercancía completa vía Stripe. El modelo actual es solo
          comisión a Primar-IA + pago de mercancía fuera por transferencia. */}
      {canPay && order.estado !== 'CERRADO' && (
        <div className="bg-amber-50 border border-amber-200 rounded-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Lock className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              {(acceptedMatches.length === 1
                ? t('orderDetail.acceptedContrib.one')
                : t('orderDetail.acceptedContrib.many')).replace('{n}', String(acceptedMatches.length))}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {t('orderDetail.acceptedDesc')}
            </p>
          </div>
          <Link href={`/buyer/contracts/${acceptedMatches[0]!.id}`}>
            <Button variant="primary" size="sm">
              {t('orderDetail.signAndPay')}
            </Button>
          </Link>
        </div>
      )}

      {/* Already authorized but not closed */}
      {order.stripePaymentIntentId && order.estado !== 'CERRADO' && (
        <div className="bg-green-50 border border-green-200 rounded-card p-4 flex items-center gap-3">
          <Lock className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-900">{t('orderDetail.preAuthTitle')}</p>
            <p className="text-xs text-green-700 mt-0.5">{t('orderDetail.preAuthDesc')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: calibres + matches */}
        <div className="lg:col-span-2 space-y-5 min-w-0">
          {/* Calibres requested */}
          <div className="bg-card rounded-card border border-border shadow-soft overflow-x-auto">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">{t('orderDetail.requestedCalibres')}</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  {[t('orderDetail.col.calibre'), t('orderDetail.col.quantity'), t('orderDetail.col.maxPrice')].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {calibres.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-muted-foreground">{t('orderDetail.noCalibres')}</td></tr>
                ) : calibres.map((c, i) => (
                  <tr key={i} className="hover:bg-accent/50">
                    <td className="px-4 py-2.5 font-medium">{c.calibre || '—'}</td>
                    <td className="px-4 py-2.5">{Number(c.cantidad_kg).toLocaleString(dateLoc)}</td>
                    <td className="px-4 py-2.5">€{Number(c.precio_max_kg).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Farmer contributions — Phase 14L: lista vertical de tarjetas
              (mismo formato que /seller/lots/[id]) para que quepa sin
              scroll horizontal y se entienda de un vistazo. */}
          {/* Phase 14M v3.25 — el comprador SOLO ve matches donde el vendedor
              ha actuado (estado >= ACEPTADO_VENDEDOR). Los PROPUESTO son
              sugerencias automáticas del sistema antes de que el vendedor
              decida — no debería aparecer al comprador como "oferta". */}
          {(() => {
            const visibleMatches = order.matches.filter(
              (m) => m.estado !== 'PROPUESTO' && m.estado !== 'ENVIADO_VENDEDOR',
            );
            return (
          <div data-tutorial="ofertas-vendedores" className="bg-card rounded-card border border-border shadow-soft">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                {t('orderDetail.sellerOffers')} ({visibleMatches.length})
              </h2>
            </div>
            {visibleMatches.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">{t('orderDetail.noOffers')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('orderDetail.noOffersHint')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {visibleMatches.map((m) => {
                  const kg = Number(m.cantidadKg);
                  const price = Number(m.precioKg);
                  const canPayThis = m.estado === 'ACEPTADO_VENDEDOR' && !order.stripePaymentIntentId;
                  const totalEur = kg > 0 && price > 0 ? kg * price : 0;
                  const sellerName = `${m.lote.vendedor.nombre ?? ''} ${m.lote.vendedor.apellidos ?? ''}`.trim();
                  const isLive = ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'].includes(m.estado);
                  return (
                    <li key={m.id} className="p-4 hover:bg-accent/30">
                      {/* Header: vendedor + cantidad/precio + estado */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{sellerName || 'Vendedor'}</span>
                            {m.lote.vendedor.scoreFiabilidad !== undefined && m.lote.vendedor.scoreStatus !== undefined && (
                              <ScoreBadge
                                score={m.lote.vendedor.scoreFiabilidad ?? null}
                                status={m.lote.vendedor.scoreStatus}
                                size="sm"
                              />
                            )}
                            {m.scoreMatching != null && (
                              <span className={[
                                'inline-flex items-center px-2 py-0.5 rounded-badge text-[10px] font-semibold',
                                m.scoreMatching >= 0.7 ? 'bg-green-100 text-green-700' :
                                m.scoreMatching >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-muted text-muted-foreground',
                              ].join(' ')}>
                                {t('orderDetail.matchScore')} {Math.round(m.scoreMatching * 100)}/100
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-baseline gap-2 flex-wrap text-xs text-text-secondary">
                            <span>
                              <span className="font-medium text-foreground">{kg.toLocaleString(dateLoc)}</span> kg
                            </span>
                            <span aria-hidden>·</span>
                            <span>
                              {price > 0 ? <><span className="font-medium text-foreground">€{price.toFixed(3)}</span>/kg</> : '— €/kg'}
                            </span>
                            {totalEur > 0 && (
                              <>
                                <span aria-hidden>·</span>
                                <span>
                                  {t('orderDetail.totalLabel')} <span className="font-medium text-foreground">€{totalEur.toLocaleString(dateLoc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={[
                            'inline-flex items-center px-2 py-0.5 rounded-badge text-[11px] font-medium',
                            m.estado === 'ACEPTADO_VENDEDOR' ? 'bg-green-100 text-green-700' :
                            m.estado === 'PROPUESTO' ? 'bg-yellow-100 text-yellow-700' :
                            m.estado === 'CONFIRMADO' ? 'bg-blue-100 text-blue-700' :
                            'bg-muted text-muted-foreground',
                          ].join(' ')}>
                            {(() => { const k = MATCH_STATE_LABEL_KEYS[m.estado]; return k ? t(k) : m.estado; })()}
                          </span>
                          {m.estado === 'ACEPTADO_VENDEDOR' && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title={t('orderDetail.proposalTooltip')} />
                          )}
                          {/* X button: only when the buyer can still walk
                              away from this proposal (pre-payment). After
                              PENDIENTE_PAGO/CONFIRMADO the contract is in
                              motion and the regular cancel/dispute flows
                              kick in. */}
                          {m.estado === 'ACEPTADO_VENDEDOR' && !canPayThis ? null : null}
                          {m.estado === 'ACEPTADO_VENDEDOR' && (
                            <button
                              type="button"
                              onClick={() => handleRejectMatch(m.id)}
                              disabled={rejectingMatchId === m.id}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
                              title={t('orderDetail.rejectProposal')}
                              aria-label={t('orderDetail.rejectProposal')}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Footer: acciones */}
                      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                        {order.estado === 'CERRADO' ? (
                          <>
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {t('orderDetail.completed')}
                            </span>
                            {m.transaccion?.id && (
                              <button
                                onClick={async () => { try { const r = await api.get(`/invoices/buyer/${m.transaccion!.id}/html`, { responseType: 'text' }); window.open(URL.createObjectURL(new Blob([r.data], { type: 'text/html' })), '_blank'); } catch { /* ignore */ } }}
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                              >
                                <Download className="w-3 h-3" /> {t('orderDetail.invoice')}
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {canPayThis && (
                              <Link href={`/buyer/contracts/${m.id}`}>
                                <Button variant="primary" size="sm">
                                  {t('orderDetail.signAndPay')}
                                </Button>
                              </Link>
                            )}
                            {isLive && (
                              <Link href={`/buyer/contracts/${m.id}`} title={t('orderDetail.viewContract')} aria-label={t('orderDetail.viewContract')}>
                                <Button variant="outline" size="sm" className="!px-2">
                                  <FileText className="w-4 h-4" />
                                </Button>
                              </Link>
                            )}
                            {/* Phase 14M v3.19 — botón QR retirado. La
                                confirmación de entrega ahora se hace desde la
                                pantalla del contrato (mark-received tras el
                                aviso del vendedor de envío). */}
                            {m.transaccion?.id && (
                              <Link href={`/buyer/messages?tx=${m.transaccion.id}`} title={t('orderDetail.openChat')} aria-label={t('orderDetail.openChat')}>
                                <Button variant="ghost" size="sm" className="!px-2">
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                              </Link>
                            )}
                            {m.transaccion?.id && isLive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDisputeModal(m)}
                                className="!px-2 ml-auto text-red-500 hover:text-red-700 hover:bg-red-50"
                                title={t('orderDetail.openDispute')}
                                aria-label={t('orderDetail.openDispute')}
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
            );
          })()}
          {/* Inline delivery sections for matches with a transaction */}
          {order.matches
            .filter((m) => m.transaccion?.id && txInfoMap[m.transaccion.id])
            .map((m) => {
              const info = txInfoMap[m.transaccion!.id]!;
              const sellerName = `${m.lote.vendedor.nombre} ${m.lote.vendedor.apellidos}`.trim();
              return (
                <div key={m.id} className="bg-card rounded-card border border-border shadow-soft overflow-hidden">
                  <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      <h2 className="text-sm font-semibold text-foreground">{t('orderDetail.shipmentFrom')} {sellerName}</h2>
                    </div>
                    {info.qrUsado && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge text-[11px] font-medium bg-green-100 text-green-700">
                        <CheckCircle2 className="w-3 h-3" /> {t('orderDetail.delivered')}
                      </span>
                    )}
                  </div>

                  {/* Lot photos */}
                  {(info.fotosLoteUrls?.length ?? 0) > 0 && (
                    <div className="p-4 border-b border-border">
                      <p className="text-xs font-medium text-foreground mb-2">{t('orderDetail.lotPhotos')}</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {info.fotosLoteUrls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-border hover:shadow-soft-md transition-shadow">
                            <img src={url} alt={`Foto del lote ${i + 1}`} className="w-full h-20 object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* QR confirmation */}
                  {!info.qrUsado && info.qrToken && (
                    <DeliveryConfirmInline
                      transaccionId={m.transaccion!.id}
                      onConfirmed={() => fetchOrder()}
                    />
                  )}
                  {info.qrUsado && (
                    <div className="p-4 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <p className="text-sm font-medium">{t('orderDetail.deliveryConfirmed')}</p>
                      </div>
                      {info.hasRated ? (
                        <p className="text-xs text-muted-foreground">{t('orderDetail.alreadyRated')}</p>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                          onClick={() => setRatingTx({ transaccionId: m.transaccion!.id, vendedorId: info.vendedorId })}
                        >
                          <Star className="w-3.5 h-3.5" /> {t('orderDetail.rateSeller')}
                        </Button>
                      )}
                    </div>
                  )}
                  {/* Phase 14M v3.15 — Diferenciar los 3 estados pre-QR.
                      Antes mostraba "Contrato firmado" en cuanto firmaba el
                      vendedor, lo cual contradice el banner superior que
                      pedía firmar+pagar al comprador. */}
                  {!info.qrToken && !info.firmaVendedor && (
                    <div className="p-4 text-xs text-muted-foreground">
                      {t('orderDetail.waitingSellerSig')}
                    </div>
                  )}
                  {!info.qrToken && info.firmaVendedor && !info.firmaComprador && (
                    <div className="p-4 text-xs text-amber-700 bg-amber-50 border-t border-amber-200">
                      {t('orderDetail.sellerSignedAwaitYou')}
                    </div>
                  )}
                  {!info.qrToken && info.firmaVendedor && info.firmaComprador && (
                    <div className="p-4 text-xs text-muted-foreground">
                      {t('orderDetail.bothSignedAwaitShipment')}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Right: order details */}
        <div className="space-y-5">
          <div className="bg-card rounded-card border border-border shadow-soft p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">{t('orderDetail.details')}</h2>
            <dl className="space-y-3">
              {[
                { label: t('orderDetail.product'), value: order.producto.nombre },
                order.variedad ? { label: t('orderDetail.variety'), value: order.variedad.nombre } : null,
                { label: t('orderDetail.totalQty'), value: `${order.totalKg.toLocaleString(dateLoc)} kg` },
                { label: t('orderDetail.incoterm'), value: order.incoterm },
                order.destinoFinal ? { label: t('orderDetail.destination'), value: order.destinoFinal } : null,
                order.frecuencia ? { label: t('orderDetail.frequency'), value: order.frecuencia } : null,
                order.fechaEntregaDeseada ? {
                  label: t('orderDetail.deliveryBy'),
                  value: new Date(order.fechaEntregaDeseada).toLocaleDateString(dateLoc),
                } : null,
                // Phase 14M v3.12 — fila "Logística est." retirada: era
                // un dato que el comprador introducía sin que Primar-IA lo
                // usara para nada. Volverá cuando integremos transportistas.
              ].filter((x): x is { label: string; value: string } => x !== null).map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="text-xs text-muted-foreground shrink-0">{label}</dt>
                  <dd className="text-xs font-medium text-foreground text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {order.notasAdicionales && (
            <div className="bg-card rounded-card border border-border shadow-soft p-5">
              <h2 className="text-sm font-semibold text-foreground mb-2">{t('orderDetail.notes')}</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">{order.notasAdicionales}</p>
            </div>
          )}
        </div>
      </div>

      {/* Dispute Modal */}
      <DisputeModal
        isOpen={disputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        transaccionId={disputeTransaccionId}
        orderInfo={disputeOrderInfo}
        onSuccess={fetchOrder}
      />

      {/* Rating Modal */}
      {ratingTx && (
        <RatingModal
          transaccionId={ratingTx.transaccionId}
          destinatarioId={ratingTx.vendedorId}
          tipo="COMPRADOR_A_VENDEDOR"
          onClose={() => setRatingTx(null)}
          onSuccess={fetchOrder}
        />
      )}

      {/* Phase 14M v3.11 — PaymentModal retirado. El pago de la comisión
          se hace ahora desde /buyer/contracts/[matchId] (flujo v2). */}
    </div>
  );
}
