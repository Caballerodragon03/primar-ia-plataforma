'use client';

/**
 * Phase 14M v3.33 — Banner que aparece en /seller/lots/new y
 * /buyer/orders/new cuando el usuario está creando una entidad con el
 * mismo producto + variedad de otra ya activa. Sugiere editar la
 * existente en lugar de crear un duplicado.
 *
 * El usuario puede:
 *   - Pinchar "Editar el lote/pedido" → redirect a la página de edición.
 *   - Pinchar "Crear nuevo de todas formas" → oculta el banner y deja
 *     seguir con el form.
 *
 * Genérico: sirve para lotes y pedidos cambiando los labels via props.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertCircle, Edit2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from './Button';

interface ExistingEntity {
  id: string;
  producto: string;
  variedad: string | null;
  estado: string;
  totalKg: number;
  coverage: number;
}

interface Props {
  // 'lot' | 'order' decide la URL del endpoint y de la edición.
  kind: 'lot' | 'order';
  productoId: string | undefined;
  // Pasamos el variedadId tal cual viene del form; el backend interpreta
  // null/empty como "cualquier variedad".
  variedadId: string | undefined;
}

export function ExistingEntityBanner({ kind, productoId, variedadId }: Props) {
  const [items, setItems] = useState<ExistingEntity[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
    if (!productoId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const endpoint = kind === 'lot'
          ? '/lots/existing-by-product'
          : '/orders/existing-by-product';
        const params: Record<string, string> = { productoId };
        // Solo pasamos variedadId si es un id real (no el sentinel
        // __other__ que usan los forms para "Otra variedad").
        if (variedadId && variedadId !== '__other__' && variedadId !== '') {
          params['variedadId'] = variedadId;
        }
        const { data } = await api.get(endpoint, { params });
        if (cancelled) return;
        setItems(data?.data ?? []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => { cancelled = true; };
  }, [kind, productoId, variedadId]);

  if (dismissed || items.length === 0) return null;

  const labels = kind === 'lot'
    ? {
        title: items.length === 1 ? 'Ya tienes un lote activo con este producto' : `Ya tienes ${items.length} lotes activos con este producto`,
        editVerb: 'Editar el lote',
        dismiss: 'Crear lote nuevo de todas formas',
        editPath: (id: string) => `/seller/lots/${id}/edit`,
      }
    : {
        title: items.length === 1 ? 'Ya tienes un pedido activo con este producto' : `Ya tienes ${items.length} pedidos activos con este producto`,
        editVerb: 'Editar el pedido',
        dismiss: 'Crear pedido nuevo de todas formas',
        editPath: (id: string) => `/buyer/orders/${id}/edit`,
      };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-yellow-900">{labels.title}</p>
          <p className="text-xs text-yellow-700 mt-0.5">
            Suele ser mejor editarlos para añadir más cantidad o calibres en lugar de crear duplicados (los compradores los verán todos juntos y se reparten entre todos).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-yellow-600 hover:text-yellow-900 shrink-0"
          aria-label="Descartar recomendación"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <ul className="space-y-2 pl-8">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between gap-3 bg-card border border-yellow-200 rounded-input px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                #{it.id.slice(-6).toUpperCase()} · {it.producto}
                {it.variedad && <span className="text-text-secondary"> — {it.variedad}</span>}
              </p>
              <p className="text-[11px] text-text-secondary">
                {it.totalKg.toLocaleString('es-ES')} kg · cobertura {Math.round(it.coverage)}%
              </p>
            </div>
            <Link href={labels.editPath(it.id)} className="shrink-0">
              <Button variant="primary" size="sm" className="flex items-center gap-1">
                <Edit2 className="w-3.5 h-3.5" />
                {labels.editVerb}
              </Button>
            </Link>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-xs text-yellow-800 hover:underline ml-8"
      >
        {labels.dismiss} →
      </button>
    </div>
  );
}
