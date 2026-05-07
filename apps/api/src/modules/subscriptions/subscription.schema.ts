import { z } from 'zod';

export const checkoutSchema = z.object({
  plan: z.enum(['CAMPO', 'FINCA', 'LONJA', 'CENTRAL']),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
