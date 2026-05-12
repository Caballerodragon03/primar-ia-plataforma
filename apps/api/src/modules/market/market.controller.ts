import type { Request, Response, NextFunction } from 'express';
import { marketService } from './market.service.js';
import { subscriptionService } from '../subscriptions/subscription.service.js';
import { AppError } from '../../middleware/error.middleware.js';

export class MarketController {
  // Public: average prices summary
  async getPrices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const daysParam = req.query['days'];
      const days = typeof daysParam === 'string' ? Math.min(365, Math.max(7, parseInt(daysParam, 10) || 30)) : 30;
      const prices = await marketService.getAveragePrices(days);
      res.json({ success: true, data: { prices, windowDays: days } });
    } catch (err) {
      next(err);
    }
  }

  // Public: latest sentiment report
  async getSentiment(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await marketService.getLatestReport();
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // Premium: detailed per-product analytics — requires active subscription
  async getProductDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub;
      const isActive = await subscriptionService.hasActiveSubscription(userId);
      if (!isActive) {
        throw new AppError('Esta sección requiere una suscripción activa', 403);
      }
      const productoId = req.params['productoId'] as string;
      const daysParam = req.query['days'];
      const days = typeof daysParam === 'string' ? Math.min(365, Math.max(7, parseInt(daysParam, 10) || 90)) : 90;

      const detail = await marketService.getProductDetail(productoId, days);
      if (!detail) throw new AppError('Producto no encontrado', 404);

      res.json({ success: true, data: detail });
    } catch (err) {
      next(err);
    }
  }

  // Admin/manual trigger: regenerate the weekly report on demand
  async regenerateReport(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await marketService.generateWeeklyReport();
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const marketController = new MarketController();
