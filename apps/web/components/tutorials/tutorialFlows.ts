/**
 * Phase 14M v3 — Definición de los flows en modo prueba.
 *
 * Cada FlowStep describe DÓNDE estamos (route + opcionalmente target
 * CSS), QUÉ explicamos (title + content) y, si toca, QUÉ autofill
 * disparamos para que el page receptor rellene los inputs con datos
 * inventados.
 *
 * Los pasos `kind: 'modal'` son saltos al exterior (Stripe, QR) que
 * no podemos simular sobre la UI real → modal explicativo.
 */

export interface FlowStep {
  key: string;
  kind: 'spotlight' | 'modal';
  route?: string;
  target?: string;
  placement?: 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'center';
  title: string;
  content: string;
  note?: string;
  // Cuando el paso tiene autofill, se dispara un evento
  // `tutorial:autofill` con `detail.stepKey === key` y `detail.data`.
  autofill?: Record<string, unknown>;
}

export const CREAR_LOTE_FLOW: FlowStep[] = [
  {
    key: 'inicio',
    kind: 'modal',
    route: '/seller/dashboard',
    title: 'Modo prueba activado',
    content:
      'Vamos a recorrer el flujo COMPLETO de venta sobre la plataforma real. Te guiaré paso a paso, los formularios se autorrellenan con datos inventados y nada se guarda en la base de datos.',
    note: 'Modo prueba — ninguna acción durante este tutorial persiste en producción.',
  },
  {
    key: 'sidebar-lots',
    kind: 'spotlight',
    route: '/seller/dashboard',
    target: '[data-tutorial="sidebar"]',
    placement: 'right',
    title: 'Navegar a "Mis lotes"',
    content:
      'En el menú lateral pulsa en "Mis lotes". Te llevaré yo automáticamente al pulsar Continuar.',
  },
  {
    key: 'open-lots',
    kind: 'spotlight',
    route: '/seller/lots',
    target: 'a[href$="/seller/lots/new"], button:has(+ [data-tutorial="publicar-lote"])',
    placement: 'left',
    title: 'Publicar lote nuevo',
    content:
      'Desde la lista de lotes pulsa en "Publicar lote nuevo" (arriba a la derecha) cuando quieras vender. Continúa para abrir el formulario.',
  },
  {
    key: 'fill-producto',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: 'body',
    placement: 'center',
    title: 'Producto y variedad',
    content:
      'He autorrellenado producto=Aguacate y variedad=Hass. En real elegirías de los desplegables. Importante: los compradores filtran por variedad — sé específico.',
    autofill: {
      producto: 'Aguacate',
      variedad: 'Hass',
      temporada: '2026-primavera',
    },
  },
  {
    key: 'fill-calibres',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: 'body',
    placement: 'center',
    title: 'Calibres y precio mínimo €/kg',
    content:
      'Calibre 14: 2.000 kg a 3,20 €/kg mín. · Calibre 16: 2.000 kg a 2,80 €/kg · Calibre 18: 1.000 kg a 2,40 €/kg. El motor solo te empareja con compradores que paguen ≥ a tu mínimo.',
    autofill: {
      calibres: [
        { calibre: '14', cantidad_kg: 2000, precio_min_kg: 3.2 },
        { calibre: '16', cantidad_kg: 2000, precio_min_kg: 2.8 },
        { calibre: '18', cantidad_kg: 1000, precio_min_kg: 2.4 },
      ],
    },
  },
  {
    key: 'fill-incoterm',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: 'body',
    placement: 'center',
    title: 'Logística e Incoterm',
    content:
      'Hemos elegido "Yo envío" + DAP (entrega en destino, riesgo del transporte por tu cuenta hasta llegar). Si no estás seguro de qué incoterm usar, el wizard te recomienda uno.',
    autofill: {
      logistica: 'YO_ENVIO',
      incoterm: 'DAP',
      direccionRecogida: 'Vélez-Málaga 29700',
    },
  },
  {
    key: 'publicar',
    kind: 'modal',
    title: '¡Lote publicado!',
    content:
      'Al pulsar "Publicar" el motor de matching cruza tus calibres, precios e incoterm con los pedidos activos. Saltamos esa parte y vamos directamente a ver los matches que aparecen.',
    note: 'En real el botón pegaría a POST /lots. En modo prueba está interceptado.',
  },
  {
    key: 'ver-matches',
    kind: 'spotlight',
    route: '/seller/matches',
    target: 'body',
    placement: 'center',
    title: 'Tus matches con compradores',
    content:
      'Cada tarjeta es un comprador que encaja con tu lote: ves su puntuación, kg solicitados, precio €/kg y match score. Puedes aceptar, negociar en chat, o rechazar.',
  },
  {
    key: 'aceptar-match',
    kind: 'modal',
    title: 'Aceptar la contribución',
    content:
      'Imagina que pulsas "Contribuir al pedido" en la primera tarjeta. El modal te pregunta cuántos kg comprometes por calibre — tope = mínimo entre lo que tienes y lo que el comprador pide.',
    note: 'En modo prueba simulamos que aceptas 1.000 kg de calibre 14 a 3,15 €/kg.',
  },
  {
    key: 'firmar-contrato',
    kind: 'modal',
    title: 'Firmar el contrato',
    content:
      'Primar-IA genera el borrador automáticamente con los términos acordados. Tú firmas dibujando en un canvas (o tecleando rúbrica). Tienes 48 h hábiles para hacerlo, si no, el match caduca.',
    note: 'Después firma el comprador y paga la comisión de la plataforma. Hasta ese pago el contrato no está FIRMADO.',
  },
  {
    key: 'comprador-paga',
    kind: 'modal',
    title: 'El comprador paga la comisión',
    content:
      'El comprador recibe una notificación, firma y va a Stripe Checkout para pagar la comisión de la plataforma (no a ti — el pago de la mercancía es directo entre vosotros más tarde).',
    note: 'Esta parte ocurre en el dominio de Stripe, así que en el tutorial no la simulamos visualmente.',
  },
  {
    key: 'marcar-enviado',
    kind: 'modal',
    title: 'Marcar como enviado',
    content:
      'Cuando el camión sale, pulsas "Marcar como enviado" en la página del contrato. Primar-IA notifica al comprador y le genera un código QR para confirmar la entrega.',
  },
  {
    key: 'recibido',
    kind: 'modal',
    title: 'Entrega confirmada',
    content:
      'El comprador escanea el QR al recibir el camión. El sistema marca la operación como entregada y os habilita la valoración mutua (1-5 estrellas).',
  },
  {
    key: 'cobrar',
    kind: 'modal',
    title: 'Cobrar la mercancía',
    content:
      'El pago entre vosotros se hace fuera de la plataforma (transferencia bancaria) según el término que pactasteis: contado, 30 días, 60 días… Primar-IA solo intermedia el contrato y la comisión.',
  },
  {
    key: 'final',
    kind: 'modal',
    title: '¡Operación completada!',
    content:
      'Al cerrar sin incidencias subes tu puntuación de fiabilidad. Cuantas más operaciones cierres bien, mejor reputación tendrás — y mejores condiciones, badges y matches prioritarios desbloquearás.',
    note: 'Modo prueba cerrado. Nada se ha guardado.',
  },
];

export const HACER_PEDIDO_FLOW: FlowStep[] = [
  {
    key: 'inicio',
    kind: 'modal',
    route: '/buyer/dashboard',
    title: 'Modo prueba activado',
    content:
      'Vamos a recorrer el flujo COMPLETO de compra sobre la plataforma real. Te guiaré paso a paso, los formularios se autorrellenan con datos inventados y nada se guarda en la base de datos.',
    note: 'Modo prueba — ninguna acción durante este tutorial persiste en producción.',
  },
  {
    key: 'sidebar-orders',
    kind: 'spotlight',
    route: '/buyer/dashboard',
    target: '[data-tutorial="sidebar"]',
    placement: 'right',
    title: 'Navegar a "Mis pedidos"',
    content:
      'En el menú lateral pulsa en "Mis pedidos". Te llevaré automáticamente al pulsar Continuar.',
  },
  {
    key: 'open-orders',
    kind: 'spotlight',
    route: '/buyer/orders',
    target: 'body',
    placement: 'center',
    title: 'Crear pedido nuevo',
    content:
      'Desde la lista de pedidos pulsa en "Crear pedido nuevo" arriba a la derecha cuando quieras lanzar una compra. Continúa para abrir el formulario.',
  },
  {
    key: 'fill-producto',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: 'body',
    placement: 'center',
    title: 'Qué quieres comprar',
    content:
      'He autorrellenado producto=Naranja y variedad=Navelina. Si te da igual la variedad puedes dejarla abierta y aceptará lotes de cualquiera.',
    autofill: {
      producto: 'Naranja',
      variedad: 'Navelina',
    },
  },
  {
    key: 'fill-calibres',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: 'body',
    placement: 'center',
    title: 'Calibres y precio máximo €/kg',
    content:
      'Calibre 3: 3.000 kg máx 0,55 €/kg · Calibre 4: 2.000 kg máx 0,48 €/kg. El motor solo te trae lotes con precio mínimo ≤ a tu máximo.',
    autofill: {
      calibres: [
        { calibre: '3', cantidad_kg: 3000, precio_max_kg: 0.55 },
        { calibre: '4', cantidad_kg: 2000, precio_max_kg: 0.48 },
      ],
    },
  },
  {
    key: 'fill-incoterm',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: 'body',
    placement: 'center',
    title: 'Logística e Incoterm',
    content:
      'Elegimos "Que el vendedor envíe" + DAP (te llega a tu almacén). Puedes marcar varios incoterms aceptables y el motor busca match con cualquiera de ellos.',
    autofill: {
      logistica: 'OTRO_ENVIA',
      incoterm: 'DAP',
      destinoFinal: 'Mercabarna Barcelona',
    },
  },
  {
    key: 'fill-pago',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: 'body',
    placement: 'center',
    title: 'Plazo y término de pago',
    content:
      'Entrega antes del 30/06/2026 y pago a 30 días fecha factura. Esto entra en el matching — vendedores incompatibles se filtran fuera.',
    autofill: {
      fechaEntregaDeseada: '2026-06-30',
      terminoPago: '30D',
    },
  },
  {
    key: 'publicar',
    kind: 'modal',
    title: '¡Pedido publicado!',
    content:
      'Al pulsar "Crear pedido" el motor de matching busca lotes compatibles y aparece la lista de ofertas en /buyer/orders/[id]. Saltamos directamente ahí.',
    note: 'En real el botón pegaría a POST /orders. En modo prueba está interceptado.',
  },
  {
    key: 'ver-ofertas',
    kind: 'spotlight',
    route: '/buyer/orders',
    target: 'body',
    placement: 'center',
    title: 'Recibir ofertas de vendedores',
    content:
      'Cada vendedor compatible aparece como una oferta: vendedor, puntuación, kg comprometidos, €/kg y estado. Puedes aceptar tal cual o negociar en chat (mismo formato que el vendedor).',
  },
  {
    key: 'firmar-comprador',
    kind: 'modal',
    title: 'Firmar el contrato',
    content:
      'Cuando el vendedor firma el borrador, te llega tu turno: revisas las condiciones, firmas con canvas o rúbrica y pasas al pago de la comisión.',
  },
  {
    key: 'pago-comision',
    kind: 'modal',
    title: 'Pagar la comisión de Primar-IA',
    content:
      'Vas a Stripe Checkout y pagas la comisión de la plataforma (2-3% sobre el valor del contrato, con descuentos según tu plan). Esta es la ÚNICA cantidad que cobra Primar-IA.',
    note: 'Esta parte ocurre en el dominio de Stripe, así que en el tutorial no la simulamos visualmente. El pago de la mercancía al vendedor lo haces TÚ fuera de la plataforma según el plazo pactado.',
  },
  {
    key: 'esperar-envio',
    kind: 'modal',
    title: 'El vendedor envía la mercancía',
    content:
      'Cuando el vendedor marque el contrato como ENVIADO, recibes una notificación con un código QR. Lo escaneas al recibir el camión para confirmar la entrega.',
  },
  {
    key: 'recibir',
    kind: 'modal',
    title: 'Recibir y valorar',
    content:
      'Tras escanear el QR, ambos os valoráis (1-5 estrellas) y la operación pasa a COMPLETADA. Si hubo problema (mercancía dañada, faltante…), abres una INCIDENCIA en lugar de valorar y la plataforma media.',
  },
  {
    key: 'final',
    kind: 'modal',
    title: '¡Operación completada!',
    content:
      'Al cerrar sin incidencias subes tu reputación como comprador. Eso desbloquea mejores vendedores que te aceptan, descuentos progresivos en comisión y más operaciones por mes.',
    note: 'Modo prueba cerrado. Nada se ha guardado.',
  },
];
