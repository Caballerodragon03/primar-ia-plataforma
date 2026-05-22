import { Request, Response } from 'express';
import { stripeService } from './stripe.service.js';
import { qrService } from './qr.service.js';
import { AppError } from '../../middleware/error.middleware.js';
import { env } from '../../config/env.js';

/**
 * Allowed redirect origins for Stripe onboarding return/refresh URLs.
 * Prevents an authenticated seller from supplying an attacker-controlled
 * URL that Stripe would then redirect their browser to.
 */
function assertSafeRedirectUrl(label: string, raw: string): void {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new AppError(`${label} no es una URL válida`, 400);
  }
  const allowedOrigin = (() => {
    try { return new URL(env.CORS_ORIGIN).origin; } catch { return null; }
  })();
  if (!allowedOrigin || parsed.origin !== allowedOrigin) {
    throw new AppError(`${label} debe pertenecer al dominio de la plataforma`, 400);
  }
}

export async function startOnboarding(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { returnUrl, refreshUrl } = req.body as { returnUrl: string; refreshUrl: string };
  if (!returnUrl || !refreshUrl) throw new AppError('returnUrl y refreshUrl son requeridos', 400);
  assertSafeRedirectUrl('returnUrl', returnUrl);
  assertSafeRedirectUrl('refreshUrl', refreshUrl);
  const result = await stripeService.createOnboardingLink(userId, returnUrl, refreshUrl);
  res.json({ success: true, data: result });
}

export async function getStatus(req: Request, res: Response): Promise<void> {
  const result = await stripeService.getAccountStatus(req.user!.sub);
  res.json({ success: true, data: result });
}

export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'] as string;
  if (!sig) throw new AppError('Falta Stripe-Signature header', 400);

  // Phase 14M v3.26 — Fast-ack pattern. Verify signature synchronously (fast)
  // and respond 200 to Stripe BEFORE running the heavy event processing
  // (PDF gen, DB writes, downstream APIs). Stripe times out at 30 s and
  // retries on non-2xx; without fast-ack we were timing out on cold start
  // and on commission flows that include PDF generation, painting the
  // Stripe dashboard red with false-positive errors. Reconcile flows
  // (subscription session_id, commission match reconcile) already cover
  // the case where the async processing crashes mid-flight.
  let event;
  try {
    event = stripeService.verifyWebhookEvent(req.body as Buffer, sig);
  } catch (err) {
    console.error('[stripe] webhook signature verification failed:', err);
    res.status(400).json({ received: false, error: 'bad signature' });
    return;
  }
  res.json({ received: true });

  // Fire-and-forget processing. Errors are logged but don't propagate to
  // Stripe — we've already acked.
  stripeService.processWebhookEvent(event).catch((err) => {
    console.error(`[stripe] webhook processing failed for ${event.type} (${event.id}):`, err);
  });
}

export async function createPaymentCheckout(req: Request, res: Response): Promise<void> {
  const compradorId = req.user!.sub as string;
  const { matchId, metodoPago } = req.body as {
    matchId: string;
    metodoPago: 'card' | 'sepa_debit';
  };
  if (!matchId) throw new AppError('matchId es requerido', 400);
  if (!metodoPago || !['card', 'sepa_debit'].includes(metodoPago)) {
    throw new AppError('metodoPago debe ser "card" o "sepa_debit"', 400);
  }
  const result = await stripeService.createPaymentCheckout(compradorId, matchId, metodoPago);
  res.status(201).json({ success: true, data: result });
}

export async function capturePayment(req: Request, res: Response): Promise<void> {
  const compradorId = req.user!.sub;
  const { transaccionId } = req.params as { transaccionId: string };
  const result = await stripeService.capturePayment(transaccionId, compradorId);
  res.json({ success: true, data: result });
}

export async function generateQR(req: Request, res: Response): Promise<void> {
  const vendedorId = req.user!.sub;
  const { transaccionId } = req.params as { transaccionId: string };
  const result = await qrService.generateQR(transaccionId, vendedorId);
  res.json({ success: true, data: result });
}

export async function verifyQR(req: Request, res: Response): Promise<void> {
  const compradorId = req.user!.sub;
  const { token } = req.body as { token: string };
  if (!token) throw new AppError('token es requerido', 400);
  const result = await qrService.verifyQR(token, compradorId);
  res.json({ success: true, data: result });
}
