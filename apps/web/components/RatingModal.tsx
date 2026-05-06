'use client';

import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';

type TipoValoracion = 'VENDEDOR_A_COMPRADOR' | 'COMPRADOR_A_VENDEDOR';

interface RatingModalProps {
  transaccionId: string;
  destinatarioId: string;
  tipo: TipoValoracion;
  onClose: () => void;
}

interface EjeRating {
  key: string;
  label: string;
}

const EJES_COMUNES: EjeRating[] = [
  { key: 'calidad', label: 'Calidad del producto' },
  { key: 'puntualidad', label: 'Puntualidad' },
  { key: 'comunicacion', label: 'Comunicación' },
  { key: 'profesionalidad', label: 'Profesionalidad' },
];

const EJE_EMPAQUETADO: EjeRating = { key: 'empaquetado', label: 'Empaquetado' };

function StarPicker({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-700 flex-1">{label}</span>
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
              aria-label={`${starVal} estrella${starVal > 1 ? 's' : ''}`}
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

export function RatingModal({ transaccionId, destinatarioId, tipo, onClose }: RatingModalProps) {
  const ejes: EjeRating[] =
    tipo === 'COMPRADOR_A_VENDEDOR'
      ? [...EJES_COMUNES, EJE_EMPAQUETADO]
      : EJES_COMUNES;

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
      setError('Por favor, valora todos los criterios.');
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
      setTimeout(() => onClose(), 1500);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setAlreadyRated(true);
      } else {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'No se pudo enviar la valoración. Inténtalo de nuevo.';
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
      <div className="relative z-10 bg-white rounded-card shadow-xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 id="rating-modal-title" className="font-semibold text-gray-900 text-base">
            Valorar transacción
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {alreadyRated ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-600 font-medium">Ya has valorado esta transacción.</p>
            <Button variant="outline" size="sm" onClick={onClose} className="mt-4">
              Cerrar
            </Button>
          </div>
        ) : success ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-green-600 font-medium">Valoracion enviada. Gracias.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="px-5 py-4 space-y-4">
              {ejes.map((eje) => (
                <StarPicker
                  key={eje.key}
                  label={eje.label}
                  value={ratings[eje.key] ?? 0}
                  onChange={(v) => setRating(eje.key, v)}
                />
              ))}

              <div className="pt-2">
                <label className="block text-sm text-gray-700 mb-1" htmlFor="rating-comentario">
                  Comentario (opcional)
                </label>
                <textarea
                  id="rating-comentario"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Comparte tu experiencia..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                <p className="text-[10px] text-gray-400 text-right mt-0.5">
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
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={loading}
                  disabled={!allFilled}
                >
                  Enviar valoracion
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
