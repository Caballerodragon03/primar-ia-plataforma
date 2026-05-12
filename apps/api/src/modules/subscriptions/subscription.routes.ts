import { Router } from 'express';
import { subscriptionController } from './subscription.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { checkoutSchema } from './subscription.schema.js';

export const subscriptionRouter = Router();

// All routes require authentication
subscriptionRouter.use(requireAuth);

subscriptionRouter.get('/plans', (req, res, next) => subscriptionController.getPlans(req, res, next));
subscriptionRouter.get('/current', (req, res, next) => subscriptionController.getCurrent(req, res, next));
subscriptionRouter.post('/checkout', validateBody(checkoutSchema), (req, res, next) => subscriptionController.checkout(req, res, next));
subscriptionRouter.post('/portal', (req, res, next) => subscriptionController.portal(req, res, next));
subscriptionRouter.post('/cancel', (req, res, next) => subscriptionController.cancel(req, res, next));
subscriptionRouter.get('/usage', (req, res, next) => subscriptionController.getUsage(req, res, next));
subscriptionRouter.get('/credits', (req, res, next) => subscriptionController.getCredits(req, res, next));
