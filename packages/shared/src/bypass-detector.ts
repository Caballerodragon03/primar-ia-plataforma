/**
 * Detects attempts to bypass the platform (sharing contacts off-platform).
 * Returns true if the message contains bypass-attempt patterns.
 *
 * IMPORTANT: detectarBypass uses *global* flag regexes via .test() — we
 * recreate the regex objects inside sanitizarMensaje below (without the
 * global state) so the redaction is deterministic. Do not share `g` regex
 * instances between detectarBypass and sanitizarMensaje or .test()/.replace()
 * will leak `lastIndex` between calls.
 */
const PHONE_REGEX = /(?:\+|00)?[\d][\d\s\-().]{8,}/;
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

/**
 * Actually redacts the offending tokens. Previously this was a no-op
 * (only trimmed whitespace) which meant the recipient saw the original
 * phone/email even though the UI told the sender "Message sanitized".
 *
 * Strategy:
 * - Replace phone-like runs with [contacto oculto].
 * - Replace emails with [email oculto].
 * - Replace messaging app names with [app externa].
 *
 * We use fresh global regexes (no shared state with the detection
 * versions above) and apply replacements in this order: messaging app
 * names first (shortest-match), then emails (so the @local part isn't
 * partially eaten by the phone regex), then phones.
 */
const PHONE_REGEX_G = /(?:\+|00)?[\d][\d\s\-().]{8,}/g;
const EMAIL_REGEX_G = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const MESSAGING_REGEX_G = new RegExp(MESSAGING_APPS.join('|'), 'gi');

export function sanitizarMensaje(texto: string): {
  sanitized: string;
  bypassDetected: boolean;
} {
  const bypassDetected = detectarBypass(texto);
  if (!bypassDetected) {
    return { sanitized: texto.trim(), bypassDetected };
  }
  const sanitized = texto
    .replace(MESSAGING_REGEX_G, '[app externa]')
    .replace(EMAIL_REGEX_G, '[email oculto]')
    .replace(PHONE_REGEX_G, '[contacto oculto]')
    .trim();
  return { sanitized, bypassDetected };
}
