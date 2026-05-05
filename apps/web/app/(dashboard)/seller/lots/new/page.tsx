'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Input, Select, FileDropzone, IncotermWizard } from '@/components/ui';

const OTHER_VALUE = '__other__';

const calibreSchema = z.object({
  calibre: z.string().min(1, 'Requerido'),
  cantidad_kg: z.coerce.number().positive('Debe ser positivo'),
  precio_min_kg: z.coerce.number().positive('Debe ser positivo'),
});

const schema = z.object({
  productoId: z.string().min(1, 'Selecciona un producto'),
  variedadId: z.string().optional(),
  calibres: z.array(calibreSchema).min(1),
  noCalibre: z.boolean().default(false),
  direccionRecogida: z.string().min(5, 'Introduce la dirección'),
  fechaDisponibilidad: z.string().min(1, 'Selecciona una fecha'),
  certificaciones: z.array(z.string()).default([]),
  fotosUrls: z.array(z.string()).default([]),
  comentariosAdicionales: z.string().max(1000).optional(),
  publicar: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;

type Product = { id: string; nombre: string };
type Variedad = { id: string; nombre: string };

const CERT_OPTIONS = ['Organic', 'GlobalG.A.P.', 'Fair Trade', 'BRC Certified'];

export default function PublishLotPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [varieties, setVarieties] = useState<Variedad[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [customVariety, setCustomVariety] = useState('');
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('primaria_incoterms');
    if (stored && JSON.parse(stored).done) return;
    // Only show wizard if the seller has never published a lot before
    api.get('/lots?tab=all')
      .then(({ data }) => {
        const lots = data.data ?? [];
        if (lots.length > 0) {
          // Seller already has lots — skip wizard, mark as done
          localStorage.setItem(
            'primaria_incoterms',
            JSON.stringify({ recommended: '', selected: [], done: true })
          );
        } else {
          setShowWizard(true);
        }
      })
      .catch(() => setShowWizard(true));
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      calibres: [{ calibre: '', cantidad_kg: 0, precio_min_kg: 0 }],
      certificaciones: [],
      fotosUrls: [],
      noCalibre: false,
      publicar: false,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'calibres' });

  const selectedProductId = watch('productoId');
  const selectedVariedadId = watch('variedadId');
  const selectedCerts = watch('certificaciones');

  useEffect(() => {
    api.get('/products').then(({ data }) => setProducts(data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedProductId) { setVarieties([]); return; }
    api.get(`/products/${selectedProductId}/varieties`)
      .then(({ data }) => setVarieties(data.data))
      .catch(() => setVarieties([]));
  }, [selectedProductId]);

  const toggleCert = (cert: string) => {
    const current = selectedCerts ?? [];
    if (current.includes(cert)) {
      setValue('certificaciones', current.filter((c) => c !== cert));
    } else {
      setValue('certificaciones', [...current, cert]);
    }
  };

  const onSubmit = async (values: FormValues, publish: boolean) => {
    setIsSubmitting(true);
    setError('');
    try {
      // If "other" was selected, send the custom text instead of an id
      const variedadId =
        values.variedadId && values.variedadId !== OTHER_VALUE
          ? values.variedadId
          : undefined;
      const variedadCustom =
        values.variedadId === OTHER_VALUE && customVariety.trim()
          ? customVariety.trim()
          : undefined;
      const payload = {
        ...values,
        variedadId,
        variedadCustom,
        publicar: publish,
        fechaDisponibilidad: new Date(values.fechaDisponibilidad).toISOString(),
      };
      await api.post('/lots', payload);
      router.push('/seller/lots');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al publicar el lote';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showWizard) return <IncotermWizard onComplete={() => setShowWizard(false)} />;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Publish a New Lot</h1>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        {/* Product Details */}
        <section className="bg-surface rounded-card border border-border p-5 space-y-4">
          <h2 className="font-semibold text-text-primary">Product Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Product"
              required
              {...register('productoId')}
              error={errors.productoId?.message}
            >
              <option value="">Select product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </Select>
            <div className="flex flex-col gap-1">
              <Select label="Variety" {...register('variedadId')}>
                <option value="">Select variety...</option>
                {varieties.map((v) => (
                  <option key={v.id} value={v.id}>{v.nombre}</option>
                ))}
                <option value={OTHER_VALUE}>Other (specify)...</option>
              </Select>
              {selectedVariedadId === OTHER_VALUE && (
                <Input
                  placeholder="Type variety name..."
                  value={customVariety}
                  onChange={(e) => setCustomVariety(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Calibres table */}
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-text-secondary px-1">
              <span>Caliber</span>
              <span>Quantity (kg)</span>
              <span>Min Price (€/kg)</span>
              <span />
            </div>
            {fields.map((field, idx) => (
              <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
                <Input
                  placeholder="e.g. 70/80 mm"
                  {...register(`calibres.${idx}.calibre`)}
                  error={errors.calibres?.[idx]?.calibre?.message}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="1000"
                  {...register(`calibres.${idx}.cantidad_kg`)}
                  error={errors.calibres?.[idx]?.cantidad_kg?.message}
                />
                <Input
                  type="number"
                  step="0.001"
                  placeholder="1.50"
                  {...register(`calibres.${idx}.precio_min_kg`)}
                  error={errors.calibres?.[idx]?.precio_min_kg?.message}
                />
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  disabled={fields.length === 1}
                  className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 mt-0.5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => append({ calibre: '', cantidad_kg: 0, precio_min_kg: 0 })}
              className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add another caliber
            </button>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" {...register('noCalibre')} className="rounded" />
              Non calibrated/weighted Lot
            </label>
          </div>
        </section>

        {/* Logistics */}
        <section className="bg-surface rounded-card border border-border p-5 space-y-4">
          <h2 className="font-semibold text-text-primary">Logistics &amp; Availability</h2>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Lot Location"
              {...register('direccionRecogida')}
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {errors.direccionRecogida && (
              <p className="mt-1 text-xs text-red-500">{errors.direccionRecogida.message}</p>
            )}
          </div>
          <Input
            type="date"
            label="Available for Pickup From"
            required
            {...register('fechaDisponibilidad')}
            error={errors.fechaDisponibilidad?.message}
          />
        </section>

        {/* Supporting Info */}
        <section className="bg-surface rounded-card border border-border p-5 space-y-4">
          <h2 className="font-semibold text-text-primary">Supporting Information</h2>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Associated Certificates</p>
            <div className="flex flex-wrap gap-2">
              {CERT_OPTIONS.map((cert) => {
                const active = selectedCerts?.includes(cert);
                return (
                  <button
                    key={cert}
                    type="button"
                    onClick={() => toggleCert(cert)}
                    className={[
                      'px-3 py-1 rounded-badge text-sm font-medium border transition-colors',
                      active
                        ? 'bg-primary/10 border-primary text-secondary'
                        : 'bg-white border-border text-text-secondary hover:border-primary',
                    ].join(' ')}
                  >
                    {active && '✓ '}{cert}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Upload Photos &amp; Videos</p>
            <FileDropzone
              accept=".png,.jpg,.jpeg,.gif"
              maxSizeMB={10}
              label="Upload lot photos"
              onFileSelect={(file) => {
                if (file) console.log('File selected:', file.name);
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Additional Comments
            </label>
            <textarea
              {...register('comentariosAdicionales')}
              rows={3}
              className="w-full border border-border rounded-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Any additional information about this lot..."
            />
          </div>
        </section>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-input px-4 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={handleSubmit((v) => onSubmit(v, false))}
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={isSubmitting}
            onClick={handleSubmit((v) => onSubmit(v, true))}
          >
            {isSubmitting ? 'Publishing...' : 'Publish Lot'}
          </Button>
        </div>
      </form>
    </div>
  );
}
