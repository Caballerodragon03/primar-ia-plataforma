import 'dotenv/config';
import { prisma } from '@primaria/database';

const byEstado = await prisma.match.groupBy({
  by: ['estado'],
  _count: { _all: true },
});
console.log('Matches by estado:');
console.table(byEstado.map(r => ({ estado: r.estado, count: r._count._all })));

const totalMatches = await prisma.match.count();
console.log(`\nTotal matches: ${totalMatches}`);

const confirmed = await prisma.match.findMany({
  where: { estado: 'CONFIRMADO' },
  select: { id: true, createdAt: true, precioKg: true, cantidadKg: true, lote: { select: { producto: { select: { nombre: true } } } } },
  take: 10,
  orderBy: { createdAt: 'desc' },
});
console.log(`\nConfirmed matches (latest 10):`);
console.table(confirmed.map(m => ({
  id: m.id.slice(0, 8),
  producto: m.lote?.producto?.nombre ?? '?',
  precio_kg: Number(m.precioKg),
  cantidad_kg: Number(m.cantidadKg),
  created: m.createdAt.toISOString().slice(0, 10),
})));

const totalTransacciones = await prisma.transaccion.count();
console.log(`\nTotal transacciones: ${totalTransacciones}`);

await prisma.$disconnect();
