'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Bug, X, Loader2, CheckCircle2, Upload, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

/**
 * Small floating "Report bug" button + modal. Mounted globally for any
 * authenticated user. Captures URL, screenshot, and description; ships to
 * /api/v1/bug-reports.
 */
export function ReportBugButton() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const [open, setOpen] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill URL with current location when modal opens
  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      setUrl(window.location.href);
    }
  }, [open]);

  // Don't render for non-authenticated users
  if (!user) return null;

  const reset = () => {
    setDescripcion('');
    setUrl('');
    setFile(null);
    setSuccess(false);
    setError(null);
  };

  const close = () => {
    if (submitting || uploading) return;
    setOpen(false);
    setTimeout(reset, 200);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setError('Imagen demasiado grande (máx. 10 MB)');
      return;
    }
    if (!f.type.startsWith('image/')) {
      setError('Solo se aceptan imágenes');
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleSubmit = async () => {
    if (submitting || uploading) return;
    if (descripcion.trim().length < 5) {
      setError('La descripción debe tener al menos 5 caracteres.');
      return;
    }
    setError(null);

    let capturaUrl: string | undefined;

    // 1. Upload the screenshot if any
    if (file) {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await api.post<{ data: { url: string } }>('/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        capturaUrl = res.data.data.url;
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg ?? 'Error al subir la imagen.');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    // 2. Create the report
    setSubmitting(true);
    try {
      await api.post('/bug-reports', {
        descripcion: descripcion.trim(),
        url: url.trim() || undefined,
        capturaUrl,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      });
      setSuccess(true);
      setTimeout(close, 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Error al enviar el reporte.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 group flex items-center gap-2 px-3 py-2 rounded-full bg-card border border-border shadow-md hover:shadow-lg hover:bg-accent/50 transition-all text-xs font-medium text-text-secondary hover:text-secondary"
        aria-label="Reportar un problema"
        title="Reportar un problema"
      >
        <Bug className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Reportar bug</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card rounded-card max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-secondary" />
                <h2 className="text-base font-semibold text-foreground">Reportar un problema</h2>
              </div>
              <button
                onClick={close}
                disabled={submitting || uploading}
                className="text-muted-foreground hover:text-muted-foreground disabled:opacity-30"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {success ? (
                <div className="py-6 text-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">¡Gracias!</p>
                  <p className="text-xs text-text-secondary mt-1">
                    Tu reporte se envió correctamente. Lo revisaremos cuanto antes.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      ¿Qué ocurrió? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      rows={4}
                      maxLength={5000}
                      placeholder="Describe el problema: qué intentabas hacer, qué pasó, qué esperabas que ocurriera…"
                      className="w-full px-3 py-2 border border-border rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      disabled={submitting || uploading}
                    />
                    <p className="text-[11px] text-text-muted mt-0.5 text-right">
                      {descripcion.length}/5000
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      URL de la página
                    </label>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://app.primar-ia.com/..."
                      className="w-full px-3 py-2 border border-border rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-xs"
                      disabled={submitting || uploading}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Captura de pantalla (opcional)
                    </label>
                    {file ? (
                      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/50 border border-border rounded-input text-xs">
                        <span className="truncate text-text-secondary">
                          📎 {file.name} <span className="text-text-muted">({(file.size / 1024).toFixed(0)} KB)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          disabled={submitting || uploading}
                          className="text-red-400 hover:text-red-600 flex-shrink-0"
                          aria-label="Quitar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 px-3 py-3 border border-dashed border-border rounded-input text-xs text-text-muted hover:bg-accent/50 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        Elegir imagen (PNG, JPG, máx. 10 MB)
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                          disabled={submitting || uploading}
                        />
                      </label>
                    )}
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-xs text-red-700">
                      {error}
                    </div>
                  )}

                  <p className="text-[11px] text-text-muted">
                    Página: <span className="font-mono">{pathname ?? '(desconocida)'}</span>
                  </p>
                </>
              )}
            </div>

            {!success && (
              <div className="px-5 py-3 border-t border-border flex justify-end gap-2 bg-muted/50">
                <button
                  onClick={close}
                  disabled={submitting || uploading}
                  className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-foreground disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || uploading || descripcion.trim().length < 5}
                  className="px-4 py-1.5 text-xs font-semibold bg-primary text-foreground rounded-button hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {(uploading || submitting) && <Loader2 className="w-3 h-3 animate-spin" />}
                  {uploading ? 'Subiendo imagen…' : submitting ? 'Enviando…' : 'Enviar reporte'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
