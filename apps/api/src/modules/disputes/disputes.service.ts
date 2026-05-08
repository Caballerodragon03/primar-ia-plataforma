import { prisma } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';
import { scoringService } from '../scoring/scoring.service.js';
import type {
  CreateDisputaInput,
  RespuestaVendedorInput,
  ResolverDisputaInput,
  ResolverDisputaAdminInput,
  SendDisputaMensajeInput,
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
    const DISPUTABLE_STATES = ['PENDIENTE_PAGO', 'PAGO_CAPTURADO', 'EN_TRANSITO', 'ENTREGADO', 'COMPLETADO', 'EN_DISPUTA'];
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
            comprador: { select: { nombre: true, apellidos: true } },
            vendedor: { select: { nombre: true, apellidos: true } },
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

  async responderDisputa(disputaId: string, userId: string, data: RespuestaVendedorInput) {
    const disputa = await prisma.disputa.findUnique({
      where: { id: disputaId },
      include: {
        transaccion: { select: { vendedorId: true, compradorId: true } },
      },
    });

    if (!disputa) throw new AppError('Disputa no encontrada', 404);
    const isParty = disputa.transaccion.vendedorId === userId || disputa.transaccion.compradorId === userId;
    if (!isParty) {
      throw new AppError('No eres parte de esta transacción', 403);
    }
    if (disputa.abiertaPorId === userId) {
      throw new AppError('No puedes responder a tu propia disputa', 400);
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

    const nuevoEstadoTransaccion: 'REEMBOLSADO' | 'COMPLETADO' =
      data.resolucion === 'FAVOR_COMPRADOR' ? 'REEMBOLSADO' : 'COMPLETADO';

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
        data: { estado: nuevoEstadoTransaccion },
      }),
    ]);

    return updatedDisputa;
  }

  private readonly listInclude = {
    transaccion: {
      select: {
        vendedorId: true,
        compradorId: true,
        comprador: { select: { nombre: true, apellidos: true } },
        vendedor: { select: { nombre: true, apellidos: true } },
        match: {
          select: {
            pedido: { select: { producto: { select: { nombre: true } } } },
          },
        },
      },
    },
  } as const;

  async listDisputas(userId: string, role: string) {
    if (role === 'ADMIN') {
      return prisma.disputa.findMany({
        include: this.listInclude,
        orderBy: { createdAt: 'desc' },
      });
    }

    if (role === 'VENDEDOR') {
      return prisma.disputa.findMany({
        where: { transaccion: { vendedorId: userId } },
        include: this.listInclude,
        orderBy: { createdAt: 'desc' },
      });
    }

    return prisma.disputa.findMany({
      where: { transaccion: { compradorId: userId } },
      include: this.listInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolverDisputaAdmin(
    disputaId: string,
    adminId: string,
    data: ResolverDisputaAdminInput,
  ) {
    if (!(await this.isAdmin(adminId))) throw new AppError('Acceso prohibido', 403);

    const disputa = await prisma.disputa.findUnique({
      where: { id: disputaId },
      select: {
        id: true,
        transaccionId: true,
        abiertaPorId: true,
        transaccion: { select: { compradorId: true, vendedorId: true } },
      },
    });
    if (!disputa) throw new AppError('Disputa no encontrada', 404);

    const { compradorId, vendedorId } = disputa.transaccion;
    const porcentajeVendedor = 100 - data.porcentajeComprador;
    const nuevoEstadoTransaccion: 'REEMBOLSADO' | 'COMPLETADO' =
      data.resolucion === 'FAVOR_COMPRADOR' ? 'REEMBOLSADO' : 'COMPLETADO';
    const abiertaPorRole: 'COMPRADOR' | 'VENDEDOR' =
      disputa.abiertaPorId === compradorId ? 'COMPRADOR' : 'VENDEDOR';

    const now = new Date();
    const oneMonthLater = new Date(now);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    // Single interactive transaction: all conditional writes in one atomic block
    const updatedDisputa = await prisma.$transaction(async (tx) => {
      const updated = await tx.disputa.update({
        where: { id: disputaId },
        data: {
          resolucion: data.resolucion,
          porcentajeComprador: data.porcentajeComprador,
          porcentajeVendedor,
          adminId,
          notasAdmin: data.notasAdmin ?? null,
          penalizacionComprador: data.penalizacionComprador ?? null,
          penalizacionVendedor: data.penalizacionVendedor ?? null,
          incentivoComprador: data.incentivoComprador ?? null,
          incentivoVendedor: data.incentivoVendedor ?? null,
          suscripcionGratisUserId: data.suscripcionGratisUserId ?? null,
          estado: 'RESUELTA',
        },
      });

      await tx.transaccion.update({
        where: { id: disputa.transaccionId },
        data: { estado: nuevoEstadoTransaccion },
      });

      if (data.banearComprador) {
        const comprador = await tx.user.findUnique({
          where: { id: compradorId },
          select: { email: true },
        });
        if (comprador?.email) {
          await tx.bannedEntry.upsert({
            where: { email: comprador.email },
            create: { email: comprador.email, reason: 'Resolución disputa — ban admin', bannedBy: adminId },
            update: { reason: 'Resolución disputa — ban admin', bannedBy: adminId },
          });
        }
        await tx.user.update({
          where: { id: compradorId },
          data: { estado: 'SUSPENDIDO' },
        });
      }

      if (data.banearVendedor) {
        const vendedor = await tx.user.findUnique({
          where: { id: vendedorId },
          select: { email: true },
        });
        if (vendedor?.email) {
          await tx.bannedEntry.upsert({
            where: { email: vendedor.email },
            create: { email: vendedor.email, reason: 'Resolución disputa — ban admin', bannedBy: adminId },
            update: { reason: 'Resolución disputa — ban admin', bannedBy: adminId },
          });
        }
        await tx.user.update({
          where: { id: vendedorId },
          data: { estado: 'SUSPENDIDO' },
        });
      }

      if (data.suscripcionGratisUserId) {
        const SELLER_PLANS = ['COSECHA', 'CAMPO', 'FINCA'];
        const plan = data.suscripcionGratisPlan ?? 'CENTRAL';
        const isSeller = SELLER_PLANS.includes(plan);
        const planData = isSeller
          ? { planVendedor: plan as 'COSECHA' | 'CAMPO' | 'FINCA', planComprador: null }
          : { planComprador: plan as 'MERCADO' | 'LONJA' | 'CENTRAL', planVendedor: null };

        await tx.suscripcion.upsert({
          where: { userId: data.suscripcionGratisUserId },
          create: {
            userId: data.suscripcionGratisUserId,
            ...planData,
            estado: 'ACTIVA',
            fechaInicio: now,
            fechaFin: oneMonthLater,
            comoCompensacion: true,
            compensacionMeses: 1,
          },
          update: {
            ...planData,
            estado: 'ACTIVA',
            fechaInicio: now,
            fechaFin: oneMonthLater,
            comoCompensacion: true,
            compensacionMeses: 1,
          },
        });
      }

      return updated;
    });

    // Scoring — outside the transaction so a scoring failure doesn't roll back the resolution
    try {
      await scoringService.onDisputaResuelta(disputaId, {
        penalizacionComprador: data.penalizacionComprador,
        penalizacionVendedor: data.penalizacionVendedor,
        incentivoComprador: data.incentivoComprador,
        incentivoVendedor: data.incentivoVendedor,
        adminId,
        compradorId,
        vendedorId,
        abiertaPorRole,
      });
    } catch {
      // Scoring failures are non-fatal; the dispute resolution is already committed
    }

    return updatedDisputa;
  }

  async sendDisputaMensaje(
    disputaId: string,
    autorId: string,
    data: SendDisputaMensajeInput,
  ) {
    const disputa = await prisma.disputa.findUnique({
      where: { id: disputaId },
      select: {
        transaccion: { select: { compradorId: true, vendedorId: true } },
      },
    });
    if (!disputa) throw new AppError('Disputa no encontrada', 404);

    const { compradorId, vendedorId } = disputa.transaccion;
    const isParticipant = compradorId === autorId || vendedorId === autorId;
    const isAdmin = await this.isAdmin(autorId);

    if (!isParticipant && !isAdmin) {
      throw new AppError('No tienes acceso a esta disputa', 403);
    }

    return prisma.disputaMensaje.create({
      data: {
        disputaId,
        autorId,
        contenido: data.contenido,
        archivoUrl: data.archivoUrl ?? null,
      },
      include: {
        autor: { select: { nombre: true, apellidos: true, role: true } },
      },
    });
  }

  async getDisputaMensajes(disputaId: string, userId: string) {
    const disputa = await prisma.disputa.findUnique({
      where: { id: disputaId },
      select: {
        transaccion: { select: { compradorId: true, vendedorId: true } },
      },
    });
    if (!disputa) throw new AppError('Disputa no encontrada', 404);

    const { compradorId, vendedorId } = disputa.transaccion;
    const isParticipant = compradorId === userId || vendedorId === userId;
    const isAdmin = await this.isAdmin(userId);

    if (!isParticipant && !isAdmin) {
      throw new AppError('No tienes acceso a esta disputa', 403);
    }

    return prisma.disputaMensaje.findMany({
      where: { disputaId },
      orderBy: { createdAt: 'asc' },
      include: {
        autor: { select: { nombre: true, apellidos: true, role: true } },
      },
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
