'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Truck, Wallet, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Input, Select } from '@/components/ui';
import { FreeTierMatchingNotice } from '@/components/subscriptions/FreeTierMatchingNotice';
import {
  ALL_INCOTERMS,
  ALL_TERMINOS_PAGO,
  LOGISTICA_LABELS,
  TERMINO_PAGO_LABELS,
  incotermsForLogistica,
  logisticaFromIncoterm,
  INCOTERM_INFO,
  INCOTERM_DESCRIPTIONS,
  type Incoterm as IncotermType,
  type LogisticaPreferencia,
  type TerminoPago as TerminoPagoType,
} from '@primaria/shared';

const OTHER_VALUE = '__other__';

const calibreSchema = z.object({
  calibre: z.string().min(1, 'Requerido'),
  cantidad_kg: z.coerce.number().positive('Debe ser positivo'),
  precio_max_kg: z.coerce.number().positive('Debe ser positivo'),
});

// Reuse shared incoterm list — single source of truth in @primaria/shared.
const FREQUENCIES = ['Weekly', 'Bi-weekly', 'Monthly', 'One-time'];

const schema = z.object({
  productoId: z.string().min(1, 'Selecciona un producto'),
  variedadId: z.string().optional(),
  calibresSolicitados: z.array(calibreSchema).min(1),
  noCalibre: z.boolean().default(false),
  incoterm: z.enum(ALL_INCOTERMS as unknown as [string, ...string[]]),
  destinoFinal: z.string().min(2, 'Introduce el destino').optional(),
  frecuencia: z.string().optional(),
  transporte: z.enum(['own', 'external']).default('own'),
  costoLogisticaEstimado: z.coerce.number().nonnegative().optional(),
  fechaEntregaDeseada: z.string().min(1, 'Selecciona una fecha'),
  notasAdicionales: z.string().max(1000).optional(),
  publicar: z.boolean().default(false),
  logistica: z.enum(['YO_ENVIO', 'OTRO_RECOGE', 'INDIFERENTE']).default('INDIFERENTE'),
  incotermsAceptados: z.array(z.string()).min(1, 'Selecciona al menos un incoterm'),
  terminosPagoAceptados: z.array(z.enum(ALL_TERMINOS_PAGO as unknown as [string, ...string[]])).min(1, 'Selecciona al menos un término de pago'),
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
    setValue,
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
      logistica: 'INDIFERENTE',
      incotermsAceptados: [...ALL_INCOTERMS],
      terminosPagoAceptados: ['INMEDIATO'],
    },
  });

  const { fields, append, remove, replace: replaceCalibres } = useFieldArray({ control, name: 'calibresSolicitados' });
  const selectedProductId = watch('productoId');
  const selectedVariedadId = watch('variedadId');
  const watchedIncoterm = watch('incoterm');
  const logistica = watch('logistica');
  const incotermsAceptados = watch('incotermsAceptados') ?? [];
  const terminosPagoAceptados = watch('terminosPagoAceptados') ?? [];

  const availableIncoterms = useMemo(
    () => incotermsForLogistica(logistica as LogisticaPreferencia),
    [logistica],
  );

  // Trim incoterms al cambiar logística.
  useEffect(() => {
    const valid = incotermsAceptados.filter((it) =>
      (availableIncoterms as readonly string[]).includes(it),
    );
    if (valid.length !== incotermsAceptados.length) {
      setValue('incotermsAceptados', valid.length > 0 ? valid : [...availableIncoterms]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logistica]);

  // Si el comprador elige un incoterm principal que no es compatible con la
  // logística actual, ajustamos automáticamente la logística para que coincida.
  useEffect(() => {
    if (!watchedIncoterm) return;
    if (logistica !== 'INDIFERENTE') {
      const allowed = incotermsForLogistica(logistica as LogisticaPreferencia) as readonly string[];
      if (!allowed.includes(watchedIncoterm)) {
        setValue('logistica', logisticaFromIncoterm(watchedIncoterm as IncotermType));
      }
    }
  }, [watchedIncoterm, logistica, setValue]);

  const toggleIncoterm = (it: IncotermType) => {
    const cur = incotermsAceptados;
    if (cur.includes(it)) {
      setValue('incotermsAceptados', cur.filter((x) => x !== it));
    } else {
      setValue('incotermsAceptados', [...cur, it]);
    }
  };

  const toggleTerminoPago = (tp: TerminoPagoType) => {
    const cur = terminosPagoAceptados;
    if (cur.includes(tp)) {
      if (cur.length === 1) return;
      setValue('terminosPagoAceptados', cur.filter((x) => x !== tp));
    } else {
      setValue('terminosPagoAceptados', [...cur, tp]);
    }
  };

  useEffect(() => {
    api.get('/products').then(({ data }) => setProducts(data.data)).catch(() => {});
  }, []);

  // Phase 14M v3 — autofill desde el TutorialRunner. Igual patrón que en
  // /seller/lots/new: si el evento llega antes de que carguen los
  // productos, encola la data y aplica cuando estén disponibles.
  const pendingAutofill = useRef<Record<string, unknown> | null>(null);

  function applyAutofill(data: Record<string, unknown>) {
    if (typeof data['producto'] === 'string') {
      if (products.length === 0) {
        pendingAutofill.current = { ...(pendingAutofill.current ?? {}), ...data };
        return;
      }
      const prod = products.find((p) => p.nombre.toLowerCase() === (data['producto'] as string).toLowerCase());
      if (prod) setValue('productoId', prod.id, { shouldValidate: true });
    }
    if (typeof data['variedad'] === 'string') {
      if (products.length === 0) {
        pendingAutofill.current = { ...(pendingAutofill.current ?? {}), ...data };
        return;
      }
      const allVarieties = products.flatMap((p) => p.variedades);
      const v = allVarieties.find((x) => x.nombre.toLowerCase() === (data['variedad'] as string).toLowerCase());
      if (v) setValue('variedadId', v.id, { shouldValidate: true });
      else {
        setValue('variedadId', OTHER_VALUE, { shouldValidate: true });
        setCustomVariety(data['variedad'] as string);
      }
    }
    if (Array.isArray(data['calibres'])) {
      // useFieldArray necesita replace() para refrescar la lista visible.
      replaceCalibres(data['calibres'] as { calibre: string; cantidad_kg: number; precio_max_kg: number }[]);
    }
    if (typeof data['logistica'] === 'string') {
      setValue('logistica', data['logistica'] as 'YO_ENVIO' | 'OTRO_RECOGE' | 'INDIFERENTE', { shouldValidate: true });
    }
    if (typeof data['incoterm'] === 'string') {
      setValue('incotermsAceptados', [data['incoterm'] as string], { shouldValidate: true });
    }
    if (typeof data['destinoFinal'] === 'string') {
      setValue('destinoFinal', data['destinoFinal'] as string, { shouldValidate: true });
    }
    if (typeof data['fechaEntregaDeseada'] === 'string') {
      setValue('fechaEntregaDeseada', data['fechaEntregaDeseada'] as string, { shouldValidate: true });
    }
    if (Array.isArray(data['terminosPagoAceptados'])) {
      setValue('terminosPagoAceptados', data['terminosPagoAceptados'] as string[], { shouldValidate: true });
    }
  }

  useEffect(() => {
    function onAutofill(ev: Event) {
      const e = ev as CustomEvent<{ stepKey: string; data: Record<string, unknown> }>;
      applyAutofill(e.detail?.data ?? {});
    }
    window.addEventListener('tutorial:autofill', onAutofill);
    return () => window.removeEventListener('tutorial:autofill', onAutofill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  useEffect(() => {
    if (products.length > 0 && pendingAutofill.current) {
      const data = pendingAutofill.current;
      pendingAutofill.current = null;
      applyAutofill(data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

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
      // Phase 14B — si noCalibre está marcado, colapsar el array de calibres
      // a un único item placeholder UNCALIBRATED con la suma del peso/precio
      // declarado. Antes el payload enviaba calibres vacíos → backend
      // rechazaba con `calibre: ''` o lo persistía como string vacío.
      let calibresSolicitados = values.calibresSolicitados;
      if (values.noCalibre) {
        const totalKg = values.calibresSolicitados.reduce((s, c) => s + Number(c.cantidad_kg || 0), 0);
        const totalPrecio = values.calibresSolicitados.reduce((s, c) => s + Number(c.precio_max_kg || 0), 0);
        const avgPrecio = values.calibresSolicitados.length > 0
          ? totalPrecio / values.calibresSolicitados.length
          : 0;
        calibresSolicitados = [{
          calibre: 'UNCALIBRATED',
          cantidad_kg: totalKg,
          precio_max_kg: avgPrecio,
        }];
      }
      const payload = {
        ...values,
        calibresSolicitados,
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
          <div data-tutorial="form-producto" className="bg-card rounded-card border border-border p-5 space-y-4">
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
            <div data-tutorial="form-calibres" className="space-y-2">
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
          <div data-tutorial="form-logistica" className="bg-card rounded-card border border-border p-5 space-y-4">
            <h2 className="font-semibold text-text-primary">Logística y condiciones</h2>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-text-secondary" />
                <h3 className="text-sm font-semibold text-text-primary">¿Quién hace el envío?</h3>
              </div>
              <Select label="" {...register('logistica')}>
                <option value="INDIFERENTE">{LOGISTICA_LABELS.INDIFERENTE} (más matches)</option>
                <option value="YO_ENVIO">{LOGISTICA_LABELS.YO_ENVIO}</option>
                <option value="OTRO_RECOGE">{LOGISTICA_LABELS.OTRO_RECOGE}</option>
              </Select>
            </div>

            <div>
              <Select
                label="Incoterm principal"
                required
                {...register('incoterm')}
                error={errors.incoterm?.message}
              >
                {availableIncoterms.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
              {watchedIncoterm && INCOTERM_DESCRIPTIONS[watchedIncoterm as IncotermType] && (
                <p className="text-xs text-muted-foreground mt-1 px-1">
                  💡 {INCOTERM_DESCRIPTIONS[watchedIncoterm as IncotermType]}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-text-secondary mb-2">
                Otros incoterms aceptados <span className="text-text-muted">(opcional, más matches)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {availableIncoterms.map((it) => {
                  const active = incotermsAceptados.includes(it);
                  const info = INCOTERM_INFO[it as IncotermType];
                  const tooltip = info ? `${info.name} — ${info.desc} (${info.responsable})` : it;
                  return (
                    <button
                      type="button"
                      key={it}
                      onClick={() => toggleIncoterm(it)}
                      title={tooltip}
                      className={[
                        'px-3 py-1 rounded-badge text-xs font-medium border transition-colors',
                        active
                          ? 'bg-primary/10 border-primary text-secondary'
                          : 'bg-card border-border text-text-secondary hover:border-primary',
                      ].join(' ')}
                    >
                      {active && '✓ '}{it}
                    </button>
                  );
                })}
              </div>
              {/* Description list — shown below chips for every accepted
                  incoterm so the buyer sees responsibility split for all of
                  them, not only the principal one. */}
              {incotermsAceptados.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {incotermsAceptados
                    .filter((it) => INCOTERM_INFO[it as IncotermType])
                    .map((it) => {
                      const info = INCOTERM_INFO[it as IncotermType];
                      return (
                        <div key={it} className="text-[11px] text-text-secondary bg-muted/40 border border-border rounded-md px-2 py-1.5">
                          <span className="font-semibold text-text-primary">{it} — {info.name}.</span>{' '}
                          {info.desc}{' '}
                          <span className="text-text-muted">({info.responsable})</span>
                        </div>
                      );
                    })}
                </div>
              )}
              {errors.incotermsAceptados && (
                <p className="mt-1 text-xs text-red-500">
                  {(errors.incotermsAceptados as { message?: string }).message}
                </p>
              )}
              <p className="text-[11px] text-text-muted mt-2 flex items-start gap-1.5">
                <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>
                  Los incoterms se filtran según quién envía. Cambia la opción de logística para verlos todos.
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-text-secondary" />
                <h3 className="text-sm font-semibold text-text-primary">Términos de pago aceptados</h3>
              </div>
              <p className="text-xs text-text-muted">
                Selecciona uno o varios. Los matches incluirán vendedores que acepten cualquiera de estos.
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_TERMINOS_PAGO.map((tp) => {
                  const active = terminosPagoAceptados.includes(tp);
                  return (
                    <button
                      type="button"
                      key={tp}
                      onClick={() => toggleTerminoPago(tp)}
                      className={[
                        'px-3 py-1.5 rounded-badge text-xs font-medium border transition-colors',
                        active
                          ? 'bg-primary/10 border-primary text-secondary'
                          : 'bg-card border-border text-text-secondary hover:border-primary',
                      ].join(' ')}
                    >
                      {active && '✓ '}{TERMINO_PAGO_LABELS[tp]}
                    </button>
                  );
                })}
              </div>
              {errors.terminosPagoAceptados && (
                <p className="mt-1 text-xs text-red-500">
                  {(errors.terminosPagoAceptados as { message?: string }).message}
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
              data-tutorial="btn-publicar-pedido"
            >
              {isSubmitting ? 'Publicando...' : 'Publish Order'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
