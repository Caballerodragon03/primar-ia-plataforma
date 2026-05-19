#!/usr/bin/env node
/**
 * Smoke test: generate the three invoice PDFs against a fake ContractData
 * and write them to /tmp. No DB hits, no R2 — just confirms the data builder
 * and PDF renderer don't crash on representative input.
 */
import { writeFileSync } from 'node:fs';
import {
  buildPlatformInvoice,
  buildSellerInvoice,
  buildPaymentReceipt,
} from '../dist/modules/invoices/invoice-v2-data.js';
import { generateInvoicePdf } from '../dist/modules/invoices/invoice-v2-pdf.js';

const fakeContract = {
  matchId: 'cl-test-abcdef',
  reference: 'CON-2026-ABCDEF',
  fechaGeneracion: new Date(),
  esFinal: true,
  vendedor: {
    razonSocial: 'Cooperativa Naranjas del Sur S.L.',
    cifNif: 'B11111111',
    formaJuridica: 'Sociedad Limitada',
    direccionFiscal: 'Camino del Naranjal 23',
    ciudad: 'Valencia',
    codigoPostal: '46011',
    pais: 'ES',
    personaContactoLegal: 'María García López',
    cargoContactoLegal: 'Administradora única',
    email: 'maria@cooperativa.es',
    telefono: '+34 600 000 001',
    iban: 'ES1234567890123456789012',
    swiftBic: 'BBVAESMMXXX',
    regimenFiscalCode: 'AGRARIO',
    regimenFiscalLabel: 'Régimen especial agrario (IVA reducido, IRPF 2%)',
  },
  comprador: {
    razonSocial: 'Distribuidora Mediterráneo S.A.',
    cifNif: 'A22222222',
    formaJuridica: 'Sociedad Anónima',
    direccionFiscal: 'Polígono Industrial Norte, Nave 5',
    ciudad: 'Barcelona',
    codigoPostal: '08020',
    pais: 'ES',
    personaContactoLegal: 'Pedro Martín Ruiz',
    cargoContactoLegal: 'Director de compras',
    email: 'pedro@distribuidora.es',
    telefono: '+34 600 000 002',
  },
  productoNombre: 'Naranja',
  variedadNombre: 'Valencia Late',
  calibres: [
    { calibre: '3', cantidadKg: 5000, precioKg: 0.85, subtotal: 4250 },
    { calibre: '4', cantidadKg: 3000, precioKg: 0.78, subtotal: 2340 },
  ],
  cantidadTotalKg: 8000,
  precioTotalMercancia: 6590,
  incoterm: 'FCA',
  incotermDescripcion: 'Free Carrier — El vendedor entrega la mercancía al transportista del comprador.',
  logistica: 'OTRO_RECOGE',
  logisticaLabel: 'La otra parte recoge',
  terminoPago: 'DIAS_30',
  terminoPagoLabel: '30 días',
  diasVencimiento: 30,
  fechaEntrega: new Date('2026-06-01'),
  origenDireccion: 'Camino del Naranjal 23, Valencia',
  destinoDireccion: 'Mercabarna, Pabellón 4, Barcelona',
  comision: {
    base: 6590,
    porcentajeFinal: 0.025,
    importe: 164.75,
    iva: 34.60,
    totalConIva: 199.35,
    notas: '−0,1pp por volumen €25-100k/mes',
  },
  firmaVendedor: { firma: 'María García López', fecha: new Date() },
  firmaComprador: { firma: 'Pedro Martín Ruiz', fecha: new Date() },
  fechaVencimientoPagoVendedor: new Date('2026-07-01'),
};

async function main() {
  const platform = await buildPlatformInvoice(fakeContract, 'ch_test_xyz123');
  const seller = await buildSellerInvoice(fakeContract);
  const receipt = await buildPaymentReceipt(fakeContract);

  const [pBuf, sBuf, rBuf] = await Promise.all([
    generateInvoicePdf(platform),
    generateInvoicePdf(seller),
    generateInvoicePdf(receipt),
  ]);

  writeFileSync('/tmp/test-invoice-platform.pdf', pBuf);
  writeFileSync('/tmp/test-invoice-seller.pdf', sBuf);
  writeFileSync('/tmp/test-receipt.pdf', rBuf);

  console.log(`OK
  platform: ${pBuf.length} bytes → /tmp/test-invoice-platform.pdf
  seller:   ${sBuf.length} bytes → /tmp/test-invoice-seller.pdf
  receipt:  ${rBuf.length} bytes → /tmp/test-receipt.pdf

Tax breakdown (seller, régimen AGRARIO):
  base=${seller.impuestos.base}€
  compensación 12%=${seller.impuestos.ivaImporte}€
  total=${seller.impuestos.total}€

Platform commission:
  base=${platform.impuestos.base}€
  IVA 21%=${platform.impuestos.ivaImporte}€
  total=${platform.impuestos.total}€

Receipt amount to transfer: ${receipt.impuestos.total}€
`);
}

main().catch((err) => {
  console.error('FAIL', err);
  process.exit(1);
});
