/**
 * Detects attempts to bypass the platform (sharing contacts off-platform).
 * Returns true if the message contains bypass-attempt patterns.
 */
const PHONE_REGEX = /(?:\+|00)?[\d\s\-().]{9,}/;
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const MESSAGING_APPS = [
  'whatsapp',
  'telegram',
  'signal',
  'wechat',
  'viber',
  'skype',
  'instagram',
  'facebook',
  'twitter',
  'linkedin',
  'wa\\.me',
  't\\.me',
];
const MESSAGING_REGEX = new RegExp(MESSAGING_APPS.join('|'), 'i');

export function detectarBypass(texto: string): boolean {
  return (
    PHONE_REGEX.test(texto) ||
    EMAIL_REGEX.test(texto) ||
    MESSAGING_REGEX.test(texto)
  );
}

export function sanitizarMensaje(texto: string): {
  sanitized: string;
  bypassDetected: boolean;
} {
  const bypassDetected = detectarBypass(texto);
  return { sanitized: texto.trim(), bypassDetected };
}
