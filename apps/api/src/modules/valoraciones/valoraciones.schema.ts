import { z } from 'zod';

const starField = z.number().int().min(1).max(5);

export const createValoracionSchema = z.object({
  transaccionId: z.string().min(1),
  destinatarioId: z.string().min(1),
  tipo: z.enum(['VENDEDOR_A_COMPRADOR', 'COMPRADOR_A_VENDEDOR']),
  calidad: starField,
  puntualidad: starField,
  comunicacion: starField,
  profesionalidad: starField.optional(),
  empaquetado: starField.optional(),
  comentario: z.string().max(500).optional(),
});

export type CreateValoracionInput = z.infer<typeof createValoracionSchema>;
