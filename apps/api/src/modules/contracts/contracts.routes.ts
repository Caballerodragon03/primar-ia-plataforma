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
} from './contracts.controller.js';
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
