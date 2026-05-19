/**
 * Phase 6 — Structured negotiation service for the v2 matchmaker flow.
 *
 * A proposal may carry any subset of:
 *   - precioKg, incoterm, logistica, terminoPago, calibres
 *
 * Acceptance writes to the Phase-4 v2 fields on the Match:
 *   match.precioKgFinal, .incotermFinal, .logisticaFinal, .terminoPagoFinal,
 *   .calibresJson  → these are what the contract PDF builder reads.
 *
 * Contract state machine guards:
 *   - BORRADOR / PENDIENTE_FIRMA_VENDEDOR → negotiation is free, just regen
 *     the draft after accept.
 *   - PENDIENTE_PAGO_COMPRADOR → seller already signed. Accepting a proposal
 *     means terms changed; we MUST invalidate the seller's signature and
 *     revert estado to BORRADOR so the seller re-signs.
 *   - FIRMADO → both parties signed + commission paid. Negotiation is blocked.
 *   - CADUCADO / CANCELADO → blocked.
 */
import { prisma, Prisma } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';
import {
  logisticaFromIncoterm,
  isIncotermAllowedForLogistica,
  type Incoterm,
  type LogisticaPreferencia,
  type TerminoPago,
} from '@primaria/shared';
import type { CreateOfertaInput } from './negotiations.schema.js';

interface CalibreSnapshot {
  calibre: string;
  cantidad_kg: number;
}

export class NegotiationsService {
  private async verifyParticipant(transaccionId: string, userId: string) {
    const tx = await prisma.transaccion.findUnique({
      where: { id: transaccionId },
      select: {
        vendedorId: true,
        compradorId: true,
        estado: true,
        qrUsado: true,
        match: { select: { contratoEstado: true, id: true } },
      },
    });
    if (!tx) throw new AppError('Transacción no encontrada', 404);
    if (tx.vendedorId !== userId && tx.compradorId !== userId) {
      throw new AppError('No eres participante de esta transacción', 403);
    }
    if (tx.qrUsado) {
      throw new AppError('No se puede negociar después de confirmar la entrega', 400);
    }
    if (['CANCELADO', 'COMPLETADO', 'ENTREGADO'].includes(tx.estado)) {
      throw new AppError('No se puede negociar en esta transacción', 400);
    }
    // Phase 6 — contract-state guards.
    const contratoEstado = tx.match?.contratoEstado;
    if (contratoEstado === 'FIRMADO') {
      throw new AppError('No se puede negociar: el contrato ya está firmado por ambas partes', 400);
    }
    if (contratoEstado === 'CADUCADO' || contratoEstado === 'CANCELADO') {
      throw new AppError('No se puede negociar: el contrato está caducado o cancelado', 400);
    }
    return tx;
  }

  async createOffer(transaccionId: string, iniciadorId: string, input: CreateOfertaInput) {
    await this.verifyParticipant(transaccionId, iniciadorId);

    // If counter-offer, mark parent as SUPERADA
    if (input.parentId) {
      const parent = await prisma.negociacion.findUnique({
        where: { id: input.parentId },
        select: { transaccionId: true, estado: true },
      });
      if (!parent || parent.transaccionId !== transaccionId) {
        throw new AppError('Oferta padre no encontrada', 404);
      }
      if (parent.estado !== 'PENDIENTE') {
        throw new AppError('Esta oferta ya no está pendiente', 400);
      }
      await prisma.negociacion.update({
        where: { id: input.parentId },
        data: { estado: 'SUPERADA' },
      });
    }

    const precioKgDecimal = input.precioKg !== undefined
      ? new Prisma.Decimal(input.precioKg)
      : null;

    const negociacion = await prisma.negociacion.create({
      data: {
        transaccionId,
        iniciadorId,
        precioKg: precioKgDecimal,
        incoterm: (input.incoterm ?? null) as Incoterm | null,
        logistica: (input.logistica ?? null) as LogisticaPreferencia | null,
        terminoPago: (input.terminoPago ?? null) as TerminoPago | null,
        calibresJson: input.calibres ? (input.calibres as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        parentId: input.parentId ?? null,
      },
    });

    // Build a human-readable preview for the message bubble.
    const parts: string[] = [];
    if (input.precioKg !== undefined) parts.push(`Precio: €${input.precioKg.toFixed(4)}/kg`);
    if (input.incoterm) parts.push(`Incoterm: ${input.incoterm}`);
    if (input.logistica) parts.push(`Logística: ${input.logistica}`);
    if (input.terminoPago) parts.push(`Pago: ${input.terminoPago}`);
    if (input.calibres) {
      const totalKg = input.calibres.reduce((s, c) => s + c.cantidad_kg, 0);
      parts.push(`Calibres: ${input.calibres.length} (${totalKg.toLocaleString('es-ES')} kg)`);
    }
    const contenido = `💬 Propuesta de negociación — ${parts.join(' · ')}`;

    const mensaje = await prisma.mensaje.create({
      data: {
        transaccionId,
        remitenteId: iniciadorId,
        contenido,
        tipo: 'OFERTA',
        negociacionId: negociacion.id,
      },
    });

    // Phase 12 — notify the COUNTERPARTY by email so they don't depend on
    // dashboard polling to see the new proposal. Fire-and-forget.
    void (async () => {
      try {
        const tx = await prisma.transaccion.findUnique({
          where: { id: transaccionId },
          select: {
            vendedorId: true,
            compradorId: true,
            vendedor: { select: { email: true, nombre: true, apellidos: true } },
            comprador: { select: { email: true, nombre: true, apellidos: true } },
            match: { select: { lote: { select: { producto: { select: { nombre: true } } } } } },
          },
        });
        if (!tx) return;
        const isInicSeller = tx.vendedorId === iniciadorId;
        const receiver = isInicSeller ? tx.comprador : tx.vendedor;
        const proposer = isInicSeller ? tx.vendedor : tx.comprador;
        const { sendNegotiationOfferEmail } = await import('../../shared/emails/transactional.js');
        // Summary same parts we built for the message.
        const summary = parts.join(' · ');
        await sendNegotiationOfferEmail(receiver.email, receiver.nombre, {
          transaccionId,
          productoNombre: tx.match?.lote?.producto?.nombre ?? 'tu operación',
          proposerName: `${proposer.nombre} ${proposer.apellidos}`.trim(),
          // From the receiver's POV: if initiator was seller, receiver is buyer.
          isSeller: !isInicSeller,
          summary,
        });
      } catch (err) {
        console.error('[email] sendNegotiationOfferEmail failed for tx', transaccionId, err);
      }
    })();

    return { negociacion, mensaje };
  }

  async acceptOffer(transaccionId: string, userId: string, negociacionId: string) {
    const txCtx = await this.verifyParticipant(transaccionId, userId);

    const neg = await prisma.negociacion.findUnique({
      where: { id: negociacionId },
      select: {
        transaccionId: true,
        iniciadorId: true,
        precioKg: true,
        incoterm: true,
        logistica: true,
        terminoPago: true,
        calibresJson: true,
        estado: true,
      },
    });
    if (!neg || neg.transaccionId !== transaccionId) {
      throw new AppError('Oferta no encontrada', 404);
    }
    if (neg.estado !== 'PENDIENTE') {
      throw new AppError('Esta oferta ya no está pendiente', 400);
    }
    if (neg.iniciadorId === userId) {
      throw new AppError('No puedes aceptar tu propia oferta', 400);
    }

    const matchId = txCtx.match?.id;
    if (!matchId) throw new AppError('Match no encontrado', 404);

    // Derive a coherent (incoterm, logística) pair from the proposal. The user
    // may have submitted only one; we snap the other.
    const proposedIncoterm = neg.incoterm as Incoterm | null;
    const proposedLogistica = neg.logistica as LogisticaPreferencia | null;
    let finalIncoterm: Incoterm | null = proposedIncoterm;
    let finalLogistica: LogisticaPreferencia | null = proposedLogistica;
    if (proposedIncoterm && !proposedLogistica) {
      // Derive: snap logística to the unambiguous side (YO_ENVIO or OTRO_RECOGE).
      finalLogistica = logisticaFromIncoterm(proposedIncoterm);
    } else if (proposedLogistica && !proposedIncoterm) {
      // Just write the logística — but verify it's coherent with the
      // currently-effective incoterm. If not, reject and force the user to
      // include an incoterm change too (avoid leaving the match in an
      // inconsistent state).
      if (proposedLogistica !== 'INDIFERENTE') {
        const currentMatch = await prisma.match.findUnique({
          where: { id: matchId },
          select: {
            incotermFinal: true,
            pedido: { select: { incoterm: true } },
          },
        });
        const currentIncoterm = (currentMatch?.incotermFinal ?? currentMatch?.pedido?.incoterm ?? null) as Incoterm | null;
        if (currentIncoterm && !isIncotermAllowedForLogistica(currentIncoterm, proposedLogistica)) {
          throw new AppError(
            `La nueva logística "${proposedLogistica}" no es compatible con el incoterm vigente ${currentIncoterm}. `
            + `La propuesta debe incluir también un cambio de incoterm.`,
            400,
          );
        }
      }
      finalIncoterm = null;
    } else if (proposedIncoterm && proposedLogistica) {
      // Sanity: both present, must be compatible. The Zod schema enforces this
      // at create time, but a stale offer could theoretically slip through.
      if (!isIncotermAllowedForLogistica(proposedIncoterm, proposedLogistica)) {
        throw new AppError(
          `Combinación inválida: incoterm ${proposedIncoterm} no es compatible con logística ${proposedLogistica}`,
          400,
        );
      }
    }

    // Calibres: parse JSON if present, recompute cantidadTotalKg.
    const proposedCalibres = (neg.calibresJson as unknown as CalibreSnapshot[] | null) ?? null;
    let newCantidadTotalKg: number | null = null;
    if (proposedCalibres && proposedCalibres.length > 0) {
      newCantidadTotalKg = proposedCalibres.reduce((s, c) => s + Number(c.cantidad_kg), 0);
    }

    // Whether the seller's signature must be invalidated (contract reverts to
    // BORRADOR) — happens only when the seller had already signed.
    const contratoEstado = txCtx.match?.contratoEstado;
    const mustResetSellerSign = contratoEstado === 'PENDIENTE_PAGO_COMPRADOR';

    await prisma.$transaction(async (tx) => {
      // 1) Mark this offer accepted.
      await tx.negociacion.update({
        where: { id: negociacionId },
        data: { estado: 'ACEPTADA' },
      });

      // 2) Write to match's v2 final fields (single update, only changed cols).
      const matchUpdate: Record<string, unknown> = {};
      if (neg.precioKg !== null) {
        matchUpdate['precioKgFinal'] = neg.precioKg;
        // Keep legacy precioKg in sync so any old reader still sees current value.
        matchUpdate['precioKg'] = neg.precioKg;
      }
      if (finalIncoterm !== null) matchUpdate['incotermFinal'] = finalIncoterm;
      if (finalLogistica !== null) matchUpdate['logisticaFinal'] = finalLogistica;
      if (neg.terminoPago !== null) matchUpdate['terminoPagoFinal'] = neg.terminoPago;
      if (proposedCalibres) {
        matchUpdate['calibresJson'] = proposedCalibres as unknown as Prisma.InputJsonValue;
        if (newCantidadTotalKg !== null) {
          matchUpdate['cantidadKg'] = newCantidadTotalKg;
        }
      }
      // 3) If seller had already signed, revert contract so the new terms
      //    force a re-sign. We go to PENDIENTE_FIRMA_VENDEDOR (not BORRADOR)
      //    so the seller's dashboard keeps the orange "Pendiente tu firma"
      //    urgency badge — the contract already exists; we're just asking
      //    for a fresh signature on the updated terms.
      //    The cron's deadline tracking is cleared explicitly here.
      if (mustResetSellerSign) {
        matchUpdate['contratoEstado'] = 'PENDIENTE_FIRMA_VENDEDOR';
        matchUpdate['firmaVendedorDeadline'] = null;
      }
      if (Object.keys(matchUpdate).length > 0) {
        await tx.match.update({ where: { id: matchId }, data: matchUpdate });
      }

      // 4) Legacy compatibility: keep pedido.incoterm in sync if changed.
      //    (Read by old code paths that don't yet know about incotermFinal.)
      if (finalIncoterm !== null) {
        const matchInfo = await tx.match.findUnique({
          where: { id: matchId },
          select: { pedidoId: true },
        });
        if (matchInfo?.pedidoId) {
          await tx.pedido.update({
            where: { id: matchInfo.pedidoId },
            data: { incoterm: finalIncoterm },
          });
        }
      }

      // 5) Update transaccion totals (precio + cantidad) so dashboards stay
      //    consistent. precioTotal = cantidadKg * precioKg, both potentially
      //    changed in this offer.
      const matchAfter = await tx.match.findUnique({
        where: { id: matchId },
        select: { cantidadKg: true, precioKg: true },
      });
      if (matchAfter) {
        const newTotal = Number(matchAfter.cantidadKg) * Number(matchAfter.precioKg);
        const txPatch: Record<string, unknown> = { precioTotal: newTotal };
        if (proposedCalibres && newCantidadTotalKg !== null) {
          txPatch['cantidadKg'] = newCantidadTotalKg;
        }
        // Clear seller signature in the same atomic step.
        // Also clear comisionStripeSessionId — if the buyer had opened a
        // checkout session for the OLD price, the new terms make that
        // session invalid; reusing it post-revert would charge the wrong
        // amount. Stripe session expires on its own (24h TTL) but we
        // forget the reference now so createCommissionCheckoutForMatch
        // creates a fresh session with the updated commission.
        if (mustResetSellerSign) {
          txPatch['firmaVendedor'] = null;
          txPatch['firmaVendedorFecha'] = null;
          txPatch['comisionStripeSessionId'] = null;
        }
        await tx.transaccion.update({
          where: { id: transaccionId },
          data: txPatch,
        });
      }
    }, { isolationLevel: 'Serializable' });

    // Build a system message confirming acceptance.
    const partes: string[] = [];
    if (neg.precioKg !== null) partes.push(`Precio: €${Number(neg.precioKg).toFixed(4)}/kg`);
    if (finalIncoterm) partes.push(`Incoterm: ${finalIncoterm}`);
    if (finalLogistica) partes.push(`Logística: ${finalLogistica}`);
    if (neg.terminoPago) partes.push(`Pago: ${neg.terminoPago}`);
    if (proposedCalibres) partes.push(`Calibres: ${proposedCalibres.length}`);
    const suffix = mustResetSellerSign
      ? ' — el vendedor deberá volver a firmar el contrato con las nuevas condiciones.'
      : '';
    await prisma.mensaje.create({
      data: {
        transaccionId,
        remitenteId: userId,
        contenido: `✅ Propuesta aceptada — ${partes.join(' · ')}.${suffix}`,
        tipo: 'TEXTO',
      },
    });

    // Regenerate the contract draft SYNCHRONOUSLY before responding. The
    // regen also recomputes match.comisionEstimada from the new totals — if we
    // returned before this completes and the buyer immediately hit
    // "Firmar y pagar", Stripe Checkout would charge the OLD commission.
    // Adding ~1-3s to the accept response is an acceptable trade for that.
    let regenerated = true;
    try {
      const { contractsService } = await import('../contracts/contracts.service.js');
      await contractsService.generateContractDraft(matchId);
    } catch (err) {
      regenerated = false;
      console.error('[negotiations] draft regeneration failed after accept:', err);
    }

    return {
      accepted: true,
      contractRegenerationTriggered: regenerated,
      sellerMustResign: mustResetSellerSign,
    };
  }

  async rejectOffer(transaccionId: string, userId: string, negociacionId: string) {
    await this.verifyParticipant(transaccionId, userId);

    const neg = await prisma.negociacion.findUnique({
      where: { id: negociacionId },
      select: { transaccionId: true, iniciadorId: true, estado: true },
    });
    if (!neg || neg.transaccionId !== transaccionId) {
      throw new AppError('Oferta no encontrada', 404);
    }
    if (neg.estado !== 'PENDIENTE') {
      throw new AppError('Esta oferta ya no está pendiente', 400);
    }
    if (neg.iniciadorId === userId) {
      throw new AppError('No puedes rechazar tu propia oferta', 400);
    }

    await prisma.negociacion.update({
      where: { id: negociacionId },
      data: { estado: 'RECHAZADA' },
    });

    await prisma.mensaje.create({
      data: {
        transaccionId,
        remitenteId: userId,
        contenido: '❌ Propuesta rechazada.',
        tipo: 'TEXTO',
      },
    });

    return { rejected: true };
  }
}

export const negotiationsService = new NegotiationsService();
