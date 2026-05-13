import { z } from 'zod';

export const createBugReportSchema = z.object({
  descripcion: z.string().min(5, 'Describe el problema (mín. 5 caracteres)').max(5000),
  url: z.string().max(2000).optional(),
  capturaUrl: z.string().url().optional(),
  userAgent: z.string().max(500).optional(),
});

export const updateBugReportSchema = z.object({
  estado: z.enum(['NUEVO', 'EN_PROGRESO', 'RESUELTO', 'DESCARTADO']).optional(),
  adminNotas: z.string().max(5000).optional(),
});

export type CreateBugReportInput = z.infer<typeof createBugReportSchema>;
export type UpdateBugReportInput = z.infer<typeof updateBugReportSchema>;
