import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false, // Stealth: Remove X-Powered-By: Next.js header
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }, // Force HTTPS for 2 years
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-Frame-Options', value: 'DENY' }, // Prevent Clickjacking completely
          { key: 'X-Content-Type-Options', value: 'nosniff' }, // Prevent MIME Sniffing
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; object-src 'none'; base-uri 'none';" } // Strict CSP
        ],
      },
    ];
  },
};

export default nextConfig;
