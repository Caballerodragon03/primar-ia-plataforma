import { prisma } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';
import type { CreateBugReportInput, UpdateBugReportInput } from './bug-reports.schema.js';

export class BugReportsService {
  async create(userId: string, data: CreateBugReportInput) {
    return prisma.bugReport.create({
      data: {
        userId,
        descripcion: data.descripcion,
        url: data.url ?? null,
        capturaUrl: data.capturaUrl ?? null,
        userAgent: data.userAgent ?? null,
        estado: 'NUEVO',
      },
    });
  }

  async listForAdmin(estado?: string) {
    const allowed = ['NUEVO', 'EN_PROGRESO', 'RESUELTO', 'DESCARTADO'] as const;
    const safe = (allowed as readonly string[]).includes(estado ?? '') ? (estado as typeof allowed[number]) : undefined;
    return prisma.bugReport.findMany({
      where: safe ? { estado: safe } : undefined,
      orderBy: [{ estado: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getById(id: string) {
    const report = await prisma.bugReport.findUnique({
      where: { id },
    });
    if (!report) throw new AppError('Reporte no encontrado', 404);

    // Manually fetch reporter info (no FK relation defined)
    if (report.userId) {
      const user = await prisma.user.findUnique({
        where: { id: report.userId },
        select: { id: true, email: true, nombre: true, apellidos: true, role: true },
      });
      return { ...report, reporter: user };
    }
    return { ...report, reporter: null };
  }

  async update(id: string, data: UpdateBugReportInput) {
    const existing = await prisma.bugReport.findUnique({ where: { id } });
    if (!existing) throw new AppError('Reporte no encontrado', 404);

    const becomingResolved =
      data.estado === 'RESUELTO' && existing.estado !== 'RESUELTO';

    return prisma.bugReport.update({
      where: { id },
      data: {
        ...(data.estado !== undefined && { estado: data.estado }),
        ...(data.adminNotas !== undefined && { adminNotas: data.adminNotas }),
        ...(becomingResolved && { resolvedAt: new Date() }),
        ...(data.estado && data.estado !== 'RESUELTO' && { resolvedAt: null }),
      },
    });
  }

  async getCountsByEstado() {
    const rows = await prisma.bugReport.groupBy({
      by: ['estado'],
      _count: { _all: true },
    });
    return rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.estado] = r._count._all;
      return acc;
    }, {});
  }
}

export const bugReportsService = new BugReportsService();
