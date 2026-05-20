import { Router, raw } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { apiRateLimiter } from '../../middleware/rateLimiter.middleware.js';
import {
  startOnboarding,
  getStatus,
  stripeWebhook,
  createPaymentCheckout,
  capturePayment,
  generateQR,
  verifyQR,
} from './stripe.controller.js';

export const stripeRouter = Router();

// ── Seller onboarding ────────────────────────────────────────────────────────
stripeRouter.get('/connect/status', requireAuth, requireRole('VENDEDOR'), getStatus);
stripeRouter.post('/connect/onboard', requireAuth, requireRole('VENDEDOR'), startOnboarding);

// ── Stripe webhook (raw body required) ───────────────────────────────────────
stripeRouter.post('/webhook', apiRateLimiter, raw({ type: 'application/json' }), stripeWebhook);

// ── Payment Intent (escrow v1 — RETIRADO en v3.11) ─────────────────────────────
// El comprador pagaba la mercancía completa vía Stripe + Stripe Connect al
// vendedor. Reemplazado por el flujo v2: comisión-only en
// POST /contracts/match/:matchId/commission-checkout. La mercancía se paga
// directo al vendedor por transferencia según el plazo pactado.
stripeRouter.post('/payment-checkout', requireAuth, requireRole('COMPRADOR'), (_req, res) => {
  res.status(410).json({
    success: false,
    error: 'Endpoint retirado. Usa POST /contracts/match/:matchId/commission-checkout para pagar la comisión de Primar-IA. La mercancía se paga directo al vendedor por transferencia bancaria.',
  });
});
void createPaymentCheckout;

// ── Capture (escrow v1 — RETIRADO en v3.11, ya sin uso desde la UI) ────────────
stripeRouter.post('/capture/:transaccionId', requireAuth, requireRole('COMPRADOR'), (_req, res) => {
  res.status(410).json({ success: false, error: 'Endpoint retirado en favor del flujo de comisión v2.' });
});
void capturePayment;

// ── QR generation (seller marks as ready) ────────────────────────────────────
stripeRouter.post('/qr/generate/:transaccionId', requireAuth, requireRole('VENDEDOR'), generateQR);

// ── QR verification (buyer scans at delivery) ────────────────────────────────
stripeRouter.post('/qr/verify', requireAuth, requireRole('COMPRADOR'), verifyQR);
