/**
 * Phase 5 — PDF renderer for the 3 v2 invoice/receipt documents.
 *
 * Single function — branches on `data.titulo` for the "Resguardo de pago"
 * variant (different financial section, no tax rows). Uses pdfkit, same
 * style/colors as contract-pdf.ts to keep the visual identity consistent.
 */
import PDFDocument from 'pdfkit';
import type { InvoiceV2, InvoiceLine } from './invoice-v2-data.js';

// Same palette as contract-pdf.ts for visual consistency.
const COLOR_PRIMARY = '#1a1a2e';
const COLOR_ACCENT = '#3d3d5c';
const COLOR_MUTED = '#666';
const COLOR_RULE = '#dcdcd0';
const COLOR_HIGHLIGHT = '#E1C44D'; // Primar-IA brand yellow

function fmtEur(n: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
  }).format(n);
}

function fmtKg(n: number): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(n);
}

export function generateInvoicePdf(data: InvoiceV2): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const margin = 48;
    const contentWidth = pageWidth - margin * 2;
    const isReceipt = data.titulo.toLowerCase().startsWith('resguardo');

    // ─── Header ───────────────────────────────────────────────────────────
    // Primar-IA badge (top-left).
    doc.roundedRect(margin, margin, 76, 22, 4).fillAndStroke(COLOR_HIGHLIGHT, COLOR_HIGHLIGHT);
    doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(11)
      .text('Primar-IA', margin + 8, margin + 6, { width: 60 });

    doc.fontSize(22).font('Helvetica-Bold').fillColor(COLOR_PRIMARY)
      .text(data.titulo, margin + 90, margin + 2);
    doc.fontSize(10).fillColor(COLOR_MUTED).font('Helvetica')
      .text(data.subtitulo, margin + 90, margin + 28);

    // Invoice number + date (top-right).
    doc.fontSize(9).fillColor(COLOR_MUTED).font('Helvetica');
    doc.text(`Nº: ${data.numero}`, margin, margin + 2, { width: contentWidth, align: 'right' });
    doc.text(`Fecha: ${data.fecha}`, margin, margin + 16, { width: contentWidth, align: 'right' });

    doc.moveDown(2.5);
    doc.strokeColor(COLOR_RULE).lineWidth(1)
      .moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
    doc.moveDown(0.6);

    // ─── Parties (2 columns) ──────────────────────────────────────────────
    const colW = (contentWidth - 24) / 2;
    const partiesY = doc.y;
    const writeParty = (
      title: string,
      party: InvoiceV2['emisor'],
      extras: { label: string; value: string }[] | undefined,
      x: number,
    ) => {
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLOR_MUTED)
        .text(title.toUpperCase(), x, partiesY, { width: colW });
      doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR_PRIMARY)
        .text(party.razonSocial, x, doc.y, { width: colW });
      doc.font('Helvetica').fontSize(9).fillColor(COLOR_ACCENT);
      doc.text(`CIF/NIF: ${party.cifNif}`, x, doc.y, { width: colW });
      doc.text(party.direccionFiscal, x, doc.y, { width: colW });
      doc.text(
        [party.codigoPostal, party.ciudad].filter(Boolean).join(' ') + (party.pais ? `, ${party.pais}` : ''),
        x, doc.y, { width: colW },
      );
      if (extras && extras.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(8).fillColor(COLOR_MUTED);
        for (const e of extras) {
          doc.font('Helvetica-Bold').text(e.label + ' ', x, doc.y, { continued: true, width: colW });
          doc.font('Helvetica').text(e.value, { width: colW });
        }
      }
      return doc.y;
    };
    const leftY = writeParty('Emisor', data.emisor, data.emisorExtras, margin);
    const partiesYStart = partiesY;
    doc.y = partiesYStart; // reset to draw the right column at the same start
    const rightY = writeParty('Cliente', data.receptor, data.receptorExtras, margin + colW + 24);
    doc.y = Math.max(leftY, rightY) + 14;

    doc.strokeColor(COLOR_RULE).lineWidth(1)
      .moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
    doc.moveDown(0.5);

    // ─── Line items table ─────────────────────────────────────────────────
    drawLineTable(doc, data.lineas, margin, contentWidth);
    doc.moveDown(0.6);

    // ─── Totals block (right-aligned) ─────────────────────────────────────
    if (isReceipt) {
      drawReceiptTotals(doc, data, margin, contentWidth);
    } else {
      drawInvoiceTotals(doc, data, margin, contentWidth);
    }

    doc.moveDown(1.0);

    // ─── Payment block ────────────────────────────────────────────────────
    drawPaymentBlock(doc, data, margin, contentWidth);

    // ─── Notes ────────────────────────────────────────────────────────────
    if (data.notas.length > 0) {
      doc.moveDown(0.6);
      doc.strokeColor(COLOR_RULE).lineWidth(0.5)
        .moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).font('Helvetica').fillColor(COLOR_MUTED);
      for (const n of data.notas) {
        doc.text(`• ${n}`, margin, doc.y, { width: contentWidth });
        doc.moveDown(0.15);
      }
    }

    // ─── Footer ───────────────────────────────────────────────────────────
    const footerY = doc.page.height - margin - 14;
    doc.fontSize(7).fillColor(COLOR_MUTED).font('Helvetica');
    doc.text(
      'Documento generado automáticamente por Primar-IA. '
      + 'Para cualquier duda, contacta a facturacion@primar-ia.com.',
      margin, footerY, { width: contentWidth, align: 'center' },
    );

    doc.end();
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function drawLineTable(
  doc: PDFKit.PDFDocument,
  lines: InvoiceLine[],
  margin: number,
  contentWidth: number,
): void {
  const colDesc = margin;
  const colQty = margin + contentWidth * 0.58;
  const colPrice = margin + contentWidth * 0.76;
  const colTotal = margin + contentWidth * 0.88;
  const colWDesc = contentWidth * 0.56;
  const colW = contentWidth * 0.12;

  // Header row.
  doc.rect(margin, doc.y, contentWidth, 18).fill('#f5f5f0');
  doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(8);
  const hy = doc.y - 13;
  doc.text('DESCRIPCIÓN', colDesc + 6, hy, { width: colWDesc });
  doc.text('CANTIDAD', colQty, hy, { width: colW, align: 'right' });
  doc.text('PRECIO UNIT.', colPrice, hy, { width: colW, align: 'right' });
  doc.text('TOTAL', colTotal, hy, { width: colW, align: 'right' });
  doc.moveDown(0.25);

  doc.font('Helvetica').fontSize(9).fillColor(COLOR_ACCENT);
  for (const l of lines) {
    const rowY = doc.y;
    doc.text(l.descripcion, colDesc + 6, rowY, { width: colWDesc });
    const rowEndY = doc.y;
    doc.text(`${fmtKg(l.cantidad)} ${l.unidad}`, colQty, rowY, { width: colW, align: 'right' });
    doc.text(fmtEur(l.precioUnitario), colPrice, rowY, { width: colW, align: 'right' });
    doc.text(fmtEur(l.total), colTotal, rowY, { width: colW, align: 'right' });
    doc.y = rowEndY + 2;
    doc.strokeColor(COLOR_RULE).lineWidth(0.5)
      .moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).stroke();
    doc.moveDown(0.2);
  }
}

function drawInvoiceTotals(
  doc: PDFKit.PDFDocument,
  data: InvoiceV2,
  margin: number,
  contentWidth: number,
): void {
  const labelX = margin + contentWidth * 0.6;
  const valueX = margin + contentWidth * 0.85;
  const w = contentWidth * 0.13;

  const writeRow = (label: string, value: string, bold = false, big = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(big ? 11 : 9)
      .fillColor(bold ? COLOR_PRIMARY : COLOR_ACCENT);
    doc.text(label, labelX, doc.y, { width: contentWidth * 0.22, align: 'right' });
    const prevY = doc.y;
    doc.text(value, valueX, prevY - (big ? 11 : 9) * 1.3, { width: w, align: 'right' });
    doc.moveDown(0.2);
  };

  writeRow('Base imponible:', fmtEur(data.impuestos.base));
  if (data.impuestos.ivaPct > 0) {
    writeRow(`IVA (${data.impuestos.ivaPct.toFixed(2)}%):`, fmtEur(data.impuestos.ivaImporte));
  }
  if (data.impuestos.recargoImporte) {
    writeRow(`Recargo equivalencia (${data.impuestos.recargoPct?.toFixed(2)}%):`, fmtEur(data.impuestos.recargoImporte));
  }
  if (data.impuestos.irpfImporte) {
    writeRow(`Retención IRPF (${data.impuestos.irpfPct?.toFixed(2)}%):`, `- ${fmtEur(data.impuestos.irpfImporte)}`);
  }

  doc.moveDown(0.2);
  doc.strokeColor(COLOR_PRIMARY).lineWidth(1.2)
    .moveTo(labelX, doc.y).lineTo(margin + contentWidth, doc.y).stroke();
  doc.moveDown(0.3);
  writeRow('TOTAL:', fmtEur(data.impuestos.total), true, true);

  if (data.impuestos.exencionNota) {
    doc.moveDown(0.4);
    doc.fontSize(7.5).fillColor(COLOR_MUTED).font('Helvetica-Oblique')
      .text(data.impuestos.exencionNota, margin, doc.y, { width: contentWidth });
  }
}

function drawReceiptTotals(
  doc: PDFKit.PDFDocument,
  data: InvoiceV2,
  margin: number,
  contentWidth: number,
): void {
  doc.moveDown(0.3);
  doc.rect(margin, doc.y, contentWidth, 28).fillAndStroke('#fffbf0', COLOR_HIGHLIGHT);
  doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(14)
    .text(`Importe a transferir: ${fmtEur(data.impuestos.total)}`, margin + 12, doc.y - 23, {
      width: contentWidth - 24, align: 'center',
    });
  doc.moveDown(0.5);
  if (data.impuestos.exencionNota) {
    doc.fontSize(7.5).fillColor(COLOR_MUTED).font('Helvetica-Oblique')
      .text(data.impuestos.exencionNota, margin, doc.y, { width: contentWidth });
  }
}

function drawPaymentBlock(
  doc: PDFKit.PDFDocument,
  data: InvoiceV2,
  margin: number,
  contentWidth: number,
): void {
  doc.fontSize(9).font('Helvetica-Bold').fillColor(COLOR_MUTED)
    .text('INSTRUCCIONES DE PAGO', margin, doc.y, { width: contentWidth });
  doc.moveDown(0.3);
  doc.fontSize(9).font('Helvetica').fillColor(COLOR_ACCENT);

  const writeKV = (k: string, v: string | null | undefined) => {
    if (!v) return;
    doc.font('Helvetica-Bold').text(k + ' ', margin, doc.y, { continued: true });
    doc.font('Helvetica').text(v);
  };
  writeKV('Método:', data.pago.metodo);
  writeKV('Referencia:', data.pago.referencia);
  if (data.pago.titular) writeKV('Beneficiario:', data.pago.titular);
  if (data.pago.iban) writeKV('IBAN:', data.pago.iban);
  if (data.pago.swiftBic) writeKV('SWIFT/BIC:', data.pago.swiftBic);
  if (data.pago.fechaVencimiento) writeKV('Vencimiento:', data.pago.fechaVencimiento);
  if (data.pago.notas) {
    doc.moveDown(0.2);
    doc.fontSize(8).fillColor(COLOR_MUTED).font('Helvetica-Oblique')
      .text(data.pago.notas, margin, doc.y, { width: contentWidth });
  }
}
