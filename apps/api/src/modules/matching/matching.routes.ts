import { Router } from 'express';
import { requireAuth, requireRole, requireEstado } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { contributeSchema } from './matching.schema.js';
import {
  runMatchingForLot,
  runMatchingForOrder,
  listSellerMatches,
  listLotMatches,
  contributeToOrder,
  getNotificationsSummary,
  getPendingTasksList,
} from './matching.controller.js';
import { asyncHandler } from '../../shared/async-handler.js';

export const matchingRouter = Router();

// All matching routes require an authenticated, verified user
matchingRouter.use(requireAuth, requireEstado('VERIFICADO_ACTIVO'));

// ── Vendor routes ─────────────────────────────────────────────────────────────
// Trigger matching for a lot the vendor owns
matchingRouter.post(
  '/lots/:loteId/run',
  requireRole('VENDEDOR'),
  asyncHandler(runMatchingForLot)
);

// List all matches for the logged-in seller (across all lots)
matchingRouter.get(
  '/seller/matches',
  requireRole('VENDEDOR'),
  asyncHandler(listSellerMatches)
);

// List matches for a specific lot
matchingRouter.get(
  '/lots/:loteId/matches',
  requireRole('VENDEDOR'),
  asyncHandler(listLotMatches)
);

// Vendor contributes calibres to a match
matchingRouter.post(
  '/matches/:matchId/contribute',
  requireRole('VENDEDOR'),
  validateBody(contributeSchema),
  asyncHandler(contributeToOrder)
);

// ── Shared routes ─────────────────────────────────────────────────────────────
// Notification summary for both buyers and sellers
matchingRouter.get('/notifications/summary', asyncHandler(getNotificationsSummary));
matchingRouter.get('/notifications/tasks', asyncHandler(getPendingTasksList));

// ── Buyer routes ──────────────────────────────────────────────────────────────
// Trigger matching for an order the buyer owns
matchingRouter.post(
  '/orders/:pedidoId/run',
  requireRole('COMPRADOR'),
  asyncHandler(runMatchingForOrder)
);
