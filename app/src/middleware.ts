export { authMiddleware as middleware } from '@/lib/auth.edge';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/ideas/:path*',
    '/api/plans/:path*',
    '/api/prds/:path*',
  ],
};
