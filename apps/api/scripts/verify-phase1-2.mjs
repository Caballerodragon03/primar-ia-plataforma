// Audit script — verify Phase 1+2 schema additions on existing data.
import 'dotenv/config';
import { prisma } from '@primaria/database';

console.log('=== Verifying Phase 1+2 schema state ===\n');

// 1. Empresas — IBAN / regimenFiscal
const empresaStats = await prisma.empresa.groupBy({
  by: ['regimenFiscal'],
  _count: { _all: true },
});
console.log('Empresas by regimenFiscal:');
console.table(empresaStats.map(r => ({ regimen: r.regimenFiscal, count: r._count._all })));

const empresasWithIban = await prisma.empresa.count({ where: { iban: { not: null } } });
const totalEmpresas = await prisma.empresa.count();
console.log(`\nEmpresas with IBAN: ${empresasWithIban}/${totalEmpresas}`);

// Empresas linked to VENDEDOR users WITHOUT IBAN (pre-existing data — should
// just have null). After the migration, new sellers must provide IBAN.
const vendedorEmpresasNoIban = await prisma.empresa.count({
  where: { iban: null, user: { role: 'VENDEDOR' } },
});
console.log(`Empresas of VENDEDOR users WITHOUT IBAN (pre-migration): ${vendedorEmpresasNoIban}`);

// 2. Lotes — logistica / incotermsAceptados / terminosPagoAceptados
const loteStats = await prisma.lote.groupBy({
  by: ['logistica'],
  _count: { _all: true },
});
console.log('\nLotes by logistica:');
console.table(loteStats.map(r => ({ logistica: r.logistica, count: r._count._all })));

const totalLotes = await prisma.lote.count();
const lotesWithIncoterms = await prisma.lote.count({
  where: { incotermsAceptados: { not: { equals: [] } } },
});
console.log(`\nLotes with non-empty incotermsAceptados: ${lotesWithIncoterms}/${totalLotes}`);

// 3. Pedidos — same
const pedidoStats = await prisma.pedido.groupBy({
  by: ['logistica'],
  _count: { _all: true },
});
console.log('\nPedidos by logistica:');
console.table(pedidoStats.map(r => ({ logistica: r.logistica, count: r._count._all })));

// 4. Match — new fields nullable, should all be null on existing rows
const matchesWithContrato = await prisma.match.count({
  where: { contratoEstado: { not: 'BORRADOR' } },
});
const totalMatches = await prisma.match.count();
console.log(`\nMatches with contrato in non-BORRADOR state: ${matchesWithContrato}/${totalMatches}`);

// 5. Indexes — sanity check
const indexes = await prisma.$queryRaw`
  SELECT indexname FROM pg_indexes
  WHERE tablename IN ('matches', 'lotes', 'pedidos', 'empresas')
  AND indexname LIKE '%contrato_estado%'
`;
console.log('\nNew contrato_estado indexes:');
console.log(indexes);

await prisma.$disconnect();
