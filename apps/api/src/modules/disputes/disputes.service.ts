import { prisma } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';
import type {
  CreateDisputaInput,
  RespuestaVendedorInput,
  ResolverDisputaInput,
} from './disputes.schema.js';

export class DisputasService {
  async createDisputa(userId: string, transaccionId: string, data: CreateDisputaInput) {
    const transaccion = await prisma.transaccion.findUnique({
      where: { id: transaccionId },
      select: { compradorId: true, vendedorId: true, estado: true },
    });

    if (!transaccion) throw new AppError('Transaccion no encontrada', 404);
    if (transaccion.compradorId !== userId && transaccion.vendedorId !== userId) {
      throw new AppError('No eres parte de esta transaccion', 403);
    }
    const DISPUTABLE_STATES = ['PENDIENTE_PAGO', 'PAGO_CAPTURADO', 'EN_TRANSITO', 'ENTREGADO', 'EN_DISPUTA'];
    if (!DISPUTABLE_STATES.includes(transaccion.estado)) {
      throw new AppError('No puedes abrir una disputa en esta transacción', 400);
    }
    if (transaccion.estado === 'EN_DISPUTA') {
      throw new AppError('Ya existe una disputa abierta para esta transacción', 400);
    }

    const disputa = await prisma.disputa.create({
      data: {
        transaccionId,
        abiertaPorId: userId,
        tipoProblema: data.tipoProblema,
        descripcion: data.descripcion,
        evidenciasUrls: data.evidenciasUrls,
        estado: 'ABIERTA',
      },
    });

    await prisma.transaccion.update({
      where: { id: transaccionId },
      data: { estado: 'EN_DISPUTA' },
    });

    return disputa;
  }

  async getDisputa(id: string, userId: string) {
    const disputa = await prisma.disputa.findUnique({
      where: { id },
      include: {
        transaccion: {
          select: {
            vendedorId: true,
            compradorId: true,
            cantidadKg: true,
            precioTotal: true,
            match: {
              select: {
                pedido: { select: { producto: { select: { nombre: true } } } }
              }
            }
          },
        },
      },
    });

    if (!disputa) throw new AppError('Disputa no encontrada', 404);

    const isParticipant =
      disputa.transaccion.vendedorId === userId ||
      disputa.transaccion.compradorId === userId;
    const isAdmin = await this.isAdmin(userId);

    if (!isParticipant && !isAdmin) {
      throw new AppError('No tienes acceso a esta disputa', 403);
    }

    return disputa;
  }

  async responderDisputa(disputaId: string, vendedorId: string, data: RespuestaVendedorInput) {
    const disputa = await prisma.disputa.findUnique({
      where: { id: disputaId },
      include: {
        transaccion: { select: { vendedorId: true } },
      },
    });

    if (!disputa) throw new AppError('Disputa no encontrada', 404);
    if (disputa.transaccion.vendedorId !== vendedorId) {
      throw new AppError('No eres el vendedor de esta transaccion', 403);
    }
    if (disputa.estado !== 'ABIERTA') {
      throw new AppError('Solo puedes responder a disputas en estado ABIERTA', 400);
    }

    return prisma.disputa.update({
      where: { id: disputaId },
      data: {
        respuestaVendedor: data.respuesta,
        evidenciasVendedorUrls: data.evidenciasUrls ?? [],
        estado: 'RESPUESTA_VENDEDOR',
      },
    });
  }

  async resolverDisputa(disputaId: string, adminId: string, data: ResolverDisputaInput) {
    const isAdmin = await this.isAdmin(adminId);
    if (!isAdmin) throw new AppError('Acceso prohibido', 403);

    const disputa = await prisma.disputa.findUnique({
      where: { id: disputaId },
      select: { id: true, transaccionId: true, estado: true },
    });

    if (!disputa) throw new AppError('Disputa no encontrada', 404);

    const porcentajeVendedor = 100 - data.porcentajeComprador;

    let nuevoEstadoTransaccion: string;
    if (data.resolucion === 'FAVOR_COMPRADOR') {
      nuevoEstadoTransaccion = 'REEMBOLSADO';
    } else {
      nuevoEstadoTransaccion = 'COMPLETADO';
    }

    const [updatedDisputa] = await prisma.$transaction([
      prisma.disputa.update({
        where: { id: disputaId },
        data: {
          resolucion: data.resolucion,
          porcentajeComprador: data.porcentajeComprador,
          porcentajeVendedor,
          adminId,
          notasAdmin: data.notasAdmin,
          estado: 'RESUELTA',
        },
      }),
      prisma.transaccion.update({
        where: { id: disputa.transaccionId },
        data: { estado: nuevoEstadoTransaccion as any },
      }),
    ]);

    return updatedDisputa;
  }

  async listDisputas(userId: string, role: string) {
    if (role === 'ADMIN') {
      return prisma.disputa.findMany({
        include: { transaccion: { select: { vendedorId: true, compradorId: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (role === 'VENDEDOR') {
      return prisma.disputa.findMany({
        where: { transaccion: { vendedorId: userId } },
        include: { transaccion: { select: { vendedorId: true, compradorId: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    // COMPRADOR or default
    return prisma.disputa.findMany({
      where: { transaccion: { compradorId: userId } },
      include: { transaccion: { select: { vendedorId: true, compradorId: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async isAdmin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === 'ADMIN';
  }
}

export const disputasService = new DisputasService();
