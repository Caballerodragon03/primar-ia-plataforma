'use client';

/**
 * Phase 14A — Admin "Refunds" tab.
 *
 * Cola de PendingRefund que el webhook crea cuando un pago llega para un
 * contrato que ya no está válido (caducó, cancelado, revertido por
 * negociación). El admin procesa cada caso refund en Stripe dashboard y
 * luego marca resuelto aquí.
 */
import { useEffect, useState } from 'react';
import { Banknote, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Refund {
  id: string;
  matchId: string;
  stripeChargeId: string;
  motivo: string;
  compradorEmail: string;
  compradorNombre: string;
  importeEur: number;
  resolvedAt: string | null;
  resolvedBy: string | null;
  notas: string | null;
  createdAt: string;
}

const TABS = [
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'resueltos', label: 'Resueltos' },
] as const;
type Tab = (typeof TABS)[number]['key'];

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminRefundsPage() {
  const [tab, setTab] = useState<Tab>('pendientes');
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<string, string>>({});

  async function load(t: Tab) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ data: Refund[] }>(`/admin/refunds?estado=${t}`);
      setRefunds(data.data ?? []);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No se pudieron cargar los refunds.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(tab); }, [tab]);

  async function handleResolve(id: string) {
    const ok = window.confirm(
      'Asegúrate de haber procesado el refund manualmente en Stripe antes de marcarlo resuelto. ¿Continuar?',
    );
    if (!ok) return;
    setResolving(id);
    try {
      await api.post(`/admin/refunds/${id}/resolve`, { notas: notas[id] ?? '' });
      setRefunds((prev) => prev.filter((r) => r.id !== id));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No se pudo marcar resuelto.';
      alert(msg);
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
          <Banknote className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Refunds pendientes</h1>
          <p className="text-xs text-text-secondary">
            Pagos cobrados a compradores cuyo contrato ya no era válido al llegar el webhook. Procesa cada uno en el dashboard de Stripe y márcalos resueltos aquí.
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
        <div className="bg-red-50 border border-red-200 rounded-card p-4 text-sm text-red-800">{error}</div>
      ) : refunds.length === 0 ? (
        <div className="bg-card border border-border rounded-card p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="text-sm text-text-secondary">
            {tab === 'pendientes'
              ? 'No hay refunds pendientes — todos los pagos de comisión llegaron a un contrato válido.'
              : 'Aún no se ha marcado ningún refund como resuelto.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {refunds.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-semibold text-foreground">
                      {r.compradorNombre} · {r.importeEur.toFixed(2)} €
                    </p>
                  </div>
                  <p className="text-xs text-text-secondary">{r.compradorEmail}</p>
                  <p className="text-[11px] text-text-muted font-mono mt-1">
                    Match: <span className="text-foreground">{r.matchId}</span>
                  </p>
                  <p className="text-[11px] text-text-muted font-mono">
                    Stripe charge: <span className="text-foreground">{r.stripeChargeId}</span>
                  </p>
                </div>
                <span className="text-[11px] text-text-secondary whitespace-nowrap">
                  Recibido: {fmtDateTime(r.createdAt)}
                </span>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <p className="text-[11px] font-semibold text-amber-900">Motivo del fallo</p>
                <p className="text-xs text-amber-800 mt-0.5">{r.motivo}</p>
              </div>

              {tab === 'pendientes' ? (
                <div className="space-y-2 pt-1">
                  <textarea
                    value={notas[r.id] ?? ''}
                    onChange={(e) => setNotas((n) => ({ ...n, [r.id]: e.target.value }))}
                    placeholder="Notas internas (referencia del refund Stripe, etc.)…"
                    className="w-full text-xs border border-border rounded-lg px-2 py-1.5 resize-none"
                    rows={2}
                    maxLength={1000}
                  />
                  <button
                    onClick={() => handleResolve(r.id)}
                    disabled={resolving === r.id}
                    className="text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {resolving === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Marcar como resuelto
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-text-secondary pt-1 border-t border-border">
                  Resuelto el {fmtDateTime(r.resolvedAt)}
                  {r.notas && <> · {r.notas}</>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
