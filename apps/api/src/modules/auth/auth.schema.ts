import { z } from 'zod';

// IBAN ES validator: ES + 2 control + 4 entity + 4 branch + 2 DC + 10 acct = 24 chars
// Accept any IBAN format (Spain plus EU) — normalize whitespace + uppercase.
const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/;

export const registerSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(12, 'Minimo 12 caracteres'),
  telefono: z.string().optional(),
  idioma: z.enum(['ES', 'EN']).default('ES'),
  role: z.enum(['VENDEDOR', 'COMPRADOR']),
  // Company details
  razonSocial: z.string().min(2),
  // Tax ID: acepta CIF/NIF español + VAT IDs internacionales (DE, FR, IT, UK,
  // etc.). Normalizamos a mayúsculas y eliminamos espacios/guiones. 4-20
  // caracteres alfanuméricos para cubrir todos los formatos UE + terceros.
  cifNif: z.string().transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '')).pipe(z.string().regex(/^[A-Z0-9]{4,20}$/, 'Tax ID inválido — 4 a 20 caracteres alfanuméricos')),
  formaJuridica: z.string().optional(),
  direccionFiscal: z.string().min(5),
  ciudad: z.string().optional(),
  codigoPostal: z.string().optional(),
  pais: z.string().default('ES'),
  personaContactoLegal: z.string().min(2),
  cargoContactoLegal: z.string().min(2),
  nombre: z.string().min(1),
  apellidos: z.string().min(1),
  // Datos bancarios y fiscales — solo OBLIGATORIOS para vendedores (los
  // compradores los pagan por transferencia al IBAN del vendedor). Validamos
  // en el servicio en función del rol.
  iban: z.string().trim().transform((v) => v.toUpperCase().replace(/\s+/g, '')).pipe(
    z.string().regex(ibanRegex, 'IBAN inválido — acepta cualquier IBAN internacional (ES, DE, FR, IT, GB, NL…)')
  ).optional(),
  swiftBic: z.string().optional(),
  regimenFiscal: z.enum(['GENERAL', 'AGRARIO', 'RECARGO_EQUIVALENCIA', 'EXENTO']).optional(),
}).superRefine((data, ctx) => {
  // Vendedores deben proveer IBAN al registrarse — sin IBAN no se les puede
  // emitir factura ni el comprador puede pagarles.
  if (data.role === 'VENDEDOR') {
    if (!data.iban) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['iban'],
        message: 'El IBAN es obligatorio para vendedores (necesario para emitir facturas y recibir pagos)',
      });
    }
    if (!data.regimenFiscal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['regimenFiscal'],
        message: 'Selecciona el régimen fiscal aplicable a tu actividad',
      });
    }
  }
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(12, 'Minimo 12 caracteres'),
});

// NOTE: legal/fiscal data (IBAN, swiftBic, regimenFiscal, CIF, razón social,
// dirección fiscal) are deliberately NOT in this schema. They are entered
// once at registration and can only be modified by an ADMIN via the admin
// users endpoint, to prevent fraud (changing IBAN to redirect payments) and
// tax-compliance issues. Users must contact us to change them.
export const updateProfileSchema = z.object({
  telefono: z.string().optional(),
  idiomaPreferido: z.enum(['ES', 'EN']).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(12, 'Minimo 12 caracteres').optional(),
  preferenciasIncoterm: z.object({
    recommended: z.string(),
    selected: z.array(z.string()),
    done: z.boolean().optional(),
  }).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
