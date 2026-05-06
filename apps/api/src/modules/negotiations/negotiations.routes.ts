import { Router } from 'express';
import { requireAuth, requireEstado } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { createOfertaSchema } from './negotiations.schema.js';
import { negotiationsController } from './negotiations.controller.js';
import { asyncHandler } from '../../shared/async-handler.js';

export const negotiationsRouter = Router({ mergeParams: true });

negotiationsRouter.use(requireAuth, requireEstado('VERIFICADO_ACTIVO'));

negotiationsRouter.post(
  '/',
  validateBody(createOfertaSchema),
  asyncHandler((req, res) => negotiationsController.create(req, res))
);

negotiationsRouter.post(
  '/:negociacionId/accept',
  asyncHandler((req, res) => negotiationsController.accept(req, res))
);

negotiationsRouter.post(
  '/:negociacionId/reject',
  asyncHandler((req, res) => negotiationsController.reject(req, res))
);
