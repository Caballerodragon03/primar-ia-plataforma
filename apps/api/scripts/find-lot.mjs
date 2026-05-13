import 'dotenv/config';
import { prisma } from '@primaria/database';
const suffix = process.argv[2] ?? '41AG1R';
const lower = suffix.toLowerCase();
const lots = await prisma.lote.findMany({
  where: { id: { endsWith: lower } },
  select: {
    id: true,
    estado: true,
    vendedorId: true,
    productoId: true,
    fechaDisponibilidad: true,
    fechaFinDisponibilidad: true,
    createdAt: true,
    producto: { select: { nombre: true } },
    vendedor: { select: { email: true, nombre: true, apellidos: true } },
  },
});
console.log(JSON.stringify(lots, null, 2));
await prisma.$disconnect();
