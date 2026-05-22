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

  // ─── Free-tier creation credits (token bucket) ───────────────────────────
  // Free users get 3 creation credits. After using one, 1 credit regenerates per
  // week (up to a max of 3). Paid users bypass this check entirely.

  static readonly CREDITS_MAX = 3;
  static readonly CREDITS_REGEN_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

  /**
   * Lazily regenerates credits based on time elapsed since proximaRegeneracion.
   * Returns the updated credit state.
   */
  private async regenerateCreditsIfDue(userId: string): Promise<{ creditos: number; proxima: Date | null }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditosCreacion: true, proximaRegeneracionCredito: true },
    });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    let creditos = user.creditosCreacion;
    let proxima = user.proximaRegeneracionCredito;
    const now = new Date();

    // Regenerate credits while past the regen tick and below cap
    while (proxima && now >= proxima && creditos < SubscriptionService.CREDITS_MAX) {
      creditos += 1;
      if (creditos >= SubscriptionService.CREDITS_MAX) {
        proxima = null; // At cap, stop the clock
      } else {
        proxima = new Date(proxima.getTime() + SubscriptionService.CREDITS_REGEN_MS);
      }
    }

    if (creditos !== user.creditosCreacion || proxima !== user.proximaRegeneracionCredito) {
      await prisma.user.update({
        where: { id: userId },
        data: { creditosCreacion: creditos, proximaRegeneracionCredito: proxima },
      });
    }

    return { creditos, proxima };
  }

  /**
   * Returns the current credit state (after lazy regen). Used by the UI for countdown.
   */
  async getCredits(userId: string): Promise<{ available: number; max: number; nextRegenAt: Date | null; isFreeTier: boolean }> {
    const plan = await this.getPlanForUser(userId);
    const isFreeTier = plan === 'COSECHA' || plan === 'MERCADO';
    const { creditos, proxima } = await this.regenerateCreditsIfDue(userId);
    return {
      available: creditos,
      max: SubscriptionService.CREDITS_MAX,
      nextRegenAt: proxima,
      isFreeTier,
    };
  }

  /**
   * Consumes 1 credit for a free-tier user. Throws if no credits available.
   * No-op for paid users.
   *
   * Race-safe: regen + decrement happen inside a single transaction with an
   * atomic `updateMany({ where: creditosCreacion > 0, decrement })` so two
   * concurrent calls cannot both pass the guard with the same stale value.
   */
  private async consumeCredit(userId: string): Promise<void> {
    // All reads (plan + credit state) and writes (regen + decrement + clock
    // bump) happen inside one Serializable transaction so:
    //   - a plan upgrade between the plan read and the decrement can't cause
    //     a spurious deduction on a now-paid account;
    //   - the regen-clock bump is atomic with the decrement (no post-commit
    //     bare write that could be overwritten by a concurrent spend).
    await prisma.$transaction(async (tx) => {
      const userWithSub = await tx.user.findUnique({
        where: { id: userId },
        select: {
          creditosCreacion: true,
          proximaRegeneracionCredito: true,
          role: true,
          suscripcion: { select: { planVendedor: true, planComprador: true, estado: true } },
        },
      });
      if (!userWithSub) throw new AppError('Usuario no encontrado', 404);

      // Paid-user bypass (inlined plan lookup so we never touch a stale plan)
      const sub = userWithSub.suscripcion;
      const isActiveSub = sub && (sub.estado === 'ACTIVA' || sub.estado === 'TRIAL');
      if (isActiveSub) {
        const planKey =
          userWithSub.role === 'VENDEDOR' ? sub.planVendedor : sub.planComprador;
        if (planKey && planKey !== 'COSECHA' && planKey !== 'MERCADO') return;
      }

      // 1) Lazy regen
      let creditos = userWithSub.creditosCreacion;
      let proxima = userWithSub.proximaRegeneracionCredito;
      const now = new Date();

      while (proxima && now >= proxima && creditos < SubscriptionService.CREDITS_MAX) {
        creditos += 1;
        if (creditos >= SubscriptionService.CREDITS_MAX) {
          proxima = null;
        } else {
          proxima = new Date(proxima.getTime() + SubscriptionService.CREDITS_REGEN_MS);
        }
      }

      const atCapBeforeSpend = creditos >= SubscriptionService.CREDITS_MAX;

      if (creditos !== userWithSub.creditosCreacion || proxima !== userWithSub.proximaRegeneracionCredito) {
        await tx.user.update({
          where: { id: userId },
          data: { creditosCreacion: creditos, proximaRegeneracionCredito: proxima },
        });
      }

      // 2) Atomic decrement guarded by `creditosCreacion > 0`
      const result = await tx.user.updateMany({
        where: { id: userId, creditosCreacion: { gt: 0 } },
        data: { creditosCreacion: { decrement: 1 } },
      });

      if (result.count === 0) {
        // No credit available — surface the next regen time
        const nextUser = await tx.user.findUnique({
          where: { id: userId },
          select: { proximaRegeneracionCredito: true },
        });
        const next = nextUser?.proximaRegeneracionCredito;
        const hoursLeft = next ? Math.ceil((next.getTime() - Date.now()) / (60 * 60 * 1000)) : 0;
        throw new AppError(
          `No tienes créditos de creación disponibles. El próximo crédito se desbloquea en ~${hoursLeft}h. Mejora tu plan para crear sin límites.`,
          403,
        );
      }

      // 3) If we just dropped from cap → cap-1, start the regen clock here
      //    (inside the tx so no concurrent spend can overwrite it).
      if (atCapBeforeSpend) {
        await tx.user.update({
          where: { id: userId },
          data: {
            proximaRegeneracionCredito: new Date(Date.now() + SubscriptionService.CREDITS_REGEN_MS),
          },
        });
      }
    }, { isolationLevel: 'Serializable' });
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

    // Free-tier creation credits (weekly token bucket)
    await this.consumeCredit(userId);
  }

  async checkCanCreateOrder(userId: string): Promise<void> {
    const { plan, limits } = await this.getLimitsForUser(userId);
    if (!('maxPedidosActivos' in limits)) {
      throw new AppError('Tu plan de vendedor no permite crear pedidos', 403);
    }

    // Phase 14K — cuenta los pedidos que realmente ocupan slot (los mismos
    // que aparecen en /subscriptions/usage). Un pedido TOTALMENTE_CUBIERTO
    // sigue contando hasta que todas sus comisiones estén cobradas.
    const pedidos = await prisma.pedido.findMany({
      where: {
        compradorId: userId,
        estado: { in: ['ACTIVO', 'PARCIALMENTE_CUBIERTO', 'TOTALMENTE_CUBIERTO'] },
      },
      select: {
        estado: true,
        matches: {
          where: { estado: { in: ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'] } },
          select: { transaccion: { select: { comisionPagadaEn: true } } },
        },
      },
    });
    const count = pedidos.reduce((n, p) => {
      if (p.estado !== 'TOTALMENTE_CUBIERTO') return n + 1;
      const pendiente = p.matches.length === 0
        || p.matches.some((m) => !m.transaccion?.comisionPagadaEn);
      return pendiente ? n + 1 : n;
    }, 0);

    if (count >= (limits as { maxPedidosActivos: number }).maxPedidosActivos) {
      throw new AppError(
        `Has alcanzado el limite de ${(limits as { maxPedidosActivos: number }).maxPedidosActivos} pedidos activos en el plan ${plan}. Mejora tu plan para crear mas.`,
        403,
      );
    }

    // Free-tier creation credits (weekly token bucket)
    await this.consumeCredit(userId);
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
      // {CHECKOUT_SESSION_ID} is substituted by Stripe at redirect. We use it
      // from the frontend to call POST /subscriptions/reconcile-checkout so
      // the new plan is reflected even if Stripe's webhook hasn't arrived yet
      // when the browser returns.
      success_url: `${env.CORS_ORIGIN}/${roleSegment}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
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

  // ─── Match visibility unhide ─────────────────────────────────────────────

  /**
   * Recompute match `visibleDesde` for a user after they upgrade to a paid
   * plan. Dynamically imports matching.service to avoid a circular dep.
   * Logs failures but never throws (this is a side-effect of subscription
   * change and shouldn't break the main flow).
   */
  async unhideMatchesForUser(userId: string): Promise<void> {
    try {
      const { matchingService } = await import('../matching/matching.service.js');
      await matchingService.recomputeMatchVisibilityForUser(userId);
    } catch (err) {
      console.error('[subscription] unhideMatchesForUser failed:', err);
    }
  }

  // ─── Webhook handler ─────────────────────────────────────────────────────

  /**
   * Applies a successful checkout.session.completed to local DB. Extracted
   * from the webhook handler so the new reconcile-checkout endpoint can
   * reuse the EXACT same upsert logic (avoids drift between webhook path
   * and on-demand reconciliation). Idempotent: safe to call twice.
   */
  private async applyCheckoutSessionToDb(session: Stripe.Checkout.Session): Promise<{ applied: boolean; userId?: string }> {
    if (session.mode !== 'subscription') return { applied: false };
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      // Not actually paid yet (e.g. user is on Stripe but webhook is stale).
      return { applied: false };
    }

    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan as AnyPlan | undefined;
    if (!userId || !plan) return { applied: false };

    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription as Stripe.Subscription | null)?.id ?? null;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) return { applied: false };

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

    // User just upgraded → unhide their delayed matches (fire-and-forget).
    void this.unhideMatchesForUser(userId);
    return { applied: true, userId };
  }

  /**
   * On-demand reconciliation. Called by the frontend right after Stripe
   * redirects back with ?success=true&session_id=…, so the new plan shows
   * up immediately even if checkout.session.completed hasn't reached us
   * yet. Verifies the session belongs to the calling user (defence
   * against IDOR via guessed session IDs) and then reuses the same upsert
   * the webhook would have run.
   */
  async reconcileFromCheckoutSession(userId: string, sessionId: string): Promise<{ reconciled: boolean; plan?: AnyPlan }> {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new AppError('session_id requerido', 400);
    }
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch {
      throw new AppError('Sesión de Stripe no encontrada', 404);
    }
    // IDOR guard: only the user who started the checkout can reconcile it.
    if (session.metadata?.userId !== userId) {
      throw new AppError('No autorizado para esta sesión', 403);
    }
    const { applied } = await this.applyCheckoutSessionToDb(session);
    const plan = session.metadata?.plan as AnyPlan | undefined;
    return { reconciled: applied, plan };
  }

  async handleSubscriptionWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.applyCheckoutSessionToDb(session);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const dbSub = await prisma.suscripcion.findUnique({
          where: { stripeSubscriptionId: sub.id },
        });
        if (!dbSub) return;

        // Map every Stripe status explicitly. Previously the default fell
        // through to 'ACTIVA' which silently granted access to past_due /
        // unpaid users (revenue leak). All non-paying states map to PAUSADA.
        const estado =
          sub.status === 'active' ? 'ACTIVA'
          : sub.status === 'trialing' ? 'TRIAL'
          : sub.status === 'canceled' ? 'CANCELADA'
          : sub.status === 'paused' ? 'PAUSADA'
          : sub.status === 'past_due' ? 'PAUSADA'
          : sub.status === 'unpaid' ? 'PAUSADA'
          : sub.status === 'incomplete' ? 'PAUSADA'
          : sub.status === 'incomplete_expired' ? 'CANCELADA'
          : 'PAUSADA'; // safe default — unknown status = no access

        const wasInactive = dbSub.estado !== 'ACTIVA' && dbSub.estado !== 'TRIAL';
        const nowActive = estado === 'ACTIVA' || estado === 'TRIAL';

        await prisma.suscripcion.update({
          where: { stripeSubscriptionId: sub.id },
          data: {
            estado,
            cancelledAt: sub.cancel_at_period_end ? new Date() : null,
            fechaFin: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          },
        });

        // Transitioned to ACTIVA/TRIAL → unhide their delayed matches
        if (wasInactive && nowActive) {
          void this.unhideMatchesForUser(dbSub.userId);
        }
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
      // Phase 14K — los lotes ocupan slot hasta que la comisión del último
      // match esté cobrada. Reflejamos eso con el desglose.
      const lotes = await prisma.lote.findMany({
        where: { vendedorId: userId, estado: { in: ['ACTIVO', 'PARCIALMENTE_VENDIDO'] } },
        select: { estado: true },
      });
      const breakdown = {
        buscando: lotes.filter((l) => l.estado === 'ACTIVO').length,
        enTrato: lotes.filter((l) => l.estado === 'PARCIALMENTE_VENDIDO').length,
      };
      const lotesActivos = breakdown.buscando + breakdown.enTrato;
      const vendedorLimits = limits as typeof PLAN_LIMITS.COSECHA;
      return {
        plan,
        badge: vendedorLimits.badge,
        lotesActivos,
        maxLotes: vendedorLimits.maxLotesActivos === Infinity ? -1 : vendedorLimits.maxLotesActivos,
        breakdownVendedor: breakdown,
        pedidosActivos: null,
        maxPedidos: null,
      };
    }

    // Phase 14K — los pedidos ocupan slot mientras estén ACTIVO,
    // PARCIALMENTE_CUBIERTO o TOTALMENTE_CUBIERTO con algún match cuya
    // comisión todavía no esté cobrada. Una vez todos los matches del
    // pedido tengan comisionPagadaEn, el slot se libera.
    const pedidos = await prisma.pedido.findMany({
      where: {
        compradorId: userId,
        estado: { in: ['ACTIVO', 'PARCIALMENTE_CUBIERTO', 'TOTALMENTE_CUBIERTO'] },
      },
      select: {
        estado: true,
        matches: {
          where: { estado: { in: ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'] } },
          select: { transaccion: { select: { comisionPagadaEn: true } } },
        },
      },
    });

    const breakdown = { buscando: 0, enTrato: 0, reservadoPendienteComision: 0 };
    let pedidosActivos = 0;
    for (const p of pedidos) {
      if (p.estado === 'ACTIVO') {
        breakdown.buscando += 1;
        pedidosActivos += 1;
        continue;
      }
      if (p.estado === 'PARCIALMENTE_CUBIERTO') {
        breakdown.enTrato += 1;
        pedidosActivos += 1;
        continue;
      }
      // TOTALMENTE_CUBIERTO: cuenta sólo si queda al menos una comisión
      // pendiente de cobro. Si todas las comisiones están pagadas, el
      // pedido ya no consume slot (entrega en curso, libre para crear otro).
      const algunaPendiente = p.matches.length === 0
        || p.matches.some((m) => !m.transaccion?.comisionPagadaEn);
      if (algunaPendiente) {
        breakdown.reservadoPendienteComision += 1;
        pedidosActivos += 1;
      }
    }

    const compradorLimits = limits as typeof PLAN_LIMITS.MERCADO;
    return {
      plan,
      badge: compradorLimits.badge,
      lotesActivos: null,
      maxLotes: null,
      pedidosActivos,
      maxPedidos: compradorLimits.maxPedidosActivos === Infinity ? -1 : compradorLimits.maxPedidosActivos,
      breakdownComprador: breakdown,
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
