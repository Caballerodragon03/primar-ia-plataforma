import { z } from 'zod';

export const sendMessageSchema = z.object({
  contenido: z.string().min(1).max(2000),
  tipo: z.enum(['TEXTO', 'IMAGEN', 'DOCUMENTO']).default('TEXTO'),
  archivoUrl: z.string().url().refine(url => {
    try {
      const u = new URL(url);
      return u.protocol === 'https:';
    } catch { return false; }
  }, { message: 'Solo se permiten URLs HTTPS' }).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const markReadSchema = z.object({
  mensajeIds: z.array(z.string()).max(100),
});

export type MarkReadInput = z.infer<typeof markReadSchema>;
