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

const calibreSchema = z.object({
  calibre: z.string().min(1, 'Requerido'),
  cantidad_kg: z.coerce.number().positive('Debe ser positivo'),
});

const schema = z.object({
  calibres: z.array(calibreSchema).min(1),
  direccionRecogida: z.string().min(5, 'Introduce la dirección'),
  fechaDisponibilidad: z.string().min(1, 'Selecciona una fecha'),
  comentariosAdicionales: z.string().max(1000).optional(),
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
};

type Product = { id: string; nombre: string; calibresDisponibles: string[] };

export default function EditLotPage() {
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
    defaultValues: { calibres: [{ calibre: '', cantidad_kg: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'calibres' });

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
          })),
          direccionRecogida: lot.direccionRecogida,
          fechaDisponibilidad: lot.fechaDisponibilidad
            ? new Date(lot.fechaDisponibilidad).toISOString().split('T')[0]
            : '',
          comentariosAdicionales: lot.comentariosAdicionales ?? '',
        });
      })
      .catch(() => setError('No se pudo cargar el lote.'))
      .finally(() => setLoading(false));
  }, [id, reset]);

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

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/seller/lots/${id}`} className="text-text-secondary hover:text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Editar lote</h1>
      </div>

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
        {/* Calibres */}
        <div className="bg-card rounded-card border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">Calibres</h2>
          {committedKg > 0 && (
            <p className="text-xs text-text-secondary">
              Note: prices can be updated, but total kg must stay ≥ {committedKg.toLocaleString('es-ES')} kg committed.
            </p>
          )}
          <div className="space-y-3">
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                {calibreOptions.length > 1 ? (
                  <Select
                    label="Caliber"
                    {...register(`calibres.${i}.calibre`)}
                    error={errors.calibres?.[i]?.calibre?.message}
                  >
                    <option value="">Select caliber...</option>
                    {calibreOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    label="Caliber"
                    {...register(`calibres.${i}.calibre`)}
                    error={errors.calibres?.[i]?.calibre?.message}
                  />
                )}
                <Input
                  label="Qty (kg)"
                  type="number"
                  step="0.01"
                  {...register(`calibres.${i}.cantidad_kg`)}
                  error={errors.calibres?.[i]?.cantidad_kg?.message}
                />
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
            ))}
          </div>
          <button
            type="button"
            onClick={() => append({ calibre: '', cantidad_kg: 0 })}
            className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add caliber
          </button>
        </div>

        {/* Logistics */}
        <div className="bg-card rounded-card border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">Logistics</h2>
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
