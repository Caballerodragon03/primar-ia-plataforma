/**
 * Phase 14M v2 — Contenido de los tutoriales tipo slideshow.
 *
 * Todos los datos en los ejemplos son INVENTADOS y se etiquetan como
 * "Ejemplo simulado" para que el usuario sepa que no son reales y no
 * intente buscar ese lote/pedido concreto en su panel.
 */
import type { Slide } from './SlideshowTutorial';

export const CREAR_LOTE_SLIDES: Slide[] = [
  {
    title: 'Cómo publicar un lote en Primar-IA',
    body: [
      'Vamos a recorrer el flujo COMPLETO de venta: desde que cosechas hasta que recibes el pago del comprador.',
      'Todos los datos que veas en este tutorial son inventados — no busques este lote en tu panel, no existe. Está pensado para que entiendas el proceso antes de hacerlo con tu cosecha real.',
      '• Tiempo estimado: 2 minutos.',
      '• Puedes salir cuando quieras: el tutorial se marcará como completado al llegar al final.',
    ],
  },
  {
    title: '1. Punto de partida: lotes',
    screen: '/seller/lots',
    body: [
      'Desde tu panel pulsa en "Mis lotes" en el menú lateral, y luego en "Publicar lote nuevo" arriba a la derecha.',
      'Un "lote" es un volumen de producto homogéneo que quieres vender (mismo producto, misma variedad, misma cosecha). Si tienes naranjas Navelinas y Lanelates, son DOS lotes distintos.',
    ],
  },
  {
    title: '2. Producto y variedad',
    body: [
      'Eliges el producto (Aguacate, Naranja, Tomate…) y la variedad concreta. La variedad es importante porque los compradores filtran por ella.',
      'Cuanto más específico, mejor: un pedido pidiendo "Aguacate Hass" no hará match con un lote de "Aguacate Bacon".',
    ],
    example: {
      rows: [
        { label: 'Producto', value: 'Aguacate' },
        { label: 'Variedad', value: 'Hass' },
        { label: 'Temporada', value: '2026 — primavera' },
      ],
      caption: 'Datos inventados para este recorrido.',
    },
  },
  {
    title: '3. Cantidad y calibres',
    body: [
      'Indicas cuántos kilos totales tienes y cómo se reparten por calibre. El calibre es el tamaño (en aguacates: 12, 14, 16…). Los compradores piden por calibre porque pagan distinto cada uno.',
      'Para cada calibre defines: kilos disponibles y precio mínimo €/kg que aceptas.',
    ],
    example: {
      rows: [
        { label: 'Total', value: '5.000 kg' },
        { label: 'Calibre 14', value: '2.000 kg · 3,20 €/kg' },
        { label: 'Calibre 16', value: '2.000 kg · 2,80 €/kg' },
        { label: 'Calibre 18', value: '1.000 kg · 2,40 €/kg' },
      ],
      caption: 'El sistema solo te empareja con compradores que paguen >= a tu mínimo.',
    },
  },
  {
    title: '4. Fotos y certificados',
    body: [
      'Subes 1-10 fotos del lote (depende de tu plan). Las fotos aumentan mucho la confianza del comprador y la probabilidad de cerrar venta.',
      'Si tienes certificados (Global G.A.P., orgánico, IGP…) los vinculas aquí. Aparecen en tu perfil público y suben tu puntuación de fiabilidad.',
    ],
  },
  {
    title: '5. Logística e Incoterm',
    body: [
      'Eliges quién pone el transporte:',
      '• "Yo envío" → tú lo organizas (incoterms tipo CPT, DAP, DDP).',
      '• "Que el comprador recoja" → él se encarga (incoterm EXW).',
      '• "Indiferente" → lo negociáis en chat.',
      'El incoterm define quién paga el transporte y cuándo pasa el riesgo. Si dudas, Primar-IA te recomienda uno según el tipo de operación.',
    ],
    example: {
      rows: [
        { label: 'Logística', value: 'Yo envío' },
        { label: 'Incoterm', value: 'DAP — Entregado en destino' },
        { label: 'Recogida', value: 'Vélez-Málaga (29700)' },
      ],
    },
  },
  {
    title: '6. Publicar el lote',
    body: [
      'Al publicar, el motor de matching de Primar-IA cruza tus calibres, precios, ubicación e incoterm con los pedidos activos. Te muestra los compatibles en /seller/matches normalmente en segundos.',
      'Si tu plan es gratuito hay 24 h de retraso antes de que el lote sea visible. Con planes de pago el matching es inmediato.',
      'En el panel verás el lote en estado ACTIVO, y a medida que firmes contratos pasa a PARCIALMENTE_VENDIDO → VENDIDO.',
    ],
    example: {
      rows: [
        { label: 'ID lote', value: 'NB24C (inventado)' },
        { label: 'Estado', value: 'ACTIVO' },
        { label: 'Cobertura', value: '0% — esperando matches' },
      ],
    },
  },
  {
    title: '7. Revisar matches con compradores',
    screen: '/seller/matches',
    body: [
      'Cuando un pedido encaja, ves al comprador con su puntuación, su volumen mensual y los términos del pedido (kg, €/kg, incoterm, plazo).',
      'Puedes:',
      '• Aceptar tal cual → "Contribuir al pedido".',
      '• Negociar en chat → propones cambios de precio, calibres o logística.',
      '• Rechazar → el match desaparece y no vuelve a aparecer.',
    ],
    example: {
      rows: [
        { label: 'Comprador', value: 'Frutas García S.L.' },
        { label: 'Pide', value: '1.000 kg de cal. 14 a 3,15 €/kg' },
        { label: 'Match score', value: '84/100' },
      ],
      caption: 'En el modal "Contribuir" verás cuántos kg te quedan libres en tu lote.',
    },
  },
  {
    title: '8. Firmar el contrato',
    body: [
      'Al aceptar el match, Primar-IA genera automáticamente el borrador del contrato con todas las condiciones acordadas.',
      'Tú lo firmas dibujando tu firma en pantalla o tecleando una rúbrica. Tienes 48 horas hábiles para firmarlo, si no, el match caduca.',
      'Después firma el comprador y paga la comisión de la plataforma. Hasta que él no pague, el contrato no es FIRMADO.',
    ],
  },
  {
    title: '9. Enviar la mercancía',
    body: [
      'Una vez el contrato está FIRMADO, ves un botón "Marcar como enviado" en la página del contrato. Pulsa cuando salga el camión.',
      'El comprador recibe un código QR para confirmar la entrega cuando le llegue el camión. Tú no necesitas hacer nada más en este punto.',
    ],
    example: {
      rows: [
        { label: 'Estado contrato', value: 'FIRMADO → ENVIADO' },
        { label: 'Acción comprador', value: 'Escanear QR al recibir' },
      ],
    },
  },
  {
    title: '10. Cobrar y valorar',
    body: [
      'El comprador te paga directamente fuera de la plataforma (transferencia, según el vencimiento que pactasteis: contado, 30 d, 60 d…). Primar-IA solo cobra su comisión, no intermedia tu pago.',
      'Cuando confirmes el cobro, ambos os valoráis (1-5 estrellas) y la operación queda COMPLETADA.',
      'Tu puntuación de fiabilidad sube con cada operación completada sin incidencias — cuantas más cierres bien, mejores condiciones y prioridad obtendrás.',
    ],
    example: {
      rows: [
        { label: 'Pago vendedor', value: '7.150 € (1.000 kg × 3,15 + IVA)' },
        { label: 'Comisión Primar-IA', value: 'Ya pagada por el comprador' },
        { label: 'Estado final', value: 'COMPLETADO' },
      ],
    },
  },
  {
    title: '¡Ya conoces todo el flujo!',
    body: [
      'Recapitulando: publicar lote → match con comprador → contrato → firma → pago de comisión → envío → entrega → cobro → valoración mutua.',
      'Cierra este tutorial y prueba con tu propia cosecha. Si te bloqueas, vuelve a /perfil → Tutoriales y repítelo cuando quieras.',
      'Recuerda: cada operación cerrada SIN incidencia mejora tu reputación en la plataforma — y eso desbloquea mejores condiciones, badges y matches prioritarios.',
    ],
  },
];

export const HACER_PEDIDO_SLIDES: Slide[] = [
  {
    title: 'Cómo hacer un pedido en Primar-IA',
    body: [
      'Vamos a recorrer el flujo COMPLETO de compra: desde que defines lo que necesitas hasta que recibes el camión en tu almacén.',
      'Todos los datos son inventados — no busques este pedido en tu panel. El objetivo es que entiendas el proceso antes de lanzar un pedido real.',
      '• Tiempo estimado: 2 minutos.',
      '• Puedes salir cuando quieras: el tutorial se marcará como completado al llegar al final.',
    ],
  },
  {
    title: '1. Punto de partida: pedidos',
    screen: '/buyer/orders',
    body: [
      'Desde tu panel pulsa en "Mis pedidos" en el menú, y luego en "Crear pedido nuevo".',
      'Un pedido en Primar-IA es una solicitud abierta: dices QUÉ quieres, CUÁNTO y a QUÉ PRECIO máximo. Varios vendedores pueden contribuir hasta cubrir el total.',
    ],
  },
  {
    title: '2. Producto y variedad',
    body: [
      'Eliges el producto y, si te importa, la variedad concreta. Cuanto más específico, mejor encajan los matches.',
      'Si te da igual la variedad puedes dejarlo abierto: la plataforma te traerá lotes de cualquier variedad del producto.',
    ],
    example: {
      rows: [
        { label: 'Producto', value: 'Naranja' },
        { label: 'Variedad', value: 'Navelina (preferida)' },
      ],
    },
  },
  {
    title: '3. Calibres y precios máximos',
    body: [
      'Indicas cuántos kilos necesitas por calibre y el precio máximo €/kg que estás dispuesto a pagar por cada uno.',
      'El motor empareja tu pedido solo con lotes que tengan ese calibre Y un precio mínimo ≤ a tu máximo.',
    ],
    example: {
      rows: [
        { label: 'Calibre 3', value: '3.000 kg · máx 0,55 €/kg' },
        { label: 'Calibre 4', value: '2.000 kg · máx 0,48 €/kg' },
        { label: 'Total pedido', value: '5.000 kg' },
      ],
      caption: 'Si no encuentras matches, sube el precio máximo o relaja los calibres.',
    },
  },
  {
    title: '4. Logística e Incoterm',
    body: [
      'Eliges cómo quieres recibir la mercancía:',
      '• "Yo recojo" → mandas un transporte a la finca del vendedor (incoterm EXW).',
      '• "Que el vendedor envíe" → llega a tu almacén (DAP, DDP…).',
      '• "Indiferente" → lo decidís en chat.',
      'Si dudas, el wizard te recomienda uno según tu operación. También puedes marcar varios incoterms aceptables y la plataforma busca match con cualquiera.',
    ],
    example: {
      rows: [
        { label: 'Logística', value: 'Que el vendedor envíe' },
        { label: 'Incoterm', value: 'DAP — Entregado en destino' },
        { label: 'Destino', value: 'Mercabarna, Barcelona' },
      ],
    },
  },
  {
    title: '5. Plazo y término de pago',
    body: [
      'Indicas para cuándo necesitas la mercancía y cómo pagarás (contado, 30 días fecha factura, 60 d…).',
      'Esto entra en el matching: vendedores con condiciones más estrictas se filtran fuera; vendedores compatibles aparecen con su match score.',
    ],
    example: {
      rows: [
        { label: 'Entrega', value: 'Antes del 30/06/2026' },
        { label: 'Término pago', value: '30 días fecha factura' },
      ],
    },
  },
  {
    title: '6. Publicar el pedido',
    body: [
      'Al publicar, el motor de matching de Primar-IA cruza tus calibres, precios, destino e incoterm con los lotes activos. Verás los compatibles en cuestión de segundos.',
      'Tu pedido aparece en estado ACTIVO. A medida que vendedores se comprometan, pasa a PARCIALMENTE_CUBIERTO y finalmente TOTALMENTE_CUBIERTO cuando llegues al 100% de los kg.',
      'Mientras hay matches sin contrato firmado el pedido sigue ocupando uno de los "slots" activos de tu plan.',
    ],
    example: {
      rows: [
        { label: 'ID pedido', value: 'PD7K9 (inventado)' },
        { label: 'Estado', value: 'ACTIVO' },
        { label: 'Cobertura', value: '0% — 5.000 kg pendientes' },
      ],
    },
  },
  {
    title: '7. Recibir ofertas y negociar',
    screen: '/buyer/orders/[id]',
    body: [
      'Cada vendedor que encaja aparece como una oferta con su puntuación, kg comprometidos, €/kg y estado.',
      'Puedes:',
      '• Aceptar la oferta → se prepara el contrato.',
      '• Negociar en chat → propones cambios de precio, calibres o logística (mismas reglas que el vendedor).',
      'No tienes que cubrir el pedido con un solo vendedor: pueden contribuir varios a la vez. La plataforma reparte por calibre y precio.',
    ],
    example: {
      rows: [
        { label: 'Vendedor', value: 'Cooperativa El Naranjo' },
        { label: 'Ofrece', value: '1.500 kg cal. 3 a 0,52 €/kg' },
        { label: 'Estado', value: 'Aceptado · pendiente firma' },
      ],
    },
  },
  {
    title: '8. Firmar y pagar la comisión',
    body: [
      'Cuando el vendedor firma el borrador, te llega una notificación. Tu turno: firmas y pagas la comisión de Primar-IA con tarjeta o transferencia (Stripe Checkout, seguro y rápido).',
      'Esta comisión solo la pagas tú cuando el contrato pasa a FIRMADO. Si caduca o se cancela antes, no se cobra nada.',
      'El pago del producto al vendedor lo gestionas TÚ fuera de la plataforma según el vencimiento que pactasteis (contado, 30 d, 60 d…).',
    ],
    example: {
      rows: [
        { label: 'Comisión Primar-IA', value: '19,50 € (2,5% sobre 780 €)' },
        { label: 'Pago al vendedor', value: '780 € a 30 días — fuera de la plataforma' },
      ],
    },
  },
  {
    title: '9. Recibir la mercancía',
    body: [
      'Cuando el vendedor te avise de que ha salido el camión, lo verás en el contrato como ENVIADO.',
      'Al llegar, escaneas el QR que te genera Primar-IA y la entrega queda registrada como recibida. Esto dispara la valoración mutua.',
    ],
    example: {
      rows: [
        { label: 'Estado', value: 'ENVIADO → RECIBIDO' },
        { label: 'Acción', value: 'Escanear QR del transportista' },
      ],
    },
  },
  {
    title: '10. Valorar y aprender',
    body: [
      'Tras la entrega, ambos valoráis la operación (1-5 estrellas) y la operación pasa a COMPLETADA.',
      'Si hubo algún problema (mercancía dañada, faltante, fuera de calibre…), abres una INCIDENCIA en lugar de valorar. La plataforma media y propone una resolución.',
      'Tu puntuación como comprador sube con cada operación cerrada sin incidencias — cuantas más completes bien, mejores vendedores te aceptarán y más beneficios desbloquearás.',
    ],
    example: {
      rows: [
        { label: 'Mi valoración', value: '5 estrellas' },
        { label: 'Estado final', value: 'COMPLETADO' },
      ],
    },
  },
  {
    title: '¡Ya conoces todo el flujo!',
    body: [
      'Recapitulando: crear pedido → matches con vendedores → contrato → firma → pago de comisión a Primar-IA → envío → entrega → pago al vendedor → valoración mutua.',
      'Cierra este tutorial y prueba con un pedido real. Si te bloqueas, vuelve a /perfil → Tutoriales y repítelo cuando quieras.',
      'Recuerda: cada operación cerrada SIN incidencia mejora tu reputación. Mejor reputación = mejores vendedores te aceptan y mejores condiciones desbloqueas.',
    ],
  },
];
