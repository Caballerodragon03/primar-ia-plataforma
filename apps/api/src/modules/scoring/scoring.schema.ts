import { z } from 'zod';

export const penaltySchema = z.object({
  delta: z.number().min(-50).max(0),
  motivo: z.string().min(1).max(500),
});

export const incentivoSchema = z.object({
  delta: z.number().min(0).max(25),
  motivo: z.string().min(1).max(500),
});

export type PenaltyInput = z.infer<typeof penaltySchema>;
export type IncentivoInput = z.infer<typeof incentivoSchema>;
