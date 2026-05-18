/**
 * Phase 5 — Invoice orchestrator for the v2 matchmaker flow.
 *
 * Called from contracts.service.ts::signMatchContractAsBuyerAfterPayment
 * AFTER the contract becomes FIRMADO. Generates the three PDFs:
 *   - Factura Primar-IA (comisión, IVA 21%)
 *   - Factura vendedor (mercancía, según régimen fiscal)
 *   - Resguardo de pago (transferencia comprador → vendedor)
 *
 * Uploads each to R2 under `invoices/{matchId}/{kind}-{timestamp}.pdf` and
 * persists the URLs in Transaccion.{facturaPlataformaUrl, facturaVendedorUrl,
 * resguardoPagoUrl}.
 *
 * Fire-and-forget from the caller — failures are logged but do NOT roll back
 * the contract finalization. An admin can regenerate manually if needed.
 */
import { prisma } from '@primaria/database';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../../config/env.js';
import { getR2 } from '../../shared/r2.js';
import { buildContractData } from '../contracts/contract-data.js';
import {
  buildPlatformInvoice,
  buildSellerInvoice,
  buildPaymentReceipt,
} from './invoice-v2-data.js';
import { generateInvoicePdf } from './invoice-v2-pdf.js';

async function uploadInvoiceToR2(matchId: string, filename: string, buffer: Buffer): Promise<string> {
  const r2Configured = env.R2_ACCOUNT_ID !== 'placeholder' && env.R2_ACCESS_KEY_ID !== 'placeholder';
  if (!r2Configured) {
    console.warn('[invoices] R2 not configured — invoice not persisted. Configure R2_* env vars.');
    return `https://uploads.primar-ia.com/invoices/${matchId}/${filename}`;
  }
  const key = `invoices/${matchId}/${filename}`;
  await getR2().send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: 'application/pdf',
    ContentDisposition: `attachment; filename="${filename}"`,
  }));
  return `${env.R2_PUBLIC_URL}/${key}`;
}

export class InvoiceV2Service {
  /**
   * Generates and persists the three Phase-5 documents for a match. Safe to
   * re-run: if URLs already exist on the Transaccion, this method short-circuits
   * to avoid generating duplicates (idempotent).
   *
   * Returns the three URLs (existing or freshly created).
   */
  async generateAllForMatch(matchId: string): Promise<{
    facturaPlataformaUrl: string;
    facturaVendedorUrl: string;
    resguardoPagoUrl: string;
  }> {
    // Load the transaccion + match basics to know if work is needed.
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        contratoEstado: true,
        transaccion: {
          select: {
            id: true,
            comisionStripeChargeId: true,
            facturaPlataformaUrl: true,
            facturaVendedorUrl: true,
            resguardoPagoUrl: true,
          },
        },
      },
    });
    if (!match || !match.transaccion) {
      throw new Error(`[invoices] Match ${matchId} or its transaccion not found`);
    }
    if (match.contratoEstado !== 'FIRMADO') {
      throw new Error(`[invoices] Match ${matchId} not in FIRMADO state — got ${match.contratoEstado}`);
    }

    // Idempotency — if all three URLs already exist, return them.
    if (
      match.transaccion.facturaPlataformaUrl
      && match.transaccion.facturaVendedorUrl
      && match.transaccion.resguardoPagoUrl
    ) {
      return {
        facturaPlataformaUrl: match.transaccion.facturaPlataformaUrl,
        facturaVendedorUrl: match.transaccion.facturaVendedorUrl,
        resguardoPagoUrl: match.transaccion.resguardoPagoUrl,
      };
    }

    // Build the canonical contract data (parties, calibres, commission split).
    const contract = await buildContractData(matchId, { esFinal: true });

    // Generate the three documents in parallel. Each is a pure function of
    // `contract` data so there's no race.
    const platformInvoice = buildPlatformInvoice(contract, match.transaccion.comisionStripeChargeId);
    const sellerInvoice = buildSellerInvoice(contract);
    const receipt = buildPaymentReceipt(contract);

    const [platformBuf, sellerBuf, receiptBuf] = await Promise.all([
      generateInvoicePdf(platformInvoice),
      generateInvoicePdf(sellerInvoice),
      generateInvoicePdf(receipt),
    ]);

    const ts = Date.now();
    const [facturaPlataformaUrl, facturaVendedorUrl, resguardoPagoUrl] = await Promise.all([
      uploadInvoiceToR2(matchId, `factura-comision-${ts}.pdf`, platformBuf),
      uploadInvoiceToR2(matchId, `factura-vendedor-${ts}.pdf`, sellerBuf),
      uploadInvoiceToR2(matchId, `resguardo-pago-${ts}.pdf`, receiptBuf),
    ]);

    // Persist the URLs back to the Transaccion.
    await prisma.transaccion.update({
      where: { id: match.transaccion.id },
      data: {
        facturaPlataformaUrl,
        facturaVendedorUrl,
        resguardoPagoUrl,
      },
    });

    return { facturaPlataformaUrl, facturaVendedorUrl, resguardoPagoUrl };
  }
}

export const invoiceV2Service = new InvoiceV2Service();
