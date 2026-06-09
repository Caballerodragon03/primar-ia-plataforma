'use client';

import { useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

interface NotificationSummary {
  pendingOffers: number;
  pendingMatches: number;
  unreadMessages: number;
  pendingContracts: number;
  pendingPhotos: number;
  pendingDeliveries: number;
  pendingRatings?: number;
  expiredOrders?: number;
  expiredLots?: number;
}

type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

type BadgeNotification = typeof Notification & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

const POLL_INTERVAL_MS = 30_000;

function totalBadgeCount(summary: NotificationSummary): number {
  return (
    (summary.pendingOffers ?? 0) +
    (summary.pendingMatches ?? 0) +
    (summary.unreadMessages ?? 0) +
    (summary.pendingContracts ?? 0) +
    (summary.pendingPhotos ?? 0) +
    (summary.pendingDeliveries ?? 0) +
    (summary.pendingRatings ?? 0) +
    (summary.expiredOrders ?? 0) +
    (summary.expiredLots ?? 0)
  );
}

async function setPwaBadge(count: number): Promise<void> {
  if (typeof navigator === 'undefined') return;
  const badgeNavigator = navigator as BadgeNavigator;
  const badgeNotification =
    typeof Notification !== 'undefined' ? (Notification as BadgeNotification) : null;
  const normalized = Math.max(0, Math.floor(Number(count) || 0));
  try {
    const attempts: Array<Promise<void>> = [];
    if (badgeNavigator.setAppBadge) {
      attempts.push(badgeNavigator.setAppBadge(normalized));
    }
    if (badgeNotification?.setAppBadge) {
      attempts.push(badgeNotification.setAppBadge(normalized));
    }
    if (normalized <= 0 && badgeNavigator.clearAppBadge) {
      attempts.push(badgeNavigator.clearAppBadge());
    }
    if (normalized <= 0 && badgeNotification?.clearAppBadge) {
      attempts.push(badgeNotification.clearAppBadge());
    }
    await Promise.allSettled(attempts);
  } catch {
    // iOS/desktop support varies. Badge failures must never affect the app.
  }
}

export function PWAAppBadge() {
  const user = useAuthStore((s) => s.user);
  const bootstrapped = useAuthStore((s) => s._bootstrapped);

  const syncBadge = useCallback(async () => {
    if (!user) {
      await setPwaBadge(0);
      return;
    }
    try {
      const res = await api.get<{ success: boolean; data: NotificationSummary }>(
        '/matching/notifications/summary',
      );
      if (res.data?.data) await setPwaBadge(totalBadgeCount(res.data.data));
    } catch {
      // Ignore. A transient failure should not clear a potentially valid badge.
    }
  }, [user]);

  useEffect(() => {
    if (!bootstrapped) return;
    void syncBadge();
    if (!user) return;

    const interval = window.setInterval(syncBadge, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncBadge();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [bootstrapped, syncBadge, user]);

  return null;
}
