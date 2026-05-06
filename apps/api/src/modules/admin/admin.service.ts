import { prisma } from '@primaria/database';
import type { User, Certificado } from '@primaria/database';
import type { UserEstado } from '@primaria/shared';
import { AppError } from '../../middleware/error.middleware.js';
import { sendEmail } from '../../shared/email.js';

// ─── Response types ───────────────────────────────────────────────────────────

export interface PaginatedResponse {
  data: unknown[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UserDetail {
  user: User & { empresa: unknown };
  certificados: Certificado[];
  stats: {
    totalLotes: number;
    totalPedidos: number;
    totalTransacciones: number;
  };
}

export interface AdminStats {
  users: {
    total: number;
    byRole: Record<string, number>;
    byEstado: Record<string, number>;
  };
  lots: { total: number };
  orders: { total: number };
  transactions: { total: number };
  commissionEarned: number;
}

// ─── Valid estado transitions ─────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Partial<Record<UserEstado, UserEstado[]>> = {
  EMAIL_NO_VERIFICADO: ['VERIFICADO_ACTIVO', 'RECHAZADO', 'PENDIENTE_VERIFICACION'],
  EMAIL_VERIFICADO: ['VERIFICADO_ACTIVO', 'RECHAZADO', 'PENDIENTE_VERIFICACION'],
  PENDIENTE_VERIFICACION: ['VERIFICADO_ACTIVO', 'RECHAZADO', 'PENDIENTE_ACLARACION'],
  PENDIENTE_ACLARACION: ['VERIFICADO_ACTIVO', 'RECHAZADO'],
  VERIFICADO_ACTIVO: ['SUSPENDIDO'],
  SUSPENDIDO: ['VERIFICADO_ACTIVO', 'RECHAZADO'],
};

const PAGE_SIZE = 20;

// ─── AdminService ─────────────────────────────────────────────────────────────

export class AdminService {
  // ── User management ─────────────────────────────────────────────────────────

  async listUsers(filters?: {
    role?: string;
    estado?: string;
    page?: number;
  }): Promise<PaginatedResponse> {
    const page = Math.max(1, filters?.page ?? 1);
    const skip = (page - 1) * PAGE_SIZE;

    const estados = filters?.estado?.includes(',')
      ? filters.estado.split(',') as User['estado'][]
      : undefined;

    const where = {
      ...(filters?.role ? { role: filters.role as User['role'] } : {}),
      ...(estados
        ? { estado: { in: estados } }
        : filters?.estado
          ? { estado: filters.estado as User['estado'] }
          : {}),
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: PAGE_SIZE,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          nombre: true,
          apellidos: true,
          role: true,
          estado: true,
          createdAt: true,
          empresa: {
            select: { razonSocial: true, cifNif: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }

  async getUserDetail(userId: string): Promise<UserDetail> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        empresa: true,
      },
    });

    if (!user) throw new AppError('Usuario no encontrado', 404);

    const [certificados, totalLotes, totalPedidos, totalTransacciones] = await Promise.all([
      prisma.certificado.findMany({ where: { userId } }),
      prisma.lote.count({ where: { vendedorId: userId } }),
      prisma.pedido.count({ where: { compradorId: userId } }),
      prisma.transaccion.count({
        where: {
          OR: [{ vendedorId: userId }, { compradorId: userId }],
        },
      }),
    ]);

    return {
      user,
      certificados,
      stats: {
        totalLotes,
        totalPedidos,
        totalTransacciones,
      },
    };
  }

  async updateUserEstado(
    userId: string,
    estado: UserEstado,
    notasAdmin?: string,
  ): Promise<User> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const currentEstado = user.estado as UserEstado;
    const allowed = ALLOWED_TRANSITIONS[currentEstado] ?? [];

    if (!allowed.includes(estado)) {
      throw new AppError(
        `Transición no permitida: ${currentEstado} → ${estado}`,
        400,
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        estado,
        ...(notasAdmin !== undefined
          ? { preferenciasNotif: { ...(user.preferenciasNotif as object ?? {}), notasAdmin } }
          : {}),
      },
    });

    const loginUrl = `${process.env.CORS_ORIGIN ?? 'https://app.primar-ia.com'}/login`;

    if (estado === 'VERIFICADO_ACTIVO') {
      await sendEmail({
        to: user.email,
        subject: 'Tu cuenta en Primar-IA ha sido aprobada',
        html: `<h2>¡Enhorabuena, ${user.nombre}!</h2>
<p>Tu cuenta en Primar-IA ha sido verificada y aprobada por nuestro equipo.</p>
<p>Ya puedes acceder a la plataforma con todas las funcionalidades disponibles para tu perfil.</p>
<a href="${loginUrl}" style="background:#E1C44D;color:#1A1A1A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Acceder a Primar-IA</a>
<p>¡Bienvenido al mercado digital del sector primario!</p>`,
      }).catch((err: Error) => console.error('[ADMIN] Approval email failed:', err.message));
    } else if (estado === 'RECHAZADO') {
      await sendEmail({
        to: user.email,
        subject: 'Actualización sobre tu cuenta en Primar-IA',
        html: `<h2>Hola ${user.nombre},</h2>
<p>Lamentamos informarte de que tu solicitud de cuenta en Primar-IA no ha sido aprobada en este momento.</p>
${notasAdmin ? `<p><strong>Motivo:</strong> ${notasAdmin}</p>` : ''}
<p>Si crees que se trata de un error o deseas más información, puedes ponerte en contacto con nosotros respondiendo a este correo.</p>`,
      }).catch((err: Error) => console.error('[ADMIN] Rejection email failed:', err.message));
    }

    return updated;
  }

  // ── Certificate management ───────────────────────────────────────────────────

  async listCertificados(filters?: {
    estado?: string;
    userId?: string;
  }): Promise<Certificado[]> {
    return prisma.certificado.findMany({
      where: {
        ...(filters?.estado ? { estado: filters.estado as Certificado['estado'] } : {}),
        ...(filters?.userId ? { userId: filters.userId } : {}),
      },
      include: {
        user: {
          select: { id: true, nombre: true, apellidos: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyCertificado(
    certId: string,
    adminId: string,
    action: 'VERIFICADO' | 'RECHAZADO',
    notas?: string,
  ): Promise<Certificado> {
    const cert = await prisma.certificado.findUnique({ where: { id: certId } });
    if (!cert) throw new AppError('Certificado no encontrado', 404);

    if (!['PENDIENTE'].includes(cert.estado)) {
      throw new AppError(
        `No se puede verificar un certificado en estado ${cert.estado}`,
        400,
      );
    }

    return prisma.certificado.update({
      where: { id: certId },
      data: {
        estado: action,
        adminVerificadorId: adminId,
        fechaVerificacion: new Date(),
        notasVerificacion: notas ?? null,
      },
    });
  }

  // ── Dashboard stats ──────────────────────────────────────────────────────────

  async getDashboardStats(): Promise<AdminStats> {
    const [users, lots, orders, transactions, commissionResult] = await Promise.all([
      prisma.user.findMany({
        select: { role: true, estado: true },
      }),
      prisma.lote.count(),
      prisma.pedido.count(),
      prisma.transaccion.count(),
      prisma.transaccion.aggregate({
        _sum: { comisionPlataforma: true },
        where: { estado: { in: ['PAGO_CAPTURADO', 'EN_TRANSITO', 'ENTREGADO', 'COMPLETADO'] } },
      }),
    ]);

    const byRole: Record<string, number> = {};
    const byEstado: Record<string, number> = {};

    for (const u of users) {
      byRole[u.role] = (byRole[u.role] ?? 0) + 1;
      byEstado[u.estado] = (byEstado[u.estado] ?? 0) + 1;
    }

    return {
      users: { total: users.length, byRole, byEstado },
      lots: { total: lots },
      orders: { total: orders },
      transactions: { total: transactions },
      commissionEarned: Number(commissionResult._sum.comisionPlataforma ?? 0),
    };
  }
}

export const adminService = new AdminService();
