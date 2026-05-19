/**
 * Phase 12 — Shared types for the anti-bypass admin tab.
 *
 * Used by both API (apps/api/src/modules/bypass/*) and the web admin UI
 * (apps/web/app/admin/risks/page.tsx) so they can't drift.
 */

export type BypassPatron =
  | 'phone'
  | 'email'
  | 'messaging'
  | 'location'
  | 'offer_off_platform'
  | 'other';

export type BypassAlertEstado = 'PENDIENTE' | 'AVISADO' | 'BANEADO' | 'DESCARTADO';

export const BYPASS_PATRONES: ReadonlyArray<BypassPatron> = [
  'phone', 'email', 'messaging', 'location', 'offer_off_platform', 'other',
];

export const BYPASS_PATRON_LABELS_ES: Record<BypassPatron, string> = {
  phone: 'Teléfono',
  email: 'Email',
  messaging: 'Mensajería',
  location: 'Reunión presencial',
  offer_off_platform: 'Cierre fuera de plataforma',
  other: 'Otro',
};
