import { env } from '../../config/env.js';

export const PLAN_LIMITS = {
  // ─── Vendedores (sellers) ──────────────────────────────────────────────────
  COSECHA: {
    maxLotesActivos: 3,
    maxFotosPorLote: 3,
    maxCertificados: 3,
    matchDelay: 15 * 60 * 1000,
    analyticsRango: 30,
    analyticsTendencias: false,
    exportCsv: false,
    exportPdf: false,
    estimacionCosecha: false,
    badge: null as string | null,
    precio: 0,
    get stripePriceId(): string | null { return null; },
  },
  CAMPO: {
    maxLotesActivos: 15,
    maxFotosPorLote: 10,
    maxCertificados: 5,
    matchDelay: 0,
    analyticsRango: 365,
    analyticsTendencias: false,
    exportCsv: true,
    exportPdf: false,
    estimacionCosecha: true,
    badge: 'Vendedor Activo' as string | null,
    precio: 1900,
    get stripePriceId(): string | null { return env.STRIPE_PRICE_CAMPO || null; },
  },
  FINCA: {
    maxLotesActivos: Infinity,
    maxFotosPorLote: Infinity,
    maxCertificados: Infinity,
    matchDelay: 0,
    analyticsRango: Infinity,
    analyticsTendencias: true,
    exportCsv: true,
    exportPdf: true,
    estimacionCosecha: true,
    badge: 'Vendedor Pro' as string | null,
    precio: 4900,
    get stripePriceId(): string | null { return env.STRIPE_PRICE_FINCA || null; },
  },

  // ─── Compradores (buyers) ──────────────────────────────────────────────────
  MERCADO: {
    maxPedidosActivos: 5,
    descuentoComision: 0,
    analyticsRango: 30,
    analyticsTendencias: false,
    exportEstadisticas: false,
    badge: null as string | null,
    precio: 0,
    get stripePriceId(): string | null { return null; },
  },
  LONJA: {
    maxPedidosActivos: 20,
    descuentoComision: 0,
    analyticsRango: 365,
    analyticsTendencias: false,
    exportEstadisticas: false,
    badge: 'Comprador Verificado' as string | null,
    precio: 2900,
    get stripePriceId(): string | null { return env.STRIPE_PRICE_LONJA || null; },
  },
  CENTRAL: {
    maxPedidosActivos: Infinity,
    descuentoComision: 0.004,
    analyticsRango: Infinity,
    analyticsTendencias: true,
    exportEstadisticas: true,
    badge: 'Comprador Premium' as string | null,
    precio: 8900,
    get stripePriceId(): string | null { return env.STRIPE_PRICE_CENTRAL || null; },
  },
};

export type VendedorPlan = 'COSECHA' | 'CAMPO' | 'FINCA';
export type CompradorPlan = 'MERCADO' | 'LONJA' | 'CENTRAL';
export type AnyPlan = VendedorPlan | CompradorPlan;

export const VENDEDOR_PLANS: VendedorPlan[] = ['COSECHA', 'CAMPO', 'FINCA'];
export const COMPRADOR_PLANS: CompradorPlan[] = ['MERCADO', 'LONJA', 'CENTRAL'];
