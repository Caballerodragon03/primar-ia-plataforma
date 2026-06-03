'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { api } from '@/lib/api';
import { useFavoriteProducts } from '@/lib/hooks/useFavoriteProducts';
import { useT } from '@/lib/i18n/LocaleProvider';

type CalendarEntry = {
  producto: string;
  produccion: number[];
  comercializacion: number[];
  notas?: string;
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const CATEGORIES = [
  'Verduras',
  'Cítricos',
  'Frutas de hueso',
  'Frutas de pepita',
  'Melón y sandía',
  'Berries',
  'Uva',
  'Frutas tropicales',
  'Otras frutas',
];

// Map product names to categories (matches seed data)
const CATEGORY_MAP: Record<string, string> = {
  'Tomate redondo': 'Verduras',
  'Tomate cherry': 'Verduras',
  'Pepino': 'Verduras',
  'Pimiento verde': 'Verduras',
  'Lechuga': 'Verduras',
  'Escarola': 'Verduras',
  'Acelga': 'Verduras',
  'Espinaca': 'Verduras',
  'Zanahoria': 'Verduras',
  'Berenjena': 'Verduras',
  'Calabacín': 'Verduras',
  'Calabaza': 'Verduras',
  'Cebolla': 'Verduras',
  'Ajo': 'Verduras',
  'Puerro': 'Verduras',
  'Brócoli': 'Verduras',
  'Coliflor': 'Verduras',
  'Repollo / Col': 'Verduras',
  'Judía verde': 'Verduras',
  'Espárrago verde': 'Verduras',
  'Alcachofa': 'Verduras',
  'Patata': 'Verduras',
  'Boniato': 'Verduras',
  'Setas / Champiñón': 'Verduras',
  'Naranja': 'Cítricos',
  'Mandarina': 'Cítricos',
  'Limón': 'Cítricos',
  'Pomelo': 'Cítricos',
  'Lima': 'Cítricos',
  'Albaricoque': 'Frutas de hueso',
  'Melocotón': 'Frutas de hueso',
  'Nectarina': 'Frutas de hueso',
  'Paraguayo / Platerina': 'Frutas de hueso',
  'Ciruela': 'Frutas de hueso',
  'Cereza': 'Frutas de hueso',
  'Manzana': 'Frutas de pepita',
  'Pera': 'Frutas de pepita',
  'Uva de mesa': 'Uva',
  'Melón Piel de Sapo': 'Melón y sandía',
  'Sandía': 'Melón y sandía',
  'Fresa': 'Berries',
  'Frambuesa': 'Berries',
  'Arándano': 'Berries',
  'Mora': 'Berries',
  'Aguacate': 'Frutas tropicales',
  'Mango': 'Frutas tropicales',
  'Papaya': 'Frutas tropicales',
  'Chirimoya': 'Frutas tropicales',
  'Pitaya (fruta del dragón)': 'Frutas tropicales',
  'Plátano': 'Frutas tropicales',
  'Kiwi': 'Otras frutas',
  'Granada': 'Otras frutas',
  'Caqui (Persimón)': 'Otras frutas',
  'Níspero': 'Otras frutas',
  'Higo / Breva': 'Otras frutas',
  'Castaña': 'Otras frutas',
};

function MonthCell({
  inProduccion,
  inComercializacion,
  isCurrentMonth,
}: {
  inProduccion: boolean;
  inComercializacion: boolean;
  isCurrentMonth: boolean;
}) {
  let bg = 'bg-muted';
  if (inProduccion && inComercializacion) bg = 'bg-green-500';
  else if (inProduccion) bg = 'bg-green-300';
  else if (inComercializacion) bg = 'bg-yellow-300';

  return (
    <div
      className={[
        'h-5 w-full rounded-sm',
        bg,
        isCurrentMonth ? 'ring-1 ring-offset-0 ring-primary' : '',
      ].join(' ')}
      title={
        inProduccion && inComercializacion
          ? 'Producción + Comercialización'
          : inProduccion
          ? 'Solo Producción'
          : inComercializacion
          ? 'Solo Comercialización'
          : 'No disponible'
      }
    />
  );
}

// Phase 16 — pseudo-category "Favoritos" appears first if user has any
// favorites set. Otherwise the default tab is "Cítricos" (legacy).
const FAVORITES_TAB = '__favorites__';

export function SeasonalCalendar() {
  const t = useT();
  const { favorites, isFavorite, toggle } = useFavoriteProducts();
  const [data, setData] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>(
    favorites.length > 0 ? FAVORITES_TAB : 'Cítricos',
  );
  const currentMonth = new Date().getMonth() + 1; // 1-12

  useEffect(() => {
    api
      .get('/products/calendar')
      .then(({ data: res }) => setData(res.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    activeCategory === FAVORITES_TAB
      ? data.filter((e) => isFavorite(e.producto))
      : data.filter((e) => CATEGORY_MAP[e.producto] === activeCategory);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-5 bg-muted rounded w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Category tabs — "Favoritos" se muestra primera si hay alguno. */}
      <div className="flex flex-wrap gap-1">
        {favorites.length > 0 && (
          <button
            onClick={() => setActiveCategory(FAVORITES_TAB)}
            className={[
              'px-2 py-0.5 rounded-badge text-[11px] font-medium border transition-colors flex items-center gap-1',
              activeCategory === FAVORITES_TAB
                ? 'bg-primary/10 border-primary text-secondary'
                : 'border-border text-text-secondary hover:border-primary bg-card',
            ].join(' ')}
          >
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            {t('seasonalCalendar.favTab')}
            <span className="text-[10px] text-text-muted">({favorites.length})</span>
          </button>
        )}
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={[
              'px-2 py-0.5 rounded-badge text-[11px] font-medium border transition-colors',
              activeCategory === cat
                ? 'bg-primary/10 border-primary text-secondary'
                : 'border-border text-text-secondary hover:border-primary bg-card',
            ].join(' ')}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[11px] text-text-secondary">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-500" /> Prod + Comerc
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-300" /> Solo prod
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-yellow-300" /> Solo comerc
        </span>
      </div>

      {/* Month header */}
      <div className="grid grid-cols-[20px_120px_repeat(12,1fr)] gap-x-0.5 text-[9px] text-text-secondary font-medium">
        <div />
        <div />
        {MONTHS.map((m, i) => (
          <div
            key={m}
            className={[
              'text-center',
              i + 1 === currentMonth ? 'text-primary font-bold' : '',
            ].join(' ')}
          >
            {m}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-4">
            {activeCategory === FAVORITES_TAB
              ? t('seasonalCalendar.emptyFavorites')
              : t('seasonalCalendar.emptyCategory')}
          </p>
        ) : (
          filtered.map((entry) => {
            const fav = isFavorite(entry.producto);
            return (
              <div
                key={entry.producto}
                className="grid grid-cols-[20px_120px_repeat(12,1fr)] gap-x-0.5 items-center"
                title={entry.notas}
              >
                <button
                  type="button"
                  onClick={() => toggle(entry.producto)}
                  className="flex items-center justify-center hover:scale-110 transition-transform"
                  aria-label={fav ? t('seasonalCalendar.removeFav') : t('seasonalCalendar.addFav')}
                  title={fav ? t('seasonalCalendar.removeFav') : t('seasonalCalendar.addFav')}
                >
                  <Star
                    className={[
                      'w-3.5 h-3.5 transition-colors',
                      fav ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-400',
                    ].join(' ')}
                  />
                </button>
                <span className="text-[11px] text-text-primary truncate pr-1" title={entry.producto}>
                  {entry.producto}
                </span>
                {MONTHS.map((_, i) => {
                  const month = i + 1;
                  return (
                    <MonthCell
                      key={month}
                      inProduccion={entry.produccion.includes(month)}
                      inComercializacion={entry.comercializacion.includes(month)}
                      isCurrentMonth={month === currentMonth}
                    />
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
