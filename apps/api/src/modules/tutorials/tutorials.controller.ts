/**
 * Phase 14M — Tutorials progress.
 *
 * Endpoints para marcar tutoriales como completados y resetearlos. El
 * estado persiste en User.tutorialesCompletados (JSON array de IDs).
 *
 * El front consulta el listado vía /auth/profile (que ya devuelve
 * tutorialesCompletados desde Fase 14M).
 */
import type { Request, Response } from 'express';
import { prisma } from '@primaria/database';

const KNOWN_TUTORIALS = ['introduccion', 'crear-lote', 'hacer-pedido', 'incidencia'] as const;
type TutorialId = (typeof KNOWN_TUTORIALS)[number];

function isTutorialId(value: unknown): value is TutorialId {
  return typeof value === 'string' && (KNOWN_TUTORIALS as readonly string[]).includes(value);
}

async function readCompleted(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tutorialesCompletados: true },
  });
  const raw = user?.tutorialesCompletados;
  return Array.isArray(raw) ? (raw as unknown[]).filter((v): v is string => typeof v === 'string') : [];
}

export async function markCompleted(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const id = (req.params['id'] ?? '') as string;
  if (!isTutorialId(id)) {
    res.status(400).json({ success: false, error: 'Tutorial desconocido' });
    return;
  }
  const completed = await readCompleted(userId);
  if (!completed.includes(id)) completed.push(id);
  await prisma.user.update({
    where: { id: userId },
    data: { tutorialesCompletados: completed },
  });
  res.json({ success: true, data: { tutorialesCompletados: completed } });
}

export async function resetTutorial(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const id = (req.params['id'] ?? '') as string;
  if (!isTutorialId(id)) {
    res.status(400).json({ success: false, error: 'Tutorial desconocido' });
    return;
  }
  const completed = (await readCompleted(userId)).filter((c) => c !== id);
  await prisma.user.update({
    where: { id: userId },
    data: { tutorialesCompletados: completed },
  });
  res.json({ success: true, data: { tutorialesCompletados: completed } });
}
