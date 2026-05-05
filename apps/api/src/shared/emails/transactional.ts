import { sendEmail } from '../email.js';

export async function sendMatchProposalEmail(
  vendorEmail: string,
  vendorName: string,
  data: {
    pedidoId: string;
    productoNombre: string;
    cantidadKg: number;
    precioKg: number;
    compradorEmpresa: string;
  },
): Promise<void> {
  const total = (data.cantidadKg * data.precioKg).toFixed(2);
  await sendEmail({
    to: vendorEmail,
    subject: `Nueva propuesta de match para ${data.productoNombre}`,
    html: `
      <h2>Nueva propuesta de match</h2>
      <p>Hola ${vendorName}, tienes una nueva propuesta para <strong>${data.productoNombre}</strong>
         del comprador <strong>${data.compradorEmpresa}</strong>.</p>
      <ul>
        <li>Cantidad: <strong>${data.cantidadKg} kg</strong></li>
        <li>Precio: <strong>€${data.precioKg}/kg</strong></li>
        <li>Total estimado: <strong>€${total}</strong></li>
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
