'use client';
import { useEffect, useState, useCallback } from 'react';
import { Bug, ExternalLink, Save, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

type Estado = 'NUEVO' | 'EN_PROGRESO' | 'RESUELTO' | 'DESCARTADO';

interface BugReport {
  id: string;
  userId: string | null;
  url: string | null;
  descripcion: string;
  capturaUrl: string | null;
  userAgent: string | null;
  estado: Estado;
  adminNotas: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReportWithReporter extends BugReport {
  reporter: { id: string; email: string; nombre: string; apellidos: string; role: string } | null;
}

const ESTADO_LABELS: Record<Estado, { label: string; classes: string }> = {
  NUEVO: { label: 'Nuevo', classes: 'bg-red-100 text-red-800 border-red-200' },
  EN_PROGRESO: { label: 'En progreso', classes: 'bg-amber-100 text-amber-800 border-amber-200' },
  RESUELTO: { label: 'Resuelto', classes: 'bg-green-100 text-green-800 border-green-200' },
  DESCARTADO: { label: 'Descartado', classes: 'bg-gray-100 text-gray-700 border-gray-200' },
};

const ESTADOS: Estado[] = ['NUEVO', 'EN_PROGRESO', 'RESUELTO', 'DESCARTADO'];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
}

export default function BugReportsAdminPage() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState<Estado | 'TODOS'>('NUEVO');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReportWithReporter | null>(null);
  const [draftEstado, setDraftEstado] = useState<Estado>('NUEVO');
  const [draftNotas, setDraftNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const q = filterEstado === 'TODOS' ? '' : `?estado=${filterEstado}`;
      const res = await api.get<{ data: { reports: BugReport[]; counts: Record<string, number> } }>(
        `/admin/bug-reports${q}`,
      );
      setReports(res.data.data.reports ?? []);
      setCounts(res.data.data.counts ?? {});
    } catch (err) {
      console.error('Failed to load bug reports:', err);
    } finally {
      setLoading(false);
    }
  }, [filterEstado]);

  useEffect(() => { fetchList(); }, [fetchList]);

  useEffect(() => {
    if (!selectedId) { setSelected(null); return; }
    api.get<{ data: ReportWithReporter }>(`/admin/bug-reports/${selectedId}`)
      .then(({ data }) => {
        setSelected(data.data);
        setDraftEstado(data.data.estado);
        setDraftNotas(data.data.adminNotas ?? '');
      })
      .catch((err) => console.error('Failed to load report:', err));
  }, [selectedId]);

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await api.patch(`/admin/bug-reports/${selectedId}`, {
        estado: draftEstado,
        adminNotas: draftNotas,
      });
      await fetchList();
      // Refresh detail
      const res = await api.get<{ data: ReportWithReporter }>(`/admin/bug-reports/${selectedId}`);
      setSelected(res.data.data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bug className="w-5 h-5 text-secondary" />
            Bug Reports
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Reportes de problemas enviados por usuarios.
          </p>
        </div>
        <button
          onClick={fetchList}
          className="text-xs flex items-center gap-1 px-3 py-1.5 border border-border rounded text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refrescar
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white p-1 rounded border border-border w-fit mb-4 text-xs">
        {(['TODOS', ...ESTADOS] as const).map((e) => (
          <button
            key={e}
            onClick={() => { setFilterEstado(e); setSelectedId(null); }}
            className={[
              'px-3 py-1.5 rounded font-medium transition-colors',
              filterEstado === e ? 'bg-primary text-gray-900' : 'text-gray-600 hover:bg-gray-50',
            ].join(' ')}
          >
            {e === 'TODOS' ? 'Todos' : ESTADO_LABELS[e].label}
            {e !== 'TODOS' && counts[e] !== undefined && (
              <span className="ml-1.5 text-[10px] text-gray-500">({counts[e]})</span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* List */}
        <div className="bg-white border border-border rounded-card overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-gray-50 text-xs font-medium text-gray-600">
            {reports.length} reporte{reports.length === 1 ? '' : 's'}
          </div>
          {loading ? (
            <div className="p-4 space-y-2">
              {[1,2,3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : reports.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-400 italic">Sin reportes en este filtro.</p>
          ) : (
            <div className="divide-y divide-border max-h-[calc(100vh-280px)] overflow-y-auto">
              {reports.map((r) => {
                const meta = ESTADO_LABELS[r.estado];
                const isSel = selectedId === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={[
                      'w-full text-left p-3 transition-colors',
                      isSel ? 'bg-yellow-50' : 'hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${meta.classes}`}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-gray-400">{formatDate(r.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-900 line-clamp-2">{r.descripcion}</p>
                    {r.url && (
                      <p className="text-[10px] text-gray-400 truncate mt-1 font-mono">{r.url}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="bg-white border border-border rounded-card">
          {!selected ? (
            <div className="p-8 text-center text-sm text-gray-400">
              Selecciona un reporte para ver los detalles.
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Reportado por</p>
                {selected.reporter ? (
                  <p className="text-sm text-gray-900">
                    {selected.reporter.nombre} {selected.reporter.apellidos}
                    <span className="text-xs text-gray-500 ml-1.5">
                      ({selected.reporter.email} · {selected.reporter.role})
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Usuario desconocido</p>
                )}
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {formatDate(selected.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Descripción</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{selected.descripcion}</p>
              </div>

              {selected.url && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">URL</p>
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-secondary hover:underline break-all flex items-center gap-1"
                  >
                    {selected.url} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}

              {selected.capturaUrl && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Captura</p>
                  <a
                    href={selected.capturaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={selected.capturaUrl}
                      alt="Screenshot del reporte"
                      className="max-h-64 rounded border border-border hover:opacity-90 cursor-pointer"
                    />
                  </a>
                </div>
              )}

              {selected.userAgent && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">User Agent</p>
                  <p className="text-[10px] text-gray-500 font-mono break-all">{selected.userAgent}</p>
                </div>
              )}

              <div className="border-t border-border pt-4 space-y-3">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Estado</p>
                  <select
                    value={draftEstado}
                    onChange={(e) => setDraftEstado(e.target.value as Estado)}
                    className="w-full px-3 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {ESTADOS.map((e) => (
                      <option key={e} value={e}>{ESTADO_LABELS[e].label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Notas internas</p>
                  <textarea
                    value={draftNotas}
                    onChange={(e) => setDraftNotas(e.target.value)}
                    rows={3}
                    placeholder="Notas para el equipo…"
                    className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-gray-900 rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>

                {selected.resolvedAt && (
                  <p className="text-[10px] text-green-700">
                    Resuelto el {formatDate(selected.resolvedAt)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
