import { prisma } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';

interface InvoiceParty {
  nombre: string;
  cifNif: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  pais: string;
}

interface InvoiceLine {
  descripcion: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  total: number;
}

export interface InvoiceData {
  numero: string;
  fecha: string;
  emisor: InvoiceParty;
  receptor: InvoiceParty;
  lineas: InvoiceLine[];
  subtotal: number;
  iva: number;
  ivaImporte: number;
  total: number;
  comisionPlataforma?: number;
  notas?: string;
}

const PRIMARIA_INFO: InvoiceParty = {
  nombre: 'Primar-IA Technologies S.L.',
  cifNif: 'B12345678',
  direccion: 'Calle Innovación 1',
  ciudad: 'Valencia',
  codigoPostal: '46001',
  pais: 'ES',
};

function buildParty(empresa: {
  razonSocial: string;
  cifNif: string;
  direccionFiscal: string;
  ciudad: string | null;
  codigoPostal: string | null;
  pais: string;
}): InvoiceParty {
  return {
    nombre: empresa.razonSocial,
    cifNif: empresa.cifNif,
    direccion: empresa.direccionFiscal,
    ciudad: empresa.ciudad ?? '',
    codigoPostal: empresa.codigoPostal ?? '',
    pais: empresa.pais,
  };
}

async function loadTransaction(txId: string) {
  return prisma.transaccion.findUnique({
    where: { id: txId },
    include: {
      vendedor: { include: { empresa: true } },
      comprador: { include: { empresa: true } },
      match: {
        include: {
          lote: { include: { producto: true, variedad: true } },
          pedido: true,
        },
      },
    },
  });
}

export class InvoiceService {
  async getInvoiceForBuyer(txId: string, userId: string): Promise<InvoiceData> {
    const tx = await loadTransaction(txId);
    if (!tx) throw new AppError('Transacción no encontrada', 404);
    if (tx.compradorId !== userId) throw new AppError('Acceso prohibido', 403);
    if (!['COMPLETADO', 'PAGO_CAPTURADO', 'ENTREGADO'].includes(tx.estado)) {
      throw new AppError('La factura solo está disponible para transacciones completadas', 400);
    }

    const vendedorEmpresa = tx.vendedor.empresa;
    if (!vendedorEmpresa) throw new AppError('Datos fiscales del vendedor no disponibles', 400);
    const compradorEmpresa = tx.comprador.empresa;
    if (!compradorEmpresa) throw new AppError('Datos fiscales del comprador no disponibles', 400);

    const kg = Number(tx.cantidadKg);
    const precioTotal = Number(tx.precioTotal);
    const comision = Number(tx.comisionPlataforma);
    const producto = tx.match.lote.producto.nombre;
    const variedad = tx.match.lote.variedad?.nombre;
    const desc = variedad ? `${producto} — ${variedad}` : producto;
    const precioKg = Number(tx.match.precioKg);

    const subtotal = precioTotal + comision;
    const iva = 0.10;
    const ivaImporte = subtotal * iva;

    return {
      numero: `FAC-C-${tx.createdAt.getFullYear()}-${tx.id.slice(-6).toUpperCase()}`,
      fecha: tx.updatedAt.toISOString().slice(0, 10),
      emisor: buildParty(vendedorEmpresa),
      receptor: buildParty(compradorEmpresa),
      lineas: [
        {
          descripcion: desc,
          cantidad: kg,
          unidad: 'kg',
          precioUnitario: precioKg,
          total: precioTotal,
        },
        {
          descripcion: 'Comisión plataforma Primar-IA',
          cantidad: 1,
          unidad: 'ud',
          precioUnitario: comision,
          total: comision,
        },
      ],
      subtotal,
      iva: iva * 100,
      ivaImporte,
      total: subtotal + ivaImporte,
      notas: `Transacción gestionada a través de Primar-IA. ID: ${tx.id}`,
    };
  }

  async getInvoiceForSeller(txId: string, userId: string): Promise<InvoiceData> {
    const tx = await loadTransaction(txId);
    if (!tx) throw new AppError('Transacción no encontrada', 404);
    if (tx.vendedorId !== userId) throw new AppError('Acceso prohibido', 403);
    if (!['COMPLETADO', 'PAGO_CAPTURADO', 'ENTREGADO'].includes(tx.estado)) {
      throw new AppError('La factura solo está disponible para transacciones completadas', 400);
    }

    const vendedorEmpresa = tx.vendedor.empresa;
    if (!vendedorEmpresa) throw new AppError('Datos fiscales del vendedor no disponibles', 400);
    const compradorEmpresa = tx.comprador.empresa;
    if (!compradorEmpresa) throw new AppError('Datos fiscales del comprador no disponibles', 400);

    const kg = Number(tx.cantidadKg);
    const precioTotal = Number(tx.precioTotal);
    const producto = tx.match.lote.producto.nombre;
    const variedad = tx.match.lote.variedad?.nombre;
    const desc = variedad ? `${producto} — ${variedad}` : producto;
    const precioKg = Number(tx.match.precioKg);

    const subtotal = precioTotal;
    const iva = 0.10;
    const ivaImporte = subtotal * iva;

    return {
      numero: `FAC-V-${tx.createdAt.getFullYear()}-${tx.id.slice(-6).toUpperCase()}`,
      fecha: tx.updatedAt.toISOString().slice(0, 10),
      emisor: buildParty(vendedorEmpresa),
      receptor: buildParty(compradorEmpresa),
      lineas: [
        {
          descripcion: desc,
          cantidad: kg,
          unidad: 'kg',
          precioUnitario: precioKg,
          total: precioTotal,
        },
      ],
      subtotal,
      iva: iva * 100,
      ivaImporte,
      total: subtotal + ivaImporte,
      notas: `Transacción gestionada a través de Primar-IA. ID: ${tx.id}`,
    };
  }

  async getPlatformInvoice(txId: string): Promise<InvoiceData> {
    const tx = await loadTransaction(txId);
    if (!tx) throw new AppError('Transacción no encontrada', 404);

    const compradorEmpresa = tx.comprador.empresa;
    if (!compradorEmpresa) throw new AppError('Datos fiscales del comprador no disponibles', 400);

    const comision = Number(tx.comisionPlataforma);
    const pct = Number(tx.comisionPorcentaje) * 100;
    const precioTotal = Number(tx.precioTotal);
    const producto = tx.match.lote.producto.nombre;

    const subtotal = comision;
    const iva = 0.21;
    const ivaImporte = subtotal * iva;

    return {
      numero: `FAC-P-${tx.createdAt.getFullYear()}-${tx.id.slice(-6).toUpperCase()}`,
      fecha: tx.updatedAt.toISOString().slice(0, 10),
      emisor: PRIMARIA_INFO,
      receptor: buildParty(compradorEmpresa),
      lineas: [
        {
          descripcion: `Comisión intermediación — ${producto} (${pct.toFixed(2)}% sobre ${precioTotal.toFixed(2)}€)`,
          cantidad: 1,
          unidad: 'ud',
          precioUnitario: comision,
          total: comision,
        },
      ],
      subtotal,
      iva: iva * 100,
      ivaImporte,
      total: subtotal + ivaImporte,
      comisionPlataforma: comision,
      notas: `Factura de comisión Primar-IA. Transacción: ${tx.id}`,
    };
  }

  async listPlatformInvoices(page = 1) {
    const pageSize = 20;
    const skip = (page - 1) * pageSize;

    const completedStates: ('COMPLETADO' | 'PAGO_CAPTURADO' | 'ENTREGADO')[] = ['COMPLETADO', 'PAGO_CAPTURADO', 'ENTREGADO'];
    const where = { estado: { in: completedStates } };

    const [transactions, total] = await Promise.all([
      prisma.transaccion.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          vendedor: { include: { empresa: true } },
          comprador: { include: { empresa: true } },
          match: { include: { lote: { include: { producto: true } } } },
        },
      }),
      prisma.transaccion.count({ where }),
    ]);

    const data = transactions.map((tx) => ({
      id: tx.id,
      numero: `FAC-P-${tx.createdAt.getFullYear()}-${tx.id.slice(-6).toUpperCase()}`,
      fecha: tx.updatedAt.toISOString().slice(0, 10),
      producto: tx.match.lote.producto.nombre,
      vendedor: {
        nombre: `${tx.vendedor.nombre} ${tx.vendedor.apellidos}`,
        empresa: tx.vendedor.empresa?.razonSocial ?? null,
        cifNif: tx.vendedor.empresa?.cifNif ?? null,
      },
      comprador: {
        nombre: `${tx.comprador.nombre} ${tx.comprador.apellidos}`,
        empresa: tx.comprador.empresa?.razonSocial ?? null,
        cifNif: tx.comprador.empresa?.cifNif ?? null,
      },
      precioTotal: Number(tx.precioTotal),
      comisionPlataforma: Number(tx.comisionPlataforma),
      comisionPorcentaje: Number(tx.comisionPorcentaje),
      estado: tx.estado,
    }));

    return { data, total, page, totalPages: Math.ceil(total / pageSize) };
  }

  renderInvoiceHtml(invoice: InvoiceData): string {
    const rows = invoice.lineas
      .map(
        (l) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${l.descripcion}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${l.cantidad} ${l.unidad}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${l.precioUnitario.toFixed(2)}€</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${l.total.toFixed(2)}€</td>
      </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Factura ${invoice.numero}</title>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .party { font-size: 13px; line-height: 1.6; }
  .party strong { font-size: 15px; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th { background: #f5f5f0; padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  th:nth-child(n+2) { text-align: right; }
  .totals { margin-top: 24px; text-align: right; }
  .totals div { margin: 4px 0; font-size: 14px; }
  .totals .grand { font-size: 18px; font-weight: 700; margin-top: 8px; padding-top: 8px; border-top: 2px solid #1a1a1a; }
  .badge { display: inline-block; background: #E1C44D; color: #1a1a1a; padding: 2px 10px; border-radius: 4px; font-weight: 700; font-size: 20px; }
  .notes { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div style="margin-bottom:24px">
  <span class="badge">Primar-IA</span>
  <span style="margin-left:12px;font-size:24px;font-weight:700">Factura</span>
</div>

<div style="display:flex;justify-content:space-between;margin-bottom:8px">
  <div><strong>Nº:</strong> ${invoice.numero}</div>
  <div><strong>Fecha:</strong> ${invoice.fecha}</div>
</div>

<div class="header">
  <div class="party">
    <div style="font-size:11px;text-transform:uppercase;color:#888;margin-bottom:4px">EMISOR</div>
    <strong>${invoice.emisor.nombre}</strong><br>
    CIF/NIF: ${invoice.emisor.cifNif}<br>
    ${invoice.emisor.direccion}<br>
    ${invoice.emisor.codigoPostal} ${invoice.emisor.ciudad}, ${invoice.emisor.pais}
  </div>
  <div class="party" style="text-align:right">
    <div style="font-size:11px;text-transform:uppercase;color:#888;margin-bottom:4px">RECEPTOR</div>
    <strong>${invoice.receptor.nombre}</strong><br>
    CIF/NIF: ${invoice.receptor.cifNif}<br>
    ${invoice.receptor.direccion}<br>
    ${invoice.receptor.codigoPostal} ${invoice.receptor.ciudad}, ${invoice.receptor.pais}
  </div>
</div>

<table>
  <thead>
    <tr><th>Descripción</th><th>Cantidad</th><th>Precio unitario</th><th>Total</th></tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<div class="totals">
  <div>Subtotal: <strong>${invoice.subtotal.toFixed(2)}€</strong></div>
  <div>IVA (${invoice.iva}%): <strong>${invoice.ivaImporte.toFixed(2)}€</strong></div>
  <div class="grand">Total: ${invoice.total.toFixed(2)}€</div>
</div>

${invoice.notas ? `<div class="notes">${invoice.notas}</div>` : ''}
</body>
</html>`;
  }
}

export const invoiceService = new InvoiceService();
