import { z } from 'zod';

export const createDisputaSchema = z.object({
  tipoProblema: z.enum([
    'CALIDAD',
    'CANTIDAD',
    'EMPAQUETADO',
    'CALIBRES',
    'PRODUCTO_DIFERENTE',
    'OTRO',
  ]),
  descripcion: z.string().min(20).max(2000),
  evidenciasUrls: z.array(z.string().url()).max(6),
});

export type CreateDisputaInput = z.infer<typeof createDisputaSchema>;

export const respuestaVendedorSchema = z.object({
  respuesta: z.string().min(10).max(2000),
  evidenciasUrls: z.array(z.string().url()).max(6).optional(),
});

export type RespuestaVendedorInput = z.infer<typeof respuestaVendedorSchema>;

export const resolverDisputaSchema = z.object({
  resolucion: z.enum([
    'FAVOR_COMPRADOR',
    'FAVOR_VENDEDOR',
    'PARCIAL',
    'ACUERDO_PARTES',
  ]),
  porcentajeComprador: z.number().min(0).max(100),
  notasAdmin: z.string().optional(),
});

export type ResolverDisputaInput = z.infer<typeof resolverDisputaSchema>;
