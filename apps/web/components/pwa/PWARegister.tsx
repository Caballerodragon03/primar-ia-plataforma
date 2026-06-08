'use client';

/**
 * Phase 18 — PWA bootstrap.
 *
 * Se monta una sola vez en el root layout y se encarga de:
 *   1. Registrar el service worker (/sw.js).
 *   2. Tras un primer login (o si ya hay token) y si el usuario ya
 *      tiene permiso de notificaciones, registrar la pushSubscription
 *      contra el backend para que pueda enviarle pushes.
 *
 * NO pide permiso de notificaciones automáticamente — eso lo hace
 * un botón explícito (<PushPermissionPrompt />). Aquí solo
 * sincronizamos el estado existente.
 */
import { useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Url = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = typeof window !== 'undefined' ? window.atob(base64Url) : '';
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function ensureSubscription(registration: ServiceWorkerRegistration): Promise<void> {
  // Solo intentamos suscribir si el navegador ya tiene permiso. Si
  // es 'default' o 'denied' no pedimos nada — eso lo gestiona el
  // <PushPermissionPrompt /> bajo interacción explícita.
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      // Re-enviar al backend (idempotente — el endpoint hace upsert
      // por endpoint, así que no crea duplicados).
      await api.post('/push/subscribe', existing.toJSON()).catch(() => {});
      return;
    }
    const keyRes = await api.get('/push/public-key');
    const { data } = keyRes.data as { data?: { publicKey?: string } };
    if (!data?.publicKey) return;
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey) as BufferSource,
    });
    await api.post('/push/subscribe', sub.toJSON());
  } catch (err) {
    // Silencioso — la subscripción puede fallar por mil motivos
    // (private mode, navegador antiguo, etc). El user puede reintentar
    // desde el botón explícito.
    console.debug('[pwa] ensureSubscription:', err);
  }
}

export function PWARegister() {
  const user = useAuthStore((s) => s.user);
  const bootstrapped = useAuthStore((s) => s._bootstrapped);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // Tras registro, intentamos rehidratar la subscription.
          if (bootstrapped && user) void ensureSubscription(reg);
        })
        .catch((err) => console.debug('[pwa] SW register failed:', err));
    };
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
    return () => window.removeEventListener('load', onLoad);
  }, [bootstrapped, user]);

  return null;
}
