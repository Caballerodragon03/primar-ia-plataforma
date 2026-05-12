// Seed mock confirmed transactions for Aguacate Hass to demo the market analytics UI.
// All records are tagged with marker: 'AGUACATE_DEMO' in match.scoreDetalle for easy deletion.
// To remove: node scripts/delete-mock-data.mjs
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from '@primaria/database';

const MARKER = 'AGUACATE_DEMO';
const MOCK_SELLER_EMAIL = 'mock_seller_aguacate@primar-ia.demo';
const MOCK_BUYER_EMAIL = 'mock_buyer_aguacate@primar-ia.demo';

const CALIBRES_HASS = ['10', '12', '14', '16', '18', '20'];
// Realistic Aguacate Hass €/kg ranges per calibre (smaller = more expensive)
const PRICE_BY_CALIBRE = {
  '10': { min: 2.10, max: 2.60 },
  '12': { min: 1.90, max: 2.30 },
  '14': { min: 1.70, max: 2.05 },
  '16': { min: 1.50, max: 1.85 },
  '18': { min: 1.30, max: 1.65 },
  '20': { min: 1.10, max: 1.40 },
};

function rand(min, max) { return min + Math.random() * (max - min); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function findOrCreateMockUsers() {
  const passwordHash = await bcrypt.hash('MockPassword2026!', 12);

  let seller = await prisma.user.findUnique({ where: { email: MOCK_SELLER_EMAIL } });
  if (!seller) {
    seller = await prisma.user.create({
      data: {
        email: MOCK_SELLER_EMAIL,
        username: 'mock_seller_aguacate',
        passwordHash,
        role: 'VENDEDOR',
        nombre: 'Mock',
        apellidos: 'Vendedor Aguacate (DELETE)',
        estado: 'VERIFICADO_ACTIVO',
        idioma: 'ES',
        empresa: {
          create: {
            razonSocial: 'Mock Aguacate Producciones SL (DELETE)',
            cifNif: 'X9999991A',
            direccionFiscal: 'Málaga, Andalucía',
            ciudad: 'Málaga',
            codigoPostal: '29001',
            pais: 'ES',
            personaContactoLegal: 'Mock Demo',
            cargoContactoLegal: 'Demo',
          },
        },
      },
    });
    console.log(`✓ Created mock seller: ${seller.id}`);
  }

  let buyer = await prisma.user.findUnique({ where: { email: MOCK_BUYER_EMAIL } });
  if (!buyer) {
    buyer = await prisma.user.create({
      data: {
        email: MOCK_BUYER_EMAIL,
        username: 'mock_buyer_aguacate',
        passwordHash,
        role: 'COMPRADOR',
        nombre: 'Mock',
        apellidos: 'Comprador Aguacate (DELETE)',
        estado: 'VERIFICADO_ACTIVO',
        idioma: 'ES',
        empresa: {
          create: {
            razonSocial: 'Mock Frutas Internacional SL (DELETE)',
            cifNif: 'X9999992A',
            direccionFiscal: 'Valencia',
            ciudad: 'Valencia',
            codigoPostal: '46001',
            pais: 'ES',
            personaContactoLegal: 'Mock Demo',
            cargoContactoLegal: 'Demo',
          },
        },
      },
    });
    console.log(`✓ Created mock buyer: ${buyer.id}`);
  }

  return { seller, buyer };
}

async function findAguacate() {
  const aguacate = await prisma.producto.findFirst({
    where: { nombre: { contains: 'guacate', mode: 'insensitive' } },
    include: { variedades: true },
  });
  if (!aguacate) throw new Error('No se encontró el producto Aguacate en la BD. Ejecuta primero los seeds de productos.');
  const hass = aguacate.variedades.find(v => /hass/i.test(v.nombre));
  if (!hass) console.warn('⚠️  No se encontró variedad Hass — usando variedad sin especificar');
  return { producto: aguacate, variedad: hass ?? null };
}

async function seedTransaction(seller, buyer, producto, variedad, daysAgo, calibre) {
  const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const priceRange = PRICE_BY_CALIBRE[calibre];
  // Slight downward trend over time: prices today are ~10% higher than 90 days ago
  const trendFactor = 1 + (1 - daysAgo / 90) * 0.12;
  const precio = +(rand(priceRange.min, priceRange.max) * trendFactor).toFixed(4);
  const cantidad = +(rand(800, 5000)).toFixed(2);

  // Create lote
  const lote = await prisma.lote.create({
    data: {
      vendedorId: seller.id,
      productoId: producto.id,
      variedadId: variedad?.id ?? null,
      tipo: 'VENTA_DIRECTA',
      calibres: [{ calibre, cantidad_kg: cantidad, precio_min_kg: precio * 0.95 }],
      direccionRecogida: 'Mock Finca Málaga (DELETE)',
      coordenadasLat: 36.7213,
      coordenadasLng: -4.4214,
      fechaDisponibilidad: createdAt,
      certificaciones: [],
      fotosUrls: [],
      comentariosAdicionales: `MOCK ${MARKER} — eliminar`,
      estado: 'VENDIDO',
      createdAt,
      updatedAt: createdAt,
    },
  });

  // Create pedido
  const pedido = await prisma.pedido.create({
    data: {
      compradorId: buyer.id,
      productoId: producto.id,
      variedadId: variedad?.id ?? null,
      calibresSolicitados: [{ calibre, cantidad_kg: cantidad, precio_max_kg: precio * 1.05 }],
      incoterm: 'FCA',
      destinoFinal: 'Mock Destino Valencia (DELETE)',
      transporte: 'own',
      fechaEntregaDeseada: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
      notasAdicionales: `MOCK ${MARKER} — eliminar`,
      estado: 'TOTALMENTE_CUBIERTO',
      createdAt,
      updatedAt: createdAt,
    },
  });

  // Create CONFIRMADO match (this is what the analytics queries read)
  await prisma.match.create({
    data: {
      loteId: lote.id,
      pedidoId: pedido.id,
      cantidadKg: cantidad,
      precioKg: precio,
      calibresJson: [{ calibre, cantidad_kg: cantidad, precio_kg: precio }],
      estado: 'CONFIRMADO',
      scoreMatching: 0.92,
      scoreDetalle: { mock: true, marker: MARKER },
      visibleDesde: createdAt,
      createdAt,
    },
  });
}

async function main() {
  console.log(`Seeding mock Aguacate Hass transactions (marker: ${MARKER})…\n`);

  const { seller, buyer } = await findOrCreateMockUsers();
  const { producto, variedad } = await findAguacate();
  console.log(`Using product: ${producto.nombre}${variedad ? ` / ${variedad.nombre}` : ''}\n`);

  // Generate 60 transactions spread over the last 90 days
  const TOTAL = 60;
  let created = 0;
  for (let i = 0; i < TOTAL; i++) {
    const daysAgo = Math.floor(rand(0, 90));
    const calibre = pick(CALIBRES_HASS);
    try {
      await seedTransaction(seller, buyer, producto, variedad, daysAgo, calibre);
      created++;
      if (created % 10 === 0) process.stdout.write(`  ${created}/${TOTAL}\n`);
    } catch (err) {
      console.error(`  Failed: ${err.message}`);
    }
  }

  console.log(`\n✓ Done — created ${created} mock CONFIRMADO matches.`);
  console.log(`\nTo delete: node scripts/delete-mock-data.mjs\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
