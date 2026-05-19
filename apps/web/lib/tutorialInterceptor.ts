/**
 * Phase 14M v3.4 — Interceptor para el modo prueba de tutoriales.
 *
 * Cuando useTutorialStore.flow != null, intercepta:
 *   • POST/PATCH/DELETE sobre endpoints sensibles → respuestas mock.
 *   • Cualquier otra mutación → SE BLOQUEA (devuelve null) por
 *     seguridad. Sólo se dejan pasar /auth/* y /tutorials/*.
 *   • GETs que el tour necesita "fabricar":
 *       /matching/seller/matches → 1 match ficticio.
 *       /matching/seller/market-demand → array vacío.
 *       /matching/seller/similar-offers → array vacío.
 *       /lots y /lots/{tutorial-id} → mock lot.
 *       /orders → 1 pedido ficticio.
 *       /orders/{tutorial-id} → detalle del pedido ficticio (con la
 *         oferta del vendedor anidada).
 *       /contracts/match/{tutorial-match}/info → contrato mock con el
 *         estado correcto según el flow.
 *
 * Cualquier endpoint no listado pasa al backend real.
 */
import type { AxiosRequestConfig } from 'axios';
import { useTutorialStore, TUTORIAL_IDS } from '@/store/tutorial.store';

// ─── Builders de datos ficticios ─────────────────────────────────────

function mockMatch(): unknown {
  return {
    id: TUTORIAL_IDS.MATCH,
    loteId: TUTORIAL_IDS.LOTE,
    pedidoId: TUTORIAL_IDS.PEDIDO,
    cantidadKg: '1000',
    precioKg: '3.150',
    calibresJson: [{ calibre: '14', cantidad_kg: 1000, precio_kg: 3.15 }],
    estado: 'PROPUESTO',
    scoreMatching: 0.84,
    scoreDetalle: null,
    createdAt: new Date().toISOString(),
    pedido: {
      id: TUTORIAL_IDS.PEDIDO,
      destinoFinal: 'Mercabarna Barcelona',
      calibresSolicitados: [{ calibre: '14', cantidad_kg: 1000, precio_max_kg: 3.2 }],
      producto: { nombre: 'Aguacate' },
      variedad: { nombre: 'Hass' },
      incoterm: 'DAP',
      incotermsAceptados: ['DAP'],
      comprador: {
        id: 'tutorial-comprador-X',
        nombre: 'Frutas García',
        apellidos: 'S.L.',
        empresa: { razonSocial: 'Frutas García S.L.' },
        scoreFiabilidad: 78,
        scoreStatus: 'PUBLISHED',
      },
    },
    lote: {
      id: TUTORIAL_IDS.LOTE,
      calibres: [
        { calibre: '14', cantidad_kg: 2000 },
        { calibre: '16', cantidad_kg: 2000 },
        { calibre: '18', cantidad_kg: 1000 },
      ],
      direccionRecogida: 'Vélez-Málaga 29700, Málaga',
    },
    distanceKm: 980,
    coverage: 0,
    indiceRentabilidad: 84,
    loteRestantePorCalibre: { '14': 2000, '16': 2000, '18': 1000 },
    pedidoRestantePorCalibre: { '14': 1000 },
  };
}

function mockOrderListItem(): unknown {
  return {
    id: TUTORIAL_IDS.PEDIDO,
    productoId: 'tutorial-prod-NJ',
    variedadId: 'tutorial-var-NV',
    calibresSolicitados: [
      { calibre: '3', cantidad_kg: 3000, precio_max_kg: 0.55 },
      { calibre: '4', cantidad_kg: 2000, precio_max_kg: 0.48 },
    ],
    cantidadKg: 5000,
    destinoFinal: 'Mercabarna Barcelona',
    estado: 'ACTIVO',
    incoterm: 'DAP',
    fechaEntregaDeseada: new Date(Date.now() + 21 * 24 * 3600 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    producto: { nombre: 'Naranja', categoria: 'CITRICOS' },
    variedad: { nombre: 'Navelina' },
    totalKg: 5000,
    coverage: 0,
    matches: [],
  };
}

function mockOrderDetail(): unknown {
  return {
    id: TUTORIAL_IDS.PEDIDO,
    estado: 'PARCIALMENTE_CUBIERTO',
    producto: { nombre: 'Naranja' },
    variedad: { nombre: 'Navelina' },
    calibresSolicitados: [
      { calibre: '3', cantidad_kg: 3000, precio_max_kg: 0.55 },
      { calibre: '4', cantidad_kg: 2000, precio_max_kg: 0.48 },
    ],
    destinoFinal: 'Mercabarna Barcelona',
    fechaEntregaDeseada: new Date(Date.now() + 21 * 24 * 3600 * 1000).toISOString(),
    incoterm: 'DAP',
    matches: [
      {
        id: TUTORIAL_IDS.MATCH,
        cantidadKg: '1500',
        precioKg: '0.520',
        estado: 'ACEPTADO_VENDEDOR',
        scoreMatching: 0.84,
        lote: {
          vendedor: {
            id: 'tutorial-vendedor-X',
            nombre: 'Cooperativa',
            apellidos: 'El Naranjo',
            scoreFiabilidad: 82,
            scoreStatus: 'PUBLISHED',
          },
        },
        transaccion: { id: TUTORIAL_IDS.TRANSACCION },
      },
    ],
  };
}

function mockLot(): unknown {
  const lote = useTutorialStore.getState().mock.lote ?? {};
  return {
    id: TUTORIAL_IDS.LOTE,
    estado: 'ACTIVO',
    calibres: [
      { calibre: '14', cantidad_kg: 2000 },
      { calibre: '16', cantidad_kg: 2000 },
      { calibre: '18', cantidad_kg: 1000 },
    ],
    direccionRecogida: 'Vélez-Málaga 29700, Málaga',
    fechaDisponibilidad: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    fechaFinDisponibilidad: new Date(Date.now() + 32 * 24 * 3600 * 1000).toISOString(),
    producto: { nombre: 'Aguacate' },
    variedad: { nombre: 'Hass' },
    matches: [],
    coverage: 0,
    totalKg: 5000,
    ...(lote as object),
  };
}

function mockContractInfo(): unknown {
  const flow = useTutorialStore.getState().flow;
  const isSeller = flow === 'crear-lote';
  return {
    matchId: TUTORIAL_IDS.MATCH,
    transaccionId: TUTORIAL_IDS.TRANSACCION,
    contratoEstado: 'PENDIENTE_FIRMA_VENDEDOR',
    contratoBorradorUrl: null,
    contratoPdfUrl: null,
    comisionEstimada: 78.75,
    comisionPorcentaje: 0.025,
    producto: isSeller ? 'Aguacate' : 'Naranja',
    variedad: isSeller ? 'Hass' : 'Navelina',
    cantidadKg: isSeller ? 1000 : 1500,
    precioKg: isSeller ? 3.15 : 0.52,
    precioTotalMercancia: isSeller ? 3150 : 780,
    calibres: isSeller
      ? [{ calibre: '14', cantidad_kg: 1000, precio_min_kg: 3.15 }]
      : [{ calibre: '3', cantidad_kg: 1500, precio_max_kg: 0.52 }],
    incoterm: 'DAP',
    logistica: isSeller ? 'YO_ENVIO' : 'OTRO_RECOGE',
    terminoPago: 'CONTADO',
    destinoFinal: 'Mercabarna Barcelona',
    direccionRecogida: 'Vélez-Málaga 29700, Málaga',
    facturaPlataformaUrl: null,
    facturaVendedorUrl: null,
    resguardoPagoUrl: null,
    firmaVendedorDeadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    firmaVendedor: null,
    firmaVendedorFecha: null,
    firmaComprador: null,
    firmaCompradorFecha: null,
    comisionPagadaEn: null,
    enviadoEn: null,
    recibidoEn: null,
    hasRatedCounterpart: false,
    counterpartId: isSeller ? 'tutorial-comprador-X' : 'tutorial-vendedor-X',
    canceladoEn: null,
    motivoCancelacion: null,
    canceladoPorMi: false,
    isSeller,
    isBuyer: !isSeller,
  };
}

// ─── Reglas de mutaciones ────────────────────────────────────────────

const MOCK_MUTATION_PATTERNS: Array<{
  method: 'POST' | 'PATCH' | 'DELETE';
  path: RegExp;
  build: (body: unknown) => unknown;
}> = [
  { method: 'POST', path: /^\/lots$/, build: (body) => {
    useTutorialStore.getState().setMock({
      lote: { id: TUTORIAL_IDS.LOTE, estado: 'ACTIVO', ...(body as object) },
    });
    return { data: { id: TUTORIAL_IDS.LOTE, estado: 'ACTIVO' } };
  } },
  { method: 'POST', path: /^\/matching\/matches\/[^/]+\/contribute$/, build: () => {
    useTutorialStore.getState().setMock({
      match: { id: TUTORIAL_IDS.MATCH, estado: 'ACEPTADO_VENDEDOR' },
    });
    return { data: { id: TUTORIAL_IDS.MATCH, estado: 'ACEPTADO_VENDEDOR' } };
  } },
  { method: 'POST', path: /^\/contracts\/match\/[^/]+\/sign-seller$/, build: () => ({
    data: { contratoEstado: 'PENDIENTE_PAGO_COMPRADOR' },
  }) },
  { method: 'POST', path: /^\/contracts\/match\/[^/]+\/commission-checkout$/, build: () => ({
    data: { url: '__tutorial_stripe__' },
  }) },
  { method: 'POST', path: /^\/contracts\/match\/[^/]+\/mark-shipped$/, build: () => ({
    data: { enviadoEn: new Date().toISOString() },
  }) },
  { method: 'POST', path: /^\/contracts\/match\/[^/]+\/mark-received$/, build: () => ({
    data: { recibidoEn: new Date().toISOString() },
  }) },
  { method: 'POST', path: /^\/orders$/, build: (body) => {
    useTutorialStore.getState().setMock({
      pedido: { id: TUTORIAL_IDS.PEDIDO, estado: 'ACTIVO', ...(body as object) },
    } as Partial<ReturnType<typeof useTutorialStore.getState>['mock']>);
    return { data: { id: TUTORIAL_IDS.PEDIDO, estado: 'ACTIVO' } };
  } },
  { method: 'POST', path: /^\/chat\/[^/]+\/offers/, build: () => ({
    data: { id: 'tutorial-neg', estado: 'PENDIENTE' },
  }) },
  { method: 'POST', path: /^\/valoraciones/, build: () => ({ data: { id: 'tutorial-rating' } }) },
  { method: 'POST', path: /^\/upload/, build: () => ({
    data: { url: 'https://example.com/tutorial-photo.jpg' },
  }) },
];

// ─── Patrones GET mockeados ──────────────────────────────────────────

function mockGetForUrl(url: string): unknown | null {
  // Listado de matches (vendedor) — devuelve 1 ficticio para que el
  // spotlight del paso 'ver-matches' tenga algo que apuntar.
  if (url === '/matching/seller/matches') {
    return { success: true, data: [mockMatch()] };
  }
  if (url === '/matching/seller/market-demand') {
    return { success: true, data: [] };
  }
  if (url === '/matching/seller/similar-offers' || url.startsWith('/matching/seller/similar-offers')) {
    return { success: true, data: [] };
  }
  if (url === '/lots' || url.startsWith('/lots?')) {
    return { success: true, data: [{ ...(mockLot() as object), id: TUTORIAL_IDS.LOTE }] };
  }
  if (url === `/lots/${TUTORIAL_IDS.LOTE}`) {
    return { success: true, data: mockLot() };
  }
  if (url === '/orders' || url.startsWith('/orders?')) {
    return { success: true, data: [mockOrderListItem()] };
  }
  if (url === `/orders/${TUTORIAL_IDS.PEDIDO}`) {
    return { success: true, data: mockOrderDetail() };
  }
  if (url === `/contracts/match/${TUTORIAL_IDS.MATCH}/info`) {
    return { success: true, data: mockContractInfo() };
  }
  if (url === '/valoraciones/pending') {
    return { success: true, data: null };
  }
  return null;
}

// ─── Entry point ─────────────────────────────────────────────────────

export function maybeShortCircuit(config: AxiosRequestConfig): { mockedData: unknown } | null {
  const flow = useTutorialStore.getState().flow;
  if (!flow) return null;

  const method = (config.method ?? 'GET').toUpperCase() as 'GET' | 'POST' | 'PATCH' | 'DELETE';
  const url = (config.url ?? '').split('?')[0] ?? '';

  if (method === 'GET') {
    const data = mockGetForUrl(config.url ?? '');
    if (data) return { mockedData: data };
    return null;
  }

  // Mutaciones: o mockeada o bloqueada por seguridad.
  for (const rule of MOCK_MUTATION_PATTERNS) {
    if (rule.method === method && rule.path.test(url)) {
      const data = rule.build(config.data);
      return { mockedData: { success: true, ...(data as object) } };
    }
  }
  // Dejamos pasar /tutorials/* y /auth/*; cualquier otra mutación se
  // bloquea para no contaminar producción.
  if (url.startsWith('/tutorials/')) return null;
  if (url.startsWith('/auth/')) return null;
  return { mockedData: { success: true, data: null, mockedReason: 'tutorial-mode' } };
}
