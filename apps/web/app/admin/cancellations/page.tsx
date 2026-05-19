'use client';

/**
 * Phase 9 — Admin "Cancelaciones" tab.
 *
 * Lists vendedor-comprador pairs that have crossed the cancellation threshold
 * (3+ cancellations between them in the last 90 days). The pattern usually
 * signals an attempt to bypass Primar-IA: the pair keeps signaling intent
 * inside the platform and closing the deal offline.
 *
 * Admin can resolve each case with:
 *   - INVESTIGADA (marked as reviewed, no action)
 *   - AVISADO     (warning sent to both users)
 *   - SUSPENDIDO  (both users banned — backend revokes their refresh tokens)
 */
import { useEffect, useState } from 'react';
import { XCircle, Loader2, AlertTriangle, Ban, Eye, MailWarning } from 'lucide-react';
import { api } from '@/lib/api';

type Estado = 'PENDIENTE' | 'INVESTIGADA' | 'AVISADO' | 'SUSPENDIDO';

interface PartyInfo {
  id: string;
  nombre: string;
  email: string;
  estado: string;
  empresa: string | null;
}

interface Case {
  id: string;
  vendedor: PartyInfo | null;
  comprador: PartyInfo | null;
  totalCancelaciones: number;
  ultimaCancelacionAt: string;
  estado: Estado;
  accionTomada: string | null;
  notas: string | null;
  createdAt: string;
}

const TABS: { key: Estado; label: string }[] = [
  { key: 'PENDIENTE', label: 'Pendientes' },
  { key: 'INVESTIGADA', label: 'Investigadas' },
  { key: 'AVISADO', label: 'Avisados' },
  { key: 'SUSPENDIDO', label: 'Suspendidos' },
];

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function countBadge(n: number): string {
  if (n >= 6) return 'bg-red-100 text-red-700';
  if (n >= 4) return 'bg-orange-100 text-orange-700';
  return 'bg-amber-100 text-amber-700';
}

export default function AdminCancellationsPage() {
  const [tab, setTab] = useState<Estado>('PENDIENTE');
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<string, string>>({});

  async function load(estado: Estado) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ data: Case[] }>(`/admin/cancellations?estado=${estado}`);
      setCases(data.data ?? []);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No se pudieron cargar los casos.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(tab); }, [tab]);

  async function handleResolve(id: string, accion: 'INVESTIGADA' | 'AVISADO' | 'SUSPENDIDO') {
    if (accion === 'SUSPENDIDO') {
      const ok = window.confirm(
        'Suspender a AMBOS usuarios (vendedor + comprador). Sus sesiones se invalidan y no podrán entrar a la plataforma. ¿Confirmas?',
      );
      if (!ok) return;
    }
    setResolving(id);
    try {
      await api.post(`/admin/cancellations/${id}/resolve`, { accion, notas: notas[id] ?? '' });
      setCases((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No se pudo resolver el caso.';
      alert(msg);
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
          <XCircle className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Cancelaciones sospechosas</h1>
          <p className="text-xs text-text-secondary">
            Parejas vendedor-comprador con 3+ cancelaciones en 90 días. Posible bypass de plataforma.
          </p>
        </div>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-input w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'px-4 py-1.5 text-sm font-medium rounded transition-colors',
              tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-text-secondary hover:text-foreground',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-card p-4">
          <AlertTriangle className="w-4 h-4 text-red-700 inline mr-1" />
          <span className="text-sm text-red-800">{error}</span>
        </div>
      ) : cases.length === 0 ? (
        <div className="bg-card border border-border rounded-card p-8 text-center">
          <XCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-text-secondary">No hay casos en esta categoría.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${countBadge(c.totalCancelaciones)}`}>
                      {c.totalCancelaciones} cancelaciones en 90 días
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-muted/40 rounded-lg p-2.5">
                      <p className="text-text-secondary uppercase tracking-wide text-[10px] mb-1">Vendedor</p>
                      {c.vendedor ? (
                        <>
                          <p className="font-semibold text-foreground">{c.vendedor.nombre}</p>
                          {c.vendedor.empresa && <p className="text-text-secondary">{c.vendedor.empresa}</p>}
                          <p className="text-text-muted">{c.vendedor.email}</p>
                          <p className="text-text-muted mt-1">Estado: {c.vendedor.estado}</p>
                        </>
                      ) : <p className="text-text-muted">Usuario no disponible</p>}
                    </div>
                    <div className="bg-muted/40 rounded-lg p-2.5">
                      <p className="text-text-secondary uppercase tracking-wide text-[10px] mb-1">Comprador</p>
                      {c.comprador ? (
                        <>
                          <p className="font-semibold text-foreground">{c.comprador.nombre}</p>
                          {c.comprador.empresa && <p className="text-text-secondary">{c.comprador.empresa}</p>}
                          <p className="text-text-muted">{c.comprador.email}</p>
                          <p className="text-text-muted mt-1">Estado: {c.comprador.estado}</p>
                        </>
                      ) : <p className="text-text-muted">Usuario no disponible</p>}
                    </div>
                  </div>
                </div>
                <div className="text-right text-[11px] text-text-secondary">
                  <p>Última: {fmtDate(c.ultimaCancelacionAt)}</p>
                  <p>Detectado: {fmtDate(c.createdAt)}</p>
                </div>
              </div>

              {c.estado === 'PENDIENTE' || c.estado === 'INVESTIGADA' ? (
                <div className="space-y-2 pt-1">
                  <textarea
                    value={notas[c.id] ?? c.notas ?? ''}
                    onChange={(e) => setNotas((n) => ({ ...n, [c.id]: e.target.value }))}
                    placeholder="Notas de la investigación (opcional)…"
                    className="w-full text-xs border border-border rounded-lg px-2 py-1.5 resize-none"
                    rows={2}
                    maxLength={1000}
                  />
                  <div className="flex gap-2 flex-wrap">
                    {c.estado === 'PENDIENTE' && (
                      <button
                        onClick={() => handleResolve(c.id, 'INVESTIGADA')}
                        disabled={resolving === c.id}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-muted disabled:opacity-50 flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Marcar investigada
                      </button>
                    )}
                    <button
                      onClick={() => handleResolve(c.id, 'AVISADO')}
                      disabled={resolving === c.id}
                      className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50 flex items-center gap-1"
                    >
                      <MailWarning className="w-3.5 h-3.5" />
                      Avisar a ambos
                    </button>
                    <button
                      onClick={() => handleResolve(c.id, 'SUSPENDIDO')}
                      disabled={resolving === c.id}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Suspender a ambos
                    </button>
                    {resolving === c.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-text-secondary pt-1 border-t border-border">
                  Resuelto como <strong>{c.estado}</strong>
                  {c.notas && <> · {c.notas}</>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
