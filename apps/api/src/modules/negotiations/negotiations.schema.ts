import { z } from 'zod';

const INCOTERMS = ['EXW', 'FCA', 'FOB', 'CIF', 'DAP', 'DDP', 'FAS', 'CFR', 'CPT', 'CIP'] as const;

export const createOfertaSchema = z.object({
  precioKg: z.number().positive().optional(),
  incoterm: z.enum(INCOTERMS).optional(),
  parentId: z.string().optional(),
}).refine((d) => d.precioKg !== undefined || d.incoterm !== undefined, {
  message: 'Debes proponer al menos un cambio: precio o incoterm',
});

export type CreateOfertaInput = z.infer<typeof createOfertaSchema>;
