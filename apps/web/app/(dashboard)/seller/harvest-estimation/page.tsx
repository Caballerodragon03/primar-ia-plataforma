'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Sprout,
  Download,
  Upload,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  FileSpreadsheet,
  AlertTriangle,
  Info,
} from 'lucide-react';
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

interface HistorialRecord {
  id: string;
  producto: { id: string; nombre: string };
  variedad?: { id: string; nombre: string } | null;
  temporada: string;
  calibres: { calibre: string; cantidadKg: number }[];
}

interface PredictionCalibre {
  calibre: string;
  estimatedKg: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  confidence: number;
}

interface Prediction {
  productoId: string;
  productoNombre: string;
  variedadNombre?: string;
  calibres: PredictionCalibre[];
  basedOnSeasons: number;
  nextSeason: string;
}

interface UploadResult {
  seasonsSaved: number;
  totalRows: number;
  prediction: Prediction | null;
}

interface SubscriptionData {
  plan: string;
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

  /* Upload state ----------------------------------------------------- */
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const currentProduct = products.find((p) => p.id === selectedProduct);
  const varieties = currentProduct?.variedades ?? [];

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

  /* Download template ------------------------------------------------ */
  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/harvest-estimation/template', { responseType: 'blob' });
      const blob = new Blob([res.data as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_cosecha_primaria.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  };

  /* Upload Excel ----------------------------------------------------- */
  const handleFileUpload = async (file: File) => {
    if (!selectedProduct) {
      setUploadError('Selecciona un producto antes de subir el archivo.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('productoId', selectedProduct);
    if (selectedVariety) formData.append('variedadId', selectedVariety);

    try {
      const res = await api.post<{ success: boolean; data: UploadResult }>(
        '/harvest-estimation/upload-excel',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setUploadSuccess(res.data.data);
      await Promise.all([fetchHistorial(), fetchPredictions()]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Error al procesar el archivo';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
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
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const trendColor = (trend: string) => {
    switch (trend) {
      case 'UP':
        return 'text-green-600';
      case 'DOWN':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const confidenceColor = (c: number) => {
    if (c >= 85) return 'text-green-600 bg-green-50';
    if (c >= 70) return 'text-yellow-700 bg-yellow-50';
    return 'text-orange-600 bg-orange-50';
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
        <p className="text-sm text-muted-foreground">
          Descarga la plantilla Excel, rellénala con tu historial de cosechas por calibre y
          temporada, y súbela para obtener predicciones automáticas.
        </p>
      </div>

      {/* Step 1: Download Template */}
      <section className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#F5F4EE] rounded-lg">
            <FileSpreadsheet className="w-6 h-6 text-[#5F5C48]" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-[#5F5C48] mb-1">
              1. Descarga la plantilla
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              La plantilla incluye instrucciones y un ejemplo. Rellena la pestaña &quot;Datos&quot;
              con tus temporadas, calibres y cantidades en kg.
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#5F5C48] text-white text-sm font-medium rounded-lg hover:bg-[#4a473a] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Descargar plantilla Excel
            </button>
          </div>
        </div>
      </section>

      {/* Step 2: Select Product + Upload */}
      <section className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-base font-semibold text-[#5F5C48] mb-4">
          2. Selecciona producto y sube el archivo
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Producto</label>
            <select
              value={selectedProduct}
              onChange={(e) => {
                setSelectedProduct(e.target.value);
                setSelectedVariety('');
              }}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E1C44D] focus:border-transparent outline-none"
            >
              <option value="">Seleccionar producto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Variedad <span className="text-muted-foreground">(opcional)</span>
            </label>
            <select
              value={selectedVariety}
              onChange={(e) => setSelectedVariety(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E1C44D] focus:border-transparent outline-none"
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
        </div>

        {/* Drag & drop zone */}
        <div
          className={[
            'relative border-2 border-dashed rounded-xl p-8 text-center transition-colors',
            dragActive
              ? 'border-[#E1C44D] bg-[#E1C44D]/5'
              : 'border-border hover:border-gray-400',
            !selectedProduct ? 'opacity-50 pointer-events-none' : '',
          ].join(' ')}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#E1C44D]" />
              <p className="text-sm text-muted-foreground">Procesando archivo...</p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">
                Arrastra tu archivo Excel aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-muted-foreground">Formato: .xlsx (máx. 5 MB)</p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={onFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </>
          )}
        </div>

        {/* Upload feedback */}
        {uploadError && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            {uploadError}
          </div>
        )}

        {uploadSuccess && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            Se importaron <strong>{uploadSuccess.totalRows}</strong> registros de{' '}
            <strong>{uploadSuccess.seasonsSaved}</strong> temporada(s).
            {uploadSuccess.prediction
              ? ' La predicción se ha calculado automáticamente.'
              : ' Sube más temporadas para generar predicciones (mínimo 2).'}
          </div>
        )}
      </section>

      {/* Historial Table */}
      <section className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-base font-semibold text-[#5F5C48] mb-4">Historial importado</h2>
        {histLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : historial.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay registros todavía. Sube tu primer archivo Excel arriba.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-4 font-medium text-muted-foreground">Producto</th>
                  <th className="py-2 pr-4 font-medium text-muted-foreground">Variedad</th>
                  <th className="py-2 pr-4 font-medium text-muted-foreground">Temporada</th>
                  <th className="py-2 pr-4 font-medium text-muted-foreground">Calibres</th>
                  <th className="py-2 font-medium text-muted-foreground w-16" />
                </tr>
              </thead>
              <tbody>
                {historial.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2.5 pr-4 text-[#5F5C48]">{record.producto.nombre}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {record.variedad?.nombre ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{record.temporada}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {record.calibres
                        .map((c) => `${c.calibre}: ${c.cantidadKg.toLocaleString('es-ES')} kg`)
                        .join(', ')}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
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
      <section className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-base font-semibold text-[#5F5C48] mb-2">Predicciones</h2>

        <div className="flex items-start gap-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            Las predicciones se calculan mediante regresión lineal sobre tu historial.
            Son <strong>estimaciones orientativas</strong> y no garantizan resultados reales.
            El porcentaje de fiabilidad indica la consistencia de tus datos históricos
            (basado en el coeficiente de variación).
          </p>
        </div>

        {predLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : predictions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Sube al menos dos temporadas de datos para obtener predicciones.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {predictions.map((pred) => (
              <div
                key={`${pred.productoId}-${pred.variedadNombre ?? 'all'}`}
                className="border border-border rounded-lg p-4"
              >
                <h3 className="text-sm font-semibold text-[#5F5C48] mb-0.5">
                  {pred.productoNombre}
                </h3>
                {pred.variedadNombre && (
                  <p className="text-xs text-muted-foreground">{pred.variedadNombre}</p>
                )}
                {pred.nextSeason && (
                  <p className="text-xs text-[#E1C44D] font-medium mb-3">
                    Temporada {pred.nextSeason}
                  </p>
                )}
                <div className="space-y-2">
                  {pred.calibres.map((cal) => (
                    <div key={cal.calibre} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{cal.calibre}</span>
                        <span
                          className={`flex items-center gap-1 font-medium ${trendColor(cal.trend)}`}
                        >
                          {cal.estimatedKg.toLocaleString('es-ES')} kg
                          {trendIcon(cal.trend)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#E1C44D] rounded-full transition-all"
                            style={{ width: `${cal.confidence}%` }}
                          />
                        </div>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${confidenceColor(cal.confidence)}`}
                        >
                          {cal.confidence}%
                        </span>
                      </div>
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
