'use client';
import { useState } from 'react';
import { CheckCircle2, XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { NegotiationOfferModal } from './NegotiationOfferModal';
import {
  LOGISTICA_LABELS,
  TERMINO_PAGO_LABELS,
  type LogisticaPreferencia,
  type TerminoPago as TerminoPagoType,
} from '@primaria/shared';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

interface CalibreItem { calibre: string; cantidad_kg: number }

export interface NegotiacionData {
  id: string;
  estado: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'SUPERADA';
  precioKg: number | null;
  incoterm: string | null;
  logistica?: string | null;
  terminoPago?: string | null;
  calibres?: CalibreItem[] | null;
  iniciadorId: string;
  parentId: string | null;
  currentPrecioKg: number | null;
  currentIncoterm: string | null;
  currentLogistica?: string | null;
  currentTerminoPago?: string | null;
  currentCalibres?: CalibreItem[] | null;
}

interface NegotiationCardProps {
  transaccionId: string;
  negociacion: NegotiacionData;
  currentUserId: string;
  onActionDone: () => void;
}

/**
 * Renders a single field diff "Current → Proposed". Used inline for each
 * negotiable field so the user sees exactly what changes if they accept.
 */
function DiffRow({ label, current, proposed, pending }: {
  label: string; current: string; proposed: string; pending: boolean;
}) {
  const t = useT();
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex-1">
        <p className="text-muted-foreground text-[11px] uppercase tracking-wide">{label} {t('negCard.currentSuffix')}</p>
        <p className="font-medium text-muted-foreground">{current}</p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 text-right">
        <p className="text-muted-foreground text-[11px] uppercase tracking-wide">{t('negCard.proposed')}</p>
        <p className={`font-bold ${pending ? 'text-yellow-700' : 'text-foreground'}`}>{proposed}</p>
      </div>
    </div>
  );
}

function fmtCalibres(cs: CalibreItem[] | null | undefined, t: (k: MessageKey) => string, locale: 'es' | 'en'): string {
  if (!cs || cs.length === 0) return '—';
  const totalKg = cs.reduce((s, c) => s + Number(c.cantidad_kg), 0);
  return t('negCard.calibresShort')
    .replace('{n}', String(cs.length))
    .replace('{kg}', totalKg.toLocaleString(locale === 'en' ? 'en-GB' : 'es-ES'));
}

function calibresEqual(a: CalibreItem[] | null | undefined, b: CalibreItem[] | null | undefined): boolean {
  const aa = a ?? [];
  const bb = b ?? [];
  if (aa.length !== bb.length) return false;
  // Order matters here — the proposer keeps the seller's existing order.
  for (let i = 0; i < aa.length; i++) {
    if (aa[i]!.calibre !== bb[i]!.calibre) return false;
    if (Number(aa[i]!.cantidad_kg) !== Number(bb[i]!.cantidad_kg)) return false;
  }
  return true;
}

export function NegotiationCard({
  transaccionId,
  negociacion,
  currentUserId,
  onActionDone,
}: NegotiationCardProps) {
  const t = useT();
  const { locale } = useLocale();
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
      setError(msg ?? t('negCard.acceptFail'));
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
      setError(msg ?? t('negCard.rejectFail'));
    } finally {
      setLoading(null);
    }
  }

  const statusConfig: Record<NegotiacionData['estado'], { labelKey: MessageKey; color: string }> = {
    PENDIENTE: { labelKey: 'negCard.estado.pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    ACEPTADA:  { labelKey: 'negCard.estado.accepted', color: 'bg-green-100 text-green-800 border-green-200' },
    RECHAZADA: { labelKey: 'negCard.estado.rejected', color: 'bg-red-100 text-red-800 border-red-200' },
    SUPERADA:  { labelKey: 'negCard.estado.superseded', color: 'bg-muted text-muted-foreground border-border' },
  };

  const cfg = statusConfig[negociacion.estado];
  const label = t(cfg.labelKey);
  const color = cfg.color;

  return (
    <>
      <div className={[
        'rounded-xl border p-3.5 w-full max-w-[360px] space-y-3',
        negociacion.estado === 'SUPERADA' ? 'opacity-60' : '',
        isPending ? 'border-yellow-300 bg-yellow-50' : 'border-border bg-muted/50',
      ].join(' ')}>
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">
            {isOwn ? t('negCard.ownProposal') : t('negCard.receivedProposal')}
          </p>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${color}`}>
            {label}
          </span>
        </div>

        {/* Term diffs — one row per proposed field */}
        <div className="space-y-2">
          {negociacion.precioKg !== null && (
            <DiffRow
              label={t('negCard.field.price')}
              current={negociacion.currentPrecioKg != null ? `€${negociacion.currentPrecioKg.toFixed(4)}/kg` : '—'}
              proposed={`€${negociacion.precioKg.toFixed(4)}/kg`}
              pending={isPending}
            />
          )}
          {negociacion.incoterm !== null && (
            <DiffRow
              label={t('negCard.field.incoterm')}
              current={negociacion.currentIncoterm ?? '—'}
              proposed={negociacion.incoterm}
              pending={isPending}
            />
          )}
          {negociacion.logistica && (
            <DiffRow
              label={t('negCard.field.logistics')}
              current={negociacion.currentLogistica
                ? (LOGISTICA_LABELS[negociacion.currentLogistica as LogisticaPreferencia] ?? negociacion.currentLogistica)
                : '—'}
              proposed={LOGISTICA_LABELS[negociacion.logistica as LogisticaPreferencia] ?? negociacion.logistica}
              pending={isPending}
            />
          )}
          {negociacion.terminoPago && (
            <DiffRow
              label={t('negCard.field.payment')}
              current={negociacion.currentTerminoPago
                ? (TERMINO_PAGO_LABELS[negociacion.currentTerminoPago as TerminoPagoType] ?? negociacion.currentTerminoPago)
                : '—'}
              proposed={TERMINO_PAGO_LABELS[negociacion.terminoPago as TerminoPagoType] ?? negociacion.terminoPago}
              pending={isPending}
            />
          )}
          {negociacion.calibres && !calibresEqual(negociacion.calibres, negociacion.currentCalibres) && (
            <DiffRow
              label={t('negCard.field.calibres')}
              current={fmtCalibres(negociacion.currentCalibres, t, locale)}
              proposed={fmtCalibres(negociacion.calibres, t, locale)}
              pending={isPending}
            />
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
              {t('negCard.reject')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 flex items-center justify-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 text-xs"
              onClick={() => setShowCounter(true)}
              disabled={loading !== null}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('negCard.counter')}
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
              {t('negCard.accept')}
            </Button>
          </div>
        )}

        {isOwn && isPending && (
          <p className="text-[11px] text-muted-foreground text-center">{t('negCard.waitingResponse')}</p>
        )}

        {error && <p className="text-[11px] text-red-500">{error}</p>}
      </div>

      {showCounter && (
        <NegotiationOfferModal
          transaccionId={transaccionId}
          currentPrecioKg={negociacion.currentPrecioKg}
          currentIncoterm={negociacion.currentIncoterm}
          currentLogistica={negociacion.currentLogistica}
          currentTerminoPago={negociacion.currentTerminoPago}
          currentCalibres={negociacion.currentCalibres}
          parentId={negociacion.id}
          onClose={() => setShowCounter(false)}
          onSuccess={() => { setShowCounter(false); onActionDone(); }}
        />
      )}
    </>
  );
}
