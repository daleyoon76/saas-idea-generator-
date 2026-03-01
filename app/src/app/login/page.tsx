'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { CANYON as C } from '@/lib/colors';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: C.bg }}>
      {/* 로고 */}
      <Link href="/" className="flex items-center gap-2 mb-8 transition hover:opacity-70">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${C.amber}, ${C.amberLight})` }}
        >
          <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <span className="font-semibold text-lg" style={{ color: C.textDark }}>My CSO</span>
      </Link>

      {/* 로그인 카드 */}
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          backgroundColor: C.cardBg,
          border: `1px solid ${C.border}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        <h1 className="text-xl font-semibold text-center mb-2" style={{ color: C.textDark }}>
          로그인
        </h1>
        <p className="text-sm text-center mb-6" style={{ color: C.textMid }}>
          계정으로 로그인하여 기획서를 저장하고 관리하세요
        </p>

        {/* Google 로그인 */}
        <button
          onClick={() => signIn('google', { callbackUrl: '/workflow' })}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition hover:opacity-90"
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

        {/* 추후 소셜 로그인 확장 영역 */}
        <div className="mt-4 space-y-3">
          {/* 네이버, 카카오 버튼 추후 추가 */}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: C.textLight }}>
            로그인 없이도 기획서 생성이 가능합니다
          </p>
          <Link
            href="/workflow"
            className="text-xs font-medium mt-1 inline-block transition hover:opacity-70"
            style={{ color: C.accent }}
          >
            로그인 없이 시작하기 &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
