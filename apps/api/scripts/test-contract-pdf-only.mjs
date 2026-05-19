#!/usr/bin/env node
/**
 * Standalone smoke test del nuevo generador de contrato PDF (Fase 14F).
 * No depende de la DB — usa un ContractData hardcoded representativo.
 */
import { writeFileSync } from 'node:fs';
import { generateContractPdf } from '../dist/modules/contracts/contract-pdf.js';

const baseContract = {
  matchId: 'cl-test-abcdef',
  reference: 'CON-2026-ABCDEF',
  fechaGeneracion: new Date('2026-05-19T11:30:00Z'),
  esFinal: false,
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
    iban: 'ES12 3456 7890 1234 5678 9012',
    swiftBic: 'BBVAESMMXXX',
    regimenFiscalCode: 'AGRARIO',
    regimenFiscalLabel: 'Régimen especial agrario (REAGP)',
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
  incotermDescripcion: 'Free Carrier — el vendedor entrega la mercancía al transportista designado por el comprador en el punto acordado (lonja, cooperativa o almacén). El comprador asume el transporte principal y los riesgos a partir de ese momento.',
  logistica: 'OTRO_RECOGE',
  logisticaLabel: 'La otra parte recoge',
  terminoPago: 'DIAS_30',
  terminoPagoLabel: '30 días',
  diasVencimiento: 30,
  fechaEntrega: new Date('2026-06-01'),
  origenDireccion: 'Camino del Naranjal 23, 46011 Valencia',
  destinoDireccion: 'Mercabarna, Pabellón 4, 08020 Barcelona',
  comision: {
    base: 6590,
    porcentajeFinal: 0.025,
    importe: 164.75,
    iva: 34.60,
    totalConIva: 199.35,
    notas: '−0,1pp por volumen €25-100k/mes',
  },
  firmaVendedor: { firma: null, fecha: null },
  firmaComprador: { firma: null, fecha: null },
  fechaVencimientoPagoVendedor: new Date('2026-07-01'),
};

async function main() {
  const draftBuf = await generateContractPdf(baseContract);
  writeFileSync('/tmp/test-contract-draft.pdf', draftBuf);
  console.log(`Borrador: ${draftBuf.length} bytes → /tmp/test-contract-draft.pdf`);

  const finalContract = {
    ...baseContract,
    esFinal: true,
    firmaVendedor: { firma: 'María García López', fecha: new Date('2026-05-19T11:35:00Z') },
    firmaComprador: { firma: 'Pedro Martín Ruiz', fecha: new Date('2026-05-19T12:10:00Z') },
  };
  const finalBuf = await generateContractPdf(finalContract);
  writeFileSync('/tmp/test-contract-final.pdf', finalBuf);
  console.log(`Final:    ${finalBuf.length} bytes → /tmp/test-contract-final.pdf`);
}

main().catch((err) => {
  console.error('FAIL', err);
  process.exit(1);
});
