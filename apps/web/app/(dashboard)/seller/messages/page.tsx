'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ChatView } from '@/components/ui/ChatView';

function SellerMessages() {
  const params = useSearchParams();
  const tx = params.get('tx') ?? undefined;
  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.12))] flex flex-col">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-foreground">Mensajes</h1>
        <p className="text-sm text-muted-foreground">Chat with your buyers about active orders.</p>
      </div>
      <div className="flex-1 min-h-0">
        <ChatView role="seller" initialTransaccionId={tx} />
      </div>
    </div>
  );
}

export default function SellerMessagesPage() {
  return (
    <Suspense>
      <SellerMessages />
    </Suspense>
  );
}
