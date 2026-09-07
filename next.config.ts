import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: '/en/admin/:path*', destination: '/admin/:path*', permanent: false }];
  },
  images: {
    // Photographs are served through /api/image/<storage key>, a stable URL the
    // optimizer can cache; signed S3 URLs would change on every render.
    localPatterns: [{ pathname: '/api/image/**', search: '' }],
    // Fewer, well-spaced candidates keep 300+ srcsets from bloating the page.
    deviceSizes: [640, 828, 1080, 1440, 1920, 2560],
    imageSizes: [256, 384],
    qualities: [80],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
};

export default nextConfig;
