/**
 * Mapping of logística choice → allowed Incoterms.
 *
 * The shipping responsibility model:
 *   YO_ENVIO      = el listador (vendedor o comprador) se encarga del envío.
 *                   En la práctica eso significa que entrega EN destino o
 *                   asume el coste del transporte → incoterms grupo D/C.
 *   OTRO_RECOGE   = el listador NO envía; la otra parte recoge en origen →
 *                   incoterms grupo E/F.
 *   INDIFERENTE   = sin preferencia → todos los incoterms permitidos.
 *
 * Important: this same table is consumed by the lot form, the order form,
 * and the chat negotiation panel. Keep all three in sync via this file.
 */

export type Incoterm =
  | 'EXW' | 'FCA' | 'FOB' | 'CIF' | 'DAP' | 'DDP'
  | 'FAS' | 'CFR' | 'CPT' | 'CIP' | 'DAT' | 'DPU';

export type LogisticaPreferencia = 'YO_ENVIO' | 'OTRO_RECOGE' | 'INDIFERENTE';

export type TerminoPago = 'INMEDIATO' | 'DIAS_30' | 'DIAS_60';

export const ALL_INCOTERMS: ReadonlyArray<Incoterm> = [
  'EXW', 'FCA', 'FOB', 'CIF', 'DAP', 'DDP',
  'FAS', 'CFR', 'CPT', 'CIP', 'DAT', 'DPU',
];

export const ALL_TERMINOS_PAGO: ReadonlyArray<TerminoPago> = [
  'INMEDIATO', 'DIAS_30', 'DIAS_60',
];

// Grupos E/F = origen (envío a cargo del comprador, vendedor entrega en origen).
const INCOTERMS_OTRO_RECOGE: ReadonlyArray<Incoterm> = ['EXW', 'FCA', 'FAS', 'FOB'];

// Grupos C/D = destino (envío a cargo del vendedor o pagado por él).
const INCOTERMS_YO_ENVIO: ReadonlyArray<Incoterm> = [
  'CPT', 'CIP', 'CFR', 'CIF', 'DAP', 'DPU', 'DDP', 'DAT',
];

export function incotermsForLogistica(logistica: LogisticaPreferencia): ReadonlyArray<Incoterm> {
  switch (logistica) {
    case 'YO_ENVIO':    return INCOTERMS_YO_ENVIO;
    case 'OTRO_RECOGE': return INCOTERMS_OTRO_RECOGE;
    case 'INDIFERENTE': return ALL_INCOTERMS;
  }
}

/**
 * Returns true if the chosen incoterm is consistent with the logística
 * preference. Used to gate the lot/order form and the chat negotiation.
 */
export function isIncotermAllowedForLogistica(
  incoterm: Incoterm,
  logistica: LogisticaPreferencia,
): boolean {
  return incotermsForLogistica(logistica).includes(incoterm);
}

/**
 * Given an incoterm, derive the implied logística preference. Used when the
 * user picks an incoterm first (e.g. in chat negotiation) and we need to
 * snap logística to the matching value.
 */
export function logisticaFromIncoterm(incoterm: Incoterm): Exclude<LogisticaPreferencia, 'INDIFERENTE'> {
  return INCOTERMS_OTRO_RECOGE.includes(incoterm) ? 'OTRO_RECOGE' : 'YO_ENVIO';
}

/** Human-readable labels (Spanish) for select widgets. */
export const LOGISTICA_LABELS: Record<LogisticaPreferencia, string> = {
  YO_ENVIO: 'Yo envío / entrego',
  OTRO_RECOGE: 'La otra parte recoge',
  INDIFERENTE: 'Indiferente',
};

export const TERMINO_PAGO_LABELS: Record<TerminoPago, string> = {
  INMEDIATO: 'Pago inmediato',
  DIAS_30: '30 días',
  DIAS_60: '60 días',
};

/**
 * Human-readable info for each incoterm:
 *   - `name`: long name in Spanish
 *   - `desc`: one-line summary of the responsibility split
 *   - `responsable`: which party bears most cost/risk (resumen del onus)
 * Single source of truth, shared by lot/order/contract/chat UIs.
 */
export const INCOTERM_INFO: Record<Incoterm, { name: string; desc: string; responsable: string }> = {
  EXW: {
    name: 'Ex Works',
    desc: 'El comprador recoge en la explotación del vendedor y se encarga de todo el transporte y trámites.',
    responsable: 'Comprador: transporte completo, seguro, aduanas.',
  },
  FCA: {
    name: 'Franco Transportista',
    desc: 'El vendedor entrega al transportista designado por el comprador en un punto acordado (lonja, cooperativa, almacén).',
    responsable: 'Comprador: transporte principal y seguro a partir de la entrega al transportista.',
  },
  FAS: {
    name: 'Franco al Costado del Buque',
    desc: 'Solo marítimo. El vendedor entrega la mercancía al costado del buque en el puerto de origen.',
    responsable: 'Comprador: embarque, flete marítimo y seguro.',
  },
  FOB: {
    name: 'Franco a Bordo',
    desc: 'Solo marítimo. El vendedor entrega la mercancía cargada a bordo del buque en el puerto de origen.',
    responsable: 'Comprador: flete marítimo y seguro desde el momento del embarque.',
  },
  CFR: {
    name: 'Coste y Flete',
    desc: 'Solo marítimo. El vendedor paga el flete hasta el puerto de destino, pero el riesgo pasa al comprador al embarcar.',
    responsable: 'Vendedor: flete. Comprador: seguro y descarga.',
  },
  CIF: {
    name: 'Coste, Seguro y Flete',
    desc: 'Solo marítimo. El vendedor paga flete y seguro hasta el puerto de destino; el riesgo pasa al embarcar.',
    responsable: 'Vendedor: flete + seguro mínimo. Comprador: descarga y trámites de importación.',
  },
  CPT: {
    name: 'Transporte Pagado Hasta',
    desc: 'El vendedor contrata y paga el transporte hasta el destino, pero el riesgo pasa al comprador con el primer transportista.',
    responsable: 'Vendedor: transporte. Comprador: seguro y riesgo en tránsito.',
  },
  CIP: {
    name: 'Transporte y Seguro Pagados Hasta',
    desc: 'Como CPT pero el vendedor también contrata el seguro (mínimo 110% del valor). Ideal para perecederos.',
    responsable: 'Vendedor: transporte + seguro completo. Comprador: descarga e importación.',
  },
  DAP: {
    name: 'Entregado en Lugar',
    desc: 'El vendedor entrega la mercancía en el lugar acordado en destino, lista para descargar.',
    responsable: 'Vendedor: transporte completo hasta destino. Comprador: descarga y aduanas de importación.',
  },
  DPU: {
    name: 'Entregado y Descargado',
    desc: 'Como DAP pero el vendedor también realiza la descarga en el destino.',
    responsable: 'Vendedor: transporte + descarga. Comprador: aduanas de importación.',
  },
  DDP: {
    name: 'Entregado con Derechos Pagados',
    desc: 'El vendedor asume todos los costes y trámites, incluyendo aduanas de importación. Máxima responsabilidad para el vendedor.',
    responsable: 'Vendedor: todo (transporte, seguro, aduanas de origen y destino).',
  },
  DAT: {
    name: 'Entregado en Terminal',
    desc: 'El vendedor entrega y descarga la mercancía en la terminal de transporte acordada en destino.',
    responsable: 'Vendedor: hasta la descarga en terminal. Comprador: trámites posteriores.',
  },
};

/** Convenience: just the desc by code (most common need). */
export const INCOTERM_DESCRIPTIONS: Record<Incoterm, string> = Object.fromEntries(
  (Object.keys(INCOTERM_INFO) as Incoterm[]).map((k) => [k, INCOTERM_INFO[k].desc]),
) as Record<Incoterm, string>;

/**
 * Phase 16 — English version of INCOTERM_INFO. Same keys, same structure.
 * `getIncotermInfo(code, locale)` below picks the right one. Kept as a
 * sibling object (not a function) so callers can also import directly.
 */
export const INCOTERM_INFO_EN: Record<Incoterm, { name: string; desc: string; responsable: string }> = {
  EXW: {
    name: 'Ex Works',
    desc: "The buyer picks up at the seller's premises and handles all transport and paperwork.",
    responsable: 'Buyer: full transport, insurance, customs.',
  },
  FCA: {
    name: 'Free Carrier',
    desc: "The seller delivers to the carrier nominated by the buyer at an agreed point (market, cooperative, warehouse).",
    responsable: 'Buyer: main transport and insurance after handover to the carrier.',
  },
  FAS: {
    name: 'Free Alongside Ship',
    desc: 'Sea-freight only. The seller delivers the goods alongside the ship at the port of origin.',
    responsable: 'Buyer: loading, sea freight and insurance.',
  },
  FOB: {
    name: 'Free On Board',
    desc: 'Sea-freight only. The seller delivers the goods loaded on board the ship at the port of origin.',
    responsable: 'Buyer: sea freight and insurance from the moment of loading.',
  },
  CFR: {
    name: 'Cost and Freight',
    desc: 'Sea-freight only. The seller pays the freight to the destination port, but risk passes to the buyer at loading.',
    responsable: 'Seller: freight. Buyer: insurance and unloading.',
  },
  CIF: {
    name: 'Cost, Insurance and Freight',
    desc: 'Sea-freight only. The seller pays freight and insurance to the destination port; risk passes at loading.',
    responsable: 'Seller: freight + minimum insurance. Buyer: unloading and import clearance.',
  },
  CPT: {
    name: 'Carriage Paid To',
    desc: 'The seller contracts and pays for carriage to the destination, but risk passes to the buyer at the first carrier.',
    responsable: 'Seller: carriage. Buyer: insurance and in-transit risk.',
  },
  CIP: {
    name: 'Carriage and Insurance Paid To',
    desc: 'Like CPT but the seller also contracts insurance (min. 110% of value). Ideal for perishables.',
    responsable: 'Seller: carriage + full insurance. Buyer: unloading and import.',
  },
  DAP: {
    name: 'Delivered At Place',
    desc: 'The seller delivers the goods at the agreed destination point, ready for unloading.',
    responsable: 'Seller: full transport to destination. Buyer: unloading and import customs.',
  },
  DPU: {
    name: 'Delivered at Place Unloaded',
    desc: 'Like DAP but the seller also performs unloading at the destination.',
    responsable: 'Seller: transport + unloading. Buyer: import customs.',
  },
  DDP: {
    name: 'Delivered Duty Paid',
    desc: 'The seller bears all costs and paperwork, including import customs. Maximum responsibility for the seller.',
    responsable: 'Seller: everything (transport, insurance, customs at origin and destination).',
  },
  DAT: {
    name: 'Delivered at Terminal',
    desc: 'The seller delivers and unloads the goods at the agreed transport terminal at destination.',
    responsable: 'Seller: until unloading at terminal. Buyer: downstream paperwork.',
  },
};

/**
 * Phase 16 — Locale-aware helper. `locale` is a 2-letter language code; we
 * only differentiate 'en' vs everything else (Spanish default).
 */
export function getIncotermInfo(
  code: Incoterm,
  locale: string = 'es',
): { name: string; desc: string; responsable: string } {
  const lc = (locale ?? 'es').toLowerCase().slice(0, 2);
  return lc === 'en' ? INCOTERM_INFO_EN[code] : INCOTERM_INFO[code];
}

export const INCOTERM_DESCRIPTIONS_EN: Record<Incoterm, string> = Object.fromEntries(
  (Object.keys(INCOTERM_INFO_EN) as Incoterm[]).map((k) => [k, INCOTERM_INFO_EN[k].desc]),
) as Record<Incoterm, string>;

/**
 * Validates a lot/order's logística + incotermsAceptados combination at
 * submit time, returning an array of human-readable error messages (empty
 * if OK). Used by both Lote and Pedido validation so the same rules apply.
 */
export function validateLogisticaIncoterms(
  logistica: LogisticaPreferencia,
  incotermsAceptados: ReadonlyArray<string>,
): string[] {
  const errors: string[] = [];

  if (incotermsAceptados.length === 0) {
    errors.push('Selecciona al menos un incoterm que aceptes');
    return errors;
  }

  const allowed = incotermsForLogistica(logistica) as ReadonlyArray<string>;
  const invalid = incotermsAceptados.filter((it) => !allowed.includes(it));
  if (invalid.length > 0) {
    errors.push(
      `Los incoterms ${invalid.join(', ')} no son compatibles con la opción de logística seleccionada. ` +
      `Cambia la opción de "${LOGISTICA_LABELS[logistica]}" o quita esos incoterms.`,
    );
  }
  return errors;
}
