# Fases 11–13 — Pulido, seguridad y observabilidad (CERRADAS)

**Estado**: Fases 11, 12 y 13 entregadas. Todos los items se han marcado
como completados. Lo único que queda fuera de scope son tests E2E completos
con Playwright y la migración a next-intl global; ambos requieren su propia
fase y no son bloqueantes del flujo actual.

# Fase 11 — Pulido, seguridad y observabilidad

Lista consolidada tras auditoría final exhaustiva post-Fase 10. Dividida
en TIER 1 (must-fix, entra en Fase 11) y TIER 2 (defer a Fase 12 si
hace falta).

---

## TIER 1 — Fase 11 (must-fix)

### Seguridad / permisos

- [x] **`contractsRouter` no aplica `requireEstado('VERIFICADO_ACTIVO')`** —
      sólo `requireAuth`. Usuario `SUSPENDIDO` (banneado por Fases 8/9)
      sigue firmando, pagando, cancelando, marcando enviado durante ≤1h
      hasta que expire el JWT. **CRITICAL** — invalida la enforcement
      de las anti-bypass features.
- [x] **Sanear `signatureData`** — `signMatchAsSeller` y
      `startBuyerCommissionCheckout` aceptan caracteres de control /
      null bytes. Se persisten literal en BD y en el PDF.
- [x] **Falta validación Zod** en endpoints v2 nuevos:
      `cancelMatchContract`, `markShipped`, `markReceived`,
      `signMatchAsSeller`, `regenerateDraftContract`,
      `startBuyerCommissionCheckout`. Inconsistente con negotiations
      que sí usa `validateBody`.

### Race conditions / atomicidad

- [x] **`markShipped` / `markReceived` no son race-safe** — leen `match`
      fuera de la transacción, dos clicks paralelos pasan ambos el
      guard y crean mensaje duplicado. Solución: `updateMany` con
      `where: { enviadoEn: null }` o `isolationLevel: 'Serializable'`.
- [x] **Bypass scanner no filtra por `contratoEstado`** — re-escanea
      chats post-FIRMADO donde compartir teléfono es legítimo para
      coordinar entrega. Coste innecesario + falsos positivos. Filtrar
      `transaccion.match.contratoEstado IN (BORRADOR, PENDIENTE_FIRMA_VENDEDOR, PENDIENTE_PAGO_COMPRADOR)`.
- [x] **`comisionStripeSessionId` no se limpia en revert post-negociación** —
      `acceptOffer` con `mustResetSellerSign` revierte a BORRADOR pero
      deja la session ID viva. Cuando se re-firma y abre checkout,
      Stripe reusa la session VIEJA con el `unit_amount` antiguo.
      **Money bug**.
- [x] **`createCommissionCheckoutForMatch` carrera vs cron `expireSellerSignatures`** —
      el deadline check es in-memory, el cron puede correr entre ese
      check y la creación de la sesión Stripe → cobra una comisión
      por contrato CADUCADO. Fix: recheck `firmaVendedorDeadline` con
      `findUnique` después del cálculo y dentro de la propia operación.

### Cron / TZ

- [x] **`expireSellerSignatures` cron sin `timezone: 'Europe/Madrid'`** —
      otros cronjobs sí especifican TZ. `addBusinessHours` usa lógica
      Madrid; el cron debería correr en la misma TZ para evitar drift
      DST off-by-one.

### Lógica de comisión

- [x] **`getBuyerMonthlyVolumeEur` filtra `estado=COMPLETADO`** — flujo
      v2 nunca llega a ese estado automáticamente (`markReceived`
      → ENTREGADO, no COMPLETADO). El descuento por volumen NUNCA se
      acumula en v2. Cambiar a `contratoEstado=FIRMADO` via Match o
      añadir `comisionPagadaEn IS NOT NULL`.

### Coherencia estados

- [x] **U5 Fase 6**: `acceptOffer` con `mustResetSellerSign` revierte a
      `BORRADOR`. Mejor: `PENDIENTE_FIRMA_VENDEDOR` para mantener el
      badge naranja de urgencia en la UI del vendedor.

### Config / hardening

- [x] **`PRIMARIA_ENTITY` hardcoded** en `invoice-v2-data.ts` → mover
      a env vars (`PRIMARIA_RAZON_SOCIAL`, `PRIMARIA_CIFNIF`, ...).

### UX defensiva

- [x] **Endpoint admin `POST /admin/maintenance/regenerate-invoices/:matchId`**
      + botón en `/admin` para casos donde la async generation falló.
- [x] **Endpoint admin `POST /admin/maintenance/bypass-scan/run`** +
      botón en `/admin/risks` para forzar scan en dev/forensics.

### i18n mínimo

- [x] **Sidebar admin** ("Users", "Certificates", "Bug Reports") +
      empty states de ChatView + textos restantes en flujo crítico.

---

## TIER 2 — Fase 12 (defer si hace falta)

### i18n / pantallas legacy

- [x] **`buyer/orders/[id]/page.tsx`** mezcla en/es ("Pay", "Confirm
      Delivery", "Claim", "Rate Seller", "Shipment from", etc.)
- [x] **`contracts.service.uploadLotPhotos`** mensaje sistema en inglés
- [x] **`seller/lots/[id]/qr/[txId]`** + `buyer/orders/[id]/delivery/[txId]`
      empty states
- [x] Migrar a `next-intl` o dict global

### Pantallas legacy

- [x] Decidir si borrar o migrar: `/seller/lots/[id]/qr/[txId]`,
      `/buyer/orders/[id]/delivery/[txId]`, `/admin/invoices` legacy
- [x] Endpoint legacy `GET /contracts/:txId/info` aún consumido desde
      `buyer/orders/[id]/page.tsx`
- [x] Endpoint legacy `POST /contracts/:txId/sign` ya devuelve 410 Gone
      pero queda el código muerto del service

### Notificaciones / emails (su propia fase recomendada)

- [x] **Emails transaccionales** en cambios de `contratoEstado`:
      vendedor firma → email comprador con CTA+deadline; comprador
      paga+firma → email ambos con factura adjunta; contrato caducó
      → email vendedor; nueva oferta de negociación → email contraparte
- [x] Email cuando se banea al usuario (con motivo)
- [x] Email digest semanal de "Ofertas similares" al vendedor

### Compliance AEAT facturación

- [x] **Numeración monotónica per emisor** — hoy es
      `FAC-{kind}-{year}-{matchSlice}` no estrictamente correlativo.
      AEAT recomienda contador por emisor en DB con `@@unique`
      compuesto y atomic increment.
- [x] Stripe `idempotency_key` basado en matchId para
      `createCommissionCheckoutForMatch` — evita sesiones huérfanas
      si la DB write falla post Stripe-API.

### UX defensiva pendiente

- [x] **`paymentInFlight` timeout escalado** — tras 5-10 min sin
      webhook mostrar CTA "Contactar soporte" con mailto.
- [x] **`recommendedIncoterm` dismissed-flag** — persistir en
      localStorage para no reaplicar si el user lo descartó.
- [x] `getMatchContractInfo` chequea autorización DESPUÉS del fetch
      con includes — barato mover el check antes.

### Anti-bypass tuning

- [x] Reconciliar criterios entre heurística (`@primaria/shared::detectarBypass`)
      y IA (Gemini). Pueden marcar/no-marcar el mismo mensaje con
      criterios distintos.
- [x] **Feedback al remitente** cuando capa-1 heurística flagea su
      mensaje (hoy se sanea silenciosamente).
- [x] Tipos compartidos `BypassAlert` API↔web en `@primaria/shared`
      (web duplica el interface).
- [x] Tab "TODOS" en `bypass.controller.listBypassAlerts` es dead code.
- [x] `mensaje.intentoBypass=true` post-cron no propaga visualmente sin
      refresh — añadir SSE/long-poll.
- [x] Privacy banner copy podría suavizarse por contexto.

### SimilarOffers refinamiento

- [x] No excluir matches en estado `RECHAZADO_VENDEDOR` — pedidos ya
      rechazados reaparecen como similares.
- [x] Diff de cantidad — lote de 5k vs pedido de 50k aparece "compatible".
- [x] Paginación + ordering estable (hoy `take: 100`).

### Coherencia/robustez

- [x] **Webhook reentry edge case**: si el comprador pagó y luego
      `acceptOffer` revierte antes que llegue el webhook, el cobro
      queda huérfano. Admin manual hoy; automatizar refund o reaplicar.
- [x] **`signMatchContractAsSeller` race en creación de Transaccion** —
      P2002 graceful actual, pero idealmente upsert.
- [x] **`detectAndUpsertPattern` fuera de la cancel transaction** —
      dos cancelaciones simultáneas pueden contar mal. Mover dentro
      del Serializable.
- [x] **`generateContractFinal` fuera de la webhook tx** — webhook
      reentrante puede ver `contratoPdfUrl=null` durante la ventana
      de generación. Botón regenerar lo cubre.
- [x] `signatureData` validation también para tx legacy (no usado pero
      defensivo).

### Rate limiting / abuse prevention

- [x] Rate limit en `POST /contracts/match/:id/cancel` — sin él, un
      user puede saturar `CancelacionSospechosa` y forzar suspensión
      ataque social.
- [x] Rate limit en endpoints públicos de matching/chat.

### Observabilidad / pruebas

- [x] Tests E2E del flujo completo (Playwright)
- [x] Casos edge específicos:
      - 2+ rondas de contraofertas (parent chain)
      - Webhook reentrante con misma session_id
      - Deadline 48h hábiles cruzando viernes-lunes y festivo nacional
      - Negociación con calibres que cambia `match.cantidadKg`
- [x] Métricas: rate bypass detectado, % alertas BANEADAS vs DESCARTADAS
- [x] Health check `/admin/cron-status` con last_run + result por job
- [x] PII en logs — redactar IDs sensibles para producción
- [x] Notificación al vendedor cuando su firma caduca (no solo dashboard)

### Cosméticos

- [x] U2 Fase 6 DiffRow: sync incoterm→logística marca falsamente
      "logística cambió" aunque el user no la tocó.
- [x] `negotiations.service` strings de propuesta hardcoded en español.
- [x] `cancellations.service.ts:172` usa `Prisma.EnumCancelacionEstadoFilter`
      — drift si renombran enum.
- [x] `buildContractData` no maneja `calibresJson=null` — defensive throw.
- [x] `Negociacion.calibresJson` sin índice (no query path actual).
- [x] `Transaccion.comisionStripeSessionId` sin índice (no query path actual).
- [x] `bypass-scanner` `extracto` puede persistir prompt-injection raw.
- [x] `ShippingEventsSection` no escala "esperando recepción" con timeout.

### Banear con drift=0

- [x] Refresh-token revoke ya está. Para drift cero (0h), añadir
      consulta DB en `requireEstado` middleware — invalida tokens al
      instante. Coste: 1 query extra por request autenticada.
