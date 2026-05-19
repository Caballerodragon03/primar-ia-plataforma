/**
 * Pure PDF generator: takes a fully-built ContractData and produces a Buffer.
 * Used for both draft (with subtle watermark) and final (without).
 *
 * Implementation notes:
 *   - Uses pdfkit (already a dependency)
 *   - Watermark is applied on EVERY page via the `pageAdded` event listener,
 *     so dynamic content that overflows still gets stamped.
 *   - Spanish legal contract structure mimicking the typical "EN ... A ...
 *     REUNIDOS — EXPONEN — ESTIPULACIONES — FIRMAS" structure used by
 *     notaries and B2B contracts in España.
 *   - All money values formatted with es-ES locale (€).
 *
 * Phase 14F redesign (May 2026): rebajado del watermark rojo gigante por una
 * marca de agua gris sutil + ampliado el contenido textual + introducción
 * estándar EN/A/REUNIDOS/EXPONEN/ESTIPULAN + mejor jerarquía tipográfica.
 */
import PDFDocument from 'pdfkit';
import type { ContractData, ContractParty } from './contract-data.js';

// Subtle slate palette — professional, not playful.
const COLOR_PRIMARY = '#0f172a';   // slate-900 — body text
const COLOR_ACCENT  = '#1e293b';   // slate-800 — section titles
const COLOR_MUTED   = '#64748b';   // slate-500 — meta / labels
const COLOR_RULE    = '#e2e8f0';   // slate-200 — horizontal rules
const COLOR_BAND    = '#0f172a';   // section header band
const COLOR_BADGE_DRAFT_BG = '#fef3c7'; // amber-100 — draft badge
const COLOR_BADGE_DRAFT_FG = '#92400e'; // amber-800 — draft badge text
const COLOR_WATERMARK = '#94a3b8';  // slate-400 — subtle, NOT red

const MARGIN = 56;

function fmtEur(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);
}
function fmtKg(n: number): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(n) + ' kg';
}
function fmtPct(n: number): string {
  return (n * 100).toFixed(2) + ' %';
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}
/** "a 19 de mayo de 2026" — for the legal-style EN clauses. */
function fmtDateLegal(d: Date): string {
  return `a ${d.getDate()} de ${d.toLocaleString('es-ES', { month: 'long' })} de ${d.getFullYear()}`;
}

interface WatermarkOpts {
  pageWidth: number;
  pageHeight: number;
}

/**
 * Draws a single subtle diagonal stamp. Compared to the previous version
 * the watermark is:
 *   · slate-400 (no longer angry red),
 *   · 8% opacity (was 10%),
 *   · 38pt (was 58pt) so it doesn't dominate the page,
 *   · single line of text (no second tagline).
 */
function drawWatermarkOnPage(doc: PDFKit.PDFDocument, { pageWidth, pageHeight }: WatermarkOpts): void {
  doc.save();
  doc.fillColor(COLOR_WATERMARK).fillOpacity(0.08);
  doc.fontSize(38).font('Helvetica-Bold');

  const cx = pageWidth / 2;
  const cy = pageHeight / 2;
  doc.rotate(-28, { origin: [cx, cy] });
  doc.text('BORRADOR — NO VÁLIDO HASTA FIRMA', 0, cy - 14, {
    width: pageWidth,
    align: 'center',
  });
  doc.restore();
}

/** Draws a small draft badge in the top-right corner. */
function drawDraftBadge(doc: PDFKit.PDFDocument, pageWidth: number): void {
  const w = 110, h = 22;
  const x = pageWidth - MARGIN - w;
  const y = MARGIN - 10;
  doc.save();
  doc.roundedRect(x, y, w, h, 4).fillAndStroke(COLOR_BADGE_DRAFT_BG, COLOR_BADGE_DRAFT_BG);
  doc.fillColor(COLOR_BADGE_DRAFT_FG).font('Helvetica-Bold').fontSize(9)
    .text('BORRADOR', x, y + 7, { width: w, align: 'center' });
  doc.restore();
}

/** Draws the small Primar-IA badge in the top-left. */
function drawHeaderBadge(doc: PDFKit.PDFDocument): void {
  const w = 86, h = 22;
  const x = MARGIN;
  const y = MARGIN - 10;
  doc.save();
  doc.roundedRect(x, y, w, h, 4).fillAndStroke('#E1C44D', '#E1C44D');
  doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(10)
    .text('Primar-IA', x, y + 6, { width: w, align: 'center' });
  doc.restore();
}

/** Draws a colored section header band: " 3. SECTION TITLE ". */
function drawSectionHeader(doc: PDFKit.PDFDocument, pageWidth: number, title: string): void {
  doc.moveDown(0.6);
  const y = doc.y;
  doc.save();
  doc.rect(MARGIN, y, pageWidth - MARGIN * 2, 22).fillAndStroke(COLOR_BAND, COLOR_BAND);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10.5)
    .text(title.toUpperCase(), MARGIN + 10, y + 6, { width: pageWidth - MARGIN * 2 - 20 });
  doc.restore();
  doc.y = y + 26;
  // Reset body styling.
  doc.fillColor(COLOR_PRIMARY).font('Helvetica').fontSize(10);
}

/** Builds the PDF. */
export function generateContractPdf(data: ContractData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Apply watermark + draft badge on EVERY page (current + future) when draft.
    const renderPageOverlay = () => {
      if (!data.esFinal) {
        drawWatermarkOnPage(doc, { pageWidth, pageHeight });
        drawDraftBadge(doc, pageWidth);
      }
      drawHeaderBadge(doc);
    };
    renderPageOverlay();
    doc.on('pageAdded', renderPageOverlay);

    // ─── Title ───────────────────────────────────────────────────────────
    doc.y = MARGIN + 22;
    doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(17)
      .text('CONTRATO DE COMPRAVENTA MERCANTIL', { align: 'center' });
    doc.moveDown(0.2);
    doc.fillColor(COLOR_MUTED).font('Helvetica').fontSize(10)
      .text('Marketplace agroalimentario · Primar-IA Technologies S.L.', { align: 'center' });

    // Reference + date row.
    doc.moveDown(0.8);
    doc.fontSize(9).fillColor(COLOR_MUTED);
    doc.text(`Referencia ${data.reference}    ·    Generado ${fmtDate(data.fechaGeneracion)}`, {
      align: 'center',
    });
    doc.moveDown(0.5);
    doc.strokeColor(COLOR_RULE).lineWidth(0.7)
      .moveTo(MARGIN, doc.y).lineTo(pageWidth - MARGIN, doc.y).stroke();
    doc.moveDown(0.6);

    // ─── EN/A — preámbulo legal estándar ─────────────────────────────────
    const ciudadVendedor = data.vendedor.ciudad || 'el lugar de origen';
    doc.fillColor(COLOR_PRIMARY).font('Helvetica').fontSize(10);
    doc.text(
      `EN ${ciudadVendedor}, ${fmtDateLegal(data.fechaGeneracion)}.`,
      { align: 'justify' },
    );
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').text('REUNIDOS');
    doc.moveDown(0.2);
    doc.font('Helvetica');
    doc.text(
      `De una parte, D./Dña. ${data.vendedor.personaContactoLegal}, en su condición de ${data.vendedor.cargoContactoLegal} ` +
      `y en representación de ${data.vendedor.razonSocial} (en adelante, EL VENDEDOR), con CIF/NIF ${data.vendedor.cifNif} ` +
      `y domicilio fiscal en ${data.vendedor.direccionFiscal}` +
      `${data.vendedor.ciudad ? ', ' + data.vendedor.ciudad : ''}` +
      `${data.vendedor.codigoPostal ? ' (' + data.vendedor.codigoPostal + ')' : ''}` +
      `, ${data.vendedor.pais}.`,
      { align: 'justify' },
    );
    doc.moveDown(0.3);
    doc.text(
      `Y de otra parte, D./Dña. ${data.comprador.personaContactoLegal}, en su condición de ${data.comprador.cargoContactoLegal} ` +
      `y en representación de ${data.comprador.razonSocial} (en adelante, EL COMPRADOR), con CIF/NIF ${data.comprador.cifNif} ` +
      `y domicilio fiscal en ${data.comprador.direccionFiscal}` +
      `${data.comprador.ciudad ? ', ' + data.comprador.ciudad : ''}` +
      `${data.comprador.codigoPostal ? ' (' + data.comprador.codigoPostal + ')' : ''}` +
      `, ${data.comprador.pais}.`,
      { align: 'justify' },
    );
    doc.moveDown(0.4);
    doc.text(
      'Ambas partes se reconocen mutuamente capacidad legal suficiente para obligarse en los términos del ' +
      'presente contrato y, a tal efecto,',
      { align: 'justify' },
    );

    // ─── EXPONEN ─────────────────────────────────────────────────────────
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').text('EXPONEN');
    doc.moveDown(0.2);
    doc.font('Helvetica');
    doc.text(
      `I. Que el VENDEDOR se dedica profesionalmente a la producción y comercialización de productos ` +
      `agroalimentarios, en particular de ${data.productoNombre}` +
      `${data.variedadNombre ? ', variedad ' + data.variedadNombre : ''}.`,
      { align: 'justify' },
    );
    doc.moveDown(0.2);
    doc.text(
      `II. Que el COMPRADOR está interesado en adquirir dicho producto en las condiciones que más adelante se detallan.`,
      { align: 'justify' },
    );
    doc.moveDown(0.2);
    doc.text(
      'III. Que ambas partes han sido puestas en contacto a través de la plataforma de intermediación ' +
      'Primar-IA, propiedad de Primar-IA Technologies S.L., que actúa exclusivamente como facilitadora ' +
      'tecnológica y emite factura separada al COMPRADOR por sus servicios de matchmaking.',
      { align: 'justify' },
    );
    doc.moveDown(0.2);
    doc.text(
      'IV. Que, alcanzado un acuerdo de voluntades, formalizan la presente compraventa mercantil, que se ' +
      'regirá por las siguientes',
      { align: 'justify' },
    );

    // ─── 1. OBJETO ───────────────────────────────────────────────────────
    drawSectionHeader(doc, pageWidth, '1. Objeto del contrato');
    doc.text(
      `EL VENDEDOR vende y EL COMPRADOR adquiere ${fmtKg(data.cantidadTotalKg)} de ` +
      `${data.productoNombre}${data.variedadNombre ? ' (variedad ' + data.variedadNombre + ')' : ''}, ` +
      `de acuerdo con la siguiente distribución por calibre:`,
      { align: 'justify' },
    );

    // Tabla de calibres con header band gris claro.
    doc.moveDown(0.5);
    const tableX = MARGIN;
    const tableTopY = doc.y;
    const tableW = pageWidth - MARGIN * 2;
    const colCalibreW = tableW * 0.22;
    const colCantW    = tableW * 0.26;
    const colPrecioW  = tableW * 0.26;
    const colSubW     = tableW * 0.26;

    doc.save();
    doc.rect(tableX, tableTopY, tableW, 18).fillAndStroke('#f1f5f9', '#f1f5f9');
    doc.fillColor(COLOR_MUTED).font('Helvetica-Bold').fontSize(8.5);
    doc.text('CALIBRE',      tableX + 8, tableTopY + 5, { width: colCalibreW });
    doc.text('CANTIDAD',     tableX + colCalibreW, tableTopY + 5, { width: colCantW, align: 'right' });
    doc.text('PRECIO €/kg',  tableX + colCalibreW + colCantW, tableTopY + 5, { width: colPrecioW, align: 'right' });
    doc.text('SUBTOTAL',     tableX + colCalibreW + colCantW + colPrecioW - 8, tableTopY + 5, { width: colSubW, align: 'right' });
    doc.restore();
    doc.y = tableTopY + 22;

    doc.font('Helvetica').fontSize(10).fillColor(COLOR_PRIMARY);
    for (const c of data.calibres) {
      const rowY = doc.y;
      doc.text(c.calibre, tableX + 8, rowY, { width: colCalibreW });
      doc.text(fmtKg(c.cantidadKg), tableX + colCalibreW, rowY, { width: colCantW, align: 'right' });
      doc.text(fmtEur(c.precioKg), tableX + colCalibreW + colCantW, rowY, { width: colPrecioW, align: 'right' });
      doc.text(fmtEur(c.subtotal), tableX + colCalibreW + colCantW + colPrecioW - 8, rowY, { width: colSubW, align: 'right' });
      doc.moveDown(0.35);
      doc.strokeColor(COLOR_RULE).lineWidth(0.5)
        .moveTo(tableX, doc.y).lineTo(tableX + tableW, doc.y).stroke();
      doc.moveDown(0.2);
    }

    // Total row
    doc.font('Helvetica-Bold').fontSize(10.5);
    const totalRowY = doc.y;
    doc.text('IMPORTE TOTAL DE LA MERCANCÍA', tableX + 8, totalRowY, { width: colCalibreW + colCantW + colPrecioW });
    doc.text(fmtEur(data.precioTotalMercancia), tableX + colCalibreW + colCantW + colPrecioW - 8, totalRowY, {
      width: colSubW, align: 'right',
    });
    doc.moveDown(0.8);

    // ─── 2. PRECIO Y COMISIÓN ────────────────────────────────────────────
    drawSectionHeader(doc, pageWidth, '2. Precio, comisión y facturación');
    doc.text(
      `EL COMPRADOR satisfará al VENDEDOR el importe total de ${fmtEur(data.precioTotalMercancia)} ` +
      `(${fmtKg(data.cantidadTotalKg)} a los precios unitarios por calibre indicados en la cláusula 1) ` +
      `mediante transferencia bancaria a la cuenta indicada en la cláusula 4, en el plazo allí especificado.`,
      { align: 'justify' },
    );
    doc.moveDown(0.3);
    doc.text(
      `Adicional e independientemente del precio de la mercancía, EL COMPRADOR abona a Primar-IA ` +
      `Technologies S.L. una comisión de intermediación de ${fmtEur(data.comision.importe)} ` +
      `(equivalente al ${fmtPct(data.comision.porcentajeFinal)} sobre el precio de la mercancía), ` +
      `más IVA al 21%, totalizando ${fmtEur(data.comision.totalConIva)}. ${data.comision.notas}. ` +
      `Esta comisión se cobra mediante pasarela de pago en el momento de la firma del comprador y es ` +
      `condición necesaria para la validez del presente contrato.`,
      { align: 'justify' },
    );
    doc.moveDown(0.3);
    doc.text(
      `El VENDEDOR emitirá factura por el importe de la mercancía conforme a su régimen fiscal declarado ` +
      `(${data.vendedor.regimenFiscalLabel}). Primar-IA emitirá factura independiente al COMPRADOR por sus ` +
      `servicios de intermediación. Ambas facturas se generan automáticamente y se descargan desde la ` +
      `plataforma una vez finalizada la firma.`,
      { align: 'justify' },
    );

    // ─── 3. ENTREGA Y LOGÍSTICA ──────────────────────────────────────────
    drawSectionHeader(doc, pageWidth, '3. Entrega, logística e incoterm');
    doc.text(
      `La entrega se realizará bajo el incoterm ${data.incoterm}: ${data.incotermDescripcion}`,
      { align: 'justify' },
    );
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').text('Modalidad logística: ', { continued: true });
    doc.font('Helvetica').text(data.logisticaLabel);
    doc.font('Helvetica-Bold').text('Origen: ', { continued: true });
    doc.font('Helvetica').text(data.origenDireccion);
    if (data.destinoDireccion) {
      doc.font('Helvetica-Bold').text('Destino: ', { continued: true });
      doc.font('Helvetica').text(data.destinoDireccion);
    }
    doc.font('Helvetica-Bold').text('Fecha de entrega prevista: ', { continued: true });
    doc.font('Helvetica').text(fmtDate(data.fechaEntrega));
    doc.moveDown(0.3);
    doc.fillColor(COLOR_MUTED).fontSize(9);
    doc.text(
      'La transmisión del riesgo y la cobertura del transporte siguen las reglas del incoterm acordado. ' +
      'Cualquier modificación del lugar o fecha de entrega requiere acuerdo previo por escrito entre las partes.',
      { align: 'justify' },
    );
    doc.fillColor(COLOR_PRIMARY).fontSize(10);

    // ─── 4. CONDICIONES DE PAGO ──────────────────────────────────────────
    drawSectionHeader(doc, pageWidth, '4. Condiciones de pago al vendedor');
    doc.font('Helvetica-Bold').text('Término de pago: ', { continued: true });
    doc.font('Helvetica').text(
      data.terminoPagoLabel +
      (data.diasVencimiento > 0 ? ` (a contar desde la fecha de entrega)` : ' (al confirmar la operación)'),
    );
    doc.font('Helvetica-Bold').text('Fecha límite de pago: ', { continued: true });
    doc.font('Helvetica').text(fmtDate(data.fechaVencimientoPagoVendedor));

    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLOR_ACCENT).text('Datos bancarios del VENDEDOR');
    doc.fontSize(10).fillColor(COLOR_PRIMARY).font('Helvetica');
    doc.font('Helvetica-Bold').text('Titular: ', { continued: true });
    doc.font('Helvetica').text(data.vendedor.razonSocial);
    doc.font('Helvetica-Bold').text('IBAN: ', { continued: true });
    doc.font('Helvetica').text(data.vendedor.iban ?? 'No disponible');
    if (data.vendedor.swiftBic) {
      doc.font('Helvetica-Bold').text('SWIFT/BIC: ', { continued: true });
      doc.font('Helvetica').text(data.vendedor.swiftBic);
    }
    doc.font('Helvetica-Bold').text('Régimen fiscal: ', { continued: true });
    doc.font('Helvetica').text(data.vendedor.regimenFiscalLabel);

    doc.moveDown(0.3);
    doc.fillColor(COLOR_MUTED).fontSize(9);
    doc.text(
      'EL COMPRADOR debe incluir la referencia del contrato en el concepto de la transferencia para que el ' +
      'pago sea identificado correctamente. El justificante de pago debe conservarse por ambas partes a ' +
      'efectos contables y fiscales.',
      { align: 'justify' },
    );
    doc.fillColor(COLOR_PRIMARY).fontSize(10);

    // ─── 5. ESTIPULACIONES (cláusulas legales numeradas) ─────────────────
    drawSectionHeader(doc, pageWidth, '5. Cláusulas legales');

    const clauses: Array<[string, string]> = [
      ['Conformidad de la mercancía',
        'EL COMPRADOR dispondrá de cuarenta y ocho (48) horas hábiles desde la recepción para inspeccionar ' +
        'la mercancía y notificar al VENDEDOR cualquier discrepancia respecto a las calidades pactadas. ' +
        'Transcurrido dicho plazo sin reclamación, se entenderá que la mercancía ha sido aceptada plenamente.'],
      ['Seguridad alimentaria',
        'EL VENDEDOR garantiza que la mercancía es apta para el consumo humano, ha sido producida y ' +
        'manipulada conforme a las normativas españolas y europeas de seguridad alimentaria vigentes en la ' +
        'fecha de entrega, y que dispone de toda la documentación trazable que pueda ser requerida por las ' +
        'autoridades sanitarias.'],
      ['Fuerza mayor',
        'Ninguna de las partes será responsable por el incumplimiento total o parcial de sus obligaciones ' +
        'cuando éste derive de un supuesto de fuerza mayor (catástrofes naturales, restricciones ' +
        'gubernamentales, pandemias, conflictos bélicos, huelgas generales), siempre que lo comunique a la ' +
        'otra parte por escrito dentro de los siete (7) días naturales siguientes a su acaecimiento.'],
      ['Resolución de controversias',
        'Cualquier controversia derivada del presente contrato se someterá en primera instancia al servicio ' +
        'de mediación gratuito ofrecido por Primar-IA. De no alcanzarse un acuerdo en el plazo de quince (15) ' +
        'días hábiles, las partes se someten expresamente a los Juzgados y Tribunales de Madrid capital, con ' +
        'renuncia explícita a cualquier otro fuero que pudiera corresponderles.'],
      ['Ley aplicable',
        'El presente contrato se rige por la legislación española vigente, en particular por el Código de ' +
        'Comercio, el Código Civil en lo que resulte de aplicación supletoria, y la Ley 12/2013, de 2 de ' +
        'agosto, de medidas para mejorar el funcionamiento de la cadena alimentaria.'],
      ['Protección de datos',
        'Los datos personales contenidos en el presente contrato serán tratados conforme al Reglamento ' +
        '(UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD). Primar-IA Technologies S.L. actúa como ' +
        'encargado del tratamiento con la única finalidad de facilitar la operación entre las partes y ' +
        'cumplir con sus obligaciones legales.'],
      ['Confidencialidad',
        'Las partes se obligan mutuamente a mantener la confidencialidad de cualquier información ' +
        'comercialmente sensible compartida durante la operación (listas de precios, márgenes, datos de ' +
        'producción) durante los dos (2) años siguientes a la firma del presente contrato.'],
      ['Integridad del contrato',
        'El presente documento constituye el acuerdo íntegro entre las partes sobre la operación descrita ' +
        'y sustituye cualquier comunicación, oferta o acuerdo anterior sobre el mismo objeto. Cualquier ' +
        'modificación posterior requerirá forma escrita firmada por ambas partes.'],
    ];

    doc.fontSize(10).fillColor(COLOR_PRIMARY);
    clauses.forEach(([titulo, cuerpo], i) => {
      // Page break safety: if there's not enough room for at least 4 lines,
      // start a new page.
      if (doc.y > pageHeight - 110) doc.addPage();
      doc.font('Helvetica-Bold').text(`5.${i + 1}. ${titulo}.`, { continued: false });
      doc.font('Helvetica').text(cuerpo, { align: 'justify' });
      doc.moveDown(0.3);
    });

    // ─── 6. FIRMAS ───────────────────────────────────────────────────────
    if (doc.y > pageHeight - 220) doc.addPage();
    drawSectionHeader(doc, pageWidth, '6. Firmas');
    doc.fontSize(9.5).fillColor(COLOR_MUTED);
    doc.text(
      'Las firmas digitales recogidas a continuación tienen plena validez legal en España conforme al ' +
      'Reglamento (UE) 910/2014 (eIDAS), artículo 25.1, y son trazables a través de la plataforma Primar-IA ' +
      'mediante la referencia indicada en este documento.',
      { align: 'justify' },
    );
    doc.moveDown(0.6);
    doc.fillColor(COLOR_PRIMARY);

    const signColW = (pageWidth - MARGIN * 2 - 24) / 2;
    const signY = doc.y;
    const writeSignBlock = (
      titulo: string,
      parte: ContractParty,
      firma: { firma: string | null; fecha: Date | null },
      x: number,
    ) => {
      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLOR_ACCENT)
        .text(titulo, x, signY, { width: signColW });
      doc.fontSize(8.5).font('Helvetica').fillColor(COLOR_MUTED);
      doc.text(`Por ${parte.razonSocial}`, x, signY + 14, { width: signColW });
      doc.text(`${parte.personaContactoLegal} · ${parte.cargoContactoLegal}`, x, signY + 25, { width: signColW });
      // Signature box.
      doc.rect(x, signY + 42, signColW, 56).strokeColor(COLOR_RULE).lineWidth(0.7).stroke();
      if (firma.firma && firma.fecha) {
        doc.fontSize(11).font('Helvetica-Oblique').fillColor(COLOR_ACCENT)
          .text(firma.firma.length > 32 ? firma.firma.slice(0, 32) + '…' : firma.firma, x + 8, signY + 54);
        doc.fontSize(7.5).fillColor(COLOR_MUTED).font('Helvetica');
        doc.text(
          `Firmado el ${fmtDate(firma.fecha)}\n${firma.fecha.toISOString()}`,
          x + 8, signY + 78,
          { width: signColW - 16 },
        );
      } else {
        doc.fontSize(10).fillColor(COLOR_MUTED).font('Helvetica-Oblique')
          .text('Pendiente de firma', x + 8, signY + 66, { width: signColW - 16 });
      }
    };
    writeSignBlock('EL VENDEDOR', data.vendedor, data.firmaVendedor, MARGIN);
    writeSignBlock('EL COMPRADOR', data.comprador, data.firmaComprador, MARGIN + signColW + 24);

    doc.y = signY + 110;
    doc.moveDown(0.4);
    doc.fontSize(8.5).font('Helvetica').fillColor(COLOR_MUTED);
    doc.text(
      'Y en prueba de conformidad con cuanto antecede, ambas partes suscriben el presente contrato a ' +
      'través de la plataforma digital Primar-IA, por duplicado y a un solo efecto, en el lugar y fecha ' +
      'indicados en el encabezamiento.',
      { align: 'justify' },
    );

    // ─── Footer en cada página ───────────────────────────────────────────
    // Iterate over all generated pages to write the footer.
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      doc.fontSize(7.5).font('Helvetica').fillColor(COLOR_MUTED);
      doc.text(
        `Primar-IA Technologies S.L. · Ref. ${data.reference} · ${data.esFinal ? 'VERSIÓN FINAL FIRMADA' : 'BORRADOR'} · Página ${i - range.start + 1} de ${range.count}`,
        MARGIN, pageHeight - MARGIN + 10,
        { width: pageWidth - MARGIN * 2, align: 'center' },
      );
    }

    doc.end();
  });
}
