/**
 * Pure PDF generator: takes a fully-built ContractData and produces a Buffer.
 * Used for both draft (with watermark) and final (without).
 *
 * Implementation notes:
 *   - Uses pdfkit (already a dependency)
 *   - Watermark is applied on EVERY page via the `pageAdded` event listener,
 *     so dynamic content that overflows still gets stamped.
 *   - Spanish legal contract structure: Partes → Objeto → Precio → Logística →
 *     Pago → Cláusulas → Firmas.
 *   - All money values formatted with es-ES locale (€).
 */
import PDFDocument from 'pdfkit';
import type { ContractData, ContractParty } from './contract-data.js';

const COLOR_PRIMARY = '#1a1a1a';
const COLOR_MUTED = '#666666';
const COLOR_WATERMARK = '#e11d48';
const COLOR_ACCENT = '#0B2E33';
const COLOR_RULE = '#cccccc';

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

interface WatermarkOpts {
  pageWidth: number;
  pageHeight: number;
}

function drawWatermarkOnPage(doc: PDFKit.PDFDocument, { pageWidth, pageHeight }: WatermarkOpts): void {
  // Diagonal stamp covering the page so it can't be cropped out or hidden
  // behind another element accidentally.
  doc.save();
  doc.fillColor(COLOR_WATERMARK).fillOpacity(0.10);
  doc.fontSize(58).font('Helvetica-Bold');

  // Rotate around page centre by -30 degrees.
  const cx = pageWidth / 2;
  const cy = pageHeight / 2;
  doc.rotate(-30, { origin: [cx, cy] });
  doc.text('DOCUMENTO NO VÁLIDO', 0, cy - 30, {
    width: pageWidth,
    align: 'center',
  });
  doc.fontSize(18).text(
    'Sin firma + pago de comisión a Primar-IA',
    0, cy + 40,
    { width: pageWidth, align: 'center' },
  );
  doc.restore();
}

/**
 * Generate the contract PDF. The function returns a Promise<Buffer> rather
 * than a Stream because callers either upload to R2 (needs buffer) or send
 * a Buffer back via res.send (which is easier than piping streams).
 */
export function generateContractPdf(data: ContractData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Apply watermark on EVERY page (current + future) when draft.
    if (!data.esFinal) {
      drawWatermarkOnPage(doc, { pageWidth, pageHeight });
      doc.on('pageAdded', () => {
        drawWatermarkOnPage(doc, { pageWidth, pageHeight });
      });
    }

    // ─── Header ──────────────────────────────────────────────────────────────
    doc.fontSize(18).font('Helvetica-Bold').fillColor(COLOR_PRIMARY)
      .text('CONTRATO DE COMPRAVENTA MERCANTIL', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').fillColor(COLOR_MUTED)
      .text('Marketplace agroalimentario Primar-IA', { align: 'center' });
    doc.moveDown(0.8);

    // Reference + date
    const refY = doc.y;
    doc.fontSize(9).fillColor(COLOR_MUTED).font('Helvetica');
    doc.text(`Referencia: ${data.reference}`, 56, refY);
    doc.text(`Fecha de generación: ${fmtDate(data.fechaGeneracion)}`, 56, refY + 13);
    if (!data.esFinal) {
      doc.fillColor(COLOR_WATERMARK).font('Helvetica-Bold');
      doc.text(
        'ESTE DOCUMENTO ES UN BORRADOR. No tiene validez legal hasta que el comprador haya pagado la comisión a Primar-IA y ambas partes hayan firmado digitalmente.',
        56, refY + 30, { width: pageWidth - 112 },
      );
      doc.fillColor(COLOR_PRIMARY).font('Helvetica');
    }
    doc.moveDown(2.2);
    doc.strokeColor(COLOR_RULE).moveTo(56, doc.y).lineTo(pageWidth - 56, doc.y).stroke();
    doc.moveDown(0.6);

    // ─── Sección 1 — Partes contratantes ─────────────────────────────────────
    doc.fontSize(12).font('Helvetica-Bold').fillColor(COLOR_ACCENT)
      .text('1. PARTES CONTRATANTES');
    doc.moveDown(0.4);

    // Two columns: VENDEDOR / COMPRADOR
    const colW = (pageWidth - 112 - 16) / 2;
    const colStartY = doc.y;
    const writeParty = (
      titulo: string,
      parte: ContractData['vendedor'] | ContractData['comprador'],
      x: number,
      includeIban: boolean,
    ) => {
      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLOR_PRIMARY).text(titulo, x, colStartY);
      doc.font('Helvetica').fontSize(9);
      let y = doc.y;
      const writeLine = (label: string, value: string | null) => {
        if (!value) return;
        doc.font('Helvetica-Bold').text(label + ' ', x, y, { continued: true, width: colW });
        doc.font('Helvetica').text(value, { width: colW });
        y = doc.y;
      };
      writeLine('Razón social:', parte.razonSocial);
      writeLine('CIF/NIF:', parte.cifNif);
      if (parte.formaJuridica) writeLine('Forma jurídica:', parte.formaJuridica);
      writeLine('Dirección fiscal:', parte.direccionFiscal);
      writeLine('Ciudad / CP:', [parte.codigoPostal, parte.ciudad].filter(Boolean).join(' '));
      writeLine('País:', parte.pais);
      writeLine('Contacto:', `${parte.personaContactoLegal} (${parte.cargoContactoLegal})`);
      writeLine('Email:', parte.email);
      if (parte.telefono) writeLine('Teléfono:', parte.telefono);
      if (includeIban && 'iban' in parte && parte.iban) {
        writeLine('IBAN:', parte.iban);
        if (parte.swiftBic) writeLine('SWIFT/BIC:', parte.swiftBic);
        writeLine('Régimen fiscal:', parte.regimenFiscalLabel);
      }
      return y;
    };

    const lhsEnd = writeParty('VENDEDOR', data.vendedor, 56, true);
    const rhsEnd = writeParty('COMPRADOR', data.comprador, 56 + colW + 16, false);
    doc.y = Math.max(lhsEnd, rhsEnd) + 10;

    // ─── Sección 2 — Objeto del contrato ─────────────────────────────────────
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(COLOR_ACCENT)
      .text('2. OBJETO DEL CONTRATO', 56);
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').fillColor(COLOR_PRIMARY);
    doc.text(`Producto: ${data.productoNombre}${data.variedadNombre ? ' — ' + data.variedadNombre : ''}`);

    // Tabla de calibres
    doc.moveDown(0.5);
    const tableX = 56;
    const tableY = doc.y;
    const colCalibreW = 100;
    const colCantW = 110;
    const colPrecioW = 110;
    const colSubtotalW = pageWidth - 112 - colCalibreW - colCantW - colPrecioW;

    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR_MUTED);
    doc.text('CALIBRE', tableX, tableY, { width: colCalibreW });
    doc.text('CANTIDAD (kg)', tableX + colCalibreW, tableY, { width: colCantW, align: 'right' });
    doc.text('PRECIO €/kg', tableX + colCalibreW + colCantW, tableY, { width: colPrecioW, align: 'right' });
    doc.text('SUBTOTAL', tableX + colCalibreW + colCantW + colPrecioW, tableY, { width: colSubtotalW, align: 'right' });
    doc.moveDown(0.2);
    doc.strokeColor(COLOR_RULE).moveTo(tableX, doc.y).lineTo(pageWidth - 56, doc.y).stroke();
    doc.moveDown(0.2);

    doc.font('Helvetica').fontSize(9).fillColor(COLOR_PRIMARY);
    for (const c of data.calibres) {
      const rowY = doc.y;
      doc.text(c.calibre, tableX, rowY, { width: colCalibreW });
      doc.text(fmtKg(c.cantidadKg), tableX + colCalibreW, rowY, { width: colCantW, align: 'right' });
      doc.text(fmtEur(c.precioKg), tableX + colCalibreW + colCantW, rowY, { width: colPrecioW, align: 'right' });
      doc.text(fmtEur(c.subtotal), tableX + colCalibreW + colCantW + colPrecioW, rowY, { width: colSubtotalW, align: 'right' });
      doc.moveDown(0.3);
    }
    doc.strokeColor(COLOR_RULE).moveTo(tableX, doc.y).lineTo(pageWidth - 56, doc.y).stroke();
    doc.moveDown(0.2);
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('TOTAL MERCANCÍA', tableX, doc.y, { width: colCalibreW + colCantW + colPrecioW });
    doc.text(fmtEur(data.precioTotalMercancia), tableX + colCalibreW + colCantW + colPrecioW, doc.y - 12, {
      width: colSubtotalW, align: 'right',
    });
    doc.moveDown(0.6);
    doc.font('Helvetica').fontSize(9).fillColor(COLOR_MUTED);
    doc.text(`Cantidad total: ${fmtKg(data.cantidadTotalKg)}`);

    // ─── Sección 3 — Comisión Primar-IA (informativa) ────────────────────────
    doc.moveDown(0.8);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(COLOR_ACCENT).text('3. COMISIÓN PRIMAR-IA');
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').fillColor(COLOR_PRIMARY);
    doc.text(
      `La plataforma Primar-IA cobra al COMPRADOR una comisión de ${fmtEur(data.comision.importe)} ` +
      `(${fmtPct(data.comision.porcentajeFinal)} sobre el precio total de la mercancía) + IVA (21%) = ` +
      `${fmtEur(data.comision.totalConIva)} total. Notas: ${data.comision.notas}. ` +
      `Esta comisión se cobra de forma independiente y es condición necesaria para la validez de este contrato.`,
      { align: 'justify' },
    );

    // ─── Sección 4 — Logística e incoterm ────────────────────────────────────
    doc.moveDown(0.8);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(COLOR_ACCENT).text('4. ENTREGA Y LOGÍSTICA');
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').fillColor(COLOR_PRIMARY);
    const writeKV = (label: string, value: string) => {
      doc.font('Helvetica-Bold').text(label + ' ', { continued: true });
      doc.font('Helvetica').text(value);
    };
    writeKV('Modalidad logística:', data.logisticaLabel);
    writeKV('Incoterm acordado:', `${data.incoterm} — ${data.incotermDescripcion}`);
    writeKV('Dirección de origen:', data.origenDireccion);
    if (data.destinoDireccion) writeKV('Dirección de destino:', data.destinoDireccion);
    writeKV('Fecha de entrega prevista:', fmtDate(data.fechaEntrega));

    // ─── Sección 5 — Términos de pago + datos bancarios ──────────────────────
    doc.moveDown(0.8);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(COLOR_ACCENT).text('5. CONDICIONES DE PAGO');
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').fillColor(COLOR_PRIMARY);
    writeKV('Término de pago:', data.terminoPagoLabel +
      (data.diasVencimiento > 0 ? ` (desde la fecha de entrega)` : ' (al confirmar la operación)'));
    writeKV('Fecha límite de pago:', fmtDate(data.fechaVencimientoPagoVendedor));
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica-Bold').text('Datos bancarios del vendedor:');
    doc.fontSize(9).font('Helvetica');
    writeKV('IBAN:', data.vendedor.iban ?? 'N/D');
    if (data.vendedor.swiftBic) writeKV('SWIFT/BIC:', data.vendedor.swiftBic);
    writeKV('Régimen fiscal:', data.vendedor.regimenFiscalLabel);
    doc.fontSize(8).fillColor(COLOR_MUTED).moveDown(0.3);
    doc.text(
      'El comprador transferirá el importe total de la mercancía directamente al IBAN indicado, ' +
      'dentro del plazo acordado. La factura del vendedor se emite y descarga desde la plataforma Primar-IA.',
      { align: 'justify' },
    );

    // ─── Sección 6 — Cláusulas legales ───────────────────────────────────────
    doc.moveDown(0.8);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(COLOR_ACCENT).text('6. CLÁUSULAS LEGALES');
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').fillColor(COLOR_PRIMARY);
    const clauses = [
      '6.1. CONFORMIDAD DE LA MERCANCÍA. El COMPRADOR dispondrá de 48 horas hábiles desde la recepción para inspeccionar la mercancía y notificar cualquier discrepancia respecto a las calidades pactadas. Pasado dicho plazo se entenderá aceptada.',
      '6.2. CONSERVACIÓN. El VENDEDOR garantiza que la mercancía es apta para el consumo humano y cumple con las normativas españolas y europeas de seguridad alimentaria vigentes en la fecha de entrega.',
      '6.3. FUERZA MAYOR. Ninguna parte será responsable por incumplimientos derivados de fuerza mayor (catástrofes naturales, restricciones gubernamentales, conflictos bélicos) si lo notifica en un plazo máximo de 7 días.',
      '6.4. RESOLUCIÓN DE CONTROVERSIAS. Las partes se someten en primera instancia al servicio de mediación de Primar-IA. En caso de no alcanzar acuerdo, se someten a los Juzgados y Tribunales de Madrid capital, con renuncia expresa a cualquier otro fuero.',
      '6.5. LEY APLICABLE. El presente contrato se rige por la legislación española vigente, en particular el Código de Comercio y la Ley 12/2013 de medidas para mejorar el funcionamiento de la cadena alimentaria.',
      '6.6. PROTECCIÓN DE DATOS. Los datos personales contenidos en este contrato se tratan conforme al RGPD y la LOPDGDD. Primar-IA actúa como encargado del tratamiento.',
      '6.7. FACTURACIÓN. El vendedor emitirá factura al comprador conforme a su régimen fiscal declarado. Primar-IA emitirá factura separada al comprador por sus servicios de intermediación.',
    ];
    for (const cl of clauses) {
      doc.text(cl, { align: 'justify' });
      doc.moveDown(0.2);
    }

    // ─── Sección 7 — Firmas ──────────────────────────────────────────────────
    // Force a new page if not enough room for signatures.
    if (doc.y > pageHeight - 220) doc.addPage();
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(COLOR_ACCENT).text('7. FIRMAS DIGITALES');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').fillColor(COLOR_PRIMARY);
    doc.text(
      'Las firmas digitales recogidas a continuación tienen plena validez legal en España conforme al Reglamento (UE) 910/2014 (eIDAS) artículo 25.1.',
      { align: 'justify' },
    );
    doc.moveDown(0.6);

    const signColW = (pageWidth - 112 - 16) / 2;
    const signY = doc.y;
    const writeSignBlock = (titulo: string, parte: ContractParty, firma: { firma: string | null; fecha: Date | null }, x: number) => {
      doc.fontSize(10).font('Helvetica-Bold').text(titulo, x, signY, { width: signColW });
      doc.fontSize(8).font('Helvetica').fillColor(COLOR_MUTED);
      doc.text(`Por ${parte.razonSocial}`, x, signY + 14, { width: signColW });
      doc.text(`${parte.personaContactoLegal} — ${parte.cargoContactoLegal}`, x, signY + 24, { width: signColW });
      // Signature box (visual placeholder)
      doc.rect(x, signY + 42, signColW, 50).strokeColor(COLOR_RULE).stroke();
      if (firma.firma && firma.fecha) {
        doc.fontSize(10).font('Helvetica-Oblique').fillColor(COLOR_ACCENT)
          .text(firma.firma.length > 30 ? firma.firma.slice(0, 30) + '…' : firma.firma, x + 6, signY + 50);
        doc.fontSize(7).fillColor(COLOR_MUTED).font('Helvetica');
        doc.text(`Firmado: ${fmtDate(firma.fecha)} · ${firma.fecha.toISOString()}`, x + 6, signY + 75);
      } else {
        doc.fontSize(9).fillColor(COLOR_MUTED).font('Helvetica-Oblique')
          .text('Pendiente de firma', x + 6, signY + 62, { width: signColW - 12 });
      }
    };
    writeSignBlock('VENDEDOR', data.vendedor, data.firmaVendedor, 56);
    writeSignBlock('COMPRADOR', data.comprador, data.firmaComprador, 56 + signColW + 16);

    // Footer
    doc.fontSize(7).fillColor(COLOR_MUTED).font('Helvetica');
    doc.text(
      `Contrato generado por Primar-IA Technologies S.L. · Referencia ${data.reference} · ${data.esFinal ? 'VERSIÓN FINAL FIRMADA' : 'BORRADOR'}`,
      56, pageHeight - 50,
      { width: pageWidth - 112, align: 'center' },
    );

    doc.end();
  });
}
