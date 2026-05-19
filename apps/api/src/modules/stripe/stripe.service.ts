import Stripe from 'stripe';
import { prisma } from '@primaria/database';
import type { Transaccion } from '@primaria/database';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.middleware.js';
import { calcularComision } from '@primaria/shared';
import { sendOrderConfirmedEmail } from '../../shared/emails/transactional.js';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export class StripeService {
  async createOnboardingLink(userId: string, returnUrl: string, refreshUrl: string) {
    const empresa = await prisma.empresa.findUnique({ where: { userId } });
    if (!empresa) throw new AppError('Empresa no encontrada', 404);

    let accountId = empresa.stripeAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'ES',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      await prisma.empresa.update({
        where: { userId },
        data: { stripeAccountId: accountId },
      });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return { url: link.url, accountId };
  }

  async getAccountStatus(userId: string) {
    const empresa = await prisma.empresa.findUnique({ where: { userId } });
    if (!empresa) throw new AppError('Empresa no encontrada', 404);
    return {
      connected: !!empresa.stripeAccountId,
      onboardingDone: empresa.stripeOnboardingDone,
      accountId: empresa.stripeAccountId,
    };
  }

  async createPaymentCheckout(
    compradorId: string,
    matchId: string,
    metodoPago: 'card' | 'sepa_debit',
  ): Promise<{ url: string; transaccionId: string; totalAmount: number }> {
    const result = await prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: {
          lote: {
            include: {
              producto: true,
              vendedor: { include: { empresa: true } },
            },
          },
          pedido: true,
          transaccion: true,
        },
      });

      if (!match) throw new AppError('Match no encontrado', 404);
      if (match.pedido.compradorId !== compradorId) {
        throw new AppError('No autorizado para pagar este match', 403);
      }
      if (match.transaccion?.stripePaymentIntentId) {
        throw new AppError('Ya existe un pago para este match', 409);
      }

      const cantidadKg = Number(match.cantidadKg);
      const precioKg = Number(match.precioKg);
      const total = cantidadKg * precioKg;
      // metodoPago is kept in the request body for backwards compat with
      // mobile clients, but the new commission table does not vary by
      // payment method (commission is always charged via card to the buyer).
      void metodoPago;
      const comision = calcularComision(total);

      const vendedorEmpresa = match.lote.vendedor.empresa;
      const sellerReady =
        vendedorEmpresa?.stripeAccountId && vendedorEmpresa.stripeOnboardingDone;

      const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
        metodoPago === 'sepa_debit' ? ['sepa_debit'] : ['card'];

      const productoNombre = match.lote.producto.nombre;
      const pedidoId = match.pedidoId;
      const orderId = match.pedido.id;

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment',
        payment_method_types: paymentMethodTypes,
        line_items: [
          {
            price_data: {
              currency: 'eur',
              unit_amount: Math.round(total * 100),
              product_data: {
                name: `${productoNombre} — ${cantidadKg} kg`,
                description: `Pedido Primar-IA — ${cantidadKg} kg a ${precioKg.toFixed(3)}€/kg`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          matchId,
          compradorId,
          vendedorId: match.lote.vendedorId,
          metodoPago,
        },
        success_url: `${env.CORS_ORIGIN}/buyer/orders/${orderId}?payment=success`,
        cancel_url: `${env.CORS_ORIGIN}/buyer/orders/${orderId}?payment=cancelled`,
      };

      if (sellerReady) {
        sessionParams.payment_intent_data = {
          application_fee_amount: Math.round(comision.total * 100),
          transfer_data: {
            destination: vendedorEmpresa!.stripeAccountId!,
          },
        };
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      const txPayload = {
        stripePaymentIntentId: session.payment_intent as string | null,
        metodoPago,
        cantidadKg: match.cantidadKg,
        precioTotal: total,
        comisionPlataforma: comision.total,
        comisionPorcentaje: comision.porcentaje,
        estado: 'PENDIENTE_PAGO' as const,
      };

      const transaccion = match.transaccion
        ? await tx.transaccion.update({
            where: { id: match.transaccion.id },
            data: txPayload,
          })
        : await tx.transaccion.create({
            data: {
              matchId,
              vendedorId: match.lote.vendedorId,
              compradorId,
              ...txPayload,
            },
          });

      await tx.match.update({
        where: { id: matchId },
        data: { estado: 'PENDIENTE_PAGO' },
      });

      return {
        url: session.url!,
        transaccionId: transaccion.id,
        totalAmount: total,
        _emailContext: { pedidoId, productoId: match.lote.productoId, total },
      };
    }, { isolationLevel: 'Serializable' });

    void (async () => {
      try {
        const comprador = await prisma.user.findUnique({
          where: { id: compradorId },
          select: { email: true, nombre: true },
        });
        const producto = await prisma.producto.findUnique({
          where: { id: result._emailContext.productoId },
          select: { nombre: true },
        });
        if (comprador?.email) {
          await sendOrderConfirmedEmail(comprador.email, comprador.nombre, {
            pedidoId: result._emailContext.pedidoId,
            productoNombre: producto?.nombre ?? result._emailContext.productoId,
            totalAmount: result._emailContext.total,
          });
        }
      } catch (emailErr) {
        console.error('[Stripe] Failed to send order confirmed email:', emailErr);
      }
    })();

    return {
      url: result.url,
      transaccionId: result.transaccionId,
      totalAmount: result.totalAmount,
    };
  }

  async capturePayment(transaccionId: string, compradorId: string): Promise<Transaccion> {
    const transaccion = await prisma.transaccion.findUnique({
      where: { id: transaccionId },
      include: { match: { include: { pedido: true } } },
    });

    if (!transaccion) throw new AppError('Transacción no encontrada', 404);
    if (transaccion.compradorId !== compradorId) {
      throw new AppError('No autorizado', 403);
    }
    if (transaccion.estado !== 'ENTREGADO') {
      throw new AppError(
        `No se puede capturar: estado actual es ${transaccion.estado}`,
        422,
      );
    }
    if (!transaccion.stripePaymentIntentId) {
      throw new AppError('No hay PaymentIntent asociado', 422);
    }

    // Capture the Stripe PaymentIntent
    await stripe.paymentIntents.capture(transaccion.stripePaymentIntentId);

    // Mark this transaccion as COMPLETADO and advance its match to CONFIRMADO
    const [updated] = await Promise.all([
      prisma.transaccion.update({
        where: { id: transaccionId },
        data: { estado: 'COMPLETADO' },
      }),
      prisma.match.update({
        where: { id: transaccion.match.id },
        data: { estado: 'CONFIRMADO' },
      }),
    ]);

    // Only close the pedido when ALL its transacciones are COMPLETADO
    const allTxForPedido = await prisma.transaccion.findMany({
      where: { match: { pedidoId: transaccion.match.pedidoId } },
      select: { id: true, estado: true },
    });
    const allComplete = allTxForPedido.every(
      (tx) => tx.id === transaccionId || tx.estado === 'COMPLETADO',
    );
    if (allComplete) {
      await prisma.pedido.update({
        where: { id: transaccion.match.pedidoId },
        data: { estado: 'CERRADO' },
      });
    }

    // Recompute the lot's estado — if this completes the last pending tx on
    // the lot AND coverage is 100%, the lot will now flip to VENDIDO.
    // Dynamic import avoids the circular dep between stripe and matching.
    const { recomputeLotState } = await import('../matching/matching.service.js');
    await recomputeLotState(transaccion.match.loteId);

    return updated;
  }

  async handleWebhook(rawBody: Buffer, sig: string): Promise<void> {
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new AppError('Webhook signature inválida', 400);
    }

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        if (account.charges_enabled && account.payouts_enabled) {
          await prisma.empresa.updateMany({
            where: { stripeAccountId: account.id },
            data: { stripeOnboardingDone: true },
          });
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await prisma.transaccion.updateMany({
          where: { stripePaymentIntentId: pi.id },
          data: { estado: 'PAGO_CAPTURADO' },
        });
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.warn(
          `[Stripe] PaymentIntent failed: ${pi.id} — last_payment_error: ${
            pi.last_payment_error?.message ?? 'unknown'
          }`,
        );
        // State stays PENDIENTE_PAGO — buyer must retry
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id;
        // Find the PaymentIntent linked to this charge
        const charge = await stripe.charges.retrieve(chargeId);
        const piId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;
        if (piId) {
          await prisma.transaccion.updateMany({
            where: { stripePaymentIntentId: piId },
            data: { estado: 'EN_DISPUTA' },
          });
        }
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Branch by what kind of session this is:
        //   - subscription mode → subscription webhook handler
        //   - payment mode + metadata.kind='match_commission' → Phase 4 flow
        //   - payment mode + metadata.matchId only → legacy v1 marketplace flow
        if (session.mode === 'subscription') {
          const { subscriptionService } = await import('../subscriptions/subscription.service.js');
          await subscriptionService.handleSubscriptionWebhook(event);
        } else if (session.metadata?.kind === 'match_commission') {
          // Phase 4 — commission payment for match-level contract.
          const matchId = session.metadata?.matchId;
          const buyerSignature = session.metadata?.buyerSignature;
          const buyerIp = session.metadata?.buyerIp || null;
          if (!matchId || !buyerSignature) {
            console.error('[stripe] match_commission session missing metadata', session.id);
            break;
          }
          const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? session.id;
          try {
            const { contractsService } = await import('../contracts/contracts.service.js');
            await contractsService.signMatchContractAsBuyerAfterPayment(
              matchId,
              buyerSignature,
              buyerIp,
              paymentIntentId,
            );
          } catch (err) {
            // Phase 13 — when finalize fails (caducó, cancelled, already-FIRMADO
            // race), persist a PendingRefund row so admin doesn't lose track.
            // We still log for ops visibility, but the DB row is the canonical
            // audit trail and surface in /admin/refunds.
            // Phase 14A — redact err (may contain PII via Prisma error messages).
            const { redactPII } = await import('@primaria/shared');
            console.error('[stripe] commission webhook failed for match', matchId, redactPII(err));
            try {
              const match = await prisma.match.findUnique({
                where: { id: matchId },
                select: {
                  contratoEstado: true,
                  comisionEstimada: true,
                  pedido: {
                    select: {
                      comprador: { select: { email: true, nombre: true, apellidos: true } },
                    },
                  },
                },
              });
              const c = match?.pedido?.comprador;
              if (match && c) {
                const ivaRate = 1.21;
                const importe = Number(match.comisionEstimada ?? 0) * ivaRate;
                await prisma.pendingRefund.upsert({
                  where: { stripeChargeId: paymentIntentId },
                  create: {
                    matchId,
                    stripeChargeId: paymentIntentId,
                    motivo: `Webhook tras revert/caducidad — contratoEstado=${match.contratoEstado}: ${err instanceof Error ? err.message : 'unknown'}`.slice(0, 1000),
                    compradorEmail: c.email,
                    compradorNombre: `${c.nombre} ${c.apellidos}`.trim(),
                    importeEur: importe,
                  },
                  update: {}, // idempotente — la primera entrada gana
                });
              }
            } catch (refundErr) {
              console.error('[stripe] failed to enqueue PendingRefund for match', matchId, refundErr);
            }
          }
        } else if (session.mode === 'payment' && session.metadata?.matchId) {
          // Legacy v1 (pago seguro) flow — captures the full mercancía amount.
          const piId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;
          if (piId) {
            await prisma.transaccion.updateMany({
              where: { match: { id: session.metadata.matchId } },
              data: { stripePaymentIntentId: piId, estado: 'PAGO_CAPTURADO' },
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        const { subscriptionService } = await import('../subscriptions/subscription.service.js');
        await subscriptionService.handleSubscriptionWebhook(event);
        break;
      }

      default:
        break;
    }
  }

  /**
   * Phase 4 — Stripe Checkout for the platform commission paid by the buyer.
   * Pre-requisites:
   *   - Match is in PENDIENTE_PAGO_COMPRADOR (seller already signed)
   *   - Buyer hits "Firmar y pagar" → posts their signature → we put it
   *     in session metadata so the webhook can persist it atomically with
   *     the payment confirmation.
   *
   * Returns the Checkout Session URL the frontend redirects to.
   */
  async createCommissionCheckoutForMatch(
    matchId: string,
    buyerId: string,
    buyerSignature: string,
    buyerIp: string | null,
  ): Promise<{ url: string }> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        lote: { include: { producto: true } },
        pedido: { select: { id: true, compradorId: true } },
        transaccion: {
          select: {
            id: true,
            comisionPagadaEn: true,
            comisionStripeSessionId: true,
          },
        },
      },
    });
    if (!match) throw new AppError('Match no encontrado', 404);
    if (match.pedido.compradorId !== buyerId) {
      throw new AppError('No autorizado', 403);
    }
    // CRITICAL: We MUST have a transaccion before talking to Stripe. Without
    // it the session ID can't be persisted (no row to write to) so duplicate
    // clicks would create N Stripe sessions, AND the webhook would fail at
    // signMatchContractAsBuyerAfterPayment with 'No existe transacción para
    // este match'. Bail out early — the seller-sign path always creates the
    // transaccion, but defense in depth.
    if (!match.transaccion?.id) {
      throw new AppError(
        'El contrato aún no está listo. Recarga la página en unos segundos o contacta con soporte.',
        409,
      );
    }
    if (match.contratoEstado === 'FIRMADO' || match.transaccion?.comisionPagadaEn) {
      throw new AppError('La comisión ya está pagada', 400);
    }
    if (match.contratoEstado !== 'PENDIENTE_PAGO_COMPRADOR') {
      throw new AppError(
        match.contratoEstado === 'CADUCADO'
          ? 'El plazo de firma del vendedor ha caducado. Pide al vendedor volver a firmar.'
          : 'El vendedor todavía no ha firmado el contrato',
        400,
      );
    }
    if (match.firmaVendedorDeadline && match.firmaVendedorDeadline.getTime() < Date.now()) {
      // Mark caducado now so the UI is consistent.
      await prisma.match.update({
        where: { id: matchId },
        data: { contratoEstado: 'CADUCADO' },
      });
      throw new AppError('El plazo de firma del vendedor ha caducado', 410);
    }

    // Anti double-charge: if we already created a Checkout Session for this
    // match and it's still "open" (not paid, not expired), reuse its URL.
    // This protects against the race where the user clicks "Firmar y pagar"
    // twice — e.g. webhook is slow, polling expires, button reappears, user
    // clicks again. Without this we'd create a second session and Stripe
    // could charge both. Stripe sessions live ~24h.
    const existingSessionId = match.transaccion?.comisionStripeSessionId;
    if (existingSessionId) {
      try {
        const existing = await stripe.checkout.sessions.retrieve(existingSessionId);
        if (existing.status === 'open' && existing.url) {
          // Reuse — the buyer can complete the pending payment with this URL.
          return { url: existing.url };
        }
        // If 'complete' but webhook hasn't fired yet, also reject — we don't
        // want a second checkout while the first is finalizing.
        if (existing.status === 'complete' && existing.payment_status === 'paid') {
          throw new AppError(
            'El pago ya se completó. Refresca la página en unos segundos para ver el contrato firmado.',
            409,
          );
        }
        // Session expired or unpaid → fall through to create a new one.
      } catch (err) {
        if (err instanceof AppError) throw err;
        console.warn('[stripe] could not retrieve previous session', existingSessionId, err);
        // Fall through — create a fresh session.
      }
    }

    const comisionImporte = Number(match.comisionEstimada ?? 0);
    if (comisionImporte <= 0) {
      throw new AppError('Comisión no calculada para este contrato', 500);
    }
    const ivaPercent = 0.21;
    const importeIva = Math.round(comisionImporte * ivaPercent * 100); // cents
    const importeBase = Math.round(comisionImporte * 100); // cents
    const totalCents = importeBase + importeIva;

    const productoNombre = match.lote.producto?.nombre ?? 'Operación';
    const refOrden = match.pedido.id.slice(-6).toUpperCase();

    // Phase 11 — race protection against the hourly expireSellerSignatures
    // cron. There can be seconds between the initial deadline check and the
    // Stripe API call; if the cron flips CADUCADO mid-flight, we'd charge a
    // commission for a contract the seller's signature is about to vanish.
    // Re-read the match state just before Stripe-API to minimise the window.
    const recheck = await prisma.match.findUnique({
      where: { id: matchId },
      select: { contratoEstado: true, firmaVendedorDeadline: true },
    });
    if (!recheck || recheck.contratoEstado !== 'PENDIENTE_PAGO_COMPRADOR') {
      throw new AppError(
        'El contrato cambió de estado mientras se preparaba el pago. Recarga la página.',
        409,
      );
    }
    if (recheck.firmaVendedorDeadline && recheck.firmaVendedorDeadline.getTime() < Date.now()) {
      await prisma.match.update({
        where: { id: matchId },
        data: { contratoEstado: 'CADUCADO' },
      });
      throw new AppError('El plazo de firma del vendedor ha caducado', 410);
    }

    // Phase 12 — idempotency_key based on matchId + a salt of the current
    // comisionEstimada. If the DB write of comisionStripeSessionId fails after
    // Stripe creates the session, a retry would otherwise create a new
    // session (orphan). With idempotency_key Stripe replays the same
    // response and we re-persist the existing session ID. The salt ensures
    // a NEW session is created when the commission changes (post-negotiation).
    const idempotencyKey = `match-checkout:${matchId}:${Math.round(comisionImporte * 100)}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: totalCents,
            product_data: {
              name: `Comisión Primar-IA — Pedido #${refOrden}`,
              description: `Servicio de intermediación para la operación de ${productoNombre}. Incluye 21% IVA.`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        kind: 'match_commission',
        matchId,
        buyerSignature,
        buyerIp: buyerIp ?? '',
      },
      // Frontend will poll the contract info endpoint to know when webhook
      // has fired and contract is FIRMADO.
      success_url: `${env.CORS_ORIGIN}/buyer/contracts/${matchId}?paid=1`,
      cancel_url: `${env.CORS_ORIGIN}/buyer/contracts/${matchId}?cancelled=1`,
    }, { idempotencyKey });
    if (!session.url) throw new AppError('Stripe no devolvió URL', 500);
    // Persist session id so a duplicate POST reuses this same Checkout.
    // Guaranteed to have a transaccion thanks to the early guard above.
    await prisma.transaccion.update({
      where: { id: match.transaccion.id },
      data: { comisionStripeSessionId: session.id },
    });
    return { url: session.url };
  }
}

export const stripeService = new StripeService();
