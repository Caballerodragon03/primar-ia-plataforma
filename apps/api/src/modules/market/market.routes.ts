import { Router } from 'express';
import { marketController } from './market.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';

// Public market endpoints (no auth required)
export const marketPublicRouter = Router();
marketPublicRouter.get('/prices', (req, res, next) => marketController.getPrices(req, res, next));
marketPublicRouter.get('/sentiment', (req, res, next) => marketController.getSentiment(req, res, next));

// Premium endpoints (auth + active subscription required)
export const marketPremiumRouter = Router();
marketPremiumRouter.use(requireAuth);
marketPremiumRouter.get('/products/:productoId', (req, res, next) =>
  marketController.getProductDetail(req, res, next),
);

// Admin manual regen
export const marketAdminRouter = Router();
marketAdminRouter.use(requireAuth, requireRole('ADMIN'));
marketAdminRouter.post('/regenerate-report', (req, res, next) =>
  marketController.regenerateReport(req, res, next),
);
