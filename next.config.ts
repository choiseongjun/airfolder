import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // The database TLS certificate path comes from DATABASE_URL at runtime.
  outputFileTracingIncludes: {
    '/*': ['./certs/supabase-ca.crt'],
  },
  async headers() {
    return [{ source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] }];
  },
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
