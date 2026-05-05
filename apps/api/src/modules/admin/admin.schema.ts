import { z } from 'zod';

export const updateEstadoSchema = z.object({
  estado: z.enum([
    'EMAIL_NO_VERIFICADO',
    'EMAIL_VERIFICADO',
    'PENDIENTE_VERIFICACION',
    'VERIFICADO_ACTIVO',
    'RECHAZADO',
    'PENDIENTE_ACLARACION',
    'SUSPENDIDO',
  ]),
  notasAdmin: z.string().max(1000).optional(),
});

export type UpdateEstadoInput = z.infer<typeof updateEstadoSchema>;
