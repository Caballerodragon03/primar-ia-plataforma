import { prisma } from '@primaria/database';
import type { User, Certificado } from '@primaria/database';
import type { UserEstado } from '@primaria/shared';
import { AppError } from '../../middleware/error.middleware.js';
import { sendEmail } from '../../shared/email.js';
import { env } from '../../config/env.js';

/** Minimal HTML escape for interpolating admin-entered strings into email bodies. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

    // Allowlist-validate role and estado before they reach Prisma.
    const ALLOWED_ROLES: ReadonlyArray<User['role']> = ['VENDEDOR', 'COMPRADOR', 'ADMIN'];
    const ALLOWED_ESTADOS: ReadonlyArray<User['estado']> = [
      'EMAIL_NO_VERIFICADO',
      'EMAIL_VERIFICADO',
      'PENDIENTE_VERIFICACION',
      'VERIFICADO_ACTIVO',
      'PENDIENTE_ACLARACION',
      'SUSPENDIDO',
      'RECHAZADO',
    ];

    const role =
      filters?.role && (ALLOWED_ROLES as string[]).includes(filters.role)
        ? (filters.role as User['role'])
        : undefined;

    const rawEstados = filters?.estado?.split(',') ?? [];
    const estados = rawEstados.filter((e): e is User['estado'] =>
      (ALLOWED_ESTADOS as string[]).includes(e),
    );

    const where = {
      ...(role ? { role } : {}),
      ...(estados.length > 1 ? { estado: { in: estados } } : {}),
      ...(estados.length === 1 ? { estado: estados[0] } : {}),
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

    const loginUrl = `${env.CORS_ORIGIN}/login`;

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
${notasAdmin ? `<p><strong>Motivo:</strong> ${escapeHtml(notasAdmin)}</p>` : ''}
<p>Si crees que se trata de un error o deseas más información, puedes ponerte en contacto con nosotros respondiendo a este correo.</p>`,
      }).catch((err: Error) => console.error('[ADMIN] Rejection email failed:', err.message));
    }

    return updated;
  }

  // ── Ban user (suspende cuenta + bloquea re-registro de email+CIF) ──────────

  /**
   * Phase 14A — Ban es ahora SUSPENDIDO (no DELETE).
   *
   * El DELETE original rompía:
   *   - Trazabilidad fiscal: facturas históricas referenciaban userId →
   *     CASCADE las dejaba huérfanas.
   *   - Consistencia con flujo v2: bypass.controller y cancellations.service
   *     escalan a estado=SUSPENDIDO, no a delete.
   *
   * Ahora la transacción:
   *   1. Crea BannedEntry con email + CIF para que ese par no pueda
   *      re-registrarse (verificado en register).
   *   2. Marca user.estado=SUSPENDIDO (preserva todas las relaciones).
   *   3. Borra TODOS los refresh tokens del usuario → no puede extender
   *      sesión más allá del TTL del access token actual.
   *   4. Invalida estadoCache → requireEstado bloquea en el siguiente
   *      request (drift máximo: 0 segundos).
   *   5. Envía email con motivo (fire-and-forget).
   */
  async banUser(userId: string, adminId: string, reason?: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { empresa: { select: { cifNif: true } } },
    });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    await prisma.$transaction(async (tx) => {
      await tx.bannedEntry.create({
        data: {
          email: user.email,
          cifNif: user.empresa?.cifNif ?? null,
          reason: reason ?? null,
          bannedBy: adminId,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { estado: 'SUSPENDIDO' },
      });
      await tx.refreshToken.deleteMany({
        where: { userId },
      });
    });

    // Phase 14A — flush in-memory estado cache so the next request from the
    // banned user hits requireEstado live-check immediately (no 30s drift).
    const { invalidateEstadoCache } = await import('../../middleware/auth.middleware.js');
    invalidateEstadoCache(userId);

    await sendEmail({
      to: user.email,
      subject: 'Tu cuenta en Primar-IA ha sido suspendida',
      html: `<h2>Hola ${user.nombre},</h2>
<p>Tu cuenta en Primar-IA ha sido suspendida por incumplimiento de nuestros Términos y Condiciones.</p>
${reason ? `<p><strong>Motivo:</strong> ${escapeHtml(reason)}</p>` : ''}
<p>Si consideras que se trata de un error, puedes ponerte en contacto con nosotros en info@primar-ia.com.</p>`,
    }).catch((err: Error) => console.error('[ADMIN] Ban email failed:', err.message));
  }

  // ── Delete user (remove account, allow re-registration) ────────────────────

  async deleteUser(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuario no encontrado', 404);
    await prisma.user.delete({ where: { id: userId } });
  }

  // ── Check if email or CIF is banned ────────────────────────────────────────

  async isBanned(email: string, cifNif?: string): Promise<{ banned: boolean; reason?: string }> {
    const entry = await prisma.bannedEntry.findFirst({
      where: {
        OR: [
          { email },
          ...(cifNif ? [{ cifNif }] : []),
        ],
      },
    });
    return entry ? { banned: true, reason: entry.reason ?? undefined } : { banned: false };
  }

  // ── Certificate management ───────────────────────────────────────────────────

  async listCertificados(filters?: {
    estado?: string;
    userId?: string;
    certType?: string;
  }): Promise<Certificado[]> {
    return prisma.certificado.findMany({
      where: {
        ...(filters?.estado ? { estado: filters.estado as Certificado['estado'] } : {}),
        ...(filters?.userId ? { userId: filters.userId } : {}),
        // Phase 14A — filter by certificado type (numeroCertificado field).
        // Case-insensitive substring match so admin UI's text input is useful.
        ...(filters?.certType
          ? { numeroCertificado: { contains: filters.certType, mode: 'insensitive' } }
          : {}),
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
