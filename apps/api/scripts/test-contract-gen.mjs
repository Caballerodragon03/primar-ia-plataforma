// Smoke-test the contract generator end-to-end with a real match.
import 'dotenv/config';
import { prisma } from '@primaria/database';
import fs from 'fs';
const { buildContractData } = await import('../dist/modules/contracts/contract-data.js');
const { generateContractPdf } = await import('../dist/modules/contracts/contract-pdf.js');

console.log('=== Contract generator smoke test ===\n');

// Find a match where both parties have empresa data.
const match = await prisma.match.findFirst({
  where: {
    lote: { vendedor: { empresa: { isNot: null } } },
    pedido: { comprador: { empresa: { isNot: null } } },
  },
  include: {
    lote: { include: { vendedor: { include: { empresa: true } } } },
    pedido: { include: { comprador: { include: { empresa: true } } } },
  },
});

if (!match) {
  console.log('No suitable match found for smoke test.');
  process.exit(0);
}
console.log(`Using match ${match.id.slice(-6)} — vendedor: ${match.lote.vendedor.empresa?.razonSocial}, comprador: ${match.pedido.comprador.empresa?.razonSocial}`);

// Make sure seller has IBAN (mandatory). If not, set a fake one for the test.
if (!match.lote.vendedor.empresa?.iban) {
  console.log('⚠ Seller has no IBAN. Setting test value for the smoke test.');
  await prisma.empresa.update({
    where: { id: match.lote.vendedor.empresa.id },
    data: { iban: 'ES9121000418450200051332' },
  });
}

try {
  console.log('\nBuilding contract data...');
  const data = await buildContractData(match.id, { esFinal: false });
  console.log(`✓ Data built: reference=${data.reference}, calibres=${data.calibres.length}, total=${data.precioTotalMercancia.toFixed(2)}€`);
  console.log(`  Comisión: ${data.comision.importe.toFixed(2)}€ (${(data.comision.porcentajeFinal*100).toFixed(2)}%) - ${data.comision.notas}`);
  console.log(`  Logística: ${data.logisticaLabel} | Incoterm: ${data.incoterm} | Pago: ${data.terminoPagoLabel}`);

  console.log('\nGenerating PDF draft...');
  const pdf = await generateContractPdf(data);
  console.log(`✓ PDF generated, ${(pdf.length / 1024).toFixed(1)} KB`);

  const outFile = '/tmp/test-contract-draft.pdf';
  fs.writeFileSync(outFile, pdf);
  console.log(`✓ Saved to ${outFile} — open it to verify watermark + content`);

  // Try the final version too
  data.esFinal = true;
  data.firmaVendedor = { firma: 'Juan Pérez García', fecha: new Date() };
  data.firmaComprador = { firma: 'María López Ruiz', fecha: new Date() };
  const pdfFinal = await generateContractPdf(data);
  const outFinal = '/tmp/test-contract-final.pdf';
  fs.writeFileSync(outFinal, pdfFinal);
  console.log(`✓ Final PDF generated (no watermark, signed) → ${outFinal}`);
} catch (err) {
  console.error('✗ Failed:', err.message);
  console.error(err.stack);
  process.exit(1);
}

console.log('\n=== Contract generator smoke test PASSED ===');
await prisma.$disconnect();
