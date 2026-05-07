'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sprout, Plus, Trash2, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { UpgradePrompt } from '@/components/subscriptions/UpgradePrompt';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Product {
  id: string;
  nombre: string;
  variedades?: Variety[];
}

interface Variety {
  id: string;
  nombre: string;
}

interface CalibreRow {
  nombre: string;
  kg: number | '';
}

interface HistorialRecord {
  id: string;
  producto: { id: string; nombre: string };
  variedad?: { id: string; nombre: string } | null;
  temporada: string;
  calibres: { nombre: string; kg: number }[];
}

interface PredictionCalibre {
  nombre: string;
  estimatedKg: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

interface Prediction {
  productoId: string;
  productoNombre: string;
  variedadNombre?: string;
  calibres: PredictionCalibre[];
}

interface SubscriptionData {
  plan: string;
  features?: {
    estimacionCosecha?: boolean;
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function HarvestEstimationPage() {
  /* Plan gate -------------------------------------------------------- */
  const [subLoading, setSubLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ success: boolean; data: SubscriptionData }>(
          '/subscriptions/current',
        );
        setSubscription(res.data?.data ?? null);
      } catch {
        setSubscription(null);
      } finally {
        setSubLoading(false);
      }
    })();
  }, []);

  /* Products --------------------------------------------------------- */
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ success: boolean; data: Product[] }>('/products');
        setProducts(res.data?.data ?? []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  /* Upload form state ------------------------------------------------ */
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');
  const [temporada, setTemporada] = useState('');
  const [calibres, setCalibres] = useState<CalibreRow[]>([{ nombre: '', kg: '' }]);
  const [submitting, setSubmitting] = useState(false);

  const currentProduct = products.find((p) => p.id === selectedProduct);
  const varieties = currentProduct?.variedades ?? [];

  const addCalibreRow = () => setCalibres((prev) => [...prev, { nombre: '', kg: '' }]);

  const updateCalibre = (idx: number, field: keyof CalibreRow, value: string | number) => {
    setCalibres((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    );
  };

  const removeCalibreRow = (idx: number) => {
    setCalibres((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  /* Historial -------------------------------------------------------- */
  const [historial, setHistorial] = useState<HistorialRecord[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const fetchHistorial = useCallback(async () => {
    setHistLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: HistorialRecord[] }>(
        '/harvest-estimation',
      );
      setHistorial(res.data?.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setHistLoading(false);
    }
  }, []);

  /* Predictions ------------------------------------------------------ */
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [predLoading, setPredLoading] = useState(false);

  const fetchPredictions = useCallback(async () => {
    setPredLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: Prediction[] }>(
        '/harvest-estimation/predictions',
      );
      setPredictions(res.data?.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setPredLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subscription && subscription.plan.toUpperCase() !== 'COSECHA') {
      fetchHistorial();
      fetchPredictions();
    }
  }, [subscription, fetchHistorial, fetchPredictions]);

  /* Submit ----------------------------------------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !temporada || calibres.some((c) => !c.nombre || c.kg === '')) return;

    setSubmitting(true);
    try {
      await api.post('/harvest-estimation', {
        productoId: selectedProduct,
        variedadId: selectedVariety || undefined,
        temporada,
        calibres: calibres.map((c) => ({ nombre: c.nombre, kg: Number(c.kg) })),
      });
      // Reset form
      setSelectedProduct('');
      setSelectedVariety('');
      setTemporada('');
      setCalibres([{ nombre: '', kg: '' }]);
      // Refresh data
      await Promise.all([fetchHistorial(), fetchPredictions()]);
    } catch {
      /* TODO: toast error */
    } finally {
      setSubmitting(false);
    }
  };

  /* Delete ----------------------------------------------------------- */
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/harvest-estimation/${id}`);
      await Promise.all([fetchHistorial(), fetchPredictions()]);
    } catch {
      /* ignore */
    }
  };

  /* Trend helpers ---------------------------------------------------- */
  const trendIcon = (trend: string) => {
    switch (trend) {
      case 'UP':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'DOWN':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const trendColor = (trend: string) => {
    switch (trend) {
      case 'UP':
        return 'text-green-600';
      case 'DOWN':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  if (subLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#5F5C48]" />
      </div>
    );
  }

  // Plan gate: COSECHA cannot access
  if (!subscription || subscription.plan.toUpperCase() === 'COSECHA') {
    return (
      <UpgradePrompt
        feature="Estimación de Cosecha"
        requiredPlan="Campo"
        currentPlan={subscription?.plan ?? 'Cosecha'}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sprout className="w-6 h-6 text-[#5F5C48]" />
          <h1 className="text-xl font-bold text-[#5F5C48]">Estimación de Cosecha</h1>
        </div>
        <p className="text-sm text-gray-500">
          Sube tu historial de cosechas por calibre y obtén predicciones para la próxima temporada.
        </p>
      </div>

      {/* Upload Form */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-[#5F5C48] mb-4">Nuevo registro</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Product */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Producto</label>
              <select
                value={selectedProduct}
                onChange={(e) => {
                  setSelectedProduct(e.target.value);
                  setSelectedVariety('');
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E1C44D] focus:border-transparent outline-none"
                required
              >
                <option value="">Seleccionar...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Variety */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Variedad</label>
              <select
                value={selectedVariety}
                onChange={(e) => setSelectedVariety(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E1C44D] focus:border-transparent outline-none"
                disabled={varieties.length === 0}
              >
                <option value="">Todas</option>
                {varieties.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Temporada */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Temporada <span className="text-gray-400">(ej. 2024-2025)</span>
              </label>
              <input
                type="text"
                value={temporada}
                onChange={(e) => setTemporada(e.target.value)}
                placeholder="2024-2025"
                pattern="\d{4}-\d{4}"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E1C44D] focus:border-transparent outline-none"
                required
              />
            </div>
          </div>

          {/* Calibres */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Calibres</label>
            <div className="space-y-2">
              {calibres.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.nombre}
                    onChange={(e) => updateCalibre(idx, 'nombre', e.target.value)}
                    placeholder="Nombre del calibre"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E1C44D] focus:border-transparent outline-none"
                    required
                  />
                  <input
                    type="number"
                    value={row.kg}
                    onChange={(e) =>
                      updateCalibre(idx, 'kg', e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="Kg"
                    min={0}
                    className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E1C44D] focus:border-transparent outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeCalibreRow(idx)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30"
                    disabled={calibres.length <= 1}
                    aria-label="Eliminar calibre"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addCalibreRow}
              className="mt-2 inline-flex items-center gap-1 text-xs text-[#5F5C48] hover:text-[#E1C44D] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir calibre
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E1C44D] text-white text-sm font-semibold rounded-lg hover:bg-[#c9ad3e] transition-colors disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar registro
          </button>
        </form>
      </section>

      {/* Historial Table */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-[#5F5C48] mb-4">Historial</h2>
        {histLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : historial.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No hay registros todavía. Sube tu primera cosecha arriba.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 pr-4 font-medium text-gray-600">Producto</th>
                  <th className="py-2 pr-4 font-medium text-gray-600">Variedad</th>
                  <th className="py-2 pr-4 font-medium text-gray-600">Temporada</th>
                  <th className="py-2 pr-4 font-medium text-gray-600">Calibres</th>
                  <th className="py-2 font-medium text-gray-600 w-16" />
                </tr>
              </thead>
              <tbody>
                {historial.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2.5 pr-4 text-[#5F5C48]">{record.producto.nombre}</td>
                    <td className="py-2.5 pr-4 text-gray-500">
                      {record.variedad?.nombre ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500">{record.temporada}</td>
                    <td className="py-2.5 pr-4 text-gray-500">
                      {record.calibres
                        .map((c) => `${c.nombre}: ${c.kg} kg`)
                        .join(', ')}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Eliminar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Predictions Panel */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-[#5F5C48] mb-4">Predicciones</h2>
        {predLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : predictions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Sube al menos dos temporadas de datos para obtener predicciones.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {predictions.map((pred) => (
              <div
                key={`${pred.productoId}-${pred.variedadNombre ?? 'all'}`}
                className="border border-gray-200 rounded-lg p-4"
              >
                <h3 className="text-sm font-semibold text-[#5F5C48] mb-1">
                  {pred.productoNombre}
                </h3>
                {pred.variedadNombre && (
                  <p className="text-xs text-gray-400 mb-3">{pred.variedadNombre}</p>
                )}
                <div className="space-y-2">
                  {pred.calibres.map((cal) => (
                    <div
                      key={cal.nombre}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-600">{cal.nombre}</span>
                      <span className={`flex items-center gap-1 font-medium ${trendColor(cal.trend)}`}>
                        {cal.estimatedKg.toLocaleString('es-ES')} kg
                        {trendIcon(cal.trend)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
