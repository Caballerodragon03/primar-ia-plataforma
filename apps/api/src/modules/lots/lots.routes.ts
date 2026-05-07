import { Router } from 'express';
import { requireAuth, requireRole, requireEstado } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { createLotSchema, updateLotSchema } from './lots.schema.js';
import { createLot, listLots, getLot, updateLot, cancelLot, getAnalytics } from './lots.controller.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { requirePlanLimit } from '../../middleware/requirePlanLimit.js';

export const lotsRouter = Router();

lotsRouter.use(requireAuth, requireRole('VENDEDOR'), requireEstado('VERIFICADO_ACTIVO'));

lotsRouter.get('/analytics', asyncHandler(getAnalytics));
lotsRouter.get('/', asyncHandler(listLots));
lotsRouter.post('/', requirePlanLimit('lot'), validateBody(createLotSchema), asyncHandler(createLot));
lotsRouter.get('/:id', asyncHandler(getLot));
lotsRouter.put('/:id', validateBody(updateLotSchema), asyncHandler(updateLot));
lotsRouter.delete('/:id', asyncHandler(cancelLot));
