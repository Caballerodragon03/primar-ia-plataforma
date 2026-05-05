import { Request, Response } from 'express';
import { ordersService } from './orders.service.js';
import { createOrderSchema, updateOrderSchema } from './orders.schema.js';
import { prisma } from '@primaria/database';

export async function createOrder(req: Request, res: Response): Promise<void> {
  const data = createOrderSchema.parse(req.body);
  const order = await ordersService.create(req.user!.sub, data);
  res.status(201).json({ success: true, data: order });
}

export async function listOrders(req: Request, res: Response): Promise<void> {
  const tab = req.query.tab as string | undefined;
  const orders = await ordersService.listByComprador(req.user!.sub, tab);
  res.json({ success: true, data: orders });
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const order = await ordersService.getById(id, req.user!.sub);
  res.json({ success: true, data: order });
}

export async function updateOrder(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const data = updateOrderSchema.parse(req.body);
  const order = await ordersService.update(id, req.user!.sub, data);
  res.json({ success: true, data: order });
}

export async function cancelOrder(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const result = await ordersService.cancel(id, req.user!.sub);
  const message = result.partialCancel
    ? 'El pedido ha sido cerrado parcialmente. Las contribuciones ya comprometidas se mantienen y el pedido se guarda como completo con la cantidad comprometida.'
    : 'Pedido cancelado';
  res.json({ success: true, message, data: result });
}

export async function getBuyerAnalytics(req: Request, res: Response): Promise<void> {
  const compradorId = req.user!.sub;

  const orders = await prisma.pedido.findMany({
    where: { compradorId },
    include: {
      producto: { select: { nombre: true, categoria: true } },
      matches: {
        where: { estado: { in: ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'] } },
        include: {
          lote: { include: { vendedor: { select: { id: true, nombre: true, apellidos: true } } } },
        },
      },
    },
  });

  let totalVolumen = 0;
  let totalGasto = 0;
  const productMap: Record<string, number> = {};    // kg per product
  const categoryMap: Record<string, number> = {};   // orders per category
  const vendedorMap: Record<string, { nombre: string; kg: number; valor: number; pedidos: number }> = {};
  const monthMap: Record<string, number> = {};

  for (const order of orders) {
    const catNombre = order.producto.categoria;
    const prodNombre = order.producto.nombre;
    categoryMap[catNombre] = (categoryMap[catNombre] ?? 0) + 1;

    for (const m of order.matches) {
      const kg = Number(m.cantidadKg);
      const valor = kg * Number(m.precioKg);
      totalVolumen += kg;
      totalGasto += valor;

      productMap[prodNombre] = (productMap[prodNombre] ?? 0) + kg;

      const month = new Date(m.createdAt).toLocaleString('es-ES', { month: 'short', year: '2-digit' });
      monthMap[month] = (monthMap[month] ?? 0) + kg;

      const vend = m.lote.vendedor;
      const key = vend.id;
      if (!vendedorMap[key]) {
        vendedorMap[key] = { nombre: `${vend.nombre} ${vend.apellidos}`, kg: 0, valor: 0, pedidos: 0 };
      }
      vendedorMap[key]!.kg += kg;
      vendedorMap[key]!.valor += valor;
      vendedorMap[key]!.pedidos += 1;
    }
  }

  const now = new Date();
  const volumeOverTime: { month: string; kg: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
    const label = d.toLocaleString('es-ES', { month: 'short' });
    volumeOverTime.push({ month: label, kg: monthMap[key] ?? 0 });
  }

  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([product, kg]) => ({ product, kg }));

  const ordersByCategory = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([category, orders]) => ({ category, orders }));

  const topVendedores = Object.values(vendedorMap)
    .sort((a, b) => b.kg - a.kg).slice(0, 5)
    .map((v) => ({ farmer: v.nombre, volume: Math.round(v.kg), value: Number(v.valor.toFixed(2)), orders: v.pedidos }));

  const activeOrders = orders.filter((o) => o.estado === 'ACTIVO').length;
  const coveredOrders = orders.filter((o) => ['PARCIALMENTE_CUBIERTO', 'TOTALMENTE_CUBIERTO'].includes(o.estado)).length;

  res.json({
    success: true,
    data: {
      totalVolumen: Math.round(totalVolumen),
      totalGasto: Number(totalGasto.toFixed(2)),
      avgPrecioKg: totalVolumen > 0 ? Number((totalGasto / totalVolumen).toFixed(3)) : 0,
      totalOrders: orders.length,
      activeOrders,
      coveredOrders,
      volumeOverTime,
      topProducts,
      ordersByCategory,
      topVendedores,
    },
  });
}
