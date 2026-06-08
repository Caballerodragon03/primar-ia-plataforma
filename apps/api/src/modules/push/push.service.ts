/**
 * Phase 18 — Web Push service.
 *
 * Centraliza el envío de notificaciones push a usuarios suscritos via
 * el estándar Web Push (VAPID). Los disparadores viven en los servicios
 * de dominio (chat, contracts, matching, etc.) y llaman a
 * `sendPushToUser` cuando ocurre un evento relevante.
 *
 * Convenciones:
 *   - Si no hay VAPID keys configuradas → no-op silencioso (en dev
 *     local sin keys, los servicios siguen funcionando).
 *   - Si una subscription devuelve 410/404 → la borramos (caducada).
 *   - Otros errores se loguean pero NO se propagan: un fallo de push
 *     no debe tumbar la transacción que disparó el evento.
 */
import webpush from 'web-push';
import { prisma } from '@primaria/database';
import { env } from '../../config/env.js';

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  if (!env.PUSH_VAPID_PUBLIC_KEY || !env.PUSH_VAPID_PRIVATE_KEY) {
    return false;
  }
  webpush.setVapidDetails(
    env.PUSH_VAPID_SUBJECT,
    env.PUSH_VAPID_PUBLIC_KEY,
    env.PUSH_VAPID_PRIVATE_KEY,
  );
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Ruta in-app a la que se navega al pulsar la notif. */
  url?: string;
  /** Agrupador (mismo tag → la nueva reemplaza la vieja). Ej:
   *  `chat-<matchId>` para colapsar múltiples mensajes del mismo chat. */
  tag?: string;
  /** Icono opcional. Por defecto el logo de la PWA. */
  icon?: string;
}

/**
 * Envía un push a TODAS las subscriptions del usuario (varios
 * dispositivos/navegadores). Idempotente respecto al usuario; cada
 * subscription se procesa por separado. Errores se loguean, no se
 * propagan.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const json = JSON.stringify(payload);
  const expiredIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          json,
          { TTL: 60 * 60 * 24 }, // 24h de validez si el dispositivo está offline
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Suscripción caducada/expirada → limpiar.
          expiredIds.push(sub.id);
        } else {
          console.warn('[push] sendNotification failed', {
            endpoint: sub.endpoint.slice(0, 40) + '…',
            statusCode,
            err: (err as Error)?.message,
          });
        }
      }
    }),
  );

  if (expiredIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expiredIds } } }).catch(() => {});
  }
}

/** Guarda o actualiza una subscription (upsert por endpoint). */
export async function upsertSubscription(
  userId: string,
  data: { endpoint: string; p256dh: string; auth: string; userAgent?: string | null },
): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    create: {
      userId,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
      userAgent: data.userAgent ?? null,
    },
    update: {
      userId, // si la subscription se traslada a otro user (raro), re-asignamos
      p256dh: data.p256dh,
      auth: data.auth,
      userAgent: data.userAgent ?? null,
    },
  });
}

/** Elimina una subscription por endpoint (logout, "no me notifiques más en este dispositivo"). */
export async function deleteSubscriptionByEndpoint(endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

/** Borra todas las subscriptions de un usuario (logout completo). */
export async function deleteAllSubscriptionsForUser(userId: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { userId } });
}

export function getPushPublicKey(): string {
  return env.PUSH_VAPID_PUBLIC_KEY ?? '';
}
