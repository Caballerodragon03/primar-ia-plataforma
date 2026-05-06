# PRIMAR-IA — Contexto Maestro para Claude Code v5.0
*Actualizado el 2026-05-06 — PRODUCCIÓN LIVE. Scoring de fiabilidad, incidencias con chat, matching v2 (7 componentes + geocoding), admin incidents panel, rating modal.*

---

## INSTRUCCIONES PARA CLAUDE CODE

Eres el desarrollador principal de Primar-IA. Este documento contiene TODO el contexto necesario.

**Estado actual:** El proyecto está en `/Users/efrenbravo/Desktop/Personal/primar-ia/Primar-IA Plataforma`

**TODAS LAS FASES 1A-1F están COMPLETAS.** La plataforma está **LIVE en producción**. El siguiente paso es testing funcional con usuarios reales y iteración sobre bugs.

**Skill de diseño:** Cuando llegues a implementar UI nueva, invoca primero la skill `ui-ux-pro-max` para extraer los tokens exactos del Figma antes de escribir código.

**Figma MCP Desktop:** `http://127.0.0.1:3845/mcp` — requiere Figma Desktop con Dev Mode MCP Server activo. Archivo: "11. Primar-IA V2 FINAL", fileKey: `Nnp1cPlWcrE7Bii9lr2z9b`

---

## 1. QUÉ ES PRIMAR-IA

Marketplace B2B digital que conecta productores agrícolas españoles (pequeños y medianos) con compradores/distribuidores, eliminando intermediarios. Posicionado como "la lonja digital" del sector primario en España.

**Estado del proyecto (mayo 2026):**
- **PRODUCCIÓN LIVE** — app.primar-ia.com (frontend) + api.primar-ia.com (backend)
- Web WordPress activa en primar-ia.com (alojada en IONOS — NO tocar)
- 101 pre-registros verificados
- Diseño Figma completo (44 pantallas analizadas)
- Validación con productores reales en Valencia, Murcia, Andalucía
- Validación internacional con Früchte Adam GmbH (Alemania)
- Respaldado por Santander X Explorer y ESIC Emprendedores
- GitHub: https://github.com/Caballerodragon03/primar-ia-plataforma.git

**Modelo de negocio:**
- Comisión pagada SOLO por el comprador (escala progresiva OneScale):
  - ≤ 2.000€ → 4,0%
  - 2.000–10.000€ → 3,0%
  - 10.000–50.000€ → 2,2% (mín 49€ / máx 2.500€)
  - > 50.000€ → 2,0%
- Descuento de -0,4pp si paga por SEPA Direct Debit
- Suscripciones mensuales opcionales (Fase 2, meses 6-9)

---

## 2. STACK TÉCNICO COMPLETO (CONFIRMADO)

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Monorepo | **Turborepo** | Apps + packages compartidos |
| Backend | **Node.js + Express + TypeScript** | App `apps/api`, puerto 3001 |
| ORM | **Prisma** | Package `packages/database` |
| Base de datos | **PostgreSQL** | Railway managed |
| Cache | **Redis** | Railway managed (ioredis) |
| Frontend | **Next.js 14.2.35 + React 18** | App Router, app `apps/web`, puerto 3000 |
| UI Components | **Tailwind CSS** | Tokens Figma, `packages/ui` (shadcn/ui en Fase 2) |
| Estado global | **Zustand** | Con persist middleware |
| Formularios | **React Hook Form + Zod** | Validación isomórfica |
| Tablas | **TanStack Table** | My Orders, My Lots |
| Gráficas | **Recharts** | Analytics dashboards |
| Autenticación | **JWT manual + bcrypt** | Sin NextAuth — roles complejos |
| Pagos | **Stripe Connect Express** | Destination Charges, manual capture |
| Email | **Resend + React Email** | Package `packages/email`, DNS verificado |
| Storage | **Cloudflare R2** | Compatible S3 SDK, egress gratis |
| Jobs | **node-cron** | En `apps/api` |
| PDF | **PDFKit** | Contratos + facturas |
| QR | **qrcode + HMAC-SHA256** | packages/shared |
| Testing | **Jest + Supertest** | Tests unitarios + integración |
| Hosting | **Railway** | Producción live, auto-deploy on push |
| DNS | **IONOS** | dominio primar-ia.com, subdominios app/api → Railway |

### TypeScript — Configuración crítica
- **`apps/api/tsconfig.json`** usa `"module": "Node16", "moduleResolution": "node16"` — OBLIGATORIO para resolver workspace packages via exports field.
- **`apps/web/tsconfig.json`** path alias `@/*` → `./*` (sin `src/`), excluye `e2e/` y `playwright.config.ts`
- **Packages exportan `./dist/index.js`** (JS compilado, NO raw .ts) — crítico para producción

### Stripe Connect
- Tipo cuenta: **Express**
- Charge type: **Destination Charges** (un vendedor por transacción)
- `capture_method: "manual"` — pre-autoriza, captura al confirmar QR
- Webhooks: `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`, `charge.dispute.created`, `payout.paid`
- Webhook URL: `https://api.primar-ia.com/api/v1/stripe/webhook`
- Stripe gestiona KYC, PCI-DSS, AML, IBANs — Primar-IA nunca toca el dinero

### JWT Auth
```typescript
interface JWTPayload {
  sub: string;        // user.id
  role: UserRole;     // VENDEDOR | COMPRADOR | ADMIN
  estado: UserEstado;
  empresa_id: string | null;
  iat: number;
  exp: number;
}
// Access token: 15 minutos
// Refresh token: UUID opaco en BD, 30 días, HttpOnly cookie
// Lockout: 5 intentos fallidos → bloqueo 15 min
// Rate limiting on /refresh endpoint
```

### QR de entrega (HMAC-SHA256)
```typescript
const payload = `${transaccion_id}:${comprador_id}:${timestamp}`;
const signature = createHmac('sha256', QR_HMAC_SECRET).update(payload).digest('hex');
// Token válido 48h, un solo uso (atomic updateMany), timing-safe (crypto.timingSafeEqual)
```

---

## 3. PRODUCCIÓN — RAILWAY DEPLOYMENT

### URLs de producción
```
Frontend: https://app.primar-ia.com (Railway: primariaweb-production.up.railway.app)
Backend:  https://api.primar-ia.com (Railway: primaria-api-production.up.railway.app)
```

### Docker Build (multi-stage Alpine)
- **API**: `apps/api/Dockerfile` — node:20-alpine, compila packages/database + shared + email antes de build API
- **Web**: `apps/web/Dockerfile` — node:20-alpine, standalone output, public dir opcional (wildcard COPY)
- **Ambos requieren**: `apk add --no-cache openssl` para motor Prisma
- **Root fallbacks**: `Dockerfile.api`, `Dockerfile.web` (por si Railway no encuentra los de apps/)
- **Auto-deploy**: push a `main` → Railway rebuilds automáticamente

### Variables de entorno en Railway (producción)

**API Service:**
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:{password}@trolley.proxy.rlwy.net:{port}/railway
REDIS_URL=redis://default:{password}@trolley.proxy.rlwy.net:26374
JWT_SECRET={generado}
JWT_REFRESH_SECRET={generado}
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
QR_HMAC_SECRET={generado}
STRIPE_SECRET_KEY={real key configurada}
STRIPE_WEBHOOK_SECRET={real key configurada}
RESEND_API_KEY={real key configurada}
EMAIL_FROM=noreply@primar-ia.com
R2_ACCOUNT_ID={configurado}
R2_ACCESS_KEY_ID={configurado}
R2_SECRET_ACCESS_KEY={configurado}
R2_BUCKET_NAME=primaria-uploads
R2_PUBLIC_URL=https://uploads.primar-ia.com
CORS_ORIGIN=https://app.primar-ia.com
```

**Web Service:**
```bash
NEXT_PUBLIC_API_URL=https://api.primar-ia.com
```

### Variables desarrollo LOCAL
```bash
# apps/api/.env
DATABASE_URL=postgresql://postgres:ztxZCEvnEuizujuvsnwTmMGaERteCNBG@shortline.proxy.rlwy.net:54236/railway
REDIS_URL=redis://default:EOUmoIMQERKmCXoXAMNmmIIBTlgKEIlz@shortline.proxy.rlwy.net:37898
CORS_ORIGIN=http://localhost:3000

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### GitHub
- Repo: https://github.com/Caballerodragon03/primar-ia-plataforma.git
- Auth: macOS Keychain configurado (credential.helper=osxkeychain)
- Branch: main (direct push, auto-deploy)

### Migración de BD
- **Migración 1:** `20260423154131_init` — schema base
- **Migración 2:** `20260506155239_scoring_incidents_matching` — scoring, DisputaMensaje, ScoreEvent
- **Schema actual:** 20 modelos, 22 enums

---

## 4. SECURITY HARDENING (aplicado 2026-05-05)

### Cambios críticos aplicados (24 archivos, 455 insertions)

**Race Conditions (resueltas):**
- QR verification: atomic `updateMany` con WHERE `qrUsado: false`, check `count === 0`
- Payment creation: `prisma.$transaction` con `isolationLevel: 'Serializable'`
- Matching contributeToOrder: serializable transaction prevent double-contribution

**Auth & Access Control:**
- Next.js edge middleware (`apps/web/middleware.ts`): redirige no-auth desde `/buyer/*`, `/seller/*`, `/admin/*`
- Client-side auth guards en dashboard y admin layouts
- Rate limiting en `/refresh` endpoint y webhook
- Singleton refresh token pattern en API client (evita race condition en refresh)

**Input Validation:**
- Zod schema en admin state update route (`admin.schema.ts`)
- HTTPS-only validation en chat file URLs + max 100 mensajeIds
- Signature size limit (500KB) + photoUrls array validation
- Page parameter: `Math.max(1, parseInt(...) || 1)`

**Secrets & Config:**
- Placeholder detection: process crashes on boot if env contains 'sk_test_placeholder', etc.
- Removed dev endpoints (`/dev/reset-password`, `/dev/unlock-accounts`, `/dev/users`)
- Health check pings DB with `SELECT 1`, returns 503 on failure
- QR secret from env var only (no fallback default), timingSafeEqual comparison

**Infrastructure:**
- Graceful shutdown: SIGTERM/SIGINT closes HTTP, Prisma, Redis
- Redis reconnect strategy with exponential backoff + reconnectOnError for READONLY
- JSON body limit reduced from 10mb to 1mb
- API client timeout: 15000ms

**Frontend:**
- HSTS + Permissions-Policy headers in next.config.mjs
- Mobile touch support for signature canvas (onTouchStart/Move/End)
- Camera cleanup on delivery page unmount
- Removed raw card/IBAN inputs from PaymentModal (Stripe-only secure processing)

---

## 5. FIXES / GOTCHAS CONOCIDOS

| Problema | Causa | Solución aplicada |
|---------|-------|------------------|
| `Cannot find module '@primaria/database'` | tsconfig usaba `module: CommonJS` | Cambiar a `module: Node16, moduleResolution: node16` en apps/api/tsconfig.json |
| API arranca pero no lee env vars | dotenv no se importaba | Añadir `import 'dotenv/config'` como PRIMERA línea de apps/api/src/index.ts |
| `Error: Configuring Next.js via 'next.config.ts'` | Next.js 14 no soporta config .ts | Renombrar a next.config.mjs con export default |
| Stripe/Resend/R2 bloquean arranque en dev | Zod schema requería min(1) | `.default('placeholder')` en env.ts (PRODUCTION crashea si es placeholder) |
| `@/*` alias no resuelve | Era `./src/*` pero no hay carpeta src/ | Corregir a `./*` en apps/web/tsconfig.json |
| Puerto Railway swap | 54236 es PG (no Redis) | DATABASE_URL usa 54236, REDIS_URL usa 37898 |
| Packages TS en producción | Exports apuntaban a `.ts` raw | Cambiar a `./dist/index.js`, añadir build scripts, compilar en Dockerfile |
| Prisma libssl missing en Alpine | Motor binario necesita OpenSSL | `apk add --no-cache openssl` en builder Y runner |
| DATABASE_URL internal no funciona | Servicios en redes diferentes | Usar URL pública (proxy) de Railway |
| `as const` error con Prisma | Readonly array incompatible | Cast `as TransaccionEstado[]` |

---

## 6. USUARIOS Y ROLES

### Estados de usuario
```
REGISTRO → EMAIL_NO_VERIFICADO → EMAIL_VERIFICADO (tras verificar email)
                                       │
                        ┌──────────────┴──────────────┐
                   [COMPRADOR]                    [VENDEDOR]
              VERIFICADO_ACTIVO           PENDIENTE_VERIFICACION
                                                   │
                                      Admin revisa certificados
                                                   │
                         VERIFICADO_ACTIVO | RECHAZADO | PENDIENTE_ACLARACION
```

> Nota: COMPRADOR pasa a VERIFICADO_ACTIVO directamente al verificar email. VENDEDOR pasa a EMAIL_VERIFICADO primero, luego admin lo verifica manualmente.

### RBAC
| Permiso | ADMIN | VENDEDOR_VERIFICADO | COMPRADOR_ACTIVO |
|---------|-------|---------------------|------------------|
| Ver marketplace | ✓ | ✓ | ✓ |
| Publicar lotes | ✗ | ✓ | ✗ |
| Crear pedidos | ✗ | ✗ | ✓ |
| Mensajería | ✓ | ✓ (tras tx) | ✓ (tras tx) |
| Verificar certificados | ✓ | ✗ | ✗ |
| Ver analytics | Globales | Propios | Propios |
| Subir certificados | ✗ | ✓ | ✗ |

---

## 7. DISEÑO FIGMA — 44 PANTALLAS ANALIZADAS

**Figma:** https://www.figma.com/design/Nnp1cPlWcrE7Bii9lr2z9b/Prima-IA
**Archivo:** "11. Primar-IA V2 FINAL"

### 7.1 Design System

```typescript
// apps/web/tailwind.config.ts — tokens extraídos del Figma (YA CONFIGURADO)
colors: {
  primary: '#E1C44D',      // amarillo dorado — CTAs, progress bars, accents
  secondary: '#5F5C48',    // texto secundario, sidebar icons
  background: '#F8F8F6',   // fondo global (cream)
  surface: '#FFFFFF',      // cards, sidebar
  text: {
    primary: '#1A1A1A',
    secondary: '#6B7280',
    muted: '#9CA3AF',
  },
  status: {
    delivered: '#10B981',  // verde
    inTransit: '#3B82F6',  // azul
    funding: '#E1C44D',    // amarillo
    cancelled: '#EF4444',  // rojo
    pending: '#F59E0B',    // ámbar
    committed: '#10B981',  // verde
  },
  border: '#E5E7EB',
},
fontFamily: { sans: ['Poppins', 'sans-serif'] },
borderRadius: { card: '12px', input: '8px', badge: '20px', button: '8px' },
```

**Componentes base identificados en Figma:**
- `<Sidebar>` — 140px ancho, logo + empresa + usuario arriba, nav con iconos, CTA amarillo abajo
- `<Header>` — público: logo izq + nav links der; app: breadcrumb + notificaciones
- `<DataTable>` — tabs All/Open/In Progress/Full/Cancelled + barra búsqueda + columnas con badges
- `<CoverageBar>` — barra de progreso amarilla con % texto
- `<StatusBadge>` — pill coloreado según estado
- `<StepProgress>` — stepper horizontal: Confirmed→Ready→In Transit→Delivered
- `<KPICard>` — número grande + % variación + label
- `<MatchCard>` — Profitability Index + producto + precio + destino + distancia + % filled + CTA
- `<FileDropzone>` — dashed border, icono nube, "Upload a file or drag and drop"
- `<ChatWindow>` — panel izq (conversaciones) + panel der (mensajes) + input con adjunto

### 7.2-7.4 Pantallas (44 total — sin cambios desde v3)

Auth: Sign-In, Register Steps 1-4, Confirm Submission
Buyer: Dashboard, New Order, Pre-Authorize Modal, Order Live, Contract, My Orders, Order Details, QR Scan, Confirm Reception, Chat, Report Issue, Profile, Analytics
Seller: Dashboard, My Lots, Publish Lot, Matches (scroll), Contribute Modal, Lot Detail, Mark Ready, Chat, Analytics, Profile, Report Issue, Historic Data

*(Ver Figma directamente para detalles de cada pantalla — fileKey: Nnp1cPlWcrE7Bii9lr2z9b)*

---

## 8. ESTRUCTURA DE CARPETAS — ESTADO ACTUAL

```
/Users/efrenbravo/Desktop/Personal/primar-ia/Primar-IA Plataforma/
├── .env                              ← credenciales raíz
├── Dockerfile.api                    ← Root fallback para Railway
├── Dockerfile.web                    ← Root fallback para Railway
├── package.json                      ← Turborepo workspace root
├── turbo.json
├── tsconfig.base.json                ← Base TS config (es2022, NodeNext)
│
├── apps/
│   ├── api/
│   │   ├── .env                      ← credenciales API local
│   │   ├── Dockerfile                ← Multi-stage Alpine build (PRODUCCIÓN)
│   │   ├── package.json
│   │   ├── tsconfig.json             ← module: Node16, moduleResolution: node16
│   │   └── src/
│   │       ├── index.ts              ← dotenv FIRST + graceful shutdown handler
│   │       ├── app.ts                ← Express: helmet, cors, compression, rate limiting (NO dev endpoints)
│   │       ├── config/
│   │       │   └── env.ts            ← Zod schema + placeholder crash detection in production
│   │       ├── middleware/
│   │       │   ├── auth.middleware.ts      ← requireAuth, requireRole, requireEstado
│   │       │   ├── error.middleware.ts     ← AppError class + global handler
│   │       │   ├── rateLimiter.middleware.ts ← authRateLimiter (10/15min), apiRateLimiter (100/min)
│   │       │   └── validate.middleware.ts  ← Zod body validator
│   │       ├── shared/
│   │       │   └── redis.ts          ← Singleton ioredis + reconnect strategy
│   │       └── modules/
│   │           ├── auth/             ← register, login, verifyEmail, refreshTokens, logout
│   │           ├── lots/             ← CRUD + cancel + analytics
│   │           ├── orders/           ← CRUD + detail
│   │           ├── matching/         ← algorithm + contribute (serializable tx)
│   │           ├── contracts/        ← PDF generation + QR HMAC (timingSafeEqual)
│   │           ├── disputes/         ← create + respond + resolverAdmin (multi-acción) + chat DisputaMensaje
│   │           ├── scoring/          ← ScoringService (event-sourcing) + admin penalty/incentivo endpoints
│   │           ├── chat/             ← messages + bypass detection + pagination
│   │           ├── products/         ← catalog CRUD
│   │           ├── stripe/           ← webhooks + onboarding + QR verification (atomic)
│   │           ├── upload/           ← R2 file upload
│   │           ├── matching/         ← algorithm v2 (7 componentes) + geocoding.service.ts (Nominatim)
│   │           └── admin/            ← user/cert verification + Zod validation
│   │
│   └── web/
│       ├── .env.local                ← NEXT_PUBLIC_API_URL
│       ├── Dockerfile                ← Multi-stage Alpine standalone build
│       ├── middleware.ts             ← Edge middleware: auth redirect for /buyer/*, /seller/*, /admin/*
│       ├── next.config.mjs           ← Security headers (HSTS, Permissions-Policy, X-Frame-Options)
│       ├── tailwind.config.ts        ← Design tokens Figma
│       ├── app/
│       │   ├── (auth)/login/, register/ (4-step)
│       │   ├── (dashboard)/
│       │   │   ├── layout.tsx        ← Auth guard + Sidebar + Header
│       │   │   ├── buyer/            ← page, orders/[id], orders/[id]/contract/[txId], orders/[id]/delivery/[txId], messages/, analytics/, profile/
│       │   │   └── seller/           ← page, lots/[id], lots/[id]/contract/[txId], lots/[id]/qr/[txId], lots/new, matches/, messages/, analytics/, profile/
│       │   └── admin/
│       │       ├── layout.tsx        ← ADMIN role guard + nav con Incidentes link
│       │       ├── dashboard/
│       │       ├── users/
│       │       ├── certificates/
│       │       └── incidents/        ← Lista incidentes + [id] detalle (evidencias, chat, resolución)
│       ├── components/ui/            ← Button, Input, Select, StepProgress, FileDropzone, KPICard, PaymentModal (Stripe-only), ScoreBadge (estrellas)
│       ├── components/layout/        ← Sidebar, DashboardHeader
│       ├── lib/api.ts                ← Axios + interceptor + timeout 15s + singleton refresh
│       └── store/auth.store.ts       ← Zustand persist
│
└── packages/
    ├── database/
    │   ├── package.json              ← exports: ./dist/index.js (compiled)
    │   ├── src/index.ts              ← PrismaClient singleton
    │   └── prisma/schema.prisma      ← 18 modelos, 20 enums
    ├── shared/
    │   ├── package.json              ← exports: ./dist/index.js (compiled)
    │   └── src/                      ← types, commission, bypass-detector, qr
    ├── email/
    │   ├── package.json              ← exports: ./dist/index.js (compiled)
    │   └── src/templates/            ← 5 templates React Email
    └── ui/
        └── src/index.ts
```

---

## 9. SCHEMA PRISMA COMPLETO (AS MIGRATED — migration 20260423154131_init)

*(Sin cambios desde v3 — 18 modelos, 20 enums. Ver schema.prisma directamente si se necesita referencia.)*

**Modelos (20):** User, Empresa, Certificado, Producto, Variedad, Lote, Pedido, Match, Transaccion, Mensaje, Valoracion, Disputa, **DisputaMensaje**, DatosMercado, Suscripcion, RefreshToken, EmailToken, Auditoria, BannedEntry, **ScoreEvent**

**Campos nuevos en modelos existentes:**
- `User`: scoreFiabilidad Decimal?, scoreStatus ScoreStatus, transaccionesOk Int, transaccionesIncid Int, ratingMedio Decimal?, numValoraciones Int
- `Pedido`: destinoLat Float?, destinoLng Float? (geocodificado automáticamente desde destinoFinal via Nominatim)
- `Disputa`: penalizacionComprador/Vendedor, incentivoComprador/Vendedor, suscripcionGratisUserId, relación mensajes DisputaMensaje[]
- `Suscripcion`: comoCompensacion Boolean, compensacionMeses Int?

**Enums clave:**
- UserRole: VENDEDOR | COMPRADOR | ADMIN
- UserEstado: EMAIL_NO_VERIFICADO → EMAIL_VERIFICADO → PENDIENTE_VERIFICACION → VERIFICADO_ACTIVO | RECHAZADO | PENDIENTE_ACLARACION | SUSPENDIDO
- **ScoreStatus:** NEW_USER | ACTIVE | RESTRICTED
- **ScoreEventTipo:** PRIMERA_TRANSACCION | TRANSACCION_OK | INCIDENCIA_ABIERTA | DISPUTA_RESUELTA_CONTRA | DISPUTA_RESUELTA_FAVOR | RATING_RECIBIDO | ADMIN_PENALIZACION | ADMIN_INCENTIVO
- LoteEstado: BORRADOR | ACTIVO | PARCIALMENTE_VENDIDO | VENDIDO | EXPIRADO | CANCELADO
- PedidoEstado: BORRADOR | ACTIVO | PARCIALMENTE_CUBIERTO | TOTALMENTE_CUBIERTO | CERRADO | CANCELADO
- TransaccionEstado: PENDIENTE_PAGO | PAGO_CAPTURADO | EN_TRANSITO | ENTREGADO | EN_DISPUTA | COMPLETADO | CANCELADO | REEMBOLSADO

---

## 10. LÓGICA DE NEGOCIO CLAVE

### Cálculo de comisiones (packages/shared/src/commission.ts — IMPLEMENTADO)
```typescript
calcularComision(importeBase: number, metodoPago: 'card' | 'sepa_debit')
// Returns: { importe, porcentaje, total }
// Tiers: ≤2k→4% | 2k-10k→3% | 10k-50k→2.2%(min 49€/max 2500€) | >50k→2%
// SEPA: -0.4pp
```

### Algoritmo de Matching v2 (IMPLEMENTADO — matching.service.ts)
```
Score = 0.30*rentabilidad + 0.25*fiabilidad + 0.15*proximidad + 0.10*recencia + 0.10*cobertura + 0.05*certMatch + 0.05*afinidad

Filtros DUROS (excluyen candidatos):
1. Producto coincide
2. Variedad compatible
3. Calibres/precio compatibles
4. scoreStatus !== 'RESTRICTED'
5. Al menos un calibre con stock (cantidad_kg > 0)

Componentes:
- rentabilidad: precio lote / precio máximo pedido (ponderado por kg)
- fiabilidad: scoreFiabilidad/100 (NEW_USER con <5 tx → 0.75 beneficio de duda)
- proximidad: Haversine(lote.coordenadas, pedido.destinoLat/Lng) / 800km — Nominatim geocoding
- recencia: lotes <30 días puntúan más
- cobertura: kg disponibles / kg solicitados (favorece un solo lote grande)
- certMatch: 1.0 neutro (pendiente campo pedido)
- afinidad: historial exitoso entre el par (≥3tx=1.0, 1-2=0.7, 0=0.5, disputa contra=0.0)

Anti-monopolio: si top-5 son del mismo vendedor → intercala otro en posición 3
Sort by precio: ?sortBy=precio → ordena por precioKg asc en vez de score desc
Geocoding: Nominatim (OSS, User-Agent: PrimAria/1.0) con caché en memoria 7 días y rate limit 1100ms
```

### Sistema de Scoring de Fiabilidad (IMPLEMENTADO — scoring module)
```
- Score: 0–100, clampado. NULL = NEW_USER (badge gris, sin número)
- ScoreStatus: NEW_USER → ACTIVE (primera tx) → RESTRICTED (score < 40)
- Conversión a estrellas: ≥90=5★ | 75-89=4★ | 60-74=3★ | 40-59=2★ | <40=1★
- Event-sourcing: toda mutación crea ScoreEvent (auditable)
- Deltas por defecto: PRIMERA_TRANSACCION(+100) | INCIDENCIA_ABIERTA(-2) |
  DISPUTA_CONTRA(-10...-25) | RATING_RECIBIDO((media-4)*2, solo si ≥3 ratings) |
  ADMIN_PENALIZACION(configurable -50..0) | ADMIN_INCENTIVO(configurable 0..+25)
- Visibilidad: pública solo en estrellas; historial detallado solo para admin
- Influye en matching (fiabilidad 25%) y filtro duro RESTRICTED

Endpoints: GET /api/v1/scoring/:userId/history (admin)
           POST /api/v1/scoring/:userId/penalty (admin, -50 a 0)
           POST /api/v1/scoring/:userId/incentivo (admin, 0 a +25)
```

### Gestión de Incidencias con Chat (IMPLEMENTADO)
```
Flujo:
1. Comprador/vendedor abre disputa (POST /api/v1/disputes/:transaccionId)
   → form: tipoProblema + descripción + hasta 6 imágenes R2
   → -2 score al denunciado (provisional)
2. Otra parte responde con evidencias (POST /api/v1/disputes/:id/respond)
3. Admin ve incidencia en /admin/incidents → chat tripartito (DisputaMensaje)
4. Admin resuelve (POST /api/v1/disputes/:id/resolve-admin):
   - Resolución: FAVOR_COMPRADOR/VENDEDOR/PARCIAL/ACUERDO_PARTES
   - Penalización score comprador: -50..0
   - Penalización score vendedor: -50..0
   - Incentivo score comprador: 0..+25
   - Incentivo score vendedor: 0..+25
   - Suscripción gratuita 1 mes a comprador o vendedor
   - Banear comprador y/o vendedor (BannedEntry + estado=SUSPENDIDO)
   → Todo en transacción Prisma atómica
   → Scoring se aplica fuera de la tx (no rollback si falla)
```

### Detección bypass en mensajería (IMPLEMENTADO)
```typescript
// Patrones bloqueados:
/(\+34|0034)[\s-]?\d{9}/   // Teléfonos españoles
/[\w.-]+@[\w.-]+\.\w+/     // Emails
/whatsapp|telegram|signal|wechat/i  // Apps mensajería
/\b\d{9}\b/                 // Números 9 dígitos
```

### Estados de transacción — Máquina de estados
```
PENDIENTE_PAGO → PAGO_CAPTURADO (Stripe confirma pre-auth)
PAGO_CAPTURADO → EN_TRANSITO (vendedor marca listo, QR generado)
EN_TRANSITO → ENTREGADO (comprador escanea QR — atomic single-use)
ENTREGADO → COMPLETADO (pago capturado) | EN_DISPUTA
EN_DISPUTA → COMPLETADO | REEMBOLSADO (admin resuelve)
```

---

## 11. COMANDOS DE DESARROLLO

```bash
# Desde la raíz del monorepo
cd "/Users/efrenbravo/Desktop/Personal/primar-ia/Primar-IA Plataforma"

# Arrancar ambos servidores en paralelo
npm run dev

# Solo API (puerto 3001)
cd apps/api && npm run dev

# Solo Web (puerto 3000)
cd apps/web && npm run dev

# Prisma
npm run db:generate    # genera Prisma Client
npm run db:migrate     # ejecuta migraciones pendientes
npm run db:studio      # abre Prisma Studio

# Build completo (incluye compilar packages)
npm run build

# TypeScript check (0 errores esperados)
cd packages/database && npx tsc
cd packages/shared && npx tsc
cd packages/email && npx tsc
cd apps/api && npx tsc --noEmit

# Deploy (auto via push)
git add . && git commit -m "..." && git push origin main
```

---

## 12. PLAN DE IMPLEMENTACIÓN — ESTADO ACTUAL

### ✅ FASE 1A — Cimientos (COMPLETADA)
- [x] Turborepo + packages/database (18 models) + packages/shared + packages/email
- [x] apps/api: Express + TS + auth module + Redis
- [x] apps/web: Next.js 14 + login + register 4-step + Zustand + Axios interceptor
- [x] Railway: PostgreSQL + Redis + migración aplicada

### ✅ FASE 1B — UI Base (COMPLETADA)
- [x] UI Components: Button, Input, Select, StepProgress, FileDropzone, KPICard, SkeletonRow
- [x] Layout: Sidebar (role-aware), DashboardHeader
- [x] Dashboard shells for Buyer and Seller

### ✅ FASE 1C — Stripe + R2 + My Orders/Lots (COMPLETADA)
- [x] Stripe Connect onboarding + webhook handlers
- [x] Cloudflare R2: S3 client + upload
- [x] Resend: email sending (DNS verificado primar-ia.com)
- [x] My Orders Buyer + My Lots Seller
- [x] Publish Lot form + Create New Order form

### ✅ FASE 1D — Core Transaction Flow (COMPLETADA)
- [x] Matching algorithm v1 (cron + manual)
- [x] Matches Seller screen + Contribute modal
- [x] Stripe pre-auth + manual capture on QR confirm
- [x] QR generation + HMAC verification (timing-safe, atomic, 48h)
- [x] PDF contracts (PDFKit)

### ✅ FASE 1E — Operaciones (COMPLETADA)
- [x] Internal chat + bypass detection
- [x] Disputes system
- [x] Analytics (Recharts)
- [x] Profiles + Admin panel
- [x] Cron jobs + transactional emails

### ✅ FASE 1F — QA y Lanzamiento (COMPLETADA)
- [x] Security audit (17 critical + 29 high → ALL FIXED)
- [x] Railway production deploy + Docker multi-stage
- [x] DNS IONOS: app.primar-ia.com + api.primar-ia.com → Railway
- [x] Custom domains active + SSL
- [x] Stripe webhook → production URL
- [x] Git push auto-deploy configured

### ✅ FASE POST-1F — Scoring + Incidencias + Matching v2 (COMPLETADA — 2026-05-06)
- [x] Score de fiabilidad (event-sourcing, ScoreEvent, 0-100, ScoreStatus)
- [x] Sistema de valoraciones bidireccional post-transacción (RatingModal, 5 ejes)
- [x] ScoreBadge component (1-5 estrellas públicas)
- [x] Matching v2: 7 componentes, fiabilidad 25%, anti-monopolio, sort by price
- [x] Geocoding Nominatim (gratis, caché 7 días, rate limit 1100ms)
- [x] Incidencias con imágenes evidencia + chat tripartito (DisputaMensaje)
- [x] Admin panel /incidents: lista + detalle + resolución multi-acción
- [x] Resolución admin: penalizar/incentivar score, suscripción gratis 1 mes, ban
- [x] Prisma migration aplicada en producción (20260506155239_scoring_incidents_matching)
- [x] Reset password flow (forgot-password + reset-password pages)

### 🔲 FASE 2 — Iteración y Beta (PRÓXIMA)
- [ ] Testing funcional end-to-end con usuarios reales (Stripe test keys)
- [ ] Onboard primeros 5-10 pre-registros para beta
- [ ] Fix bugs de producción que surjan
- [ ] Error tracking (Sentry o similar)
- [ ] Stripe test → live keys swap cuando listo para transacciones reales
- [ ] Mobile responsive polish pass
- [ ] SEO + meta tags para páginas públicas
- [ ] Performance monitoring / APM

---

## 13. SEGURIDAD — ESTADO ACTUAL (AUDITADO Y HARDENED)

- Contraseñas: bcrypt factor 12, mínimo 12 chars
- Bloqueo tras 5 intentos fallidos (15 min)
- Rate limiting: 10 intentos/15min (auth + refresh), 100 req/min (API + webhook)
- Headers: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin, HSTS max-age=31536000, Permissions-Policy camera=(self) microphone=() geolocation=()
- Edge middleware + client guards protegen rutas autenticadas
- Archivos: whitelist .pdf/.jpg/.jpeg/.png, max 10MB, rename UUID en R2
- RGPD: consentimientos separados (T&C + Privacy), export JSON, retención 7 años datos fiscales
- Mensajería: regex anti-bypass + log intentos en BD
- Race conditions: serializable transactions en pagos, matching, QR verification
- Graceful shutdown: SIGTERM/SIGINT cierra HTTP + Prisma + Redis
- Placeholder detection: API crashea en boot si env contiene valores placeholder
- No dev endpoints in production
- El IBAN lo almacena Stripe, NO la BD de Primar-IA
- No raw card/IBAN inputs en frontend (Stripe Elements only)

---

## 14. SEEDS — CATÁLOGO INICIAL (pendiente de ejecutar)

```typescript
const PRODUCTOS = [
  { nombre: "Tomate",   variedades: ["RAF", "Cherry", "Pera", "Rama", "Daniela", "Kumato"] },
  { nombre: "Naranja",  variedades: ["Navel", "Valencia", "Navelina", "Lane Late"] },
  { nombre: "Limón",    variedades: ["Fino", "Verna", "Primofiori"] },
  { nombre: "Aguacate", variedades: ["Hass", "Fuerte", "Bacon", "Zutano"] },
  { nombre: "Pimiento", variedades: ["Rojo", "Verde", "Amarillo", "Lamuyo", "California"] },
  { nombre: "Pepino",   variedades: ["Holandés", "Mini", "Ecológico"] },
  { nombre: "Lechuga",  variedades: ["Iceberg", "Romana", "Lollo", "Batavia"] },
  { nombre: "Maíz",     variedades: ["Dulce", "Grado A", "Grado B"] },
  { nombre: "Trigo",    variedades: ["Blando", "Duro", "Ecológico"] },
  { nombre: "Cebada",   variedades: ["Cervecera", "Pienso"] },
  { nombre: "Manzana",  variedades: ["Gala", "Golden", "Fuji", "Granny Smith"] },
  { nombre: "Pera",     variedades: ["Conference", "Blanquilla", "Ercolina"] },
  { nombre: "Soja",     variedades: ["Convencional", "NON-GMO"] },
  { nombre: "Patata",   variedades: ["Kennebec", "Monalisa", "Agria", "Ecológica"] },
];
```

Seed path: `packages/database/prisma/seed/` — incluir index.ts, productos.ts, variedades.ts, admin.ts

---

## 15. NOTAS IMPORTANTES

1. **Dominio primar-ia.com** en IONOS — tiene WordPress activo. El MVP usa subdominios `app.primar-ia.com` y `api.primar-ia.com` apuntando a Railway. NUNCA tocar el dominio raíz.

2. **Stripe en modo TEST** — usar claves `sk_test_...` y `pk_test_...`. Cambiar a live cuando se active la beta con pagos reales.

3. **El chat** solo se habilita DESPUÉS de que hay un match confirmado (transacción creada).

4. **Company Information** en el perfil está **bloqueada** una vez verificada — solo editable contactando a soporte.

5. **"Automated Best Match"** en Matches Seller = mayor score del matching algorithm, sin ML real en MVP.

6. **Contratos PDF** usan plantilla legal española oficial (ANEXO del BOE).

7. **Figma MCP Desktop** en `http://127.0.0.1:3845/mcp` — `claude mcp add --scope user --transport http figma-desktop http://127.0.0.1:3845/mcp`

8. **Skill ui-ux-pro-max** — invocar SIEMPRE antes de implementar nuevas pantallas.

9. **Resend DNS verificado** — emails se envían desde noreply@primar-ia.com.

10. **Auto-deploy configurado** — cada push a main despliega automáticamente en Railway (API + Web).

11. **Git credentials** — macOS Keychain configurado, no hace falta token cada vez.

12. **Packages compilados** — database, shared, email exportan `./dist/index.js`. Si cambias código en packages, ejecuta `npx tsc` en el package antes de verificar API.
