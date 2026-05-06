import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(12, 'Minimo 12 caracteres'),
  telefono: z.string().optional(),
  idioma: z.enum(['ES', 'EN']).default('ES'),
  role: z.enum(['VENDEDOR', 'COMPRADOR']),
  // Company details
  razonSocial: z.string().min(2),
  cifNif: z.string().transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '')).pipe(z.string().regex(/^[A-Z0-9]{9}$/, 'CIF/NIF invalido — debe tener exactamente 9 caracteres alfanuméricos')),
  formaJuridica: z.string().optional(),
  direccionFiscal: z.string().min(5),
  ciudad: z.string().optional(),
  codigoPostal: z.string().optional(),
  pais: z.string().default('ES'),
  personaContactoLegal: z.string().min(2),
  cargoContactoLegal: z.string().min(2),
  nombre: z.string().min(1),
  apellidos: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
