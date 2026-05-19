/**
 * Phase 14M v3 — Definición de los flows en modo prueba.
 *
 * Cada FlowStep describe DÓNDE estamos (route + opcionalmente target
 * CSS), QUÉ explicamos (title + content) y, si toca, QUÉ autofill
 * disparamos para que el page receptor rellene los inputs con datos
 * inventados.
 *
 * Los pasos `kind: 'modal'` son saltos al exterior (Stripe, QR) o
 * confirmaciones globales que no necesitan apuntar a un elemento.
 *
 * Estrategia v3.1: rellenamos campo a campo (no todos a la vez) para
 * que el usuario vea claramente qué hace cada apartado del formulario.
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
  autofill?: Record<string, unknown>;
}

// Fechas relativas a hoy: empieza pasado mañana, dura 30 días.
const today = new Date();
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const VENDEDOR_FECHA_DESDE = fmt(new Date(today.getTime() + 2 * 24 * 3600 * 1000));
const VENDEDOR_FECHA_HASTA = fmt(new Date(today.getTime() + 32 * 24 * 3600 * 1000));
const COMPRADOR_FECHA_ENTREGA = fmt(new Date(today.getTime() + 21 * 24 * 3600 * 1000));

export const CREAR_LOTE_FLOW: FlowStep[] = [
  // ─── Introducción ───────────────────────────────────────────────────
  {
    key: 'inicio',
    kind: 'modal',
    route: '/seller',
    title: 'Modo prueba activado',
    content:
      'Vamos a recorrer el flujo COMPLETO de venta sobre la plataforma real. Iremos campo por campo, explicando cada uno, y rellenando con datos inventados. Nada se guarda en la base de datos.',
    note: 'Modo prueba — ninguna acción durante este tutorial persiste en producción.',
  },
  {
    key: 'nav-lots',
    kind: 'spotlight',
    route: '/seller',
    target: '[data-tutorial="sidebar"]',
    placement: 'right',
    title: 'Navega a "Mis lotes"',
    content:
      'Todo empieza en "Mis lotes" del menú lateral. Pulsa Continuar y te llevo yo.',
  },
  {
    key: 'btn-new-lote',
    kind: 'spotlight',
    route: '/seller/lots',
    target: '[data-tutorial="btn-nuevo-lote"]',
    placement: 'left',
    title: 'Publicar lote nuevo',
    content:
      'Desde la lista de lotes pulsarías este botón "New Lot" arriba a la derecha. Continúa para abrir el formulario.',
  },

  // ─── Formulario campo a campo ─────────────────────────────────────
  {
    key: 'campo-producto',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: '[data-tutorial="form-producto"]',
    placement: 'bottom',
    title: 'Campo 1 · Producto',
    content:
      'Eliges el producto que vas a vender. En real abrirías el desplegable y elegirías de la lista. Voy a rellenarlo con "Aguacate".',
    autofill: { producto: 'Aguacate' },
  },
  {
    key: 'campo-variedad',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: '[data-tutorial="form-producto"]',
    placement: 'bottom',
    title: 'Campo 2 · Variedad',
    content:
      'La variedad es importante: los compradores filtran por ella. Un comprador pidiendo "Aguacate Hass" no matchea con "Aguacate Bacon". Si tu variedad no está, eliges "Other" y la escribes. Relleno "Hass".',
    autofill: { variedad: 'Hass' },
  },
  {
    key: 'campo-calibres',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: '[data-tutorial="form-calibres"]',
    placement: 'top',
    title: 'Campo 3 · Calibres y cantidades',
    content:
      'Cada calibre (tamaño) tiene su precio. Vendes calibre 14 (más grande) más caro que el 18. Defines kg disponibles y precio mínimo €/kg por calibre. Relleno 3 calibres con sus kg.',
    autofill: {
      calibres: [
        { calibre: '14', cantidad_kg: 2000 },
        { calibre: '16', cantidad_kg: 2000 },
        { calibre: '18', cantidad_kg: 1000 },
      ],
    },
    note: 'Si no calibras (a granel), marca la casilla "Non calibrated" y el sistema te pide solo el total.',
  },
  {
    key: 'campo-direccion',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: '[data-tutorial="form-logistica"]',
    placement: 'auto',
    title: 'Campo 4 · Dirección de recogida',
    content:
      'Es donde vives o donde está el lote físicamente. Se usa para calcular distancias a los compradores en el matching. Relleno con una dirección de ejemplo.',
    autofill: { direccionRecogida: 'Carretera Vélez-Málaga 29700, Málaga' },
  },
  {
    key: 'campo-fechas',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: '[data-tutorial="form-logistica"]',
    placement: 'auto',
    title: 'Campo 5 · Fechas de disponibilidad',
    content:
      'Desde cuándo está disponible la mercancía y hasta cuándo. Si pones un margen muy estrecho, perderás matches con compradores que prefieran fechas más amplias. Te he puesto un margen razonable (pasado mañana → +30 días).',
    autofill: {
      fechaDisponibilidad: VENDEDOR_FECHA_DESDE,
      fechaFinDisponibilidad: VENDEDOR_FECHA_HASTA,
    },
  },
  {
    key: 'campo-logistica',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: '[data-tutorial="form-logistica"]',
    placement: 'auto',
    title: 'Campo 6 · ¿Quién se encarga del envío?',
    content:
      'Tres opciones: "Yo envío" (CPT/DAP/DDP), "Que el comprador recoja" (EXW), o "Indiferente" (negocias en chat). Elegimos "Yo envío".',
    autofill: { logistica: 'YO_ENVIO' },
  },
  {
    key: 'campo-incoterm',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: '[data-tutorial="form-logistica"]',
    placement: 'auto',
    title: 'Campo 7 · Incoterm aceptado',
    content:
      'El incoterm define quién paga el transporte y cuándo pasa el riesgo. DAP = entregas en destino del comprador. Marco solo DAP, pero podrías aceptar varios.',
    autofill: { incoterm: 'DAP' },
  },
  {
    key: 'campo-termino-pago',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: '[data-tutorial="form-logistica"]',
    placement: 'auto',
    title: 'Campo 8 · Términos de pago aceptados',
    content:
      'Cuándo te pagan: inmediato, 30 días fecha factura, 60 días… Marca los plazos que aceptas. Compradores con plazos más largos se filtran fuera. Marco "inmediato".',
    autofill: { terminosPagoAceptados: ['INMEDIATO'] },
  },
  {
    key: 'btn-publicar',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: '[data-tutorial="btn-publicar-lote"]',
    placement: 'top',
    title: 'Pulsa "Publish Lot"',
    content:
      'Al publicar, el motor de matching empareja tu lote con los pedidos activos al instante. Continúa, simulamos el envío y te llevo a ver los matches.',
    note: 'En real este botón pega a POST /lots. En modo prueba está interceptado y nada se guarda.',
  },

  // ─── Match y aceptación ───────────────────────────────────────────
  {
    key: 'ir-matches',
    kind: 'modal',
    title: '¡Lote publicado!',
    content:
      'El motor de matching ha encontrado un comprador compatible. Te llevo a /seller/matches para verlo en pantalla.',
  },
  {
    key: 'ver-matches',
    kind: 'spotlight',
    route: '/seller/matches',
    target: '[data-tutorial="match-card"]',
    placement: 'auto',
    title: 'La tarjeta del match',
    content:
      'Esta es la tarjeta del comprador ficticio. Ves de un vistazo: índice de rentabilidad, producto+variedad, kg comprometidos, distancia, incoterm, y el botón "Contribuir" para aceptar.',
  },
  {
    key: 'btn-contribuir',
    kind: 'spotlight',
    route: '/seller/matches',
    target: '[data-tutorial="btn-contribuir"]',
    placement: 'auto',
    title: 'Pulsar "Contribuir"',
    content:
      'Este botón abre un modal donde indicarías cuántos kg comprometes POR CALIBRE. El tope = mínimo entre lo que tienes en el lote y lo que el comprador pide. En modo prueba simulamos que aceptas 1.000 kg de calibre 14 a 3,15 €/kg.',
    note: 'En real, al confirmar, Primar-IA genera automáticamente el borrador del contrato y te lleva a su pantalla.',
  },

  // ─── Contrato y firma ─────────────────────────────────────────────
  {
    key: 'ir-contrato',
    kind: 'modal',
    title: 'Borrador del contrato generado',
    content:
      'Al aceptar la contribución, Primar-IA crea automáticamente el borrador del contrato y te lleva a su pantalla. Te llevo allí.',
  },
  {
    key: 'contrato-resumen',
    kind: 'spotlight',
    route: `/seller/contracts/tutorial-match-MX42`,
    target: '[data-tutorial="contract-resumen"]',
    placement: 'auto',
    title: 'Resumen de la operación',
    content:
      'Aquí ves las condiciones que se firman: producto + variedad, cantidad total, €/kg, importe total, incoterm, condiciones de pago, destino y los calibres concretos. Es lo que aparecerá en el PDF.',
  },
  {
    key: 'contrato-comision',
    kind: 'spotlight',
    route: `/seller/contracts/tutorial-match-MX42`,
    target: '[data-tutorial="contract-comision"]',
    placement: 'auto',
    title: 'Comisión Primar-IA',
    content:
      'Importante: la comisión la paga el COMPRADOR a Primar-IA, no tú. Tú recibes el 100% del importe acordado del comprador por transferencia según las condiciones del contrato.',
  },
  {
    key: 'contrato-firmas',
    kind: 'spotlight',
    route: `/seller/contracts/tutorial-match-MX42`,
    target: '[data-tutorial="contract-firmas"]',
    placement: 'auto',
    title: 'Estado de firmas',
    content:
      'Ves el estado de tu firma y la del comprador. Tienes 48 h hábiles para firmar el primero. Después, el comprador firma y paga la comisión, y el contrato pasa a FIRMADO.',
  },
  {
    key: 'firmar-vendedor',
    kind: 'spotlight',
    route: `/seller/contracts/tutorial-match-MX42`,
    target: '[data-tutorial="btn-firmar-vendedor"]',
    placement: 'auto',
    title: 'Botón "Firmar contrato"',
    content:
      'Este botón abre el panel de firma: dibujas tu rúbrica en el canvas o la tecleas. Al firmar, el contrato pasa a PENDIENTE_PAGO_COMPRADOR.',
    note: 'En modo prueba el botón está interceptado: si lo pulsas no pasa nada. Continúa para seguir.',
  },
  {
    key: 'comprador-firma-paga',
    kind: 'modal',
    title: 'El comprador firma y paga la comisión',
    content:
      'El comprador recibe notificación, revisa, firma y va a Stripe Checkout para pagar la comisión de Primar-IA. Esta parte ocurre en dominio externo (Stripe), así que en el tutorial no la simulamos visualmente.',
    note: 'Importante: tú NO pagas comisión a Primar-IA — la paga el comprador. Tú solo cobras la mercancía al comprador (fuera de la plataforma, según el plazo pactado).',
  },
  {
    key: 'contrato-firmado',
    kind: 'modal',
    title: 'Contrato FIRMADO',
    content:
      'Cuando el comprador completa el pago de la comisión, el contrato pasa a FIRMADO. Ya está todo cerrado legalmente. Te aparece el botón para marcar el envío.',
  },

  // ─── Envío y entrega ──────────────────────────────────────────────
  {
    key: 'marcar-enviado',
    kind: 'modal',
    title: 'Marcar como enviado',
    content:
      'Cuando salga el camión, pulsarías "Marcar como enviado" en la página del contrato. Primar-IA genera un código QR que recibe el comprador para confirmar la entrega al llegar.',
  },
  {
    key: 'entrega-confirmada',
    kind: 'modal',
    title: 'Entrega confirmada',
    content:
      'El comprador escanea el QR al recibir el camión y la operación queda como ENTREGADA. Os habilita la pantalla de valoración mutua.',
  },
  {
    key: 'cobrar',
    kind: 'modal',
    title: 'Cobrar la mercancía',
    content:
      'El pago de la mercancía se hace fuera de la plataforma (transferencia bancaria) según el término que pactasteis: contado, 30 d, 60 d… Primar-IA solo intermedia contrato y comisión, no cobra tu mercancía.',
  },
  {
    key: 'valorar',
    kind: 'modal',
    title: 'Valoración mutua',
    content:
      'Tras la entrega, ambos os valoráis 1-5 estrellas. Si hubo incidencia (mercancía dañada, faltante…), abres una INCIDENCIA en lugar de valorar y la plataforma media.',
  },
  {
    key: 'final',
    kind: 'modal',
    title: '¡Operación completada!',
    content:
      'Cada operación cerrada sin incidencias mejora tu reputación. Más reputación = mejor matchmaker, más volumen, badges y prioridad. Modo prueba cerrado.',
    note: 'Cierro el modo prueba y vuelvo al panel.',
  },
];

export const HACER_PEDIDO_FLOW: FlowStep[] = [
  // ─── Introducción ───────────────────────────────────────────────────
  {
    key: 'inicio',
    kind: 'modal',
    route: '/buyer',
    title: 'Modo prueba activado',
    content:
      'Vamos a recorrer el flujo COMPLETO de compra sobre la plataforma real. Iremos campo por campo, explicando cada uno, y rellenando con datos inventados. Nada se guarda en la base de datos.',
    note: 'Modo prueba — ninguna acción durante este tutorial persiste en producción.',
  },
  {
    key: 'nav-orders',
    kind: 'spotlight',
    route: '/buyer',
    target: '[data-tutorial="sidebar"]',
    placement: 'right',
    title: 'Navega a "Mis pedidos"',
    content:
      'Todo empieza en "Mis pedidos" del menú lateral. Pulsa Continuar y te llevo yo.',
  },
  {
    key: 'btn-new-order',
    kind: 'spotlight',
    route: '/buyer/orders',
    target: '[data-tutorial="btn-nuevo-pedido"]',
    placement: 'left',
    title: 'Crear pedido nuevo',
    content:
      'Desde la lista de pedidos pulsarías este botón arriba a la derecha. Continúa para abrir el formulario.',
  },

  // ─── Formulario campo a campo ─────────────────────────────────────
  {
    key: 'campo-producto',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: '[data-tutorial="form-producto"]',
    placement: 'bottom',
    title: 'Campo 1 · Producto',
    content:
      'Eliges qué quieres comprar del desplegable. En real abrirías el menú y seleccionarías. Voy a rellenarlo con "Naranja".',
    autofill: { producto: 'Naranja' },
  },
  {
    key: 'campo-variedad',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: '[data-tutorial="form-producto"]',
    placement: 'bottom',
    title: 'Campo 2 · Variedad',
    content:
      'Si te importa la variedad concreta (Navelina, Lanelate, Valencia…), la eliges. Si te da igual, deja "Other" o vacío y aceptará lotes de cualquiera. Voy a poner "Navelina".',
    autofill: { variedad: 'Navelina' },
  },
  {
    key: 'campo-calibres',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: '[data-tutorial="form-calibres"]',
    placement: 'top',
    title: 'Campo 3 · Calibres y precio máximo €/kg',
    content:
      'Cuántos kg necesitas por calibre y el precio máximo €/kg que aceptas pagar por cada uno. El motor solo trae lotes con precio mínimo ≤ a tu máximo. Relleno 2 calibres.',
    autofill: {
      calibres: [
        { calibre: '3', cantidad_kg: 3000, precio_max_kg: 0.55 },
        { calibre: '4', cantidad_kg: 2000, precio_max_kg: 0.48 },
      ],
    },
  },
  {
    key: 'campo-destino',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: '[data-tutorial="form-logistica"]',
    placement: 'auto',
    title: 'Campo 4 · Destino final',
    content:
      'Dónde quieres recibir la mercancía. Se usa para que el vendedor calcule transporte si es él quien envía. Pongo "Mercabarna Barcelona".',
    autofill: { destinoFinal: 'Mercabarna Barcelona' },
  },
  {
    key: 'campo-fecha-entrega',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: '[data-tutorial="form-logistica"]',
    placement: 'auto',
    title: 'Campo 5 · Fecha de entrega deseada',
    content:
      'Para cuándo necesitas la mercancía. Margen estrecho = menos matches. Margen amplio = más opciones. Pongo +21 días.',
    autofill: { fechaEntregaDeseada: COMPRADOR_FECHA_ENTREGA },
  },
  {
    key: 'campo-logistica',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: '[data-tutorial="form-logistica"]',
    placement: 'auto',
    title: 'Campo 6 · ¿Quién se encarga del envío?',
    content:
      'Tres opciones: "Yo recojo" (EXW), "Que el vendedor envíe" (CPT/DAP/DDP), o "Indiferente". Elegimos que el vendedor envíe.',
    autofill: { logistica: 'OTRO_RECOGE' },
  },
  {
    key: 'campo-incoterm',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: '[data-tutorial="form-logistica"]',
    placement: 'auto',
    title: 'Campo 7 · Incoterm aceptado',
    content:
      'DAP = entrega en tu destino. Puedes marcar varios incoterms aceptables y el motor busca match con cualquiera.',
    autofill: { incoterm: 'DAP' },
  },
  {
    key: 'campo-termino-pago',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: '[data-tutorial="form-logistica"]',
    placement: 'auto',
    title: 'Campo 8 · Términos de pago',
    content:
      'Cuándo pagas: contado, 30 días fecha factura, 60 días… El motor filtra vendedores incompatibles. Marco "30 días".',
    autofill: { terminosPagoAceptados: ['DIAS_30'] },
  },
  {
    key: 'btn-publicar',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: '[data-tutorial="btn-publicar-pedido"]',
    placement: 'top',
    title: 'Pulsa "Publicar pedido"',
    content:
      'Al publicar, el motor de matching empareja tu pedido con lotes activos al instante. Continúa, simulamos el envío y te llevo a ver las ofertas.',
    note: 'En real este botón pega a POST /orders. En modo prueba está interceptado y nada se guarda.',
  },

  // ─── Ofertas y aceptación ──────────────────────────────────────────
  {
    key: 'ir-detalle-pedido',
    kind: 'modal',
    title: '¡Pedido creado!',
    content:
      'El motor de matching ha encontrado un vendedor compatible. Te llevo al detalle del pedido para que veas la oferta.',
  },
  {
    key: 'ver-ofertas',
    kind: 'spotlight',
    route: `/buyer/orders/tutorial-pedido-PD7K9`,
    target: '[data-tutorial="ofertas-vendedores"]',
    placement: 'auto',
    title: 'Ofertas de vendedores',
    content:
      'Esta sección muestra todos los vendedores compatibles. Cada tarjeta: vendedor, puntuación, kg comprometidos, €/kg, total y los botones para pagar / abrir chat / ver contrato / abrir incidencia.',
  },
  {
    key: 'aceptar-oferta',
    kind: 'modal',
    title: 'Aceptar la oferta',
    content:
      'Aceptarías la oferta tal cual o abrirías el chat para negociar precio/calibres/incoterm. Varios vendedores pueden contribuir al mismo pedido — la plataforma reparte por calibre.',
  },

  // ─── Contrato, firma y pago ────────────────────────────────────────
  {
    key: 'ir-contrato-comprador',
    kind: 'modal',
    title: 'Borrador del contrato',
    content:
      'Al aceptar y cuando el vendedor firma, te llega notificación y revisas el borrador. Te llevo a la pantalla del contrato.',
  },
  {
    key: 'contrato-resumen-comprador',
    kind: 'spotlight',
    route: `/buyer/contracts/tutorial-match-MX42`,
    target: '[data-tutorial="contract-resumen"]',
    placement: 'auto',
    title: 'Resumen de la operación',
    content:
      'Aquí ves las condiciones que se firman: producto + variedad, cantidad total, €/kg, importe total, incoterm, condiciones de pago, destino y los calibres concretos. Es lo que aparecerá en el PDF.',
  },
  {
    key: 'contrato-comision-comprador',
    kind: 'spotlight',
    route: `/buyer/contracts/tutorial-match-MX42`,
    target: '[data-tutorial="contract-comision"]',
    placement: 'auto',
    title: 'Comisión Primar-IA',
    content:
      'Importante: esta es la única cantidad que pagas a Primar-IA. Es la comisión por la operación. El pago de la mercancía al vendedor lo gestionas TÚ por transferencia, según las condiciones del contrato.',
  },
  {
    key: 'contrato-firmas-comprador',
    kind: 'spotlight',
    route: `/buyer/contracts/tutorial-match-MX42`,
    target: '[data-tutorial="contract-firmas"]',
    placement: 'auto',
    title: 'Estado de firmas',
    content:
      'Aquí ves el estado de ambas firmas. Tras firmar tú y pagar la comisión, el contrato pasa a FIRMADO y el vendedor recibe la orden de enviar la mercancía.',
  },
  {
    key: 'firmar-pagar',
    kind: 'modal',
    title: 'Firmar y pagar la comisión',
    content:
      'Firmas dibujando o tecleando rúbrica + vas a Stripe Checkout para pagar la comisión de Primar-IA (2-3% sobre el valor del contrato). Esta es la ÚNICA cantidad que cobra la plataforma.',
    note: 'El pago de la mercancía al vendedor lo haces TÚ fuera de la plataforma según el término que pactasteis.',
  },
  {
    key: 'contrato-firmado',
    kind: 'modal',
    title: 'Contrato FIRMADO',
    content:
      'Pagada la comisión, el contrato pasa a FIRMADO. El vendedor recibe la orden de enviar la mercancía.',
  },

  // ─── Envío, entrega y cierre ───────────────────────────────────────
  {
    key: 'esperar-envio',
    kind: 'modal',
    title: 'Esperar el envío',
    content:
      'Cuando el vendedor marque ENVIADO, recibirás una notificación con un código QR. Lo escaneas al recibir el camión.',
  },
  {
    key: 'recibir-qr',
    kind: 'modal',
    title: 'Escanear QR al recibir',
    content:
      'Esto ocurre físicamente: el transportista llega, escaneas con el móvil o desde el dashboard. La operación pasa a ENTREGADA y se habilita la valoración mutua.',
  },
  {
    key: 'pagar-vendedor',
    kind: 'modal',
    title: 'Pagar al vendedor',
    content:
      'Por transferencia bancaria, según el término que pactasteis: contado, 30 días, 60 días… Primar-IA solo intermedia contrato y comisión, no cobra ni paga la mercancía.',
  },
  {
    key: 'valorar',
    kind: 'modal',
    title: 'Valoración mutua',
    content:
      'Tras la entrega, ambos os valoráis 1-5 estrellas. Si hubo problema (mercancía dañada, faltante, fuera de calibre…), abres una INCIDENCIA en lugar de valorar.',
  },
  {
    key: 'final',
    kind: 'modal',
    title: '¡Operación completada!',
    content:
      'Cada operación cerrada sin incidencias mejora tu reputación como comprador — mejores vendedores te aceptan, mejores condiciones desbloqueas. Modo prueba cerrado.',
    note: 'Cierro el modo prueba y vuelvo al panel.',
  },
];
