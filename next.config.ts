import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/security/headers";

/** Auth.js session cookies (plain over http in development, __Secure- over https). */
const SESSION_COOKIES = ['__Secure-authjs.session-token', 'authjs.session-token'];
/** Query keys that narrow the gallery (src/photo/filters.ts); `view` is client-only and stays static. */
const FILTER_KEYS = ['tag', 'place', 'film', 'camera', 'lens', 'focal', 'year'];

/**
 * The home and photograph pages are static for visitors. A request carrying a
 * session (the owner, who sees studio controls and hidden photographs) or a
 * gallery filter is rewritten, before the cache, to the per-request /live
 * routes instead. The address the browser shows does not change.
 */
const LIVE_REWRITES = [
  ...SESSION_COOKIES.flatMap(key => [
    { source: '/', has: [{ type: 'cookie' as const, key }], destination: '/live' },
    { source: '/p/:id', has: [{ type: 'cookie' as const, key }], destination: '/live/p/:id' },
  ]),
  ...FILTER_KEYS.map(key => ({ source: '/', has: [{ type: 'query' as const, key }], destination: '/live' })),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      { source: '/_next/image', headers: [
        { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ] },
    ];
  },
  async rewrites() {
    return { beforeFiles: LIVE_REWRITES };
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
