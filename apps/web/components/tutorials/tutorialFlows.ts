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
 * Phase 15 — internacionalizado: cada flow existe en ES y EN. El
 * helper `getCrearLoteFlow(locale)` / `getHacerPedidoFlow(locale)`
 * devuelve la versión correcta según el idioma del usuario.
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

export type SupportedLocale = 'ES' | 'EN';

// Fechas relativas a hoy: empieza pasado mañana, dura 30 días.
const today = new Date();
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const VENDEDOR_FECHA_DESDE = fmt(new Date(today.getTime() + 2 * 24 * 3600 * 1000));
const VENDEDOR_FECHA_HASTA = fmt(new Date(today.getTime() + 32 * 24 * 3600 * 1000));
const COMPRADOR_FECHA_ENTREGA = fmt(new Date(today.getTime() + 21 * 24 * 3600 * 1000));

// ════════════════════════════════════════════════════════════════════════════
// CREAR LOTE — VENDEDOR
// ════════════════════════════════════════════════════════════════════════════

const CREAR_LOTE_FLOW_ES: FlowStep[] = [
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
    content: 'Todo empieza en "Mis lotes" del menú lateral. Pulsa Continuar y te llevo yo.',
  },
  {
    key: 'btn-new-lote',
    kind: 'spotlight',
    route: '/seller/lots',
    target: '[data-tutorial="btn-nuevo-lote"]',
    placement: 'left',
    title: 'Publicar lote nuevo',
    content:
      'Desde la lista de lotes pulsarías este botón "Nuevo lote" arriba a la derecha. Continúa para abrir el formulario.',
  },
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
      'La variedad es importante: los compradores filtran por ella. Un comprador pidiendo "Aguacate Hass" no matchea con "Aguacate Bacon". Si tu variedad no está, eliges "Otra" y la escribes. Relleno "Hass".',
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
    note: 'Si no calibras (a granel), marca la casilla "No calibrado" y el sistema te pide solo el total.',
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
    title: 'Pulsa "Publicar lote"',
    content:
      'Al publicar, el motor de matching empareja tu lote con los pedidos activos al instante. Continúa, simulamos el envío y te llevo a ver los matches.',
    note: 'En real este botón pega a POST /lots. En modo prueba está interceptado y nada se guarda.',
  },
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
    route: '/seller/contracts/tutorial-match-MX42',
    target: '[data-tutorial="contract-resumen"]',
    placement: 'auto',
    title: 'Resumen de la operación',
    content:
      'Aquí ves las condiciones que se firman: producto + variedad, cantidad total, €/kg, importe total, incoterm, condiciones de pago, destino y los calibres concretos. Es lo que aparecerá en el PDF.',
  },
  {
    key: 'contrato-comision',
    kind: 'spotlight',
    route: '/seller/contracts/tutorial-match-MX42',
    target: '[data-tutorial="contract-comision"]',
    placement: 'auto',
    title: 'Comisión Primar-IA',
    content:
      'Importante: la comisión la paga el COMPRADOR a Primar-IA, no tú. Tú recibes el 100% del importe acordado del comprador por transferencia según las condiciones del contrato.',
  },
  {
    key: 'contrato-firmas',
    kind: 'spotlight',
    route: '/seller/contracts/tutorial-match-MX42',
    target: '[data-tutorial="contract-firmas"]',
    placement: 'auto',
    title: 'Estado de firmas',
    content:
      'Ves el estado de tu firma y la del comprador. Tienes 48 h hábiles para firmar el primero. Después, el comprador firma y paga la comisión, y el contrato pasa a FIRMADO.',
  },
  {
    key: 'firmar-vendedor',
    kind: 'spotlight',
    route: '/seller/contracts/tutorial-match-MX42',
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

const CREAR_LOTE_FLOW_EN: FlowStep[] = [
  {
    key: 'inicio',
    kind: 'modal',
    route: '/seller',
    title: 'Test mode activated',
    content:
      "We're going to walk through the FULL sales flow on the real platform. Step by step, explaining each field and filling it with mock data. Nothing is saved to the database.",
    note: "Test mode — nothing you do during this tutorial persists in production.",
  },
  {
    key: 'nav-lots',
    kind: 'spotlight',
    route: '/seller',
    target: '[data-tutorial="sidebar"]',
    placement: 'right',
    title: 'Go to "My lots"',
    content: 'Everything starts in "My lots" on the side menu. Click Continue and I\'ll take you there.',
  },
  {
    key: 'btn-new-lote',
    kind: 'spotlight',
    route: '/seller/lots',
    target: '[data-tutorial="btn-nuevo-lote"]',
    placement: 'left',
    title: 'Publish a new lot',
    content:
      'From the lot list you would click this "New lot" button at the top right. Continue to open the form.',
  },
  {
    key: 'campo-producto',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: '[data-tutorial="form-producto"]',
    placement: 'bottom',
    title: 'Field 1 · Product',
    content:
      "You choose the product you're going to sell. In production you would open the dropdown and pick from the list. I'll fill it with \"Avocado\".",
    autofill: { producto: 'Aguacate' },
  },
  {
    key: 'campo-variedad',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: '[data-tutorial="form-producto"]',
    placement: 'bottom',
    title: 'Field 2 · Variety',
    content:
      'Variety matters: buyers filter by it. A buyer asking for "Avocado Hass" will not match "Avocado Bacon". If your variety isn\'t listed, pick "Other" and type it. I\'ll fill "Hass".',
    autofill: { variedad: 'Hass' },
  },
  {
    key: 'campo-calibres',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: '[data-tutorial="form-calibres"]',
    placement: 'top',
    title: 'Field 3 · Sizes and quantities',
    content:
      'Each size has its price. Size 14 (bigger) is more expensive than 18. You set available kg and minimum €/kg per size. Filling in 3 sizes with their kg.',
    autofill: {
      calibres: [
        { calibre: '14', cantidad_kg: 2000 },
        { calibre: '16', cantidad_kg: 2000 },
        { calibre: '18', cantidad_kg: 1000 },
      ],
    },
    note: 'If you don\'t grade by size (bulk), tick "Non-calibrated" and the system only asks for the total.',
  },
  {
    key: 'campo-direccion',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: '[data-tutorial="form-logistica"]',
    placement: 'auto',
    title: 'Field 4 · Pickup address',
    content:
      "Where you live or where the lot is physically located. It's used to compute distances to buyers in matching. I'll fill an example address.",
    autofill: { direccionRecogida: 'Carretera Vélez-Málaga 29700, Málaga' },
  },
  {
    key: 'campo-fechas',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: '[data-tutorial="form-logistica"]',
    placement: 'auto',
    title: 'Field 5 · Availability dates',
    content:
      "From when the goods are available until when. Too tight a window and you'll lose matches with buyers who prefer broader dates. I've set a reasonable window (day after tomorrow → +30 days).",
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
    title: 'Field 6 · Who handles shipping?',
    content:
      "Three options: \"I ship\" (CPT/DAP/DDP), \"Buyer picks up\" (EXW), or \"Indifferent\" (negotiate in chat). We'll pick \"I ship\".",
    autofill: { logistica: 'YO_ENVIO' },
  },
  {
    key: 'campo-incoterm',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: '[data-tutorial="form-logistica"]',
    placement: 'auto',
    title: 'Field 7 · Accepted Incoterm',
    content:
      "The Incoterm defines who pays transport and when risk transfers. DAP = you deliver at buyer's destination. I'll tick only DAP, but you could accept several.",
    autofill: { incoterm: 'DAP' },
  },
  {
    key: 'campo-termino-pago',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: '[data-tutorial="form-logistica"]',
    placement: 'auto',
    title: 'Field 8 · Accepted payment terms',
    content:
      "When you get paid: immediate, 30 days from invoice date, 60 days… Tick the terms you accept. Buyers with longer terms are filtered out. I'll tick \"immediate\".",
    autofill: { terminosPagoAceptados: ['INMEDIATO'] },
  },
  {
    key: 'btn-publicar',
    kind: 'spotlight',
    route: '/seller/lots/new',
    target: '[data-tutorial="btn-publicar-lote"]',
    placement: 'top',
    title: 'Press "Publish lot"',
    content:
      "On publish, the matching engine pairs your lot with active orders instantly. Continue — we'll simulate the submission and I'll take you to see the matches.",
    note: 'In production this button hits POST /lots. In test mode it\'s intercepted and nothing is saved.',
  },
  {
    key: 'ir-matches',
    kind: 'modal',
    title: 'Lot published!',
    content:
      "The matching engine has found a compatible buyer. I'll take you to /seller/matches so you can see it on screen.",
  },
  {
    key: 'ver-matches',
    kind: 'spotlight',
    route: '/seller/matches',
    target: '[data-tutorial="match-card"]',
    placement: 'auto',
    title: 'The match card',
    content:
      "This is the card for the mock buyer. At a glance you see: profitability index, product+variety, committed kg, distance, Incoterm, and the \"Contribute\" button to accept.",
  },
  {
    key: 'btn-contribuir',
    kind: 'spotlight',
    route: '/seller/matches',
    target: '[data-tutorial="btn-contribuir"]',
    placement: 'auto',
    title: 'Press "Contribute"',
    content:
      "This button opens a modal where you'd say how many kg you commit BY SIZE. The cap = min between what you have in the lot and what the buyer requests. In test mode we'll simulate accepting 1,000 kg of size 14 at €3.15/kg.",
    note: 'In production, on confirm, Primar-IA auto-generates the contract draft and takes you to its screen.',
  },
  {
    key: 'ir-contrato',
    kind: 'modal',
    title: 'Contract draft generated',
    content:
      "On accepting the contribution, Primar-IA auto-creates the contract draft and takes you to its screen. I'll take you there.",
  },
  {
    key: 'contrato-resumen',
    kind: 'spotlight',
    route: '/seller/contracts/tutorial-match-MX42',
    target: '[data-tutorial="contract-resumen"]',
    placement: 'auto',
    title: 'Operation summary',
    content:
      "Here you see the conditions being signed: product + variety, total quantity, €/kg, total amount, Incoterm, payment conditions, destination and the specific sizes. It's what will appear in the PDF.",
  },
  {
    key: 'contrato-comision',
    kind: 'spotlight',
    route: '/seller/contracts/tutorial-match-MX42',
    target: '[data-tutorial="contract-comision"]',
    placement: 'auto',
    title: 'Primar-IA commission',
    content:
      "Important: the commission is paid by the BUYER to Primar-IA, not you. You receive 100% of the agreed amount from the buyer by wire transfer, per the contract conditions.",
  },
  {
    key: 'contrato-firmas',
    kind: 'spotlight',
    route: '/seller/contracts/tutorial-match-MX42',
    target: '[data-tutorial="contract-firmas"]',
    placement: 'auto',
    title: 'Signature status',
    content:
      "You see the state of your signature and the buyer's. You have 48 business hours to sign first. Then the buyer signs and pays the commission, and the contract moves to SIGNED.",
  },
  {
    key: 'firmar-vendedor',
    kind: 'spotlight',
    route: '/seller/contracts/tutorial-match-MX42',
    target: '[data-tutorial="btn-firmar-vendedor"]',
    placement: 'auto',
    title: '"Sign contract" button',
    content:
      "This button opens the signature panel: you draw your signature on the canvas or type it. On signing, the contract moves to PENDING_BUYER_PAYMENT.",
    note: 'In test mode this button is intercepted: pressing it does nothing. Continue to proceed.',
  },
  {
    key: 'comprador-firma-paga',
    kind: 'modal',
    title: 'The buyer signs and pays the commission',
    content:
      "The buyer gets notified, reviews, signs and goes to Stripe Checkout to pay the Primar-IA commission. This part happens on an external domain (Stripe), so the tutorial doesn't simulate it visually.",
    note: "Important: you do NOT pay commission to Primar-IA — the buyer pays it. You only collect the goods payment from the buyer (off-platform, per the agreed term).",
  },
  {
    key: 'contrato-firmado',
    kind: 'modal',
    title: 'Contract SIGNED',
    content:
      "When the buyer completes the commission payment, the contract moves to SIGNED. Everything is legally closed. You see the button to mark the shipment.",
  },
  {
    key: 'marcar-enviado',
    kind: 'modal',
    title: 'Mark as shipped',
    content:
      "When the truck leaves, you'd press \"Mark as shipped\" on the contract page. Primar-IA generates a QR code that the buyer receives to confirm delivery on arrival.",
  },
  {
    key: 'entrega-confirmada',
    kind: 'modal',
    title: 'Delivery confirmed',
    content:
      "The buyer scans the QR on receiving the truck and the operation is marked DELIVERED. It enables the mutual rating screen for both of you.",
  },
  {
    key: 'cobrar',
    kind: 'modal',
    title: 'Collect the goods payment',
    content:
      "The goods payment happens off-platform (wire transfer) per the agreed term: cash, 30 d, 60 d… Primar-IA only intermediates contract and commission — it doesn't collect your goods payment.",
  },
  {
    key: 'valorar',
    kind: 'modal',
    title: 'Mutual rating',
    content:
      "After delivery, you both rate each other 1-5 stars. If there was an issue (damaged goods, missing…), you open an INCIDENT instead of rating, and the platform mediates.",
  },
  {
    key: 'final',
    kind: 'modal',
    title: 'Operation completed!',
    content:
      "Each operation closed without incidents improves your reputation. More reputation = better matching, more volume, badges and priority. Test mode closed.",
    note: 'Closing test mode and returning to the dashboard.',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// HACER PEDIDO — COMPRADOR
// ════════════════════════════════════════════════════════════════════════════

const HACER_PEDIDO_FLOW_ES: FlowStep[] = [
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
    content: 'Todo empieza en "Mis pedidos" del menú lateral. Pulsa Continuar y te llevo yo.',
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
      'Si te importa la variedad concreta (Navelina, Lanelate, Valencia…), la eliges. Si te da igual, deja "Otra" o vacío y aceptará lotes de cualquiera. Voy a poner "Navelina".',
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
    route: '/buyer/orders/tutorial-pedido-PD7K9',
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
    route: '/buyer/contracts/tutorial-match-MX42',
    target: '[data-tutorial="contract-resumen"]',
    placement: 'auto',
    title: 'Resumen de la operación',
    content:
      'Aquí ves las condiciones que se firman: producto + variedad, cantidad total, €/kg, importe total, incoterm, condiciones de pago, destino y los calibres concretos. Es lo que aparecerá en el PDF.',
  },
  {
    key: 'contrato-comision-comprador',
    kind: 'spotlight',
    route: '/buyer/contracts/tutorial-match-MX42',
    target: '[data-tutorial="contract-comision"]',
    placement: 'auto',
    title: 'Comisión Primar-IA',
    content:
      'Importante: esta es la única cantidad que pagas a Primar-IA. Es la comisión por la operación. El pago de la mercancía al vendedor lo gestionas TÚ por transferencia, según las condiciones del contrato.',
  },
  {
    key: 'contrato-firmas-comprador',
    kind: 'spotlight',
    route: '/buyer/contracts/tutorial-match-MX42',
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

const HACER_PEDIDO_FLOW_EN: FlowStep[] = [
  {
    key: 'inicio',
    kind: 'modal',
    route: '/buyer',
    title: 'Test mode activated',
    content:
      "We're going to walk through the FULL purchase flow on the real platform. Step by step, explaining each field and filling it with mock data. Nothing is saved to the database.",
    note: 'Test mode — nothing you do during this tutorial persists in production.',
  },
  {
    key: 'nav-orders',
    kind: 'spotlight',
    route: '/buyer',
    target: '[data-tutorial="sidebar"]',
    placement: 'right',
    title: 'Go to "My orders"',
    content: 'Everything starts in "My orders" on the side menu. Click Continue and I\'ll take you there.',
  },
  {
    key: 'btn-new-order',
    kind: 'spotlight',
    route: '/buyer/orders',
    target: '[data-tutorial="btn-nuevo-pedido"]',
    placement: 'left',
    title: 'Create a new order',
    content:
      'From the orders list you would press this button at the top right. Continue to open the form.',
  },
  {
    key: 'campo-producto',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: '[data-tutorial="form-producto"]',
    placement: 'bottom',
    title: 'Field 1 · Product',
    content:
      "You pick what you want to buy from the dropdown. In production you'd open the menu and select. I'll fill it with \"Orange\".",
    autofill: { producto: 'Naranja' },
  },
  {
    key: 'campo-variedad',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: '[data-tutorial="form-producto"]',
    placement: 'bottom',
    title: 'Field 2 · Variety',
    content:
      'If the specific variety matters (Navelina, Lanelate, Valencia…), you pick it. If you don\'t mind, leave "Other" or empty and any will be accepted. I\'ll set "Navelina".',
    autofill: { variedad: 'Navelina' },
  },
  {
    key: 'campo-calibres',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: '[data-tutorial="form-calibres"]',
    placement: 'top',
    title: 'Field 3 · Sizes and max €/kg',
    content:
      "How many kg you need per size and the max €/kg you'll pay for each. The engine only brings lots with min price ≤ your max. Filling 2 sizes.",
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
    title: 'Field 4 · Final destination',
    content:
      "Where you want to receive the goods. It's used by the seller to estimate transport if they ship. I'll put \"Mercabarna Barcelona\".",
    autofill: { destinoFinal: 'Mercabarna Barcelona' },
  },
  {
    key: 'campo-fecha-entrega',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: '[data-tutorial="form-logistica"]',
    placement: 'auto',
    title: 'Field 5 · Desired delivery date',
    content:
      "When you need the goods. Tight window = fewer matches. Broad window = more options. Setting +21 days.",
    autofill: { fechaEntregaDeseada: COMPRADOR_FECHA_ENTREGA },
  },
  {
    key: 'campo-logistica',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: '[data-tutorial="form-logistica"]',
    placement: 'auto',
    title: 'Field 6 · Who handles shipping?',
    content:
      "Three options: \"I pick up\" (EXW), \"Seller ships\" (CPT/DAP/DDP), or \"Indifferent\". We pick that the seller ships.",
    autofill: { logistica: 'OTRO_RECOGE' },
  },
  {
    key: 'campo-incoterm',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: '[data-tutorial="form-logistica"]',
    placement: 'auto',
    title: 'Field 7 · Accepted Incoterm',
    content:
      'DAP = delivery at your destination. You can tick several acceptable Incoterms and the engine matches against any.',
    autofill: { incoterm: 'DAP' },
  },
  {
    key: 'campo-termino-pago',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: '[data-tutorial="form-logistica"]',
    placement: 'auto',
    title: 'Field 8 · Payment terms',
    content:
      "When you pay: cash, 30 days from invoice date, 60 days… The engine filters out incompatible sellers. Setting \"30 days\".",
    autofill: { terminosPagoAceptados: ['DIAS_30'] },
  },
  {
    key: 'btn-publicar',
    kind: 'spotlight',
    route: '/buyer/orders/new',
    target: '[data-tutorial="btn-publicar-pedido"]',
    placement: 'top',
    title: 'Press "Publish order"',
    content:
      "On publish, the matching engine pairs your order with active lots instantly. Continue — we'll simulate the submission and I'll take you to see the offers.",
    note: 'In production this button hits POST /orders. In test mode it\'s intercepted and nothing is saved.',
  },
  {
    key: 'ir-detalle-pedido',
    kind: 'modal',
    title: 'Order created!',
    content:
      "The matching engine has found a compatible seller. I'll take you to the order detail so you can see the offer.",
  },
  {
    key: 'ver-ofertas',
    kind: 'spotlight',
    route: '/buyer/orders/tutorial-pedido-PD7K9',
    target: '[data-tutorial="ofertas-vendedores"]',
    placement: 'auto',
    title: 'Seller offers',
    content:
      'This section shows all compatible sellers. Each card: seller, score, committed kg, €/kg, total and the buttons to pay / open chat / view contract / open incident.',
  },
  {
    key: 'aceptar-oferta',
    kind: 'modal',
    title: 'Accept the offer',
    content:
      "You'd accept the offer as-is or open the chat to negotiate price/sizes/Incoterm. Several sellers can contribute to the same order — the platform splits by size.",
  },
  {
    key: 'ir-contrato-comprador',
    kind: 'modal',
    title: 'Contract draft',
    content:
      "On accepting, when the seller signs you get notified and review the draft. I'll take you to the contract screen.",
  },
  {
    key: 'contrato-resumen-comprador',
    kind: 'spotlight',
    route: '/buyer/contracts/tutorial-match-MX42',
    target: '[data-tutorial="contract-resumen"]',
    placement: 'auto',
    title: 'Operation summary',
    content:
      "Here you see the conditions being signed: product + variety, total quantity, €/kg, total amount, Incoterm, payment conditions, destination and the specific sizes. It's what will appear in the PDF.",
  },
  {
    key: 'contrato-comision-comprador',
    kind: 'spotlight',
    route: '/buyer/contracts/tutorial-match-MX42',
    target: '[data-tutorial="contract-comision"]',
    placement: 'auto',
    title: 'Primar-IA commission',
    content:
      "Important: this is the only amount you pay to Primar-IA. It's the commission per operation. The payment of the goods to the seller is handled by YOU via wire transfer, per the contract conditions.",
  },
  {
    key: 'contrato-firmas-comprador',
    kind: 'spotlight',
    route: '/buyer/contracts/tutorial-match-MX42',
    target: '[data-tutorial="contract-firmas"]',
    placement: 'auto',
    title: 'Signature status',
    content:
      "Here you see the state of both signatures. After you sign and pay the commission, the contract moves to SIGNED and the seller is ordered to ship the goods.",
  },
  {
    key: 'firmar-pagar',
    kind: 'modal',
    title: 'Sign and pay the commission',
    content:
      "Sign by drawing or typing the signature + go to Stripe Checkout to pay the Primar-IA commission (2-3% over the contract value). This is the ONLY amount the platform charges.",
    note: "The goods payment to the seller is handled by YOU off-platform per the agreed term.",
  },
  {
    key: 'contrato-firmado',
    kind: 'modal',
    title: 'Contract SIGNED',
    content:
      "Once the commission is paid, the contract moves to SIGNED. The seller is ordered to ship the goods.",
  },
  {
    key: 'esperar-envio',
    kind: 'modal',
    title: 'Wait for the shipment',
    content:
      "When the seller marks SHIPPED, you'll get a notification with a QR code. You scan it on receiving the truck.",
  },
  {
    key: 'recibir-qr',
    kind: 'modal',
    title: 'Scan QR on receipt',
    content:
      "This happens physically: the carrier arrives, you scan with the phone or from the dashboard. The operation moves to DELIVERED and the mutual rating screen is enabled.",
  },
  {
    key: 'pagar-vendedor',
    kind: 'modal',
    title: 'Pay the seller',
    content:
      "By wire transfer, per the term you agreed: cash, 30 days, 60 days… Primar-IA only intermediates contract and commission, it doesn't collect or pay for the goods.",
  },
  {
    key: 'valorar',
    kind: 'modal',
    title: 'Mutual rating',
    content:
      "After delivery, you both rate each other 1-5 stars. If there was an issue (damaged goods, missing, off-size…), you open an INCIDENT instead of rating.",
  },
  {
    key: 'final',
    kind: 'modal',
    title: 'Operation completed!',
    content:
      "Each operation closed without incidents improves your reputation as a buyer — better sellers accept you, better terms are unlocked. Test mode closed.",
    note: 'Closing test mode and returning to the dashboard.',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// API pública
// ════════════════════════════════════════════════════════════════════════════

export function getCrearLoteFlow(locale: SupportedLocale): FlowStep[] {
  return locale === 'EN' ? CREAR_LOTE_FLOW_EN : CREAR_LOTE_FLOW_ES;
}

export function getHacerPedidoFlow(locale: SupportedLocale): FlowStep[] {
  return locale === 'EN' ? HACER_PEDIDO_FLOW_EN : HACER_PEDIDO_FLOW_ES;
}

// Compat: re-exportamos el flow ES bajo el nombre antiguo para no romper
// imports legacy mientras se migran los consumidores. Deprecado: usar
// getCrearLoteFlow(locale) / getHacerPedidoFlow(locale).
export const CREAR_LOTE_FLOW = CREAR_LOTE_FLOW_ES;
export const HACER_PEDIDO_FLOW = HACER_PEDIDO_FLOW_ES;
