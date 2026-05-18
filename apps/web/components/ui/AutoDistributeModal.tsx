'use client';
import { useEffect, useState, useMemo } from 'react';
import { X, Trash2, Package, TrendingUp, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from './Button';

interface CalibreAlloc {
  calibre: string;
  cantidad_kg: number;
  precio_kg: number;
  max_kg: number;
}

interface Allocation {
  matchId: string;
  pedidoId: string;
  pedidoIdShort: string;
  compradorNombre: string;
  compradorEmpresa: string | null;
  calibres: CalibreAlloc[];
  totalKg: number;
  totalRevenue: number;
  avgPrecioKg: number;
}

interface LotGroup {
  loteId: string;
  productoNombre: string;
  totalLoteKg: number;
  remainingKg: number;
  allocations: Allocation[];
}

interface AutoDistributeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AutoDistributeModal({ open, onClose, onSuccess }: AutoDistributeModalProps) {
  const [loading, setLoading] = useState(true);
  const [lots, setLots] = useState<LotGroup[]>([]);
  // Editable state: { matchId: { calibre: cantidad_kg } } — null means deleted
  const [edits, setEdits] = useState<Record<string, Record<string, number> | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setErrors([]);
    setEdits({});
    setProgress(null);
    api
      .get<{ data: { lots: LotGroup[] } }>('/matching/seller/auto-distribute-preview')
      .then(({ data }) => setLots(data.data.lots ?? []))
      .catch((err) => {
        console.error('[auto-distribute] preview failed:', err);
        setErrors(['No se pudo cargar la propuesta. Intenta de nuevo.']);
      })
      .finally(() => setLoading(false));
  }, [open]);

  // Helper: get current (edited or original) cantidad for a (matchId, calibre)
  const getCantidad = (a: Allocation, calibre: string): number => {
    const edit = edits[a.matchId];
    if (edit === null) return 0; // deleted entirely
    if (edit && calibre in edit) return edit[calibre] ?? 0;
    const c = a.calibres.find((x) => x.calibre === calibre);
    return c?.cantidad_kg ?? 0;
  };

  const isDeleted = (matchId: string) => edits[matchId] === null;

  const setCantidad = (matchId: string, calibre: string, value: number) => {
    setEdits((prev) => {
      const cur = prev[matchId];
      if (cur === null) return prev; // can't edit a deleted row
      const next = { ...(cur ?? {}) };
      next[calibre] = Math.max(0, value);
      return { ...prev, [matchId]: next };
    });
  };

  const deleteRow = (matchId: string) => {
    setEdits((prev) => ({ ...prev, [matchId]: null }));
  };

  const restoreRow = (matchId: string) => {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[matchId];
      return next;
    });
  };

  // Compute live totals per allocation (for the table) and grand total
  const computed = useMemo(() => {
    let grandKg = 0;
    let grandRevenue = 0;
    const perAlloc = new Map<string, { totalKg: number; totalRevenue: number; avgPrecio: number }>();
    for (const lot of lots) {
      for (const a of lot.allocations) {
        if (isDeleted(a.matchId)) {
          perAlloc.set(a.matchId, { totalKg: 0, totalRevenue: 0, avgPrecio: 0 });
          continue;
        }
        let totalKg = 0;
        let totalRevenue = 0;
        for (const c of a.calibres) {
          const qty = getCantidad(a, c.calibre);
          totalKg += qty;
          totalRevenue += qty * c.precio_kg;
        }
        perAlloc.set(a.matchId, {
          totalKg,
          totalRevenue,
          avgPrecio: totalKg > 0 ? totalRevenue / totalKg : 0,
        });
        grandKg += totalKg;
        grandRevenue += totalRevenue;
      }
    }
    return { perAlloc, grandKg, grandRevenue };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lots, edits]);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrors([]);

    // Build the list of contributes to fire
    const toFire: Array<{ matchId: string; calibresContribucion: Array<{ calibre: string; cantidad_kg: number }> }> = [];
    for (const lot of lots) {
      for (const a of lot.allocations) {
        if (isDeleted(a.matchId)) continue;
        const calibresContribucion: Array<{ calibre: string; cantidad_kg: number }> = [];
        for (const c of a.calibres) {
          const qty = getCantidad(a, c.calibre);
          if (qty > 0) {
            calibresContribucion.push({ calibre: c.calibre, cantidad_kg: Math.round(qty * 100) / 100 });
          }
        }
        if (calibresContribucion.length > 0) {
          toFire.push({ matchId: a.matchId, calibresContribucion });
        }
      }
    }

    if (toFire.length === 0) {
      setErrors(['No hay nada que confirmar — todas las asignaciones están vacías o eliminadas.']);
      setSubmitting(false);
      return;
    }

    setProgress({ done: 0, total: toFire.length });
    const newErrors: string[] = [];

    // Fire sequentially to avoid race conditions on per-lot capacity
    for (let i = 0; i < toFire.length; i++) {
      const job = toFire[i]!;
      try {
        await api.post(`/matching/matches/${job.matchId}/contribute`, {
          calibresContribucion: job.calibresContribucion,
        });
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          `Match ${job.matchId.slice(-6)}: error desconocido`;
        newErrors.push(msg);
      }
      setProgress({ done: i + 1, total: toFire.length });
    }

    setSubmitting(false);
    setProgress(null);

    if (newErrors.length === 0) {
      onSuccess();
      onClose();
    } else {
      setErrors(newErrors);
      // Refresh preview so user can retry — surface if the refresh itself fails
      try {
        const res = await api.get<{ data: { lots: LotGroup[] } }>('/matching/seller/auto-distribute-preview');
        setLots(res.data.data.lots ?? []);
        setEdits({});
      } catch (refreshErr) {
        console.error('[auto-distribute] preview refresh failed:', refreshErr);
        setErrors([
          ...newErrors,
          'No se pudo recargar la propuesta. Cierra y vuelve a abrir el panel para actualizar.',
        ]);
      }
    }
  };

  if (!open) return null;

  const hasAnyAllocation = lots.some((l) => l.allocations.length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-card max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-semibold text-foreground">Auto-distribuir al mejor precio</h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-muted-foreground hover:text-muted-foreground disabled:opacity-30"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subheading */}
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900">
          Esta propuesta asigna tu inventario disponible a los pedidos con mayor ingreso total
          (€ máx × kg) primero. Puedes editar cantidades o eliminar líneas. Al confirmar, cada
          match pasa directamente a <strong>aceptado</strong> (el comprador solo necesita pagar).
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-text-muted">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Calculando asignación óptima…
            </div>
          ) : !hasAnyAllocation ? (
            <div className="py-12 text-center">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No hay matches pendientes que asignar.</p>
              <p className="text-xs text-text-muted mt-1">
                Cuando llegue alguna oferta nueva, vuelve aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {lots.map((lot) => (
                <div key={lot.loteId} className="border border-border rounded-card overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2.5 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{lot.productoNombre}</p>
                      <p className="text-[10px] text-text-muted">Lote {lot.loteId.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="text-xs text-text-muted">
                      Total lote: <strong>{lot.totalLoteKg.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kg</strong>
                    </div>
                  </div>

                  <div className="divide-y divide-border">
                    {lot.allocations.map((a) => {
                      const c = computed.perAlloc.get(a.matchId) ?? { totalKg: 0, totalRevenue: 0, avgPrecio: 0 };
                      const deleted = isDeleted(a.matchId);
                      return (
                        <div
                          key={a.matchId}
                          className={[
                            'px-4 py-3 transition-colors',
                            deleted ? 'bg-muted/50 opacity-50' : 'hover:bg-yellow-50/40',
                          ].join(' ')}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                #{a.pedidoIdShort} · {a.compradorEmpresa ?? a.compradorNombre}
                              </p>
                              <p className="text-[10px] text-text-muted">
                                {c.totalKg.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kg
                                {' · '}
                                avg {c.avgPrecio.toFixed(3)} €/kg
                                {' · '}
                                <strong className="text-secondary">{c.totalRevenue.toFixed(2)} €</strong>
                              </p>
                            </div>
                            {deleted ? (
                              <button
                                onClick={() => restoreRow(a.matchId)}
                                disabled={submitting}
                                className="text-xs text-secondary hover:underline disabled:opacity-50"
                              >
                                Restaurar
                              </button>
                            ) : (
                              <button
                                onClick={() => deleteRow(a.matchId)}
                                disabled={submitting}
                                className="p-1 text-muted-foreground hover:text-red-500 disabled:opacity-30"
                                aria-label="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {!deleted && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                              {a.calibres.map((c) => {
                                const qty = getCantidad(a, c.calibre);
                                return (
                                  <div key={c.calibre} className="flex items-center gap-2 text-xs">
                                    <span className="font-medium text-foreground min-w-[60px]">
                                      {c.calibre}
                                    </span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min={0}
                                      max={c.max_kg}
                                      value={qty}
                                      onChange={(e) =>
                                        setCantidad(a.matchId, c.calibre, parseFloat(e.target.value) || 0)
                                      }
                                      disabled={submitting}
                                      className="w-24 px-2 py-1 border border-border rounded text-right text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-muted"
                                    />
                                    <span className="text-text-muted">kg</span>
                                    <span className="text-text-muted ml-auto">
                                      @ {c.precio_kg.toFixed(3)} €
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              <p className="font-medium mb-1">Algunas asignaciones fallaron:</p>
              <ul className="list-disc ml-4 space-y-0.5">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 flex-wrap bg-muted/50">
          <div className="text-xs text-text-secondary">
            Total: <strong className="text-foreground">{computed.grandKg.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kg</strong>
            {' · '}
            Ingresos estimados: <strong className="text-secondary">{computed.grandRevenue.toFixed(2)} €</strong>
            {progress && (
              <span className="ml-2 text-text-muted">
                · Procesando {progress.done}/{progress.total}…
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={submitting || !hasAnyAllocation || computed.grandKg <= 0}
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Procesando…</> : 'Confirmar todas'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
