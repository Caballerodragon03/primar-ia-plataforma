'use client';

/**
 * Phase 6 — Structured negotiation modal.
 *
 * Supports proposing changes to any subset of:
 *   - precioKg
 *   - incoterm + logistica (always synced: changing one snaps the other)
 *   - terminoPago
 *   - calibres (list of {calibre, cantidad_kg})
 *
 * At least ONE change is required. The submit button stays disabled until
 * something differs from the current effective terms.
 */
import { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import {
  ALL_INCOTERMS,
  ALL_TERMINOS_PAGO,
  LOGISTICA_LABELS,
  TERMINO_PAGO_LABELS,
  INCOTERM_INFO,
  incotermsForLogistica,
  logisticaFromIncoterm,
  isIncotermAllowedForLogistica,
  type Incoterm as IncotermType,
  type LogisticaPreferencia,
  type TerminoPago as TerminoPagoType,
} from '@primaria/shared';

interface CalibreItem { calibre: string; cantidad_kg: number }

interface NegotiationOfferModalProps {
  transaccionId: string;
  currentPrecioKg: number | null;
  currentIncoterm: string | null;
  currentLogistica?: string | null;
  currentTerminoPago?: string | null;
  currentCalibres?: CalibreItem[] | null;
  parentId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function NegotiationOfferModal({
  transaccionId,
  currentPrecioKg,
  currentIncoterm,
  currentLogistica,
  currentTerminoPago,
  currentCalibres,
  parentId,
  onClose,
  onSuccess,
}: NegotiationOfferModalProps) {
  // Local form state. Empty string means "no change to this field" except for
  // calibres which uses a separate edit-mode flag.
  const [precioKg, setPrecioKg] = useState(currentPrecioKg != null ? currentPrecioKg.toFixed(4) : '');
  const [incoterm, setIncoterm] = useState(currentIncoterm ?? '');
  const [logistica, setLogistica] = useState(currentLogistica ?? '');
  const [terminoPago, setTerminoPago] = useState(currentTerminoPago ?? '');
  const [editCalibres, setEditCalibres] = useState(false);
  const [calibres, setCalibres] = useState<CalibreItem[]>(
    currentCalibres && currentCalibres.length > 0
      ? currentCalibres.map((c) => ({ ...c }))
      : [{ calibre: '', cantidad_kg: 0 }],
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync incoterm ↔ logística. When the user picks an incoterm, snap logística
  // to the derived value. When they pick logística, clear incoterm if it's
  // incompatible. Same rules as the new-lot / new-order forms.
  useEffect(() => {
    if (!incoterm) return;
    const derived = logisticaFromIncoterm(incoterm as IncotermType);
    if (logistica !== derived && logistica !== 'INDIFERENTE') {
      setLogistica(derived);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoterm]);

  useEffect(() => {
    if (!logistica || logistica === 'INDIFERENTE') return;
    if (incoterm && !isIncotermAllowedForLogistica(incoterm as IncotermType, logistica as LogisticaPreferencia)) {
      setIncoterm('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logistica]);

  const availableIncoterms = useMemo(
    () => incotermsForLogistica((logistica || 'INDIFERENTE') as LogisticaPreferencia),
    [logistica],
  );

  // Detect changes per field.
  const precioChanged = precioKg !== '' && Number(precioKg) !== currentPrecioKg;
  const incotermChanged = incoterm !== '' && incoterm !== currentIncoterm;
  const logisticaChanged = logistica !== '' && logistica !== currentLogistica;
  const terminoChanged = terminoPago !== '' && terminoPago !== currentTerminoPago;
  const calibresChanged = editCalibres
    && calibres.length > 0
    && calibres.every((c) => c.calibre.trim().length > 0 && c.cantidad_kg > 0)
    && JSON.stringify(calibres) !== JSON.stringify(currentCalibres ?? []);

  const hasChange = precioChanged || incotermChanged || logisticaChanged || terminoChanged || calibresChanged;

  function updateCalibre(idx: number, patch: Partial<CalibreItem>) {
    setCalibres((cs) => cs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }
  function addCalibre() { setCalibres((cs) => [...cs, { calibre: '', cantidad_kg: 0 }]); }
  function removeCalibre(idx: number) {
    setCalibres((cs) => cs.filter((_, i) => i !== idx));
  }

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
      if (logisticaChanged) body.logistica = logistica;
      if (terminoChanged) body.terminoPago = terminoPago;
      if (calibresChanged) body.calibres = calibres.map((c) => ({ calibre: c.calibre.trim(), cantidad_kg: Number(c.cantidad_kg) }));
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

  const incotermTooltip = (code: string) => {
    const info = INCOTERM_INFO[code as IncotermType];
    return info ? `${info.name} — ${info.desc} (${info.responsable})` : code;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-card rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-yellow-600" />
            <h2 className="font-semibold text-foreground text-sm">
              {parentId ? 'Realizar contraoferta' : 'Proponer cambio'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
          {/* Price */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Precio por kg (€)</label>
            <div className="flex items-center gap-2">
              {currentPrecioKg != null && (
                <span className="text-xs text-muted-foreground line-through whitespace-nowrap">
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
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none"
              />
            </div>
            {precioChanged && (
              <p className="text-[11px] text-yellow-700 mt-0.5">
                Cambio: €{currentPrecioKg?.toFixed(4) ?? '—'} → €{Number(precioKg).toFixed(4)}
              </p>
            )}
          </div>

          {/* Logística */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Logística</label>
            <div className="flex items-center gap-2">
              {currentLogistica && (
                <span className="text-xs text-muted-foreground line-through whitespace-nowrap">
                  {LOGISTICA_LABELS[currentLogistica as LogisticaPreferencia] ?? currentLogistica}
                </span>
              )}
              <select
                value={logistica}
                onChange={(e) => setLogistica(e.target.value)}
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none bg-card"
              >
                <option value="">Sin cambio</option>
                <option value="INDIFERENTE">{LOGISTICA_LABELS.INDIFERENTE}</option>
                <option value="YO_ENVIO">{LOGISTICA_LABELS.YO_ENVIO}</option>
                <option value="OTRO_RECOGE">{LOGISTICA_LABELS.OTRO_RECOGE}</option>
              </select>
            </div>
          </div>

          {/* Incoterm */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Incoterm
              {logistica && logistica !== 'INDIFERENTE' && (
                <span className="ml-1 text-[10px] text-muted-foreground">(filtrado por logística)</span>
              )}
            </label>
            <div className="flex items-center gap-2">
              {currentIncoterm && (
                <span className="text-xs text-muted-foreground line-through whitespace-nowrap">
                  {currentIncoterm}
                </span>
              )}
              <select
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value)}
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none bg-card"
              >
                <option value="">Sin cambio</option>
                {availableIncoterms.map((t) => (
                  <option key={t} value={t} title={incotermTooltip(t)}>{t}</option>
                ))}
              </select>
            </div>
            {incoterm && INCOTERM_INFO[incoterm as IncotermType] && (
              <p className="text-[11px] text-muted-foreground mt-1">
                💡 <strong>{INCOTERM_INFO[incoterm as IncotermType].name}</strong> — {INCOTERM_INFO[incoterm as IncotermType].desc}
              </p>
            )}
          </div>

          {/* Término de pago */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Término de pago</label>
            <div className="flex items-center gap-2">
              {currentTerminoPago && (
                <span className="text-xs text-muted-foreground line-through whitespace-nowrap">
                  {TERMINO_PAGO_LABELS[currentTerminoPago as TerminoPagoType] ?? currentTerminoPago}
                </span>
              )}
              <select
                value={terminoPago}
                onChange={(e) => setTerminoPago(e.target.value)}
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none bg-card"
              >
                <option value="">Sin cambio</option>
                {ALL_TERMINOS_PAGO.map((t) => (
                  <option key={t} value={t}>{TERMINO_PAGO_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Calibres */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-foreground">Calibres y cantidades</label>
              {!editCalibres ? (
                <button
                  type="button"
                  onClick={() => setEditCalibres(true)}
                  className="text-[11px] text-primary-dark hover:underline"
                >
                  Editar calibres
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditCalibres(false);
                    setCalibres(currentCalibres && currentCalibres.length > 0
                      ? currentCalibres.map((c) => ({ ...c }))
                      : [{ calibre: '', cantidad_kg: 0 }]);
                  }}
                  className="text-[11px] text-muted-foreground hover:underline"
                >
                  Cancelar cambios
                </button>
              )}
            </div>
            {!editCalibres ? (
              <div className="flex flex-wrap gap-1.5">
                {(currentCalibres ?? []).length === 0 && (
                  <span className="text-[11px] text-muted-foreground">Sin calibres definidos</span>
                )}
                {(currentCalibres ?? []).map((c) => (
                  <span key={c.calibre} className="text-[11px] bg-muted text-text-secondary px-2 py-0.5 rounded-badge">
                    {c.calibre}: {c.cantidad_kg.toLocaleString('es-ES')} kg
                  </span>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {calibres.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Calibre"
                      value={c.calibre}
                      onChange={(e) => updateCalibre(i, { calibre: e.target.value })}
                      className="w-20 border border-border rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none"
                    />
                    <input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="kg"
                      value={c.cantidad_kg || ''}
                      onChange={(e) => updateCalibre(i, { cantidad_kg: Number(e.target.value) })}
                      className="flex-1 border border-border rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none"
                    />
                    <span className="text-[11px] text-muted-foreground">kg</span>
                    <button
                      type="button"
                      onClick={() => removeCalibre(i)}
                      disabled={calibres.length === 1}
                      className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addCalibre}
                  className="flex items-center gap-1 text-[11px] text-primary-dark hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Añadir calibre
                </button>
              </div>
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
