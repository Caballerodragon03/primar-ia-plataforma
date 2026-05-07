import { Request, Response } from 'express';
import { stripeService } from './stripe.service.js';
import { qrService } from './qr.service.js';
import { AppError } from '../../middleware/error.middleware.js';

export async function startOnboarding(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { returnUrl, refreshUrl } = req.body as { returnUrl: string; refreshUrl: string };
  if (!returnUrl || !refreshUrl) throw new AppError('returnUrl y refreshUrl son requeridos', 400);
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
  await stripeService.handleWebhook(req.body as Buffer, sig);
  res.json({ received: true });
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
