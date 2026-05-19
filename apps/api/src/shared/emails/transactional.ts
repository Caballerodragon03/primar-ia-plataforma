import { sendEmail } from '../email.js';

export async function sendMatchProposalEmail(
  vendorEmail: string,
  vendorName: string,
  data: {
    pedidoId: string;
    productoNombre: string;
    cantidadKg: number;
    precioMaxKg: number;
    compradorEmpresa: string;
  },
): Promise<void> {
  const total = (data.cantidadKg * data.precioMaxKg).toFixed(2);
  await sendEmail({
    to: vendorEmail,
    subject: `Nueva propuesta de match para ${data.productoNombre}`,
    html: `
      <h2>Nueva propuesta de match</h2>
      <p>Hola ${vendorName}, tienes una nueva propuesta para <strong>${data.productoNombre}</strong>
         del comprador <strong>${data.compradorEmpresa}</strong>.</p>
      <ul>
        <li>Cantidad: <strong>${data.cantidadKg} kg</strong></li>
        <li>Precio ofrecido: <strong>hasta €${data.precioMaxKg.toFixed(2)}/kg</strong></li>
        <li>Valor potencial: <strong>€${total}</strong></li>
      </ul>
      <p>Accede a la plataforma para revisar y aceptar la propuesta.</p>
    `,
  });
}

export async function sendOrderConfirmedEmail(
  buyerEmail: string,
  buyerName: string,
  data: {
    pedidoId: string;
    productoNombre: string;
    totalAmount: number;
  },
): Promise<void> {
  await sendEmail({
    to: buyerEmail,
    subject: `Pedido #${data.pedidoId} confirmado`,
    html: `
      <h2>Pedido confirmado</h2>
      <p>Hola ${buyerName}, tu pedido <strong>#${data.pedidoId}</strong> de
         ${data.productoNombre} por <strong>€${data.totalAmount.toFixed(2)}</strong> ha sido confirmado.</p>
      <p>Accede a la plataforma para seguir el estado de tu pedido.</p>
    `,
  });
}

export async function sendQRDeliveryEmail(
  vendorEmail: string,
  vendorName: string,
  data: {
    transaccionId: string;
    productoNombre: string;
    qrToken: string;
  },
): Promise<void> {
  await sendEmail({
    to: vendorEmail,
    subject: `Código QR de entrega para ${data.productoNombre}`,
    html: `
      <h2>Confirma la entrega de tu pedido</h2>
      <p>Hola ${vendorName}, el lote de <strong>${data.productoNombre}</strong>
         (Transacción #${data.transaccionId}) está listo para confirmar entrega.</p>
      <p>Token QR: <strong>${data.qrToken}</strong></p>
      <p style="color:#9CA3AF; font-size:12px;">
        El código QR tiene validez de 48 horas y solo puede usarse una vez.
      </p>
    `,
  });
}

export async function sendWelcomeEmail(email: string, nombre: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Tu cuenta en Primar-IA ha sido verificada',
    html: `
      <h2>¡Tu cuenta ha sido verificada!</h2>
      <p>Hola ${nombre}, tu cuenta en Primar-IA está lista. Ya puedes acceder a la plataforma.</p>
    `,
  });
}

// ─── Phase 12 — V2 contract lifecycle emails ────────────────────────────────

const APP_URL = (process.env['CORS_ORIGIN'] ?? 'https://app.primar-ia.com').replace(/\/$/, '');

/**
 * Sent to the BUYER when the seller signs the contract. Includes the 48h
 * business-hours deadline and a CTA to /buyer/contracts/[matchId].
 */
export async function sendSellerSignedEmail(
  buyerEmail: string,
  buyerName: string,
  data: {
    matchId: string;
    productoNombre: string;
    comisionEur: number;
    deadlineIso: string;
  },
): Promise<void> {
  const deadlineStr = new Date(data.deadlineIso).toLocaleString('es-ES', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid',
  });
  const url = `${APP_URL}/buyer/contracts/${data.matchId}`;
  await sendEmail({
    to: buyerEmail,
    subject: `El vendedor ha firmado tu contrato de ${data.productoNombre}`,
    html: `
      <h2>El vendedor ha firmado</h2>
      <p>Hola ${buyerName}, el vendedor ha firmado el contrato de
         <strong>${data.productoNombre}</strong>.</p>
      <p>Tienes hasta el <strong>${deadlineStr}</strong> (48 horas hábiles)
         para firmar y pagar la comisión de <strong>€${data.comisionEur.toFixed(2)}</strong>.</p>
      <p><a href="${url}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Revisar y firmar el contrato</a></p>
      <p style="color:#9CA3AF;font-size:12px">Si no firmas dentro del plazo, el contrato caducará automáticamente y deberá iniciarse de nuevo.</p>
    `,
  });
}

/**
 * Sent to BOTH parties when the contract is fully signed and commission paid.
 * Includes a link to download the documents.
 */
export async function sendContractFinalizedEmail(
  email: string,
  nombre: string,
  data: {
    matchId: string;
    productoNombre: string;
    isSeller: boolean;
  },
): Promise<void> {
  const url = `${APP_URL}/${data.isSeller ? 'seller' : 'buyer'}/contracts/${data.matchId}`;
  await sendEmail({
    to: email,
    subject: `Contrato firmado: ${data.productoNombre}`,
    html: `
      <h2>Contrato firmado por ambas partes</h2>
      <p>Hola ${nombre}, el contrato de <strong>${data.productoNombre}</strong>
         está firmado y la comisión pagada. Ya puedes descargar las facturas
         ${data.isSeller ? 'y proceder con la entrega' : 'y proceder con el pago al vendedor según las condiciones acordadas'}.</p>
      <p><a href="${url}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Ver documentos y siguiente paso</a></p>
    `,
  });
}

/**
 * Sent to the SELLER when their signature expires because the buyer didn't
 * pay+sign within 48 business hours.
 */
export async function sendContractExpiredEmail(
  sellerEmail: string,
  sellerName: string,
  data: {
    matchId: string;
    productoNombre: string;
  },
): Promise<void> {
  const url = `${APP_URL}/seller/contracts/${data.matchId}`;
  await sendEmail({
    to: sellerEmail,
    subject: `Contrato caducado: ${data.productoNombre}`,
    html: `
      <h2>El contrato ha caducado</h2>
      <p>Hola ${sellerName}, el comprador no firmó dentro del plazo de 48 horas hábiles, por lo que el contrato de <strong>${data.productoNombre}</strong> ha caducado y tu firma se ha anulado automáticamente.</p>
      <p>Si quieres reanudarlo con las mismas o nuevas condiciones, puedes regenerar el contrato desde la plataforma.</p>
      <p><a href="${url}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Ver el contrato</a></p>
    `,
  });
}

/**
 * Sent to the receiver of a negotiation proposal (chat offer).
 */
export async function sendNegotiationOfferEmail(
  email: string,
  nombre: string,
  data: {
    transaccionId: string;
    productoNombre: string;
    proposerName: string;
    isSeller: boolean;
    summary: string;
  },
): Promise<void> {
  const url = `${APP_URL}/${data.isSeller ? 'seller' : 'buyer'}/messages?tx=${data.transaccionId}`;
  await sendEmail({
    to: email,
    subject: `Nueva propuesta de negociación — ${data.productoNombre}`,
    html: `
      <h2>Nueva propuesta de negociación</h2>
      <p>Hola ${nombre}, <strong>${data.proposerName}</strong> te ha enviado una propuesta
         para la operación de <strong>${data.productoNombre}</strong>.</p>
      <p><strong>Cambios propuestos:</strong> ${data.summary}</p>
      <p><a href="${url}" style="display:inline-block;background:#1a1a2e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Ver la propuesta</a></p>
    `,
  });
}

/**
 * Sent to a user that has been banned by admin (Fase 8/9 escalation).
 */
export async function sendUserBannedEmail(
  email: string,
  nombre: string,
  data: {
    motivo: 'bypass' | 'cancelaciones';
    notasAdmin?: string;
  },
): Promise<void> {
  const motivoText = data.motivo === 'bypass'
    ? 'Hemos detectado intentos repetidos de mover la operación fuera de Primar-IA.'
    : 'Hemos detectado un patrón de cancelaciones repetidas con la misma contraparte.';
  await sendEmail({
    to: email,
    subject: 'Tu cuenta de Primar-IA ha sido suspendida',
    html: `
      <h2>Cuenta suspendida</h2>
      <p>Hola ${nombre}, tu cuenta en Primar-IA ha sido suspendida.</p>
      <p><strong>Motivo:</strong> ${motivoText}</p>
      ${data.notasAdmin ? `<p><strong>Notas del equipo:</strong> ${data.notasAdmin}</p>` : ''}
      <p>Si crees que es un error, contacta con soporte@primar-ia.com para revisar tu caso.</p>
    `,
  });
}

export async function sendCertExpiryEmail(
  email: string,
  nombre: string,
  data: {
    certNombre: string;
    diasRestantes: number;
    fechaCaducidad: Date;
  },
): Promise<void> {
  const fechaStr = data.fechaCaducidad.toLocaleDateString('es-ES');
  await sendEmail({
    to: email,
    subject: `Tu certificado "${data.certNombre}" caduca en ${data.diasRestantes} días`,
    html: `
      <h2>Aviso de caducidad de certificado</h2>
      <p>Hola ${nombre}, tu certificado <strong>${data.certNombre}</strong> caduca
         el <strong>${fechaStr}</strong> (en ${data.diasRestantes} días).</p>
      <p>Por favor, renueva tu certificado para mantener tu cuenta activa y seguir operando en la plataforma.</p>
    `,
  });
}
