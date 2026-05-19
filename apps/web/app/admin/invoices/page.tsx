'use client';

/**
 * Phase 13 — Pantalla legacy retirada.
 *
 * El módulo de facturación v1 (apps/api/src/modules/invoices/invoice.service.ts)
 * tenía un IVA hardcoded al 10% que es incorrecto para productos
 * agroalimentarios. Las facturas v2 (Fase 5) reemplazan esa lógica con
 * cálculo correcto por régimen fiscal del vendedor y se generan
 * automáticamente al firmar el contrato.
 *
 * Esta pantalla queda como redirect informativo en lugar de migrar la
 * lógica vieja (cuyos datos ya no se generan en el flujo actual).
 */
import { Receipt, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function AdminInvoicesLegacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
          <Receipt className="w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Facturas (legacy retirado)</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-card p-5 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Este listado ha sido retirado</p>
            <p className="text-xs text-amber-800 mt-1">
              El módulo de facturación v1 usaba un IVA fijo del 10% que es
              incorrecto para productos agroalimentarios. Desde Fase 5, las
              facturas se generan automáticamente al firmar cada contrato
              con el régimen fiscal correcto del vendedor (general 4%,
              REAGP 12%, recargo de equivalencia, intracomunitario exento).
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">¿Qué buscas?</h2>
        <ul className="text-xs text-text-secondary space-y-2">
          <li>
            <strong className="text-foreground">Ver facturas individuales:</strong>{' '}
            cada parte descarga sus facturas desde la pantalla del contrato
            (botón &laquo;Descargar facturas&raquo; cuando contratoEstado=FIRMADO).
          </li>
          <li>
            <strong className="text-foreground">Regenerar una factura tras un fallo asíncrono:</strong>{' '}
            usa el endpoint <code className="text-[11px] bg-muted px-1 rounded">POST /admin/maintenance/regenerate-invoices/:matchId</code>.
          </li>
          <li>
            <strong className="text-foreground">Auditar la cola de reembolsos pendientes</strong>{' '}
            (webhooks llegados tras caducidad / revert de negociación): se
            registran en la tabla <code className="text-[11px] bg-muted px-1 rounded">pending_refunds</code>.
          </li>
        </ul>
        <div className="pt-2 border-t border-border">
          <Link href="/admin/dashboard" className="text-xs text-primary-dark hover:underline">
            ← Volver al panel
          </Link>
        </div>
      </div>
    </div>
  );
}
