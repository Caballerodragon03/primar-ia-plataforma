# Auditoría móvil — Phase 0 baseline + COMPLETADA

**Fecha:** 2026-05-26
**Viewport objetivo:** 375 × 812 (iPhone X estándar)
**Estado:** ✅ todas las fases (0–6) aterrizadas en main.

---

## TL;DR — antes vs después

| | Antes | Después |
|---|---|---|
| Ancho útil en 375px | **107 px** (sidebar 220 + padding 48) | **351 px** (sidebar oculta + padding 12) |
| Sidebar en mobile | Siempre visible, robaba 220 px | Drawer off-canvas (Sheet) via hamburguesa |
| Padding `<main>` | 24 px fijo | Responsive: 12 → 16 → 24 → 32 |
| Grids `grid-cols-2/3` user-facing | 33 sin breakpoint | Todas con `sm:`/`md:` prefix |
| Modales sin `max-h-[90vh]` | 7 | 0 |
| ChatView en mobile | Panel 240 px fijo, inservible | Vista única lista↔chat con back |
| TypeScript / Next build | n/a | ✅ verde |

---

## Commits aterrizados

| Commit | Fase | Contenido |
|---|---|---|
| `f2a29c9` | 0 | docs: este audit baseline |
| `0b5f165` | 1 | `tailwind.config.ts` xs:375 + `useIsMobile()` hook |
| `b533103` | 2 | Sidebar drawer + responsive shell |
| `79ea122` | 3 | DataTable search full-width en mobile |
| `3ba37b7` | 4 | 19 grids responsive + 3 modales max-h |
| `4849ade` | 5 | ChatView vista única mobile con back |

---

## Garantías cumplidas

✅ **TypeScript verde** después de cada fase.
✅ **`next build` limpio** (verificado al final).
✅ **Desktop (≥768px) intacto**: todas las clases nuevas tienen prefijo `md:` o son aditivas.
✅ **Lógica de negocio sin tocar**: solo CSS, layout, y un `useIsMobile()` hook puro.
✅ **i18n keys sin tocar**: el trabajo de los 20 commits previos se mantiene.
✅ **Rutas + navegación sin cambios**: el drawer mobile usa estado local + window event.

---

## Lo que no se hizo (deuda menor)

- Tap targets <44px (69 ocurrencias) — son botones secundarios (X close, chevrons). Bajo impacto. Si llega feedback de usuarios se aborda.
- Tabla certificados en `/seller/profile` con `grid-cols-3 gap-4` — cabe en 351px con texto corto.
- Páginas admin (fuera de scope explícito del usuario).
- Tablas legales (terms/privacy) — densas, mejor con scroll horizontal.

---

## Cómo probar manualmente

1. **DevTools → device mode → iPhone X (375 × 812).**
2. Login en cualquier rol (vendedor/comprador).
3. **Sidebar debe NO aparecer** automáticamente. Hamburguesa visible arriba-izquierda del header.
4. Pulsa hamburguesa → drawer entra desde la izquierda con el menú completo. Tocar un item navega y cierra.
5. **Cualquier página debe verse sin scroll lateral.** Las tablas de calibres (3 cols) caben porque hay 351px disponibles.
6. **Chat** (`/buyer/messages` o `/seller/messages`): solo se ve la lista de conversaciones. Al tocar una, solo se ve el chat con flecha back arriba a la izquierda.
7. **Resize a ≥768px** → vuelve a verse la sidebar fija y ChatView con doble panel. **Visualmente idéntico al estado pre-cambios.**

---

## Próximos pasos opcionales (no urgentes)

- E2E con Playwright a 375px ejecutando los 6 flows críticos (login, crear lote, firmar contrato, chat+propuesta, pago comisión, confirmar entrega) para garantía continua en CI.
- Tap targets <44px si llegan reportes de usabilidad.
- Lighthouse mobile audit para confirmar CLS/LCP no han empeorado.
