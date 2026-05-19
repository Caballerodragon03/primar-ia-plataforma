import { z } from 'zod';
import {
  ALL_INCOTERMS,
  ALL_TERMINOS_PAGO,
  isIncotermAllowedForLogistica,
  type Incoterm,
  type LogisticaPreferencia,
} from '@primaria/shared';

// Phase 6 — extended negotiation schema. A proposal may now include any
// subset of: precioKg, incoterm, logistica, terminoPago, calibres.
// At least ONE field is required, and logistica↔incoterm must be consistent
// when both are present.

const calibreSchema = z.object({
  calibre: z.string().min(1),
  cantidad_kg: z.number().positive(),
  // Phase 14G — precio per calibre (opcional). Si se especifica, sobrescribe
  // el precioKg global para ese calibre concreto en el contrato. Si se omite,
  // el calibre hereda el precio global (precioKg de la oferta o el match).
  precio_kg: z.number().positive().optional(),
});

export const createOfertaSchema = z.object({
  precioKg: z.number().positive().optional(),
  incoterm: z.enum(ALL_INCOTERMS as unknown as [Incoterm, ...Incoterm[]]).optional(),
  logistica: z.enum(['YO_ENVIO', 'OTRO_RECOGE', 'INDIFERENTE']).optional(),
  terminoPago: z.enum(ALL_TERMINOS_PAGO as unknown as [string, ...string[]]).optional(),
  calibres: z.array(calibreSchema).min(1).optional(),
  parentId: z.string().optional(),
})
  .refine(
    (d) =>
      d.precioKg !== undefined
      || d.incoterm !== undefined
      || d.logistica !== undefined
      || d.terminoPago !== undefined
      || d.calibres !== undefined,
    { message: 'Debes proponer al menos un cambio (precio, incoterm, logística, término de pago o calibres)' },
  )
  .superRefine((d, ctx) => {
    // Cross-field: incoterm must be compatible with logística if both present.
    // If only one is present, the backend will derive/snap to a coherent pair
    // during acceptOffer, but at proposal time we still enforce consistency
    // for the visible pair.
    if (d.incoterm && d.logistica) {
      if (!isIncotermAllowedForLogistica(d.incoterm as Incoterm, d.logistica as LogisticaPreferencia)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `El incoterm ${d.incoterm} no es compatible con la logística "${d.logistica}".`,
          path: ['incoterm'],
        });
      }
    }
  });

export type CreateOfertaInput = z.infer<typeof createOfertaSchema>;
