/**
 * Phase 11 — Zod schemas for contract endpoints.
 *
 * Backstop for inputs that previously were validated ad-hoc inside the
 * controllers (length checks, type narrowing). Centralising here means
 * we share the rule between the route validateBody middleware and any
 * future TypeScript inference downstream.
 */
import { z } from 'zod';

// Seller signature can be a hand-drawn PNG (base64 dataURL ≈5-50 KB) or a
// short text rubric. Allow up to 200 KB to cover hi-DPI canvas captures.
const sellerSignatureField = z
  .string()
  .min(1, 'Firma vacía')
  .max(200_000, 'Firma demasiado larga');

// Buyer signature still flows through Stripe Checkout metadata (≤500 chars
// per Stripe API), so keep the legacy short-text validation.
const shortSignatureField = z
  .string()
  .min(1, 'Firma vacía')
  .max(500, 'Firma demasiado larga (máx. 500 caracteres)');

export const signSellerSchema = z.object({
  signatureData: sellerSignatureField,
});

export const buyerCheckoutSchema = z.object({
  signatureData: shortSignatureField,
  ack: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar el aviso de firma irrevocable' }),
  }),
});

export const cancelMatchSchema = z.object({
  motivo: z.string()
    .trim()
    .min(5, 'Describe el motivo de la cancelación (≥5 caracteres)')
    .max(500, 'Motivo demasiado largo (máx. 500 caracteres)'),
});

// markShipped + markReceived have no body — but we still want validateBody to
// reject extra fields (defense against confused clients).
export const emptyShippingBodySchema = z.object({}).strict();

// regenerateDraft is also body-less.
export const regenerateDraftSchema = z.object({}).strict();
