'use client';

/**
 * Phase 10 — Post-contract shipping events.
 *
 * Once contratoEstado===FIRMADO, the seller marks the goods as shipped
 * and the buyer marks them as received. Each event unlocks the rating
 * modal for the corresponding party. Shared between seller and buyer
 * contract pages — props drive the role + state.
 */
import { useState } from 'react';
import { Truck, PackageCheck, Star, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { RatingModal } from '@/components/RatingModal';

interface Props {
  matchId: string;
  transaccionId: string | null;
  counterpartId: string | null;
  isSeller: boolean;
  isBuyer: boolean;
  enviadoEn: string | null;
  recibidoEn: string | null;
  hasRatedCounterpart: boolean;
  onChanged: () => void;
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

export function ShippingEventsSection({
  matchId,
  transaccionId,
  counterpartId,
  isSeller,
  isBuyer,
  enviadoEn,
  recibidoEn,
  hasRatedCounterpart,
  onChanged,
}: Props) {
  const [submitting, setSubmitting] = useState<'ship' | 'receive' | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const canMarkShipped = isSeller && !enviadoEn;
  const canMarkReceived = isBuyer && !!enviadoEn && !recibidoEn;
  const canRate = !!recibidoEn && !hasRatedCounterpart && transaccionId && counterpartId;

  async function handleMarkShipped() {
    setSubmitting('ship');
    try {
      await api.post(`/contracts/match/${matchId}/mark-shipped`);
      onChanged();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No se pudo marcar el envío.';
      alert(msg);
    } finally {
      setSubmitting(null);
    }
  }
  async function handleMarkReceived() {
    setSubmitting('receive');
    try {
      await api.post(`/contracts/match/${matchId}/mark-received`);
      onChanged();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No se pudo confirmar la recepción.';
      alert(msg);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="bg-card border border-border rounded-card p-5 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Seguimiento de la entrega</h2>

      {/* Timeline */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            enviadoEn ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
          }`}>
            {enviadoEn ? <CheckCircle2 className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Envío</p>
            <p className="text-xs text-text-secondary">
              {enviadoEn
                ? `Marcado por el vendedor el ${fmtDateTime(enviadoEn)}`
                : 'Pendiente — el vendedor confirmará el envío de la mercancía'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            recibidoEn ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
          }`}>
            {recibidoEn ? <CheckCircle2 className="w-4 h-4" /> : <PackageCheck className="w-4 h-4" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Recepción</p>
            <p className="text-xs text-text-secondary">
              {recibidoEn
                ? `Confirmada por el comprador el ${fmtDateTime(recibidoEn)}`
                : 'Pendiente — el comprador confirmará la recepción cuando reciba la mercancía'}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
        {canMarkShipped && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleMarkShipped}
            disabled={submitting !== null}
            className="flex items-center gap-2"
          >
            {submitting === 'ship' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
            Marcar como enviado
          </Button>
        )}
        {canMarkReceived && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleMarkReceived}
            disabled={submitting !== null}
            className="flex items-center gap-2"
          >
            {submitting === 'receive' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
            Confirmar recepción
          </Button>
        )}
        {canRate && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRatingModal(true)}
            className="flex items-center gap-2"
          >
            <Star className="w-4 h-4" />
            Valorar a la contraparte
          </Button>
        )}
        {hasRatedCounterpart && (
          <p className="text-xs text-text-secondary flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            Ya has valorado esta operación
          </p>
        )}
        {isSeller && enviadoEn && !recibidoEn && (
          <p className="text-xs text-text-secondary">
            Esperando a que el comprador confirme la recepción. Podrás valorarle cuando lo haga.
          </p>
        )}
      </div>

      {showRatingModal && transaccionId && counterpartId && (
        <RatingModal
          transaccionId={transaccionId}
          destinatarioId={counterpartId}
          tipo={isSeller ? 'VENDEDOR_A_COMPRADOR' : 'COMPRADOR_A_VENDEDOR'}
          onClose={() => setShowRatingModal(false)}
          onSuccess={() => {
            setShowRatingModal(false);
            onChanged();
          }}
        />
      )}

      {/* Link to chat for delivery coordination — pragmatic shortcut now
          that the privacy banner won't block sharing logistics details
          (banner hides post-FIRMADO). */}
      {transaccionId && (
        <Link
          href={`/${isSeller ? 'seller' : 'buyer'}/messages?tx=${transaccionId}`}
          className="text-xs text-primary-dark hover:underline inline-block"
        >
          Abrir chat para coordinar la entrega →
        </Link>
      )}
    </div>
  );
}
