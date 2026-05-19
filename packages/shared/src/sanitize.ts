/**
 * Shared input-sanitization helpers.
 *
 * Used at the edge of user-provided data that will be persisted to the DB,
 * rendered in PDFs, or logged. Conservative — strips characters that have
 * no legitimate use in business text.
 */

/**
 * Removes ASCII control chars (0x00-0x1F + 0x7F) and zero-width Unicode
 * characters that could be used for spoofing or PDF rendering issues. Keeps
 * common whitespace (\n, \r, \t) intact.
 *
 * Use for text that will appear in a contract PDF or invoice (signature
 * data, reasons, comments).
 */
export function sanitizeBusinessText(input: string): string {
  return input
    // 1) Normalize Unicode (fold lookalikes to canonical form).
    .normalize('NFKC')
    // 2) Strip ASCII control chars EXCEPT \t (\x09), \n (\x0A), \r (\x0D).
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // 3) Strip zero-width chars commonly used to bypass filters.
    .replace(/[​-‍﻿⁠]/g, '');
}

/**
 * Sanitizes a signature value (text rubric or base64 PNG dataURL header).
 * Applies sanitizeBusinessText + length cap (caller controls max).
 */
export function sanitizeSignature(input: string, maxLen: number): string {
  return sanitizeBusinessText(input).slice(0, maxLen).trim();
}
