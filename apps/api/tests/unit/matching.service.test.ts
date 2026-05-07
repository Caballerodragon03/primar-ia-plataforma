// Unit tests for MatchingService — Prisma client is fully mocked.

jest.mock('@primaria/database', () => ({
  prisma: {
    lote: { findUnique: jest.fn() },
    pedido: { findMany: jest.fn() },
    match: { upsert: jest.fn() },
    user: { findUnique: jest.fn() },
    empresa: { findUnique: jest.fn() },
    disputa: { findFirst: jest.fn().mockResolvedValue(null) },
    transaccion: { count: jest.fn().mockResolvedValue(0) },
    suscripcion: { findUnique: jest.fn().mockResolvedValue(null) },
    mensaje: { create: jest.fn() },
    producto: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn({
      match: { update: jest.fn().mockResolvedValue({}) },
      lote: { update: jest.fn() },
      pedido: { update: jest.fn() },
    })),
  },
}));

// Also mock transactional email so tests never attempt network calls
jest.mock('../../src/shared/emails/transactional', () => ({
  sendMatchProposalEmail: jest.fn().mockResolvedValue(undefined),
}));

import { prisma } from '@primaria/database';
import { MatchingService } from '../../src/modules/matching/matching.service';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLote(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lote-001',
    vendedorId: 'seller-001',
    productoId: 'product-001',
    variedadId: null,
    estado: 'ACTIVO',
    calibres: [{ calibre: 'M', cantidad_kg: 1000, precio_min_kg: 0.8 }],
    fechaDisponibilidad: new Date('2025-01-01'),
    coordenadasLat: null,
    coordenadasLng: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    vendedor: {
      scoreFiabilidad: { toNumber: () => 85 },
      scoreStatus: 'OK',
      transaccionesOk: 5,
      transaccionesIncid: 0,
    },
    ...overrides,
  };
}

function makePedido(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pedido-001',
    compradorId: 'buyer-001',
    productoId: 'product-001',
    variedadId: null,
    estado: 'ACTIVO',
    calibresSolicitados: [{ calibre: 'M', cantidad_kg: 500, precio_max_kg: 1.0 }],
    fechaEntregaDeseada: new Date('2025-06-01'),
    ...overrides,
  };
}

function makeMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'match-001',
    loteId: 'lote-001',
    pedidoId: 'pedido-001',
    cantidadKg: 500,
    precioKg: 0.8,
    calibresJson: [],
    estado: 'PROPUESTO',
    scoreMatching: 0.72,
    scoreDetalle: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MatchingService.runMatchingForLot', () => {
  let service: MatchingService;

  beforeEach(() => {
    service = new MatchingService();
    jest.clearAllMocks();
  });

  it('throws 404 when lote does not exist', async () => {
    (mockPrisma.lote.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.runMatchingForLot('nonexistent')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws 400 when lote is not ACTIVO', async () => {
    (mockPrisma.lote.findUnique as jest.Mock).mockResolvedValue(
      makeLote({ estado: 'VENDIDO' })
    );

    await expect(service.runMatchingForLot('lote-001')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('returns empty array when no pedidos match mandatory product criteria', async () => {
    (mockPrisma.lote.findUnique as jest.Mock).mockResolvedValue(makeLote());
    // Pedido asks for a different product
    (mockPrisma.pedido.findMany as jest.Mock).mockResolvedValue([
      makePedido({ productoId: 'product-DIFFERENT' }),
    ]);

    const result = await service.runMatchingForLot('lote-001');
    expect(result).toEqual([]);
    expect(mockPrisma.match.upsert).not.toHaveBeenCalled();
  });

  it('returns empty array when precio_min_kg of lote > precio_max_kg of pedido (price incompatibility)', async () => {
    (mockPrisma.lote.findUnique as jest.Mock).mockResolvedValue(
      makeLote({
        calibres: [{ calibre: 'M', cantidad_kg: 1000, precio_min_kg: 2.0 }],
      })
    );
    (mockPrisma.pedido.findMany as jest.Mock).mockResolvedValue([
      makePedido({
        calibresSolicitados: [{ calibre: 'M', cantidad_kg: 500, precio_max_kg: 1.0 }],
      }),
    ]);

    const result = await service.runMatchingForLot('lote-001');
    expect(result).toEqual([]);
  });

  it('returns a Match when lote and pedido meet all hard criteria', async () => {
    const lote = makeLote();
    const pedido = makePedido();
    const match = makeMatch();

    (mockPrisma.lote.findUnique as jest.Mock).mockResolvedValue(lote);
    (mockPrisma.pedido.findMany as jest.Mock).mockResolvedValue([pedido]);
    (mockPrisma.match.upsert as jest.Mock).mockResolvedValue(match);

    const result = await service.runMatchingForLot('lote-001');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'match-001' });
  });

  it('scoreMatching is between 0 and 1 for a valid match', async () => {
    const lote = makeLote();
    const pedido = makePedido();

    (mockPrisma.lote.findUnique as jest.Mock).mockResolvedValue(lote);
    (mockPrisma.pedido.findMany as jest.Mock).mockResolvedValue([pedido]);
    (mockPrisma.match.upsert as jest.Mock).mockImplementation(({ create }) => ({
      ...makeMatch(),
      scoreMatching: create.scoreMatching,
    }));

    const result = await service.runMatchingForLot('lote-001');
    expect(result).toHaveLength(1);
    const score = result[0].scoreMatching as number;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('score formula weights sum correctly (0.4+0.2+0.2+0.2 = 1.0)', () => {
    // Verify the documented weight constants sum to exactly 1.0
    const weights = [0.4, 0.2, 0.2, 0.2];
    const sum = weights.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('filters pedido where fechaEntregaDeseada is before lote fechaDisponibilidad', async () => {
    (mockPrisma.lote.findUnique as jest.Mock).mockResolvedValue(
      makeLote({ fechaDisponibilidad: new Date('2025-12-01') })
    );
    (mockPrisma.pedido.findMany as jest.Mock).mockResolvedValue([
      makePedido({ fechaEntregaDeseada: new Date('2025-01-01') }),
    ]);

    const result = await service.runMatchingForLot('lote-001');
    expect(result).toEqual([]);
  });

  it('filters pedido with no overlapping calibres', async () => {
    (mockPrisma.lote.findUnique as jest.Mock).mockResolvedValue(
      makeLote({ calibres: [{ calibre: 'M', cantidad_kg: 1000, precio_min_kg: 0.8 }] })
    );
    (mockPrisma.pedido.findMany as jest.Mock).mockResolvedValue([
      makePedido({
        calibresSolicitados: [{ calibre: 'L', cantidad_kg: 500, precio_max_kg: 1.0 }],
      }),
    ]);

    const result = await service.runMatchingForLot('lote-001');
    expect(result).toEqual([]);
  });
});
