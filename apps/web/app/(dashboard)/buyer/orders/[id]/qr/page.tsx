'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function QRScanRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/buyer/orders/${id}`);
  }, [id, router]);

  return (
    <div className="p-6 text-center">
      <p className="text-sm text-gray-500">Redirecting to order details...</p>
    </div>
  );
}
