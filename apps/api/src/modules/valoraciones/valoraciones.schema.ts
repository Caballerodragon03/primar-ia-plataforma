import { z } from 'zod';

const starField = z.number().int().min(1).max(5);

export const createValoracionSchema = z.object({
  transaccionId: z.string().min(1),
  destinatarioId: z.string().min(1),
  tipo: z.enum(['VENDEDOR_A_COMPRADOR', 'COMPRADOR_A_VENDEDOR']),
  calidad: starField.optional(),      // only for COMPRADOR_A_VENDEDOR
  empaquetado: starField.optional(),  // only for COMPRADOR_A_VENDEDOR
  puntualidad: starField,
  comunicacion: starField,
  profesionalidad: starField,
  comentario: z.string().max(500).optional(),
});

export type CreateValoracionInput = z.infer<typeof createValoracionSchema>;
