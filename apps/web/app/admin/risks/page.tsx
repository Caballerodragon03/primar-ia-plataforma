'use client';

/**
 * Phase 8 — Admin "Riesgos" tab.
 *
 * Lists BypassAlert rows flagged by the daily Gemini scanner. Admin can
 * resolve each alert with one of three actions:
 *   - AVISADO     (sent the user a warning)
 *   - BANEADO     (banned the user — backend sets estado=SUSPENDIDO atomically)
 *   - DESCARTADO  (false positive)
 */
import { useEffect, useState } from 'react';
import { ShieldAlert, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { BYPASS_PATRON_LABELS_ES, type BypassAlertEstado, type BypassPatron } from '@primaria/shared';

// Phase 12 — local re-exports for brevity; types are canonical in @primaria/shared.
type Estado = BypassAlertEstado;
type Patron = BypassPatron;

interface BypassAlert {
  id: string;
  mensajeId: string;
  transaccionId: string | null;
  score: number;
  patrones: Patron[];
  extracto: string | null;
  estado: Estado;
  accionTomada: string | null;
  resolvedAt: string | null;
  createdAt: string;
  mensajeCreatedAt: string | null;
  remitente: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
    estado: string;
  } | null;
  productoNombre: string | null;
}

const PATRON_LABELS = BYPASS_PATRON_LABELS_ES;

const PATRON_COLORS: Record<Patron, string> = {
  phone: 'bg-red-100 text-red-700 border-red-200',
  email: 'bg-red-100 text-red-700 border-red-200',
  messaging: 'bg-orange-100 text-orange-700 border-orange-200',
  location: 'bg-amber-100 text-amber-700 border-amber-200',
  offer_off_platform: 'bg-rose-100 text-rose-700 border-rose-200',
  other: 'bg-muted text-text-secondary border-border',
};

const TABS: { key: Estado; label: string }[] = [
  { key: 'PENDIENTE', label: 'Pendientes' },
  { key: 'AVISADO', label: 'Avisados' },
  { key: 'BANEADO', label: 'Baneados' },
  { key: 'DESCARTADO', label: 'Descartados' },
];

function scoreColor(score: number): string {
  if (score >= 80) return 'text-red-700 bg-red-100';
  if (score >= 65) return 'text-orange-700 bg-orange-100';
  return 'text-amber-700 bg-amber-100';
}

export default function AdminRisksPage() {
  const [tab, setTab] = useState<Estado>('PENDIENTE');
  const [alerts, setAlerts] = useState<BypassAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [scanRunning, setScanRunning] = useState(false);

  async function handleRunScan() {
    setScanRunning(true);
    try {
      const { data } = await api.post<{ data: { scanned: number; flagged: number; alreadyAlerted: number; errors: number } }>(
        '/admin/maintenance/bypass-scan/run',
      );
      const r = data.data;
      alert(`Scan completado.\nMensajes analizados: ${r.scanned}\nAlertas nuevas: ${r.flagged}\nYa alertados: ${r.alreadyAlerted}\nErrores: ${r.errors}`);
      if (r.flagged > 0) void load(tab);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No se pudo ejecutar el scan.';
      alert(msg);
    } finally {
      setScanRunning(false);
    }
  }

  async function load(estado: Estado) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ data: BypassAlert[] }>(`/admin/bypass-alerts?estado=${estado}`);
      setAlerts(data.data ?? []);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No se pudieron cargar las alertas.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(tab);
  }, [tab]);

  async function handleResolve(id: string, accion: 'AVISADO' | 'BANEADO' | 'DESCARTADO') {
    if (accion === 'BANEADO') {
      const ok = window.confirm(
        'Banear al usuario suspenderá su acceso a la plataforma. ¿Confirmas?',
      );
      if (!ok) return;
    }
    setResolving(id);
    try {
      await api.post(`/admin/bypass-alerts/${id}/resolve`, { accion, notas: notas[id] ?? '' });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No se pudo resolver la alerta.';
      alert(msg);
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Riesgos — Anti-bypass</h1>
            <p className="text-xs text-text-secondary">
              Alertas generadas por la IA al revisar el chat. Revisa y toma acción.
            </p>
          </div>
        </div>
        <button
          onClick={handleRunScan}
          disabled={scanRunning}
          className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-muted disabled:opacity-50 flex items-center gap-1.5"
          title="Forzar ejecución del scan de anti-bypass ahora (en lugar de esperar al cron diario 09:00 Madrid)"
        >
          {scanRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Ejecutar scan ahora
        </button>
      </div>

      {/* Tabs */}
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

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-card p-4">
          <AlertTriangle className="w-4 h-4 text-red-700 inline mr-1" />
          <span className="text-sm text-red-800">{error}</span>
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-card border border-border rounded-card p-8 text-center">
          <ShieldAlert className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-text-secondary">No hay alertas en esta categoría.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className="bg-card border border-border rounded-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${scoreColor(a.score)}`}>
                      Score {a.score}
                    </span>
                    {a.patrones.map((p) => (
                      <span key={p} className={`text-[11px] font-medium px-2 py-0.5 rounded-badge border ${PATRON_COLORS[p]}`}>
                        {PATRON_LABELS[p]}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-foreground mt-2">
                    {a.remitente?.nombre ?? 'Usuario desconocido'}
                    <span className="text-text-secondary font-normal ml-2">
                      ({a.remitente?.email}) · {a.remitente?.rol}
                    </span>
                  </p>
                  {a.productoNombre && (
                    <p className="text-xs text-text-secondary mt-0.5">
                      Conversación sobre: <span className="font-medium">{a.productoNombre}</span>
                    </p>
                  )}
                </div>
                <span className="text-[11px] text-text-secondary whitespace-nowrap">
                  {new Date(a.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>

              {a.extracto && (
                <blockquote className="text-xs text-text-secondary border-l-2 border-amber-300 bg-amber-50/50 px-3 py-2 italic">
                  "{a.extracto}"
                </blockquote>
              )}

              {a.estado === 'PENDIENTE' ? (
                <div className="space-y-2 pt-1">
                  <textarea
                    value={notas[a.id] ?? ''}
                    onChange={(e) => setNotas((n) => ({ ...n, [a.id]: e.target.value }))}
                    placeholder="Notas internas (opcional)…"
                    className="w-full text-xs border border-border rounded-lg px-2 py-1.5 resize-none"
                    rows={2}
                    maxLength={500}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleResolve(a.id, 'DESCARTADO')}
                      disabled={resolving === a.id}
                      className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-muted disabled:opacity-50"
                    >
                      Falso positivo
                    </button>
                    <button
                      onClick={() => handleResolve(a.id, 'AVISADO')}
                      disabled={resolving === a.id}
                      className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    >
                      Marcar como avisado
                    </button>
                    <button
                      onClick={() => handleResolve(a.id, 'BANEADO')}
                      disabled={resolving === a.id}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Banear usuario
                    </button>
                    {resolving === a.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-text-secondary pt-1 border-t border-border">
                  Resuelto como <strong>{a.estado}</strong>
                  {a.resolvedAt && (
                    <> el {new Date(a.resolvedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</>
                  )}
                  {a.accionTomada && <> · {a.accionTomada}</>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
