import { z } from 'zod';

// Only http(s) schemes are accepted to prevent stored XSS via javascript:
// or data: URIs that would otherwise pass `z.string().url()` validation
// and be rendered as <img src> in the admin console.
const httpUrl = z
  .string()
  .url()
  .refine(
    (u) => {
      try {
        const proto = new URL(u).protocol;
        return proto === 'http:' || proto === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Solo se permiten URLs http(s)' },
  );

export const createBugReportSchema = z.object({
  descripcion: z.string().min(5, 'Describe el problema (mín. 5 caracteres)').max(5000),
  url: z.string().max(2000).optional(),
  capturaUrl: httpUrl.optional(),
  userAgent: z.string().max(500).optional(),
});

export const updateBugReportSchema = z.object({
  estado: z.enum(['NUEVO', 'EN_PROGRESO', 'RESUELTO', 'DESCARTADO']).optional(),
  adminNotas: z.string().max(5000).optional(),
});

export type CreateBugReportInput = z.infer<typeof createBugReportSchema>;
export type UpdateBugReportInput = z.infer<typeof updateBugReportSchema>;
