'use client';

/**
 * Phase 9 — Cancel-contract modal, shared between seller + buyer pages.
 *
 * Lets the user terminate a contract that is NOT yet FIRMADO by providing
 * a free-text reason (≥5 chars, ≤500 chars). On success notifies the
 * caller so it can refresh the contract state. The backend transitions the
 * match to contratoEstado=CANCELADO and may flag the pair for admin review
 * if their cancellation count crosses the threshold.
 */
import { useState } from 'react';
import { XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface CancelContractModalProps {
  matchId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelContractModal({ matchId, onClose, onSuccess }: CancelContractModalProps) {
  const [motivo, setMotivo] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    const trimmed = motivo.trim();
    if (trimmed.length < 5) {
      setError('Describe el motivo (al menos 5 caracteres).');
      return;
    }
    if (!confirmed) {
      setError('Confirma que entiendes que la cancelación es definitiva.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/contracts/match/${matchId}/cancel`, { motivo: trimmed });
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No se pudo cancelar el contrato.';
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-card border border-border shadow-xl max-w-md w-full p-6 space-y-5">
        <div className="flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-600" />
          <h3 className="text-base font-bold text-foreground">Cancelar contrato</h3>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-900 leading-relaxed">
            Al cancelar, este contrato pasará al estado CANCELADO. Si hay firmas en curso o un plazo de pago abierto, se anularán. La otra parte recibirá un mensaje en el chat con tu motivo.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-foreground">
            Motivo de la cancelación
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: hemos llegado a un acuerdo distinto con otra parte..."
            maxLength={500}
            rows={3}
            disabled={submitting}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-[11px] text-text-secondary">
            {motivo.length}/500 caracteres
          </p>
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={submitting}
            className="mt-0.5 w-4 h-4 accent-red-600"
          />
          <span className="text-xs text-foreground leading-relaxed">
            Entiendo que la cancelación es definitiva y que cancelaciones repetidas con la misma contraparte serán revisadas por Primar-IA.
          </span>
        </label>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            No cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleCancel}
            disabled={submitting || !confirmed || motivo.trim().length < 5}
            className="flex items-center gap-2 !bg-red-600 hover:!bg-red-700"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Confirmar cancelación
          </Button>
        </div>
      </div>
    </div>
  );
}
