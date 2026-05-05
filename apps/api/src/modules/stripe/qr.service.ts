import QRCode from 'qrcode';
import { prisma } from '@primaria/database';
import type { Transaccion } from '@primaria/database';
import { generarQRToken, verificarQRToken } from '@primaria/shared';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.middleware.js';

export class QRService {
  async generateQR(
    transaccionId: string,
    vendedorId: string,
  ): Promise<{ qrToken: string; qrDataUrl: string }> {
    const transaccion = await prisma.transaccion.findUnique({
      where: { id: transaccionId },
    });

    if (!transaccion) throw new AppError('Transacción no encontrada', 404);
    if (transaccion.vendedorId !== vendedorId) {
      throw new AppError('No autorizado para generar QR de esta transacción', 403);
    }
    if (transaccion.estado !== 'PAGO_CAPTURADO') {
      throw new AppError(
        `Solo se puede generar QR en estado PAGO_CAPTURADO. Estado actual: ${transaccion.estado}`,
        422,
      );
    }

    const { token } = generarQRToken(transaccionId, transaccion.compradorId, env.QR_HMAC_SECRET);

    // Generate QR image as data URL
    const qrDataUrl = await QRCode.toDataURL(token, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
    });

    // Persist token and transition state
    await prisma.transaccion.update({
      where: { id: transaccionId },
      data: {
        qrToken: token,
        estado: 'EN_TRANSITO',
      },
    });

    return { qrToken: token, qrDataUrl };
  }

  async verifyQR(token: string, compradorId: string): Promise<Transaccion> {
    const transaccion = await prisma.transaccion.findFirst({
      where: { qrToken: token },
    });

    if (!transaccion) throw new AppError('QR token no encontrado', 404);
    if (transaccion.compradorId !== compradorId) {
      throw new AppError('Este QR no pertenece a tu transacción', 403);
    }

    const result = verificarQRToken(token, env.QR_HMAC_SECRET);
    if (!result.valid) {
      throw new AppError('QR token inválido o expirado', 400);
    }

    // Atomic check-and-set: only one concurrent request can succeed
    const updateResult = await prisma.transaccion.updateMany({
      where: { id: transaccion.id, qrUsado: false },
      data: {
        qrUsado: true,
        qrFechaUso: new Date(),
        estado: 'ENTREGADO',
      },
    });

    if (updateResult.count === 0) {
      throw new AppError('Este QR ya ha sido utilizado', 409);
    }

    // Return the updated record
    const updated = await prisma.transaccion.findUnique({
      where: { id: transaccion.id },
    });

    return updated!;
  }
}

export const qrService = new QRService();
