'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button, Input, Select } from '@/components/ui';

const INCOTERMS = ['EXW','FCA','FOB','CIF','DAP','DDP','FAS','CFR','CPT','CIP','DAT','DPU'];

const calibreSchema = z.object({
  calibre: z.string().min(1, 'Requerido'),
  cantidad_kg: z.coerce.number().positive('Debe ser positivo'),
  precio_max_kg: z.coerce.number().positive('Debe ser positivo'),
});

const schema = z.object({
  calibresSolicitados: z.array(calibreSchema).min(1),
  incoterm: z.string().min(1, 'Selecciona un incoterm'),
  destinoFinal: z.string().optional(),
  frecuencia: z.string().optional(),
  fechaEntregaDeseada: z.string().min(1, 'Selecciona una fecha'),
  notasAdicionales: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

type CalibreItem = { calibre: string; cantidad_kg: number; precio_max_kg: number };
type OrderDetail = {
  estado: string;
  productoId: string;
  calibresSolicitados: CalibreItem[];
  incoterm: string;
  destinoFinal?: string;
  frecuencia?: string;
  fechaEntregaDeseada?: string;
  notasAdicionales?: string;
  totalKg: number;
  coverage: number;
};

type Product = { id: string; nombre: string; calibresDisponibles: string[] };

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { calibresSolicitados: [{ calibre: '', cantidad_kg: 0, precio_max_kg: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'calibresSolicitados' });

  useEffect(() => {
    Promise.all([
      api.get<{ data: OrderDetail }>(`/orders/${id}`),
      api.get<{ data: Product[] }>('/products'),
    ])
      .then(([orderRes, productsRes]) => {
        const order = orderRes.data.data;
        const products = productsRes.data.data ?? [];
        const product = products.find((p) => p.id === order.productoId);
        setCalibreOptions(product?.calibresDisponibles ?? []);
        const committed = Math.round((order.coverage / 100) * order.totalKg);
        setCommittedKg(committed);
        reset({
          calibresSolicitados: (order.calibresSolicitados as CalibreItem[]).map((c) => ({
            calibre: c.calibre,
            cantidad_kg: c.cantidad_kg,
            precio_max_kg: c.precio_max_kg,
          })),
          incoterm: order.incoterm ?? '',
          destinoFinal: order.destinoFinal ?? '',
          frecuencia: order.frecuencia ?? '',
          fechaEntregaDeseada: order.fechaEntregaDeseada
            ? new Date(order.fechaEntregaDeseada).toISOString().split('T')[0]
            : '',
          notasAdicionales: order.notasAdicionales ?? '',
        });
      })
      .catch(() => setError('No se pudo cargar el pedido.'))
      .finally(() => setLoading(false));
  }, [id, reset]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setError('');
    try {
      await api.put(`/orders/${id}`, {
        ...values,
        fechaEntregaDeseada: new Date(values.fechaEntregaDeseada).toISOString(),
      });
      router.push(`/buyer/orders/${id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Error al guardar el pedido';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-card" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/buyer/orders/${id}`} className="text-text-secondary hover:text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Edit Order</h1>
      </div>

      {committedKg > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-card p-4 text-sm text-amber-800">
          <strong>{committedKg.toLocaleString('es-ES')} kg</strong> already reserved by sellers.
          You cannot reduce total kg below this amount. Prices on confirmed matches are locked.
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-input text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Calibres */}
        <div className="bg-surface rounded-card border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">Calibers Requested</h2>
          <div className="space-y-3">
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-3 gap-3 items-end">
                {calibreOptions.length > 1 ? (
                  <Select
                    label="Caliber"
                    {...register(`calibresSolicitados.${i}.calibre`)}
                    error={errors.calibresSolicitados?.[i]?.calibre?.message}
                  >
                    <option value="">Select caliber...</option>
                    {calibreOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    label="Caliber"
                    {...register(`calibresSolicitados.${i}.calibre`)}
                    error={errors.calibresSolicitados?.[i]?.calibre?.message}
                  />
                )}
                <Input
                  label="Qty (kg)"
                  type="number"
                  step="0.01"
                  {...register(`calibresSolicitados.${i}.cantidad_kg`)}
                  error={errors.calibresSolicitados?.[i]?.cantidad_kg?.message}
                />
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      label="Max Price (€/kg)"
                      type="number"
                      step="0.001"
                      {...register(`calibresSolicitados.${i}.precio_max_kg`)}
                      error={errors.calibresSolicitados?.[i]?.precio_max_kg?.message}
                    />
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="mb-1 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => append({ calibre: '', cantidad_kg: 0, precio_max_kg: 0 })}
            className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add caliber
          </button>
        </div>

        {/* Order details */}
        <div className="bg-surface rounded-card border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">Order Details</h2>
          <Select
            label="Incoterm"
            {...register('incoterm')}
            error={errors.incoterm?.message}
          >
            <option value="">Select incoterm…</option>
            {INCOTERMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input
            label="Final Destination"
            {...register('destinoFinal')}
            placeholder="e.g. Port of Rotterdam, Netherlands"
          />
          <Input
            label="Frequency"
            {...register('frecuencia')}
            placeholder="e.g. Weekly, Monthly"
          />
          <Input
            label="Desired Delivery Date"
            type="date"
            {...register('fechaEntregaDeseada')}
            error={errors.fechaEntregaDeseada?.message}
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Additional Notes</label>
            <textarea
              {...register('notasAdicionales')}
              rows={3}
              className="w-full px-3 py-2.5 rounded-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors resize-none"
              placeholder="Optional notes..."
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Link href={`/buyer/orders/${id}`}>
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button variant="primary" type="submit" loading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
