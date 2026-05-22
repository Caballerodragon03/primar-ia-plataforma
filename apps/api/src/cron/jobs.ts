import cron from 'node-cron';
import { prisma, Prisma } from '@primaria/database';
import { sendCertExpiryEmail } from '../shared/emails/transactional.js';

/**
 * Phase 13 — Health-tracking wrapper for cron jobs.
 *
 * Wraps each cron function so its last execution (success | failure +
 * payload) gets persisted in the CronRun table. /admin/cron-status reads
 * this for an at-a-glance view of all jobs.
 */
async function trackCron(jobName: string, run: () => Promise<unknown | void>): Promise<void> {
  const startedAt = new Date();
  let status = 'success';
  let result: unknown = null;
  try {
    result = (await run()) ?? null;
  } catch (err) {
    status = 'failure';
    result = { error: err instanceof Error ? err.message : String(err) };
  }
  const resultJson = (result === null ? Prisma.JsonNull : (result as Prisma.InputJsonValue));
  try {
    await prisma.cronRun.upsert({
      where: { jobName },
      create: {
        jobName,
        status,
        result: resultJson,
        startedAt,
        finishedAt: new Date(),
      },
      update: {
        status,
        result: resultJson,
        startedAt,
        finishedAt: new Date(),
      },
    });
  } catch (e) {
    console.error(`[CRON][${jobName}] health-track upsert failed:`, e);
  }
}

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

// ─── Job 4: Expire contracts where seller signed but buyer didn't pay ──────

/**
 * Phase 4 — Look for matches in PENDIENTE_PAGO_COMPRADOR whose
 * firmaVendedorDeadline has passed. Mark them as CADUCADO and clear the
 * seller's signature (so they can re-sign if they want to give the buyer
 * another shot). Runs hourly — granularity is plenty for a 48h window.
 */
async function expireSellerSignatures(): Promise<void> {
  const { prisma } = await import('@primaria/database');
  const now = new Date();
  const expired = await prisma.match.findMany({
    where: {
      contratoEstado: 'PENDIENTE_PAGO_COMPRADOR',
      firmaVendedorDeadline: { lte: now },
    },
    select: {
      id: true,
      transaccion: { select: { id: true } },
      // Phase 12 — needed for the expiry email
      lote: {
        select: {
          producto: { select: { nombre: true } },
          vendedor: { select: { email: true, nombre: true } },
        },
      },
    },
  });
  if (expired.length === 0) return;
  console.log(`[CRON] Expiring ${expired.length} seller signatures past deadline`);
  for (const m of expired) {
    try {
      await prisma.$transaction([
        prisma.match.update({
          where: { id: m.id },
          data: { contratoEstado: 'CADUCADO' },
        }),
        // Clear seller signature so a fresh sign-flow can be initiated.
        ...(m.transaccion ? [
          prisma.transaccion.update({
            where: { id: m.transaccion.id },
            data: { firmaVendedor: null, firmaVendedorFecha: null },
          }),
        ] : []),
      ]);
      // Phase 12 — notify the seller so they don't have to discover it via
      // the dashboard. Fire-and-forget per-match — if email fails for one,
      // others still get notified.
      try {
        const { sendContractExpiredEmail } = await import('../shared/emails/transactional.js');
        await sendContractExpiredEmail(
          m.lote.vendedor.email,
          m.lote.vendedor.nombre,
          { matchId: m.id, productoNombre: m.lote.producto?.nombre ?? 'tu operación' },
        );
      } catch (emailErr) {
        console.error('[CRON] expiry email failed for match', m.id, emailErr);
      }
    } catch (err) {
      console.error('[CRON] Failed to expire match', m.id, err);
    }
  }
}

// ─── Job 5: AI bypass scanner (Phase 8) — daily at 09:00 Madrid ─────────────

/**
 * Daily Gemini-powered scan of last 24h of chat messages, flagging subtle
 * bypass attempts the regex heuristic misses. Creates BypassAlert rows for
 * the admin Risks tab. Idempotent via unique index on mensajeId.
 */
async function runBypassScannerJob(): Promise<void> {
  console.log('[CRON] Bypass scan started');
  try {
    const { runBypassScan } = await import('../modules/bypass/bypass-scanner.service.js');
    const r = await runBypassScan();
    console.log(
      `[CRON] Bypass scan done — scanned=${r.scanned} flagged=${r.flagged} alreadyAlerted=${r.alreadyAlerted} errors=${r.errors}`,
    );
  } catch (err) {
    console.error('[CRON] Bypass scan failed:', err);
  }
}

// ─── Register all cron jobs ───────────────────────────────────────────────────

export function startCronJobs(): void {
  // All schedules go through trackCron so /admin/cron-status sees the
  // latest run + result for every job.

  // Daily at 08:00 — certificate expiry alerts
  cron.schedule('0 8 * * *', () => {
    void trackCron('certificateExpiry', () => checkCertificateExpiry());
  });

  // Daily at 02:00 — clean expired tokens
  cron.schedule('0 2 * * *', () => {
    void trackCron('cleanExpiredTokens', () => cleanExpiredTokens());
  });

  // Daily at 07:30 Madrid — generate market sentiment report. Switched from
  // weekly (Mondays) to daily because Railway redeploys mid-week kill the
  // node-cron in-process scheduler, dropping the once-a-week trigger. Daily
  // runs are safe: generateWeeklyReport is idempotent — if a report already
  // exists for the current ISO week it returns { generated: false, reason:
  // 'Already exists' } and we just record that in CronRun. As a bonus this
  // also catches up when MAPA publishes the weekly boletín a few days late.
  cron.schedule('30 7 * * *', () => {
    void trackCron('weeklyMarketReport', () => runMarketDataJob());
  }, { timezone: 'Europe/Madrid' });

  // Catch-up on boot: deploys land at unpredictable times, so if today's
  // scheduled run already passed (or this week's report is still missing
  // entirely) we kick off a generation attempt in the background. The
  // function is idempotent — duplicate runs short-circuit cheaply.
  void trackCron('weeklyMarketReport', () => runMarketDataJob());

  // Hourly — expire seller signatures past their 48-business-hours deadline.
  // Phase 11: explicit Madrid TZ keeps the comparison consistent with
  // `addBusinessHours`/`businessHoursUntil` (which assume Mon-Fri business
  // hours in local time) and avoids DST off-by-one drift on the container.
  cron.schedule('5 * * * *', () => {
    void trackCron('expireSellerSignatures', () => expireSellerSignatures());
  }, { timezone: 'Europe/Madrid' });

  // Daily at 09:00 Madrid — AI bypass scanner reviews chat from last 24h.
  cron.schedule('0 9 * * *', () => {
    void trackCron('bypassScan', () => runBypassScannerJob());
  }, { timezone: 'Europe/Madrid' });

  console.log('[CRON] All cron jobs registered');
}
