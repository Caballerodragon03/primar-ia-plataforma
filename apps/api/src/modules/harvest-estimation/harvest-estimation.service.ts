import { prisma, Prisma } from '@primaria/database';
import * as XLSX from 'xlsx';
import { AppError } from '../../middleware/error.middleware.js';
import type { UploadHistorialInput } from './harvest-estimation.schema.js';

type CalibreEntry = { calibre: string; cantidadKg: number };

interface PredictionCalibre {
  calibre: string;
  estimatedKg: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  confidence: number;
}

interface PredictionResult {
  productoId: string;
  productoNombre: string;
  variedadId?: string;
  variedadNombre?: string;
  calibres: PredictionCalibre[];
  basedOnSeasons: number;
  nextSeason: string;
}

/* ── Linear regression on season index → kg ─────────────────────────── */

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n <= 1) return { slope: 0, intercept: values[0] ?? 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i]!;
    sumXY += i * values[i]!;
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function confidenceFromCV(values: number[]): number {
  if (values.length <= 1) return 50;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return 50;
  const sd = standardDeviation(values);
  const cv = sd / Math.abs(mean);
  // CV of 0 → 95% confidence, CV of 1+ → ~50% confidence
  const confidence = Math.max(50, Math.min(95, 95 - cv * 45));
  return Math.round(confidence);
}

function nextSeasonLabel(lastSeason: string): string {
  const parts = lastSeason.split('-');
  if (parts.length === 2) {
    const y = parseInt(parts[1]!, 10);
    if (!isNaN(y)) return `${y}-${y + 1}`;
  }
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
}

/* ── Excel template generation ──────────────────────────────────────── */

function buildTemplateWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const instrucciones = [
    ['INSTRUCCIONES — Plantilla de Estimación de Cosecha'],
    [''],
    ['1. Ve a la pestaña "Datos" para rellenar tu historial de cosechas.'],
    ['2. Cada fila es un registro: Temporada (ej. 2022-2023), Calibre (ej. Extra, Primera, Segunda), Cantidad en Kg.'],
    ['3. Rellena al menos 2 temporadas para obtener predicciones precisas (recomendado: 3-5).'],
    ['4. Más temporadas = predicción más fiable.'],
    ['5. Una vez rellenado, sube el archivo en la plataforma.'],
    [''],
    ['Ejemplo:'],
    ['Temporada', 'Calibre', 'Cantidad (kg)'],
    ['2021-2022', 'Extra', 12000],
    ['2021-2022', 'Primera', 8500],
    ['2021-2022', 'Segunda', 4200],
    ['2022-2023', 'Extra', 13500],
    ['2022-2023', 'Primera', 9000],
    ['2022-2023', 'Segunda', 3800],
    ['2023-2024', 'Extra', 14200],
    ['2023-2024', 'Primera', 8800],
    ['2023-2024', 'Segunda', 4500],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instrucciones);
  wsInstr['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones');

  const headers = [['Temporada', 'Calibre', 'Cantidad (kg)']];
  const wsDatos = XLSX.utils.aoa_to_sheet(headers);
  wsDatos['!cols'] = [{ wch: 16 }, { wch: 20 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsDatos, 'Datos');

  return wb;
}

export function generateTemplateBuffer(): Buffer {
  const wb = buildTemplateWorkbook();
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

/* ── Excel parsing ──────────────────────────────────────────────────── */

interface ParsedRow {
  temporada: string;
  calibre: string;
  cantidadKg: number;
}

function parseExcelBuffer(buffer: Buffer): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });

  const sheetName = wb.SheetNames.includes('Datos') ? 'Datos' : wb.SheetNames[0];
  if (!sheetName) throw new AppError('El archivo Excel está vacío', 400);

  const ws = wb.Sheets[sheetName]!;
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

  const parsed: ParsedRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const temporada = String(row['Temporada'] ?? row['temporada'] ?? '').trim();
    const calibre = String(row['Calibre'] ?? row['calibre'] ?? '').trim();
    const kgRaw = row['Cantidad (kg)'] ?? row['cantidad_kg'] ?? row['cantidadKg'] ?? row['kg'] ?? row['Cantidad'];
    const cantidadKg = Number(kgRaw);

    if (!temporada || !calibre) continue;
    if (isNaN(cantidadKg) || cantidadKg < 0) {
      throw new AppError(`Fila ${i + 2}: cantidad inválida "${kgRaw}"`, 400);
    }
    if (!/^\d{4}-\d{4}$/.test(temporada)) {
      throw new AppError(`Fila ${i + 2}: formato de temporada inválido "${temporada}". Usa YYYY-YYYY (ej. 2023-2024)`, 400);
    }

    parsed.push({ temporada, calibre, cantidadKg });
  }

  if (parsed.length === 0) {
    throw new AppError('No se encontraron datos válidos en el archivo. Revisa que las columnas se llamen "Temporada", "Calibre" y "Cantidad (kg)".', 400);
  }

  return parsed;
}

function groupBySeason(rows: ParsedRow[]): Map<string, CalibreEntry[]> {
  const map = new Map<string, CalibreEntry[]>();
  for (const row of rows) {
    if (!map.has(row.temporada)) map.set(row.temporada, []);
    map.get(row.temporada)!.push({ calibre: row.calibre, cantidadKg: row.cantidadKg });
  }
  return map;
}

/* ── Service ────────────────────────────────────────────────────────── */

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

  async uploadFromExcel(userId: string, productoId: string, variedadId: string | undefined, buffer: Buffer) {
    const producto = await prisma.producto.findUnique({ where: { id: productoId } });
    if (!producto) throw new AppError('Producto no encontrado', 404);

    if (variedadId) {
      const variedad = await prisma.variedad.findUnique({ where: { id: variedadId } });
      if (!variedad) throw new AppError('Variedad no encontrada', 404);
    }

    const rows = parseExcelBuffer(buffer);
    const grouped = groupBySeason(rows);

    const upserts = [];
    for (const [temporada, calibres] of grouped) {
      const existing = await prisma.historialCosecha.findFirst({
        where: { userId, productoId, variedadId: variedadId ?? null, temporada },
      });

      if (existing) {
        upserts.push(
          prisma.historialCosecha.update({
            where: { id: existing.id },
            data: { calibres },
          }),
        );
      } else {
        upserts.push(
          prisma.historialCosecha.create({
            data: { userId, productoId, variedadId, temporada, calibres },
          }),
        );
      }
    }

    await Promise.all(upserts);

    const prediction = await this.calculatePrediction(userId, productoId, variedadId);
    return {
      seasonsSaved: grouped.size,
      totalRows: rows.length,
      prediction,
    };
  }

  async getHistorial(userId: string) {
    return prisma.historialCosecha.findMany({
      where: { userId },
      include: { producto: true, variedad: true },
      orderBy: [{ productoId: 'asc' }, { temporada: 'desc' }],
    });
  }

  async calculatePrediction(userId: string, productoId: string, variedadId?: string): Promise<PredictionResult | null> {
    const records = await prisma.historialCosecha.findMany({
      where: {
        userId,
        productoId,
        ...(variedadId ? { variedadId } : {}),
      },
      include: { producto: true, variedad: true },
      orderBy: { temporada: 'asc' },
    });

    if (records.length < 2) return null;

    const calibresBySeason: CalibreEntry[][] = records.map(
      (r) => r.calibres as unknown as CalibreEntry[],
    );

    const allCalibres = new Set<string>();
    for (const season of calibresBySeason) {
      for (const c of season) allCalibres.add(c.calibre);
    }

    const predCalibres: PredictionCalibre[] = [];
    const nSeasons = calibresBySeason.length;
    const nextIndex = nSeasons;

    for (const calibre of allCalibres) {
      const values = calibresBySeason.map(
        (season) => season.find((c) => c.calibre === calibre)?.cantidadKg ?? 0,
      );

      const { slope, intercept } = linearRegression(values);
      let predicted = intercept + slope * nextIndex;
      predicted = Math.max(0, Math.round(predicted));

      const confidence = confidenceFromCV(values);

      let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
      if (values.length >= 2) {
        const last = values[values.length - 1]!;
        if (last > 0) {
          const change = (predicted - last) / last;
          if (change > 0.05) trend = 'UP';
          else if (change < -0.05) trend = 'DOWN';
        }
      }

      predCalibres.push({ calibre, estimatedKg: predicted, trend, confidence });
    }

    const lastSeason = records[records.length - 1]!.temporada;
    const estimation = predCalibres.map((c) => ({
      calibre: c.calibre,
      cantidadKg: c.estimatedKg,
      tendencia: c.trend,
      confidence: c.confidence,
    }));

    await prisma.historialCosecha.update({
      where: { id: records[records.length - 1]!.id },
      data: { estimacionProxima: estimation },
    });

    return {
      productoId,
      productoNombre: records[0]!.producto.nombre,
      variedadId: records[0]!.variedadId ?? undefined,
      variedadNombre: records[0]!.variedad?.nombre,
      calibres: predCalibres,
      basedOnSeasons: nSeasons,
      nextSeason: nextSeasonLabel(lastSeason),
    };
  }

  async getPredictions(userId: string) {
    const records = await prisma.historialCosecha.findMany({
      where: { userId, estimacionProxima: { not: Prisma.DbNull } },
      include: { producto: true, variedad: true },
      orderBy: { updatedAt: 'desc' },
    });

    const seen = new Set<string>();
    const predictions: PredictionResult[] = [];

    for (const r of records) {
      const key = `${r.productoId}-${r.variedadId ?? 'all'}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const est = r.estimacionProxima as unknown as Array<{
        calibre: string;
        cantidadKg: number;
        tendencia: string;
        confidence?: number;
      }>;

      predictions.push({
        productoId: r.productoId,
        productoNombre: r.producto.nombre,
        variedadId: r.variedadId ?? undefined,
        variedadNombre: r.variedad?.nombre,
        calibres: est.map((e) => ({
          calibre: e.calibre,
          estimatedKg: e.cantidadKg,
          trend: (e.tendencia as 'UP' | 'DOWN' | 'STABLE') ?? 'STABLE',
          confidence: e.confidence ?? 70,
        })),
        basedOnSeasons: 0,
        nextSeason: nextSeasonLabel(r.temporada),
      });
    }

    return predictions;
  }

  async deleteHistorial(id: string, userId: string) {
    const record = await prisma.historialCosecha.findUnique({ where: { id } });
    if (!record) throw new AppError('Registro no encontrado', 404);
    if (record.userId !== userId) throw new AppError('Acceso prohibido', 403);
    return prisma.historialCosecha.delete({ where: { id } });
  }
}

export const harvestEstimationService = new HarvestEstimationService();
