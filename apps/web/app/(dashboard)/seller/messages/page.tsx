'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ChatView } from '@/components/ui/ChatView';

function SellerMessages() {
  const params = useSearchParams();
  const tx = params.get('tx') ?? undefined;
  // Phase 14G — ?propose=1 → ChatView abre el modal de propuesta nada más
  // cargar. Usado por el botón "Modificar condiciones (chat)" del contrato.
  const autoOpenOffer = params.get('propose') === '1';
  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.12))] flex flex-col">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-foreground">Mensajes</h1>
        <p className="text-sm text-muted-foreground">Chat con tus compradores sobre operaciones activas.</p>
      </div>
      <div className="flex-1 min-h-0">
        <ChatView role="seller" initialTransaccionId={tx} autoOpenOffer={autoOpenOffer} />
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
