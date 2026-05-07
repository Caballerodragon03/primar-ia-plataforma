import { Request, Response, NextFunction } from 'express';
import { prisma } from '@primaria/database';
import { AppError } from './error.middleware.js';
import { PLAN_LIMITS } from '../modules/subscriptions/subscription.constants.js';
import type { VendedorPlan, CompradorPlan } from '../modules/subscriptions/subscription.constants.js';

type LimitType = 'lot' | 'order';

async function getUserPlan(userId: string): Promise<string> {
  const sub = await prisma.suscripcion.findUnique({
    where: { userId },
    select: { planVendedor: true, planComprador: true, estado: true },
  });
  if (!sub || sub.estado !== 'ACTIVA') {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    return user?.role === 'VENDEDOR' ? 'COSECHA' : 'MERCADO';
  }
  return (sub.planVendedor ?? sub.planComprador ?? 'COSECHA') as string;
}

export function requirePlanLimit(type: LimitType) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('No autorizado', 401);
      const plan = await getUserPlan(req.user.sub);
      const limits = PLAN_LIMITS[plan as VendedorPlan | CompradorPlan];
      if (!limits) return next();

      if (type === 'lot') {
        const sellerLimits = limits as typeof PLAN_LIMITS.COSECHA;
        if (sellerLimits.maxLotesActivos === Infinity) return next();
        const count = await prisma.lote.count({
          where: { vendedorId: req.user.sub, estado: { in: ['ACTIVO', 'PARCIALMENTE_VENDIDO'] } },
        });
        if (count >= sellerLimits.maxLotesActivos) {
          throw new AppError(
            `Has alcanzado el límite de ${sellerLimits.maxLotesActivos} lotes activos de tu plan. Mejora tu plan para publicar más.`,
            403
          );
        }
      } else if (type === 'order') {
        const buyerLimits = limits as typeof PLAN_LIMITS.MERCADO;
        if (buyerLimits.maxPedidosActivos === Infinity) return next();
        const count = await prisma.pedido.count({
          where: { compradorId: req.user.sub, estado: { in: ['ACTIVO', 'PARCIALMENTE_CUBIERTO'] } },
        });
        if (count >= buyerLimits.maxPedidosActivos) {
          throw new AppError(
            `Has alcanzado el límite de ${buyerLimits.maxPedidosActivos} pedidos activos de tu plan. Mejora tu plan para crear más.`,
            403
          );
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
