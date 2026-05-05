'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

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
  let bg = 'bg-gray-100';
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

export function SeasonalCalendar() {
  const [data, setData] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('Cítricos');
  const currentMonth = new Date().getMonth() + 1; // 1-12

  useEffect(() => {
    api
      .get('/products/calendar')
      .then(({ data: res }) => setData(res.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter(
    (e) => CATEGORY_MAP[e.producto] === activeCategory,
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-2 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-5 bg-gray-100 rounded w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={[
              'px-2 py-0.5 rounded-badge text-[10px] font-medium border transition-colors',
              activeCategory === cat
                ? 'bg-primary/10 border-primary text-secondary'
                : 'border-border text-text-secondary hover:border-primary bg-white',
            ].join(' ')}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-text-secondary">
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
      <div className="grid grid-cols-[120px_repeat(12,1fr)] gap-x-0.5 text-[9px] text-text-secondary font-medium">
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
          <p className="text-xs text-text-muted text-center py-4">No hay datos para esta categoría</p>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.producto}
              className="grid grid-cols-[120px_repeat(12,1fr)] gap-x-0.5 items-center"
              title={entry.notas}
            >
              <span className="text-[10px] text-text-primary truncate pr-1" title={entry.producto}>
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
          ))
        )}
      </div>
    </div>
  );
}
