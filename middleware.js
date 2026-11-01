import { NextResponse } from 'next/server';

// The back office lives on its own host (ADMIN_HOST, e.g. admin.ppsystems-shop.com).
// - On that host only the back office is served; everything else goes to /admin.
// - On every other host (the shops' site) the back office does not exist (404).
// When ADMIN_HOST is not set, nothing changes, so the site keeps working during setup.

const ADMIN_HOST = (process.env.ADMIN_HOST || '').toLowerCase();

function hostOf(request) {
  const h = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  return h.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
}

const isAdminPath = p => p === '/admin' || p.startsWith('/admin/') || p.startsWith('/api/admin/');
const isAsset = p => p.startsWith('/_next/') || /\.[a-z0-9]+$/i.test(p);

export function middleware(request) {
  if (!ADMIN_HOST) return NextResponse.next();
  const { pathname } = request.nextUrl;
  const onAdminHost = hostOf(request) === ADMIN_HOST;

  if (onAdminHost) {
    if (isAdminPath(pathname) || isAsset(pathname)) {
      const res = NextResponse.next();
      // Keep the back office out of search engines and other sites' frames.
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
      res.headers.set('X-Frame-Options', 'DENY');
      return res;
    }
    if (pathname.startsWith('/api/')) return new NextResponse('Not found', { status: 404 });
    // Build from ADMIN_HOST: behind nginx, the request URL may say localhost:3000.
    return NextResponse.redirect(new URL('/admin', `https://${ADMIN_HOST}`));
  }

  if (isAdminPath(pathname)) return new NextResponse('Not found', { status: 404 });
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
