'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Download, Edit2, X, QrCode, Zap, Lock, MessageSquare, FileText, CheckCircle2, Package, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CoverageBar } from '@/components/ui/CoverageBar';
import { PaymentModal } from '@/components/ui/PaymentModal';
import { DisputeModal } from '@/components/ui/DisputeModal';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { RatingModal } from '@/components/RatingModal';

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

function formatEur(amount: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}

const MATCH_STATE_LABELS: Record<string, string> = {
  PROPUESTO: 'Propuesto',
  ENVIADO_VENDEDOR: 'Enviado al vendedor',
  ACEPTADO_VENDEDOR: 'Aceptado',
  RECHAZADO_VENDEDOR: 'Rechazado',
  PENDIENTE_PAGO: 'Pendiente de pago',
  CONFIRMADO: 'Confirmado',
  CANCELADO: 'Cancelado',
};

function DeliveryConfirmInline({ transaccionId, onConfirmed }: { transaccionId: string; onConfirmed: () => void }) {
  const [code, setCode] = useState('');
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    if (!code.trim()) { alert('Enter the verification code.'); return; }
    setConfirming(true);
    try {
      await api.post(`/contracts/${transaccionId}/confirm-delivery`, { qrToken: code.trim() });
      onConfirmed();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Verification failed.';
      alert(msg);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="p-4 space-y-3 bg-amber-50 border-t border-amber-100">
      <p className="text-xs font-semibold text-amber-900">📦 Received the shipment? Confirm delivery to release payment.</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter QR / verification code..."
          className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
        />
        <Button variant="primary" size="sm" loading={confirming} onClick={handleConfirm}>
          Confirm
        </Button>
      </div>
      <p className="text-[11px] text-amber-700">The code is printed on the QR label attached to the lot. Payment will be released to the seller once confirmed.</p>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { id } = params;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [cancelling, setCancelling] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeTransaccionId, setDisputeTransaccionId] = useState<string>('');
  const [disputeOrderInfo, setDisputeOrderInfo] = useState<{ product: string; seller: string; kg: number } | undefined>(undefined);
  const [txInfoMap, setTxInfoMap] = useState<Record<string, ContractInfo>>({});
  const [ratingTx, setRatingTx] = useState<{ transaccionId: string; vendedorId: string } | null>(null);

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
      setError('Error al cargar los detalles del pedido.');
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
      ? 'This order has committed seller contributions. Only the uncommitted part will be cancelled. The committed quantities will be kept and the order will be marked as completed. Continue?'
      : '¿Seguro que quieres cerrar este pedido? Esta acción no se puede deshacer.';
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
        ?? 'No se pudo cancelar el pedido.';
      setError(errMsg);
      setCancelling(false);
    }
  };

  const openPaymentModal = (matchId: string) => {
    setSelectedMatchId(matchId);
    setPaymentModalOpen(true);
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
        <p className="text-red-600 mb-4">{error ?? 'Pedido no encontrado.'}</p>
        <Button variant="outline" onClick={() => router.push('/buyer/orders')}>Volver a pedidos</Button>
      </div>
    );
  }

  const shortId = `ORD${order.id.slice(-5).toUpperCase()}`;
  const productName = order.variedad
    ? `${order.producto.nombre} — ${order.variedad.nombre}`
    : order.producto.nombre;

  const calibres = (order.calibresSolicitados ?? []) as CalibreItem[];
  const logisticsCost = Number(order.costoLogisticaEstimado ?? 0);
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
        Back to My Orders
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">Order #{shortId}: {productName}</h1>
            <StatusBadge status={order.estado} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">Cobertura</span>
            <CoverageBar percentage={displayCoverage} className="w-48" />
            <span className="text-sm font-semibold text-foreground">{Math.round(displayCoverage)}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {['BORRADOR', 'ACTIVO', 'PARCIALMENTE_CUBIERTO'].includes(order.estado) && (
            <Link href={`/buyer/orders/${id}/edit`}>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Edit2 className="w-4 h-4" /> Edit
              </Button>
            </Link>
          )}
          {!['CANCELADO', 'CERRADO', 'TOTALMENTE_CUBIERTO'].includes(order.estado) && (
            <Button variant="ghost" size="sm" loading={cancelling} onClick={handleCancel} className="flex items-center gap-1">
              <X className="w-4 h-4" /> Close
            </Button>
          )}
          {order.contratoPdfUrl && (
            <a href={order.contratoPdfUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="primary" size="sm"><Download className="w-4 h-4" /> Contract</Button>
            </a>
          )}
        </div>
      </div>

      {/* Closed order banner */}
      {order.estado === 'CERRADO' && (
        <div className="bg-green-50 border border-green-200 rounded-card p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-900">Order Closed — All deliveries confirmed</p>
            <p className="text-xs text-green-700 mt-0.5">Payment has been released to the seller(s). This order is now archived.</p>
          </div>
        </div>
      )}

      {/* Pre-authorize banner */}
      {canPay && order.estado !== 'CERRADO' && (
        <div className="bg-amber-50 border border-amber-200 rounded-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Lock className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">Payment pre-authorization available</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {acceptedMatches.length} seller contribution{acceptedMatches.length > 1 ? 's' : ''} accepted.
              Pre-authorize to secure the deal in escrow.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => openPaymentModal(acceptedMatches[0]!.id)}>
            Pre-Authorize Payment
          </Button>
        </div>
      )}

      {/* Already authorized but not closed */}
      {order.stripePaymentIntentId && order.estado !== 'CERRADO' && (
        <div className="bg-green-50 border border-green-200 rounded-card p-4 flex items-center gap-3">
          <Lock className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-900">Payment pre-authorized</p>
            <p className="text-xs text-green-700 mt-0.5">Funds are held in escrow and will be released upon delivery.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: calibres + matches */}
        <div className="lg:col-span-2 space-y-5 min-w-0">
          {/* Calibres requested */}
          <div className="bg-card rounded-card border border-border shadow-soft overflow-x-auto">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Calibres solicitados</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  {['CALIBRE', 'CANT (kg)', 'PRECIO MÁX (€/kg)'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {calibres.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-muted-foreground">Sin calibres definidos</td></tr>
                ) : calibres.map((c, i) => (
                  <tr key={i} className="hover:bg-accent/50">
                    <td className="px-4 py-2.5 font-medium">{c.calibre || '—'}</td>
                    <td className="px-4 py-2.5">{Number(c.cantidad_kg).toLocaleString('es-ES')}</td>
                    <td className="px-4 py-2.5">€{Number(c.precio_max_kg).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Farmer contributions */}
          <div className="bg-card rounded-card border border-border shadow-soft overflow-x-auto">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Seller Contributions ({order.matches.length})
              </h2>
            </div>
            {order.matches.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Sin contribuciones aún.</p>
                <p className="text-xs text-muted-foreground mt-1">La plataforma empareja tu pedido con lotes disponibles automáticamente.</p>
              </div>
            ) : (
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-muted/50">
                    {['VENDEDOR', 'PUNTUACIÓN', 'CANT (kg)', 'PRECIO (€/kg)', 'ESTADO', 'ACCIONES'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {order.matches.map((m) => {
                    const kg = Number(m.cantidadKg);
                    const price = Number(m.precioKg);
                    const canPayThis = m.estado === 'ACEPTADO_VENDEDOR' && !order.stripePaymentIntentId;
                    return (
                      <tr key={m.id} className="hover:bg-accent/50">
                        <td className="px-4 py-2.5 font-medium">
                          <div className="flex flex-col gap-0.5">
                            <span>{m.lote.vendedor.nombre} {m.lote.vendedor.apellidos}</span>
                            {m.lote.vendedor.scoreFiabilidad !== undefined && m.lote.vendedor.scoreStatus !== undefined && (
                              <ScoreBadge
                                score={m.lote.vendedor.scoreFiabilidad ?? null}
                                status={m.lote.vendedor.scoreStatus}
                                size="sm"
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          {m.scoreMatching != null ? (
                            <span className={[
                              'inline-flex items-center px-2 py-0.5 rounded-badge text-[11px] font-semibold',
                              m.scoreMatching >= 0.7 ? 'bg-green-100 text-green-700' :
                              m.scoreMatching >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-muted text-muted-foreground',
                            ].join(' ')}>
                              {Math.round(m.scoreMatching * 100)}/100
                            </span>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-4 py-2.5">{kg.toLocaleString('es-ES')}</td>
                        <td className="px-4 py-2.5">{price > 0 ? `€${price.toFixed(3)}` : '—'}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className={[
                              'inline-flex items-center px-2 py-0.5 rounded-badge text-[11px] font-medium',
                              m.estado === 'ACEPTADO_VENDEDOR' ? 'bg-green-100 text-green-700' :
                              m.estado === 'PROPUESTO' ? 'bg-yellow-100 text-yellow-700' :
                              m.estado === 'CONFIRMADO' ? 'bg-blue-100 text-blue-700' :
                              'bg-muted text-muted-foreground',
                            ].join(' ')}>
                              {MATCH_STATE_LABELS[m.estado] ?? m.estado}
                            </span>
                            {m.estado === 'ACEPTADO_VENDEDOR' && (
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" title="Seller accepted — action required" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          {order.estado === 'CERRADO' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                              </span>
                              {m.transaccion?.id && (
                                <button
                                  onClick={async () => { try { const r = await api.get(`/invoices/buyer/${m.transaccion!.id}/html`, { responseType: 'text' }); window.open(URL.createObjectURL(new Blob([r.data], { type: 'text/html' })), '_blank'); } catch { /* ignore */ } }}
                                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Download className="w-3 h-3" /> Factura
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 flex-wrap">
                              {canPayThis && (
                                <Button variant="primary" size="sm" onClick={() => openPaymentModal(m.id)}>
                                  Pay
                                </Button>
                              )}
                              {m.transaccion?.id && ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'].includes(m.estado) && (
                                <Link href={`/buyer/orders/${id}/contract/${m.transaccion.id}`}>
                                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                                    <FileText className="w-4 h-4" /> Contract
                                  </Button>
                                </Link>
                              )}
                              {['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'].includes(m.estado) && m.transaccion?.id && (
                                <Link href={`/buyer/orders/${id}/delivery/${m.transaccion.id}`}>
                                  <Button variant="ghost" size="sm" className="flex items-center gap-1">
                                    <QrCode className="w-4 h-4" /> Confirm Delivery
                                  </Button>
                                </Link>
                              )}
                              {m.transaccion?.id && (
                                <Link href={`/buyer/messages?tx=${m.transaccion.id}`}>
                                  <Button variant="ghost" size="sm" className="flex items-center gap-1">
                                    <MessageSquare className="w-4 h-4" /> Chat
                                  </Button>
                                </Link>
                              )}
                              {m.transaccion?.id && ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'].includes(m.estado) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDisputeModal(m)}
                                  className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" /> Claim
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
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
                      <h2 className="text-sm font-semibold text-foreground">Shipment from {sellerName}</h2>
                    </div>
                    {info.qrUsado && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge text-[11px] font-medium bg-green-100 text-green-700">
                        <CheckCircle2 className="w-3 h-3" /> Delivered
                      </span>
                    )}
                  </div>

                  {/* Lot photos */}
                  {info.fotosLoteUrls.length > 0 && (
                    <div className="p-4 border-b border-border">
                      <p className="text-xs font-medium text-foreground mb-2">📸 Lot preparation photos</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {info.fotosLoteUrls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-border hover:shadow-soft-md transition-shadow">
                            <img src={url} alt={`Lot photo ${i + 1}`} className="w-full h-20 object-cover" />
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
                        <p className="text-sm font-medium">You confirmed delivery. Payment released.</p>
                      </div>
                      {info.hasRated ? (
                        <p className="text-xs text-muted-foreground">Ya has valorado esta transacción.</p>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                          onClick={() => setRatingTx({ transaccionId: m.transaccion!.id, vendedorId: info.vendedorId })}
                        >
                          <Star className="w-3.5 h-3.5" /> Rate Seller
                        </Button>
                      )}
                    </div>
                  )}
                  {!info.qrToken && !info.firmaVendedor && (
                    <div className="p-4 text-xs text-muted-foreground">Waiting for the seller to sign the contract.</div>
                  )}
                  {!info.qrToken && info.firmaVendedor && (
                    <div className="p-4 text-xs text-muted-foreground">Contract signed. QR code will appear once generated.</div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Right: order details */}
        <div className="space-y-5">
          <div className="bg-card rounded-card border border-border shadow-soft p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Detalles del pedido</h2>
            <dl className="space-y-3">
              {[
                { label: 'Producto', value: order.producto.nombre },
                order.variedad ? { label: 'Variedad', value: order.variedad.nombre } : null,
                { label: 'Cantidad total', value: `${order.totalKg.toLocaleString('es-ES')} kg` },
                { label: 'Incoterm', value: order.incoterm },
                order.destinoFinal ? { label: 'Destino', value: order.destinoFinal } : null,
                order.frecuencia ? { label: 'Frecuencia', value: order.frecuencia } : null,
                order.fechaEntregaDeseada ? {
                  label: 'Entrega antes de',
                  value: new Date(order.fechaEntregaDeseada).toLocaleDateString('es-ES'),
                } : null,
                logisticsCost > 0 ? { label: 'Logística est.', value: formatEur(logisticsCost) } : null,
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
              <h2 className="text-sm font-semibold text-foreground mb-2">Notas</h2>
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

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        matchId={selectedMatchId}
        orderSubtotal={
          order.matches.find((m) => m.id === selectedMatchId)
            ? Number(order.matches.find((m) => m.id === selectedMatchId)!.cantidadKg) *
              Number(order.matches.find((m) => m.id === selectedMatchId)!.precioKg)
            : 0
        }
        logisticsCost={logisticsCost}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
