import { z } from 'zod';

const calibreSolicitadoSchema = z.object({
  calibre: z.string().min(1),
  cantidad_kg: z.number().positive(),
  precio_max_kg: z.number().positive(),
});

const incotermValues = ['EXW','FCA','FOB','CIF','DAP','DDP','FAS','CFR','CPT','CIP','DAT','DPU'] as const;

export const createOrderSchema = z.object({
  productoId: z.string().cuid(),
  variedadId: z.string().cuid().optional(),
  calibresSolicitados: z.array(calibreSolicitadoSchema).min(1),
  incoterm: z.enum(incotermValues),
  destinoFinal: z.string().min(2).optional(),
  frecuencia: z.string().optional(),
  transporte: z.string().optional(),
  costoLogisticaEstimado: z.number().nonnegative().optional(),
  fechaEntregaDeseada: z.string().datetime(),
  notasAdicionales: z.string().max(1000).optional(),
  publicar: z.boolean().default(false),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export const updateOrderSchema = createOrderSchema.partial();
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
