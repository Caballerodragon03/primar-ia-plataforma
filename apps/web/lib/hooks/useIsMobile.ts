'use client';

/**
 * Phase 14N — Hook responsive para detectar mobile en runtime.
 *
 * Usa matchMedia con el breakpoint md de Tailwind (768px). Devuelve
 * false hasta que el cliente hidrata para evitar mismatch SSR (en SSR
 * no hay window, asumimos desktop por defecto = layout completo).
 *
 * Uso:
 *   const isMobile = useIsMobile();
 *   if (isMobile) return <DrawerNav />;
 *   return <FixedSidebar />;
 *
 * Para CSS-only responsive prefiere clases md:hidden / hidden md:block.
 * Este hook es para casos donde el componente cambia comportamiento
 * (estado, navegación) no solo apariencia (p.ej. ChatView).
 */
import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    // Compat: addEventListener no existe en Safari < 14.
    if (mq.addEventListener) {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    } else {
      const legacy = mq as unknown as { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void };
      legacy.addListener(update);
      return () => legacy.removeListener(update);
    }
  }, []);

  return isMobile;
}
