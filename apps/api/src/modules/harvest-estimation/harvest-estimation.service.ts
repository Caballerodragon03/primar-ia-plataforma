import { prisma, Prisma } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';
import type { UploadHistorialInput } from './harvest-estimation.schema.js';

type CalibreEntry = { calibre: string; cantidadKg: number };

export class HarvestEstimationService {
  async uploadHistorial(userId: string, data: UploadHistorialInput) {
    const producto = await prisma.producto.findUnique({ where: { id: data.productoId } });
    if (!producto) throw new AppError('Producto no encontrado', 404);

    if (data.variedadId) {
      const variedad = await prisma.variedad.findUnique({ where: { id: data.variedadId } });
      if (!variedad) throw new AppError('Variedad no encontrada', 404);
    }

    const existing = await prisma.historialCosecha.findFirst({
      where: {
        userId,
        productoId: data.productoId,
        variedadId: data.variedadId ?? null,
        temporada: data.temporada,
      },
    });

    if (existing) {
      return prisma.historialCosecha.update({
        where: { id: existing.id },
        data: { calibres: data.calibres },
      });
    }

    return prisma.historialCosecha.create({
      data: {
        userId,
        productoId: data.productoId,
        variedadId: data.variedadId,
        temporada: data.temporada,
        calibres: data.calibres,
      },
    });
  }

  async getHistorial(userId: string) {
    return prisma.historialCosecha.findMany({
      where: { userId },
      include: { producto: true, variedad: true },
      orderBy: [{ productoId: 'asc' }, { temporada: 'desc' }],
    });
  }

  async calculateEstimation(userId: string, productoId: string, variedadId?: string) {
    const records = await prisma.historialCosecha.findMany({
      where: {
        userId,
        productoId,
        ...(variedadId ? { variedadId } : {}),
      },
      orderBy: { temporada: 'desc' },
      take: 3,
    });

    if (records.length === 0) {
      throw new AppError('No hay historial suficiente para estimar', 400);
    }

    const calibresBySeason: CalibreEntry[][] = records.map(
      (r) => r.calibres as unknown as CalibreEntry[]
    );

    const weights = [0.5, 0.3, 0.2].slice(0, calibresBySeason.length);
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    const normalizedWeights = weights.map((w) => w / totalWeight);

    const allCalibres = new Set<string>();
    for (const season of calibresBySeason) {
      for (const c of season) allCalibres.add(c.calibre);
    }

    const estimaciones: Array<{ calibre: string; cantidadKg: number; tendencia: string }> = [];

    for (const calibre of allCalibres) {
      const quantities = calibresBySeason.map(
        (season) => season.find((c) => c.calibre === calibre)?.cantidadKg ?? 0
      );

      const mediaPonderada = quantities.reduce(
        (sum, qty, i) => sum + qty * normalizedWeights[i]!, 0
      );

      let tendencia = 'STABLE';
      if (quantities.length >= 2) {
        const newest = quantities[0]!;
        const oldest = quantities[quantities.length - 1]!;
        if (oldest > 0) {
          const change = (newest - oldest) / oldest;
          if (change > 0.05) tendencia = 'UP';
          else if (change < -0.05) tendencia = 'DOWN';

          const adjusted = mediaPonderada * (1 + change * 0.3);
          estimaciones.push({ calibre, cantidadKg: Math.round(adjusted), tendencia });
          continue;
        }
      }

      estimaciones.push({ calibre, cantidadKg: Math.round(mediaPonderada), tendencia });
    }

    if (records[0]) {
      await prisma.historialCosecha.update({
        where: { id: records[0].id },
        data: { estimacionProxima: estimaciones },
      });
    }

    return { productoId, variedadId, estimaciones, basadoEn: records.length };
  }

  async getPredictions(userId: string) {
    const records = await prisma.historialCosecha.findMany({
      where: { userId, estimacionProxima: { not: Prisma.DbNull } },
      include: { producto: true, variedad: true },
      orderBy: { updatedAt: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      producto: r.producto,
      variedad: r.variedad,
      estimaciones: r.estimacionProxima,
      temporadaBase: r.temporada,
    }));
  }

  async deleteHistorial(id: string, userId: string) {
    const record = await prisma.historialCosecha.findUnique({ where: { id } });
    if (!record) throw new AppError('Registro no encontrado', 404);
    if (record.userId !== userId) throw new AppError('Acceso prohibido', 403);
    return prisma.historialCosecha.delete({ where: { id } });
  }
}

export const harvestEstimationService = new HarvestEstimationService();
