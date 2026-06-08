import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import { Toaster } from 'sonner';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { PWARegister } from '@/components/pwa/PWARegister';
import { AuthSessionBootstrap } from '@/components/auth/AuthSessionBootstrap';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: {
    default: 'Primar-IA — La lonja digital del sector primario',
    template: '%s | Primar-IA',
  },
  description:
    'Marketplace B2B que conecta productores agrícolas españoles con compradores y distribuidores. Sin intermediarios.',
  keywords: ['marketplace', 'B2B', 'agricultura', 'productores', 'España', 'Primar-IA'],
  authors: [{ name: 'Primar-IA' }],
  // Phase 18 — PWA: manifest + iOS standalone webapp config.
  manifest: '/manifest.json',
  applicationName: 'Primar-IA',
  appleWebApp: {
    capable: true,
    title: 'Primar-IA',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/logo-icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/icon-180.png',
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://app.primar-ia.com',
    siteName: 'Primar-IA',
    title: 'Primar-IA — La lonja digital del sector primario',
    description:
      'Marketplace B2B que conecta productores agrícolas españoles con compradores y distribuidores.',
    images: [
      {
        url: '/logo-full.png',
        width: 1200,
        height: 343,
        alt: 'Primar-IA Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Primar-IA — La lonja digital del sector primario',
    description:
      'Marketplace B2B agrícola. Conecta directamente con productores y compradores.',
  },
};

export const viewport: Viewport = {
  themeColor: '#E1C44D',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className={`${poppins.variable} font-sans bg-background text-foreground antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-foreground focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-soft"
        >
          Saltar al contenido
        </a>
        <AuthSessionBootstrap />
        <PWARegister />
        <LocaleProvider>{children}</LocaleProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              borderRadius: '12px',
              border: '1px solid hsl(var(--border))',
              boxShadow: '0 4px 16px -4px rgb(0 0 0 / 0.08)',
            },
          }}
        />
      </body>
    </html>
  );
}
