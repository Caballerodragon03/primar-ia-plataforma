import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';
import { generarQRToken, addBusinessHours } from '@primaria/shared';
import { env } from '../../config/env.js';
import { getR2 } from '../../shared/r2.js';
import { buildContractData } from './contract-data.js';
import { generateContractPdf } from './contract-pdf.js';

const SELLER_SIGN_DEADLINE_BUSINESS_HOURS = 48;

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

  // ─── Phase 3 — Match-level contract draft + final ───────────────────────

  /**
   * Upload a PDF buffer to R2 under contracts/{matchId}/{filename}.
   * Returns the public URL. If R2 is not configured (dev/test), returns a
   * placeholder URL so the rest of the flow still works.
   */
  private async uploadContractToR2(matchId: string, filename: string, buffer: Buffer): Promise<string> {
    const r2Configured = env.R2_ACCOUNT_ID !== 'placeholder' && env.R2_ACCESS_KEY_ID !== 'placeholder';
    if (!r2Configured) {
      // Without R2 we still return a URL so frontend wiring works; the file
      // simply isn't reachable until R2 is configured. The DEV WARNING is
      // logged to make this obvious.
      console.warn('[contracts] R2 not configured — contract not persisted. Configure R2_* env vars.');
      return `https://uploads.primar-ia.com/contracts/${matchId}/${filename}`;
    }
    const key = `contracts/${matchId}/${filename}`;
    await getR2().send(new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
      // Force download instead of inline preview — same defence in depth
      // we applied to user-uploaded files.
      ContentDisposition: `attachment; filename="${filename}"`,
    }));
    return `${env.R2_PUBLIC_URL}/${key}`;
  }

  /**
   * Generates the DRAFT contract (with NO VÁLIDO watermark on every page),
   * uploads to R2, stores the URL on match.contratoBorradorUrl + sets the
   * estado to PENDIENTE_FIRMA_VENDEDOR. Snapshot the commission amount.
   *
   * Idempotent: if a draft already exists for this match, returns the
   * existing URL.
   */
  async generateContractDraft(matchId: string): Promise<{ url: string; reference: string }> {
    const existing = await prisma.match.findUnique({
      where: { id: matchId },
      select: { contratoBorradorUrl: true, contratoEstado: true },
    });
    if (!existing) throw new AppError('Match no encontrado', 404);
    // If already past borrador, do not regenerate — would invalidate previous signatures.
    if (existing.contratoBorradorUrl && existing.contratoEstado !== 'BORRADOR' && existing.contratoEstado !== 'PENDIENTE_FIRMA_VENDEDOR') {
      return { url: existing.contratoBorradorUrl, reference: '' };
    }

    const data = await buildContractData(matchId, { esFinal: false });
    const buffer = await generateContractPdf(data);
    const filename = `borrador-${Date.now()}.pdf`;
    const url = await this.uploadContractToR2(matchId, filename, buffer);

    await prisma.match.update({
      where: { id: matchId },
      data: {
        contratoBorradorUrl: url,
        contratoEstado: 'PENDIENTE_FIRMA_VENDEDOR',
        comisionEstimada: data.comision.importe,
        comisionPorcentaje: data.comision.porcentajeFinal,
      },
    });

    return { url, reference: data.reference };
  }

  /**
   * Generates the FINAL contract (no watermark) AFTER both parties have
   * signed and the buyer has paid the commission. Stores the URL on
   * transaccion.contratoPdfUrl (existing field) AND match.contratoEstado='FIRMADO'.
   */
  async generateContractFinal(matchId: string): Promise<{ url: string; reference: string }> {
    const data = await buildContractData(matchId, { esFinal: true });

    // Hard requirement: both signatures must be present + commission paid.
    if (!data.firmaVendedor.firma || !data.firmaComprador.firma) {
      throw new AppError('El contrato final requiere las firmas de ambas partes', 400);
    }
    const txCheck = await prisma.transaccion.findUnique({
      where: { matchId },
      select: { comisionPagadaEn: true, id: true },
    });
    if (!txCheck?.comisionPagadaEn) {
      throw new AppError('El contrato final requiere que la comisión haya sido pagada', 400);
    }

    const buffer = await generateContractPdf(data);
    const filename = `contrato-final.pdf`;
    const url = await this.uploadContractToR2(matchId, filename, buffer);

    await prisma.match.update({
      where: { id: matchId },
      data: { contratoEstado: 'FIRMADO' },
    });
    if (txCheck.id) {
      await prisma.transaccion.update({
        where: { id: txCheck.id },
        data: { contratoPdfUrl: url },
      });
    }
    return { url, reference: data.reference };
  }

  /**
   * Returns the contract PDF buffer for either party of the match.
   * Used by the download endpoint — checks ownership and chooses draft vs
   * final based on contratoEstado.
   */
  /**
   * The seller signs the contract. This MUST happen before the buyer pays
   * the commission — by design (per product spec). After signing:
   *   - estado moves to PENDIENTE_PAGO_COMPRADOR
   *   - firmaVendedorDeadline = now + 48 business hours
   *   - cron expires the signature if buyer doesn't pay within window
   *
   * The signature is stored on the Transaccion (one is auto-created if
   * none exists, with estado=PENDIENTE_PAGO). We DO NOT yet create the
   * Transaccion at match acceptance (Phase 3 wires it into contributeToOrder
   * but only saves the comision snapshot). The first time a seller signs,
   * we make sure the Transaccion exists.
   */
  async signMatchContractAsSeller(
    matchId: string,
    userId: string,
    signatureData: string,
    ipAddress: string | null,
  ): Promise<{ deadline: Date; contratoEstado: string }> {
    return prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: {
          lote: { select: { vendedorId: true } },
          pedido: { select: { compradorId: true } },
          transaccion: true,
        },
      });
      if (!match) throw new AppError('Match no encontrado', 404);
      if (match.lote.vendedorId !== userId) {
        throw new AppError('Sólo el vendedor puede firmar primero', 403);
      }
      if (match.contratoEstado === 'FIRMADO') {
        throw new AppError('El contrato ya está firmado por ambas partes', 400);
      }
      if (match.contratoEstado === 'CADUCADO' || match.contratoEstado === 'CANCELADO') {
        throw new AppError('El contrato ha caducado o ha sido cancelado. Pide al comprador renegociar.', 400);
      }
      if (match.contratoEstado === 'PENDIENTE_PAGO_COMPRADOR') {
        throw new AppError('Ya has firmado este contrato. Estamos esperando al pago del comprador.', 400);
      }
      // Allow signing from BORRADOR or PENDIENTE_FIRMA_VENDEDOR.

      // Ensure Transaccion exists (Phase 3 auto-creates it in contributeToOrder
      // via matching.service, but defensively create here if missing).
      let txRecord = match.transaccion;
      if (!txRecord) {
        const cantidadKg = Number(match.cantidadKg);
        const precioKg = Number(match.precioKg);
        const precioTotal = cantidadKg * precioKg;
        txRecord = await tx.transaccion.create({
          data: {
            matchId,
            vendedorId: match.lote.vendedorId,
            compradorId: match.pedido.compradorId,
            cantidadKg,
            precioTotal,
            comisionPlataforma: Number(match.comisionEstimada ?? 0),
            comisionPorcentaje: Number(match.comisionPorcentaje ?? 0),
            estado: 'PENDIENTE_PAGO',
          },
        });
      }

      // Store seller signature + audit data. We append the IP to the signature
      // string so the audit trail is part of the firma itself (it's persisted
      // as text — eIDAS Article 25.1 accepts this minimum-evidence model).
      const signatureWithAudit = `${signatureData.trim()} [IP:${ipAddress ?? 'unknown'}]`;
      const signedAt = new Date();
      const deadline = addBusinessHours(signedAt, SELLER_SIGN_DEADLINE_BUSINESS_HOURS);

      await tx.transaccion.update({
        where: { id: txRecord.id },
        data: {
          firmaVendedor: signatureWithAudit,
          firmaVendedorFecha: signedAt,
        },
      });
      await tx.match.update({
        where: { id: matchId },
        data: {
          contratoEstado: 'PENDIENTE_PAGO_COMPRADOR',
          firmaVendedorDeadline: deadline,
        },
      });

      return { deadline, contratoEstado: 'PENDIENTE_PAGO_COMPRADOR' };
    }, { isolationLevel: 'Serializable' });
  }

  /**
   * The buyer's signature step. Called from the Stripe webhook AFTER the
   * commission payment has been confirmed. Atomic with the commission
   * marker — either both happen or neither.
   *
   * Verifies the deadline hasn't passed; if it has, throws and the webhook
   * marks the payment for refund elsewhere.
   */
  async signMatchContractAsBuyerAfterPayment(
    matchId: string,
    signatureData: string,
    ipAddress: string | null,
    stripeChargeId: string,
  ): Promise<{ contractFinalUrl: string | null }> {
    const result = await prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: { transaccion: true, lote: { select: { vendedorId: true } }, pedido: { select: { compradorId: true } } },
      });
      if (!match) throw new AppError('Match no encontrado', 404);
      if (match.contratoEstado === 'FIRMADO') {
        // Idempotent — webhook may fire twice.
        return { alreadyFinalized: true };
      }
      if (match.contratoEstado !== 'PENDIENTE_PAGO_COMPRADOR') {
        throw new AppError(`Contrato en estado incompatible: ${match.contratoEstado}`, 400);
      }
      if (match.firmaVendedorDeadline && match.firmaVendedorDeadline.getTime() < Date.now()) {
        // Caducó — el webhook que llama esto debe disparar refund.
        await tx.match.update({
          where: { id: matchId },
          data: { contratoEstado: 'CADUCADO' },
        });
        throw new AppError('El plazo de firma del vendedor ha caducado. La comisión será reembolsada.', 410);
      }
      if (!match.transaccion) {
        throw new AppError('No existe transacción para este match', 500);
      }

      const signedAt = new Date();
      const signatureWithAudit = `${signatureData.trim()} [IP:${ipAddress ?? 'unknown'}]`;

      await tx.transaccion.update({
        where: { id: match.transaccion.id },
        data: {
          firmaComprador: signatureWithAudit,
          firmaCompradorFecha: signedAt,
          comisionPagadaEn: signedAt,
          comisionStripeChargeId: stripeChargeId,
        },
      });
      await tx.match.update({
        where: { id: matchId },
        data: { contratoEstado: 'FIRMADO' },
      });
      return { alreadyFinalized: false };
    }, { isolationLevel: 'Serializable' });

    if (result.alreadyFinalized) {
      // Look up the existing URL
      const tx = await prisma.transaccion.findUnique({
        where: { matchId },
        select: { contratoPdfUrl: true },
      });
      return { contractFinalUrl: tx?.contratoPdfUrl ?? null };
    }

    // Generate the FINAL contract PDF (no watermark) outside the tx — PDF
    // generation is heavy and we don't want to extend the Serializable lock.
    try {
      const result = await this.generateContractFinal(matchId);
      return { contractFinalUrl: result.url };
    } catch (err) {
      console.error('[contracts] generateContractFinal failed after buyer sign:', err);
      return { contractFinalUrl: null };
    }
  }

  async getContractBufferForMatch(matchId: string, userId: string): Promise<{ buffer: Buffer; filename: string }> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        contratoEstado: true,
        lote: { select: { vendedorId: true } },
        pedido: { select: { compradorId: true } },
      },
    });
    if (!match) throw new AppError('Match no encontrado', 404);
    if (match.lote.vendedorId !== userId && match.pedido.compradorId !== userId) {
      throw new AppError('No autorizado para acceder a este contrato', 403);
    }

    const esFinal = match.contratoEstado === 'FIRMADO';
    const data = await buildContractData(matchId, { esFinal });
    const buffer = await generateContractPdf(data);
    return {
      buffer,
      filename: esFinal ? `contrato-final-${matchId.slice(-6)}.pdf` : `contrato-borrador-${matchId.slice(-6)}.pdf`,
    };
  }
}

export const contractsService = new ContractsService();
