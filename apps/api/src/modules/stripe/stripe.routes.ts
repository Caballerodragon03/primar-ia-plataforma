import { Router, raw } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import {
  startOnboarding,
  getStatus,
  stripeWebhook,
  createPaymentIntent,
  capturePayment,
  generateQR,
  verifyQR,
} from './stripe.controller.js';

export const stripeRouter = Router();

// ── Seller onboarding ────────────────────────────────────────────────────────
stripeRouter.get('/connect/status', requireAuth, requireRole('VENDEDOR'), getStatus);
stripeRouter.post('/connect/onboard', requireAuth, requireRole('VENDEDOR'), startOnboarding);

// ── Stripe webhook (raw body required) ───────────────────────────────────────
stripeRouter.post('/webhook', raw({ type: 'application/json' }), stripeWebhook);

// ── Payment Intent (buyer creates pre-auth) ──────────────────────────────────
stripeRouter.post('/payment-intent', requireAuth, requireRole('COMPRADOR'), createPaymentIntent);

// ── Capture (buyer triggers after delivery confirmed) ────────────────────────
stripeRouter.post('/capture/:transaccionId', requireAuth, requireRole('COMPRADOR'), capturePayment);

// ── QR generation (seller marks as ready) ────────────────────────────────────
stripeRouter.post('/qr/generate/:transaccionId', requireAuth, requireRole('VENDEDOR'), generateQR);

// ── QR verification (buyer scans at delivery) ────────────────────────────────
stripeRouter.post('/qr/verify', requireAuth, requireRole('COMPRADOR'), verifyQR);
