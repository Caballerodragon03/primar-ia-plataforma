'use client';
import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

type IssueType =
  | 'CALIDAD'
  | 'CANTIDAD'
  | 'EMPAQUETADO'
  | 'CALIBRES'
  | 'PRODUCTO_DIFERENTE'
  | 'OTRO';

const ISSUE_KEY_BY_TYPE: Record<IssueType, MessageKey> = {
  CALIDAD: 'report.issue.CALIDAD',
  CANTIDAD: 'report.issue.CANTIDAD',
  EMPAQUETADO: 'report.issue.EMPAQUETADO',
  CALIBRES: 'report.issue.CALIBRES',
  PRODUCTO_DIFERENTE: 'report.issue.PRODUCTO_DIFERENTE',
  OTRO: 'report.issue.OTRO',
};

const MIN_DESCRIPTION = 20;

export default function ReportIssuePage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [tipoProblema, setTipoProblema] = useState<IssueType>('CALIDAD');
  const [descripcion, setDescripcion] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issueOptions = useMemo(
    () => (Object.keys(ISSUE_KEY_BY_TYPE) as IssueType[]).map((value) => ({
      value,
      label: t(ISSUE_KEY_BY_TYPE[value]),
    })),
    [t],
  );

  const descriptionError =
    descripcion.length > 0 && descripcion.length < MIN_DESCRIPTION
      ? t('report.descRequired').replace('{n}', String(MIN_DESCRIPTION))
      : undefined;

  const canSubmit =
    tipoProblema &&
    descripcion.length >= MIN_DESCRIPTION &&
    !submitting;

  const handleFileSelect = async (file: File | null) => {
    if (!file || files.length >= 6) return;
    setFiles((prev) => [...prev, file]);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'disputes');
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEvidenceUrls((prev) => [...prev, res.data.data.url]);
    } catch {
      setError(t('report.uploadFail'));
      setFiles((prev) => prev.slice(0, -1));
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setEvidenceUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);

    try {
      await api.post('/disputes', {
        transaccionId: id,
        tipoProblema,
        descripcion,
        evidenciasUrls: evidenceUrls,
      });
      router.push(`/buyer/orders/${id}`);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? t('report.submitFail'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-card bg-red-50 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t('report.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('report.orderHash')}{id}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-card border border-border p-6 space-y-6">
        <Select
          label={t('report.issueType')}
          required
          value={tipoProblema}
          onChange={(e) => setTipoProblema(e.target.value as IssueType)}
          options={issueOptions}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">
            {t('report.describe')} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder={t('report.descPh')}
            rows={5}
            className={[
              'w-full px-3 py-2.5 rounded-input border text-sm text-foreground placeholder-gray-400 bg-card',
              'transition-colors duration-150 resize-none',
              'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
              descriptionError ? 'border-red-400' : 'border-border hover:border-gray-400',
            ].join(' ')}
          />
          <div className="flex items-center justify-between">
            {descriptionError ? (
              <p role="alert" className="text-xs text-red-500">⚠ {descriptionError}</p>
            ) : (
              <span />
            )}
            <span className={['text-xs', descripcion.length >= MIN_DESCRIPTION ? 'text-muted-foreground' : 'text-amber-500'].join(' ')}>
              {descripcion.length} / {MIN_DESCRIPTION} {t('report.minChars')}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <FileDropzone
            label={t('report.evidenceLabel')}
            hint={t('report.evidenceHint').replace('{n}', String(files.length))}
            accept="image/*,.pdf"
            maxSizeMB={10}
            onFileSelect={handleFileSelect}
          />

          {files.length > 0 && (
            <ul className="space-y-1.5">
              {files.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between px-3 py-2 rounded-input border border-border bg-muted/50 text-sm"
                >
                  <span className="truncate text-foreground">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="ml-3 text-muted-foreground hover:text-red-500 flex-shrink-0 cursor-pointer text-xs"
                  >
                    {t('report.remove')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-500 flex items-center gap-1.5">
            <span>⚠</span> {error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
          >
            {t('report.cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={!canSubmit}
          >
            {t('report.submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}
