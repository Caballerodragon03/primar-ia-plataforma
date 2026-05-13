import { z } from 'zod';

// Only http(s) schemes are accepted to prevent stored XSS via javascript:
// or data: URIs that would otherwise pass `z.string().url()` validation
// and be rendered as <img src> / <a href> in the admin console.
const httpUrl = (maxLen: number) =>
  z
    .string()
    .max(maxLen)
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
  // url is the page URL where the bug was observed — same http(s) refine as
  // capturaUrl so it can't be rendered as a clickable javascript: link in
  // the admin console.
  url: httpUrl(2000).optional(),
  capturaUrl: httpUrl(2048).optional(),
  userAgent: z.string().max(500).optional(),
});

export const updateBugReportSchema = z.object({
  estado: z.enum(['NUEVO', 'EN_PROGRESO', 'RESUELTO', 'DESCARTADO']).optional(),
  adminNotas: z.string().max(5000).optional(),
});

export type CreateBugReportInput = z.infer<typeof createBugReportSchema>;
export type UpdateBugReportInput = z.infer<typeof updateBugReportSchema>;
