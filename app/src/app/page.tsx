import Link from "next/link";
import { CANYON } from "@/lib/colors";
import UserMenu from "@/components/UserMenu";

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    title: "에이전트 팀 기획서",
    description: "4개의 전문 에이전트가 시장·경쟁·전략·재무 섹션을 순차적으로 심화 작성. 단일 LLM 대비 품질이 크게 향상됩니다.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    title: "실시간 시장 조사",
    description: "기획서 품질을 높이기 위해 Tavily 검색 + Reddit 페인포인트 + Google Trends + Product Hunt 데이터를 자동 수집합니다.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    title: "다중 AI 모델 지원",
    description: "Claude, Gemini, GPT 중 원하는 모델로 자유롭게 선택. 모델별 가용 상태를 실시간으로 표시합니다.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    title: ".md / .docx 저장",
    description: "완성된 사업기획서와 PRD를 마크다운 또는 워드(.docx) 파일로 즉시 다운로드. 폴더 선택 저장도 지원합니다.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
    title: "AI 아이디어 발굴",
    description: "아이디어가 없을 때도 괜찮습니다. AI가 시장 데이터를 분석해 유망한 SaaS/Agent 아이디어 3개를 자동 도출합니다.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    title: "PRD 자동 생성",
    description: "개발 단계로 바로 넘어가고 싶다면, 사업기획서를 바탕으로 개발팀용 PRD를 즉시 생성할 수 있습니다.",
  },
];

const steps = [
  {
    num: "01",
    title: "아이디어 입력",
    desc: "만들고 싶은 서비스를 간단히 설명하세요. 몇 가지 질문으로 구체화합니다.",
  },
  {
    num: "02",
    title: "시장 조사",
    desc: "AI가 관련 시장과 경쟁 현황을 자동으로 리서치합니다.",
  },
  {
    num: "03",
    title: "기획서 작성",
    desc: "4개의 전문 에이전트가 13섹션 사업기획서를 순차 작성합니다.",
  },
  {
    num: "04",
    title: "다운로드",
    desc: "완성된 기획서를 마크다운 또는 워드(.docx) 파일로 저장하세요.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: CANYON.bg }}>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section
        className="relative overflow-x-clip"
        style={{
          background: `linear-gradient(135deg, ${CANYON.heroBlack} 0%, ${CANYON.textDark} 30%, ${CANYON.deepRed} 60%, ${CANYON.mediumRed} 80%, ${CANYON.accent} 100%)`,
        }}
      >
        {/* Ambient glow blobs — canyon light beams */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          {/* Amber light beam — center top */}
          <div
            className="animate-blob absolute top-0 left-1/2 -translate-x-1/2 w-64 h-96 rounded-full filter blur-3xl opacity-30"
            style={{ background: CANYON.amber }}
          />
          {/* Terracotta glow — left */}
          <div
            className="animate-blob animation-delay-2000 absolute -top-20 -left-20 w-80 h-80 rounded-full filter blur-3xl opacity-20"
            style={{ background: CANYON.accent }}
          />
          {/* Sandy warm — bottom right */}
          <div
            className="animate-blob animation-delay-4000 absolute bottom-0 right-0 w-72 h-72 rounded-full filter blur-3xl opacity-15"
            style={{ background: CANYON.amberLight }}
          />
        </div>

        {/* Subtle layered stripe texture (canyon strata) */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(160deg, rgba(255,220,160,0.6) 0px, transparent 2px, transparent 28px, rgba(255,180,100,0.4) 30px)",
          }}
          aria-hidden
        />

        {/* Nav */}
        <nav className="relative z-20 max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${CANYON.amber}, ${CANYON.amberLight})` }}
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-base tracking-tight">My CSO</span>
          </div>
          <div className="flex items-center gap-3">
            <UserMenu />
            <Link
              href="/start"
              className="px-4 py-2 text-sm rounded-lg border transition backdrop-blur-sm"
              style={{
                background: `rgba(245, 144, 30, 0.15)`,
                borderColor: `rgba(245, 144, 30, 0.35)`,
                color: "#FFD0A0",
              }}
            >
              시작하기 →
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-14 pb-24 text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-full border mb-8 backdrop-blur-sm"
            style={{
              background: "rgba(245, 144, 30, 0.12)",
              borderColor: "rgba(245, 144, 30, 0.30)",
              color: CANYON.lightAmber,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CANYON.amberLight }} />
            Claude · Gemini · GPT 지원
          </div>

          <h1 className="text-5xl md:text-6xl font-bold leading-[1.15] tracking-tight mb-6" style={{ color: CANYON.cream }}>
            당신의 아이디어를<br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(90deg, ${CANYON.amberLight} 0%, ${CANYON.amber} 40%, ${CANYON.cream} 100%)`,
              }}
            >
              사업기획서로 완성합니다
            </span>
          </h1>

          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: "rgba(240, 192, 160, 0.75)" }}>
            아이디어만 알려주세요.<br className="hidden md:block" />
            AI 에이전트 팀이 시장 조사부터 13섹션 사업기획서까지 자동으로 작성합니다.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/start"
              className="inline-flex items-center gap-2 px-8 py-4 font-semibold rounded-xl transition text-base shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${CANYON.amber}, ${CANYON.amberLight})`,
                color: CANYON.heroBlack,
                boxShadow: "0 8px 32px rgba(245, 144, 30, 0.45)",
              }}
            >
              무료로 시작하기
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <span className="text-sm" style={{ color: "rgba(240, 192, 160, 0.45)" }}>아이디어가 없어도 AI가 발굴해드립니다</span>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3" style={{ color: CANYON.textDark }}>어떻게 작동하나요?</h2>
          <p style={{ color: CANYON.textMid }}>아이디어 하나로 완성된 사업기획서까지 4단계</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <div key={s.num} className="relative">
              {i < steps.length - 1 && (
                <div
                  className="hidden md:block absolute top-5 h-px"
                  style={{
                    left: "calc(50% + 24px)",
                    right: "calc(-50% + 24px)",
                    background: `linear-gradient(90deg, ${CANYON.lightAmber}, transparent)`,
                  }}
                />
              )}
              <div className="flex flex-col items-center text-center">
                <div
                  className="w-10 h-10 rounded-full font-bold flex items-center justify-center mb-4 text-xs shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${CANYON.cream}, ${CANYON.lightAmber})`,
                    color: CANYON.deepRed,
                    border: "1px solid #F0C0A0",
                  }}
                >
                  {s.num}
                </div>
                <h3 className="font-semibold mb-1.5 text-sm" style={{ color: CANYON.textDark }}>{s.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: CANYON.textMid }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section className="py-20" style={{ background: `linear-gradient(180deg, ${CANYON.bg} 0%, ${CANYON.warmBeige} 100%)` }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3" style={{ color: CANYON.textDark }}>주요 기능</h2>
            <p style={{ color: CANYON.textMid }}>AI 에이전트 팀이 전문가 수준의 사업기획서를 작성합니다</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-6 hover:-translate-y-0.5 transition-all duration-200"
                style={{
                  background: CANYON.cardBg,
                  border: `1px solid ${CANYON.border}`,
                  boxShadow: "0 1px 4px rgba(139, 53, 32, 0.06)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    background: `linear-gradient(135deg, ${CANYON.cream}, ${CANYON.lightAmber})`,
                    color: CANYON.accent,
                  }}
                >
                  {f.icon}
                </div>
                <h3 className="font-semibold mb-2 text-sm" style={{ color: CANYON.textDark }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: CANYON.textMid }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────── */}
      <section className="py-20 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-3" style={{ color: CANYON.textDark }}>지금 바로 시작해보세요</h2>
          <p className="mb-8" style={{ color: CANYON.textMid }}>아이디어를 사업기획서로, 지금 바로 시작하세요</p>
          <Link
            href="/start"
            className="inline-flex items-center gap-2 px-8 py-4 font-semibold rounded-xl transition"
            style={{
              background: `linear-gradient(135deg, ${CANYON.accent}, ${CANYON.amber})`,
              color: CANYON.cream,
              boxShadow: "0 4px 20px rgba(194, 75, 37, 0.35)",
            }}
          >
            시작하기
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${CANYON.border}` }} className="py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-xs" style={{ color: CANYON.textLight }}>
          <span>My CSO</span>
          <span>Powered by Claude · Gemini · GPT</span>
        </div>
      </footer>
    </div>
  );
}
