export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/ideas/:path*',
    '/api/plans/:path*',
    '/api/prds/:path*',
  ],
};
