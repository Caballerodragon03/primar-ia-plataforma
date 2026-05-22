import { Request, Response } from 'express';
import { lotsService } from './lots.service.js';
import { createLotSchema, updateLotSchema } from './lots.schema.js';
import { AppError } from '../../middleware/error.middleware.js';
import { prisma } from '@primaria/database';

export async function createLot(req: Request, res: Response): Promise<void> {
  const data = createLotSchema.parse(req.body);
  const lot = await lotsService.create(req.user!.sub, data);
  res.status(201).json({ success: true, data: lot });
}

export async function listLots(req: Request, res: Response): Promise<void> {
  const tab = req.query.tab as string | undefined;
  const lots = await lotsService.listByVendedor(req.user!.sub, tab);
  res.json({ success: true, data: lots });
}

export async function getLot(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const lot = await lotsService.getById(id, req.user!.sub);
  res.json({ success: true, data: lot });
}

export async function updateLot(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const data = updateLotSchema.parse(req.body);
  const lot = await lotsService.update(id, req.user!.sub, data);
  res.json({ success: true, data: lot });
}

export async function cancelLot(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const result = await lotsService.cancel(id, req.user!.sub);
  const message = result.partialCancel
    ? 'El lote ha sido cerrado parcialmente. Las contribuciones ya comprometidas se mantienen y el lote se guarda como completado con la cantidad comprometida.'
    : 'Lote cancelado';
  res.json({ success: true, message, data: result });
}

/**
 * Phase 14M v3.33 — listado ligero de lotes activos del vendedor con un
 * producto+variedad concretos. Usado por /seller/lots/new para sugerir
 * editar uno existente en lugar de crear un duplicado.
 */
export async function listExistingByProduct(req: Request, res: Response): Promise<void> {
  const productoId = typeof req.query['productoId'] === 'string' ? req.query['productoId'] : '';
  const variedadId = typeof req.query['variedadId'] === 'string' ? req.query['variedadId'] : null;
  if (!productoId) throw new AppError('productoId requerido', 400);
  const lots = await lotsService.listExistingByProduct(req.user!.sub, productoId, variedadId);
  res.json({ success: true, data: lots });
}

export async function getAnalytics(req: Request, res: Response): Promise<void> {
  const vendedorId = req.user!.sub;

  // All lots for this seller
  const lots = await prisma.lote.findMany({
    where: { vendedorId },
    include: {
      producto: { select: { nombre: true } },
      matches: {
        where: { estado: { in: ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'] } },
        select: { cantidadKg: true, precioKg: true, createdAt: true },
      },
    },
  });

  // Total volume matched and total value
  let totalVolumen = 0;
  let totalValor = 0;
  const productMap: Record<string, number> = {};
  const monthMap: Record<string, number> = {};

  for (const lot of lots) {
    const nombre = lot.producto.nombre;
    for (const m of lot.matches) {
      const kg = Number(m.cantidadKg);
      const valor = kg * Number(m.precioKg);
      totalVolumen += kg;
      totalValor += valor;

      // by product
      productMap[nombre] = (productMap[nombre] ?? 0) + kg;

      // by month
      const key = new Date(m.createdAt).toLocaleString('es-ES', { month: 'short', year: '2-digit' });
      monthMap[key] = (monthMap[key] ?? 0) + kg;
    }
  }

  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([product, kg]) => ({ product, kg }));

  // Build last 12 months timeline (oldest → newest)
  const now = new Date();
  const volumeOverTime: { month: string; kg: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
    const label = d.toLocaleString('es-ES', { month: 'short' });
    volumeOverTime.push({ month: label, kg: monthMap[key] ?? 0 });
  }

  // KPIs
  const activeLots = lots.filter((l) => l.estado === 'ACTIVO').length;
  const soldLots = lots.filter((l) => l.estado === 'VENDIDO').length;
  const avgValue = totalVolumen > 0 ? totalValor / totalVolumen : 0;

  res.json({
    success: true,
    data: {
      totalVolumen: Math.round(totalVolumen),
      totalValor: Number(totalValor.toFixed(2)),
      avgPrecioKg: Number(avgValue.toFixed(3)),
      activeLots,
      soldLots,
      totalLots: lots.length,
      topProducts,
      volumeOverTime,
    },
  });
}
