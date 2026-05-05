import { Router } from 'express';
import { prisma } from '@primaria/database';
import fs from 'fs';
import path from 'path';

export const productsRouter = Router();

productsRouter.get('/', async (_req, res) => {
  const products = await prisma.producto.findMany({
    where: { activo: true },
    include: { variedades: true },
    orderBy: { nombre: 'asc' },
  });
  res.json({ success: true, data: products });
});

productsRouter.get('/calendar', (_req, res) => {
  try {
    // process.cwd() = apps/api when running with dev script
    const candidates = [
      path.resolve(process.cwd(), '../../packages/database/prisma/calendar-data.json'),
      path.resolve(process.cwd(), 'packages/database/prisma/calendar-data.json'),
      path.resolve(__dirname, '../../../../../packages/database/prisma/calendar-data.json'),
      path.resolve(__dirname, '../../../../packages/database/prisma/calendar-data.json'),
    ];
    const filePath = candidates.find((p) => fs.existsSync(p));
    if (!filePath) {
      res.status(404).json({ success: false, error: 'Calendar data not found' });
      return;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: 'Calendar data not found' });
  }
});

productsRouter.get('/:id/varieties', async (req, res) => {
  const varieties = await prisma.variedad.findMany({
    where: { productoId: req.params.id },
    orderBy: { nombre: 'asc' },
  });
  res.json({ success: true, data: varieties });
});
