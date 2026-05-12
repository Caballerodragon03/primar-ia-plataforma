import cron from 'node-cron';
import { prisma } from '@primaria/database';
import { sendCertExpiryEmail } from '../shared/emails/transactional.js';

// ─── Job 1: Certificate expiry alerts — daily at 08:00 ───────────────────────

async function checkCertificateExpiry(): Promise<void> {
  const now = new Date();
  console.log('[CRON] Certificate expiry check started');

  try {
    // Mark expired certs as CADUCADO
    await prisma.certificado.updateMany({
      where: {
        estado: 'VERIFICADO',
        fechaCaducidad: { lt: now },
      },
      data: { estado: 'CADUCADO' },
    });

    // Fetch verified certs not yet expired, with user info
    const certs = await prisma.certificado.findMany({
      where: {
        estado: 'VERIFICADO',
        fechaCaducidad: { gte: now },
      },
      include: {
        user: { select: { email: true, nombre: true } },
      },
    });

    for (const cert of certs) {
      const msRemaining = cert.fechaCaducidad.getTime() - now.getTime();
      const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

      const certNombre = cert.numeroCertificado;
      const emailData = {
        certNombre,
        diasRestantes: daysRemaining,
        fechaCaducidad: cert.fechaCaducidad,
      };

      if (daysRemaining <= 7 && !cert.alerta7Enviada) {
        try {
          await sendCertExpiryEmail(cert.user.email, cert.user.nombre, emailData);
        } catch (emailErr) {
          console.error(`[CRON] Failed to send 7-day cert alert for ${cert.id}:`, emailErr);
        }
        await prisma.certificado.update({
          where: { id: cert.id },
          data: { alerta7Enviada: true },
        });
      } else if (daysRemaining <= 15 && !cert.alerta15Enviada) {
        try {
          await sendCertExpiryEmail(cert.user.email, cert.user.nombre, emailData);
        } catch (emailErr) {
          console.error(`[CRON] Failed to send 15-day cert alert for ${cert.id}:`, emailErr);
        }
        await prisma.certificado.update({
          where: { id: cert.id },
          data: { alerta15Enviada: true },
        });
      } else if (daysRemaining <= 30 && !cert.alerta30Enviada) {
        try {
          await sendCertExpiryEmail(cert.user.email, cert.user.nombre, emailData);
        } catch (emailErr) {
          console.error(`[CRON] Failed to send 30-day cert alert for ${cert.id}:`, emailErr);
        }
        await prisma.certificado.update({
          where: { id: cert.id },
          data: { alerta30Enviada: true },
        });
      } else if (daysRemaining <= 60 && !cert.alerta60Enviada) {
        try {
          await sendCertExpiryEmail(cert.user.email, cert.user.nombre, emailData);
        } catch (emailErr) {
          console.error(`[CRON] Failed to send 60-day cert alert for ${cert.id}:`, emailErr);
        }
        await prisma.certificado.update({
          where: { id: cert.id },
          data: { alerta60Enviada: true },
        });
      }
    }

    console.log(`[CRON] Certificate expiry check done — processed ${certs.length} certs`);
  } catch (err) {
    console.error('[CRON] Certificate expiry check failed:', err);
  }
}

// ─── Job 2: Clean expired tokens — daily at 02:00 ────────────────────────────

async function cleanExpiredTokens(): Promise<void> {
  console.log('[CRON] Token cleanup started');
  const now = new Date();

  try {
    const [deletedRefresh, deletedEmail] = await Promise.all([
      prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      prisma.emailToken.deleteMany({
        where: {
          expiresAt: { lt: now },
          usedAt: { not: null },
        },
      }),
    ]);

    console.log(
      `[CRON] Token cleanup done — removed ${deletedRefresh.count} refresh tokens, ${deletedEmail.count} email tokens`,
    );
  } catch (err) {
    console.error('[CRON] Token cleanup failed:', err);
  }
}

// ─── Job 3: Market data stub — weekly on Monday at 06:00 ─────────────────────

async function runMarketDataJob(): Promise<void> {
  console.log('[CRON] Weekly market report — generating from mapa.gob.es boletín…');
  const { marketService } = await import('../modules/market/market.service.js');
  const result = await marketService.generateWeeklyReport();
  console.log('[CRON] Market report job result:', result);
}

// ─── Register all cron jobs ───────────────────────────────────────────────────

export function startCronJobs(): void {
  // Daily at 08:00 — certificate expiry alerts
  cron.schedule('0 8 * * *', () => {
    void checkCertificateExpiry();
  });

  // Daily at 02:00 — clean expired tokens
  cron.schedule('0 2 * * *', () => {
    void cleanExpiredTokens();
  });

  // Weekly on Monday at 07:00 Madrid time — generate market sentiment report
  cron.schedule('0 7 * * 1', () => {
    void runMarketDataJob();
  }, { timezone: 'Europe/Madrid' });

  console.log('[CRON] All cron jobs registered');
}
