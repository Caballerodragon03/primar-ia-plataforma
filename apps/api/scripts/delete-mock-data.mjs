// Removes all mock data tagged with marker: 'AGUACATE_DEMO' or with mock user emails.
import 'dotenv/config';
import { prisma } from '@primaria/database';

const MARKER = 'AGUACATE_DEMO';
const MOCK_EMAILS = [
  'mock_seller_aguacate@primar-ia.demo',
  'mock_buyer_aguacate@primar-ia.demo',
];

async function main() {
  console.log(`Deleting mock data tagged ${MARKER}…\n`);

  // 1) Delete matches first (they reference lotes/pedidos)
  // Use raw SQL because JSON path filtering in Prisma's typed API requires careful schema knowledge
  const deletedMatches = await prisma.$executeRaw`
    DELETE FROM matches
    WHERE score_detalle::jsonb @> ${JSON.stringify({ marker: MARKER })}::jsonb
  `;
  console.log(`✓ Deleted ${deletedMatches} matches`);

  const mockUsers = await prisma.user.findMany({
    where: { email: { in: MOCK_EMAILS } },
    select: { id: true },
  });
  const userIds = mockUsers.map(u => u.id);

  if (userIds.length === 0) {
    console.log('No mock users found — nothing else to delete.');
    await prisma.$disconnect();
    return;
  }

  // 2) Delete any remaining lotes/pedidos belonging to mock users
  const deletedPedidos = await prisma.pedido.deleteMany({
    where: { compradorId: { in: userIds } },
  });
  console.log(`✓ Deleted ${deletedPedidos.count} pedidos`);

  const deletedLotes = await prisma.lote.deleteMany({
    where: { vendedorId: { in: userIds } },
  });
  console.log(`✓ Deleted ${deletedLotes.count} lotes`);

  // 3) Delete mock empresas (1-1 with user)
  const deletedEmpresas = await prisma.empresa.deleteMany({
    where: { userId: { in: userIds } },
  });
  console.log(`✓ Deleted ${deletedEmpresas.count} empresas`);

  // 4) Delete mock users
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { in: userIds } },
  });
  console.log(`✓ Deleted ${deletedUsers.count} users`);

  console.log('\n✓ All mock data removed.\n');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
