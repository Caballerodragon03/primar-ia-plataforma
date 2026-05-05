import { detectarBypass, sanitizarMensaje } from '@primaria/shared';

describe('detectarBypass', () => {
  describe('Phone numbers', () => {
    it('detects Spanish mobile number with country code', () => {
      expect(detectarBypass('Call me at +34 612 345 678')).toBe(true);
    });

    it('detects 9-digit numeric sequence (order number-like)', () => {
      expect(detectarBypass('My order 123456789')).toBe(true);
    });

    it('detects phone number without country code', () => {
      expect(detectarBypass('my number is 612345678')).toBe(true);
    });
  });

  describe('Email addresses', () => {
    it('detects email address in message', () => {
      expect(detectarBypass('Email me at test@example.com')).toBe(true);
    });

    it('detects email with subdomain', () => {
      expect(detectarBypass('contact me at user@mail.domain.org')).toBe(true);
    });
  });

  describe('Messaging apps', () => {
    it('detects WhatsApp mention (case-insensitive)', () => {
      expect(detectarBypass("Let's use WhatsApp")).toBe(true);
    });

    it('detects lowercase whatsapp', () => {
      expect(detectarBypass('contact via whatsapp')).toBe(true);
    });

    it('detects Telegram', () => {
      expect(detectarBypass('Message me on Telegram')).toBe(true);
    });

    it('detects Signal', () => {
      expect(detectarBypass('Use Signal for privacy')).toBe(true);
    });

    it('detects wa.me link', () => {
      expect(detectarBypass('chat at wa.me/34612345678')).toBe(true);
    });

    it('detects t.me link', () => {
      expect(detectarBypass('join at t.me/mychannel')).toBe(true);
    });
  });

  describe('Clean messages', () => {
    it('returns false for a legitimate product review', () => {
      expect(detectarBypass('Great product, 5 stars!')).toBe(false);
    });

    it('returns false for a simple product inquiry', () => {
      expect(detectarBypass('Is this product certified organic?')).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(detectarBypass('')).toBe(false);
    });
  });
});

describe('sanitizarMensaje', () => {
  it('returns bypassDetected=true and the trimmed text when bypass found', () => {
    const msg = '  Call me at +34 612 345 678  ';
    const { sanitized, bypassDetected } = sanitizarMensaje(msg);
    expect(bypassDetected).toBe(true);
    expect(sanitized).toBe(msg.trim());
  });

  it('returns bypassDetected=false for a safe message', () => {
    const { bypassDetected, sanitized } = sanitizarMensaje('Nice produce!');
    expect(bypassDetected).toBe(false);
    expect(sanitized).toBe('Nice produce!');
  });

  it('trims leading and trailing whitespace from the returned string', () => {
    const { sanitized } = sanitizarMensaje('   hello   ');
    expect(sanitized).toBe('hello');
  });

  it('returns sanitized string and bypassDetected for email', () => {
    const { sanitized, bypassDetected } = sanitizarMensaje('write to buyer@market.com');
    expect(bypassDetected).toBe(true);
    expect(typeof sanitized).toBe('string');
  });
});
