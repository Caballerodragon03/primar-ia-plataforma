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
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';

interface CalibreItem {
  calibre: string;
  cantidad_kg: number;
  // Phase 14G — precio por calibre opcional. Si está vacío hereda
  // currentPrecioKg / el precio del match.
  precio_kg?: number;
}

// Phase 14H — contexto de negociación (intersección de calibres lote↔pedido)
// devuelto por GET /chat/:txId/offers/context. Usado para limitar el dropdown
// y el max kg del input.
interface ContextCalibre {
  calibre: string;
  maxKgVendedor: number;
  maxKgComprador: number;
  maxKg: number; // min(maxKgVendedor, maxKgComprador)
  precioVendedorMinKg: number | null;
  precioCompradorMaxKg: number | null;
}

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
  const t = useT();
  const { locale } = useLocale();
  const numLoc = locale === 'en' ? 'en-GB' : 'es-ES';
  // Local form state. Empty string means "no change to this field" except for
  // calibres which uses a separate edit-mode flag.
  // Phase 14H — el precio se gestiona POR CALIBRE en la sección de calibres
  // (sin atajo global). El calibre se elige de un dropdown limitado a los
  // calibres negociables del match (intersección lote↔pedido).
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

  // Phase 14H — calibres negociables del match (intersección lote↔pedido).
  const [contextCalibres, setContextCalibres] = useState<ContextCalibre[]>([]);
  const [contextLoaded, setContextLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    api
      .get(`/chat/${transaccionId}/offers/context`)
      .then((res) => {
        if (cancelled) return;
        const data = (res.data as { data?: { calibres?: ContextCalibre[] } })?.data;
        setContextCalibres(data?.calibres ?? []);
      })
      .catch(() => {
        if (!cancelled) setContextCalibres([]);
      })
      .finally(() => {
        if (!cancelled) setContextLoaded(true);
      });
    return () => { cancelled = true; };
  }, [transaccionId]);

  const calibreOptions = useMemo(() => contextCalibres.map((c) => c.calibre), [contextCalibres]);
  const ctxByCalibre = useMemo(() => {
    const m = new Map<string, ContextCalibre>();
    for (const c of contextCalibres) m.set(c.calibre, c);
    return m;
  }, [contextCalibres]);

  // Sync incoterm ↔ logística. When the user picks an incoterm, snap logística
  // to the derived value. When they pick logística, clear incoterm if it's
  // incompatible. Same rules as the new-lot / new-order forms.
  //
  // Phase 13 — track whether the user has explicitly touched the logística
  // field. If they haven't, we still snap it for backend consistency but the
  // DiffRow logic below treats it as "not changed by user" so we don't show
  // a false-positive "Logística: A → B" chip on what was actually an
  // incoterm-only change.
  const [logisticaUserChanged, setLogisticaUserChanged] = useState(false);
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
  const incotermChanged = incoterm !== '' && incoterm !== currentIncoterm;
  // Phase 13 — only consider logística "changed" if the user touched it
  // directly. The incoterm→logística sync effect would otherwise mark this
  // true and produce a false "Logística: A → B" diff chip when the user
  // only intended to change incoterm.
  const logisticaChanged = logisticaUserChanged && logistica !== '' && logistica !== currentLogistica;
  const terminoChanged = terminoPago !== '' && terminoPago !== currentTerminoPago;
  const calibresChanged = editCalibres
    && calibres.length > 0
    && calibres.every((c) => c.calibre.trim().length > 0 && c.cantidad_kg > 0)
    && JSON.stringify(calibres) !== JSON.stringify(currentCalibres ?? []);

  // Phase 14H — validar que los kg no excedan el máximo permitido por la
  // intersección lote↔pedido del match.
  const calibresOverMax = editCalibres && calibres.some((c) => {
    const ctx = ctxByCalibre.get(c.calibre);
    if (!ctx) return false;
    return Number(c.cantidad_kg) > ctx.maxKg;
  });

  const hasChange = incotermChanged || logisticaChanged || terminoChanged || calibresChanged;

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
      setError(t('negModal.errNoChange'));
      return;
    }
    if (calibresOverMax) {
      setError(t('negModal.errOverMax'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = {};
      if (incotermChanged) body.incoterm = incoterm;
      if (logisticaChanged) body.logistica = logistica;
      if (terminoChanged) body.terminoPago = terminoPago;
      if (calibresChanged) body.calibres = calibres.map((c) => {
        const item: { calibre: string; cantidad_kg: number; precio_kg?: number } = {
          calibre: c.calibre.trim(),
          cantidad_kg: Number(c.cantidad_kg),
        };
        if (c.precio_kg != null && c.precio_kg > 0) item.precio_kg = Number(c.precio_kg);
        return item;
      });
      if (parentId) body.parentId = parentId;
      await api.post(`/chat/${transaccionId}/offers`, body);
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        t('negModal.submitFail');
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
              {parentId ? t('negModal.titleCounter') : t('negModal.titlePropose')}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
          {/* Logística */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{t('negModal.logistics')}</label>
            <div className="flex items-center gap-2">
              {currentLogistica && (
                <span className="text-xs text-muted-foreground line-through whitespace-nowrap">
                  {LOGISTICA_LABELS[currentLogistica as LogisticaPreferencia] ?? currentLogistica}
                </span>
              )}
              <select
                value={logistica}
                onChange={(e) => { setLogistica(e.target.value); setLogisticaUserChanged(true); }}
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none bg-card"
              >
                <option value="">{t('negModal.noChange')}</option>
                <option value="INDIFERENTE">{LOGISTICA_LABELS.INDIFERENTE}</option>
                <option value="YO_ENVIO">{LOGISTICA_LABELS.YO_ENVIO}</option>
                <option value="OTRO_RECOGE">{LOGISTICA_LABELS.OTRO_RECOGE}</option>
              </select>
            </div>
          </div>

          {/* Incoterm */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              {t('negModal.incoterm')}
              {logistica && logistica !== 'INDIFERENTE' && (
                <span className="ml-1 text-[10px] text-muted-foreground">{t('negModal.filteredByLog')}</span>
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
                <option value="">{t('negModal.noChange')}</option>
                {availableIncoterms.map((ic) => (
                  <option key={ic} value={ic} title={incotermTooltip(ic)}>{ic}</option>
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
            <label className="block text-xs font-medium text-foreground mb-1">{t('negModal.paymentTerm')}</label>
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
                <option value="">{t('negModal.noChange')}</option>
                {ALL_TERMINOS_PAGO.map((tp) => (
                  <option key={tp} value={tp}>{TERMINO_PAGO_LABELS[tp]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Calibres */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-foreground">{t('negModal.calibresHeader')}</label>
              {!editCalibres ? (
                <button
                  type="button"
                  onClick={() => setEditCalibres(true)}
                  className="text-[11px] text-primary-dark hover:underline"
                >
                  {t('negModal.editCalibres')}
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
                  {t('negModal.cancelEdit')}
                </button>
              )}
            </div>
            {!editCalibres ? (
              <div className="flex flex-wrap gap-1.5">
                {(currentCalibres ?? []).length === 0 && (
                  <span className="text-[11px] text-muted-foreground">{t('negModal.noCalibres')}</span>
                )}
                {(currentCalibres ?? []).map((c) => (
                  <span key={c.calibre} className="text-[11px] bg-muted text-text-secondary px-2 py-0.5 rounded-badge">
                    {c.calibre}: {c.cantidad_kg.toLocaleString(numLoc)} kg
                    {c.precio_kg != null && c.precio_kg > 0 && (
                      <> · €{c.precio_kg.toFixed(3)}/kg</>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Phase 14G — header row para columnas. */}
                <div className="grid grid-cols-[5rem_1fr_5.5rem_1.5rem] gap-2 px-1 text-[10px] uppercase tracking-wide text-text-muted">
                  <span>{t('negModal.col.caliber')}</span>
                  <span>{t('negModal.col.qty')}</span>
                  <span>{t('negModal.col.price')}</span>
                  <span />
                </div>
                {calibres.map((c, i) => {
                  const ctx = ctxByCalibre.get(c.calibre);
                  const overMax = ctx != null && Number(c.cantidad_kg) > ctx.maxKg;
                  // Calibres disponibles para este row: los del match menos
                  // los ya elegidos en otras filas (evita duplicados).
                  const usedElsewhere = new Set(
                    calibres.filter((_, j) => j !== i).map((cc) => cc.calibre),
                  );
                  const availableForRow = calibreOptions.filter(
                    (opt) => opt === c.calibre || !usedElsewhere.has(opt),
                  );
                  return (
                    <div key={i} className="space-y-1">
                      <div className="grid grid-cols-[5rem_1fr_5.5rem_1.5rem] gap-2 items-center">
                        <select
                          value={c.calibre}
                          onChange={(e) => updateCalibre(i, { calibre: e.target.value })}
                          className="border border-border rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none bg-card"
                          disabled={!contextLoaded || calibreOptions.length === 0}
                        >
                          <option value="">—</option>
                          {availableForRow.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          max={ctx?.maxKg ?? undefined}
                          placeholder={t('negModal.col.qty')}
                          value={c.cantidad_kg || ''}
                          onChange={(e) => updateCalibre(i, { cantidad_kg: Number(e.target.value) })}
                          className={`border rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none ${overMax ? 'border-red-400 bg-red-50' : 'border-border'}`}
                        />
                        <input
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          placeholder={currentPrecioKg?.toFixed(3) ?? t('negModal.pricePh')}
                          value={c.precio_kg ?? ''}
                          onChange={(e) =>
                            updateCalibre(i, {
                              precio_kg: e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                          className="border border-border rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none"
                          title="Precio por kg para este calibre."
                        />
                        <button
                          type="button"
                          onClick={() => removeCalibre(i)}
                          disabled={calibres.length === 1}
                          className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {ctx && (
                        <p className={`text-[10px] px-1 ${overMax ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {t('negModal.maxKg').replace('{n}', ctx.maxKg.toLocaleString(numLoc))}
                          {' '}{t('negModal.maxKgSplit').replace('{v}', ctx.maxKgVendedor.toLocaleString(numLoc)).replace('{c}', ctx.maxKgComprador.toLocaleString(numLoc))}
                        </p>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={addCalibre}
                  disabled={calibres.length >= calibreOptions.length}
                  className="flex items-center gap-1 text-[11px] text-primary-dark hover:underline disabled:opacity-40 disabled:no-underline"
                >
                  <Plus className="w-3.5 h-3.5" /> {t('negModal.addCalibre')}
                </button>
                {contextLoaded && calibreOptions.length === 0 && (
                  <p className="text-[10px] text-amber-600">
                    {t('negModal.noContextCalibres')}
                  </p>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1" disabled={loading}>
              {t('negModal.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="flex-1"
              loading={loading}
              disabled={!hasChange}
            >
              {parentId ? t('negModal.submitCounter') : t('negModal.submit')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
