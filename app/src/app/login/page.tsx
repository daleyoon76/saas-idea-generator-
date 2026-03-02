'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { CANYON as C } from '@/lib/colors';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: C.bg }}>
      {/* 상단 배경 그래디언트 */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${C.heroBlack} 0%, ${C.textDark} 30%, ${C.deepRed} 60%, ${C.mediumRed} 80%, ${C.accent} 100%)`,
          height: '32vh',
          minHeight: '220px',
        }}
      >
        {/* Ambient blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div
            className="animate-blob absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full filter blur-3xl opacity-25"
            style={{ background: C.amber }}
          />
          <div
            className="animate-blob animation-delay-2000 absolute -top-10 -left-10 w-48 h-48 rounded-full filter blur-3xl opacity-15"
            style={{ background: C.accent }}
          />
          <div
            className="animate-blob animation-delay-4000 absolute bottom-0 right-0 w-56 h-56 rounded-full filter blur-3xl opacity-15"
            style={{ background: C.amberLight }}
          />
        </div>

        {/* 스트라이프 텍스처 */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(160deg, rgba(255,220,160,0.6) 0px, transparent 2px, transparent 28px, rgba(255,180,100,0.4) 30px)',
          }}
          aria-hidden
        />

        {/* 네비게이션 */}
        <nav className="relative z-10 max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 transition hover:opacity-70">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${C.amber}, ${C.amberLight})` }}
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-base tracking-tight">My CSO</span>
          </Link>
          <Link
            href="/start"
            className="text-sm transition hover:opacity-70"
            style={{ color: 'rgba(240,192,160,0.7)' }}
          >
            ← 돌아가기
          </Link>
        </nav>

        {/* 히어로 텍스트 */}
        <div className="relative z-10 text-center pt-8 px-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: C.cream }}>
            다시 오신 것을 환영합니다
          </h1>
          <p className="text-sm" style={{ color: 'rgba(240,192,160,0.65)' }}>
            로그인하면 기획서를 저장하고 이어서 작업할 수 있습니다
          </p>
        </div>
      </div>

      {/* 로그인 카드 — 배경 위로 올라옴 */}
      <div className="relative z-10 flex-1 flex justify-center px-4" style={{ marginTop: '-40px' }}>
        <div
          className="w-full max-w-sm rounded-2xl p-8 h-fit"
          style={{
            backgroundColor: C.cardBg,
            border: `1px solid ${C.border}`,
            boxShadow: '0 8px 40px rgba(61, 16, 8, 0.10), 0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          {/* 소셜 로그인 */}
          <button
            onClick={() => signIn('google', { callbackUrl: '/workflow' })}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition hover:shadow-md active:scale-[0.98]"
            style={{
              backgroundColor: '#fff',
              border: `1px solid ${C.border}`,
              color: C.textDark,
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google로 계속하기
          </button>

          {/* 네이버 로그인 */}
          <button
            onClick={() => signIn('naver', { callbackUrl: '/workflow' })}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition hover:shadow-md active:scale-[0.98] mt-3"
            style={{ backgroundColor: '#03C75A', color: '#fff' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
            </svg>
            네이버로 계속하기
          </button>

          {/* 카카오 로그인 */}
          <button
            onClick={() => signIn('kakao', { callbackUrl: '/workflow' })}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition hover:shadow-md active:scale-[0.98] mt-3"
            style={{ backgroundColor: '#FEE500', color: '#000000D9' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.72 1.8 5.108 4.516 6.467-.198.74-.716 2.68-.82 3.096-.128.516.19.509.398.37.164-.109 2.609-1.77 3.657-2.487.727.103 1.478.158 2.249.158 5.523 0 10-3.463 10-7.604C22 6.463 17.523 3 12 3" />
            </svg>
            카카오로 계속하기
          </button>

          {/* 구분선 */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
            <span className="text-xs" style={{ color: C.textLight }}>또는</span>
            <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
          </div>

          {/* 로그인 없이 시작 */}
          <Link
            href="/start"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition hover:opacity-80"
            style={{
              backgroundColor: C.cream,
              color: C.textDark,
            }}
          >
            로그인 없이 시작하기
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>

          <p className="text-xs text-center mt-5" style={{ color: C.textLight }}>
            로그인 없이도 모든 기능을 이용할 수 있습니다
          </p>
        </div>
      </div>

      {/* 하단 여백 */}
      <div className="py-8" />
    </div>
  );
}
