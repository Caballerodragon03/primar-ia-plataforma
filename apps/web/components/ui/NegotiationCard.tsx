'use client';
import { useState } from 'react';
import { CheckCircle2, XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { NegotiationOfferModal } from './NegotiationOfferModal';

const INCOTERMS = ['EXW', 'FCA', 'FOB', 'CIF', 'DAP', 'DDP', 'FAS', 'CFR', 'CPT', 'CIP'] as const;

export interface NegotiacionData {
  id: string;
  estado: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'SUPERADA';
  precioKg: number | null;
  incoterm: string | null;
  iniciadorId: string;
  parentId: string | null;
  currentPrecioKg: number | null;
  currentIncoterm: string | null;
}

interface NegotiationCardProps {
  transaccionId: string;
  negociacion: NegotiacionData;
  currentUserId: string;
  onActionDone: () => void;
}

export function NegotiationCard({
  transaccionId,
  negociacion,
  currentUserId,
  onActionDone,
}: NegotiationCardProps) {
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null);
  const [showCounter, setShowCounter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwn = negociacion.iniciadorId === currentUserId;
  const isPending = negociacion.estado === 'PENDIENTE';
  const canAct = isPending && !isOwn;

  async function handleAccept() {
    setLoading('accept');
    setError(null);
    try {
      await api.post(`/chat/${transaccionId}/offers/${negociacion.id}/accept`);
      onActionDone();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Error al aceptar');
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading('reject');
    setError(null);
    try {
      await api.post(`/chat/${transaccionId}/offers/${negociacion.id}/reject`);
      onActionDone();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Error al rechazar');
    } finally {
      setLoading(null);
    }
  }

  const statusConfig = {
    PENDIENTE: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    ACEPTADA:  { label: 'Aceptada',  color: 'bg-green-100 text-green-800 border-green-200' },
    RECHAZADA: { label: 'Rechazada', color: 'bg-red-100 text-red-800 border-red-200' },
    SUPERADA:  { label: 'Superada',  color: 'bg-gray-100 text-gray-500 border-gray-200' },
  };

  const { label, color } = statusConfig[negociacion.estado as keyof typeof statusConfig];

  return (
    <>
      <div className={[
        'rounded-xl border p-3.5 w-full max-w-[340px] space-y-3',
        negociacion.estado === 'SUPERADA' ? 'opacity-60' : '',
        isPending ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-gray-50',
      ].join(' ')}>
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-700">
            {isOwn ? 'Tu propuesta' : 'Propuesta recibida'}
          </p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${color}`}>
            {label}
          </span>
        </div>

        {/* Terms comparison */}
        <div className="space-y-2">
          {negociacion.precioKg !== null && (
            <div className="flex items-center gap-2 text-xs">
              <div className="flex-1">
                <p className="text-gray-400 text-[10px] uppercase tracking-wide">Precio actual</p>
                <p className="font-medium text-gray-600">
                  {negociacion.currentPrecioKg != null
                    ? `€${negociacion.currentPrecioKg.toFixed(4)}/kg`
                    : '—'}
                </p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 text-right">
                <p className="text-gray-400 text-[10px] uppercase tracking-wide">Propuesto</p>
                <p className={`font-bold ${isPending ? 'text-yellow-700' : 'text-gray-700'}`}>
                  €{negociacion.precioKg.toFixed(4)}/kg
                </p>
              </div>
            </div>
          )}

          {negociacion.incoterm !== null && (
            <div className="flex items-center gap-2 text-xs">
              <div className="flex-1">
                <p className="text-gray-400 text-[10px] uppercase tracking-wide">Incoterm actual</p>
                <p className="font-medium text-gray-600">
                  {negociacion.currentIncoterm ?? '—'}
                </p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 text-right">
                <p className="text-gray-400 text-[10px] uppercase tracking-wide">Propuesto</p>
                <p className={`font-bold ${isPending ? 'text-yellow-700' : 'text-gray-700'}`}>
                  {negociacion.incoterm}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {canAct && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 flex items-center justify-center gap-1 text-red-600 border-red-200 hover:bg-red-50 text-xs"
              onClick={handleReject}
              loading={loading === 'reject'}
              disabled={loading !== null}
            >
              <XCircle className="w-3.5 h-3.5" />
              Rechazar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 flex items-center justify-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 text-xs"
              onClick={() => setShowCounter(true)}
              disabled={loading !== null}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Contraoferta
            </Button>
            <Button
              size="sm"
              variant="primary"
              className="flex-1 flex items-center justify-center gap-1 text-xs"
              onClick={handleAccept}
              loading={loading === 'accept'}
              disabled={loading !== null}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Aceptar
            </Button>
          </div>
        )}

        {isOwn && isPending && (
          <p className="text-[11px] text-gray-400 text-center">Esperando respuesta de la otra parte…</p>
        )}

        {error && <p className="text-[11px] text-red-500">{error}</p>}
      </div>

      {showCounter && (
        <NegotiationOfferModal
          transaccionId={transaccionId}
          currentPrecioKg={negociacion.currentPrecioKg}
          currentIncoterm={negociacion.currentIncoterm}
          parentId={negociacion.id}
          onClose={() => setShowCounter(false)}
          onSuccess={() => { setShowCounter(false); onActionDone(); }}
        />
      )}
    </>
  );
}
