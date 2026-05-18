// Smoke test the matching engine with new Phase 2 fields present.
import 'dotenv/config';
import { prisma } from '@primaria/database';
const { matchingService } = await import('../dist/modules/matching/matching.service.js');

console.log('=== Matching engine smoke test ===\n');

// Find an active lot with a matching active pedido for the same product.
const activeLot = await prisma.lote.findFirst({
  where: { estado: { in: ['ACTIVO', 'PARCIALMENTE_VENDIDO'] } },
  include: {
    producto: { select: { nombre: true } },
    vendedor: { select: { id: true, nombre: true, apellidos: true } },
  },
});
if (!activeLot) {
  console.log('No active lot found.');
  process.exit(0);
}
console.log(`Active lot: ${activeLot.id.slice(-6)} — ${activeLot.producto?.nombre}`);
console.log(`  logistica: ${activeLot.logistica}`);
console.log(`  incotermsAceptados: ${JSON.stringify(activeLot.incotermsAceptados)}`);
console.log(`  terminosPagoAceptados: ${JSON.stringify(activeLot.terminosPagoAceptados)}`);

// Find matching pedidos
const candidatePedidos = await prisma.pedido.findMany({
  where: {
    productoId: activeLot.productoId,
    estado: { in: ['ACTIVO', 'PARCIALMENTE_CUBIERTO'] },
  },
  take: 3,
});
console.log(`\nFound ${candidatePedidos.length} candidate pedidos for this lot's product`);

try {
  console.log('\nRunning matchingService.runMatchingForLot…');
  const matches = await matchingService.runMatchingForLot(activeLot.id);
  console.log(`✓ Matching completed, produced ${matches.length} matches`);
} catch (err) {
  console.error('✗ Matching failed:', err.message);
  process.exit(1);
}

console.log('\n=== Matching engine smoke test PASSED ===');
await prisma.$disconnect();
