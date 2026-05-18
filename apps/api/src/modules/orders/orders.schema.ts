import { z } from 'zod';
import { ALL_INCOTERMS, ALL_TERMINOS_PAGO, validateLogisticaIncoterms } from '@primaria/shared';

const calibreSolicitadoSchema = z.object({
  calibre: z.string().min(1),
  cantidad_kg: z.number().positive(),
  precio_max_kg: z.number().positive(),
});

const incotermValues = ['EXW','FCA','FOB','CIF','DAP','DDP','FAS','CFR','CPT','CIP','DAT','DPU'] as const;
const terminoPagoEnum = z.enum(ALL_TERMINOS_PAGO as unknown as [string, ...string[]]);
const logisticaEnum = z.enum(['YO_ENVIO', 'OTRO_RECOGE', 'INDIFERENTE']);

const baseOrderShape = {
  productoId: z.string().cuid(),
  variedadId: z.string().cuid().optional(),
  calibresSolicitados: z.array(calibreSolicitadoSchema).min(1),
  // Legacy single incoterm kept for backwards-compat — newer flows use
  // incotermsAceptados[]. If both are provided, the array takes precedence.
  incoterm: z.enum(incotermValues),
  destinoFinal: z.string().min(2).optional(),
  frecuencia: z.string().optional(),
  transporte: z.string().optional(),
  costoLogisticaEstimado: z.number().nonnegative().optional(),
  fechaEntregaDeseada: z.string().datetime(),
  notasAdicionales: z.string().max(1000).optional(),
  publicar: z.boolean().default(false),
  // Phase 2 — multi-select preferences. The buyer can accept several
  // incoterms / payment terms. Matching uses the intersection with the seller's.
  logistica: logisticaEnum.default('INDIFERENTE'),
  incotermsAceptados: z.array(z.enum(ALL_INCOTERMS as unknown as [string, ...string[]])).default([]),
  terminosPagoAceptados: z.array(terminoPagoEnum).min(1).default(['INMEDIATO']),
};

export const createOrderSchema = z.object(baseOrderShape).superRefine((data, ctx) => {
  if (!data.publicar) return;
  // Si publican, el legacy `incoterm` debe estar contemplado en la lista de
  // incoterms aceptados (o la lista debe estar vacía = "todos compatibles").
  const accepted = data.incotermsAceptados.length > 0
    ? data.incotermsAceptados
    : [data.incoterm];
  const errs = validateLogisticaIncoterms(data.logistica, accepted);
  for (const msg of errs) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['incotermsAceptados'], message: msg });
  }
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

const createOrderBaseSchema = z.object(baseOrderShape);
export const updateOrderSchema = createOrderBaseSchema.partial();
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
