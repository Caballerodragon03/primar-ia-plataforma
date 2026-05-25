'use client';

/**
 * Phase 14M v3.37 — Toggle de idioma para la sección de perfil.
 *
 * Cambia la preferencia client-side al instante (re-renderiza todo lo
 * que usa useT() automáticamente). Persiste en localStorage via
 * LocaleProvider. Se monta en /seller/profile y /buyer/profile arriba
 * del todo para que sea fácil de encontrar.
 */
import { Globe } from 'lucide-react';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { useT } from '@/lib/i18n/LocaleProvider';
import { api } from '@/lib/api';
import type { Locale } from '@/lib/i18n/messages';

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const t = useT();

  // Cambio de idioma: actualiza inmediatamente la UI (localStorage) Y
  // dispara un PATCH /auth/profile en background con idiomaPreferido para
  // que persista entre dispositivos y se use en emails transaccionales.
  // El PATCH es fire-and-forget — si falla, el localStorage manda en UI
  // y el siguiente cambio reintenta.
  const change = (l: Locale) => {
    setLocale(l);
    const idiomaPreferido = l === 'es' ? 'ES' : 'EN';
    api.patch('/auth/profile', { idiomaPreferido }).catch((err) => {
      console.warn('[i18n] No se pudo persistir idiomaPreferido en backend:', err);
    });
  };

  return (
    <div className="bg-card border border-border rounded-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-secondary" />
        <h2 className="text-sm font-semibold text-foreground">{t('profile.language')}</h2>
      </div>
      <p className="text-xs text-text-secondary">{t('profile.language.help')}</p>
      <div className="inline-flex border border-border rounded-input overflow-hidden">
        <button
          type="button"
          onClick={() => change('es')}
          className={[
            'px-4 py-2 text-sm font-medium transition-colors',
            locale === 'es'
              ? 'bg-primary text-foreground'
              : 'bg-card text-text-secondary hover:bg-accent/50',
          ].join(' ')}
          aria-pressed={locale === 'es'}
        >
          {t('profile.language.es')}
        </button>
        <button
          type="button"
          onClick={() => change('en')}
          className={[
            'px-4 py-2 text-sm font-medium border-l border-border transition-colors',
            locale === 'en'
              ? 'bg-primary text-foreground'
              : 'bg-card text-text-secondary hover:bg-accent/50',
          ].join(' ')}
          aria-pressed={locale === 'en'}
        >
          {t('profile.language.en')}
        </button>
      </div>
    </div>
  );
}
