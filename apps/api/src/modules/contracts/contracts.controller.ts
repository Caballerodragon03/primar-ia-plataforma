import { Request, Response } from 'express';
import { prisma } from '@primaria/database';
import { sanitizeSignature } from '@primaria/shared';
import { contractsService } from './contracts.service.js';
import { AppError } from '../../middleware/error.middleware.js';

export async function downloadContract(req: Request, res: Response): Promise<void> {
  const { transaccionId } = req.params as { transaccionId: string };
  const userId = req.user!.sub;
  const { buffer, filename } = await contractsService.getContractStream(transaccionId, userId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}

export async function getContractInfo(req: Request, res: Response): Promise<void> {
  const { transaccionId } = req.params as { transaccionId: string };
  const info = await contractsService.getContractInfo(transaccionId, req.user!.sub);
  res.json({ success: true, data: info });
}

/**
 * Legacy Phase-3 signing endpoint. Deprecated in favor of the match-level
 * flow:
 *   - Seller: POST /api/v1/contracts/match/:matchId/sign-seller
 *   - Buyer: POST /api/v1/contracts/match/:matchId/buyer-checkout (signs
 *     after Stripe confirms commission payment)
 *
 * Calling this endpoint would bypass the v2 state machine: it doesn't
 * validate contratoEstado, doesn't enforce the seller-signs-first order,
 * and doesn't trigger the commission webhook → no comisionPagadaEn, no
 * invoices, no PDF final. Locked with 410 Gone to keep the surface clean.
 */
export async function signContract(_req: Request, res: Response): Promise<void> {
  res.status(410).json({
    success: false,
    error: 'Este endpoint ha sido retirado. Usa /contracts/match/:matchId/sign-seller (vendedor) o /contracts/match/:matchId/buyer-checkout (comprador).',
  });
}

export async function uploadLotPhotos(req: Request, res: Response): Promise<void> {
  const { transaccionId } = req.params as { transaccionId: string };
  const { photoUrls } = req.body as { photoUrls: string[] };
  if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
    res.status(400).json({ success: false, error: 'Se requiere al menos una foto' });
    return;
  }
  const result = await contractsService.uploadLotPhotos(transaccionId, req.user!.sub, photoUrls);
  res.json({ success: true, data: result });
}

export async function confirmDelivery(req: Request, res: Response): Promise<void> {
  const { transaccionId } = req.params as { transaccionId: string };
  const { qrToken } = req.body as { qrToken: string };
  if (!qrToken) {
    res.status(400).json({ success: false, error: 'qrToken is required' });
    return;
  }
  const result = await contractsService.confirmDelivery(transaccionId, req.user!.sub, qrToken);
  res.json({ success: true, data: result });
}

// ─── Phase 3 — Match-level contract endpoints ────────────────────────────────

/**
 * GET /api/v1/contracts/match/:matchId/info
 * Returns contract metadata: state, draft URL, commission snapshot, signatures,
 * and the buyer/seller IDs for the frontend to know which UI to render.
 * Authorized for either party of the match.
 */
export async function getMatchContractInfo(req: Request, res: Response): Promise<void> {
  const matchId = (req.params as { matchId: string }).matchId;
  const userId = req.user!.sub;
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      contratoEstado: true,
      contratoBorradorUrl: true,
      comisionEstimada: true,
      comisionPorcentaje: true,
      firmaVendedorDeadline: true,
      // Phase 14A — surface cancellation context so the UI can render a
      // meaningful CANCELADO state (motivo + autor + fecha).
      canceladoPor: true,
      canceladoEn: true,
      motivoCancelacion: true,
      cantidadKg: true,
      precioKg: true,
      precioKgFinal: true,
      incotermFinal: true,
      logisticaFinal: true,
      terminoPagoFinal: true,
      calibresJson: true,
      lote: {
        select: {
          vendedorId: true,
          producto: { select: { nombre: true } },
          variedad: { select: { nombre: true } },
          direccionRecogida: true,
        },
      },
      pedido: {
        select: {
          compradorId: true,
          destinoFinal: true,
          incoterm: true,
        },
      },
      transaccion: {
        select: {
          id: true,
          firmaComprador: true,
          firmaCompradorFecha: true,
          firmaVendedor: true,
          firmaVendedorFecha: true,
          contratoPdfUrl: true,
          comisionPagadaEn: true,
          // Phase 5 — auto-generated invoice URLs
          facturaPlataformaUrl: true,
          facturaVendedorUrl: true,
          resguardoPagoUrl: true,
          // Phase 10 — shipping event tracking
          enviadoEn: true,
          recibidoEn: true,
          // Phase 14M v3.14 — flag para detectar pago en curso aunque
          // el usuario haya refrescado y perdido el ?paid=1 de la URL.
          // Si hay session ID pero la comisión no se ha cobrado, hay un
          // pago en marcha (creó sesión y posiblemente ya pagó pero el
          // webhook aún no la cerró).
          comisionStripeSessionId: true,
          // Phase 10 — has the current user already rated this transaction?
          valoraciones: {
            select: { autorId: true },
          },
        },
      },
    },
  });
  if (!match) throw new AppError('Match no encontrado', 404);
  if (match.lote.vendedorId !== userId && match.pedido.compradorId !== userId) {
    throw new AppError('No autorizado', 403);
  }
  // precioKgFinal is what was agreed; fallback to match.precioKg if negotiation
  // hasn't happened yet.
  const effectivePrice = match.precioKgFinal !== null
    ? Number(match.precioKgFinal)
    : Number(match.precioKg);
  const cantidadKg = Number(match.cantidadKg);
  const precioTotalMercancia = effectivePrice * cantidadKg;
  res.json({
    success: true,
    data: {
      matchId: match.id,
      // The chat (Mensaje table) is keyed by transaccionId, not matchId — so
      // the contract page links to /messages?tx=... using this value.
      transaccionId: match.transaccion?.id ?? null,
      contratoEstado: match.contratoEstado,
      contratoBorradorUrl: match.contratoBorradorUrl,
      contratoPdfUrl: match.transaccion?.contratoPdfUrl ?? null,
      // Commission
      comisionEstimada: match.comisionEstimada !== null ? Number(match.comisionEstimada) : null,
      comisionPorcentaje: match.comisionPorcentaje !== null ? Number(match.comisionPorcentaje) : null,
      // Product & price details — so the UI doesn't force the user to open
      // the PDF just to see what they're signing.
      producto: match.lote.producto?.nombre ?? null,
      variedad: match.lote.variedad?.nombre ?? null,
      cantidadKg,
      precioKg: effectivePrice,
      precioTotalMercancia,
      calibres: match.calibresJson,
      incoterm: match.incotermFinal ?? match.pedido.incoterm ?? null,
      logistica: match.logisticaFinal ?? null,
      terminoPago: match.terminoPagoFinal ?? null,
      destinoFinal: match.pedido.destinoFinal ?? null,
      direccionRecogida: match.lote.direccionRecogida ?? null,
      // Signatures
      firmaVendedorDeadline: match.firmaVendedorDeadline?.toISOString() ?? null,
      firmaVendedor: match.transaccion?.firmaVendedor ?? null,
      firmaVendedorFecha: match.transaccion?.firmaVendedorFecha?.toISOString() ?? null,
      firmaComprador: match.transaccion?.firmaComprador ?? null,
      firmaCompradorFecha: match.transaccion?.firmaCompradorFecha?.toISOString() ?? null,
      comisionPagadaEn: match.transaccion?.comisionPagadaEn?.toISOString() ?? null,
      // Phase 5 — auto-generated documents (null until contract is FIRMADO).
      // The seller's invoice is shown to BOTH parties: buyer needs it as
      // proof of purchase for accounting, seller needs it as proof of sale.
      facturaPlataformaUrl: match.transaccion?.facturaPlataformaUrl ?? null,
      facturaVendedorUrl: match.transaccion?.facturaVendedorUrl ?? null,
      // The payment receipt is only shown to the BUYER (it contains
      // transfer instructions for them to execute).
      resguardoPagoUrl: match.lote.vendedorId === userId
        ? null
        : (match.transaccion?.resguardoPagoUrl ?? null),
      // Phase 10 — shipping events + rating status
      enviadoEn: match.transaccion?.enviadoEn?.toISOString() ?? null,
      recibidoEn: match.transaccion?.recibidoEn?.toISOString() ?? null,
      hasRatedCounterpart: (match.transaccion?.valoraciones ?? []).some((v) => v.autorId === userId),
      // Phase 14A — cancellation context (null unless contratoEstado=CANCELADO)
      canceladoPor: match.canceladoPor,
      canceladoEn: match.canceladoEn?.toISOString() ?? null,
      motivoCancelacion: match.motivoCancelacion,
      canceladoPorMi: match.canceladoPor === userId,
      counterpartId: match.lote.vendedorId === userId ? match.pedido.compradorId : match.lote.vendedorId,
      // Phase 14M v3.14 — paymentInFlight detectado desde backend (no
      // depende del ?paid=1 de la URL que se pierde al refrescar).
      // Es true cuando existe una sesión Stripe creada pero la comisión
      // todavía no se ha registrado como pagada y el contrato sigue
      // en PENDIENTE_PAGO_COMPRADOR.
      paymentInFlight:
        match.contratoEstado === 'PENDIENTE_PAGO_COMPRADOR'
        && !!match.transaccion?.comisionStripeSessionId
        && !match.transaccion?.comisionPagadaEn,
      // Role-discriminator for frontend UI rendering
      isSeller: match.lote.vendedorId === userId,
      isBuyer: match.pedido.compradorId === userId,
    },
  });
}

/**
 * GET /api/v1/contracts/match/:matchId/download
 * Streams the contract PDF (draft or final based on contratoEstado).
 * The PDF is regenerated on-demand so it always reflects current data
 * (signatures, edits in chat negotiation, etc.).
 */
export async function downloadMatchContract(req: Request, res: Response): Promise<void> {
  const matchId = (req.params as { matchId: string }).matchId;
  const userId = req.user!.sub;
  const { buffer, filename } = await contractsService.getContractBufferForMatch(matchId, userId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}

/**
 * POST /api/v1/contracts/match/:matchId/buyer-checkout
 * The buyer hits "Firmar y pagar". We accept their signature in the body
 * BUT we do NOT persist it yet — only after Stripe confirms payment via
 * webhook. The signature is stashed in the Stripe Checkout metadata so the
 * webhook can recover it atomically.
 *
 * Returns: { url } — the frontend redirects the buyer to Stripe.
 */
export async function startBuyerCommissionCheckout(req: Request, res: Response): Promise<void> {
  const matchId = (req.params as { matchId: string }).matchId;
  const userId = req.user!.sub;
  // Zod (validateBody) already enforces shape + length + ack=true. We sanitize
  // here to strip control chars / zero-width Unicode before the value is
  // persisted in Stripe metadata and the audit suffix is appended.
  const { signatureData } = req.body as { signatureData: string };
  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
    ?? req.socket.remoteAddress
    ?? null;
  // Stripe metadata values are limited to 500 chars and we only have 50 keys
  // — keep signature ≤ 480 to leave room for the audit suffix.
  const trimmedSig = sanitizeSignature(signatureData, 480);
  if (trimmedSig.length < 1) throw new AppError('Firma inválida tras saneado', 400);
  const { stripeService } = await import('../stripe/stripe.service.js');
  const result = await stripeService.createCommissionCheckoutForMatch(
    matchId, userId, trimmedSig, ip,
  );
  res.json({ success: true, data: result });
}

/**
 * POST /api/v1/contracts/match/:matchId/sign-seller
 * The seller signs the contract. Only the seller of the match can hit this.
 * After signing, contract estado moves to PENDIENTE_PAGO_COMPRADOR and a
 * 48-business-hours deadline is set for the buyer to pay + sign.
 */
export async function signMatchAsSeller(req: Request, res: Response): Promise<void> {
  const matchId = (req.params as { matchId: string }).matchId;
  const userId = req.user!.sub;
  // Zod validateBody enforced shape/length; sanitize for control chars too.
  const raw = (req.body as { signatureData: string }).signatureData;
  // Seller can sign by drawing on canvas (base64 PNG dataURL ~5-50 KB) or
  // typing a short text rubric. Cap aligned with sellerSignatureField (200 KB).
  const signatureData = sanitizeSignature(raw, 200_000);
  if (signatureData.length < 1) throw new AppError('Firma inválida tras saneado', 400);
  // Capture client IP for the audit trail (use x-forwarded-for if present
  // — common when behind a reverse proxy like Railway/Cloudflare).
  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
    ?? req.socket.remoteAddress
    ?? null;
  const result = await contractsService.signMatchContractAsSeller(matchId, userId, signatureData, ip);
  res.json({ success: true, data: result });
}

/**
 * POST /api/v1/contracts/match/:matchId/regenerate-draft
 * Forces regeneration of the draft contract (after a negotiation in chat,
 * for example). Only allowed if the contract isn't yet signed.
 * Authorized for either party.
 */
export async function regenerateDraftContract(req: Request, res: Response): Promise<void> {
  const matchId = (req.params as { matchId: string }).matchId;
  const userId = req.user!.sub;
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      contratoEstado: true,
      lote: { select: { vendedorId: true } },
      pedido: { select: { compradorId: true } },
    },
  });
  if (!match) throw new AppError('Match no encontrado', 404);
  if (match.lote.vendedorId !== userId && match.pedido.compradorId !== userId) {
    throw new AppError('No autorizado', 403);
  }
  if (match.contratoEstado === 'FIRMADO') {
    throw new AppError('El contrato ya está firmado, no se puede regenerar', 400);
  }
  // Allow regeneration from BORRADOR or PENDIENTE_FIRMA_VENDEDOR.
  // If seller already signed (PENDIENTE_PAGO_COMPRADOR), regen requires
  // re-signing — clear signatures first.
  if (match.contratoEstado === 'PENDIENTE_PAGO_COMPRADOR') {
    // Reset firma + estado so the seller has to re-sign post-modification.
    const tx = await prisma.transaccion.findUnique({ where: { matchId }, select: { id: true } });
    if (tx) {
      await prisma.transaccion.update({
        where: { id: tx.id },
        data: { firmaVendedor: null, firmaVendedorFecha: null },
      });
    }
    await prisma.match.update({
      where: { id: matchId },
      data: { contratoEstado: 'BORRADOR' },
    });
  }
  const result = await contractsService.generateContractDraft(matchId);
  res.json({ success: true, data: result });
}
