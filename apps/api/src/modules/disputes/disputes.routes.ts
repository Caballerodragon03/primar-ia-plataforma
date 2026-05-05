import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, requireEstado } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { createDisputaSchema, respuestaVendedorSchema, resolverDisputaSchema } from './disputes.schema.js';
import {
  createDisputa,
  listDisputas,
  getDisputa,
  responderDisputa,
  resolverDisputa,
} from './disputes.controller.js';
import { asyncHandler } from '../../shared/async-handler.js';

export const disputesRouter = Router();

const createDisputaBodySchema = createDisputaSchema.extend({ transaccionId: z.string() });

// POST /api/v1/disputes — create (COMPRADOR or VENDEDOR + VERIFICADO_ACTIVO)
disputesRouter.post(
  '/',
  requireAuth,
  requireEstado('VERIFICADO_ACTIVO'),
  validateBody(createDisputaBodySchema),
  asyncHandler(createDisputa)
);

// GET /api/v1/disputes — list (requireAuth + VERIFICADO_ACTIVO)
disputesRouter.get(
  '/',
  requireAuth,
  requireEstado('VERIFICADO_ACTIVO'),
  asyncHandler(listDisputas)
);

// GET /api/v1/disputes/:id — get detail (requireAuth + VERIFICADO_ACTIVO)
disputesRouter.get(
  '/:id',
  requireAuth,
  requireEstado('VERIFICADO_ACTIVO'),
  asyncHandler(getDisputa)
);

// POST /api/v1/disputes/:id/respond — vendor responds (VENDEDOR + VERIFICADO_ACTIVO)
disputesRouter.post(
  '/:id/respond',
  requireAuth,
  requireRole('VENDEDOR'),
  requireEstado('VERIFICADO_ACTIVO'),
  validateBody(respuestaVendedorSchema),
  asyncHandler(responderDisputa)
);

// POST /api/v1/disputes/:id/resolve — admin resolves (ADMIN only)
disputesRouter.post(
  '/:id/resolve',
  requireAuth,
  requireRole('ADMIN'),
  validateBody(resolverDisputaSchema),
  asyncHandler(resolverDisputa)
);
