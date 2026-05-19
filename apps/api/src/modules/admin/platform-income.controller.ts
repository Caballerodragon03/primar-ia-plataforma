/**
 * Phase 14I — Ingresos propios de la plataforma para presentar a Hacienda.
 *
 * Listado de las dos fuentes de ingresos de Primar-IA:
 *   1. Comisiones cobradas a compradores al firmar contrato (Transaccion
 *      con comisionPagadaEn != null + comisionStripeChargeId).
 *   2. Suscripciones mensuales de vendedores/compradores Pro
 *      (Suscripcion ACTIVA con stripeSubscriptionId).
 *
 * Para cada comisión devolvemos la factura-comision-*.pdf que ya generamos
 * al firmar (campo Transaccion.facturaPlataformaUrl). Para las suscripciones
 * la facturación recurrente la emite Stripe directamente — exponemos el
 * stripeSubscriptionId para que el admin la consulte en el dashboard de
 * Stripe.
 */
import type { Request, Response } from 'express';
import { prisma } from '@primaria/database';
import { PLAN_LIMITS } from '../subscriptions/subscription.constants.js';

function startOfMonth(d = new Date()): Date {
  const x = new Date(d);
  x.setUTCDate(1);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
function startOfYear(d = new Date()): Date {
  const x = new Date(d);
  x.setUTCMonth(0, 1);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export async function listPlatformIncome(_req: Request, res: Response): Promise<void> {
  // ─── Comisiones ──────────────────────────────────────────────────────────
  const comisiones = await prisma.transaccion.findMany({
    where: { comisionPagadaEn: { not: null } },
    select: {
      id: true,
      matchId: true,
      comisionPlataforma: true,
      comisionPorcentaje: true,
      comisionStripeChargeId: true,
      comisionPagadaEn: true,
      facturaPlataformaUrl: true,
      precioTotal: true,
      cantidadKg: true,
      comprador: { select: { id: true, email: true, empresa: { select: { razonSocial: true, cifNif: true } } } },
      vendedor: { select: { id: true, email: true, empresa: { select: { razonSocial: true, cifNif: true } } } },
    },
    orderBy: { comisionPagadaEn: 'desc' },
    take: 500,
  });

  const now = new Date();
  const mes0 = startOfMonth(now);
  const ano0 = startOfYear(now);

  let totalMes = 0;
  let totalAno = 0;
  let totalHistorico = 0;
  for (const c of comisiones) {
    const importe = Number(c.comisionPlataforma);
    totalHistorico += importe;
    if (c.comisionPagadaEn && c.comisionPagadaEn >= ano0) totalAno += importe;
    if (c.comisionPagadaEn && c.comisionPagadaEn >= mes0) totalMes += importe;
  }

  // ─── Suscripciones ───────────────────────────────────────────────────────
  const suscripciones = await prisma.suscripcion.findMany({
    where: {
      stripeSubscriptionId: { not: null },
      estado: { in: ['ACTIVA', 'TRIAL', 'PAUSADA'] },
    },
    select: {
      id: true,
      userId: true,
      planVendedor: true,
      planComprador: true,
      stripeSubscriptionId: true,
      stripeCustomerId: true,
      estado: true,
      fechaInicio: true,
      trialEndsAt: true,
      cancelledAt: true,
      user: { select: { email: true, role: true, empresa: { select: { razonSocial: true, cifNif: true } } } },
    },
    orderBy: { fechaInicio: 'desc' },
  });

  let mrrTotalCents = 0;
  let activasCount = 0;
  const items = suscripciones.map((s) => {
    const plan = s.planVendedor ?? s.planComprador;
    const tipo: 'vendedor' | 'comprador' = s.planVendedor ? 'vendedor' : 'comprador';
    const precioCents = plan ? PLAN_LIMITS[plan].precio : 0;
    if (s.estado === 'ACTIVA') {
      mrrTotalCents += precioCents;
      activasCount += 1;
    }
    return {
      id: s.id,
      userId: s.userId,
      email: s.user.email,
      empresa: s.user.empresa?.razonSocial ?? null,
      nif: s.user.empresa?.cifNif ?? null,
      plan,
      tipo,
      precioMensual: precioCents / 100,
      estado: s.estado,
      stripeSubscriptionId: s.stripeSubscriptionId,
      stripeCustomerId: s.stripeCustomerId,
      fechaInicio: s.fechaInicio.toISOString(),
      trialEndsAt: s.trialEndsAt?.toISOString() ?? null,
      cancelledAt: s.cancelledAt?.toISOString() ?? null,
    };
  });

  res.json({
    success: true,
    data: {
      comisiones: {
        items: comisiones.map((c) => ({
          id: c.id,
          matchId: c.matchId,
          fecha: c.comisionPagadaEn?.toISOString() ?? null,
          comprador: {
            email: c.comprador.email,
            empresa: c.comprador.empresa?.razonSocial ?? null,
            nif: c.comprador.empresa?.cifNif ?? null,
          },
          vendedor: {
            email: c.vendedor.email,
            empresa: c.vendedor.empresa?.razonSocial ?? null,
          },
          importe: Number(c.comisionPlataforma),
          porcentaje: Number(c.comisionPorcentaje),
          baseImponible: Number(c.precioTotal),
          cantidadKg: Number(c.cantidadKg),
          stripeChargeId: c.comisionStripeChargeId,
          facturaUrl: c.facturaPlataformaUrl,
        })),
        totalMes,
        totalAno,
        totalHistorico,
        count: comisiones.length,
      },
      suscripciones: {
        items,
        mrrTotal: mrrTotalCents / 100,
        activasCount,
        count: suscripciones.length,
      },
    },
  });
}
