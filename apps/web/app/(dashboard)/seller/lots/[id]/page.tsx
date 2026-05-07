'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Package,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Pencil,
  Trash2,
  MessageSquare,
  AlertTriangle,
  FileText,
  QrCode,
  Download,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button, StatusBadge, CoverageBar } from '@/components/ui';
import { DisputeModal } from '@/components/ui/DisputeModal';

type CalibreItem = { calibre: string; cantidad_kg: number; precio_min_kg: number };

type Match = {
  id: string;
  cantidadKg: string;
  precioKg: string;
  estado: string;
  pedido: {
    id: string;
    comprador: { id: string; nombre: string };
  };
  transaccion?: { id: string } | null;
};

type Lot = {
  id: string;
  estado: string;
  tipo: string;
  producto: { nombre: string; categoria: string };
  variedad?: { nombre: string } | null;
  calibres: CalibreItem[];
  totalKg: number;
  coverage: number;
  direccionRecogida: string;
  fechaDisponibilidad: string;
  certificaciones: string[];
  fotosUrls: string[];
  comentariosAdicionales?: string | null;
  createdAt: string;
  matches: Match[];
};

const ESTADO_ICON: Record<string, React.ReactNode> = {
  ACTIVO: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  BORRADOR: <Clock className="w-4 h-4 text-gray-400" />,
  PARCIALMENTE_VENDIDO: <Zap className="w-4 h-4 text-yellow-500" />,
  VENDIDO: <CheckCircle2 className="w-4 h-4 text-blue-500" />,
  CANCELADO: <XCircle className="w-4 h-4 text-red-500" />,
  EXPIRADO: <XCircle className="w-4 h-4 text-gray-400" />,
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-secondary w-40 shrink-0">{label}</span>
      <span className="text-sm text-text-primary text-right">{value}</span>
    </div>
  );
}

export default function LotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lot, setLot] = useState<Lot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeTransaccionId, setDisputeTransaccionId] = useState('');
  const [disputeOrderInfo, setDisputeOrderInfo] = useState<{ product: string; seller: string; kg: number } | undefined>(undefined);

  useEffect(() => {
    api
      .get(`/lots/${id}`)
      .then(({ data }) => setLot(data.data))
      .catch(() => setError('Could not load lot details.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePublish = async () => {
    if (!lot) return;
    setPublishing(true);
    try {
      await api.put(`/lots/${id}`, { publicar: true });
      setLot((prev) => prev ? { ...prev, estado: 'ACTIVO' } : prev);
    } catch {
      setError('Failed to publish lot.');
    } finally {
      setPublishing(false);
    }
  };

  const handleCancel = async () => {
    const hasMatches = lot && lot.matches.length > 0;
    const msg = hasMatches
      ? 'This lot has active contributions. Only the uncommitted part will be cancelled. The committed quantities will be kept and the lot will be marked as completed. Continue?'
      : 'Are you sure you want to cancel this lot? This cannot be undone.';
    if (!confirm(msg)) return;
    setCancelling(true);
    try {
      const { data } = await api.delete(`/lots/${id}`);
      if (data.data?.partialCancel) {
        alert(data.message);
        setLot((prev) => prev ? { ...prev, estado: 'VENDIDO' } : prev);
        setCancelling(false);
      } else {
        router.push('/seller/lots');
      }
    } catch (err: unknown) {
      const msg2 = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to cancel lot.';
      setError(msg2);
      setCancelling(false);
    }
  };

  const openDisputeModal = (match: Match) => {
    if (!match.transaccion?.id || !lot) return;
    setDisputeTransaccionId(match.transaccion.id);
    setDisputeOrderInfo({
      product: lot.producto.nombre,
      seller: match.pedido.comprador.nombre,
      kg: Number(match.cantidadKg),
    });
    setDisputeModalOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-card" />
        ))}
      </div>
    );
  }

  if (error || !lot) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-card p-6 text-center">
          <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-700">{error || 'Lot not found.'}</p>
          <Link href="/seller/lots" className="text-sm text-primary mt-3 inline-block hover:underline">
            ← Back to My Lots
          </Link>
        </div>
      </div>
    );
  }

  const calibres = (lot.calibres ?? []) as CalibreItem[];
  const totalKg = calibres.reduce((s, c) => s + (c.cantidad_kg ?? 0), 0);
  const displayCoverage = lot.estado === 'VENDIDO' ? 100 : lot.coverage;
  const canEdit = ['BORRADOR', 'ACTIVO'].includes(lot.estado);
  const canPublish = lot.estado === 'BORRADOR';
  const canCancel = !['CANCELADO', 'VENDIDO', 'EXPIRADO'].includes(lot.estado);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/seller/lots" className="text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            {lot.producto.nombre}
            {lot.variedad && (
              <span className="text-sm font-normal text-text-secondary">— {lot.variedad.nombre}</span>
            )}
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Lot #{lot.id.slice(-8).toUpperCase()} · Created {new Date(lot.createdAt).toLocaleDateString('es-ES')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ESTADO_ICON[lot.estado]}
          <StatusBadge status={lot.estado} />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-input text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: main info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Coverage */}
          <div className="bg-surface rounded-card border border-border p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" /> Coverage
            </h2>
            <div className="flex items-center gap-4 mb-2">
              <CoverageBar percentage={displayCoverage} className="flex-1" />
              <span className="text-sm font-semibold text-text-primary w-14 text-right">
                {displayCoverage}%
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              {lot.totalKg.toLocaleString('es-ES')} kg total ·{' '}
              {Math.round((displayCoverage / 100) * lot.totalKg).toLocaleString('es-ES')} kg matched
            </p>
          </div>

          {/* Calibres */}
          <div className="bg-surface rounded-card border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-text-primary">Calibers</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {['CALIBER', 'QUANTITY (kg)', 'MIN PRICE (€/kg)', '% OF LOT'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {calibres.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-xs text-text-muted">
                      No calibers defined
                    </td>
                  </tr>
                ) : (
                  calibres.map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-text-primary">{c.calibre || '—'}</td>
                      <td className="px-4 py-2.5">{Number(c.cantidad_kg).toLocaleString('es-ES')}</td>
                      <td className="px-4 py-2.5">€{Number(c.precio_min_kg).toFixed(3)}</td>
                      <td className="px-4 py-2.5 text-text-secondary">
                        {totalKg > 0 ? `${Math.round((c.cantidad_kg / totalKg) * 100)}%` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Matches */}
          <div className="bg-surface rounded-card border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-text-primary">
                Active Matches ({lot.matches.length})
              </h2>
            </div>
            {lot.matches.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-text-muted">No active matches yet.</p>
                <p className="text-xs text-text-muted mt-1">The platform will notify you when a match is found.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    {['BUYER', 'QUANTITY (kg)', 'PRICE (€/kg)', 'STATUS', 'ACTIONS'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lot.matches.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{m.pedido.comprador.nombre}</td>
                      <td className="px-4 py-2.5">{Number(m.cantidadKg).toLocaleString('es-ES')}</td>
                      <td className="px-4 py-2.5">€{Number(m.precioKg).toFixed(3)}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={m.estado} /></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          {m.transaccion?.id && (
                            <Link href={`/seller/messages?tx=${m.transaccion.id}`}>
                              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                                <MessageSquare className="w-3.5 h-3.5" /> Chat
                              </Button>
                            </Link>
                          )}
                          {m.transaccion?.id && ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'].includes(m.estado) && (
                            <Link href={`/seller/lots/${id}/contract/${m.transaccion.id}`}>
                              <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" /> Contract
                              </Button>
                            </Link>
                          )}
                          {m.transaccion?.id && ['PENDIENTE_PAGO', 'CONFIRMADO'].includes(m.estado) && (
                            <Link href={`/seller/lots/${id}/qr/${m.transaccion.id}`}>
                              <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <QrCode className="w-3.5 h-3.5" /> QR & Photos
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
                          {m.transaccion?.id && m.estado === 'CONFIRMADO' && (
                            <button
                              onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/invoices/seller/${m.transaccion!.id}/html`, '_blank')}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                            >
                              <Download className="w-3 h-3" /> Factura
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: details + actions */}
        <div className="space-y-5">
          {/* Details */}
          <div className="bg-surface rounded-card border border-border p-4">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Details</h2>
            <InfoRow label="Product" value={lot.producto.nombre} />
            <InfoRow label="Category" value={lot.producto.categoria} />
            {lot.variedad && <InfoRow label="Variety" value={lot.variedad.nombre} />}
            <InfoRow label="Type" value={lot.tipo === 'VENTA_DIRECTA' ? 'Direct Sale' : 'Auction'} />
            <InfoRow
              label="Availability"
              value={
                <span className="flex items-center gap-1 justify-end">
                  <Calendar className="w-3.5 h-3.5 text-text-muted" />
                  {new Date(lot.fechaDisponibilidad).toLocaleDateString('es-ES')}
                </span>
              }
            />
            <InfoRow
              label="Location"
              value={
                <span className="flex items-center gap-1 justify-end text-right">
                  <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  {lot.direccionRecogida}
                </span>
              }
            />
          </div>

          {/* Certifications */}
          {lot.certificaciones && lot.certificaciones.length > 0 && (
            <div className="bg-surface rounded-card border border-border p-4">
              <h2 className="text-sm font-semibold text-text-primary mb-3">Certifications</h2>
              <div className="flex flex-wrap gap-1.5">
                {(lot.certificaciones as string[]).map((cert) => (
                  <span
                    key={cert}
                    className="px-2 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 border border-green-200 rounded-badge"
                  >
                    ✓ {cert}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          {lot.comentariosAdicionales && (
            <div className="bg-surface rounded-card border border-border p-4">
              <h2 className="text-sm font-semibold text-text-primary mb-2">Comments</h2>
              <p className="text-xs text-text-secondary leading-relaxed">{lot.comentariosAdicionales}</p>
            </div>
          )}

          {/* Actions */}
          <div className="bg-surface rounded-card border border-border p-4 space-y-2">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Actions</h2>

            {canPublish && (
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                loading={publishing}
                onClick={handlePublish}
              >
                Publish Lot
              </Button>
            )}

            {canEdit && (
              <Link href={`/seller/lots/${id}/edit`}>
                <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2">
                  <Pencil className="w-3.5 h-3.5" /> Edit Lot
                </Button>
              </Link>
            )}

            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center gap-2 text-red-500 border-red-200 hover:bg-red-50"
                loading={cancelling}
                onClick={handleCancel}
              >
                <Trash2 className="w-3.5 h-3.5" /> Cancel Lot
              </Button>
            )}
          </div>
        </div>
      </div>

      <DisputeModal
        isOpen={disputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        transaccionId={disputeTransaccionId}
        orderInfo={disputeOrderInfo}
        role="seller"
        onSuccess={() => {
          setDisputeModalOpen(false);
          api.get(`/lots/${id}`).then(({ data }) => setLot(data.data)).catch(() => {});
        }}
      />
    </div>
  );
}
