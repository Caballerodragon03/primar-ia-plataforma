// One-off: upgrade a user to the medium-tier subscription for their role.
// Usage: node scripts/upgrade-user-subscription.mjs <email> [seller|buyer plan override]
import 'dotenv/config';
import { prisma } from '@primaria/database';

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/upgrade-user-subscription.mjs <email>');
  process.exit(1);
}

const user = await prisma.user.findUnique({
  where: { email },
  select: { id: true, email: true, role: true, nombre: true, apellidos: true, suscripcion: true },
});
if (!user) {
  console.error(`User ${email} not found.`);
  process.exit(1);
}

console.log(`Found: ${user.nombre} ${user.apellidos} <${user.email}> — role: ${user.role}`);

// Pick medium plan based on role
const plan = user.role === 'VENDEDOR' ? 'CAMPO' : user.role === 'COMPRADOR' ? 'LONJA' : null;
if (!plan) {
  console.error(`Role ${user.role} cannot have a subscription`);
  process.exit(1);
}

console.log(`Applying plan: ${plan}`);

const data = {
  estado: 'ACTIVA',
  fechaInicio: new Date(),
  cancelledAt: null,
  ...(user.role === 'VENDEDOR'
    ? { planVendedor: plan, planComprador: null }
    : { planComprador: plan, planVendedor: null }),
};

const sub = await prisma.suscripcion.upsert({
  where: { userId: user.id },
  create: { userId: user.id, ...data },
  update: data,
});

console.log(`\n✓ Subscription updated:`);
console.log(`  userId:        ${sub.userId}`);
console.log(`  estado:        ${sub.estado}`);
console.log(`  planVendedor:  ${sub.planVendedor}`);
console.log(`  planComprador: ${sub.planComprador}`);
console.log(`  fechaInicio:   ${sub.fechaInicio.toISOString()}`);

if (!sub.stripeSubscriptionId) {
  console.log(`\n⚠  No stripeSubscriptionId set — this is a manual upgrade (free for the user).`);
  console.log(`   The user has full plan access; no Stripe billing is attached.`);
}

// Now that the subscription is active, recompute match visibility so any
// previously-delayed (24h) matches where this user was the bottleneck
// become visible immediately.
try {
  const { matchingService } = await import('../dist/modules/matching/matching.service.js');
  const result = await matchingService.recomputeMatchVisibilityForUser(user.id);
  if (result.updated > 0) {
    console.log(`\n✓ ${result.updated} match(es) now visible immediately.`);
  } else {
    console.log(`\n✓ No matches needed visibility updates.`);
  }
} catch (err) {
  console.error('\n⚠  Failed to recompute match visibility:', err.message);
  console.error('   Run "npm run build" in apps/api first if dist/ is stale.');
}

await prisma.$disconnect();
