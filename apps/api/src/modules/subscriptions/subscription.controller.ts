import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from './subscription.service.js';
import { PLAN_LIMITS, VENDEDOR_PLANS, COMPRADOR_PLANS } from './subscription.constants.js';
import type { CheckoutInput } from './subscription.schema.js';

export class SubscriptionController {
  async getPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = req.user!.role;
      const planKeys = role === 'VENDEDOR' ? VENDEDOR_PLANS : COMPRADOR_PLANS;
      const plans = planKeys.map((key) => ({
        id: key,
        ...PLAN_LIMITS[key],
      }));

      res.json({ success: true, data: plans });
    } catch (err) {
      next(err);
    }
  }

  async getCurrent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub as string;
      const { plan, limits } = await subscriptionService.getLimitsForUser(userId);
      const hasActiveSubscription = await subscriptionService.hasActiveSubscription(userId);

      res.json({ success: true, data: { plan, badge: limits.badge, hasActiveSubscription } });
    } catch (err) {
      next(err);
    }
  }

  async checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub;
      const { plan } = req.body as CheckoutInput;
      const url = await subscriptionService.createCheckoutSession(userId, plan);

      res.json({ success: true, data: { url } });
    } catch (err) {
      next(err);
    }
  }

  async portal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub;
      const url = await subscriptionService.createCustomerPortalSession(userId);

      res.json({ success: true, data: { url } });
    } catch (err) {
      next(err);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub;
      await subscriptionService.cancelSubscription(userId);

      res.json({ success: true, message: 'Suscripcion cancelada. Mantendras el acceso hasta el fin del periodo.' });
    } catch (err) {
      next(err);
    }
  }

  async getUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub;
      const [usage, credits] = await Promise.all([
        subscriptionService.getUsage(userId),
        subscriptionService.getCredits(userId),
      ]);

      res.json({ success: true, data: { ...usage, credits } });
    } catch (err) {
      next(err);
    }
  }

  async getCredits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub;
      const credits = await subscriptionService.getCredits(userId);
      res.json({ success: true, data: credits });
    } catch (err) {
      next(err);
    }
  }

  // Frontend calls this immediately after Stripe redirects back with
  // ?success=true&session_id=… so the new plan reflects without waiting
  // for the webhook. See SubscriptionService.reconcileFromCheckoutSession
  // for the IDOR guard.
  async reconcileCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub as string;
      const sessionId = typeof req.body?.sessionId === 'string'
        ? req.body.sessionId
        : (typeof req.query['session_id'] === 'string' ? (req.query['session_id'] as string) : '');
      const result = await subscriptionService.reconcileFromCheckoutSession(userId, sessionId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const subscriptionController = new SubscriptionController();
