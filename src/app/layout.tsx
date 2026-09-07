import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION, serializeJsonLd } from '@/seo/site';
import { publicMetadata } from '@/seo/metadata';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { MotionProvider } from '@/components/motion/motion-provider';
import { THEME_BOOT_SCRIPT } from '@/components/theme-toggle';
import { ImageProtection } from '@/photo/ImageProtection';
import { Analytics } from '@vercel/analytics/next';

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
  ...publicMetadata({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: '/' }),
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: '%s — Brito' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd({'@context':'https://schema.org','@type':'WebSite',name:SITE_NAME,url:SITE_URL,description:SITE_DESCRIPTION,publisher:{'@type':'Person',name:SITE_NAME,url:SITE_URL,sameAs:['https://www.instagram.com/kelbrxto/']}})}} />
        {/* Runs before first paint so the page never flashes the wrong theme; the toggle covers a client-rendered layout. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col"><a href="#main" className="skip-link">Skip to content</a><MotionProvider>{children}</MotionProvider><ImageProtection /><Analytics /></body>
    </html>
  );
}
