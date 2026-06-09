import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import {
  upsertSubscription,
  deleteSubscriptionByEndpoint,
  deleteAllSubscriptionsForUser,
  getPushPublicKey,
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
