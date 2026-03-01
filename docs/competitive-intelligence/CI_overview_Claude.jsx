import { useState } from "react";

const competitors = {
  korean: [
    {
      name: "DocShunt (독스헌트)",
      url: "docshunt.ai",
      tagline: "아이디어만 입력하면 전문가 수준의 사업계획서 자동 생성",
      target: "예비창업자, 정부지원사업 준비자",
      pricing: "스타터 무료 / 프로 15만원~",
      strengths: [
        "정부지원사업 양식(예창패, 초창패 등)에 특화",
        "약 3분 내 30장 분량 생성",
        "RAG 기반 근거 자료 레퍼런스 제공 (프로)",
        "서식 채워 내보내기(Auto-Fill) 기능",
        "한국 창업 생태계에 최적화된 UX",
      ],
      weaknesses: [
        "단일 AI 호출 구조 (멀티에이전트 아님)",
        "실시간 웹 데이터 수집 제한적",
        "Devil's Advocate 같은 비판적 검토 부재",
        "투자자용보다 정부지원사업에 편중",
        "생성 후 수정 인터랙션 제한적",
      ],
      overlap: 75,
    },
    {
      name: "뤼튼 (Wrtn)",
      url: "wrtn.ai",
      tagline: "한국 최적화 범용 AI 플랫폼 (MAU 650만)",
      target: "일반 사용자, 학생, 직장인 등 전 연령층",
      pricing: "무료 (광고 기반 수익모델)",
      strengths: [
        "압도적 사용자 기반 (650만 MAU)",
        "한국어 최적화 / 다양한 LLM 오케스트레이션",
        "무료로 GPT-4급 모델 사용 가능",
        "사업계획서 외 범용 업무 문서 지원",
        "카카오톡 연동 등 접근성 우수",
      ],
      weaknesses: [
        "사업기획서 전문 도구가 아닌 범용 챗봇",
        "구조화된 14개 섹션 자동 생성 불가",
        "멀티소스 시장 데이터 자동 수집 미지원",
        "재무 모델링 전문 에이전트 없음",
        "출처 강제/할루시네이션 억제 시스템 미비",
      ],
      overlap: 40,
    },
    {
      name: "MyMap.ai (한국어 지원)",
      url: "mymap.ai",
      tagline: "60초 만에 비주얼 비즈니스 플랜 생성",
      target: "글로벌 예비창업자, 학생, 소규모 사업자",
      pricing: "무료 기본 / Pro 월 $9~",
      strengths: [
        "비주얼 마인드맵 기반 직관적 UI",
        "60초 내 빠른 초안 생성",
        "다국어 지원 (한국어 포함)",
        "PNG/공유 URL로 간편 공유",
        "기존 문서 업로드 → AI 확장 기능",
      ],
      weaknesses: [
        "사업기획서 깊이보다 개요 수준 생성",
        "한국 시장 데이터/정부지원사업 미특화",
        "재무 전망 수준이 얕음",
        "경쟁사 분석 자동화 미지원",
        "멀티에이전트/Devil's Advocate 부재",
      ],
      overlap: 35,
    },
  ],
  global: [
    {
      name: "Upmetrics",
      url: "upmetrics.co",
      tagline: "AI 기반 올인원 비즈니스 플래닝 SaaS (11만+ 사용자)",
      target: "SMB, 컨설턴트, 교육기관, 인큐베이터",
      pricing: "월 $7~ (Free trial 있음)",
      strengths: [
        "400+ 산업별 템플릿 & 샘플 플랜",
        "자동 재무예측 (P&L, 캐시플로우, 손익분기)",
        "QuickBooks/Xero 실 데이터 연동",
        "실시간 팀 협업 (Google Docs급)",
        "AI 피치덱 자동 생성 연계",
        "7~10년 재무 시나리오 테스트",
      ],
      weaknesses: [
        "AI가 보조 역할 (자율 생성보다 가이드)",
        "실시간 웹 시장 데이터 자동 수집 없음",
        "멀티에이전트 구조 아님 (단일 AI 어시스턴트)",
        "한국어/한국 시장 미지원",
        "비판적 검토(Devil's Advocate) 부재",
      ],
      overlap: 55,
    },
    {
      name: "ProAI",
      url: "proai.co",
      tagline: "10만+ 펀딩된 기업가가 신뢰하는 AI 비즈니스 플랜",
      target: "투자 유치 준비 창업자, 소규모 기업",
      pricing: "무료 시작 / 유료 플랜 별도",
      strengths: [
        "투자자급(Investor-ready) 포맷에 특화",
        "상세 재무 프로젝션 자동 생성",
        "산업별 맞춤 시장 인사이트 제공",
        "365일 전문가 지원 서비스",
        "10만+ 실 사용자 검증",
      ],
      weaknesses: [
        "멀티에이전트 구조 아님",
        "실시간 데이터 소스(Reddit, Trends 등) 미연동",
        "기존 기획서 Import & 심화 기능 없음",
        "한국어 미지원",
        "Devil's Advocate / 리스크 분석 약함",
      ],
      overlap: 60,
    },
    {
      name: "Foundor.ai",
      url: "foundor.ai",
      tagline: "AI 사업 계획서 + 피치덱 원스톱 플랫폼",
      target: "스타트업 창업자, 비즈니스 교육기관",
      pricing: "무료 시작 / 유료 플랜 별도",
      strengths: [
        "사업계획서 → 피치덱 자동 변환",
        "린 캔버스 기반 구조화된 접근",
        "학술/교육 기관 활용 사례 다수",
        "다국어 지원 (한국어 포함)",
        "PDF 내보내기 & 링크 공유",
      ],
      weaknesses: [
        "실시간 시장 데이터 수집 없음",
        "멀티에이전트 협업 구조 아님",
        "재무 모델링 깊이 부족",
        "출처 강제 시스템 없음",
        "한국 시장 특화 기능 없음",
      ],
      overlap: 45,
    },
  ],
};

const strategies = [
  {
    icon: "🇰🇷",
    title: "한국 정부지원사업 양식 네이티브 지원",
    desc: "예비창업패키지, 초기창업패키지, 창업성장기술개발 등 주요 정부지원사업 양식을 템플릿으로 내장하고, 생성된 14개 섹션을 해당 양식에 자동 매핑하는 기능 추가. DocShunt의 핵심 장점을 흡수하면서 멀티에이전트 품질로 차별화.",
    priority: "HIGH",
    effort: "중간",
  },
  {
    icon: "📊",
    title: "인터랙티브 재무 대시보드",
    desc: "현재 재무 모델링 에이전트의 결과를 정적 텍스트가 아닌 조정 가능한 시나리오 대시보드로 제공. Upmetrics처럼 매출 가정을 슬라이더로 바꾸면 P&L, 캐시플로우가 실시간 변동하는 인터랙티브 UI 도입.",
    priority: "HIGH",
    effort: "높음",
  },
  {
    icon: "🎯",
    title: "피치덱 자동 생성 파이프라인",
    desc: "완성된 사업기획서를 원클릭으로 투자자용 피치덱(10~15슬라이드)으로 변환. Foundor.ai와 Upmetrics가 이미 제공 중인 기능으로, '기획서 → 피치덱 → 발표 스크립트'까지 원스톱 제공하면 강력한 차별점.",
    priority: "HIGH",
    effort: "중간",
  },
  {
    icon: "🤝",
    title: "팀 협업 & 버전 관리",
    desc: "공동 창업자, 멘토, 투자자가 실시간으로 기획서에 코멘트하고 수정 이력을 추적할 수 있는 협업 기능. Upmetrics의 핵심 강점을 벤치마킹. 특히 멘토 피드백 워크플로우는 한국 액셀러레이터/인큐베이터 시장에서 강력한 B2B 후크가 될 수 있음.",
    priority: "MEDIUM",
    effort: "높음",
  },
  {
    icon: "🔄",
    title: "반복 심화(Iterative Deepening) 루프",
    desc: "1차 생성 후 사용자가 특정 섹션을 선택해 '더 깊게 분석해줘'를 요청하면 해당 에이전트만 재실행하는 부분 재생성 기능. 현재 전체 재생성 방식의 비효율을 해소하고, 사용자 맞춤형 깊이 조절이 가능.",
    priority: "MEDIUM",
    effort: "낮음",
  },
  {
    icon: "🌏",
    title: "글로벌 확장을 위한 영문 모드",
    desc: "한국어 우선이되 영문 생성 옵션을 추가해 글로벌 시장 진출 준비. 글로벌 경쟁사 대비 '멀티에이전트 + 실시간 데이터 + Devil's Advocate'라는 고유 포지션은 영어권에서도 충분히 차별화됨. Product Hunt 런치를 통한 초기 트랙션 확보 전략.",
    priority: "MEDIUM",
    effort: "중간",
  },
];

const myCsoFeatures = [
  "멀티에이전트 팀 (5개)",
  "실시간 4-way 데이터",
  "출처 강제/할루시네이션 억제",
  "Devil's Advocate",
  "기존 문서 Import",
  "14개 섹션 구조화",
];

const comparisonMatrix = [
  { feature: "멀티에이전트 구조", mycso: true, docshunt: false, wrtn: false, upmetrics: false, proai: false, foundor: false },
  { feature: "실시간 웹 데이터 수집", mycso: true, docshunt: false, wrtn: false, upmetrics: false, proai: false, foundor: false },
  { feature: "출처 URL 강제", mycso: true, docshunt: "△", wrtn: false, upmetrics: false, proai: false, foundor: false },
  { feature: "Devil's Advocate", mycso: true, docshunt: false, wrtn: false, upmetrics: false, proai: false, foundor: false },
  { feature: "재무 모델링", mycso: true, docshunt: true, wrtn: false, upmetrics: true, proai: true, foundor: "△" },
  { feature: "피치덱 생성", mycso: false, docshunt: true, wrtn: false, upmetrics: true, proai: false, foundor: true },
  { feature: "팀 협업", mycso: false, docshunt: false, wrtn: false, upmetrics: true, proai: false, foundor: false },
  { feature: "기존 문서 Import", mycso: true, docshunt: false, wrtn: false, upmetrics: false, proai: false, foundor: false },
  { feature: "한국어 지원", mycso: true, docshunt: true, wrtn: true, upmetrics: false, proai: false, foundor: true },
  { feature: "정부지원사업 양식", mycso: false, docshunt: true, wrtn: false, upmetrics: false, proai: false, foundor: false },
  { feature: "인터랙티브 재무 대시보드", mycso: false, docshunt: false, wrtn: false, upmetrics: true, proai: true, foundor: false },
];

function CheckIcon() {
  return <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 18 }}>●</span>;
}
function CrossIcon() {
  return <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 18 }}>○</span>;
}
function PartialIcon() {
  return <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 18 }}>△</span>;
}

function StatusIcon({ val }) {
  if (val === true) return <CheckIcon />;
  if (val === false) return <CrossIcon />;
  return <PartialIcon />;
}

export default function CompetitiveAnalysis() {
  const [tab, setTab] = useState("overview");
  const [expandedCard, setExpandedCard] = useState(null);

  const tabs = [
    { id: "overview", label: "종합 요약" },
    { id: "korean", label: "🇰🇷 한국 경쟁사" },
    { id: "global", label: "🌍 글로벌 경쟁사" },
    { id: "matrix", label: "기능 비교표" },
    { id: "strategy", label: "전략 제안" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      color: "#e4e4e7",
      fontFamily: "'Pretendard', 'Noto Sans KR', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;900&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
        borderBottom: "1px solid rgba(99, 102, 241, 0.2)",
        padding: "32px 24px 20px",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 700, color: "#fff",
              fontFamily: "'Space Mono', monospace",
            }}>C</div>
            <div>
              <h1 style={{
                fontSize: 22, fontWeight: 700, color: "#fff",
                fontFamily: "'Noto Sans KR', sans-serif",
                letterSpacing: "-0.5px",
              }}>My CSO 경쟁 분석 리포트</h1>
              <p style={{ fontSize: 12, color: "#a5b4fc", marginTop: 2 }}>
                한국 3개 · 글로벌 3개 경쟁사 비교 분석 및 전략 제안
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: "rgba(15, 15, 25, 0.95)",
        borderBottom: "1px solid #1e1e2e",
        padding: "0 24px",
        position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(12px)",
      }}>
        <div style={{
          maxWidth: 960, margin: "0 auto",
          display: "flex", gap: 0, overflowX: "auto",
        }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "12px 16px",
              fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? "#a5b4fc" : "#71717a",
              background: "none", border: "none", cursor: "pointer",
              borderBottom: tab === t.id ? "2px solid #6366f1" : "2px solid transparent",
              whiteSpace: "nowrap",
              transition: "all 0.2s",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 24px 60px" }}>

        {/* Overview Tab */}
        {tab === "overview" && (
          <div>
            <SectionTitle>핵심 인사이트</SectionTitle>
            <div style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))",
              border: "1px solid rgba(99,102,241,0.15)",
              borderRadius: 12, padding: 24, marginBottom: 28,
              lineHeight: 1.8, fontSize: 14,
            }}>
              <p style={{ marginBottom: 16 }}>
                <strong style={{ color: "#a5b4fc" }}>My CSO의 포지션:</strong> 조사한 6개 경쟁사 중 <strong style={{ color: "#fff" }}>멀티에이전트 구조 + 실시간 멀티소스 데이터 + Devil's Advocate를 모두 갖춘 서비스는 My CSO가 유일</strong>합니다. 이 3가지 조합이 가장 강력한 기술적 해자(moat)입니다.
              </p>
              <p style={{ marginBottom: 16 }}>
                <strong style={{ color: "#a5b4fc" }}>가장 직접적인 경쟁사:</strong> 한국 시장에서는 <strong style={{ color: "#fff" }}>DocShunt</strong>가 동일 타겟(예비창업자)을 놓고 직접 경쟁합니다. 다만 DocShunt는 정부지원사업에 편중된 반면, My CSO는 투자자급 기획서에 초점을 맞춰 포지셔닝이 다릅니다.
              </p>
              <p>
                <strong style={{ color: "#a5b4fc" }}>최대 위협:</strong> 글로벌에서는 <strong style={{ color: "#fff" }}>Upmetrics</strong>(11만+ 사용자)가 재무예측·팀 협업·피치덱 생성까지 갖춘 올인원 플랫폼으로 가장 성숙한 경쟁자입니다. 단, 한국어 미지원이라는 결정적 약점이 있고, 멀티에이전트/실시간 데이터 수집 기능은 없습니다.
              </p>
            </div>

            <SectionTitle>My CSO 고유 차별점 (현재)</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 28 }}>
              {[
                { icon: "🤖", title: "5개 전문 에이전트 팀", desc: "경쟁사 전원 단일 AI 호출 방식. 멀티에이전트 순차 협업은 My CSO만의 고유 구조." },
                { icon: "📡", title: "4-way 실시간 데이터", desc: "Tavily + Reddit + Google Trends + Product Hunt 병렬 수집. 경쟁사 중 이 수준의 멀티소스는 없음." },
                { icon: "😈", title: "Devil's Advocate 내장", desc: "5번째 에이전트가 낙관적 편향을 구조적으로 제거. 6개 경쟁사 모두 미보유." },
                { icon: "📎", title: "기존 문서 Import & 심화", desc: "이미 작성된 기획서를 최신 데이터로 검증·보완. 대부분의 경쟁사는 '처음부터 생성'만 지원." },
              ].map((item, i) => (
                <div key={i} style={{
                  background: "#111118", border: "1px solid #1e1e2e",
                  borderRadius: 10, padding: 18,
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e4e4e7", marginBottom: 6 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              ))}
            </div>

            <SectionTitle>보강이 필요한 영역 (Gap)</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
              {[
                { icon: "📈", title: "인터랙티브 재무 대시보드", who: "Upmetrics, ProAI 보유" },
                { icon: "🎬", title: "피치덱 자동 생성", who: "Upmetrics, Foundor.ai, DocShunt 보유" },
                { icon: "👥", title: "팀 실시간 협업", who: "Upmetrics 보유" },
                { icon: "📋", title: "정부지원사업 양식 매핑", who: "DocShunt 보유" },
              ].map((item, i) => (
                <div key={i} style={{
                  background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)",
                  borderRadius: 10, padding: 18,
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fca5a5", marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "#a1a1aa" }}>{item.who}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Korean / Global Competitor Tabs */}
        {(tab === "korean" || tab === "global") && (
          <div>
            <SectionTitle>{tab === "korean" ? "한국 경쟁사 상세 분석" : "글로벌 경쟁사 상세 분석"}</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {competitors[tab].map((c, i) => {
                const isExpanded = expandedCard === `${tab}-${i}`;
                return (
                  <div key={i} style={{
                    background: "#111118", border: "1px solid #1e1e2e",
                    borderRadius: 12, overflow: "hidden",
                    transition: "border-color 0.2s",
                  }}>
                    <div
                      onClick={() => setExpandedCard(isExpanded ? null : `${tab}-${i}`)}
                      style={{
                        padding: "18px 20px", cursor: "pointer",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{c.name}</span>
                          <span style={{
                            fontSize: 10, padding: "2px 8px", borderRadius: 20,
                            background: c.overlap >= 60 ? "rgba(239,68,68,0.15)" : c.overlap >= 40 ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.15)",
                            color: c.overlap >= 60 ? "#fca5a5" : c.overlap >= 40 ? "#fcd34d" : "#86efac",
                            fontWeight: 600,
                          }}>겹침도 {c.overlap}%</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#71717a" }}>{c.tagline}</div>
                      </div>
                      <div style={{
                        fontSize: 18, color: "#52525b", transition: "transform 0.2s",
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                      }}>▾</div>
                    </div>

                    {isExpanded && (
                      <div style={{
                        padding: "0 20px 20px",
                        borderTop: "1px solid #1e1e2e",
                        paddingTop: 16,
                      }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, fontSize: 12 }}>
                          <div><span style={{ color: "#71717a" }}>타겟:</span> <span style={{ color: "#a5b4fc" }}>{c.target}</span></div>
                          <div><span style={{ color: "#71717a" }}>가격:</span> <span style={{ color: "#a5b4fc" }}>{c.pricing}</span></div>
                          <div><span style={{ color: "#71717a" }}>URL:</span> <span style={{ color: "#6366f1" }}>{c.url}</span></div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#22c55e", marginBottom: 8 }}>✦ 강점</div>
                            {c.strengths.map((s, j) => (
                              <div key={j} style={{
                                fontSize: 12, color: "#a1a1aa", lineHeight: 1.6,
                                paddingLeft: 12, position: "relative", marginBottom: 4,
                              }}>
                                <span style={{ position: "absolute", left: 0, color: "#22c55e" }}>·</span>
                                {s}
                              </div>
                            ))}
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#ef4444", marginBottom: 8 }}>✦ 약점 (My CSO 기회)</div>
                            {c.weaknesses.map((w, j) => (
                              <div key={j} style={{
                                fontSize: 12, color: "#a1a1aa", lineHeight: 1.6,
                                paddingLeft: 12, position: "relative", marginBottom: 4,
                              }}>
                                <span style={{ position: "absolute", left: 0, color: "#ef4444" }}>·</span>
                                {w}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Comparison Matrix */}
        {tab === "matrix" && (
          <div>
            <SectionTitle>기능 비교 매트릭스</SectionTitle>
            <p style={{ fontSize: 12, color: "#71717a", marginBottom: 16 }}>
              ● 지원 &nbsp; △ 부분 지원 &nbsp; ○ 미지원
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
                    <th style={{ textAlign: "left", padding: "10px 12px", color: "#71717a", fontWeight: 500, minWidth: 160 }}>기능</th>
                    <th style={{ textAlign: "center", padding: "10px 8px", color: "#a5b4fc", fontWeight: 700, minWidth: 80, background: "rgba(99,102,241,0.06)" }}>My CSO</th>
                    <th style={{ textAlign: "center", padding: "10px 8px", color: "#71717a", fontWeight: 500, minWidth: 80 }}>독스헌트</th>
                    <th style={{ textAlign: "center", padding: "10px 8px", color: "#71717a", fontWeight: 500, minWidth: 60 }}>뤼튼</th>
                    <th style={{ textAlign: "center", padding: "10px 8px", color: "#71717a", fontWeight: 500, minWidth: 80 }}>Upmetrics</th>
                    <th style={{ textAlign: "center", padding: "10px 8px", color: "#71717a", fontWeight: 500, minWidth: 60 }}>ProAI</th>
                    <th style={{ textAlign: "center", padding: "10px 8px", color: "#71717a", fontWeight: 500, minWidth: 70 }}>Foundor</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonMatrix.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(30,30,46,0.5)" }}>
                      <td style={{ padding: "10px 12px", color: "#d4d4d8", fontWeight: 500 }}>{row.feature}</td>
                      <td style={{ textAlign: "center", padding: "10px 8px", background: "rgba(99,102,241,0.06)" }}><StatusIcon val={row.mycso} /></td>
                      <td style={{ textAlign: "center", padding: "10px 8px" }}><StatusIcon val={row.docshunt} /></td>
                      <td style={{ textAlign: "center", padding: "10px 8px" }}><StatusIcon val={row.wrtn} /></td>
                      <td style={{ textAlign: "center", padding: "10px 8px" }}><StatusIcon val={row.upmetrics} /></td>
                      <td style={{ textAlign: "center", padding: "10px 8px" }}><StatusIcon val={row.proai} /></td>
                      <td style={{ textAlign: "center", padding: "10px 8px" }}><StatusIcon val={row.foundor} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{
              marginTop: 20, padding: 16, background: "rgba(99,102,241,0.06)",
              borderRadius: 10, border: "1px solid rgba(99,102,241,0.12)",
              fontSize: 13, color: "#a5b4fc", lineHeight: 1.7,
            }}>
              <strong>요약:</strong> My CSO는 11개 기능 중 <strong style={{ color: "#fff" }}>7개</strong>를 지원하며, 특히 상위 4개 (멀티에이전트, 실시간 데이터, 출처 강제, Devil's Advocate)는 <strong style={{ color: "#22c55e" }}>6개 경쟁사 중 유일하게 My CSO만 보유</strong>. 반면 피치덱 생성, 팀 협업, 정부양식 매핑, 인터랙티브 재무 대시보드 4개가 현재 Gap.
            </div>
          </div>
        )}

        {/* Strategy Tab */}
        {tab === "strategy" && (
          <div>
            <SectionTitle>전략적 방향성 제안 (6가지)</SectionTitle>
            <p style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 20, lineHeight: 1.7 }}>
              경쟁 분석 결과를 바탕으로, My CSO의 기존 강점(멀티에이전트 + 실시간 데이터 + Devil's Advocate)을 유지하면서 경쟁사 대비 Gap을 메우는 방향으로 6가지 전략을 제안합니다.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {strategies.map((s, i) => (
                <div key={i} style={{
                  background: "#111118", border: "1px solid #1e1e2e",
                  borderRadius: 12, padding: 20,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 22 }}>{s.icon}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", flex: 1 }}>{s.title}</span>
                    <span style={{
                      fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 600,
                      background: s.priority === "HIGH" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                      color: s.priority === "HIGH" ? "#fca5a5" : "#fcd34d",
                    }}>{s.priority}</span>
                    <span style={{
                      fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 500,
                      background: "rgba(99,102,241,0.08)", color: "#a5b4fc",
                    }}>구현 난이도: {s.effort}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.7 }}>{s.desc}</p>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 28, padding: 24,
              background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))",
              border: "1px solid rgba(99,102,241,0.15)",
              borderRadius: 12, lineHeight: 1.8, fontSize: 14,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
                🎯 추천 실행 로드맵
              </div>
              <div style={{ color: "#d4d4d8" }}>
                <p style={{ marginBottom: 12 }}>
                  <strong style={{ color: "#a5b4fc" }}>Phase 1 (1~2개월):</strong> 반복 심화 루프 + 정부지원사업 양식 매핑 → 한국 시장 즉시 경쟁력 확보. 특히 예비창업패키지 시즌(매년 3~4월)에 맞춰 출시하면 DocShunt 대비 "더 깊은 분석 + 양식 자동 매핑"으로 차별화 가능.
                </p>
                <p style={{ marginBottom: 12 }}>
                  <strong style={{ color: "#a5b4fc" }}>Phase 2 (3~4개월):</strong> 피치덱 자동 생성 + 인터랙티브 재무 대시보드 → 투자자 유치 시나리오 완성. "기획서 → 피치덱 → 재무 시나리오"를 하나의 플로우로 제공하면 한국 시장에서 유일한 풀스택 솔루션.
                </p>
                <p>
                  <strong style={{ color: "#a5b4fc" }}>Phase 3 (5~6개월):</strong> 팀 협업 + 영문 모드 → B2B(액셀러레이터/인큐베이터) 확장 및 글로벌 런치 준비. Product Hunt 런치로 글로벌 초기 트랙션을 확보하고, 한국 시장 검증 데이터를 무기로 글로벌 확장.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontSize: 17, fontWeight: 700, color: "#e4e4e7",
      marginBottom: 16, paddingBottom: 8,
      borderBottom: "1px solid #1e1e2e",
      fontFamily: "'Noto Sans KR', sans-serif",
    }}>{children}</h2>
  );
}
