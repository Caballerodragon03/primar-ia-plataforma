'use client';

import { useMemo, useState } from 'react';
import axios from 'axios';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type DebugState = Record<string, unknown>;

function safeParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return 'INVALID_JSON';
  }
}

function decodeJwtMeta(token: string | null): DebugState | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    if (!payload) return { validShape: false };
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const parsed = JSON.parse(window.atob(normalized));
    const expMs = typeof parsed.exp === 'number' ? parsed.exp * 1000 : null;
    return {
      validShape: true,
      role: parsed.role,
      estado: parsed.estado,
      expIso: expMs ? new Date(expMs).toISOString() : null,
      expired: expMs ? expMs < Date.now() : null,
    };
  } catch (err) {
    return { validShape: false, error: (err as Error).message };
  }
}

async function collectLocalPushState(): Promise<DebugState> {
  if (typeof window === 'undefined') return { supported: false };
  const notificationPermission =
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  const pushManagerSupported = 'PushManager' in window;
  const serviceWorkerSupported = 'serviceWorker' in navigator;
  if (!serviceWorkerSupported) {
    return { serviceWorkerSupported, pushManagerSupported, notificationPermission };
  }

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = registration && pushManagerSupported
    ? await registration.pushManager.getSubscription()
    : null;
  return {
    serviceWorkerSupported,
    pushManagerSupported,
    notificationPermission,
    hasRegistration: Boolean(registration),
    registrationScope: registration?.scope ?? null,
    hasLocalSubscription: Boolean(subscription),
    endpointHost: subscription?.endpoint ? new URL(subscription.endpoint).host : null,
  };
}

function collectDebugState(): DebugState {
  const store = useAuthStore.getState();
  const persistedRaw = localStorage.getItem('primaria-auth');
  const persisted = safeParse(persistedRaw) as { state?: DebugState } | null;
  const accessToken = store.accessToken ?? localStorage.getItem('accessToken');
  const refreshToken = store.refreshToken ?? localStorage.getItem('refreshToken');
  const nav = window.navigator as Navigator & { standalone?: boolean };

  return {
    timestamp: new Date().toISOString(),
    location: window.location.href,
    apiUrl: API_URL,
    standalone:
      window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true,
    notificationPermission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
    storage: {
      hasPrimariaAuth: Boolean(persistedRaw),
      primariaAuthLength: persistedRaw?.length ?? 0,
      persistedKeys: persisted && typeof persisted === 'object' && persisted.state
        ? Object.keys(persisted.state)
        : null,
      hasStoreUser: Boolean(store.user),
      storeUserRole: store.user?.role ?? null,
      storeUserEmail: store.user?.email ?? null,
      hasStoreAccessToken: Boolean(store.accessToken),
      hasLocalAccessToken: Boolean(localStorage.getItem('accessToken')),
      hasStoreRefreshToken: Boolean(store.refreshToken),
      hasLocalRefreshToken: Boolean(localStorage.getItem('refreshToken')),
      hydrated: store._hydrated,
      bootstrapped: store._bootstrapped,
      restoring: store._restoring,
    },
    accessTokenMeta: decodeJwtMeta(accessToken),
    refreshTokenLength: refreshToken?.length ?? 0,
    serviceWorker: {
      supported: 'serviceWorker' in navigator,
      controlled: Boolean(navigator.serviceWorker?.controller),
      controllerScript: navigator.serviceWorker?.controller?.scriptURL ?? null,
    },
  };
}

export default function PwaAuthDebugPage() {
  const [debug, setDebug] = useState<DebugState>(() => collectDebugState());
  const [lastResult, setLastResult] = useState<DebugState | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);

  const formatted = useMemo(() => JSON.stringify({ debug, lastResult }, null, 2), [debug, lastResult]);

  function refreshDebug() {
    setDebug(collectDebugState());
  }

  async function testRefresh() {
    const refreshToken = useAuthStore.getState().refreshToken ?? localStorage.getItem('refreshToken') ?? undefined;
    try {
      const res = await axios.post(
        `${API_URL}/api/v1/auth/refresh`,
        { refreshToken },
        { withCredentials: true, timeout: 15000 },
      );
      const data = res.data?.data;
      if (data?.accessToken && data?.user) {
        setAuth(data.user, data.accessToken, data.refreshToken);
      }
      setLastResult({
        action: 'refresh',
        ok: true,
        status: res.status,
        hasAccessToken: Boolean(data?.accessToken),
        hasRefreshToken: Boolean(data?.refreshToken),
        hasUser: Boolean(data?.user),
      });
    } catch (err) {
      const e = err as { response?: { status?: number; data?: unknown }; message?: string; code?: string };
      setLastResult({
        action: 'refresh',
        ok: false,
        status: e.response?.status ?? null,
        code: e.code ?? null,
        message: e.message ?? null,
        response: e.response?.data ?? null,
      });
    } finally {
      setDebug(collectDebugState());
    }
  }

  async function testProfile() {
    try {
      const res = await api.get('/auth/profile');
      setLastResult({
        action: 'profile',
        ok: true,
        status: res.status,
        hasUser: Boolean(res.data?.data?.id),
        role: res.data?.data?.role ?? null,
      });
    } catch (err) {
      const e = err as { response?: { status?: number; data?: unknown }; message?: string; code?: string };
      setLastResult({
        action: 'profile',
        ok: false,
        status: e.response?.status ?? null,
        code: e.code ?? null,
        message: e.message ?? null,
        response: e.response?.data ?? null,
      });
    } finally {
      setDebug(collectDebugState());
    }
  }

  async function testLocalPush() {
    try {
      const push = await collectLocalPushState();
      setLastResult({ action: 'local-push', ok: true, push });
    } catch (err) {
      setLastResult({
        action: 'local-push',
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setDebug(collectDebugState());
    }
  }

  async function testPushStatus() {
    try {
      const res = await api.get('/push/status');
      setLastResult({
        action: 'push-status',
        ok: true,
        status: res.status,
        data: res.data?.data ?? null,
      });
    } catch (err) {
      const e = err as { response?: { status?: number; data?: unknown }; message?: string; code?: string };
      setLastResult({
        action: 'push-status',
        ok: false,
        status: e.response?.status ?? null,
        code: e.code ?? null,
        message: e.message ?? null,
        response: e.response?.data ?? null,
      });
    } finally {
      setDebug(collectDebugState());
    }
  }

  async function sendTestPush() {
    try {
      const res = await api.post('/push/test');
      setLastResult({
        action: 'push-test',
        ok: true,
        status: res.status,
        data: res.data?.data ?? null,
      });
    } catch (err) {
      const e = err as { response?: { status?: number; data?: unknown }; message?: string; code?: string };
      setLastResult({
        action: 'push-test',
        ok: false,
        status: e.response?.status ?? null,
        code: e.code ?? null,
        message: e.message ?? null,
        response: e.response?.data ?? null,
      });
    } finally {
      setDebug(collectDebugState());
    }
  }

  async function copyDebug() {
    await navigator.clipboard.writeText(formatted);
    setLastResult({ action: 'copy', ok: true });
  }

  return (
    <main className="min-h-screen bg-background p-4 text-foreground">
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold">PWA Auth Debug</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            No se muestran tokens completos; sólo presencia, longitud y metadatos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="rounded-button bg-primary px-4 py-2 text-sm font-semibold" onClick={refreshDebug}>
            Refrescar estado
          </button>
          <button className="rounded-button border border-border px-4 py-2 text-sm font-semibold" onClick={testRefresh}>
            Probar refresh
          </button>
          <button className="rounded-button border border-border px-4 py-2 text-sm font-semibold" onClick={testProfile}>
            Probar perfil
          </button>
          <button className="rounded-button border border-border px-4 py-2 text-sm font-semibold" onClick={testLocalPush}>
            Push local
          </button>
          <button className="rounded-button border border-border px-4 py-2 text-sm font-semibold" onClick={testPushStatus}>
            Push backend
          </button>
          <button className="rounded-button border border-border px-4 py-2 text-sm font-semibold" onClick={sendTestPush}>
            Enviar push test
          </button>
          <button className="rounded-button border border-border px-4 py-2 text-sm font-semibold" onClick={copyDebug}>
            Copiar diagnóstico
          </button>
        </div>

        <pre className="overflow-auto rounded-lg border border-border bg-card p-4 text-xs leading-relaxed">
          {formatted}
        </pre>
      </div>
    </main>
  );
}
