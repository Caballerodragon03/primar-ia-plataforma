import { Router } from 'express';
import { valoracionesController } from './valoraciones.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { createValoracionSchema } from './valoraciones.schema.js';

export const valoracionesRouter = Router();

valoracionesRouter.post(
  '/',
  requireAuth,
  validateBody(createValoracionSchema),
  (req, res, next) => {
    valoracionesController.create(req, res).catch(next);
  }
);
