import { z } from 'zod';

export const uploadHistorialSchema = z.object({
  productoId: z.string().min(1),
  variedadId: z.string().optional(),
  temporada: z.string().regex(/^\d{4}-\d{4}$/, 'Formato: 2024-2025'),
  calibres: z.array(z.object({
    calibre: z.string().min(1),
    cantidadKg: z.number().positive(),
  })).min(1),
});

export type UploadHistorialInput = z.infer<typeof uploadHistorialSchema>;

export const calculateEstimationSchema = z.object({
  productoId: z.string().min(1),
  variedadId: z.string().optional(),
});

export type CalculateEstimationInput = z.infer<typeof calculateEstimationSchema>;
