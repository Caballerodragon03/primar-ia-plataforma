import { z } from 'zod';
import { ALL_INCOTERMS, ALL_TERMINOS_PAGO, validateLogisticaIncoterms } from '@primaria/shared';

const calibreItemSchema = z.object({
  calibre: z.string().min(1),
  cantidad_kg: z.number().positive(),
  precio_min_kg: z.number().min(0).default(0),
});

const incotermEnum = z.enum(ALL_INCOTERMS as unknown as [string, ...string[]]);
const terminoPagoEnum = z.enum(ALL_TERMINOS_PAGO as unknown as [string, ...string[]]);
const logisticaEnum = z.enum(['YO_ENVIO', 'OTRO_RECOGE', 'INDIFERENTE']);

export const createLotSchema = z.object({
  productoId: z.string().cuid(),
  variedadId: z.string().cuid().optional(),
  tipo: z.enum(['VENTA_DIRECTA', 'SUBASTA']).default('VENTA_DIRECTA'),
  calibres: z.array(calibreItemSchema).min(1),
  datosHistoricos: z.any().optional(),
  direccionRecogida: z.string().min(5),
  coordenadasLat: z.number().optional(),
  coordenadasLng: z.number().optional(),
  fechaDisponibilidad: z.string().datetime(),
  fechaFinDisponibilidad: z.string().datetime().optional(),
  certificaciones: z.array(z.string()).optional(),
  fotosUrls: z.array(z.string().url()).optional(),
  comentariosAdicionales: z.string().max(1000).optional(),
  publicar: z.boolean().default(false),
  // Phase 2 — logística + incoterms + términos de pago
  logistica: logisticaEnum.default('INDIFERENTE'),
  // Multi-select. Si está vacío el vendedor "acepta todos los compatibles".
  // En la práctica la UI siempre manda al menos uno.
  incotermsAceptados: z.array(incotermEnum).default([]),
  // Multi-select. Default = ['INMEDIATO'] si se omite.
  terminosPagoAceptados: z.array(terminoPagoEnum).min(1).default(['INMEDIATO']),
}).superRefine((data, ctx) => {
  // Si el vendedor envía a publicar (estado ACTIVO), incoterms y logística
  // deben ser coherentes. Borradores se permiten incompletos.
  if (!data.publicar) return;
  const errs = validateLogisticaIncoterms(data.logistica, data.incotermsAceptados);
  for (const msg of errs) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['incotermsAceptados'], message: msg });
  }
});

export type CreateLotInput = z.infer<typeof createLotSchema>;
// Use the inner ZodObject for .partial() because ZodEffects doesn't have .partial.
const createLotBaseSchema = z.object({
  productoId: z.string().cuid(),
  variedadId: z.string().cuid().optional(),
  tipo: z.enum(['VENTA_DIRECTA', 'SUBASTA']).default('VENTA_DIRECTA'),
  calibres: z.array(calibreItemSchema).min(1),
  datosHistoricos: z.any().optional(),
  direccionRecogida: z.string().min(5),
  coordenadasLat: z.number().optional(),
  coordenadasLng: z.number().optional(),
  fechaDisponibilidad: z.string().datetime(),
  fechaFinDisponibilidad: z.string().datetime().optional(),
  certificaciones: z.array(z.string()).optional(),
  fotosUrls: z.array(z.string().url()).optional(),
  comentariosAdicionales: z.string().max(1000).optional(),
  publicar: z.boolean().default(false),
  logistica: logisticaEnum.default('INDIFERENTE'),
  incotermsAceptados: z.array(incotermEnum).default([]),
  terminosPagoAceptados: z.array(terminoPagoEnum).min(1).default(['INMEDIATO']),
});
export const updateLotSchema = createLotBaseSchema.partial();
export type UpdateLotInput = z.infer<typeof updateLotSchema>;
