'use client';

import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useT } from '@/lib/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

type TipoValoracion = 'VENDEDOR_A_COMPRADOR' | 'COMPRADOR_A_VENDEDOR';

interface RatingModalProps {
  transaccionId: string;
  destinatarioId: string;
  tipo: TipoValoracion;
  onClose: () => void;
  onSuccess?: () => void;
}

interface EjeRating {
  key: string;
  labelKey: MessageKey;
}

const EJES_VENDEDOR: EjeRating[] = [
  { key: 'calidad', labelKey: 'rating.eje.calidad' },
  { key: 'puntualidad', labelKey: 'rating.eje.puntualidadDelivery' },
  { key: 'empaquetado', labelKey: 'rating.eje.empaquetado' },
  { key: 'comunicacion', labelKey: 'rating.eje.comunicacion' },
  { key: 'profesionalidad', labelKey: 'rating.eje.profesionalidad' },
];

const EJES_COMPRADOR: EjeRating[] = [
  { key: 'comunicacion', labelKey: 'rating.eje.comunicacion' },
  { key: 'profesionalidad', labelKey: 'rating.eje.profesionalidad' },
  { key: 'puntualidad', labelKey: 'rating.eje.puntualidadPago' },
];

function StarPicker({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const t = useT();
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground flex-1">{label}</span>
      <div className="flex items-center gap-0.5" role="radiogroup" aria-label={label}>
        {Array.from({ length: 5 }).map((_, i) => {
          const starVal = i + 1;
          const active = starVal <= (hovered || value);
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={value === starVal}
              aria-label={t('rating.starsAria').replace('{n}', String(starVal))}
              onMouseEnter={() => setHovered(starVal)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => onChange(starVal)}
              className="p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 rounded"
            >
              <Star
                className={[
                  'h-6 w-6 transition-colors',
                  active ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200',
                ].join(' ')}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

type RatingValues = Record<string, number>;

export function RatingModal({ transaccionId, destinatarioId, tipo, onClose, onSuccess }: RatingModalProps) {
  const t = useT();
  const ejes: EjeRating[] =
    tipo === 'COMPRADOR_A_VENDEDOR' ? EJES_VENDEDOR : EJES_COMPRADOR;

  const [ratings, setRatings] = useState<RatingValues>(
    () => Object.fromEntries(ejes.map((e) => [e.key, 0]))
  );
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allFilled = ejes.every((e) => ratings[e.key]! > 0);

  function setRating(key: string, value: number) {
    setRatings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allFilled) {
      setError(t('rating.allRequired'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        transaccionId,
        destinatarioId,
        tipo,
        ...ratings,
        ...(comentario.trim() ? { comentario: comentario.trim() } : {}),
      };
      await api.post('/valoraciones', body);
      setSuccess(true);
      setTimeout(() => { onSuccess?.(); onClose(); }, 1500);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setAlreadyRated(true);
      } else {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          t('rating.submitFail');
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rating-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 bg-card rounded-card shadow-xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 id="rating-modal-title" className="font-semibold text-foreground text-base">
            {t('rating.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-muted-foreground"
            aria-label={t('rating.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {alreadyRated ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground font-medium">{t('rating.alreadyRated')}</p>
            <Button variant="outline" size="sm" onClick={onClose} className="mt-4">
              {t('rating.close')}
            </Button>
          </div>
        ) : success ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-green-600 font-medium">{t('rating.successMsg')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="px-5 py-4 space-y-4">
              {ejes.map((eje) => (
                <StarPicker
                  key={eje.key}
                  label={t(eje.labelKey)}
                  value={ratings[eje.key] ?? 0}
                  onChange={(v) => setRating(eje.key, v)}
                />
              ))}

              <div className="pt-2">
                <label className="block text-sm text-foreground mb-1" htmlFor="rating-comentario">
                  {t('rating.commentLabel')}
                </label>
                <textarea
                  id="rating-comentario"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder={t('rating.commentPh')}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                <p className="text-[11px] text-muted-foreground text-right mt-0.5">
                  {comentario.length}/500
                </p>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
              {error && (
                <p className="text-xs text-red-500 flex-1" role="alert">
                  {error}
                </p>
              )}
              {!error && <span className="flex-1" />}
              <div className="flex gap-2 flex-shrink-0">
                <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
                  {t('rating.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={loading}
                  disabled={!allFilled}
                >
                  {t('rating.submit')}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
