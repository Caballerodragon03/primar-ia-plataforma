'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Input, Select } from '@/components/ui';
import { FreeTierMatchingNotice } from '@/components/subscriptions/FreeTierMatchingNotice';

const OTHER_VALUE = '__other__';

const INCOTERM_DESCRIPTIONS: Record<string, string> = {
  EXW: 'El comprador recoge en tu explotación y gestiona todo el transporte. Mínima responsabilidad para ti.',
  FCA: 'Entregas al transportista del comprador en un punto acordado (lonja, cooperativa). Muy habitual en Primar-IA.',
  CPT: 'Tú contratas el transporte hasta destino. El riesgo pasa al comprador con el primer transportista.',
  CIP: 'Como CPT pero también debes contratar el seguro (mínimo 110% del valor). Ideal para perecederos.',
  DAP: 'Entregas en el destino del comprador. Él solo descarga. Muy habitual en exportación.',
  DPU: 'Como DAP pero también te encargas de la descarga en destino.',
  DDP: 'Máxima responsabilidad: pagas todo incluido aduanas de importación. Solo con experiencia exportadora.',
  FOB: 'Solo marítimo. Entregas a bordo del buque en el puerto de origen.',
  CIF: 'Solo marítimo. Pagas flete y seguro hasta destino; el riesgo pasa al embarcar.',
  CFR: 'Solo marítimo. Pagas el flete pero el riesgo pasa al embarcar. Sin seguro obligatorio.',
  FAS: 'Solo marítimo. Entregas al costado del buque en el puerto de origen.',
  DAT: 'Entregado en terminal de transporte. Eres responsable hasta la descarga en terminal.',
};

const calibreSchema = z.object({
  calibre: z.string().min(1, 'Requerido'),
  cantidad_kg: z.coerce.number().positive('Debe ser positivo'),
  precio_max_kg: z.coerce.number().positive('Debe ser positivo'),
});

const INCOTERMS = ['EXW','FCA','FOB','CIF','DAP','DDP','FAS','CFR','CPT','CIP','DAT','DPU'] as const;
const FREQUENCIES = ['Weekly', 'Bi-weekly', 'Monthly', 'One-time'];

const schema = z.object({
  productoId: z.string().min(1, 'Selecciona un producto'),
  variedadId: z.string().optional(),
  calibresSolicitados: z.array(calibreSchema).min(1),
  noCalibre: z.boolean().default(false),
  incoterm: z.enum(INCOTERMS),
  destinoFinal: z.string().min(2, 'Introduce el destino').optional(),
  frecuencia: z.string().optional(),
  transporte: z.enum(['own', 'external']).default('own'),
  costoLogisticaEstimado: z.coerce.number().nonnegative().optional(),
  fechaEntregaDeseada: z.string().min(1, 'Selecciona una fecha'),
  notasAdicionales: z.string().max(1000).optional(),
  publicar: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;
type Product = { id: string; nombre: string; variedades: { id: string; nombre: string }[]; calibresDisponibles: string[] };

export default function CreateOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [customVariety, setCustomVariety] = useState('');

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      calibresSolicitados: [{ calibre: '', cantidad_kg: 0, precio_max_kg: 0 }],
      incoterm: 'FOB',
      frecuencia: 'One-time',
      transporte: 'own',
      noCalibre: false,
      publicar: false,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'calibresSolicitados' });
  const selectedProductId = watch('productoId');
  const selectedVariedadId = watch('variedadId');
  const watchedIncoterm = watch('incoterm');

  useEffect(() => {
    api.get('/products').then(({ data }) => setProducts(data.data)).catch(() => {});
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const varieties = selectedProduct?.variedades ?? [];
  const calibreOptions = selectedProduct?.calibresDisponibles ?? [];

  const onSubmit = async (values: FormValues, publish: boolean) => {
    setIsSubmitting(true);
    setError('');
    try {
      const variedadId =
        values.variedadId === OTHER_VALUE ? undefined : values.variedadId;
      const variedadCustom =
        values.variedadId === OTHER_VALUE && customVariety.trim()
          ? customVariety.trim()
          : undefined;
      const payload = {
        ...values,
        variedadId,
        variedadCustom,
        publicar: publish,
        fechaEntregaDeseada: new Date(values.fechaEntregaDeseada).toISOString(),
      };
      await api.post('/orders', payload);
      router.push('/buyer/orders');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al crear el pedido';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-text-primary"> Crear Pedido</h1>

      <FreeTierMatchingNotice itemKind="pedido" subscriptionHref="/buyer/subscription" />

      <form className="grid grid-cols-1 lg:grid-cols-2 gap-6" onSubmit={(e) => e.preventDefault()}>
        {/* Left: Commercial Details */}
        <section className="space-y-5">
          <div className="bg-card rounded-card border border-border p-5 space-y-4">
            <h2 className="font-semibold text-text-primary">Detalles comerciales</h2>

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

            <div className="grid grid-cols-2 gap-4">
              <Select label="Frequency" {...register('frecuencia')}>
                <option value="">Select...</option>
                {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </Select>
              <Input
                label="Final Destination"
                placeholder="e.g. Port of Rotterdam"
                {...register('destinoFinal')}
                error={errors.destinoFinal?.message}
              />
            </div>

            <Input
              type="date"
              label="Desired Delivery Date"
              required
              {...register('fechaEntregaDeseada')}
              error={errors.fechaEntregaDeseada?.message}
            />

            {/* Calibres */}
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-text-secondary px-1">
                <span>Caliber</span>
                <span>Qty (kg)</span>
                <span>Selling Price (€/kg)</span>
                <span />
              </div>
              {fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
                  {calibreOptions.length > 1 ? (
                    <Select
                      label=""
                      {...register(`calibresSolicitados.${idx}.calibre`)}
                      error={errors.calibresSolicitados?.[idx]?.calibre?.message}
                    >
                      <option value="">Select caliber...</option>
                      {calibreOptions.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      placeholder="Caliber"
                      {...register(`calibresSolicitados.${idx}.calibre`)}
                      error={errors.calibresSolicitados?.[idx]?.calibre?.message}
                    />
                  )}
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="30000"
                    {...register(`calibresSolicitados.${idx}.cantidad_kg`)}
                    error={errors.calibresSolicitados?.[idx]?.cantidad_kg?.message}
                  />
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.70"
                    {...register(`calibresSolicitados.${idx}.precio_max_kg`)}
                    error={errors.calibresSolicitados?.[idx]?.precio_max_kg?.message}
                  />
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    disabled={fields.length === 1}
                    className="p-2 text-muted-foreground hover:text-red-500 disabled:opacity-30 mt-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => append({ calibre: '', cantidad_kg: 0, precio_max_kg: 0 })}
                className="text-sm text-primary-dark font-medium hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add another caliber
              </button>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" {...register('noCalibre')} className="rounded" />
                Non calibrated/weighted Lots
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Comments
              </label>
              <textarea
                {...register('notasAdicionales')}
                rows={3}
                className="w-full border border-border rounded-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Additional notes for sellers..."
              />
            </div>
          </div>
        </section>

        {/* Right: Logistics & Terms */}
        <section className="space-y-5">
          <div className="bg-card rounded-card border border-border p-5 space-y-4">
            <h2 className="font-semibold text-text-primary">Logística y condiciones</h2>

            <div>
              <Select
                label="Incoterm"
                required
                {...register('incoterm')}
                error={errors.incoterm?.message}
              >
                {INCOTERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
              {watchedIncoterm && INCOTERM_DESCRIPTIONS[watchedIncoterm] && (
                <p className="text-xs text-muted-foreground mt-1 px-1">
                  💡 {INCOTERM_DESCRIPTIONS[watchedIncoterm]}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Transportation</p>
              <div className="space-y-2">
                {['own', 'external'].map((val) => (
                  <label key={val} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                    <input
                      type="radio"
                      value={val}
                      {...register('transporte')}
                      className="accent-primary"
                    />
                    {val === 'own' ? 'Use own operator' : 'Quote with external operator'}
                  </label>
                ))}
              </div>
            </div>

            <Input
              type="number"
              step="0.01"
              label="Estimated Logistics Cost (€)"
              placeholder="1200.00"
              {...register('costoLogisticaEstimado')}
            />

            {/* Cost Summary */}
            <div className="bg-muted/50 rounded-input p-4 space-y-1 text-sm">
              <p className="font-medium text-text-primary">Logistics Cost Estimation</p>
              <p className="text-text-muted text-xs">Fill in the calibers and quantities to see the estimated total.</p>
            </div>
          </div>
        </section>

        {/* Submit row — full width */}
        <div className="lg:col-span-2 space-y-3">
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
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isSubmitting}
              onClick={handleSubmit((v) => onSubmit(v, true))}
            >
              {isSubmitting ? 'Publicando...' : 'Publish Order'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
