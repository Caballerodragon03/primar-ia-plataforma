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

  async createPaymentIntent(
    compradorId: string,
    matchId: string,
    metodoPago: 'card' | 'sepa_debit',
  ): Promise<{ clientSecret: string; transaccionId: string; totalAmount: number }> {
    // Wrap the check-and-create in a serializable transaction to prevent
    // duplicate PaymentIntents from concurrent requests.
    const result = await prisma.$transaction(async (tx) => {
      // 1. Load Match with Lote (vendedor empresa) and Pedido
      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: {
          lote: {
            include: {
              vendedor: {
                include: { empresa: true },
              },
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
      // Only reject if a Stripe PaymentIntent has already been created for this match.
      // The matching service auto-creates a Transaccion (no PI) when a seller accepts,
      // to enable chat — we must allow upgrading that placeholder to a real payment.
      if (match.transaccion?.stripePaymentIntentId) {
        throw new AppError('Ya existe una transacción para este match', 409);
      }

      // 2. Compute total
      const cantidadKg = Number(match.cantidadKg);
      const precioKg = Number(match.precioKg);
      const total = cantidadKg * precioKg;

      // 3. Compute comision
      const comision = calcularComision(total, metodoPago);

      // 4. Vendedor empresa -> stripeAccountId (optional in test/dev)
      const vendedorEmpresa = match.lote.vendedor.empresa;
      const sellerReady =
        vendedorEmpresa?.stripeAccountId && vendedorEmpresa.stripeOnboardingDone;

      // 5. Create Stripe PaymentIntent (pre-auth / manual capture)
      const paymentMethodTypes: string[] =
        metodoPago === 'sepa_debit' ? ['sepa_debit'] : ['card'];

      const intentParams: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(total * 100), // cents
        currency: 'eur',
        capture_method: 'manual',
        payment_method_types: paymentMethodTypes,
        metadata: {
          matchId,
          compradorId,
          vendedorId: match.lote.vendedorId,
        },
      };

      // Only route to seller Connect account if onboarding is complete
      if (sellerReady) {
        intentParams.application_fee_amount = Math.round(comision.total * 100);
        intentParams.transfer_data = {
          destination: vendedorEmpresa!.stripeAccountId!,
        };
      }

      const intent = await stripe.paymentIntents.create(intentParams);

      // 6. Upsert Transaccion record.
      // If the matching service already created a placeholder Transaccion (no PI),
      // update it. Otherwise create a fresh record.
      const txPayload = {
        stripePaymentIntentId: intent.id,
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

      // 7. Update Pedido.stripePaymentIntentId and advance match estado
      await Promise.all([
        tx.pedido.update({
          where: { id: match.pedidoId },
          data: { stripePaymentIntentId: intent.id },
        }),
        tx.match.update({
          where: { id: matchId },
          data: { estado: 'PENDIENTE_PAGO' },
        }),
      ]);

      return {
        clientSecret: intent.client_secret!,
        transaccionId: transaccion.id,
        totalAmount: total,
        // Pass data needed for email notification outside the transaction
        _emailContext: {
          pedidoId: match.pedidoId,
          productoId: match.lote.productoId,
          total,
        },
      };
    }, { isolationLevel: 'Serializable' });

    // 8. Notify buyer of order confirmation (non-blocking, outside transaction)
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
      clientSecret: result.clientSecret,
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

      case 'checkout.session.completed':
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
