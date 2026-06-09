// Primar-IA service worker — Phase 18
//
// Responsabilidades:
//   1. PWA installability: el navegador exige un SW activo para
//      considerar la web "installable" (con manifest + HTTPS).
//   2. Push notifications: handler de `push` y `notificationclick`
//      para mostrar notificaciones nativas + abrir la app en la URL
//      relevante cuando el usuario las pulsa.
//
// NO hacemos cache offline agresiva — la app es online-first (datos
// vienen del backend en cada request) y queremos que las nuevas
// versiones de Next.js se sirvan sin trabar al usuario en una vieja.
// Estrategia: pasarela transparente (fetch → network).

const SW_VERSION = 'primaria-sw-v1';

async function setBadgeCount(count) {
  const normalized = Number.isFinite(Number(count)) ? Math.max(0, Math.floor(Number(count))) : null;
  const attempts = [];
  if (self.navigator && 'setAppBadge' in self.navigator) {
    attempts.push(() => normalized === null
      ? self.navigator.setAppBadge()
      : self.navigator.setAppBadge(normalized));
  }
  if (self.registration && 'setAppBadge' in self.registration) {
    attempts.push(() => normalized === null
      ? self.registration.setAppBadge()
      : self.registration.setAppBadge(normalized));
  }
  if (normalized === 0 && self.navigator && 'clearAppBadge' in self.navigator) {
    attempts.push(() => self.navigator.clearAppBadge());
  }

  await Promise.allSettled(attempts.map((attempt) => attempt()));
}

self.addEventListener('install', (event) => {
  // skipWaiting → cuando hay una nueva versión del SW, se activa de
  // inmediato en vez de esperar a que se cierren todas las pestañas.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // claim → controla todos los clientes (pestañas) abiertos sin
  // esperar a un reload.
  event.waitUntil(self.clients.claim());
});

// Push event — el backend manda un mensaje empujado vía web-push.
// El payload viene en JSON: { title, body, url, tag, icon }.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Primar-IA', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Primar-IA';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // tag: si llegan varias notifs con la misma tag, se colapsan en
    // una sola en lugar de apilarse (p.ej. múltiples mensajes del
    // mismo chat).
    tag: data.tag,
    // data.url se usa en notificationclick para abrir la pantalla.
    data: { url: data.url || '/' },
    requireInteraction: false,
  };
  event.waitUntil(
    (async () => {
      await setBadgeCount(typeof data.badgeCount === 'number' ? data.badgeCount : null);
      await self.registration.showNotification(title, options);
    })(),
  );
});

// Click sobre la notificación → abrir/enfocar la app en la URL del
// payload. Si la pestaña ya está abierta, hace focus en ella en vez
// de abrir una nueva.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawTargetUrl = event.notification.data?.url || '/';
  let targetUrl = new URL('/', self.location.origin).href;
  try {
    const parsed = new URL(rawTargetUrl, self.location.origin);
    if (parsed.origin === self.location.origin) targetUrl = parsed.href;
  } catch { /* keep fallback */ }
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        try {
          const url = new URL(client.url);
          // Si la app ya está abierta en cualquier ruta, navegamos a
          // la URL de la notif dentro de esa pestaña.
          if (url.origin === self.location.origin && 'focus' in client && 'navigate' in client) {
            await client.focus();
            // navigate puede no estar disponible en algunos browsers
            try {
              await client.navigate(targetUrl);
            } catch { /* ignore */ }
            return;
          }
        } catch { /* ignore */ }
      }
      // No hay pestaña → abre una nueva.
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});

// Si el backend revoca o caduca una subscription, el navegador
// dispara este evento. Re-subscribimos y notificamos al backend
// para que actualice su DB.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      // El service worker no puede leer localStorage ni adjuntar el
      // Bearer token que requiere /push/subscribe. La re-sincronización
      // autenticada se hace al abrir la app desde <PWARegister />.
      console.info('[sw] pushsubscriptionchange: resync deferred until app opens');
    })(),
  );
});
