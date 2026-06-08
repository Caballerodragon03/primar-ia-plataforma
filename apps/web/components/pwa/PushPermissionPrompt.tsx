'use client';

/**
 * Phase 18 — Pequeño banner ámbar que pide al usuario habilitar las
 * notificaciones push. Se muestra solo si:
 *   - El navegador soporta Notification API (`'Notification' in window`).
 *   - El permiso está en 'default' (no concedido ni denegado).
 *   - El usuario está autenticado (lo monta el layout del dashboard).
 *
 * Si el usuario pulsa "Activar", pide el permiso del navegador, y si
 * lo concede, registra la subscription con el backend para que pueda
 * recibir pushes. Si lo deniega, no volvemos a molestar (el navegador
 * recordará la decisión y `Notification.permission` será 'denied').
 *
 * Persistimos un dismiss local en sessionStorage para que no aparezca
 * en cada navegación dentro de la misma sesión si el usuario lo cierra.
 */
import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useT } from '@/lib/i18n/LocaleProvider';
import { api } from '@/lib/api';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const DISMISS_KEY = 'primaria.pushPromptDismissed';

export function PushPermissionPrompt() {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'default') return;
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setVisible(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const keyRes = await api.get('/push/public-key');
      const { data } = keyRes.data as { data?: { publicKey?: string } };
      if (!data?.publicKey) {
        setVisible(false);
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey) as BufferSource,
      });
      await api.post('/push/subscribe', sub.toJSON());
      setVisible(false);
    } catch (err) {
      console.warn('[push] enable failed', err);
      setVisible(false);
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-card p-4 flex items-start gap-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
        <Bell className="w-4 h-4 text-amber-700" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">
          {t('push.prompt.title')}
        </p>
        <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
          {t('push.prompt.body')}
        </p>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 disabled:opacity-50 px-3 py-1 rounded-button transition-colors"
          >
            {busy ? t('push.prompt.enabling') : t('push.prompt.enable')}
          </button>
          <button
            type="button"
            onClick={dismiss}
            disabled={busy}
            className="text-xs text-amber-900/70 hover:text-amber-900 px-3 py-1 transition-colors"
          >
            {t('push.prompt.later')}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="p-1 text-amber-700 hover:text-amber-900"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
