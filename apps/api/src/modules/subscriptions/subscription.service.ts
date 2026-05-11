import Stripe from 'stripe';
import { prisma } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';
import { env } from '../../config/env.js';
import {
  PLAN_LIMITS,
  VENDEDOR_PLANS,
  COMPRADOR_PLANS,
  type AnyPlan,
  type VendedorPlan,
  type CompradorPlan,
} from './subscription.constants.js';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });

export class SubscriptionService {
  // ─── Plan resolution ─────────────────────────────────────────────────────

  async getPlanForUser(userId: string): Promise<AnyPlan> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, suscripcion: { select: { planVendedor: true, planComprador: true, estado: true } } },
    });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const sub = user.suscripcion;
    if (sub && (sub.estado === 'ACTIVA' || sub.estado === 'TRIAL')) {
      if (user.role === 'VENDEDOR' && sub.planVendedor) return sub.planVendedor as VendedorPlan;
      if (user.role === 'COMPRADOR' && sub.planComprador) return sub.planComprador as CompradorPlan;
    }

    // Free tier defaults
    return user.role === 'VENDEDOR' ? 'COSECHA' : 'MERCADO';
  }

  async getLimitsForUser(userId: string) {
    const plan = await this.getPlanForUser(userId);
    return { plan, limits: PLAN_LIMITS[plan] };
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const sub = await prisma.suscripcion.findUnique({ where: { userId } });
    return !!sub && (sub.estado === 'ACTIVA' || sub.estado === 'TRIAL') && !!sub.stripeSubscriptionId;
  }

  // ─── Quota checks ────────────────────────────────────────────────────────

  async checkCanCreateLot(userId: string): Promise<void> {
    const { plan, limits } = await this.getLimitsForUser(userId);
    if (!('maxLotesActivos' in limits)) {
      throw new AppError('Tu plan de comprador no permite crear lotes', 403);
    }

    const count = await prisma.lote.count({
      where: {
        vendedorId: userId,
        estado: { in: ['ACTIVO', 'PARCIALMENTE_VENDIDO'] },
      },
    });

    if (count >= limits.maxLotesActivos) {
      throw new AppError(
        `Has alcanzado el limite de ${limits.maxLotesActivos} lotes activos en el plan ${plan}. Mejora tu plan para publicar mas.`,
        403,
      );
    }
  }

  async checkCanCreateOrder(userId: string): Promise<void> {
    const { plan, limits } = await this.getLimitsForUser(userId);
    if (!('maxPedidosActivos' in limits)) {
      throw new AppError('Tu plan de vendedor no permite crear pedidos', 403);
    }

    const count = await prisma.pedido.count({
      where: {
        compradorId: userId,
        estado: { in: ['ACTIVO', 'PARCIALMENTE_CUBIERTO'] },
      },
    });

    if (count >= (limits as { maxPedidosActivos: number }).maxPedidosActivos) {
      throw new AppError(
        `Has alcanzado el limite de ${(limits as { maxPedidosActivos: number }).maxPedidosActivos} pedidos activos en el plan ${plan}. Mejora tu plan para crear mas.`,
        403,
      );
    }
  }

  // ─── Stripe Checkout ─────────────────────────────────────────────────────

  async createCheckoutSession(userId: string, plan: 'CAMPO' | 'FINCA' | 'LONJA' | 'CENTRAL'): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, suscripcion: true },
    });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    // Validate plan matches role
    if (user.role === 'VENDEDOR' && !VENDEDOR_PLANS.includes(plan as VendedorPlan)) {
      throw new AppError('Plan no valido para vendedores', 400);
    }
    if (user.role === 'COMPRADOR' && !COMPRADOR_PLANS.includes(plan as CompradorPlan)) {
      throw new AppError('Plan no valido para compradores', 400);
    }

    const priceId = PLAN_LIMITS[plan].stripePriceId;
    if (!priceId) throw new AppError('Precio de Stripe no configurado para este plan', 500);

    // Get or create Stripe customer
    let stripeCustomerId = user.suscripcion?.stripeCustomerId ?? null;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;

      await prisma.suscripcion.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          stripeCustomerId,
          estado: 'PENDIENTE',
          fechaInicio: new Date(),
        },
        update: { stripeCustomerId },
      });
    }

    const roleSegment = user.role === 'VENDEDOR' ? 'seller' : 'buyer';
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.CORS_ORIGIN}/${roleSegment}/subscription?success=true`,
      cancel_url: `${env.CORS_ORIGIN}/${roleSegment}/subscription?cancelled=true`,
      metadata: { userId: user.id, plan },
    });

    if (!session.url) throw new AppError('No se pudo crear la sesion de pago', 500);
    return session.url;
  }

  // ─── Customer Portal ─────────────────────────────────────────────────────

  async createCustomerPortalSession(userId: string): Promise<string> {
    const sub = await prisma.suscripcion.findUnique({ where: { userId } });
    if (!sub?.stripeCustomerId) {
      throw new AppError('No tienes una suscripcion activa', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const roleSegment = user?.role === 'VENDEDOR' ? 'seller' : 'buyer';

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${env.CORS_ORIGIN}/${roleSegment}/subscription`,
    });

    return session.url;
  }

  // ─── Cancel ──────────────────────────────────────────────────────────────

  async cancelSubscription(userId: string): Promise<void> {
    const sub = await prisma.suscripcion.findUnique({ where: { userId } });
    if (!sub?.stripeSubscriptionId) {
      throw new AppError('No tienes una suscripcion activa para cancelar', 400);
    }

    // Cancel at period end so user keeps access until billing period ends
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await prisma.suscripcion.update({
      where: { userId },
      data: { cancelledAt: new Date() },
    });
  }

  // ─── Webhook handler ─────────────────────────────────────────────────────

  async handleSubscriptionWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') return;

        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as AnyPlan | undefined;
        if (!userId || !plan) return;

        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription as Stripe.Subscription | null)?.id ?? null;

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
        if (!user) return;

        await prisma.suscripcion.upsert({
          where: { userId },
          create: {
            userId,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.toString() ?? null,
            stripePriceId: PLAN_LIMITS[plan].stripePriceId,
            estado: 'ACTIVA',
            fechaInicio: new Date(),
            ...(user.role === 'VENDEDOR'
              ? { planVendedor: plan as VendedorPlan }
              : { planComprador: plan as CompradorPlan }),
          },
          update: {
            stripeSubscriptionId: subscriptionId,
            stripePriceId: PLAN_LIMITS[plan].stripePriceId,
            estado: 'ACTIVA',
            cancelledAt: null,
            ...(user.role === 'VENDEDOR'
              ? { planVendedor: plan as VendedorPlan, planComprador: null }
              : { planComprador: plan as CompradorPlan, planVendedor: null }),
          },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const dbSub = await prisma.suscripcion.findUnique({
          where: { stripeSubscriptionId: sub.id },
        });
        if (!dbSub) return;

        const estado = sub.status === 'active' ? 'ACTIVA'
          : sub.status === 'trialing' ? 'TRIAL'
          : sub.status === 'canceled' ? 'CANCELADA'
          : sub.status === 'paused' ? 'PAUSADA'
          : 'ACTIVA';

        await prisma.suscripcion.update({
          where: { stripeSubscriptionId: sub.id },
          data: {
            estado,
            cancelledAt: sub.cancel_at_period_end ? new Date() : null,
            fechaFin: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.suscripcion.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            estado: 'CANCELADA',
            cancelledAt: new Date(),
            fechaFin: new Date(),
          },
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : (invoice.subscription as Stripe.Subscription | null)?.id ?? null;
        if (!subscriptionId) return;

        await prisma.suscripcion.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { estado: 'PAUSADA' },
        });
        break;
      }

      default:
        // Unhandled event types are silently ignored
        break;
    }
  }

  // ─── Usage stats ─────────────────────────────────────────────────────────

  async getUsage(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const { plan, limits } = await this.getLimitsForUser(userId);

    if (user.role === 'VENDEDOR') {
      const lotesActivos = await prisma.lote.count({
        where: { vendedorId: userId, estado: { in: ['ACTIVO', 'PARCIALMENTE_VENDIDO'] } },
      });
      const vendedorLimits = limits as typeof PLAN_LIMITS.COSECHA;
      return {
        plan,
        badge: vendedorLimits.badge,
        lotesActivos,
        maxLotes: vendedorLimits.maxLotesActivos === Infinity ? -1 : vendedorLimits.maxLotesActivos,
        pedidosActivos: null,
        maxPedidos: null,
      };
    }

    const pedidosActivos = await prisma.pedido.count({
      where: { compradorId: userId, estado: { in: ['ACTIVO', 'PARCIALMENTE_CUBIERTO'] } },
    });
    const compradorLimits = limits as typeof PLAN_LIMITS.MERCADO;
    return {
      plan,
      badge: compradorLimits.badge,
      lotesActivos: null,
      maxLotes: null,
      pedidosActivos,
      maxPedidos: compradorLimits.maxPedidosActivos === Infinity ? -1 : compradorLimits.maxPedidosActivos,
    };
  }

  // ─── Commission discount ─────────────────────────────────────────────────

  async getComisionDiscount(userId: string): Promise<number> {
    const { limits } = await this.getLimitsForUser(userId);
    if ('descuentoComision' in limits) {
      return (limits as typeof PLAN_LIMITS.MERCADO).descuentoComision;
    }
    return 0;
  }
}

export const subscriptionService = new SubscriptionService();
