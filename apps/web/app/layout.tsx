import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'Primar-IA — La lonja digital del sector primario',
  description: 'Marketplace B2B que conecta productores agricolas espanoles con compradores y distribuidores.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${poppins.variable} font-sans bg-background text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
