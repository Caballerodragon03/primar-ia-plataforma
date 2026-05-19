'use client';

/**
 * Phase 13 — Admin /cron-status. Tabla con el último run de cada cron job
 * + status + duración + payload del resultado. Permite detectar fallos
 * silenciosos (un cron que no ha corrido en 24h, un job que devuelve
 * errors > 0).
 */
import { useEffect, useState } from 'react';
import { Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface CronRun {
  jobName: string;
  status: 'success' | 'failure';
  result: unknown;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms / 60_000)} min`;
}

function staleness(iso: string): { label: string; cls: string } {
  const ageMs = Date.now() - new Date(iso).getTime();
  if (ageMs < 2 * 60 * 60 * 1000) return { label: 'reciente', cls: 'text-green-700 bg-green-50' };
  if (ageMs < 26 * 60 * 60 * 1000) return { label: 'última 24h', cls: 'text-text-secondary bg-muted' };
  return { label: '>24h sin correr', cls: 'text-red-700 bg-red-50' };
}

export default function AdminCronStatusPage() {
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data: CronRun[] }>('/admin/maintenance/cron-status')
      .then(({ data }) => setRuns(data.data ?? []))
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          ?? 'No se pudo cargar el estado de los cron jobs.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Cron status</h1>
          <p className="text-xs text-text-secondary">
            Último run de cada job programado. Si un cron diario lleva &gt;24h sin correr, algo va mal.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-card p-4 text-sm text-red-800">{error}</div>
      ) : runs.length === 0 ? (
        <div className="bg-card border border-border rounded-card p-8 text-center text-sm text-text-secondary">
          Aún no se ha registrado ningún cron run. Los jobs se trackean a partir de la primera ejecución tras desplegar Fase 13.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-text-secondary uppercase tracking-wide text-[11px]">
              <tr>
                <th className="text-left px-4 py-2">Job</th>
                <th className="text-left px-4 py-2">Última ejecución</th>
                <th className="text-left px-4 py-2">Estado</th>
                <th className="text-right px-4 py-2">Duración</th>
                <th className="text-left px-4 py-2">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const st = staleness(r.finishedAt);
                return (
                  <tr key={r.jobName} className="border-t border-border align-top">
                    <td className="px-4 py-3 font-medium text-foreground">{r.jobName}</td>
                    <td className="px-4 py-3 text-xs">
                      {fmtDateTime(r.finishedAt)}
                      <span className={`ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-700">
                          <XCircle className="w-3.5 h-3.5" /> Failure
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-text-secondary">{fmtDuration(r.durationMs)}</td>
                    <td className="px-4 py-3 text-[11px] text-text-secondary font-mono break-all max-w-md">
                      {r.result ? JSON.stringify(r.result) : <span className="italic">— sin payload —</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
