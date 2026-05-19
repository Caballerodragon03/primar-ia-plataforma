/**
 * Phase 14M v3 — Interceptor para el modo prueba de tutoriales.
 *
 * Cuando useTutorialStore.flow != null, este módulo intercepta cualquier
 * llamada de mutación a endpoints sensibles y devuelve respuestas
 * mockeadas. También intercepta los GETs que el flow necesita "fabricar"
 * (lote, match, contrato, transaccion ficticios).
 *
 * Cualquier endpoint NO listado pasa al backend real. El interceptor es
 * conservador: prefiere dejar pasar que romper algo. Las mutaciones
 * críticas (POST /lots, POST /contracts/.../sign, etc.) están en una
 * allowlist explícita y se MOCKEAN siempre que el tutorial esté activo.
 */
import type { AxiosRequestConfig } from 'axios';
import { useTutorialStore, TUTORIAL_IDS } from '@/store/tutorial.store';

// Endpoints que se MOCKEAN (no llegan al backend) cuando el tutorial
// está activo. Comparamos con URL.startsWith (sin query string).
const MOCK_MUTATION_PATTERNS: Array<{
  method: 'POST' | 'PATCH' | 'DELETE';
  path: RegExp;
  // Builder de la data devuelta. Recibe el body de la petición.
  build: (body: unknown) => unknown;
}> = [
  {
    method: 'POST',
    path: /^\/lots$/,
    build: (body) => {
      useTutorialStore.getState().setMock({
        lote: { id: TUTORIAL_IDS.LOTE, estado: 'ACTIVO', ...(body as object) },
      });
      return { data: { id: TUTORIAL_IDS.LOTE, estado: 'ACTIVO' } };
    },
  },
  {
    method: 'POST',
    path: /^\/matching\/matches\/[^/]+\/contribute$/,
    build: () => {
      useTutorialStore.getState().setMock({
        match: { id: TUTORIAL_IDS.MATCH, estado: 'ACEPTADO_VENDEDOR' },
      });
      return { data: { id: TUTORIAL_IDS.MATCH, estado: 'ACEPTADO_VENDEDOR' } };
    },
  },
  {
    method: 'POST',
    path: /^\/contracts\/match\/[^/]+\/sign-seller$/,
    build: () => ({ success: true, data: { contratoEstado: 'PENDIENTE_PAGO_COMPRADOR' } }),
  },
  {
    method: 'POST',
    path: /^\/contracts\/match\/[^/]+\/commission-checkout$/,
    build: () => ({ success: true, data: { url: '__tutorial_stripe__' } }),
  },
  {
    method: 'POST',
    path: /^\/contracts\/match\/[^/]+\/mark-shipped$/,
    build: () => ({ success: true, data: { enviadoEn: new Date().toISOString() } }),
  },
  {
    method: 'POST',
    path: /^\/contracts\/match\/[^/]+\/mark-received$/,
    build: () => ({ success: true, data: { recibidoEn: new Date().toISOString() } }),
  },
  {
    method: 'POST',
    path: /^\/orders$/,
    build: (body) => {
      useTutorialStore.getState().setMock({
        pedido: { id: TUTORIAL_IDS.PEDIDO, estado: 'ACTIVO', ...(body as object) },
      } as Partial<ReturnType<typeof useTutorialStore.getState>['mock']>);
      return { data: { id: TUTORIAL_IDS.PEDIDO, estado: 'ACTIVO' } };
    },
  },
  // Negociaciones en chat: nada se envía de verdad durante el tutorial.
  {
    method: 'POST',
    path: /^\/chat\/[^/]+\/offers/,
    build: () => ({ data: { id: 'tutorial-neg', estado: 'PENDIENTE' } }),
  },
  // Valoraciones — al final del tour la "valoración" no se guarda.
  {
    method: 'POST',
    path: /^\/valoraciones/,
    build: () => ({ data: { id: 'tutorial-rating', estado: 'ok' } }),
  },
  // Subida de archivos: el dropzone llama a /upload (R2 presigned). En
  // tutorial devolvemos una URL ficticia para que el form acepte sin
  // tocar R2.
  {
    method: 'POST',
    path: /^\/upload/,
    build: () => ({ data: { url: 'https://example.com/tutorial-photo.jpg' } }),
  },
];

/**
 * Llamado por el axios request interceptor. Si devuelve una promesa,
 * el axios la usa como respuesta y NO ejecuta la petición real.
 *
 * Implementación: lanzamos un objeto especial que el response error
 * interceptor reconoce y convierte en respuesta exitosa.
 */
export function maybeShortCircuit(config: AxiosRequestConfig): { mockedData: unknown } | null {
  const flow = useTutorialStore.getState().flow;
  if (!flow) return null;

  const method = (config.method ?? 'GET').toUpperCase() as 'GET' | 'POST' | 'PATCH' | 'DELETE';
  const url = (config.url ?? '').split('?')[0] ?? '';

  if (method !== 'GET') {
    for (const rule of MOCK_MUTATION_PATTERNS) {
      if (rule.method === method && rule.path.test(url)) {
        const data = rule.build(config.data);
        return { mockedData: { success: true, ...(data as object) } };
      }
    }
    // Mutación fuera de la lista durante un tutorial: SE BLOQUEA por
    // seguridad. Nada se guarda durante un tour.
    if (['POST', 'PATCH', 'DELETE'].includes(method)) {
      // Excepción: dejamos pasar /tutorials/* para que el progreso del
      // propio tutorial se persista (mark completado).
      if (url.startsWith('/tutorials/')) return null;
      // Dejamos pasar /auth/* por si refresca el token.
      if (url.startsWith('/auth/')) return null;
      return { mockedData: { success: true, data: null, mockedReason: 'tutorial-mode' } };
    }
  }

  // GET mocks: pantallas que el flow visita y necesitan datos ficticios.
  if (method === 'GET') {
    if (url === `/lots/${TUTORIAL_IDS.LOTE}`) {
      const lote = useTutorialStore.getState().mock.lote;
      return { mockedData: { success: true, data: lote ?? null } };
    }
    if (url === `/contracts/match/${TUTORIAL_IDS.MATCH}`) {
      return {
        mockedData: {
          success: true,
          data: {
            matchId: TUTORIAL_IDS.MATCH,
            contratoEstado: 'BORRADOR',
            contratoPdfUrl: null,
            firmaVendedorDeadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          },
        },
      };
    }
  }

  return null;
}
