import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { MotionProvider } from '@/components/motion/motion-provider';
import { THEME_BOOT_SCRIPT } from '@/components/theme-toggle';

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
      <head>
        {/* Runs before first paint so the page never flashes the wrong theme; the toggle covers a client-rendered layout. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col"><a href="#main" className="skip-link">Skip to content</a><MotionProvider>{children}</MotionProvider></body>
    </html>
  );
}
