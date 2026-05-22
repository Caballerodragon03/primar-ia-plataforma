import 'dotenv/config';
import { prisma } from '@primaria/database';
const id = 'cmp1ixqzz0001j1aohi41ag1r';
const lot = await prisma.lote.findUnique({
  where: { id },
  include: {
    matches: {
      select: {
        id: true,
        estado: true,
        cantidadKg: true,
        precioKg: true,
        calibresJson: true,
        createdAt: true,
        pedido: { select: { id: true, comprador: { select: { email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    },
  },
});
console.log('Lot estado:', lot.estado);
console.log('Calibres:', JSON.stringify(lot.calibres, null, 2));
const totalLote = lot.calibres.reduce((s, c) => s + c.cantidad_kg, 0);
console.log(`Total kg in lot: ${totalLote}`);

console.log('\nMatches:');
let committedKg = 0;
for (const m of lot.matches) {
  const isCommitted = ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'].includes(m.estado);
  if (isCommitted) committedKg += Number(m.cantidadKg);
  console.log(`  ${m.id.slice(-6)} · ${m.estado} · ${m.cantidadKg} kg · €${m.precioKg}/kg · buyer ${m.pedido?.comprador?.email}`);
}
console.log(`\nCommitted kg (ACEPTADO+PENDIENTE+CONFIRMADO): ${committedKg} / ${totalLote}`);
console.log(`Coverage: ${totalLote > 0 ? Math.round((committedKg / totalLote) * 100) : 0}%`);
await prisma.$disconnect();
