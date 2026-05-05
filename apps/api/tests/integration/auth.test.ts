// Requires DATABASE_URL env var (Railway connection)
// Run with: jest --testPathPattern=integration

import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '@primaria/database';

const TEST_RUN_ID = Date.now();
const TEST_EMAIL = `test-${TEST_RUN_ID}@test.com`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_CIF = `B${String(TEST_RUN_ID).slice(-8)}`;

const VALID_REGISTER_BODY = {
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
  role: 'COMPRADOR',
  nombre: 'Test',
  apellidos: 'User',
  razonSocial: 'Test Company SL',
  cifNif: TEST_CIF,
  direccionFiscal: 'Calle Test 1, Madrid',
  personaContactoLegal: 'Test Person',
  cargoContactoLegal: 'CEO',
};

afterAll(async () => {
  // Clean up test user and related data
  try {
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (user) {
      await prisma.emailToken.deleteMany({ where: { userId: user.id } });
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.empresa.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    // Clean by CIF in case user creation partially failed
    await prisma.empresa.deleteMany({ where: { cifNif: TEST_CIF } });
  } catch {
    // Ignore cleanup errors
  } finally {
    await prisma.$disconnect();
  }
});

describe('POST /api/v1/auth/register', () => {
  it('201: creates user with valid COMPRADOR registration', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(VALID_REGISTER_BODY);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data.user.email).toBe(TEST_EMAIL);
  });

  it('400: rejects registration with missing required field (email)', async () => {
    const { email: _email, ...bodyWithoutEmail } = VALID_REGISTER_BODY;
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(bodyWithoutEmail);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('400: rejects registration with password shorter than 12 characters', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...VALID_REGISTER_BODY, email: `short-pw-${TEST_RUN_ID}@test.com`, password: 'Short1!' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('409: rejects duplicate email registration', async () => {
    // Use the same email registered in the 201 test above
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...VALID_REGISTER_BODY, cifNif: `B${String(TEST_RUN_ID + 1).slice(-8)}` });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('200: returns accessToken for valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, role: 'COMPRADOR' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(typeof res.body.data.accessToken).toBe('string');
  });

  it('401: rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: 'WrongPassword999!', role: 'COMPRADOR' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('400: rejects missing email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: TEST_PASSWORD, role: 'COMPRADOR' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
