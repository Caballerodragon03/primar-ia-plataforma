# PRIMAR-IA — Especificación Completa: Sistema de Suscripciones

*Generado el 2026-05-07 — Documento autocontenido para implementación en chat nuevo*

---

## INSTRUCCIONES

Este documento contiene TODA la información necesaria para implementar el sistema de suscripciones de Primar-IA. Léelo completo antes de escribir código. El contexto general de la plataforma está en `PRIMARIA_Contexto_Completo_v5.md` en la raíz del proyecto — consúltalo si necesitas contexto adicional sobre auth, Stripe, schema general, etc.

**Proyecto:** `/Users/efrenbravo/Desktop/Personal/primar-ia/Primar-IA Plataforma`
**Stack:** Turborepo monorepo, Node.js+Express+TypeScript (API), Next.js 14 (Web), Prisma+PostgreSQL, Stripe Connect, Redis

---

## 1. MODELO DE NEGOCIO — CONTEXTO

Primar-IA es un marketplace B2B agrícola que conecta productores españoles con compradores/distribuidores.

**Modelo de ingresos actual (ya implementado):**
- Comisión pagada SOLO por el comprador (escala OneScale):
  - ≤ 2.000€ → 4,0%
  - 2.000–10.000€ → 3,0%
  - 10.000–50.000€ → 2,2% (mín 49€ / máx 2.500€)
  - > 50.000€ → 2,0%
- Descuento -0,4pp si paga por SEPA Direct Debit
- El vendedor NO paga comisión

**Nuevo modelo de ingresos (a implementar):**
- Suscripciones mensuales opcionales para vendedores y compradores
- Tier gratuito funcional (permite cerrar ventas reales sin pagar)
- Tiers de pago desbloquean volumen, velocidad y features avanzadas
- Descuento adicional en comisión SOLO para el plan Central (comprador premium)

---

## 2. PLANES DE SUSCRIPCIÓN — DEFINICIÓN COMPLETA

### 2.1 VENDEDORES (Productores)

Los nombres usan lenguaje del sector agrícola español para generar identidad.

#### Plan COSECHA (Gratuito — 0€/mes)
| Feature | Límite |
|---------|--------|
| Lotes activos simultáneos | 3 |
| Fotos por lote | 3 |
| Visibilidad de matches | Delay de 15 minutos (los matches aparecen 15 min después de generarse) |
| Analytics | Últimos 30 días, solo datos propios |
| Certificados | 3 |
| Negociación en chat (precio/incoterm) | Completa (igual que planes de pago) |
| Badge | Ninguno |
| Soporte | Email (respuesta en 48h) |
| Cambios datos empresa | Contactar con soporte |
| Historial exportable | No |
| Estimación de cosecha | No |

#### Plan CAMPO (19€/mes)
| Feature | Límite |
|---------|--------|
| Lotes activos simultáneos | 15 |
| Fotos por lote | 10 |
| Visibilidad de matches | Inmediata (sin delay) |
| Analytics | Completas (12 meses, comparativas) — SIN tendencias de mercado |
| Certificados | 5 |
| Negociación en chat | Completa |
| Badge | "Vendedor Activo" (visible en cards de match y perfil) |
| Soporte | Prioritario (respuesta en 24h) |
| Cambios datos empresa | Contactar con soporte |
| Historial exportable | CSV |
| Estimación de cosecha | Sí (subir historial Excel → estimación próxima cosecha) |

#### Plan FINCA (49€/mes)
| Feature | Límite |
|---------|--------|
| Lotes activos simultáneos | Ilimitados |
| Fotos por lote | Ilimitadas |
| Visibilidad de matches | Inmediata + alertas push de nuevos pedidos compatibles |
| Analytics | Completas + DatosMercado (tendencias de mercado: precios medios, volúmenes, tendencia UP/DOWN/STABLE) |
| Certificados | Ilimitados |
| Negociación en chat | Completa |
| Badge | "Vendedor Pro" (destaca en búsquedas y cards) |
| Soporte | Prioritario + teléfono |
| Cambios datos empresa | Contactar con soporte |
| Historial exportable | CSV + PDF con informes |
| Estimación de cosecha | Sí (subir historial Excel → estimación próxima cosecha) |

### 2.2 COMPRADORES (Distribuidores)

#### Plan MERCADO (Gratuito — 0€/mes)
| Feature | Límite |
|---------|--------|
| Pedidos activos simultáneos | 5 |
| Analytics | Últimos 30 días, solo datos propios |
| Descuento en comisión | 0 (paga la comisión OneScale estándar) |
| Negociación en chat (precio/incoterm) | Completa (igual que planes de pago) |
| Badge | Ninguno |
| Soporte | Email (respuesta en 48h) |
| Cambios datos empresa | Contactar con soporte |
| Descargar facturas/contratos | Sí |
| Exportar estadísticas | No |

#### Plan LONJA (29€/mes)
| Feature | Límite |
|---------|--------|
| Pedidos activos simultáneos | 20 |
| Analytics | Completas (12 meses, comparativas) — SIN tendencias de mercado |
| Descuento en comisión | 0 (sin descuento) |
| Negociación en chat | Completa |
| Badge | "Comprador Verificado" (visible en perfil y transacciones) |
| Soporte | Prioritario (respuesta en 24h) |
| Cambios datos empresa | Contactar con soporte |
| Descargar facturas/contratos | Sí |
| Exportar estadísticas | No |

#### Plan CENTRAL (89€/mes)
| Feature | Límite |
|---------|--------|
| Pedidos activos simultáneos | Ilimitados |
| Analytics | Completas + DatosMercado (tendencias de mercado) |
| Descuento en comisión | -0,4pp sobre la comisión OneScale |
| Negociación en chat | Completa |
| Badge | "Comprador Premium" (destaca en transacciones) |
| Soporte | Dedicado + teléfono |
| Cambios datos empresa | Contactar con soporte |
| Descargar facturas/contratos | Sí |
| Exportar estadísticas | Sí (CSV + PDF) |

### 2.3 NOTAS IMPORTANTES SOBRE EL MODELO

1. **Los compradores NO hacen matching.** Son los vendedores quienes ven pedidos compatibles y contribuyen sus lotes. Por tanto, los compradores no tienen "visibilidad de matches" ni "filtros de marketplace" — solo publican pedidos y reciben contribuciones.

2. **El delay de 15 minutos en matches (Cosecha)** es el mecanismo clave de monetización para vendedores. Los productores con plan de pago ven las oportunidades antes y pueden reservar los mejores pedidos, dejando las sobras para los free.

3. **El descuento en comisión (-0.4pp)** solo aplica al plan Central de compradores. Se implementa como un parámetro adicional en `calcularComision()`. Ejemplo: un pedido de 5.000€ normalmente paga 3% = 150€. Con Central paga 2.6% = 130€. Con 7+ pedidos/mes de ese tamaño, el plan de 89€ se paga solo.

4. **La estimación de cosecha** es una feature exclusiva de planes de pago (Campo + Finca). Consiste en: el vendedor sube un archivo Excel con su historial de cosechas anteriores (producto, variedad, temporada, calibres, kg por calibre). La plataforma calcula una estimación de la próxima cosecha usando media ponderada de las últimas temporadas. Si el vendedor no tiene historial en la plataforma, puede subir su historial anterior.

5. **Negociación en chat** (precio/incoterm, estilo Wallapop) es IGUAL para todos los planes. No se limita por suscripción.

6. **Facturas y contratos** son descargables por TODOS los planes. La exportación de estadísticas (CSV/PDF de analytics) sí está limitada por plan.

---

## 3. ESTADO ACTUAL DEL CÓDIGO — QUÉ EXISTE Y QUÉ NO

### 3.1 LO QUE YA EXISTE

**Modelo Prisma `Suscripcion` (schema.prisma líneas 556-573):**
```prisma
model Suscripcion {
  id                   String            @id @default(cuid())
  userId               String            @unique @map("user_id")
  plan                 String            // ← ACTUALMENTE: string genérico, hay que cambiarlo
  stripeSubscriptionId String?           @unique @map("stripe_subscription_id")
  stripeCustomerId     String?           @map("stripe_customer_id")
  estado               SuscripcionEstado @default(ACTIVA)
  fechaInicio          DateTime          @map("fecha_inicio")
  fechaFin             DateTime?         @map("fecha_fin")
  comoCompensacion     Boolean           @default(false) @map("como_compensacion")
  compensacionMeses    Int?              @map("compensacion_meses")
  createdAt            DateTime          @default(now()) @map("created_at")
  updatedAt            DateTime          @updatedAt @map("updated_at")

  user                 User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("suscripciones")
}

enum SuscripcionEstado { ACTIVA  CANCELADA  PAUSADA  TRIAL }
```

**Stripe integration (apps/api/src/modules/stripe/stripe.service.ts — 327 líneas):**
- `createOnboardingLink()` — onboarding vendedor Express account
- `getAccountStatus()` — verifica estado onboarding
- `createPaymentIntent()` — pre-autorización con capture_method: 'manual'
- `capturePayment()` — captura pago tras QR
- `handleWebhook()` — maneja account.updated, payment_intent.succeeded/failed, charge.dispute.created
- **NO tiene:** Stripe Subscriptions, Checkout Sessions, Customer Portal, subscription webhooks

**Comisiones (packages/shared/src/commission.ts):**
```typescript
calcularComision(importeBase: number, metodoPago: 'card' | 'sepa_debit')
// Returns: { importe, porcentaje, total }
// Tiers: ≤2k→4% | 2k-10k→3% | 10k-50k→2.2%(min 49€/max 2500€) | >50k→2%
// SEPA: -0.4pp
// NO tiene: parámetro descuentoPlan
```

**Lots service (apps/api/src/modules/lots/lots.service.ts — 233 líneas):**
- `create(vendedorId, data)` — crea lote, trigger geocoding + matching
- `listByVendedor(vendedorId, tab?)` — lista con coverage
- `update(id, vendedorId, data)` — valida kg ≥ committed
- `cancel(id, vendedorId)` — cancela o marca vendido
- **NO tiene:** check de límites por plan antes de crear

**Orders service (apps/api/src/modules/orders/orders.service.ts — 252 líneas):**
- Misma estructura que lots: create, listByComprador, getById, update, cancel
- **NO tiene:** check de límites por plan

**Matching service (apps/api/src/modules/matching/matching.service.ts):**
- 7 componentes de scoring: producto, variedad, calibre, proximidad (Haversine), precio, fiabilidad, relación previa
- Triggered al publicar lote o pedido
- **NO tiene:** campo `visibleDesde` ni delay por plan

**Auth middleware (apps/api/src/middleware/auth.middleware.ts):**
- `requireAuth` — valida JWT, setea req.userId
- `requireRole(role)` — verifica VENDEDOR/COMPRADOR/ADMIN
- `requireEstado(estado)` — verifica estado usuario
- **NO tiene:** `requirePlanLimit` para verificar suscripción

**Disputas (apps/api/src/modules/disputes/disputes.service.ts):**
- `resolverDisputaAdmin()` líneas 260-281: ya crea suscripciones de compensación con plan='COMPENSACION', estado='ACTIVA', duración 1 mes

### 3.2 LO QUE NO EXISTE (hay que crear)

1. **Módulo de suscripciones en API** — service, controller, routes, schema
2. **Middleware de límites por plan** — check lotes/pedidos activos vs plan
3. **Stripe Subscriptions** — Products, Prices, Checkout Sessions, Customer Portal, webhooks de subscription
4. **Match delay** — campo `visibleDesde` en Match, filtro por plan
5. **Estimación de cosecha** — modelo, servicio, template Excel, endpoint upload
6. **Frontend suscripciones** — páginas de planes, checkout, gestión, uso
7. **Analytics gating** — filtrar datos por plan (30d vs completos vs tendencias mercado)
8. **DatosMercado** — el modelo Prisma existe pero no hay servicio ni datos
9. **Badges en UI** — mostrar plan del usuario en cards/perfil
10. **Export** — CSV/PDF de historial y estadísticas

---

## 4. PLAN DE IMPLEMENTACIÓN — 4 FASES

### FASE S1 — Schema + Backend Core

#### S1.1 — Prisma Migration

Cambios en `packages/database/prisma/schema.prisma`:

```prisma
// NUEVOS ENUMS
enum PlanVendedor {
  COSECHA      // Gratuito
  CAMPO        // 19€/mes
  FINCA        // 49€/mes
}

enum PlanComprador {
  MERCADO      // Gratuito
  LONJA        // 29€/mes
  CENTRAL      // 89€/mes
}

// ACTUALIZAR modelo Suscripcion
model Suscripcion {
  id                   String            @id @default(cuid())
  userId               String            @unique @map("user_id")
  planVendedor         PlanVendedor?     @map("plan_vendedor")    // NULL si es comprador
  planComprador        PlanComprador?    @map("plan_comprador")   // NULL si es vendedor
  stripeSubscriptionId String?           @unique @map("stripe_subscription_id")
  stripeCustomerId     String?           @map("stripe_customer_id")
  stripePriceId        String?           @map("stripe_price_id")
  estado               SuscripcionEstado @default(ACTIVA)
  fechaInicio          DateTime          @map("fecha_inicio")
  fechaFin             DateTime?         @map("fecha_fin")
  trialEndsAt          DateTime?         @map("trial_ends_at")
  cancelledAt          DateTime?         @map("cancelled_at")
  comoCompensacion     Boolean           @default(false) @map("como_compensacion")
  compensacionMeses    Int?              @map("compensacion_meses")
  createdAt            DateTime          @default(now()) @map("created_at")
  updatedAt            DateTime          @updatedAt @map("updated_at")

  user                 User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("suscripciones")
}

// NUEVO modelo para estimación de cosecha
model HistorialCosecha {
  id                String   @id @default(cuid())
  userId            String   @map("user_id")
  productoId        String   @map("producto_id")
  variedadId        String?  @map("variedad_id")
  temporada         String   // "2024-2025", "2025-2026"
  calibres          Json     // [{calibre: "70/80mm", cantidadKg: 5000}, ...]
  archivoExcelUrl   String?  @map("archivo_excel_url")
  estimacionProxima Json?    @map("estimacion_proxima") // resultado del cálculo
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  producto          Producto @relation(fields: [productoId], references: [id])
  variedad          Variedad? @relation(fields: [variedadId], references: [id])

  @@index([userId, productoId])
  @@map("historial_cosechas")
}

// AÑADIR campo en Match para delay
// En el modelo Match existente, añadir:
//   visibleDesde  DateTime  @default(now()) @map("visible_desde")
```

**IMPORTANTE:** También hay que añadir la relación inversa en User (`historialCosechas HistorialCosecha[]`) y en Producto/Variedad (`historialCosechas HistorialCosecha[]`). Eliminar el campo `plan String` antiguo de Suscripcion en la migración.

#### S1.2 — Módulo Suscripciones API

Crear `apps/api/src/modules/subscriptions/`:

**subscription.constants.ts** — Definición centralizada:
```typescript
export const PLAN_LIMITS = {
  // Vendedores
  COSECHA: {
    maxLotesActivos: 3,
    maxFotosPorLote: 3,
    maxCertificados: 3,
    matchDelay: 15 * 60 * 1000, // 15 minutos en ms
    analyticsRango: 30, // días
    analyticsTendencias: false,
    exportCsv: false,
    exportPdf: false,
    estimacionCosecha: false,
    badge: null,
    precio: 0,
    stripePriceId: null,
  },
  CAMPO: {
    maxLotesActivos: 15,
    maxFotosPorLote: 10,
    maxCertificados: 5,
    matchDelay: 0,
    analyticsRango: 365,
    analyticsTendencias: false, // completas PERO sin tendencias de mercado
    exportCsv: true,
    exportPdf: false,
    estimacionCosecha: true,
    badge: 'Vendedor Activo',
    precio: 1900, // céntimos
    stripePriceId: null, // se llena al crear Products en Stripe
  },
  FINCA: {
    maxLotesActivos: Infinity,
    maxFotosPorLote: Infinity,
    maxCertificados: Infinity,
    matchDelay: 0,
    analyticsRango: Infinity,
    analyticsTendencias: true, // completas + DatosMercado
    exportCsv: true,
    exportPdf: true,
    estimacionCosecha: true,
    badge: 'Vendedor Pro',
    precio: 4900,
    stripePriceId: null,
  },

  // Compradores
  MERCADO: {
    maxPedidosActivos: 5,
    descuentoComision: 0,
    analyticsRango: 30,
    analyticsTendencias: false,
    exportEstadisticas: false,
    badge: null,
    precio: 0,
    stripePriceId: null,
  },
  LONJA: {
    maxPedidosActivos: 20,
    descuentoComision: 0,
    analyticsRango: 365,
    analyticsTendencias: false, // completas PERO sin tendencias
    exportEstadisticas: false,
    badge: 'Comprador Verificado',
    precio: 2900,
    stripePriceId: null,
  },
  CENTRAL: {
    maxPedidosActivos: Infinity,
    descuentoComision: 0.004, // -0.4pp
    analyticsRango: Infinity,
    analyticsTendencias: true, // completas + DatosMercado
    exportEstadisticas: true,
    badge: 'Comprador Premium',
    precio: 8900,
    stripePriceId: null,
  },
} as const;
```

**subscription.service.ts** — Métodos:
- `getPlanForUser(userId)` → devuelve plan actual (default COSECHA/MERCADO si no tiene suscripción)
- `getLimitsForUser(userId)` → devuelve PLAN_LIMITS del plan activo
- `checkCanCreateLot(userId)` → cuenta lotes activos vs límite, lanza error si excede
- `checkCanCreateOrder(userId)` → cuenta pedidos activos vs límite
- `createCheckoutSession(userId, plan)` → crea Stripe Checkout Session para suscripción
- `createCustomerPortalSession(userId)` → Stripe Customer Portal para gestión
- `cancelSubscription(userId)` → cancela en Stripe, marca CANCELADA
- `handleSubscriptionWebhook(event)` → procesa eventos Stripe subscription
- `getUsage(userId)` → devuelve { lotesActivos, maxLotes, pedidosActivos, maxPedidos, plan, ... }
- `getComisionDiscount(userId)` → devuelve descuentoComision del plan

**subscription.controller.ts** — Endpoints:
```
GET    /api/subscriptions/plans          → lista planes disponibles según rol
GET    /api/subscriptions/current        → plan actual + uso
POST   /api/subscriptions/checkout       → crea checkout session (body: { plan })
POST   /api/subscriptions/portal         → crea portal session
POST   /api/subscriptions/cancel         → cancela suscripción
GET    /api/subscriptions/usage          → lotes/pedidos activos vs límite
```

**subscription.schema.ts** — Validación Zod:
```typescript
export const checkoutSchema = z.object({
  plan: z.enum(['CAMPO', 'FINCA', 'LONJA', 'CENTRAL']),
});
```

#### S1.3 — Middleware de Límites + Integraciones

**Nuevo middleware `requirePlanLimit.ts`:**
```typescript
// Uso: router.post('/lots', requireAuth, requirePlanLimit('lot'), lotsController.create)
// Verifica que el usuario no ha excedido su límite de lotes/pedidos activos
```

**Actualizar `calcularComision()`** en `packages/shared/src/commission.ts`:
```typescript
// Añadir parámetro opcional:
calcularComision(importeBase: number, metodoPago: 'card' | 'sepa_debit', descuentoPlan: number = 0)
// descuentoPlan es 0.004 para Central, 0 para el resto
// Se resta del porcentaje después del cálculo por tier y SEPA
```

**Actualizar `stripe.service.ts`** — Añadir handlers de webhook:
```typescript
// Nuevos eventos a manejar:
'customer.subscription.created'   → crear/actualizar Suscripcion en BD
'customer.subscription.updated'   → actualizar plan/estado
'customer.subscription.deleted'   → marcar CANCELADA
'invoice.payment_failed'          → notificar usuario, marcar PAUSADA tras X intentos
```

**Actualizar `lots.service.create()`:**
```typescript
// Antes de crear el lote, verificar:
const limits = await subscriptionService.getLimitsForUser(vendedorId);
const activeLots = await prisma.lote.count({ where: { vendedorId, estado: { in: ['ACTIVO', 'PARCIALMENTE_VENDIDO'] } } });
if (activeLots >= limits.maxLotesActivos) {
  throw new AppError(403, 'Has alcanzado el límite de lotes activos de tu plan. Mejora tu plan para publicar más.');
}
// También verificar maxFotosPorLote al procesar fotos
```

**Actualizar `orders.service.create()`:**
```typescript
// Mismo patrón para pedidos activos del comprador
```

**Actualizar `stripe.service.createPaymentIntent()`:**
```typescript
// Al calcular comisión, obtener descuento del plan del comprador:
const descuento = await subscriptionService.getComisionDiscount(compradorId);
const comision = calcularComision(precioTotal, metodoPago, descuento);
```

---

### FASE S2 — Match Delay + Estimación Cosecha

#### S2.1 — Match Delay para Plan Cosecha

**Cambio en modelo Match (schema.prisma):**
```prisma
model Match {
  // ... campos existentes ...
  visibleDesde    DateTime  @default(now()) @map("visible_desde")
  // ...
}
```

**Cambio en matching.service.ts:**
```typescript
// Al crear matches, calcular visibleDesde según plan del vendedor:
const plan = await subscriptionService.getPlanForUser(vendedorId);
const delay = PLAN_LIMITS[plan].matchDelay; // 0 o 900000 (15 min)
const visibleDesde = new Date(Date.now() + delay);

await prisma.match.create({
  data: {
    // ... datos existentes ...
    visibleDesde,
  },
});
```

**Cambio en endpoint de listar matches del vendedor:**
```typescript
// Filtrar por visibleDesde:
const matches = await prisma.match.findMany({
  where: {
    lote: { vendedorId },
    estado: 'PROPUESTO',
    visibleDesde: { lte: new Date() }, // solo mostrar si ya pasó el delay
  },
  orderBy: { scoreMatching: 'desc' },
});
```

#### S2.2 — Estimación de Cosecha

**Nuevo módulo `apps/api/src/modules/harvest-estimation/`:**

**harvest-estimation.service.ts:**
- `getTemplate()` → devuelve URL del template Excel descargable
- `uploadHistorial(userId, file)` → parsea Excel (usar librería `xlsx`), valida formato, guarda en HistorialCosecha
- `calculateEstimation(userId, productoId)` → media ponderada últimas 3 temporadas con ajuste por tendencia
- `getEstimation(userId)` → devuelve todas las estimaciones del usuario

**Template Excel (generar con `xlsx`):**
El template debe tener estas columnas:
| Producto | Variedad | Temporada | Calibre | Cantidad (kg) |
|----------|----------|-----------|---------|---------------|
| Tomate | RAF | 2023-2024 | 70/80mm | 5000 |
| Tomate | RAF | 2023-2024 | 80/90mm | 3000 |
| Tomate | RAF | 2024-2025 | 70/80mm | 5500 |
| Tomate | RAF | 2024-2025 | 80/90mm | 3200 |

**Lógica de estimación:**
```typescript
// Para cada combinación producto+variedad+calibre:
// 1. Obtener cantidades de las últimas 3 temporadas
// 2. Calcular media ponderada (temporada más reciente pesa más):
//    peso_t0 = 0.5, peso_t1 = 0.3, peso_t2 = 0.2
// 3. Si hay tendencia (crecimiento/decrecimiento), ajustar:
//    tendencia = (t0 - t2) / t2
//    estimacion = media_ponderada * (1 + tendencia * 0.3)
// 4. Redondear a enteros
```

**Endpoints:**
```
GET    /api/harvest-estimation/template     → descarga template Excel
POST   /api/harvest-estimation/upload       → sube historial (multipart/form-data)
GET    /api/harvest-estimation/predictions  → devuelve estimaciones
DELETE /api/harvest-estimation/:id          → elimina entrada de historial
```

**Middleware:** Solo accesible para vendedores con plan CAMPO o FINCA:
```typescript
router.use(requireAuth, requireRole('VENDEDOR'), requirePlanFeature('estimacionCosecha'));
```

---

### FASE S3 — Frontend

#### S3.1 — Página de Planes + Checkout

**Nuevas páginas:**
- `apps/web/app/(dashboard)/seller/subscription/page.tsx` — Tabla comparativa Cosecha/Campo/Finca
- `apps/web/app/(dashboard)/buyer/subscription/page.tsx` — Tabla comparativa Mercado/Lonja/Central

**Componentes:**
- `apps/web/components/subscriptions/PlanCard.tsx` — Card individual de plan con: nombre, precio, lista de features, badge "Plan Actual" si aplica, CTA "Mejorar Plan" o "Tu Plan Actual"
- `apps/web/components/subscriptions/PlanComparison.tsx` — Tabla comparativa responsive de los 3 planes
- `apps/web/components/subscriptions/UsageMeter.tsx` — Barra de progreso "Lotes: 2/3" o "Pedidos: 4/5"
- `apps/web/components/subscriptions/UpgradePrompt.tsx` — Modal que aparece cuando el usuario alcanza el límite al intentar crear lote/pedido

**Flujo de checkout:**
1. Usuario hace clic en "Mejorar Plan" en PlanCard
2. Frontend llama `POST /api/subscriptions/checkout` con el plan seleccionado
3. Backend crea Stripe Checkout Session con el Price ID del plan
4. Frontend redirige a Stripe Checkout (URL devuelta por el backend)
5. Stripe redirige de vuelta a `/seller/subscription?success=true` o `?cancelled=true`
6. Webhook de Stripe confirma la suscripción → BD se actualiza

**Gestión de suscripción:**
- Botón "Gestionar suscripción" → Stripe Customer Portal (cambiar plan, cancelar, actualizar tarjeta)

#### S3.2 — Límites en UI + Badges

**En Sidebar (`apps/web/components/layout/Sidebar.tsx`):**
- Mostrar plan actual del usuario debajo del nombre
- Mostrar barra de uso: "Lotes: 2/3" para vendedores, "Pedidos: 3/5" para compradores
- Link "Mejorar plan" si está en plan gratuito

**En formulario crear lote/pedido:**
- Si el usuario ha alcanzado el límite, mostrar `UpgradePrompt` en lugar del formulario
- Si está cerca del límite (ej: 2/3), mostrar banner informativo

**Badges:**
- En `MatchCard` del vendedor: mostrar badge del plan junto al nombre
- En perfil público: mostrar badge
- En cards de transacción: mostrar badge

#### S3.3 — Estimación de Cosecha UI

**Nueva página:** `apps/web/app/(dashboard)/seller/harvest-estimation/page.tsx`

**Contenido:**
1. Botón "Descargar Template Excel" → descarga el template
2. FileDropzone para subir el Excel rellenado
3. Tabla con historial subido (temporadas, productos, cantidades)
4. Panel de "Estimación Próxima Cosecha":
   - Por cada producto+variedad: tabla de calibres con kg estimados
   - Indicador de tendencia (flecha arriba/abajo/estable)
5. Solo visible para Campo/Finca — si Cosecha, mostrar UpgradePrompt

---

### FASE S4 — Analytics Gating + Export

**Lógica de gating en analytics:**

```typescript
// En el endpoint de analytics, filtrar según plan:
const limits = await subscriptionService.getLimitsForUser(userId);

// Filtro de rango temporal
const fechaDesde = limits.analyticsRango === Infinity
  ? undefined // sin límite
  : new Date(Date.now() - limits.analyticsRango * 24 * 60 * 60 * 1000);

// Filtro de tendencias de mercado (DatosMercado)
const includeTendencias = limits.analyticsTendencias;
```

**Gating en frontend:**
- Cosecha/Mercado: mostrar solo sección "Tus datos (últimos 30 días)"
- Campo/Lonja: mostrar secciones completas pero ocultar panel "Tendencias de Mercado" con overlay + CTA upgrade
- Finca/Central: mostrar todo incluyendo DatosMercado

**Export:**
- Vendedores Cosecha: sin export
- Vendedores Campo: botón "Exportar CSV" en analytics
- Vendedores Finca: botones "Exportar CSV" + "Descargar Informe PDF"
- Compradores Mercado/Lonja: sin export de estadísticas (pero sí descargan facturas/contratos desde transacciones)
- Compradores Central: botón "Exportar Estadísticas" en analytics (CSV + PDF)

---

## 5. STRIPE SETUP — PRODUCTOS Y PRECIOS

Crear en Stripe Dashboard (o via API al inicializar):

```typescript
// Productos Stripe
const STRIPE_PRODUCTS = [
  // Vendedores
  { name: 'Primar-IA Campo', description: 'Plan Campo para vendedores - 15 lotes, matches inmediatos, analytics' },
  { name: 'Primar-IA Finca', description: 'Plan Finca para vendedores - Lotes ilimitados, tendencias mercado, estimación cosecha' },
  // Compradores
  { name: 'Primar-IA Lonja', description: 'Plan Lonja para compradores - 20 pedidos, analytics completas' },
  { name: 'Primar-IA Central', description: 'Plan Central para compradores - Pedidos ilimitados, descuento comisión, export' },
];

// Precios (recurring monthly)
const STRIPE_PRICES = [
  { product: 'campo', unit_amount: 1900, currency: 'eur', recurring: { interval: 'month' } },
  { product: 'finca', unit_amount: 4900, currency: 'eur', recurring: { interval: 'month' } },
  { product: 'lonja', unit_amount: 2900, currency: 'eur', recurring: { interval: 'month' } },
  { product: 'central', unit_amount: 8900, currency: 'eur', recurring: { interval: 'month' } },
];
```

**Webhooks adicionales a registrar en Stripe:**
```
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
checkout.session.completed
```

---

## 6. DEPENDENCIAS NUEVAS

**Backend (apps/api):**
```json
{
  "xlsx": "^0.18.5"  // Para parsear/generar Excel de estimación cosecha
}
```
Stripe ya está instalado. No se necesitan más dependencias.

**Frontend (apps/web):**
No se necesitan dependencias nuevas. Stripe Checkout es redirect, no requiere Stripe.js.

---

## 7. ARCHIVOS A CREAR

```
apps/api/src/modules/subscriptions/
├── subscription.constants.ts      ← Planes, límites, precios
├── subscription.service.ts        ← Lógica de negocio
├── subscription.controller.ts     ← Handlers HTTP
├── subscription.routes.ts         ← Rutas Express
└── subscription.schema.ts         ← Validación Zod

apps/api/src/modules/harvest-estimation/
├── harvest-estimation.service.ts  ← Upload Excel, cálculo estimación
├── harvest-estimation.controller.ts
├── harvest-estimation.routes.ts
└── harvest-estimation.schema.ts

apps/api/src/middleware/
└── requirePlanLimit.ts            ← Middleware check límites

apps/web/app/(dashboard)/seller/subscription/
└── page.tsx                       ← Página planes vendedor

apps/web/app/(dashboard)/buyer/subscription/
└── page.tsx                       ← Página planes comprador

apps/web/app/(dashboard)/seller/harvest-estimation/
└── page.tsx                       ← Estimación de cosecha

apps/web/components/subscriptions/
├── PlanCard.tsx                   ← Card individual de plan
├── PlanComparison.tsx             ← Tabla comparativa
├── UsageMeter.tsx                 ← Barra uso lotes/pedidos
└── UpgradePrompt.tsx              ← Modal upgrade al alcanzar límite
```

## 8. ARCHIVOS A MODIFICAR

```
packages/database/prisma/schema.prisma          ← Nuevos enums + modelo HistorialCosecha + campo visibleDesde en Match
packages/shared/src/commission.ts                ← Añadir parámetro descuentoPlan
apps/api/src/modules/stripe/stripe.service.ts    ← Añadir subscription webhooks
apps/api/src/modules/lots/lots.service.ts        ← Check límites en create()
apps/api/src/modules/orders/orders.service.ts    ← Check límites en create()
apps/api/src/modules/matching/matching.service.ts ← Añadir delay visibleDesde
apps/api/src/app.ts                              ← Registrar nuevas rutas
apps/web/components/layout/Sidebar.tsx           ← Mostrar plan + uso
```

---

## 9. NOTAS DE IMPLEMENTACIÓN

1. **Usuarios sin suscripción = plan gratuito.** Si un usuario no tiene registro en tabla `suscripciones`, se trata como COSECHA (vendedor) o MERCADO (comprador). No es necesario crear un registro de suscripción para el free tier.

2. **Compensación por disputas** ya funciona (comoCompensacion=true). Al implementar los nuevos planes, la suscripción de compensación debe mantener los beneficios del plan más alto (FINCA/CENTRAL) durante el periodo de compensación.

3. **El delay de 15 minutos** NO ralentiza la creación del match. El match se crea instantáneamente en BD, pero el campo `visibleDesde` se setea 15 minutos en el futuro para usuarios Cosecha. Los endpoints de lectura filtran por este campo.

4. **Stripe en modo TEST.** Usar claves `sk_test_...` y `pk_test_...`. Los Products/Prices se crean con precios reales pero en modo test.

5. **No implementar Enterprise por ahora.** El plan Enterprise (contactar ventas) se deja para Fase 3 cuando haya demanda real. No crear Stripe Products para él.

6. **El template Excel** de estimación de cosecha debe generarse programáticamente con `xlsx` e incluir: hoja de instrucciones, hoja de datos con cabeceras pre-formateadas, validaciones de datos (dropdown de productos del catálogo), y ejemplos.

7. **Downgrade automático.** Si un usuario cancela su suscripción, al finalizar el periodo pagado vuelve a COSECHA/MERCADO. Si tiene más lotes/pedidos activos que el límite del free tier, NO se cancelan — simplemente no puede crear nuevos hasta que bajen del límite.
