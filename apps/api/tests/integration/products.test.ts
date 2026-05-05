// Requires DATABASE_URL env var (Railway connection)
// Run with: jest --testPathPattern=integration

import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '@primaria/database';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/v1/products', () => {
  it('200: returns success response with an array of products', async () => {
    const res = await request(app).get('/api/v1/products');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200: each product has id, nombre, and variedades array', async () => {
    const res = await request(app).get('/api/v1/products');

    expect(res.status).toBe(200);
    if (res.body.data.length > 0) {
      const product = res.body.data[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('nombre');
      expect(Array.isArray(product.variedades)).toBe(true);
    }
  });
});

describe('GET /api/v1/products/:id/varieties', () => {
  it('200: returns varieties array for a product that exists in DB', async () => {
    // Fetch a real product from DB to use its ID
    const product = await prisma.producto.findFirst({ where: { activo: true } });

    if (!product) {
      // Skip if no seed data available
      console.warn('No active products found in DB — skipping varieties test');
      return;
    }

    const res = await request(app).get(`/api/v1/products/${product.id}/varieties`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200: returns empty array for a valid-format product ID with no varieties', async () => {
    // A non-existent but valid UUID returns empty array (no 404 on this route)
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app).get(`/api/v1/products/${fakeId}/varieties`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });
});
