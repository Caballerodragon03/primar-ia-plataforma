#!/usr/bin/env node
/**
 * Reset operational data — keeps Users + Empresas + Productos/Variedades +
 * configuración estructural. Borra todo lo operacional (lotes, pedidos,
 * matches, transacciones, mensajes, valoraciones, contratos…) y rellena
 * con placeholders los campos fiscales que falten en Empresa.
 *
 * Resetea contadores de User (transaccionesOk, transaccionesIncid,
 * ratingMedio, numValoraciones, scoreFiabilidad) a 0/null/NEW_USER, vacía
 * preferenciasIncoterm y deja al usuario "como nuevo" para operar de
 * cero pero conservando su cuenta + auth.
 *
 * Uso:
 *   DATABASE_URL=... node scripts/reset-operational-data.mjs
 *   (o con --dry-run para ver el plan sin tocar nada)
 */
import { PrismaClient } from '@primaria/database';

const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry-run');

const log = (...args) => console.log(DRY ? '[DRY]' : '[RUN]', ...args);

async function countAll() {
  const [
    lotes, pedidos, matches, transacciones, mensajes, negociaciones, valoraciones,
    disputas, disputaMensajes, scoreEvents, bypassAlerts, cancelaciones,
    pendingRefunds, cronRuns, invoiceCounters, auditoria, certificados,
    historialCosechas, users, empresas,
  ] = await Promise.all([
    prisma.lote.count(), prisma.pedido.count(), prisma.match.count(),
    prisma.transaccion.count(), prisma.mensaje.count(), prisma.negociacion.count(),
    prisma.valoracion.count(), prisma.disputa.count(), prisma.disputaMensaje.count(),
    prisma.scoreEvent.count(), prisma.bypassAlert.count(),
    prisma.cancelacionSospechosa.count(), prisma.pendingRefund.count(),
    prisma.cronRun.count(), prisma.invoiceCounter.count(),
    prisma.auditoria.count(), prisma.certificado.count(),
    prisma.historialCosecha.count(),
    prisma.user.count(), prisma.empresa.count(),
  ]);
  return {
    lotes, pedidos, matches, transacciones, mensajes, negociaciones, valoraciones,
    disputas, disputaMensajes, scoreEvents, bypassAlerts, cancelaciones,
    pendingRefunds, cronRuns, invoiceCounters, auditoria, certificados,
    historialCosechas, users, empresas,
  };
}

// ─── Placeholder fillers ────────────────────────────────────────────────────

// Spanish IBAN format: ES + 22 dígitos. Generador deterministic per userId hash.
function placeholderIBAN(userId) {
  const hash = Array.from(userId).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const ds = String(hash).padStart(10, '0').slice(-10);
  return `ES${String(hash % 100).padStart(2, '0')}0049${ds}1234567890`.slice(0, 24);
}

const REGIMENES = ['GENERAL', 'AGRARIO', 'RECARGO_EQUIVALENCIA', 'EXENTO'];

async function fillMissingEmpresaData() {
  const empresas = await prisma.empresa.findMany({
    select: {
      id: true, userId: true, razonSocial: true, cifNif: true,
      formaJuridica: true, direccionFiscal: true, ciudad: true,
      codigoPostal: true, pais: true, personaContactoLegal: true,
      cargoContactoLegal: true, iban: true, regimenFiscal: true,
    },
  });
  log(`Inspecting ${empresas.length} empresas para campos faltantes…`);

  let touched = 0;
  for (const e of empresas) {
    const patch = {};
    if (!e.iban) patch.iban = placeholderIBAN(e.userId);
    // regimenFiscal tiene default GENERAL así que siempre tiene valor; pero
    // si por algún motivo es null/vacío, lo seteamos. (Defensive)
    if (!e.regimenFiscal) patch.regimenFiscal = 'GENERAL';
    // formaJuridica suele faltar en vendedores legacy → "Sociedad Limitada"
    if (!e.formaJuridica) patch.formaJuridica = 'Sociedad Limitada';
    if (!e.ciudad) patch.ciudad = 'Valencia';
    if (!e.codigoPostal) patch.codigoPostal = '46001';
    // Todos los demás campos son required (no-null en schema); los dejamos.
    if (Object.keys(patch).length === 0) continue;
    touched += 1;
    log(`  · Empresa ${e.razonSocial} (${e.cifNif}) → fills:`, Object.keys(patch).join(', '));
    if (!DRY) {
      await prisma.empresa.update({ where: { id: e.id }, data: patch });
    }
  }
  log(`Empresas con campos rellenados: ${touched} / ${empresas.length}`);
}

async function resetUserCounters() {
  const users = await prisma.user.findMany({ select: { id: true, role: true } });
  log(`Resetting counters for ${users.length} users…`);
  if (!DRY) {
    await prisma.user.updateMany({
      data: {
        transaccionesOk: 0,
        transaccionesIncid: 0,
        ratingMedio: null,
        numValoraciones: 0,
        scoreFiabilidad: null,
        scoreStatus: 'NEW_USER',
        creditosCreacion: 3,
        proximaRegeneracionCredito: null,
        loginAttempts: 0,
        lockedUntil: null,
        // Mantiene preferenciasIncoterm (config útil para el siguiente lote).
      },
    });
  }
}

async function deleteOperationalData() {
  // Orden de borrado respetando foreign keys: hijos primero.
  const steps = [
    { name: 'DisputaMensaje', fn: () => prisma.disputaMensaje.deleteMany({}) },
    { name: 'Disputa', fn: () => prisma.disputa.deleteMany({}) },
    { name: 'Valoracion', fn: () => prisma.valoracion.deleteMany({}) },
    { name: 'BypassAlert', fn: () => prisma.bypassAlert.deleteMany({}) },
    { name: 'Mensaje', fn: () => prisma.mensaje.deleteMany({}) },
    { name: 'Negociacion', fn: () => prisma.negociacion.deleteMany({}) },
    { name: 'PendingRefund', fn: () => prisma.pendingRefund.deleteMany({}) },
    { name: 'Transaccion', fn: () => prisma.transaccion.deleteMany({}) },
    { name: 'Match', fn: () => prisma.match.deleteMany({}) },
    { name: 'CancelacionSospechosa', fn: () => prisma.cancelacionSospechosa.deleteMany({}) },
    { name: 'Pedido', fn: () => prisma.pedido.deleteMany({}) },
    { name: 'Lote', fn: () => prisma.lote.deleteMany({}) },
    { name: 'HistorialCosecha', fn: () => prisma.historialCosecha.deleteMany({}) },
    { name: 'ScoreEvent', fn: () => prisma.scoreEvent.deleteMany({}) },
    { name: 'Auditoria', fn: () => prisma.auditoria.deleteMany({}) },
    // Counters/observabilidad
    { name: 'InvoiceCounter', fn: () => prisma.invoiceCounter.deleteMany({}) },
    { name: 'CronRun', fn: () => prisma.cronRun.deleteMany({}) },
    // NOTA: NO borramos Certificado (los certificados subidos siguen siendo
    // del usuario; si quieres también borrar, descomenta la siguiente línea).
    // { name: 'Certificado', fn: () => prisma.certificado.deleteMany({}) },
  ];

  for (const step of steps) {
    if (DRY) {
      log(`Would delete all from ${step.name}`);
      continue;
    }
    const r = await step.fn();
    log(`Deleted ${r.count} rows from ${step.name}`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Primar-IA — reset operational data${DRY ? ' (DRY RUN)' : ''}`);
  console.log('═══════════════════════════════════════════════════════════');

  console.log('\nBEFORE:');
  console.log(await countAll());

  console.log('\n→ Step 1: completar datos fiscales en Empresa');
  await fillMissingEmpresaData();

  console.log('\n→ Step 2: borrar datos operacionales');
  await deleteOperationalData();

  console.log('\n→ Step 3: resetear contadores de User');
  await resetUserCounters();

  console.log('\nAFTER:');
  console.log(await countAll());

  console.log('\n✓ Reset completado.');
  console.log('  Lo conservado: users + empresas + certificados +');
  console.log('                 productos + variedades + suscripciones +');
  console.log('                 banned_entries + bug_reports + market_reports +');
  console.log('                 datos_mercado + refresh/email tokens.');
  console.log('  Lo borrado:    lotes, pedidos, matches, transacciones, mensajes,');
  console.log('                 negociaciones, valoraciones, disputas, alertas,');
  console.log('                 cancelaciones, refunds, contadores facturas, cron runs.');
}

main()
  .catch((err) => {
    console.error('FAIL:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
