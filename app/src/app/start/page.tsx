'use client';

import Link from 'next/link';
import { CANYON } from '@/lib/colors';
import UserMenu from '@/components/UserMenu';

const C = CANYON;

export default function StartPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: C.bg }}>
      {/* 네비게이션 */}
      <nav className="w-full px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="text-lg font-bold" style={{ color: C.textDark }}>
          My CSO
        </Link>
        <UserMenu />
      </nav>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-3xl">
          <h1
            className="text-2xl md:text-3xl font-bold text-center mb-3"
            style={{ color: C.textDark }}
          >
            어떤 방식으로 시작하시겠어요?
          </h1>
          <p className="text-center mb-10 text-sm" style={{ color: C.textMid }}>
            아이템이 있다면 바로 기획서를 작성하고, 없다면 AI가 발굴해드립니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 카드 1: 가이드 질문 경로 */}
            <Link href="/guided" className="block group">
              <div
                className="rounded-2xl p-6 md:p-8 h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg cursor-pointer"
                style={{
                  backgroundColor: C.cardBg,
                  border: `1.5px solid ${C.border}`,
                }}
              >
                {/* 아이콘 */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-2xl"
                  style={{ backgroundColor: C.cream }}
                >
                  📋
                </div>

                <h2 className="text-lg font-bold mb-2" style={{ color: C.textDark }}>
                  생각하고 계신 아이템이 있다면
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: C.textMid }}>
                  몇 개의 질문으로 사업기획서 초안을 작성해드립니다.
                  이미 구상 중인 아이디어가 있을 때 빠르게 기획서를 만들어보세요.
                </p>

                <div
                  className="mt-5 inline-flex items-center text-sm font-semibold gap-1"
                  style={{ color: C.accent }}
                >
                  질문 시작하기 <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>

            {/* 카드 2: 기존 워크플로우 경로 */}
            <Link href="/workflow" className="block group">
              <div
                className="rounded-2xl p-6 md:p-8 h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg cursor-pointer"
                style={{
                  backgroundColor: C.cardBg,
                  border: `1.5px solid ${C.border}`,
                }}
              >
                {/* 아이콘 */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-2xl"
                  style={{ backgroundColor: C.cream }}
                >
                  💡
                </div>

                <h2 className="text-lg font-bold mb-2" style={{ color: C.textDark }}>
                  아직 아이디어가 없다면
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: C.textMid }}>
                  AI가 시장을 조사하고 유망한 아이디어 3개를 제안합니다.
                  키워드만 넣으면 트렌드 분석부터 아이디어 도출까지 자동으로 진행됩니다.
                </p>

                <div
                  className="mt-5 inline-flex items-center text-sm font-semibold gap-1"
                  style={{ color: C.accent }}
                >
                  AI 아이디어 발굴 <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
