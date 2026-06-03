/**
 * Phase 16 — Hook para gestionar productos favoritos en localStorage.
 *
 * Se usa en:
 *   - SeasonalCalendar (tab "Favoritos" como primera + estrella por fila)
 *   - MarketDashboard (ordena favoritos primero con ⭐, solo si hay datos)
 *
 * Decisión cliente-only (sin DB): el alcance es preferencias de vista
 * personales, no datos compartidos. Sin migration, cross-device no es
 * necesario hoy.
 */
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'primaria.fav_products';

function readStorage(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string' && x.length > 0);
  } catch {
    return [];
  }
}

function writeStorage(values: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    // Notifica a otras instancias del hook montadas en la misma página
    // que los favoritos han cambiado (sin esto, dos componentes que usan
    // el hook quedarían desincronizados hasta el siguiente render).
    window.dispatchEvent(new CustomEvent('primaria:favs-changed'));
  } catch {
    // localStorage no disponible — silenciosamente ignoramos.
  }
}

export function useFavoriteProducts() {
  const [favorites, setFavorites] = useState<string[]>(() => readStorage());

  // Resincroniza si otra instancia del hook (u otra tab) cambia el set.
  useEffect(() => {
    const handler = () => setFavorites(readStorage());
    window.addEventListener('primaria:favs-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('primaria:favs-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const isFavorite = useCallback(
    (id: string) => favorites.includes(id),
    [favorites],
  );

  const toggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      writeStorage(next);
      return next;
    });
  }, []);

  const add = useCallback((id: string) => {
    setFavorites((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      writeStorage(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setFavorites((prev) => {
      if (!prev.includes(id)) return prev;
      const next = prev.filter((x) => x !== id);
      writeStorage(next);
      return next;
    });
  }, []);

  return { favorites, isFavorite, toggle, add, remove };
}
