/**
 * Phase 13 — PII redaction for logs.
 *
 * Wraps an arbitrary value (string, object, anything serializable) and
 * returns a redacted version where PII fields are masked. Use before
 * console.error / console.log of values that might contain user data,
 * especially in production where logs are persisted.
 *
 * Strategy: best-effort regex on strings + recursive on objects/arrays.
 * Not a full DLP system — meant for "don't leak the obvious" in logs.
 */

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const IBAN_RE = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g;
const PHONE_RE = /\b(?:\+?\d{2,3}[\s-]?)?\d{3}[\s-]?\d{3}[\s-]?\d{3,4}\b/g;
// CIF/NIF español: letra + 7-8 dígitos + opcional letra final
const CIF_NIF_RE = /\b[A-HJNPQRSUVW]\d{7}[0-9A-J]\b|\b\d{8}[A-Z]\b/g;

const SENSITIVE_FIELD_KEYS = new Set([
  'email', 'iban', 'swiftBic', 'telefono', 'phone', 'cifNif', 'cif',
  'signatureData', 'firmaVendedor', 'firmaComprador', 'razonSocial',
  'direccionFiscal', 'password', 'passwordHash', 'refreshToken',
  'accessToken', 'stripeChargeId', 'comisionStripeSessionId',
  'remitenteId', 'compradorId', 'vendedorId', // userIds in this app are sensitive PII
]);

function redactString(s: string): string {
  return s
    .replace(EMAIL_RE, '[email-redacted]')
    .replace(IBAN_RE, '[iban-redacted]')
    .replace(CIF_NIF_RE, '[cif-redacted]')
    .replace(PHONE_RE, '[phone-redacted]');
}

/**
 * Recursively redact PII from `value`. Returns a new value (does not mutate).
 *
 * - strings: regex-replace common PII patterns
 * - objects: redact known-sensitive keys to `[redacted]`, recurse on rest
 * - arrays: recurse element-wise
 * - other primitives: passthrough
 */
export function redactPII(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redactPII(v));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_FIELD_KEYS.has(k)) {
      out[k] = '[redacted]';
    } else if (typeof v === 'string') {
      out[k] = redactString(v);
    } else {
      out[k] = redactPII(v);
    }
  }
  return out;
}

/**
 * Convenience: stringify for logs with PII redaction applied.
 */
export function redactedJSON(value: unknown): string {
  try {
    return JSON.stringify(redactPII(value));
  } catch {
    return '[unstringifiable]';
  }
}
