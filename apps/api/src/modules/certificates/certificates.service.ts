import { prisma } from '@primaria/database';
import { createHash } from 'crypto';
import { AppError } from '../../middleware/error.middleware.js';
import { SubscriptionService } from '../subscriptions/subscription.service.js';

const subscriptionService = new SubscriptionService();

export class CertificatesService {
  async listByUser(userId: string) {
    return prisma.certificado.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        numeroCertificado: true,
        estado: true,
        fechaCaducidad: true,
        archivoUrl: true,
        createdAt: true,
      },
    });
  }

  async create(
    userId: string,
    data: { tipo: string; archivoUrl: string; fileBuffer?: Buffer },
  ) {
    const { limits } = await subscriptionService.getLimitsForUser(userId);
    if ('maxCertificados' in limits) {
      const count = await prisma.certificado.count({ where: { userId } });
      if (count >= limits.maxCertificados) {
        throw new AppError(
          `Has alcanzado el límite de ${limits.maxCertificados} certificados en tu plan. Mejora tu plan para subir más.`,
          403,
        );
      }
    }

    const hash = data.fileBuffer
      ? createHash('sha256').update(data.fileBuffer).digest('hex')
      : createHash('sha256').update(data.archivoUrl).digest('hex');

    return prisma.certificado.create({
      data: {
        userId,
        numeroCertificado: data.tipo,
        fechaEmision: new Date(),
        fechaCaducidad: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        archivoUrl: data.archivoUrl,
        archivoHashSha256: hash,
        estado: 'PENDIENTE',
      },
    });
  }

  async delete(userId: string, certId: string) {
    const cert = await prisma.certificado.findUnique({ where: { id: certId } });
    if (!cert) throw new AppError('Certificado no encontrado', 404);
    if (cert.userId !== userId) throw new AppError('No autorizado', 403);
    if (cert.estado === 'VERIFICADO') {
      throw new AppError('No se puede eliminar un certificado verificado', 400);
    }
    await prisma.certificado.delete({ where: { id: certId } });
  }
}

export const certificatesService = new CertificatesService();
