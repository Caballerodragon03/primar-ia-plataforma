// One-off: any lot marked VENDIDO whose matches are NOT all COMPLETADO is
// incorrect under the new semantics. Recompute their estado via the helper.
import 'dotenv/config';
import { prisma } from '@primaria/database';
const { recomputeLotState } = await import('../dist/modules/matching/matching.service.js');

const suspect = await prisma.lote.findMany({
  where: {
    estado: 'VENDIDO',
    matches: {
      some: {
        estado: { in: ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'] },
        OR: [
          { transaccion: null },
          { transaccion: { estado: { not: 'COMPLETADO' } } },
        ],
      },
    },
  },
  select: { id: true, estado: true },
});

console.log(`Found ${suspect.length} lot(s) marked VENDIDO with non-completed transactions:`);
for (const l of suspect) {
  console.log(`  ${l.id} (current: ${l.estado})`);
  await recomputeLotState(l.id);
  const after = await prisma.lote.findUnique({ where: { id: l.id }, select: { estado: true } });
  console.log(`    → ${after?.estado}`);
}
await prisma.$disconnect();
