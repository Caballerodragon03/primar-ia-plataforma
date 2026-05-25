'use client';

/**
 * Phase 14M v3.37 — Provider de idioma client-side.
 *
 * Sin librería externa para evitar peso adicional. Lee/escribe localStorage
 * y expone:
 *   - `useLocale()` → { locale, setLocale }
 *   - `useT()`      → función de traducción t(key, fallback?)
 *
 * Inicialización:
 *   1. Si hay `primaria.locale` en localStorage → usar eso.
 *   2. Si no, detectar del navegador (es/en) y persistir.
 *
 * No hay SSR: la app es SPA tras login, y el hydration mismatch lo
 * evitamos renderizando children solo cuando ready=true.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type Locale,
  type MessageKey,
  messages,
  detectBrowserLocale,
  SUPPORTED_LOCALES,
} from './messages';

const STORAGE_KEY = 'primaria.locale';

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, fallback?: string) => string;
}

const LocaleContext = createContext<LocaleCtx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let initial: Locale;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
        initial = stored as Locale;
      } else {
        initial = detectBrowserLocale();
        window.localStorage.setItem(STORAGE_KEY, initial);
      }
    } catch {
      initial = 'es';
    }
    setLocaleState(initial);
    // Reflect on <html lang> for accessibility / SEO of the active page.
    try { document.documentElement.lang = initial; } catch { /* ignore */ }
    setReady(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    } catch { /* ignore */ }
  }, []);

  const t = useCallback((key: MessageKey, fallback?: string): string => {
    const dict = messages[locale];
    return dict[key] ?? fallback ?? key;
  }, [locale]);

  // Para evitar flash de idioma equivocado en la primera pintura, esperamos
  // a leer localStorage antes de renderizar. La ventana de "loading" es <16ms.
  if (!ready) return null;

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale debe usarse dentro de <LocaleProvider>');
  return { locale: ctx.locale, setLocale: ctx.setLocale };
}

export function useT() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Fallback defensivo: si por alguna razón el provider no envuelve este
    // árbol, devolvemos la clave para que sea evidente sin romper la app.
    return (key: MessageKey, fallback?: string) => fallback ?? key;
  }
  return ctx.t;
}
