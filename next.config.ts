import type { NextConfig } from "next";

const production = process.env.NODE_ENV === 'production';

/** Where the studio's browser uploads go: the presigned PUT is sent straight to storage. */
function storageOrigin() {
  const endpoint = process.env.AWS_S3_ENDPOINT?.replace(/\/+$/, '');
  if (endpoint) {
    try { return new URL(endpoint).origin; } catch { /* fall through */ }
  }
  const bucket = process.env.AWS_S3_BUCKET, region = process.env.AWS_S3_REGION;
  return bucket && region ? `https://${bucket}.s3.${region}.amazonaws.com` : 'https://*.r2.cloudflarestorage.com https://*.amazonaws.com';
}

/**
 * Scripts and styles come only from this origin (the theme boot script and
 * JSON-LD are inline, hence 'unsafe-inline' rather than nonces, which would
 * also need every page to pass through the proxy). Photographs may be any
 * https image for legacy URLs; frames only the map embed; and nothing may
 * frame the site.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${production ? '' : " 'unsafe-eval'"} https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${storageOrigin()} https://va.vercel-scripts.com${production ? '' : ' ws:'}`,
  "frame-src https://www.google.com",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(production ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(production ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000' }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/_next/image', headers: [
        { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ] },
    ];
  },
  async redirects() {
    return [{ source: '/en/admin/:path*', destination: '/admin/:path*', permanent: false }];
  },
  images: {
    // Photographs are served through /api/image/<storage key>, a stable URL the
    // optimizer can cache; signed S3 URLs would change on every render.
    localPatterns: [{ pathname: '/api/image/**', search: '' }],
    // Fewer, well-spaced candidates keep 300+ srcsets from bloating the page.
    deviceSizes: [640, 828, 1080, 1440, 1920, 2560],
    imageSizes: [96, 256, 384],
    qualities: [80],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
};

export default nextConfig;
