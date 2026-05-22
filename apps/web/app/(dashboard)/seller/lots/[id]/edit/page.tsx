'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, type UseFormRegister, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, ArrowLeft, Target } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button, Input, Select } from '@/components/ui';
import {
  ALL_INCOTERMS,
  ALL_TERMINOS_PAGO,
  LOGISTICA_LABELS,
  TERMINO_PAGO_LABELS,
  incotermsForLogistica,
  type LogisticaPreferencia,
} from '@primaria/shared';

const calibreSchema = z.object({
  calibre: z.string().min(1, 'Requerido'),
  cantidad_kg: z.coerce.number().positive('Debe ser positivo'),
  precio_min_kg: z.coerce.number().min(0).default(0),
});

const schema = z.object({
  calibres: z.array(calibreSchema).min(1),
  direccionRecogida: z.string().min(5, 'Introduce la dirección'),
  fechaDisponibilidad: z.string().min(1, 'Selecciona una fecha'),
  comentariosAdicionales: z.string().max(1000).optional(),
  // Phase 14M v3.34 — campos antes solo editables en /new ahora también
  // en /edit, para poder ajustar discrepancias desde "Ofertas similares".
  logistica: z.enum(['YO_ENVIO', 'OTRO_RECOGE', 'INDIFERENTE']).default('INDIFERENTE'),
  incotermsAceptados: z.array(z.enum(ALL_INCOTERMS as unknown as [string, ...string[]])).default([]),
  terminosPagoAceptados: z.array(z.enum(ALL_TERMINOS_PAGO as unknown as [string, ...string[]])).min(1).default(['INMEDIATO']),
});

type FormValues = z.infer<typeof schema>;

type CalibreItem = { calibre: string; cantidad_kg: number; precio_min_kg?: number };
type LotDetail = {
  id: string;
  productoId: string;
  estado: string;
  calibres: CalibreItem[];
  direccionRecogida: string;
  fechaDisponibilidad: string;
  comentariosAdicionales?: string | null;
  totalKg: number;
  coverage: number;
  logistica?: string;
  incotermsAceptados?: string[];
  terminosPagoAceptados?: string[];
};

type Product = { id: string; nombre: string; calibresDisponibles: string[] };

// Phase 14M v3.34 — los campos del diff de "Ofertas Similares" mapean a
// secciones de este formulario. Cuando ?focus={field} llega, hacemos scroll
// + highlight a la sección correspondiente.
type FocusField = 'calibre' | 'precio' | 'incoterm' | 'logistica' | 'terminoPago';
const FOCUS_SECTION_ID: Record<FocusField, string> = {
  calibre: 'section-calibres',
  precio: 'section-calibres', // precio_min_kg vive dentro de calibres
  incoterm: 'section-comerciales',
  logistica: 'section-comerciales',
  terminoPago: 'section-comerciales',
};
const FOCUS_LABEL: Record<FocusField, string> = {
  calibre: 'los calibres',
  precio: 'el precio mínimo por calibre',
  incoterm: 'los incoterms aceptados',
  logistica: 'la logística',
  terminoPago: 'los términos de pago',
};

export default function EditLotPage() {
  return (
    <Suspense fallback={<div className="p-6 max-w-2xl mx-auto"><div className="h-12 bg-muted animate-pulse rounded-card" /></div>}>
      <EditLotContent />
    </Suspense>
  );
}

function EditLotContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusRaw = searchParams.get('focus');
  const focus: FocusField | null = focusRaw && (focusRaw in FOCUS_SECTION_ID) ? (focusRaw as FocusField) : null;
  const [committedKg, setCommittedKg] = useState(0);
  const [calibreOptions, setCalibreOptions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      calibres: [{ calibre: '', cantidad_kg: 0, precio_min_kg: 0 }],
      logistica: 'INDIFERENTE',
      incotermsAceptados: [],
      terminosPagoAceptados: ['INMEDIATO'],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'calibres' });
  const logistica = watch('logistica');
  const incotermsAceptados = watch('incotermsAceptados') ?? [];
  const terminosPagoAceptados = watch('terminosPagoAceptados') ?? [];
  const availableIncoterms = incotermsForLogistica(logistica as LogisticaPreferencia);

  useEffect(() => {
    Promise.all([
      api.get<{ data: LotDetail }>(`/lots/${id}`),
      api.get<{ data: Product[] }>('/products'),
    ])
      .then(([lotRes, productsRes]) => {
        const lot = lotRes.data.data;
        const products = productsRes.data.data ?? [];
        const product = products.find((p) => p.id === lot.productoId);
        setCalibreOptions(product?.calibresDisponibles ?? []);
        const committed = Math.round((lot.coverage / 100) * lot.totalKg);
        setCommittedKg(committed);
        reset({
          calibres: lot.calibres.map((c) => ({
            calibre: c.calibre,
            cantidad_kg: c.cantidad_kg,
            precio_min_kg: c.precio_min_kg ?? 0,
          })),
          direccionRecogida: lot.direccionRecogida,
          fechaDisponibilidad: lot.fechaDisponibilidad
            ? new Date(lot.fechaDisponibilidad).toISOString().split('T')[0]
            : '',
          comentariosAdicionales: lot.comentariosAdicionales ?? '',
          logistica: (lot.logistica as 'YO_ENVIO' | 'OTRO_RECOGE' | 'INDIFERENTE') ?? 'INDIFERENTE',
          incotermsAceptados: (lot.incotermsAceptados ?? []) as FormValues['incotermsAceptados'],
          terminosPagoAceptados: ((lot.terminosPagoAceptados ?? ['INMEDIATO']) as FormValues['terminosPagoAceptados']),
        });
      })
      .catch(() => setError('No se pudo cargar el lote.'))
      .finally(() => setLoading(false));
  }, [id, reset]);

  // Scroll a la sección indicada por ?focus= cuando se haya cargado todo.
  const scrolledRef = useRef(false);
  useEffect(() => {
    if (loading || !focus || scrolledRef.current) return;
    scrolledRef.current = true;
    const sectionId = FOCUS_SECTION_ID[focus];
    requestAnimationFrame(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }, [loading, focus]);

  const toggleIncoterm = (it: string) => {
    const next = incotermsAceptados.includes(it)
      ? incotermsAceptados.filter((x) => x !== it)
      : [...incotermsAceptados, it];
    setValue('incotermsAceptados', next, { shouldValidate: true });
  };

  const toggleTerminoPago = (tp: string) => {
    const next = terminosPagoAceptados.includes(tp as 'INMEDIATO' | 'DIAS_30' | 'DIAS_60')
      ? terminosPagoAceptados.filter((x) => x !== tp)
      : [...terminosPagoAceptados, tp as 'INMEDIATO' | 'DIAS_30' | 'DIAS_60'];
    if (next.length === 0) return; // requerido min 1
    setValue('terminosPagoAceptados', next, { shouldValidate: true });
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setError('');
    try {
      await api.put(`/lots/${id}`, {
        ...values,
        fechaDisponibilidad: new Date(values.fechaDisponibilidad).toISOString(),
      });
      router.push(`/seller/lots/${id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Error al guardar el lote';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-card" />)}
      </div>
    );
  }

  // Estilo del highlight aplicado a la sección que estamos editando vía
  // ?focus. Se hace fade-out tras unos segundos para no distraer.
  const focusedSectionId = focus ? FOCUS_SECTION_ID[focus] : null;
  const sectionClass = (sectionId: string) =>
    [
      'bg-card rounded-card border p-5 space-y-4 transition-all duration-500',
      focusedSectionId === sectionId
        ? 'border-primary ring-2 ring-primary/40 shadow-soft-md'
        : 'border-border',
    ].join(' ');

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/seller/lots/${id}`} className="text-text-secondary hover:text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Editar lote</h1>
      </div>

      {focus && (
        <div className="bg-primary/10 border border-primary/40 rounded-card p-3 flex items-start gap-2 text-sm">
          <Target className="w-4 h-4 text-primary-dark shrink-0 mt-0.5" />
          <p className="text-foreground">
            Estás ajustando <strong>{FOCUS_LABEL[focus]}</strong> para encajar con la oferta de un comprador.
            Cambia solo ese campo y guarda — el resto puedes dejarlo igual.
          </p>
        </div>
      )}

      {committedKg > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-card p-4 text-sm text-amber-800">
          <strong>{committedKg.toLocaleString('es-ES')} kg</strong> already committed by buyers.
          You cannot reduce total kg below this amount.
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-input text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Calibres + precio */}
        <div id="section-calibres" className={sectionClass('section-calibres')}>
          <h2 className="text-sm font-semibold text-text-primary">Calibres y precios</h2>
          {committedKg > 0 && (
            <p className="text-xs text-text-secondary">
              Note: prices can be updated, but total kg must stay ≥ {committedKg.toLocaleString('es-ES')} kg committed.
            </p>
          )}
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 text-xs font-medium text-text-secondary px-1">
              <span>Caliber</span>
              <span>Qty (kg)</span>
              <span>Precio mín (€/kg)</span>
              <span />
            </div>
            {fields.map((field, i) => (
              <CalibreRow
                key={field.id}
                index={i}
                calibreOptions={calibreOptions}
                register={register}
                errors={errors}
                canRemove={fields.length > 1}
                onRemove={() => remove(i)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => append({ calibre: '', cantidad_kg: 0, precio_min_kg: 0 })}
            className="text-sm text-primary-dark hover:underline flex items-center gap-1 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add caliber
          </button>
        </div>

        {/* Logistics + Incoterms + Términos de pago */}
        <div id="section-comerciales" className={sectionClass('section-comerciales')}>
          <h2 className="text-sm font-semibold text-text-primary">Condiciones comerciales</h2>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">¿Quién envía?</label>
            <Select label="" {...register('logistica')}>
              <option value="INDIFERENTE">{LOGISTICA_LABELS.INDIFERENTE} (más matches)</option>
              <option value="YO_ENVIO">{LOGISTICA_LABELS.YO_ENVIO}</option>
              <option value="OTRO_RECOGE">{LOGISTICA_LABELS.OTRO_RECOGE}</option>
            </Select>
          </div>

          <div>
            <p className="text-xs font-medium text-text-secondary mb-2">Incoterms aceptados</p>
            <div className="flex flex-wrap gap-2">
              {availableIncoterms.map((it) => {
                const active = incotermsAceptados.includes(it);
                return (
                  <button
                    type="button"
                    key={it}
                    onClick={() => toggleIncoterm(it)}
                    className={[
                      'px-3 py-1 rounded-badge text-xs font-medium border transition-colors',
                      active
                        ? 'bg-primary/10 border-primary text-secondary'
                        : 'bg-card border-border text-text-secondary hover:border-primary',
                    ].join(' ')}
                  >
                    {it}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-text-secondary mb-2">Términos de pago aceptados</p>
            <div className="flex flex-wrap gap-2">
              {ALL_TERMINOS_PAGO.map((tp) => {
                const active = terminosPagoAceptados.includes(tp);
                return (
                  <button
                    type="button"
                    key={tp}
                    onClick={() => toggleTerminoPago(tp)}
                    className={[
                      'px-3 py-1 rounded-badge text-xs font-medium border transition-colors',
                      active
                        ? 'bg-primary/10 border-primary text-secondary'
                        : 'bg-card border-border text-text-secondary hover:border-primary',
                    ].join(' ')}
                  >
                    {TERMINO_PAGO_LABELS[tp]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Logistics location */}
        <div className="bg-card rounded-card border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">Ubicación y notas</h2>
          <Input
            label="Pickup Location"
            {...register('direccionRecogida')}
            error={errors.direccionRecogida?.message}
          />
          <Input
            label="Available From"
            type="date"
            {...register('fechaDisponibilidad')}
            error={errors.fechaDisponibilidad?.message}
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Additional Comments</label>
            <textarea
              {...register('comentariosAdicionales')}
              rows={3}
              className="w-full px-3 py-2.5 rounded-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors resize-none"
              placeholder="Optional notes..."
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Link href={`/seller/lots/${id}`}>
            <Button variant="outline" type="button">Cancelar</Button>
          </Link>
          <Button variant="primary" type="submit" loading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

function CalibreRow({
  index,
  calibreOptions,
  register,
  errors,
  canRemove,
  onRemove,
}: {
  index: number;
  calibreOptions: string[];
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  canRemove: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
      {calibreOptions.length > 1 ? (
        <Select
          label=""
          {...register(`calibres.${index}.calibre`)}
          error={errors.calibres?.[index]?.calibre?.message}
        >
          <option value="">Select caliber...</option>
          {calibreOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      ) : (
        <Input
          label=""
          {...register(`calibres.${index}.calibre`)}
          error={errors.calibres?.[index]?.calibre?.message}
        />
      )}
      <Input
        label=""
        type="number"
        step="0.01"
        {...register(`calibres.${index}.cantidad_kg`)}
        error={errors.calibres?.[index]?.cantidad_kg?.message}
      />
      <Input
        label=""
        type="number"
        step="0.001"
        {...register(`calibres.${index}.precio_min_kg`)}
        error={errors.calibres?.[index]?.precio_min_kg?.message}
      />
      {canRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="mb-1 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
