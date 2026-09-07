import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import './globals.css';
import { MotionProvider } from '@/components/motion/motion-provider';

const messina = localFont({
  variable: '--font-messina',
  display: 'swap',
  src: [
    { path: './font/MessinaSans-Light.woff2', weight: '300', style: 'normal' },
    { path: './font/MessinaSans-Book.woff2', weight: '350', style: 'normal' },
    { path: './font/MessinaSans-Regular.woff2', weight: '400', style: 'normal' },
    { path: './font/MessinaSans-SemiBold.woff2', weight: '600', style: 'normal' },
  ],
});

export const metadata: Metadata = {
  title: { default: 'Brito — Photographs', template: '%s — Brito' },
  description: 'Photographs by Brito. Passing moments, places, and the stories behind each frame.',
};

export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover', interactiveWidget: 'resizes-content',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${messina.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {/* Applies the saved or system theme before first paint (public/theme-boot.js); the toggle covers a client-rendered layout. */}
        <Script src="/theme-boot.js" strategy="beforeInteractive" /><a href="#main" className="skip-link">Skip to content</a><MotionProvider>{children}</MotionProvider></body>
    </html>
  );
}
