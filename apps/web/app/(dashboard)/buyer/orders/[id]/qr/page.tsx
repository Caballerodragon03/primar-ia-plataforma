'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n/LocaleProvider';

export default function QRScanRedirect() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/buyer/orders/${id}`);
  }, [id, router]);

  return (
    <div className="p-6 text-center">
      <p className="text-sm text-muted-foreground">{t('qr.redirecting')}</p>
    </div>
  );
}
