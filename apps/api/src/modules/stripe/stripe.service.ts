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
        if (session.mode === 'subscription') {
          const { subscriptionService } = await import('../subscriptions/subscription.service.js');
          await subscriptionService.handleSubscriptionWebhook(event);
        } else if (session.mode === 'payment' && session.metadata?.matchId) {
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
}

export const stripeService = new StripeService();
