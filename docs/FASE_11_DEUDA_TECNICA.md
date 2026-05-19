# Fase 11 — Pulido, i18n y observabilidad

Lista viva de deuda técnica acumulada de Fases 4-9 que NO es bloqueante
del flujo principal pero hay que limpiar antes de exponer a usuarios
reales. Mantenida durante el desarrollo; al iniciar Fase 11 se cierra
esta lista en tareas concretas.

## i18n / consistencia idiomática

- [ ] Sidebar admin en inglés ("Users", "Certificates", "Bug Reports")
- [ ] `buyer/orders/[id]/page.tsx` mezcla inglés/español ("Pay",
      "Confirm Delivery", "Claim", "Rate Seller", "Shipment from",
      "Lot preparation photos", "Waiting for the seller to sign…")
- [ ] `seller/messages/page.tsx` subtitle ahora en español pero revisar
      ChatView empty states
- [ ] `contracts.service.uploadLotPhotos` mensaje sistema en inglés
- [ ] `seller/lots/[id]/qr/[txId]` empty state texto inglés
- [ ] `buyer/orders/[id]/delivery/[txId]` igual
- [ ] Auditoría: extraer todos los strings a un dict y dejar
      i18n-ready (next-intl o similar)

## Pantallas legacy (Phase 3) que sobreviven

- [ ] Decidir si borrar o migrar:
      - `/seller/lots/[id]/qr/[txId]` (QR & fotos)
      - `/buyer/orders/[id]/delivery/[txId]` (confirmar entrega)
      - `/admin/invoices` legacy (usa `invoice.service` viejo con IVA
        hardcoded 10%, incorrecto para agro)
- [ ] Endpoint legacy `GET /contracts/:txId/info` aún consumido desde
      `buyer/orders/[id]/page.tsx`; los nuevos endpoints match-level
      ya cubren todo
- [ ] Endpoint legacy `POST /contracts/:txId/sign` ya devuelve 410 Gone
      pero queda el código muerto del service

## UX defensiva pendiente

- [ ] **`paymentInFlight` permanente** si webhook nunca llega
      (`buyer/contracts/[matchId]`): tras 5-10 min mostrar CTA
      "Contactar soporte" con mailto
- [ ] Botón "Regenerar facturas" en `seller|buyer/contracts/[matchId]`
      cuando contrato FIRMADO pero alguna URL es null (fallo async)
- [ ] Botón admin "Re-ejecutar bypass scan ahora" en `/admin/risks`
      para dev/forensics
- [ ] `recommendedIncoterm` se re-aplica en cada remount de
      `/seller/lots/new` aunque el usuario lo haya descartado
      conscientemente → persistir flag `dismissedRecommendation` en
      localStorage

## Coherencia de estados / lógica

- [ ] **Fase 6 — U5**: `acceptOffer` con `mustResetSellerSign` setea
      `contratoEstado=BORRADOR`. Mejor: `PENDIENTE_FIRMA_VENDEDOR`
      para mantener el badge naranja de urgencia del vendedor
- [ ] **Fase 6 — U2**: Sync incoterm→logística en
      `NegotiationOfferModal` marca falsamente `logisticaChanged=true`
      aunque el usuario no tocó la logística. Cosmético en DiffRow
- [ ] `getBuyerMonthlyVolumeEur` filtra solo `estado=COMPLETADO`. En el
      flujo v2 el contrato FIRMADO ya implica intención de cierre;
      reconsiderar el filtro para que el descuento por volumen no
      empiece a contar tarde
- [ ] **Banear no es 0-drift**: revocamos refresh tokens pero el
      access token vivo (≤1h) sigue pasando `requireEstado`. Para
      drift=0 añadir consulta DB en middleware

## Fase 5 — facturación AEAT

- [ ] `PRIMARIA_ENTITY` hardcoded en `invoice-v2-data.ts` → mover a
      env vars (RAZON_SOCIAL, CIF, DIRECCION...)
- [ ] **Numeración monotónica per emisor**: hoy es
      `FAC-{kind}-{year}-{matchSlice}` no estrictamente correlativo.
      AEAT recomienda contador por emisor en DB con `@@unique` sobre
      `(emisorCifNif, kind, year, numero)` y atomic increment
- [ ] Carrera Stripe-API vs DB-write en
      `createCommissionCheckoutForMatch`: la sesión se crea en Stripe
      antes de persistir el id. Si falla la DB queda sesión huérfana.
      Solución: idempotency_key de Stripe basado en matchId

## Fase 8 — bypass

- [ ] Reconciliar criterios entre heurística (`@primaria/shared::detectarBypass`)
      y IA (Gemini). Ahora pueden marcar/no-marcar el mismo mensaje
      con criterios distintos
- [ ] **Feedback al remitente** cuando capa-1 heurística flagea su
      mensaje: hoy se sanea silenciosamente
- [ ] Tipos compartidos `BypassAlert` API↔web en `@primaria/shared`
      (web duplica el interface)
- [ ] Tab "TODOS" en `bypass.controller.listBypassAlerts` es dead code
      (validación lo rechaza antes); decidir exponer o borrar
- [ ] `mensaje.intentoBypass=true` post-cron no propaga visualmente
      sin refresh manual del chat
- [ ] Banner privacy: copy podría suavizarse o variar por contexto
      (legítimo vs sospechoso)

## Notificaciones / emails

- [ ] **Emails transaccionales** en cambios de `contratoEstado`:
      vendedor firma → email comprador con CTA+deadline; comprador
      paga+firma → email ambos con factura adjunta; contrato caducó →
      email vendedor; nueva oferta de negociación → email contraparte
- [ ] Email cuando se baneа al usuario (con motivo)
- [ ] Email digest semanal de "Ofertas similares" al vendedor

## Observabilidad / pruebas

- [ ] Tests E2E del flujo completo (Playwright o similar)
- [ ] Casos edge específicos:
      - 2+ rondas de contraofertas (parent chain)
      - Webhook reentrante con misma session_id
      - Deadline 48h hábiles cruzando viernes-lunes y festivo nacional
      - Negociación con calibres que cambia `match.cantidadKg` →
        recalcular `comisionEstimada` (verificar U1 del audit Fase 6)
- [ ] Métricas: rate de bypass detectado, % alertas BANEADAS vs
      DESCARTADAS, ROI de la feature anti-bypass
- [ ] Health check del cron `/admin/cron-status` con last_run + result
      por cada job
