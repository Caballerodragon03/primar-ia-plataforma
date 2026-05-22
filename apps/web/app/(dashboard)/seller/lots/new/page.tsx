'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, MapPin, Truck, Wallet, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Input, Select, FileDropzone, IncotermWizard } from '@/components/ui';
import { ExistingEntityBanner } from '@/components/ui/ExistingEntityBanner';
import { FreeTierMatchingNotice } from '@/components/subscriptions/FreeTierMatchingNotice';
import {
  ALL_INCOTERMS,
  ALL_TERMINOS_PAGO,
  LOGISTICA_LABELS,
  TERMINO_PAGO_LABELS,
  incotermsForLogistica,
  logisticaFromIncoterm,
  INCOTERM_INFO,
  type Incoterm as IncotermType,
  type LogisticaPreferencia,
  type TerminoPago as TerminoPagoType,
} from '@primaria/shared';

const OTHER_VALUE = '__other__';

const calibreSchema = z.object({
  calibre: z.string().min(1, 'Requerido'),
  cantidad_kg: z.coerce.number().positive('Debe ser positivo'),
});

const schema = z.object({
  productoId: z.string().min(1, 'Selecciona un producto'),
  variedadId: z.string().optional(),
  calibres: z.array(calibreSchema).min(1),
  noCalibre: z.boolean().default(false),
  direccionRecogida: z.string().min(5, 'Introduce la dirección'),
  fechaDisponibilidad: z.string().min(1, 'Selecciona una fecha'),
  fechaFinDisponibilidad: z.string().min(1, 'Selecciona una fecha'),
  certificaciones: z.array(z.string()).default([]),
  fotosUrls: z.array(z.string()).default([]),
  comentariosAdicionales: z.string().max(1000).optional(),
  publicar: z.boolean().default(false),
  logistica: z.enum(['YO_ENVIO', 'OTRO_RECOGE', 'INDIFERENTE']).default('INDIFERENTE'),
  incotermsAceptados: z.array(z.string()).min(1, 'Selecciona al menos un incoterm'),
  terminosPagoAceptados: z.array(z.enum(ALL_TERMINOS_PAGO as unknown as [string, ...string[]])).min(1, 'Selecciona al menos un término de pago'),
});

type FormValues = z.infer<typeof schema>;

type Product = { id: string; nombre: string; variedades: { id: string; nombre: string }[]; calibresDisponibles: string[] };

type Certificate = { id: string; tipo: string; estado: string; fechaExpiracion: string | null };

export default function PublishLotPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [approvedCerts, setApprovedCerts] = useState<Certificate[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [customVariety, setCustomVariety] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  // Incoterm recommendation from wizard / profile (e.g. 'FCA'). When present,
  // we auto-select that single incoterm + its derived logística on mount so
  // the seller's published lot reflects their stated preference; they can
  // expand to additional incoterms via the chips.
  const [recommendedIncoterm, setRecommendedIncoterm] = useState<string | null>(null);
  // Gate the chip section render until we've resolved the user's profile so
  // we don't briefly show all 12 chips ✓ (defaultValues) and then snap to
  // just the recommended one. Flash-of-unstyled-defaults is real.
  const [prefsResolved, setPrefsResolved] = useState(false);

  useEffect(() => {
    // Try to read recommended incoterm from either DB profile or localStorage.
    // We use it to pre-select the chip + auto-set logística so the seller
    // doesn't have to re-pick what they already configured in their profile.
    function applyPrefs(prefs: { recommended?: string; selected?: string[] } | null) {
      if (!prefs) return;
      const rec = prefs.recommended;
      if (rec && ALL_INCOTERMS.includes(rec as IncotermType)) {
        setRecommendedIncoutermAndSync(rec);
      }
    }
    // Local helper that snaps logística + the chip selection to the recommendation.
    function setRecommendedIncoutermAndSync(rec: string) {
      setRecommendedIncoterm(rec);
    }

    // Check DB first for incoterm preferences, then localStorage
    api.get('/auth/profile')
      .then(({ data }) => {
        const prefs = data.data?.preferenciasIncoterm;
        if (prefs && prefs.selected?.length > 0) {
          // Already configured in DB — sync to localStorage and skip wizard
          localStorage.setItem('primaria_incoterms', JSON.stringify({ ...prefs, done: true }));
          applyPrefs(prefs);
          return;
        }
        // Check localStorage
        const stored = localStorage.getItem('primaria_incoterms');
        if (stored && JSON.parse(stored).done) {
          applyPrefs(JSON.parse(stored));
          return;
        }
        // Check if seller already has lots
        return api.get('/lots?tab=all').then(({ data: lotsData }) => {
          const lots = lotsData.data ?? [];
          if (lots.length > 0) {
            localStorage.setItem('primaria_incoterms', JSON.stringify({ recommended: '', selected: [], done: true }));
          } else {
            setShowWizard(true);
          }
        });
      })
      .catch(() => {
        const stored = localStorage.getItem('primaria_incoterms');
        if (stored && JSON.parse(stored).done) {
          applyPrefs(JSON.parse(stored));
          return;
        }
        setShowWizard(true);
      })
      .finally(() => setPrefsResolved(true));
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
      calibres: [{ calibre: '', cantidad_kg: 0 }],
      certificaciones: [],
      fotosUrls: [],
      noCalibre: false,
      publicar: false,
      logistica: 'INDIFERENTE',
      // Empty by default — populated on `prefsResolved` either with the
      // recommended chip (if any) or with the full set (fallback).
      // Prevents flash-of-12-chips before profile load resolves.
      incotermsAceptados: [],
      terminosPagoAceptados: ['INMEDIATO'],
    },
  });

  const { fields, append, remove, replace: replaceCalibres } = useFieldArray({ control, name: 'calibres' });

  const selectedProductId = watch('productoId');
  const selectedVariedadId = watch('variedadId');
  const selectedCerts = watch('certificaciones');
  const noCalibre = watch('noCalibre');
  const logistica = watch('logistica');
  const incotermsAceptados = watch('incotermsAceptados') ?? [];
  const terminosPagoAceptados = watch('terminosPagoAceptados') ?? [];

  // Phase 14M v3 — autofill desde el TutorialRunner. Los flows disparan
  // window event 'tutorial:autofill' con la data del paso. Como products
  // puede tardar en cargarse, guardamos la última data pendiente en un
  // ref y la aplicamos cuando esté lista (o al recibir cada evento).
  const pendingAutofill = useRef<Record<string, unknown> | null>(null);

  function applyAutofill(data: Record<string, unknown>) {
    if (typeof data['producto'] === 'string') {
      if (products.length === 0) {
        // products todavía no cargado → encolar y reintentar.
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
      // Buscamos la variedad en TODOS los productos por si productoId aún
      // no se ha propagado al watch().
      const allVarieties = products.flatMap((p) => p.variedades);
      const v = allVarieties.find((x) => x.nombre.toLowerCase() === (data['variedad'] as string).toLowerCase());
      if (v) setValue('variedadId', v.id, { shouldValidate: true });
      else {
        setValue('variedadId', OTHER_VALUE, { shouldValidate: true });
        setCustomVariety(data['variedad'] as string);
      }
    }
    if (Array.isArray(data['calibres'])) {
      // useFieldArray necesita replace() para que su lista interna se
      // sincronice. Si solo hacemos setValue, los inputs renderizados
      // por field.map() no se refrescan.
      replaceCalibres(data['calibres'] as { calibre: string; cantidad_kg: number }[]);
    }
    if (typeof data['logistica'] === 'string') {
      setValue('logistica', data['logistica'] as 'YO_ENVIO' | 'OTRO_RECOGE' | 'INDIFERENTE', { shouldValidate: true });
    }
    if (typeof data['incoterm'] === 'string') {
      setValue('incotermsAceptados', [data['incoterm'] as string], { shouldValidate: true });
    }
    if (typeof data['direccionRecogida'] === 'string') {
      setValue('direccionRecogida', data['direccionRecogida'] as string, { shouldValidate: true });
    }
    if (typeof data['fechaDisponibilidad'] === 'string') {
      setValue('fechaDisponibilidad', data['fechaDisponibilidad'] as string, { shouldValidate: true });
    }
    if (typeof data['fechaFinDisponibilidad'] === 'string') {
      setValue('fechaFinDisponibilidad', data['fechaFinDisponibilidad'] as string, { shouldValidate: true });
    }
    if (Array.isArray(data['terminosPagoAceptados'])) {
      setValue('terminosPagoAceptados', data['terminosPagoAceptados'] as string[], { shouldValidate: true });
    }
    if (typeof data['comentariosAdicionales'] === 'string') {
      setValue('comentariosAdicionales', data['comentariosAdicionales'] as string);
    }
  }

  useEffect(() => {
    function onAutofill(ev: Event) {
      const e = ev as CustomEvent<{ stepKey: string; data: Record<string, unknown> }>;
      try {
        applyAutofill(e.detail?.data ?? {});
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[tutorial autofill] error', err);
      }
    }
    window.addEventListener('tutorial:autofill', onAutofill);
    return () => window.removeEventListener('tutorial:autofill', onAutofill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // Cuando products termine de cargar, drena cualquier autofill pendiente.
  useEffect(() => {
    if (products.length > 0 && pendingAutofill.current) {
      const data = pendingAutofill.current;
      pendingAutofill.current = null;
      applyAutofill(data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // Incoterms disponibles según la opción de logística — el comprador no
  // puede elegir incoterms incompatibles con "Yo envío" o "Otro recoge".
  const availableIncoterms = useMemo(
    () => incotermsForLogistica(logistica as LogisticaPreferencia),
    [logistica],
  );

  // Si el usuario cambia logística, recortamos los incoterms aceptados a los
  // que sigan siendo válidos. Sin esto, podría enviar un combo inconsistente.
  useEffect(() => {
    const valid = incotermsAceptados.filter((it) =>
      (availableIncoterms as readonly string[]).includes(it),
    );
    if (valid.length !== incotermsAceptados.length) {
      setValue('incotermsAceptados', valid.length > 0 ? valid : [...availableIncoterms]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logistica]);

  // Populate chips once we've resolved the profile. Three cases:
  //   (a) recommendedIncoterm present AND not previously dismissed → snap
  //       logística + select only that chip. Seller may add more via toggles.
  //   (b) recommendation present but DISMISSED → ALL incoterms + INDIFERENTE.
  //   (c) no recommendation → ALL (legacy default).
  // Only runs once at first resolution; manual chip edits afterwards are preserved.
  useEffect(() => {
    if (!prefsResolved) return;
    // Phase 12 — respect the "dismissed recommendation" flag persisted in
    // localStorage on previous sessions. If user explicitly dismissed it,
    // we don't re-apply on remount.
    const dismissed = typeof window !== 'undefined'
      && localStorage.getItem('primaria_incoterms_dismissed') === '1';
    if (recommendedIncoterm && !dismissed && ALL_INCOTERMS.includes(recommendedIncoterm as IncotermType)) {
      const derivedLogistica = logisticaFromIncoterm(recommendedIncoterm as IncotermType);
      setValue('logistica', derivedLogistica);
      setValue('incotermsAceptados', [recommendedIncoterm]);
    } else {
      setValue('incotermsAceptados', [...ALL_INCOTERMS]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsResolved, recommendedIncoterm]);

  /**
   * Phase 12 — let the seller dismiss the recommendation chip permanently.
   * Persisted in localStorage so future visits don't re-apply.
   */
  function dismissRecommendation() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('primaria_incoterms_dismissed', '1');
    }
    setRecommendedIncoterm(null);
    setValue('incotermsAceptados', [...ALL_INCOTERMS]);
    setValue('logistica', 'INDIFERENTE');
  }

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
      // No permitas dejar el array vacío.
      if (cur.length === 1) return;
      setValue('terminosPagoAceptados', cur.filter((x) => x !== tp));
    } else {
      setValue('terminosPagoAceptados', [...cur, tp]);
    }
  };

  useEffect(() => {
    api.get('/products').then(({ data }) => setProducts(data.data)).catch(() => {});
    api.get('/certificates').then(({ data }) => {
      const certs: Certificate[] = data.data ?? [];
      setApprovedCerts(certs.filter((c) => c.estado === 'VERIFICADO'));
    }).catch(() => {});
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const varieties = selectedProduct?.variedades ?? [];
  const calibreOptions = selectedProduct?.calibresDisponibles ?? [];

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
      const variedadId =
        values.variedadId && values.variedadId !== OTHER_VALUE
          ? values.variedadId
          : undefined;
      const variedadCustom =
        values.variedadId === OTHER_VALUE && customVariety.trim()
          ? customVariety.trim()
          : undefined;

      const calibres = values.noCalibre
        ? [{
            calibre: 'UNCALIBRATED',
            cantidad_kg: values.calibres.reduce((s, c) => s + c.cantidad_kg, 0),
            precio_min_kg: 0,
          }]
        : values.calibres.map((c) => ({ ...c, precio_min_kg: 0 }));

      const payload = {
        ...values,
        calibres,
        variedadId,
        variedadCustom,
        publicar: publish,
        fechaDisponibilidad: new Date(values.fechaDisponibilidad).toISOString(),
        fechaFinDisponibilidad: new Date(values.fechaFinDisponibilidad).toISOString(),
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

  if (showWizard) return <IncotermWizard onComplete={() => {
    setShowWizard(false);
    // Persist wizard results to DB
    try {
      const raw = localStorage.getItem('primaria_incoterms');
      if (raw) {
        const stored = JSON.parse(raw);
        api.patch('/auth/profile', { preferenciasIncoterm: stored }).catch(() => {});
      }
    } catch { /* ignore */ }
  }} />;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Publicar nuevo lote</h1>

      <FreeTierMatchingNotice itemKind="lote" subscriptionHref="/seller/subscription" />

      {/* Phase 14M v3.33 — sugiere editar un lote existente con el mismo
          producto+variedad antes de crear un duplicado. Aparece solo si
          hay coincidencias activas; se puede descartar para seguir creando. */}
      <ExistingEntityBanner
        kind="lot"
        productoId={selectedProductId}
        variedadId={selectedVariedadId}
      />

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        {/* Product Details */}
        <section data-tutorial="form-producto" className="bg-card rounded-card border border-border p-5 space-y-4">
          <h2 className="font-semibold text-text-primary">Detalles del producto</h2>
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
          <div data-tutorial="form-calibres" className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" {...register('noCalibre')} className="rounded" />
              Non calibrated/weighted Lot
            </label>
            {noCalibre ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-text-secondary px-1">Estimated Quantity (kg)</p>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Total kg available"
                  {...register('calibres.0.cantidad_kg')}
                  error={errors.calibres?.[0]?.cantidad_kg?.message}
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-text-secondary px-1">
                  <span>Caliber</span>
                  <span>Quantity (kg)</span>
                  <span />
                </div>
                {fields.map((field, idx) => (
                  <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                    {calibreOptions.length > 1 ? (
                      <Select
                        label=""
                        {...register(`calibres.${idx}.calibre`)}
                        error={errors.calibres?.[idx]?.calibre?.message}
                      >
                        <option value="">Select caliber...</option>
                        {calibreOptions.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        placeholder="e.g. 70/80 mm"
                        {...register(`calibres.${idx}.calibre`)}
                        error={errors.calibres?.[idx]?.calibre?.message}
                      />
                    )}
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="1000"
                      {...register(`calibres.${idx}.cantidad_kg`)}
                      error={errors.calibres?.[idx]?.cantidad_kg?.message}
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
                  onClick={() => append({ calibre: '', cantidad_kg: 0 })}
                  className="text-sm text-primary-dark font-medium hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add another caliber
                </button>
              </>
            )}
          </div>
        </section>

        {/* Logistics */}
        <section data-tutorial="form-logistica" className="bg-card rounded-card border border-border p-5 space-y-4">
          <h2 className="font-semibold text-text-primary">Logística y disponibilidad</h2>
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Available From"
              required
              {...register('fechaDisponibilidad')}
              error={errors.fechaDisponibilidad?.message}
            />
            <Input
              type="date"
              label="Available Until"
              required
              {...register('fechaFinDisponibilidad')}
              error={errors.fechaFinDisponibilidad?.message}
            />
          </div>

          {/* Logística + Incoterms */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-text-secondary" />
              <h3 className="text-sm font-semibold text-text-primary">¿Quién se encarga del envío?</h3>
            </div>
            <Select
              label=""
              {...register('logistica')}
            >
              <option value="INDIFERENTE">{LOGISTICA_LABELS.INDIFERENTE} (más matches)</option>
              <option value="YO_ENVIO">{LOGISTICA_LABELS.YO_ENVIO}</option>
              <option value="OTRO_RECOGE">{LOGISTICA_LABELS.OTRO_RECOGE}</option>
            </Select>

            <div>
              <p className="text-xs font-medium text-text-secondary mb-2">
                Incoterms aceptados <span className="text-text-muted">(elige uno o varios)</span>
                {recommendedIncoterm && (
                  <>
                    <span className="ml-2 text-[11px] text-primary-dark">
                      Recomendado por tu perfil: <strong>{recommendedIncoterm}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={dismissRecommendation}
                      className="ml-2 text-[11px] text-text-muted hover:text-text-secondary underline"
                      title="Ocultar la recomendación y aceptar todos los incoterms por defecto"
                    >
                      No mostrar
                    </button>
                  </>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {availableIncoterms.map((it) => {
                  const active = incotermsAceptados.includes(it);
                  const isRec = it === recommendedIncoterm;
                  const info = INCOTERM_INFO[it];
                  // Native title attribute → free tooltip on hover.
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
                          ? isRec
                            ? 'bg-primary border-primary text-foreground shadow-sm'
                            : 'bg-primary/10 border-primary text-secondary'
                          : 'bg-card border-border text-text-secondary hover:border-primary',
                      ].join(' ')}
                    >
                      {active && '✓ '}{it}{isRec ? ' ★' : ''}
                    </button>
                  );
                })}
              </div>
              {/* Descriptions for currently selected incoterms — shown below
                  the chips so the seller understands what they're committing
                  to without having to hover one by one. */}
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
                  Los incoterms se filtran según quién envía. Para ampliarlos, cambia la opción de logística.
                </span>
              </p>
            </div>
          </div>

          {/* Términos de pago */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-text-secondary" />
              <h3 className="text-sm font-semibold text-text-primary">Términos de pago aceptados</h3>
            </div>
            <p className="text-xs text-text-muted">
              Elige uno o varios. El comprador podrá pagar bajo cualquiera de los términos que aceptes.
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
        </section>

        {/* Supporting Info */}
        <section className="bg-card rounded-card border border-border p-5 space-y-4">
          <h2 className="font-semibold text-text-primary">Información adicional</h2>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Associated Certificates</p>
            {approvedCerts.length === 0 ? (
              <p className="text-xs text-text-muted italic">
                No tienes certificados aprobados. Sube tus certificados en tu perfil y espera la verificación del administrador.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {approvedCerts.map((cert) => {
                  const active = selectedCerts?.includes(cert.tipo);
                  return (
                    <button
                      key={cert.id}
                      type="button"
                      onClick={() => toggleCert(cert.tipo)}
                      className={[
                        'px-3 py-1 rounded-badge text-sm font-medium border transition-colors',
                        active
                          ? 'bg-primary/10 border-primary text-secondary'
                          : 'bg-card border-border text-text-secondary hover:border-primary',
                      ].join(' ')}
                    >
                      {active && '✓ '}{cert.tipo}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Phase 14B — file upload real con POST /upload. Antes el handler
              solo hacía console.log → fotosUrls quedaba siempre []. */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Fotos del lote</p>
            <FileDropzone
              accept=".png,.jpg,.jpeg,.gif"
              maxSizeMB={10}
              label="Subir foto del lote"
              onFileSelect={async (file) => {
                if (!file) return;
                try {
                  const form = new FormData();
                  form.append('file', file);
                  const res = await api.post<{ data: { url: string } }>('/upload', form, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  });
                  const url = res.data?.data?.url;
                  if (url) {
                    const current = watch('fotosUrls') ?? [];
                    setValue('fotosUrls', [...current, url]);
                  }
                } catch (err) {
                  console.error('[upload] foto del lote failed:', err);
                  alert('No se pudo subir la foto. Inténtalo de nuevo.');
                }
              }}
            />
            {(watch('fotosUrls') ?? []).length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(watch('fotosUrls') ?? []).map((url: string, i: number) => (
                  <div key={i} className="relative">
                    <img src={url} alt={`Foto ${i + 1}`} className="w-full h-20 object-cover rounded border border-border" />
                    <button
                      type="button"
                      onClick={() => {
                        const cur = watch('fotosUrls') ?? [];
                        setValue('fotosUrls', cur.filter((_: string, idx: number) => idx !== i));
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded px-1.5 py-0.5 opacity-90 hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
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
            data-tutorial="btn-publicar-lote"
          >
            {isSubmitting ? 'Publicando...' : 'Publish Lot'}
          </Button>
        </div>
      </form>
    </div>
  );
}
