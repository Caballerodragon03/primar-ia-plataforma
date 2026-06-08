import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '@primaria/database';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import {
  upsertSubscription,
  deleteSubscriptionByEndpoint,
  deleteAllSubscriptionsForUser,
  getPushPublicKey,
  getPushStatusForUser,
  sendPushToUser,
} from './push.service.js';

export const pushRouter = Router();

// Public key — el frontend la lee al registrar una subscription.
// SIN auth para que el service worker pueda leerla sin token.
pushRouter.get('/public-key', (_req: Request, res: Response) => {
  const publicKey = getPushPublicKey();
  if (!publicKey) {
    res.status(503).json({ success: false, error: 'Push notifications no configuradas en el servidor' });
    return;
  }
  res.json({ success: true, data: { publicKey } });
});

// El resto requiere autenticación.
pushRouter.use(requireAuth);

pushRouter.get(
  '/status',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const data = await getPushStatusForUser(userId);
    res.json({ success: true, data });
  }),
);

pushRouter.post(
  '/test',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const unreadMessages = await prisma.mensaje.count({
      where: {
        remitenteId: { not: userId },
        leido: false,
        transaccion: {
          OR: [{ vendedorId: userId }, { compradorId: userId }],
          estado: { not: 'CANCELADO' },
        },
      },
    });
    await sendPushToUser(userId, {
      title: 'Primar-IA test',
      body: 'Si ves esto, el push nativo llega a este dispositivo.',
      url: '/debug/pwa-auth',
      tag: `debug-push-${userId}`,
      badgeCount: Math.max(1, unreadMessages),
    });
    res.json({ success: true, data: { attempted: true, badgeCount: Math.max(1, unreadMessages) } });
  }),
);

// Body: { endpoint, keys: { p256dh, auth } } — formato que devuelve
// PushSubscription.toJSON() del navegador.
pushRouter.post(
  '/subscribe',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const body = req.body as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      res.status(400).json({ success: false, error: 'subscription payload inválido' });
      return;
    }
    const userAgent = req.headers['user-agent'] ?? null;
    await upsertSubscription(userId, {
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 500) : null,
    });
    res.json({ success: true });
  }),
);

// Body: { endpoint } — opcional; si no llega, borra TODAS las subs del usuario.
pushRouter.post(
  '/unsubscribe',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const body = req.body as { endpoint?: string };
    if (body?.endpoint) {
      await deleteSubscriptionByEndpoint(body.endpoint);
    } else {
      await deleteAllSubscriptionsForUser(userId);
    }
    res.json({ success: true });
  }),
);
