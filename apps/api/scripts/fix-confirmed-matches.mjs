#!/usr/bin/env node
/**
 * Phase 14M v3.18 — One-off data fix.
 *
 * Repara matches cuya transición match.estado=PENDIENTE_PAGO → CONFIRMADO
 * se perdió tras el pago de la comisión (porque sólo el flujo escrow v1
 * la hacía y ese flujo se retiró en v3.11).
 *
 * Cualquier match con contratoEstado='FIRMADO' pero match.estado distinto
 * de 'CONFIRMADO' y de 'CANCELADO' es inconsistente: si el contrato está
 * firmado, la comisión está pagada → el match debe estar en CONFIRMADO.
 *
 * Uso:
 *   cd "Primar-IA Plataforma"
 *   DATABASE_URL="<url-de-railway-postgres>" node apps/api/scripts/fix-confirmed-matches.mjs
 *
 * O con dry-run para verificar antes:
 *   DATABASE_URL="..." node apps/api/scripts/fix-confirmed-matches.mjs --dry-run
 */
import { PrismaClient } from '@primaria/database';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(dryRun ? '🔍 DRY RUN — no se modificará nada' : '🔧 APLICANDO ARREGLOS');

  const broken = await prisma.match.findMany({
    where: {
      contratoEstado: 'FIRMADO',
      estado: { notIn: ['CONFIRMADO', 'CANCELADO'] },
    },
    select: {
      id: true,
      estado: true,
      contratoEstado: true,
      lote: { select: { vendedor: { select: { email: true } } } },
      pedido: { select: { comprador: { select: { email: true } } } },
      transaccion: { select: { comisionPagadaEn: true } },
    },
  });

  if (broken.length === 0) {
    console.log('✅ No hay matches inconsistentes. Todo OK.');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n🚨 Encontrados ${broken.length} match(es) con contratoEstado=FIRMADO pero estado != CONFIRMADO/CANCELADO:\n`);
  for (const m of broken) {
    console.log(`  • match ${m.id}`);
    console.log(`    estado actual: ${m.estado} → debería ser CONFIRMADO`);
    console.log(`    vendedor: ${m.lote.vendedor.email}`);
    console.log(`    comprador: ${m.pedido.comprador.email}`);
    console.log(`    comisión pagada en: ${m.transaccion?.comisionPagadaEn ?? '(no fecha)'}`);
    console.log('');
  }

  if (dryRun) {
    console.log('Dry-run: no se aplican cambios. Ejecuta sin --dry-run para arreglar.');
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.match.updateMany({
    where: {
      contratoEstado: 'FIRMADO',
      estado: { notIn: ['CONFIRMADO', 'CANCELADO'] },
    },
    data: { estado: 'CONFIRMADO' },
  });

  console.log(`✅ Actualizados ${result.count} match(es) a estado=CONFIRMADO.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
