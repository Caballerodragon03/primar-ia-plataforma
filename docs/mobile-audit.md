# Auditoría móvil — Phase 0 baseline

**Fecha:** 2026-05-26
**Viewport objetivo:** 375 × 812 (iPhone X estándar)
**Método:** análisis estático del código fuente (Claude Preview bloqueado por `X-Frame-Options: DENY`).
**Estado:** baseline pre-cambios. **Cero modificaciones en este commit.**

---

## TL;DR — el problema raíz

`app/(dashboard)/layout.tsx` siempre renderiza `<Sidebar />` con ancho fijo de **220 px** (CSS var `--sidebar-width` en `globals.css`). Sumado al `p-6` del `<main>` (24 px × 2):

```
375 px viewport
- 220 px sidebar (siempre visible, sin md: gate)
-  48 px main padding (p-6 → 1.5rem)
─────────────────────
= 107 px de ancho útil para contenido
```

Cualquier card con `grid-cols-2`, cualquier tabla con 3+ columnas y todo `flex items-center gap-3` con varios hijos provoca scroll horizontal automáticamente. **Arreglar el shell del dashboard arregla ~70 % de los hits.**

---

## A. Sidebar — ofensor #1 (severidad: 🔴 crítica)

| Fichero | Línea | Problema |
|---|---|---|
| `components/layout/Sidebar.tsx` | 196-201 | `<aside>` siempre renderizado; ancho 220 px o 64 px collapsed; **ningún breakpoint `hidden md:flex`** |
| `app/globals.css` | 36-37 | `--sidebar-width: 220px` / `--sidebar-width-collapsed: 64px` |
| `app/(dashboard)/layout.tsx` | 47-49 | `<Sidebar />` sin envoltorio responsive ni drawer mobile |

**Fix planeado (Fase 2):** convertir Sidebar en `Sheet` de shadcn en mobile (off-canvas con backdrop), añadir botón hamburguesa en `DashboardHeader`. En `md:` (≥768 px) sigue idéntica.

---

## B. Padding del `<main>` (severidad: 🟠 alta)

`app/(dashboard)/layout.tsx:55`
```tsx
<main className="flex-1 overflow-auto p-6 lg:p-8 …">
```

`p-6` = 24 px en mobile. Debería ser `p-3 sm:p-4 md:p-6 lg:p-8` (12 → 16 → 24 → 32).

---

## C. Grids `grid-cols-2/3` sin breakpoint (severidad: 🟠 alta)

**33 ocurrencias detectadas.** Estas son las críticas (zonas user-facing):

| Fichero | Línea | Clase actual | Fix sugerido |
|---|---|---|---|
| `app/(dashboard)/seller/contracts/[matchId]/page.tsx` | 274, 325 | `grid grid-cols-2` (resumen contrato, comisión) | `grid-cols-1 sm:grid-cols-2` |
| `app/(dashboard)/buyer/contracts/[matchId]/page.tsx` | 434, 482 | `grid grid-cols-2` | `grid-cols-1 sm:grid-cols-2` |
| `app/(dashboard)/seller/lots/new/page.tsx` | 435, 553, 763 | `grid grid-cols-2/3` (form datos producto, calibres, fotos) | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| `app/(dashboard)/buyer/orders/new/page.tsx` | 324, 354, 387 | `grid grid-cols-2` | `grid-cols-1 sm:grid-cols-2` |
| `app/(dashboard)/buyer/orders/[id]/edit/page.tsx` | 155 | `grid grid-cols-3` (calibres) | `grid-cols-1 sm:grid-cols-3` (con stack vertical en mobile) |
| `app/(dashboard)/seller/subscription/page.tsx` | 121 | `grid grid-cols-3` (planes) | `grid-cols-1 md:grid-cols-3` |
| `app/(dashboard)/buyer/subscription/page.tsx` | 120 | `grid grid-cols-3` | `grid-cols-1 md:grid-cols-3` |
| `app/(dashboard)/seller/profile/page.tsx` | 359, 486, 638, 646 | `grid grid-cols-2/3` (datos empresa, certs) | `grid-cols-1 sm:grid-cols-2` |
| `app/(dashboard)/buyer/profile/page.tsx` | 168, 268 | `grid grid-cols-2` | `grid-cols-1 sm:grid-cols-2` |
| `app/(dashboard)/seller/disputes/[id]/page.tsx` | 190, 210, 248 | `grid grid-cols-3` (evidencia thumbs) | `grid-cols-2 sm:grid-cols-3` (más manejable) |
| `app/(dashboard)/buyer/disputes/[id]/page.tsx` | 146, 166 | `grid grid-cols-3` | `grid-cols-2 sm:grid-cols-3` |
| `app/(auth)/register/steps/Step2.tsx` | 119, 145 | `grid grid-cols-2` (CIF/NIF + tipo, ciudad/CP) | `grid-cols-1 sm:grid-cols-2` |
| `app/(dashboard)/seller/lots/[id]/qr/[txId]/page.tsx` | 251 | `grid grid-cols-2` (info envío) | `grid-cols-1 sm:grid-cols-2` |
| `app/(dashboard)/buyer/orders/[id]/delivery/[txId]/page.tsx` | 154 | `grid grid-cols-2` | `grid-cols-1 sm:grid-cols-2` |
| `components/ui/ContributeModal.tsx` | 266 | `grid grid-cols-3` | `grid-cols-1 sm:grid-cols-3` |
| `components/ui/DisputeModal.tsx` | 243 | `grid grid-cols-3` (evidencia) | `grid-cols-2 sm:grid-cols-3` |
| `components/ui/PaymentModal.tsx` | 121 | `grid grid-cols-2` | `grid-cols-1 sm:grid-cols-2` |

---

## D. Tablas — ofensor #2 (severidad: 🔴 crítica)

**12 ficheros con `<table>`** y/o `overflow-x-auto`. La estrategia es **NO cambiar la tabla; añadir vista de cards en mobile** con `md:hidden` / `hidden md:block`.

| Fichero | Línea | Tabla | Vista mobile sugerida |
|---|---|---|---|
| `app/(dashboard)/seller/lots/[id]/page.tsx` | 260 | Calibres del lote | Cards con calibre + cantidad + precio |
| `app/(dashboard)/buyer/orders/[id]/page.tsx` | 394 | Calibres solicitados | Cards |
| `app/(dashboard)/seller/page.tsx` | (varias) | Dashboard KPI/tablas | Stack vertical |
| `app/(dashboard)/buyer/page.tsx` | (varias) | Idem | Stack |
| `components/market/MarketDashboard.tsx` | 478 | Desglose por calibre | Cards |
| `components/market/MarketDashboard.tsx` | 220-228 | Tabla mercado por producto (header grid 6 cols) | Cards expandibles |
| `components/ui/DataTable.tsx` | 101 | Genérico (top sellers en analytics) | Prop opcional `mobileCardRender` |
| `app/(dashboard)/seller/harvest-estimation/page.tsx` | 440 | Histórico cosecha | Cards |
| `app/mercado/page.tsx` | 215 | Tabla pública mercado | Cards |
| `app/admin/invoices/page.tsx` | 183, 275 | Admin (fuera de scope — descartado por usuario) | — |
| `app/admin/cron-status/page.tsx` | — | Admin | — |
| `app/terms/page.tsx`, `app/privacy/page.tsx` | — | Tablas legales largas | Mantener `overflow-x-auto` (texto legal denso) |

---

## E. Hardcoded widths — bloquean wrap (severidad: 🟠 alta)

| Fichero | Línea | Width | Acción |
|---|---|---|---|
| `components/ui/ChatView.tsx` | 294 | `w-[240px]` (panel conversaciones) | **Fase 5** — vista única en mobile (lista O conversación) |
| `components/ui/NegotiationCard.tsx` | 143 | `max-w-[360px]` | OK pero validar con `w-full` en mobile |
| `components/ui/MatchCard.tsx` | 81 | `min-w-[80px]` (chips score) | Aceptable (chip pequeño) |
| `app/(auth)/login/page.tsx` | 94 | `max-w-[420px]` | OK (auth pages tienen su propio centrado) |

---

## F. Modales — viewport overflow en pantallas bajas (severidad: 🟡 media)

15 modales detectados. Estos NO usan `max-h-[90vh] overflow-y-auto`:

| Fichero | Línea | Falta `max-h`/`overflow` |
|---|---|---|
| `components/RatingModal.tsx` | 142 | parcial (footer no sticky) |
| `components/ui/ContributeModal.tsx` | 141 | sí |
| `components/ui/CancelContractModal.tsx` | 55 | sí (poco contenido, riesgo bajo) |
| `components/ui/PaymentModal.tsx` | 67 | sí |
| `components/ui/NegotiationOfferModal.tsx` | 233 | parcial (tiene `max-h-[90vh] overflow-y-auto` ✅) |
| `components/ui/DisputeModal.tsx` | 137 | ✅ ya implementa `items-end sm:items-center p-0 sm:p-4` (patrón móvil correcto, **usar como referencia**) |
| `components/ui/AutoDistributeModal.tsx` | 205 | ✅ tiene `overflow-y-auto` |

**Fix Fase 4:** patrón común → `max-h-[90vh] overflow-y-auto` + footer con `sticky bottom-0 bg-card pb-safe`.

---

## G. Tabs/nav con scroll horizontal latente (severidad: 🟡 media)

| Fichero | Línea | Patrón |
|---|---|---|
| `app/(dashboard)/seller/profile/page.tsx` | 332 | `flex gap-1 border-b border-border mb-6` con 5 tabs |
| `app/(dashboard)/buyer/profile/page.tsx` | (similar) | 3 tabs (OK) |
| `app/admin/invoices/page.tsx` | 152 | tabs admin (fuera scope) |

5 tabs × ~80 px cada uno = 400 px > 327 px disponibles en `/seller/profile`. **Fix:** `overflow-x-auto` en el `<div>` de tabs + `whitespace-nowrap` en cada botón, o reducir padding tab.

---

## H. Tap targets (severidad: 🟡 media — accesibilidad)

**69 ocurrencias** de elementos con `h-5/6/7` o `w-5/6/7` que **no son iconos lucide**. Apple HIG y Material recomiendan ≥44 px (≥`h-11`). Casos típicos:

- Botones cerrar `X` en lightboxes de disputes (`w-6 h-6` con `p-0.5`)
- Chevrons de expandir/colapsar
- Botones de eliminar foto en upload (`w-6 h-6 opacity-0 group-hover`)

**No es urgente** — son acciones secundarias. Se aborda en Fase 4 si hay tiempo.

---

## I. Inputs con `text-xs`/`text-sm` (severidad: 🟢 baja)

**0 ocurrencias detectadas** de `<input>` o `<textarea>` con texto < `text-base`. ✅ No hay riesgo de auto-zoom de iOS Safari. Buena base.

---

## J. ChatView — caso especial (severidad: 🔴 crítica)

`components/ui/ChatView.tsx:294-330`
- Panel izquierdo `w-[240px]` siempre visible
- Panel derecho `flex-1`
- En 375 px viewport con sidebar 220 px: **107 px - 240 px = panel derecho desaparece**
- Vista actual en mobile es inservible

**Fix Fase 5:** estado `view: 'list' | 'chat'` controlado por `useIsMobile()`. Lista hasta seleccionar conv, luego solo conv con back button.

---

## Resumen de severidad por página

| Página | Severidad | Causa principal |
|---|---|---|
| `/seller` (dashboard) | 🔴 crítica | Sidebar + KPI grid + acción items |
| `/buyer` (dashboard) | 🔴 crítica | Idem |
| `/seller/lots/[id]` | 🔴 crítica | Tabla calibres + matches grid |
| `/buyer/orders/[id]` | 🔴 crítica | Tabla calibres + 2 columnas |
| `/seller|buyer/contracts/[matchId]` | 🔴 crítica | 2× `grid-cols-2` (resumen, comisión) |
| `/seller/lots/new`, `/buyer/orders/new` | 🔴 crítica | Forms con `grid-cols-2/3` |
| `/seller/lots/[id]/edit`, `/buyer/orders/[id]/edit` | 🟠 alta | `grid-cols-3` calibres |
| `/seller|buyer/messages` (ChatView) | 🔴 crítica | Layout 240 px + flex-1 |
| `/seller|buyer/mercado` | 🟠 alta | Tabla 6 columnas |
| `/seller|buyer/analytics` | 🟠 alta | DataTable top sellers + 4 KPIs |
| `/seller|buyer/subscription` | 🟠 alta | `grid-cols-3` planes |
| `/seller|buyer/profile` | 🟠 alta | Tabs + grid datos empresa |
| `/seller|buyer/disputes/[id]` | 🟡 media | `grid-cols-3` evidencia |
| `/seller/matches` | 🟡 media | Listado matches (cards ya verticales — leve) |
| `/seller/harvest-estimation` | 🟡 media | Tabla histórico (premium, bajo tráfico) |

---

## Plan de ejecución validado por la auditoría

**Fase 1** — `tailwind.config.ts` (añadir `xs: 375`) + `lib/hooks/useIsMobile.ts` (matchMedia). **0 cambios visuales.**

**Fase 2** — Shell del dashboard:
- `globals.css`: añadir media query para `--sidebar-width: 0` en `< md`
- `Sidebar.tsx`: wrap en Sheet/Drawer mobile, render hamburguesa en header
- `layout.tsx`: padding responsive `p-3 sm:p-4 md:p-6 lg:p-8`

**Fase 3** — Tablas críticas (12 ficheros). Wrap tabla actual en `<div className="hidden md:block overflow-x-auto">` y añadir `<div className="md:hidden">` con cards arriba. Tabla original intacta.

**Fase 4** — Grids forms y modales (33 grids + 7 modales sin max-h). Solo añadir prefijos `sm:` / `md:`. Modal pattern de `DisputeModal.tsx:137` como referencia.

**Fase 5** — ChatView: estado `mobileView` con `useIsMobile()`. Desktop intacto.

**Fase 6** — Verificación: typecheck, lint, snapshot desktop diff = 0 cambios visibles en `≥1024px`.

---

## Estimación tras auditoría

| Fase | Ficheros tocados | Esfuerzo | Riesgo |
|---|---|---|---|
| 1 | 2 nuevos | 30 min | 🟢 ninguno (aditivo) |
| 2 | 3 (`layout.tsx`, `Sidebar.tsx`, `DashboardHeader.tsx`) | 2 h | 🟡 medio (shell global) |
| 3 | 10 (tablas críticas) | 4 h | 🟢 bajo (vista alternativa) |
| 4 | 18 (forms + modales) | 2 h | 🟢 bajo (solo prefijos) |
| 5 | 1 (`ChatView.tsx`) | 1.5 h | 🟡 medio (componente pesado) |
| 6 | 0 (verificación) | 1 h | 🟢 ninguno |

**Total: ~11 h en commits incrementales, cero cambios de comportamiento.**
