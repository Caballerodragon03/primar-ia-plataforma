'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { api } from '@/lib/api';
import type { Match, CalibresSolicitados } from './MatchCard';

const INCOTERM_DESCRIPTIONS: Record<string, string> = {
  EXW: 'El comprador recoge en tu explotación y gestiona todo el transporte. Mínima responsabilidad para ti.',
  FCA: 'Entregas al transportista del comprador en un punto acordado (lonja, cooperativa). Muy habitual en Primar-IA.',
  CPT: 'Tú contratas el transporte hasta destino. El riesgo pasa al comprador con el primer transportista.',
  CIP: 'Como CPT pero también debes contratar el seguro (mínimo 110% del valor). Ideal para perecederos.',
  DAP: 'Entregas en el destino del comprador. Él solo descarga. Muy habitual en exportación.',
  DPU: 'Como DAP pero también te encargas de la descarga en destino.',
  DDP: 'Máxima responsabilidad: pagas todo incluido aduanas de importación. Solo con experiencia exportadora.',
  FOB: 'Solo marítimo. Entregas a bordo del buque en el puerto de origen.',
  CIF: 'Solo marítimo. Pagas flete y seguro hasta destino; el riesgo pasa al embarcar.',
  CFR: 'Solo marítimo. Pagas el flete pero el riesgo pasa al embarcar. Sin seguro obligatorio.',
  FAS: 'Solo marítimo. Entregas al costado del buque en el puerto de origen.',
  DAT: 'Entregado en terminal de transporte. Eres responsable hasta la descarga en terminal.',
};

interface CalibreContribucion {
  calibre: string;
  cantidadKg: number;
  precioMaxKg: number;
  maxAllowed: number;
}

interface ContributeModalProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ContributeModal({ match, isOpen, onClose, onSuccess }: ContributeModalProps) {
  const [calibres, setCalibres] = useState<CalibreContribucion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const initCalibres = useCallback(() => {
    if (!match) return;
    const solicitados = Array.isArray(match.pedido.calibresSolicitados)
      ? (match.pedido.calibresSolicitados as CalibresSolicitados[])
      : [];
    setCalibres(
      solicitados.map((c) => ({
        calibre: c.calibre,
        cantidadKg: 0,
        precioMaxKg: c.precio_max_kg,
        maxAllowed: c.cantidad_kg,
      }))
    );
    setError(null);
    setSuccess(false);
  }, [match]);

  useEffect(() => {
    if (isOpen && match) {
      initCalibres();
    }
  }, [isOpen, match, initCalibres]);

  if (!isOpen || !match) return null;

  const matchPrecioKg = parseFloat(match.precioKg);

  const estimatedTotal = calibres.reduce(
    (sum, c) => sum + c.cantidadKg * matchPrecioKg,
    0
  );

  const totalKgNeeded = (
    Array.isArray(match.pedido.calibresSolicitados)
      ? (match.pedido.calibresSolicitados as CalibresSolicitados[])
      : []
  ).reduce((sum, c) => sum + c.cantidad_kg, 0);

  const hasContribution = calibres.some((c) => c.cantidadKg > 0);

  function updateCalibre(index: number, field: keyof CalibreContribucion, value: string | number) {
    setCalibres((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post(`/matching/matches/${match!.id}/contribute`, {
        calibresContribucion: calibres
          .filter((c) => c.cantidadKg > 0)
          .map(({ calibre, cantidadKg }) => ({
            calibre,
            cantidad_kg: cantidadKg,
          })),
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to reserve slot. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contribute-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 bg-card rounded-card shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h2 id="contribute-modal-title" className="font-semibold text-text-primary text-base leading-snug">
              Contribute to Order #{match.pedido.id.slice(-8).toUpperCase()}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Enter the quantity you wish to contribute for each caliber.
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-muted-foreground flex-shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info row */}
        <div className="px-5 py-3 bg-muted/50 border-b border-border flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="text-text-secondary">
            Product:{' '}
            <span className="font-medium text-text-primary">{match.pedido.producto.nombre}</span>
          </span>
          <span className="text-text-secondary">
            Price:{' '}
            <span className="font-medium text-text-primary">
              €{matchPrecioKg.toFixed(2)}/kg
            </span>
          </span>
          <span className="text-text-secondary">
            Destination:{' '}
            <span className="font-medium text-text-primary">
              {match.pedido.destinoFinal ?? 'N/A'}
            </span>
          </span>
          <span className="text-text-secondary">
            Order needs:{' '}
            <span className="font-medium text-text-primary">
              {totalKgNeeded.toLocaleString()} kg
            </span>
          </span>
          {match.pedido.incoterm && (
            <span className="inline-flex items-center gap-1 text-text-secondary">
              Incoterm:{' '}
              <span className="font-medium text-text-primary bg-muted border border-border rounded px-1.5 py-0.5 text-xs">
                {match.pedido.incoterm}
              </span>
            </span>
          )}
          {(match as { coverage?: number }).coverage != null && (
            <span className="text-text-secondary">
              Order coverage:{' '}
              <span className="font-medium text-text-primary">
                {Math.round(((match as { coverage?: number }).coverage ?? 0) * 100)}%
              </span>
            </span>
          )}
        </div>

        {match.pedido.incoterm && (
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
            <p className="text-xs font-semibold text-amber-800 mb-0.5">
              ⚠️ Incoterm del pedido: {match.pedido.incoterm}
            </p>
            <p className="text-xs text-amber-700">
              {INCOTERM_DESCRIPTIONS[match.pedido.incoterm] ?? 'Revisa las condiciones de entrega antes de aceptar.'}
            </p>
          </div>
        )}

        {/* Calibre inputs */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {calibres.length === 0 && (
              <p className="text-sm text-text-secondary text-center py-4">
                No calibers found for this order.
              </p>
            )}
            {calibres.map((c, i) => (
              <div key={c.calibre} className="space-y-3">
                <p className="text-sm font-semibold text-text-primary">
                  Caliber: {c.calibre}
                </p>
                <Input
                  label="Quantity (kg)"
                  type="number"
                  id={`calibre-qty-${i}`}
                  min={0}
                  max={c.maxAllowed}
                  step={0.01}
                  value={c.cantidadKg === 0 ? '' : c.cantidadKg}
                  onChange={(e) =>
                    updateCalibre(i, 'cantidadKg', parseFloat(e.target.value) || 0)
                  }
                  hint={`Max order capacity: ${c.maxAllowed.toLocaleString()} kg`}
                />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border space-y-3">
            {error && (
              <p className="text-sm text-red-500 text-center" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-green-600 font-medium text-center" role="status">
                Slot reserved! Closing...
              </p>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-secondary">Estimated Total Value</p>
                <p className="text-lg font-bold text-text-primary">
                  €{estimatedTotal.toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={loading}
                  disabled={success || !hasContribution}
                >
                  Reserve My Slot
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
