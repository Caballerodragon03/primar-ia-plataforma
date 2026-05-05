import { generarQRToken, verificarQRToken } from '@primaria/shared';

const TEST_SECRET = 'test_secret_for_qr_tests';

beforeAll(() => {
  process.env.QR_HMAC_SECRET = TEST_SECRET;
});

describe('generarQRToken', () => {
  it('returns a token string and a numeric timestamp', () => {
    const { token, timestamp } = generarQRToken('txn-001', 'buyer-001', TEST_SECRET);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    expect(typeof timestamp).toBe('number');
    expect(timestamp).toBeGreaterThan(0);
  });

  it('generates different tokens for different transaccionIds', () => {
    const { token: t1 } = generarQRToken('txn-001', 'buyer-001', TEST_SECRET);
    const { token: t2 } = generarQRToken('txn-002', 'buyer-001', TEST_SECRET);
    expect(t1).not.toBe(t2);
  });

  it('token is base64url encoded (no +, /, = chars)', () => {
    const { token } = generarQRToken('txn-001', 'buyer-001', TEST_SECRET);
    expect(token).toMatch(/^[A-Za-z0-9\-_]+$/);
  });
});

describe('verificarQRToken', () => {
  it('returns valid=true with transaccionId and compradorId for a fresh token', () => {
    const transaccionId = 'txn-abc-123';
    const compradorId = 'buyer-xyz-456';
    const { token } = generarQRToken(transaccionId, compradorId, TEST_SECRET);

    const result = verificarQRToken(token, TEST_SECRET);
    expect(result.valid).toBe(true);
    expect(result.transaccionId).toBe(transaccionId);
    expect(result.compradorId).toBe(compradorId);
  });

  it('returns valid=false for a tampered token', () => {
    const { token } = generarQRToken('txn-001', 'buyer-001', TEST_SECRET);
    // Decode, tamper, re-encode
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const tampered = decoded.replace('txn-001', 'txn-evil');
    const tamperedToken = Buffer.from(tampered).toString('base64url');

    const result = verificarQRToken(tamperedToken, TEST_SECRET);
    expect(result.valid).toBe(false);
  });

  it('returns valid=false for a token verified with wrong secret', () => {
    const { token } = generarQRToken('txn-001', 'buyer-001', TEST_SECRET);
    const result = verificarQRToken(token, 'wrong_secret');
    expect(result.valid).toBe(false);
  });

  it('returns valid=false for an expired token (49h in the future)', () => {
    const { token } = generarQRToken('txn-001', 'buyer-001', TEST_SECRET);

    const realDateNow = Date.now;
    const FORTY_NINE_HOURS_MS = 49 * 60 * 60 * 1000;
    Date.now = jest.fn(() => realDateNow() + FORTY_NINE_HOURS_MS);

    try {
      const result = verificarQRToken(token, TEST_SECRET);
      expect(result.valid).toBe(false);
    } finally {
      Date.now = realDateNow;
    }
  });

  it('returns valid=false for an empty string token', () => {
    const result = verificarQRToken('', TEST_SECRET);
    expect(result.valid).toBe(false);
  });

  it('returns valid=false for a completely random string', () => {
    const result = verificarQRToken('notavalidtoken', TEST_SECRET);
    expect(result.valid).toBe(false);
  });
});
