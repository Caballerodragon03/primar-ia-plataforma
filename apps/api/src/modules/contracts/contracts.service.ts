import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { prisma } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';
import { generarQRToken } from '@primaria/shared';
import { env } from '../../config/env.js';

export class ContractsService {
  async getContractInfo(transaccionId: string, userId: string) {
    const tx = await prisma.transaccion.findUnique({
      where: { id: transaccionId },
      include: {
        match: {
          include: {
            lote: { include: { producto: true, variedad: true } },
            pedido: { include: { producto: true, variedad: true } },
          },
        },
        vendedor: { include: { empresa: true } },
        comprador: { include: { empresa: true } },
      },
    });
    if (!tx) throw new AppError('Transacción no encontrada', 404);
    if (tx.vendedorId !== userId && tx.compradorId !== userId) {
      throw new AppError('No autorizado', 403);
    }

    const hasRated = await prisma.valoracion.count({
      where: { transaccionId, autorId: userId },
    }).then((n) => n > 0);

    const lote = tx.match.lote;
    const pedido = tx.match.pedido;
    return {
      transaccionId: tx.id,
      estado: tx.estado,
      producto: lote.producto?.nombre ?? pedido.producto?.nombre ?? 'N/D',
      variedad: lote.variedad?.nombre ?? pedido.variedad?.nombre ?? null,
      calibres: tx.match.calibresJson,
      cantidadKg: Number(tx.cantidadKg),
      precioKg: Number(tx.match.precioKg),
      precioTotal: Number(tx.precioTotal),
      comision: Number(tx.comisionPlataforma),
      incoterm: pedido.incoterm,
      destinoFinal: pedido.destinoFinal,
      vendedor: {
        nombre: `${tx.vendedor.nombre} ${tx.vendedor.apellidos}`,
        empresa: tx.vendedor.empresa?.razonSocial ?? null,
        cif: tx.vendedor.empresa?.cifNif ?? null,
        direccion: tx.vendedor.empresa?.direccionFiscal ?? null,
      },
      comprador: {
        nombre: `${tx.comprador.nombre} ${tx.comprador.apellidos}`,
        empresa: tx.comprador.empresa?.razonSocial ?? null,
        cif: tx.comprador.empresa?.cifNif ?? null,
        direccion: tx.comprador.empresa?.direccionFiscal ?? null,
      },
      firmaComprador: tx.firmaComprador ?? null,
      firmaCompradorFecha: tx.firmaCompradorFecha?.toISOString() ?? null,
      firmaVendedor: tx.firmaVendedor ?? null,
      firmaVendedorFecha: tx.firmaVendedorFecha?.toISOString() ?? null,
      qrToken: tx.qrToken ?? null,
      qrUsado: tx.qrUsado,
      hasRated,
      fotosLoteUrls: tx.fotosLoteUrls ?? [],
      vendedorId: tx.vendedorId,
      compradorId: tx.compradorId,
    };
  }

  async signContract(transaccionId: string, userId: string, signatureData: string) {
    const tx = await prisma.transaccion.findUnique({
      where: { id: transaccionId },
      select: {
        vendedorId: true,
        compradorId: true,
        firmaComprador: true,
        firmaVendedor: true,
        estado: true,
      },
    });
    if (!tx) throw new AppError('Transacción no encontrada', 404);
    if (tx.vendedorId !== userId && tx.compradorId !== userId) {
      throw new AppError('No autorizado', 403);
    }

    const isBuyer = tx.compradorId === userId;
    const isSeller = tx.vendedorId === userId;

    if (isBuyer) {
      if (tx.firmaComprador) throw new AppError('El comprador ya ha firmado este contrato', 400);
      await prisma.transaccion.update({
        where: { id: transaccionId },
        data: { firmaComprador: signatureData, firmaCompradorFecha: new Date() },
      });
    } else if (isSeller) {
      if (!tx.firmaComprador) throw new AppError('El comprador debe firmar primero', 400);
      if (tx.firmaVendedor) throw new AppError('El vendedor ya ha firmado este contrato', 400);
      await prisma.transaccion.update({
        where: { id: transaccionId },
        data: { firmaVendedor: signatureData, firmaVendedorFecha: new Date() },
      });
    }

    // After both sign, generate QR code
    const updated = await prisma.transaccion.findUnique({
      where: { id: transaccionId },
      select: { firmaComprador: true, firmaVendedor: true, qrToken: true, compradorId: true },
    });

    if (updated?.firmaComprador && updated?.firmaVendedor && !updated?.qrToken) {
      const { token } = generarQRToken(transaccionId, updated.compradorId, env.QR_HMAC_SECRET);
      await prisma.transaccion.update({
        where: { id: transaccionId },
        data: { qrToken: token },
      });
      return { signed: true, bothSigned: true, qrGenerated: true };
    }

    return { signed: true, bothSigned: !!(updated?.firmaComprador && updated?.firmaVendedor), qrGenerated: false };
  }

  async uploadLotPhotos(transaccionId: string, vendedorId: string, photoUrls: string[]) {
    const tx = await prisma.transaccion.findUnique({
      where: { id: transaccionId },
      select: { vendedorId: true, firmaVendedor: true, firmaComprador: true },
    });
    if (!tx) throw new AppError('Transacción no encontrada', 404);
    if (tx.vendedorId !== vendedorId) throw new AppError('No autorizado', 403);
    if (!tx.firmaComprador || !tx.firmaVendedor) {
      throw new AppError('Ambas partes deben firmar el contrato antes de subir fotos', 400);
    }

    await prisma.transaccion.update({
      where: { id: transaccionId },
      data: { fotosLoteUrls: photoUrls },
    });

    // Auto-send a chat message to the buyer with the photos
    const photoCount = photoUrls.length;
    const messageContent = `📸 ${photoCount} lot preparation photo${photoCount > 1 ? 's' : ''} uploaded. The shipment is being prepared.`;
    await prisma.mensaje.create({
      data: {
        transaccionId,
        remitenteId: vendedorId,
        contenido: messageContent,
        tipo: 'IMAGEN',
        archivoUrl: photoUrls[0] ?? null,
      },
    });

    return { uploaded: true };
  }

  async confirmDelivery(transaccionId: string, compradorId: string, qrToken: string) {
    const tx = await prisma.transaccion.findUnique({
      where: { id: transaccionId },
      select: { compradorId: true, qrToken: true, qrUsado: true, estado: true },
    });
    if (!tx) throw new AppError('Transacción no encontrada', 404);
    if (tx.compradorId !== compradorId) throw new AppError('No autorizado', 403);
    if (tx.qrUsado) throw new AppError('El código QR ya fue utilizado', 400);
    if (!tx.qrToken) throw new AppError('No hay código QR generado para esta transacción', 400);

    if (tx.qrToken.length !== qrToken.length || !crypto.timingSafeEqual(Buffer.from(tx.qrToken), Buffer.from(qrToken))) {
      throw new AppError('Código QR inválido', 400);
    }

    await prisma.transaccion.update({
      where: { id: transaccionId },
      data: {
        qrUsado: true,
        qrFechaUso: new Date(),
        estado: 'ENTREGADO',
      },
    });

    return { confirmed: true };
  }

  async generateContract(transaccionId: string, userId: string): Promise<Buffer> {
    const tx = await prisma.transaccion.findUnique({
      where: { id: transaccionId },
      include: {
        match: {
          include: {
            lote: { include: { producto: true, variedad: true } },
            pedido: { include: { producto: true, variedad: true } },
          },
        },
        vendedor: { include: { empresa: true } },
        comprador: { include: { empresa: true } },
      },
    });

    if (!tx) throw new AppError('Transacción no encontrada', 404);
    if (tx.vendedorId !== userId && tx.compradorId !== userId) {
      throw new AppError('No autorizado para acceder a este contrato', 403);
    }

    const vendedorEmpresa = tx.vendedor.empresa;
    const compradorEmpresa = tx.comprador.empresa;
    const lote = tx.match.lote;
    const pedido = tx.match.pedido;
    const cantidadKg = Number(tx.cantidadKg);
    const precioTotal = Number(tx.precioTotal);
    const comision = Number(tx.comisionPlataforma);
    const precioKg = Number(tx.match.precioKg);
    const calibres = JSON.stringify(tx.match.calibresJson);
    const fecha = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 60, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).font('Helvetica-Bold').text('CONTRATO DE COMPRAVENTA AGRÍCOLA — Primar-IA', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(`Fecha: ${fecha}`, { align: 'center' });
      doc.fontSize(9).fillColor('#666666').text(`Referencia: ${transaccionId}`, { align: 'center' });
      doc.fillColor('#000000').moveDown(1.5);
      doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke();
      doc.moveDown(1);

      doc.fontSize(12).font('Helvetica-Bold').text('1. PARTES CONTRATANTES');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica-Bold').text('VENDEDOR:');
      doc.font('Helvetica').text(
        vendedorEmpresa
          ? `${vendedorEmpresa.razonSocial} — CIF/NIF: ${vendedorEmpresa.cifNif}\nDirección: ${vendedorEmpresa.direccionFiscal}`
          : `${tx.vendedor.nombre} ${tx.vendedor.apellidos}`,
      );
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('COMPRADOR:');
      doc.font('Helvetica').text(
        compradorEmpresa
          ? `${compradorEmpresa.razonSocial} — CIF/NIF: ${compradorEmpresa.cifNif}\nDirección: ${compradorEmpresa.direccionFiscal}`
          : `${tx.comprador.nombre} ${tx.comprador.apellidos}`,
      );
      doc.moveDown(1.5);

      doc.fontSize(12).font('Helvetica-Bold').text('2. OBJETO DEL CONTRATO');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Producto: ${lote.producto?.nombre ?? 'N/D'}`);
      doc.text(`Variedad: ${lote.variedad?.nombre ?? 'N/D'}`);
      doc.text(`Calibres: ${calibres}`);
      doc.text(`Cantidad: ${cantidadKg.toFixed(2)} kg`);
      doc.text(`Precio por kg: ${precioKg.toFixed(4)} EUR/kg`);
      doc.moveDown(1.5);

      doc.fontSize(12).font('Helvetica-Bold').text('3. CONDICIONES ECONÓMICAS');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Importe base: ${precioTotal.toFixed(2)} EUR`);
      doc.text(`Comisión plataforma: ${comision.toFixed(2)} EUR`);
      doc.text(`Total a pagar (comprador): ${(precioTotal + comision).toFixed(2)} EUR`);
      doc.moveDown(1.5);

      doc.fontSize(12).font('Helvetica-Bold').text('4. TÉRMINOS DE ENTREGA');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Incoterm: ${pedido.incoterm}`);
      if (pedido.destinoFinal) doc.text(`Destino final: ${pedido.destinoFinal}`);
      doc.moveDown(1.5);

      doc.fontSize(12).font('Helvetica-Bold').text('5. CLÁUSULA DE PAGO');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(
        'El importe ha sido pre-autorizado en Stripe mediante PaymentIntent con captura manual. ' +
        'El cargo efectivo se realizará una vez confirmada la entrega de la mercancía mediante ' +
        'el sistema de verificación QR de Primar-IA.',
      );
      doc.moveDown(1.5);

      // Signatures section
      doc.fontSize(12).font('Helvetica-Bold').text('6. FIRMAS DIGITALES');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      if (tx.firmaComprador) {
        doc.text(`Comprador firmado: ${tx.firmaCompradorFecha?.toLocaleDateString('es-ES') ?? 'Sí'}`);
        doc.text(`Firma digital: ${tx.firmaComprador.substring(0, 40)}...`);
      } else {
        doc.text('Comprador: Pendiente de firma');
      }
      doc.moveDown(0.3);
      if (tx.firmaVendedor) {
        doc.text(`Vendedor firmado: ${tx.firmaVendedorFecha?.toLocaleDateString('es-ES') ?? 'Sí'}`);
        doc.text(`Firma digital: ${tx.firmaVendedor.substring(0, 40)}...`);
      } else {
        doc.text('Vendedor: Pendiente de firma');
      }
      doc.moveDown(1.5);

      doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor('#444444').text(
        'Este contrato es válido según legislación española vigente. Generado automáticamente por la plataforma Primar-IA.',
        { align: 'center' },
      );

      doc.end();
    });
  }

  async getContractStream(transaccionId: string, userId: string): Promise<{ buffer: Buffer; filename: string }> {
    const buffer = await this.generateContract(transaccionId, userId);
    return { buffer, filename: `contrato-${transaccionId}.pdf` };
  }
}

export const contractsService = new ContractsService();
