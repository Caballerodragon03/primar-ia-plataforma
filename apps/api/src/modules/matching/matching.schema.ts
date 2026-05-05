import { z } from 'zod';

export const contributeSchema = z.object({
  calibresContribucion: z
    .array(
      z.object({
        calibre: z.string().min(1),
        cantidad_kg: z.number().positive(),
        incoterm: z.string().optional(), // buyer sets incoterm on the order; optional here
      })
    )
    .min(1, 'Debe indicar al menos un calibre'),
});

export type ContributeInput = z.infer<typeof contributeSchema>;
