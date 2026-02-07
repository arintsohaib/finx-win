
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster as Sonner } from 'sonner';
import { ZoomPrevention } from '@/components/zoom-prevention';
import { LayoutWrapper } from '@/components/layout-wrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FinX - One Platform. All Markets',
  description: 'FinX is a professional trading platform strictly designed for mobile Web3 wallet browsers.',
  keywords: ['crypto', 'trading', 'binary', 'web3', 'metamask', 'blockchain', 'finx'],
  manifest: '/manifest.json',
  openGraph: {
    title: 'FinX - One Platform. All Markets',
    description: 'Professional Web3 Trading Platform',
    siteName: 'FinX',
    images: [
      {
        url: '/finx-icon.png',
        width: 512,
        height: 512,
        alt: 'FinX Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/finx-logo-bix-512px.png', sizes: '512x512', type: 'image/png' },
    ],
    other: [
      {
        rel: 'apple-touch-icon-precomposed',
        url: '/finx-logo-bix-512px.png',
      },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: 'cover', // For iOS safe area support
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={`${inter.className} h-full`} suppressHydrationWarning>
        <Providers>
          <ZoomPrevention />
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
          <Sonner
            position="bottom-center"
            expand={true}
            richColors
            closeButton
            toastOptions={{
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: '1px solid hsl(var(--border))',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
