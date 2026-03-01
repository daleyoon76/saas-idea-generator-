export { auth as middleware } from '@/lib/auth';

export const config = {
  // Phase A: 미들웨어가 세션을 읽기만 하고, 리다이렉트하지 않음
  // Phase B에서 matcher를 확장하여 /dashboard, /api/save-plan 등 보호
  matcher: ['/dashboard/:path*'],
};
