/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets instrumentation.js start the background timers (shipping bills) when the server boots.
  experimental: { instrumentationHook: true },
  async headers() {
    return [
      {
        // Never cache HTML pages and API responses — always fresh so new
        // deploys appear immediately. Excludes /_next/static and /api/uploads
        // which keep their own long-lived immutable caching.
        source: '/((?!_next/static|api/uploads).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
