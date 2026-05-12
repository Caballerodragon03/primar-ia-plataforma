import { prisma } from '@primaria/database';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse: (data: Buffer) => Promise<{ text: string }> = require('pdf-parse');

const MAPA_BOLETIN_URL =
  'https://www.mapa.gob.es/es/agricultura/temas/producciones-agricolas/frutas-y-hortalizas/boletin_semanal_precios/boletines_2026/';
const MAPA_BASE = 'https://www.mapa.gob.es';
const MAPA_POWERBI_URL =
  'https://www.mapa.gob.es/es/estadistica/temas/estadisticas-agrarias/economia/powerbi-precios-medios-nacionales/';

interface PriceAgg {
  productoId: string;
  producto: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  totalKg: number;
  numTransacciones: number;
}

export class MarketService {
  // ─── Aggregated on-platform prices (public) ──────────────────────────────

  async getAveragePrices(daysWindow = 30): Promise<PriceAgg[]> {
    const since = new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000);

    // Aggregate from confirmed transactions only (best signal of real market price)
    const rows = await prisma.$queryRaw<
      Array<{
        producto_id: string;
        producto: string;
        avg_price: number;
        min_price: number;
        max_price: number;
        total_kg: number;
        num_transacciones: bigint;
      }>
    >`
      SELECT
        l.producto_id            AS producto_id,
        p.nombre                 AS producto,
        AVG(m.precio_kg)::float  AS avg_price,
        MIN(m.precio_kg)::float  AS min_price,
        MAX(m.precio_kg)::float  AS max_price,
        SUM(m.cantidad_kg)::float AS total_kg,
        COUNT(*)                 AS num_transacciones
      FROM matches m
      JOIN lotes l ON l.id = m.lote_id
      JOIN productos p ON p.id = l.producto_id
      WHERE m.estado = 'CONFIRMADO'
        AND m.created_at >= ${since}
      GROUP BY l.producto_id, p.nombre
      ORDER BY total_kg DESC
    `;

    return rows.map((r) => ({
      productoId: r.producto_id,
      producto: r.producto,
      avgPrice: Number(r.avg_price ?? 0),
      minPrice: Number(r.min_price ?? 0),
      maxPrice: Number(r.max_price ?? 0),
      totalKg: Number(r.total_kg ?? 0),
      numTransacciones: Number(r.num_transacciones ?? 0),
    }));
  }

  // ─── Latest sentiment report (public) ────────────────────────────────────

  async getLatestReport() {
    const report = await prisma.marketReport.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        semana: true,
        periodo: true,
        resumen: true,
        highlights: true,
        fuenteUrl: true,
        createdAt: true,
      },
    });
    return {
      report,
      sources: {
        boletinSemanal: MAPA_BOLETIN_URL,
        powerBiNacional: MAPA_POWERBI_URL,
      },
    };
  }

  // ─── Scraper + AI summarization (cron) ───────────────────────────────────

  /**
   * Fetches the index page, finds the latest weekly PDF, downloads it,
   * extracts text, summarizes via Gemini, and stores the result.
   * Idempotent: if the same week's report already exists, skips.
   */
  async generateWeeklyReport(): Promise<{ generated: boolean; reason?: string; semana?: string }> {
    if (env.GEMINI_API_KEY === 'placeholder') {
      return { generated: false, reason: 'GEMINI_API_KEY not configured' };
    }

    try {
      // 1. Fetch listing
      const listingRes = await fetch(MAPA_BOLETIN_URL, {
        headers: { 'User-Agent': 'Primar-IA Bot/1.0 (+https://primar-ia.com)' },
      });
      if (!listingRes.ok) {
        return { generated: false, reason: `Listing fetch failed: ${listingRes.status}` };
      }
      const html = await listingRes.text();

      // Match: <num>-2026-bolet-n-semanal-...periodo...pdf
      // We want the highest week number (latest)
      const pdfRegex = /href="(\/dam\/mapa[^"]*?(\d+)-2026-bolet[^"]*?\.pdf)"/g;
      const matches = [...html.matchAll(pdfRegex)];
      if (matches.length === 0) {
        return { generated: false, reason: 'No PDF links found on listing page' };
      }

      // Pick highest week number
      const sorted = matches
        .map((m) => ({ href: m[1]!, week: parseInt(m[2]!, 10) }))
        .sort((a, b) => b.week - a.week);
      const latest = sorted[0]!;
      const semana = `2026-W${String(latest.week).padStart(2, '0')}`;

      // 2. Skip if already processed
      const existing = await prisma.marketReport.findUnique({ where: { semana } });
      if (existing) {
        return { generated: false, reason: 'Already exists', semana };
      }

      // 3. Extract periodo from filename: e.g. "27-abril-3-mayo"
      const filenameMatch = latest.href.match(/2026-bolet-n-semanal-de-precios-(?:de-)?fyh--?(.+?)\.pdf$/);
      const periodo = filenameMatch
        ? filenameMatch[1]!.replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
        : `Semana ${latest.week}`;
      const pdfUrl = MAPA_BASE + latest.href;

      // 4. Download PDF
      const pdfRes = await fetch(pdfUrl, {
        headers: { 'User-Agent': 'Primar-IA Bot/1.0 (+https://primar-ia.com)' },
      });
      if (!pdfRes.ok) {
        return { generated: false, reason: `PDF fetch failed: ${pdfRes.status}` };
      }
      const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

      // 5. Extract text
      const parsed = await pdfParse(pdfBuffer);
      const rawText = parsed.text.trim();
      if (rawText.length < 200) {
        return { generated: false, reason: 'PDF text too short' };
      }

      // Truncate to avoid blowing token budget (Gemini Flash Lite handles ~30k tokens easily)
      const truncated = rawText.length > 80_000 ? rawText.slice(0, 80_000) : rawText;

      // 6. Call Gemini for summary
      const gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const model = gemini.getGenerativeModel({ model: env.GEMINI_MODEL });

      const prompt = `Eres un analista experto en mercados agrícolas españoles. Acabas de leer el boletín semanal oficial de precios de frutas y hortalizas del MAPA (Ministerio de Agricultura) correspondiente a la semana ${latest.week} de 2026 (${periodo}).

Tu tarea: redactar un informe breve para una plataforma B2B de comercialización entre productores y compradores de frutas y hortalizas.

Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura (sin markdown, sin bloques de código):

{
  "resumen": "Texto de 150-220 palabras en español resumiendo las tendencias clave de precios y volúmenes de la semana. Lenguaje profesional pero accesible.",
  "alza": ["Producto1: motivo breve", "Producto2: motivo breve", "..."],
  "baja": ["Producto1: motivo breve", "Producto2: motivo breve", "..."],
  "sentimiento": "Una palabra: alcista | bajista | estable | mixto"
}

Máximo 5 productos en "alza" y 5 en "baja". Si no hay datos suficientes para una sección, devuelve array vacío.

BOLETÍN OFICIAL:
${truncated}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();

      // Strip markdown code fences if Gemini adds them anyway
      const cleaned = responseText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

      let parsedAi: { resumen: string; alza: string[]; baja: string[]; sentimiento: string };
      try {
        parsedAi = JSON.parse(cleaned);
      } catch {
        // Fallback: store raw response as resumen
        parsedAi = { resumen: cleaned, alza: [], baja: [], sentimiento: 'estable' };
      }

      // 7. Persist
      await prisma.marketReport.create({
        data: {
          semana,
          periodo,
          resumen: parsedAi.resumen,
          highlights: {
            alza: parsedAi.alza ?? [],
            baja: parsedAi.baja ?? [],
            sentimiento: parsedAi.sentimiento ?? 'estable',
          },
          fuenteUrl: pdfUrl,
          pdfText: truncated,
        },
      });

      console.log(`[MARKET] Generated report for ${semana} (${periodo})`);
      return { generated: true, semana };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[MARKET] generateWeeklyReport failed:', msg);
      return { generated: false, reason: msg };
    }
  }

  // ─── Premium: per-product detailed analytics ─────────────────────────────

  async getProductDetail(productoId: string, daysWindow = 90) {
    const since = new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000);

    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
      select: { id: true, nombre: true, categoria: true },
    });
    if (!producto) return null;

    // Daily price history
    const history = await prisma.$queryRaw<
      Array<{ dia: Date; avg_price: number; total_kg: number }>
    >`
      SELECT
        DATE_TRUNC('day', m.created_at)::date AS dia,
        AVG(m.precio_kg)::float                AS avg_price,
        SUM(m.cantidad_kg)::float              AS total_kg
      FROM matches m
      JOIN lotes l ON l.id = m.lote_id
      WHERE l.producto_id = ${productoId}
        AND m.estado = 'CONFIRMADO'
        AND m.created_at >= ${since}
      GROUP BY DATE_TRUNC('day', m.created_at)
      ORDER BY dia ASC
    `;

    // Breakdown by calibre (from match calibresJson)
    const calibreBreakdown = await prisma.$queryRaw<
      Array<{ calibre: string; avg_price: number; total_kg: number; n: bigint }>
    >`
      SELECT
        elem ->> 'calibre'                                       AS calibre,
        AVG((elem ->> 'precio_kg')::float)::float                AS avg_price,
        SUM((elem ->> 'cantidad_kg')::float)::float              AS total_kg,
        COUNT(*)                                                 AS n
      FROM matches m
      JOIN lotes l ON l.id = m.lote_id
      , jsonb_array_elements(m.calibres_json) AS elem
      WHERE l.producto_id = ${productoId}
        AND m.estado = 'CONFIRMADO'
        AND m.created_at >= ${since}
      GROUP BY elem ->> 'calibre'
      ORDER BY total_kg DESC
    `;

    return {
      producto,
      windowDays: daysWindow,
      priceHistory: history.map((r) => ({
        dia: r.dia,
        avgPrice: Number(r.avg_price ?? 0),
        totalKg: Number(r.total_kg ?? 0),
      })),
      calibreBreakdown: calibreBreakdown.map((r) => ({
        calibre: r.calibre,
        avgPrice: Number(r.avg_price ?? 0),
        totalKg: Number(r.total_kg ?? 0),
        n: Number(r.n ?? 0),
      })),
    };
  }
}

export const marketService = new MarketService();
