'use client';
import { useState } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';

const INCOTERMS = ['EXW', 'FCA', 'FOB', 'CIF', 'DAP', 'DDP', 'FAS', 'CFR', 'CPT', 'CIP'] as const;

interface NegotiationOfferModalProps {
  transaccionId: string;
  currentPrecioKg: number | null;
  currentIncoterm: string | null;
  parentId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function NegotiationOfferModal({
  transaccionId,
  currentPrecioKg,
  currentIncoterm,
  parentId,
  onClose,
  onSuccess,
}: NegotiationOfferModalProps) {
  const [precioKg, setPrecioKg] = useState(currentPrecioKg?.toFixed(4) ?? '');
  const [incoterm, setIncoterm] = useState(currentIncoterm ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const precioChanged = precioKg !== '' && Number(precioKg) !== currentPrecioKg;
  const incotermChanged = incoterm !== '' && incoterm !== currentIncoterm;
  const hasChange = precioChanged || incotermChanged;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasChange) {
      setError('Debes cambiar al menos un término respecto al actual.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = {};
      if (precioChanged) body.precioKg = Number(precioKg);
      if (incotermChanged) body.incoterm = incoterm;
      if (parentId) body.parentId = parentId;
      await api.post(`/chat/${transaccionId}/offers`, body);
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'No se pudo enviar la propuesta.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-yellow-600" />
            <h2 className="font-semibold text-gray-900 text-sm">
              {parentId ? 'Realizar contraoferta' : 'Proponer cambio'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Price */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Precio por kg (€)
            </label>
            <div className="flex items-center gap-2">
              {currentPrecioKg != null && (
                <span className="text-xs text-gray-400 line-through whitespace-nowrap">
                  €{currentPrecioKg.toFixed(4)}
                </span>
              )}
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                value={precioKg}
                onChange={(e) => setPrecioKg(e.target.value)}
                placeholder="Nuevo precio/kg"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none"
              />
            </div>
            {precioChanged && (
              <p className="text-[11px] text-yellow-700 mt-0.5">
                Cambio: €{currentPrecioKg?.toFixed(4) ?? '—'} → €{Number(precioKg).toFixed(4)}
              </p>
            )}
          </div>

          {/* Incoterm */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Incoterm
            </label>
            <div className="flex items-center gap-2">
              {currentIncoterm && (
                <span className="text-xs text-gray-400 line-through whitespace-nowrap">
                  {currentIncoterm}
                </span>
              )}
              <select
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none bg-white"
              >
                <option value="">Sin cambio</option>
                {INCOTERMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {incotermChanged && (
              <p className="text-[11px] text-yellow-700 mt-0.5">
                Cambio: {currentIncoterm ?? '—'} → {incoterm}
              </p>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1" disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="flex-1"
              loading={loading}
              disabled={!hasChange}
            >
              {parentId ? 'Contraoferta' : 'Enviar propuesta'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
