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

export const resolverDisputaAdminSchema = z.object({
  resolucion: z.enum(['FAVOR_COMPRADOR', 'FAVOR_VENDEDOR', 'PARCIAL', 'ACUERDO_PARTES']),
  porcentajeComprador: z.number().min(0).max(100),
  notasAdmin: z.string().optional(),
  penalizacionComprador: z.number().min(-50).max(0).optional(),
  penalizacionVendedor: z.number().min(-50).max(0).optional(),
  incentivoComprador: z.number().min(0).max(25).optional(),
  incentivoVendedor: z.number().min(0).max(25).optional(),
  suscripcionGratisUserId: z.string().optional(),
  banearComprador: z.boolean().optional(),
  banearVendedor: z.boolean().optional(),
});

export type ResolverDisputaAdminInput = z.infer<typeof resolverDisputaAdminSchema>;

export const sendDisputaMensajeSchema = z.object({
  contenido: z.string().min(1).max(2000),
  archivoUrl: z.string().url().optional(),
});

export type SendDisputaMensajeInput = z.infer<typeof sendDisputaMensajeSchema>;
