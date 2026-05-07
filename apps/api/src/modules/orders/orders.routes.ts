import { Router } from 'express';
import { requireAuth, requireRole, requireEstado } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { createOrderSchema, updateOrderSchema } from './orders.schema.js';
import { createOrder, listOrders, getOrder, updateOrder, cancelOrder, getBuyerAnalytics } from './orders.controller.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { requirePlanLimit } from '../../middleware/requirePlanLimit.js';

export const ordersRouter = Router();

ordersRouter.use(requireAuth, requireRole('COMPRADOR'), requireEstado('VERIFICADO_ACTIVO'));

ordersRouter.get('/analytics', asyncHandler(getBuyerAnalytics));
ordersRouter.get('/', asyncHandler(listOrders));
ordersRouter.post('/', requirePlanLimit('order'), validateBody(createOrderSchema), asyncHandler(createOrder));
ordersRouter.get('/:id', asyncHandler(getOrder));
ordersRouter.put('/:id', validateBody(updateOrderSchema), asyncHandler(updateOrder));
ordersRouter.delete('/:id', asyncHandler(cancelOrder));
