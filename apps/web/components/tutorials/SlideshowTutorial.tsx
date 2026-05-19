'use client';

/**
 * Phase 14M v2 — Tutorial tipo presentación con diapositivas.
 *
 * Para flujos largos (crear lote, hacer pedido) donde lo importante es
 * explicar TODO el recorrido con datos de ejemplo, no apuntar a un
 * elemento concreto de la pantalla. Más cómodo que joyride para esto.
 *
 * Cada diapositiva tiene título, contenido (texto con bullets opcional)
 * y opcionalmente una "tarjeta de ejemplo" estructurada para mostrar el
 * dato simulado en cada paso (sin tocar la UI real).
 */
import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface SlideExample {
  // Pares clave/valor que se renderizan como filas en la tarjeta lateral
  // de ejemplo. Se muestran con monoespaciado para que parezcan "datos".
  rows: { label: string; value: string }[];
  caption?: string;
}

export interface Slide {
  title: string;
  // Cada bloque es un párrafo. Si empieza con "•" se renderiza como
  // bullet.
  body: string[];
  example?: SlideExample;
  // Si la diapositiva se refiere a una pantalla concreta, podemos
  // mostrar el path para que el usuario sepa dónde mirar.
  screen?: string;
}

interface SlideshowTutorialProps {
  title: string;
  subtitle?: string;
  slides: Slide[];
  onClose: () => void;
  onComplete: () => void;
}

export function SlideshowTutorial({ title, subtitle, slides, onClose, onComplete }: SlideshowTutorialProps) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  if (!slide) return null;

  function next() {
    if (isLast) {
      onComplete();
      return;
    }
    setIndex((i) => Math.min(i + 1, slides.length - 1));
  }

  function prev() {
    setIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-primary-dark font-semibold">{title}</p>
            {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
            aria-label="Cerrar tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 grid gap-6 md:grid-cols-[1fr_minmax(0,260px)]">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-foreground mb-1">{slide.title}</h2>
            {slide.screen && (
              <p className="text-[11px] text-muted-foreground mb-4">
                Pantalla: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{slide.screen}</code>
              </p>
            )}
            <div className="space-y-2 text-sm text-text-secondary leading-relaxed">
              {slide.body.map((p, i) => {
                if (p.startsWith('• ')) {
                  return (
                    <div key={i} className="flex gap-2">
                      <span className="text-primary-dark flex-shrink-0">•</span>
                      <span>{p.slice(2)}</span>
                    </div>
                  );
                }
                return <p key={i}>{p}</p>;
              })}
            </div>
          </div>
          {slide.example && (
            <aside className="bg-amber-50 border border-amber-200 rounded-card p-3 self-start">
              <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-2">
                Ejemplo simulado
              </p>
              <dl className="space-y-1.5">
                {slide.example.rows.map((row) => (
                  <div key={row.label} className="text-[11px]">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="font-mono text-foreground break-words">{row.value}</dd>
                  </div>
                ))}
              </dl>
              {slide.example.caption && (
                <p className="text-[10px] text-amber-800 italic mt-2">{slide.example.caption}</p>
              )}
            </aside>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-6 bg-primary' : i < index ? 'w-1.5 bg-emerald-500' : 'w-1.5 bg-muted'
                }`}
              />
            ))}
            <span className="ml-2 text-[11px] text-muted-foreground">
              {index + 1} / {slides.length}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={prev}
              disabled={index === 0}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Atrás
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={next}
              className="flex items-center gap-1"
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Marcar completado
                </>
              ) : (
                <>
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
