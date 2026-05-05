import { z } from 'zod';

const calibreItemSchema = z.object({
  calibre: z.string().min(1),
  cantidad_kg: z.number().positive(),
  precio_min_kg: z.number().positive(),
});

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
  certificaciones: z.array(z.string()).optional(),
  fotosUrls: z.array(z.string().url()).optional(),
  comentariosAdicionales: z.string().max(1000).optional(),
  publicar: z.boolean().default(false),
});

export type CreateLotInput = z.infer<typeof createLotSchema>;
export const updateLotSchema = createLotSchema.partial();
export type UpdateLotInput = z.infer<typeof updateLotSchema>;
