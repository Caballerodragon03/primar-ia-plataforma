import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  downloadContract,
  getContractInfo,
  signContract,
  uploadLotPhotos,
  confirmDelivery,
  getMatchContractInfo,
  downloadMatchContract,
  regenerateDraftContract,
  signMatchAsSeller,
  startBuyerCommissionCheckout,
} from './contracts.controller.js';
import { cancelMatchContract } from '../cancellations/cancellations.controller.js';
import { markShippedController, markReceivedController } from '../shipping/shipping.controller.js';
import { asyncHandler } from '../../shared/async-handler.js';

export const contractsRouter = Router();

contractsRouter.use(requireAuth);

// ─── Match-level endpoints (Phase 3) — registered FIRST to avoid the
//     `:transaccionId` catch-all matching `/match/...`.
// GET    /api/v1/contracts/match/:matchId/info
contractsRouter.get('/match/:matchId/info', asyncHandler(getMatchContractInfo));
// GET    /api/v1/contracts/match/:matchId/download
contractsRouter.get('/match/:matchId/download', asyncHandler(downloadMatchContract));
// POST   /api/v1/contracts/match/:matchId/regenerate-draft
contractsRouter.post('/match/:matchId/regenerate-draft', asyncHandler(regenerateDraftContract));
// POST   /api/v1/contracts/match/:matchId/sign-seller
contractsRouter.post('/match/:matchId/sign-seller', asyncHandler(signMatchAsSeller));
// POST   /api/v1/contracts/match/:matchId/buyer-checkout
contractsRouter.post('/match/:matchId/buyer-checkout', asyncHandler(startBuyerCommissionCheckout));
// POST   /api/v1/contracts/match/:matchId/cancel — Phase 9 cancellation
contractsRouter.post('/match/:matchId/cancel', asyncHandler(cancelMatchContract));
// POST   /api/v1/contracts/match/:matchId/mark-shipped — Phase 10 seller
contractsRouter.post('/match/:matchId/mark-shipped', asyncHandler(markShippedController));
// POST   /api/v1/contracts/match/:matchId/mark-received — Phase 10 buyer
contractsRouter.post('/match/:matchId/mark-received', asyncHandler(markReceivedController));

// ─── Existing transaccion-level endpoints (legacy QR/delivery flow) ─────────
// GET /api/v1/contracts/:transaccionId — download PDF contract
contractsRouter.get('/:transaccionId', asyncHandler(downloadContract));

// GET /api/v1/contracts/:transaccionId/info — get contract info + signature status
contractsRouter.get('/:transaccionId/info', asyncHandler(getContractInfo));

// POST /api/v1/contracts/:transaccionId/sign — sign contract (buyer first, then seller)
contractsRouter.post('/:transaccionId/sign', asyncHandler(signContract));

// POST /api/v1/contracts/:transaccionId/photos — upload lot photos (seller only, after both sign)
contractsRouter.post('/:transaccionId/photos', asyncHandler(uploadLotPhotos));

// POST /api/v1/contracts/:transaccionId/confirm-delivery — buyer confirms delivery with QR
contractsRouter.post('/:transaccionId/confirm-delivery', asyncHandler(confirmDelivery));
