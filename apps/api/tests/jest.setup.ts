process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-at-least-32-chars';
process.env.QR_HMAC_SECRET = 'test-qr-hmac-secret-at-least-32-chars-long';
