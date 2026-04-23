import { createHmac, timingSafeEqual } from 'crypto';

const QR_VALIDITY_MS = 48 * 60 * 60 * 1000; // 48 hours

export function generarQRToken(
  transaccionId: string,
  compradorId: string,
  secret: string
): { token: string; timestamp: number } {
  const timestamp = Date.now();
  const payload = `${transaccionId}:${compradorId}:${timestamp}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url');
  return { token, timestamp };
}

export function verificarQRToken(
  token: string,
  secret: string
): { valid: boolean; transaccionId?: string; compradorId?: string } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 4) return { valid: false };

    const [transaccionId, compradorId, timestampStr, receivedSig] = parts as [string, string, string, string];
    const timestamp = parseInt(timestampStr, 10);

    // Check expiry
    if (Date.now() - timestamp > QR_VALIDITY_MS) return { valid: false };

    // Timing-safe signature comparison
    const expectedSig = createHmac('sha256', secret)
      .update(`${transaccionId}:${compradorId}:${timestamp}`)
      .digest('hex');

    const sigValid = timingSafeEqual(
      Buffer.from(receivedSig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );

    if (!sigValid) return { valid: false };
    return { valid: true, transaccionId, compradorId };
  } catch {
    return { valid: false };
  }
}
