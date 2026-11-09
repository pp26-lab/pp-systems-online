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
        source: '/((?!_next/static|api/uploads|sounds/).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
      {
        // Notification sounds never change under the same name (a new sound gets a new -vN
        // file name), so phones download the file once instead of on every page.
        source: '/sounds/:file*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
