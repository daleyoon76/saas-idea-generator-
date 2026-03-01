import { useState } from "react";

const tiers = [
  {
    id: "tier1",
    label: "Tier 1",
    title: "국내시장 / 핵심기능 — 기존 보유 기능 강화",
    subtitle: "경쟁사 대비 My CSO만의 차별점이므로 더 깊이·넓이를 확보해야 하는 기능",
    color: "#e63946",
    accent: "rgba(230,57,70,0.12)",
    border: "rgba(230,57,70,0.25)",
    items: [
      {
        icon: "🔍",
        name: "실시간 웹 데이터 수집 소스 확장",
        status: "기존 보유 → 고도화",
        why: "현재 Tavily + Reddit + Google Trends + Product Hunt 4-way 구조. 국내 경쟁사(DocShunt, 펄스웨이브) 모두 실시간 웹 데이터 수집 없음. 글로벌(Upmetrics, LivePlan, PrometAI)도 산업 보고서 의존이라 실시간 웹 검색 자체가 My CSO 최대 차별점. 뤼튼 등 챗봇은 범용 웹 검색에 머물러 있어, 타겟화된 국내 실시간 데이터 수집은 매우 강력한 비교 우위.",
        competitors: "DocShunt: RAG 기반 근거자료(정적 DB) / 펄스웨이브: 없음 / Upmetrics: 정기 산업보고서 / PrometAI: 통합 DB / LivePlan: 산업 벤치마크(정적)",
        todo: [
          "네이버 데이터랩·네이버 트렌드 API 연동 (국내 검색 트렌드 반영)",
          "DART(전자공시) 크롤링으로 국내 기업 재무 데이터 자동 수집",
          "K-Startup·중소벤처기업부 공고 데이터 실시간 수집 (정부 생태계 연결)",
          "크몽·탈잉 등 국내 프리랜서/서비스 플랫폼 가격 데이터 수집 (운영비 산출 근거)",
          "한국 커뮤니티(디시인사이드, 블라인드, 에브리타임) 페인포인트 수집 추가",
          "수집된 데이터에 '신뢰 등급(Trust Level)' 태깅 시스템 도입 (Gemini 보고서 제안)",
        ],
      },
      {
        icon: "🤖",
        name: "멀티에이전트 팀 협업 구조 심화 + Devil's Advocate 한국형 튜닝",
        status: "기존 보유 → 고도화",
        why: "5개 전문 에이전트(시장·경쟁·전략·재무·Devil's Advocate) 순차 협업은 6개 경쟁사 중 유일. 특히 낙관적 편향을 제거하는 Devil's Advocate는 경쟁사 전원이 미보유한 구조적 장점이므로, 한국 규제 환경과 지원사업 심사위원의 전형적인 압박 질문 스타일로 정교하게 튜닝하여 기획서의 현실성과 방어력을 높여야 함.",
        competitors: "DocShunt: 단일 AI + AI Copilot(피드백) / Upmetrics: 4개 AI 에이전트(보조역할) / PrometAI: 단일 LLM + 전략 프레임워크 / LivePlan: AI 작문 보조(선택적) / 전 경쟁사: Devil's Advocate 부재",
        todo: [
          "에이전트 간 교차 검증(Cross-Verification) 단계 추가 — 시장분석 데이터를 재무 에이전트가 재검증",
          "Devil's Advocate 스트레스 테스트 고도화 — '경쟁사 가격 20% 인하 시' 같은 시나리오 자동 실행",
          "Devil's Advocate 한국형 튜닝 — 한국 규제 환경(인허가, 개인정보보호법 등) 리스크 자동 점검",
          "Devil's Advocate 심사위원 모드 — 정부지원사업 심사위원의 전형적 압박 질문('시장 규모 근거?', '경쟁사 대비 기술적 우위 입증?') 시뮬레이션",
          "에이전트별 신뢰도 점수 시각화 — 각 섹션이 어느 수준의 데이터로 뒷받침되는지 투명하게 표시",
          "에이전트 실행 과정 실시간 스트리밍 — 사용자가 각 에이전트가 무엇을 하고 있는지 볼 수 있도록",
        ],
      },
      {
        icon: "📎",
        name: "출처 강제 / 할루시네이션 억제 시스템 고도화",
        status: "기존 보유 → 고도화",
        why: "모든 수치에 URL 각주 강제 + '가상 수치 금지' 시스템 규칙은 My CSO 유일. Venturekit은 출처 없는 수치 생성으로 할루시네이션 심각하다는 평가. DocShunt는 RAG 기반이나 출처 강제는 아님.",
        competitors: "DocShunt: RAG 기반 참고자료(강제 아님) / Venturekit: 할루시네이션 심각(Shopify 리뷰) / PrometAI: 산업 데이터 사용하나 출처 표기 제한적 / LivePlan: 벤치마크 데이터 출처 있음",
        todo: [
          "출처 불분명 시 '유사 산업 사례 기반 추정치' 논리 근거 함께 제시 (Gemini 제안)",
          "Tavily 검색 결과를 벡터 DB 일시 저장 → LLM이 반드시 컨텍스트 내에서만 정보 추출하도록 강제",
          "출처 URL 자동 검증(dead link 체크) + 출처 신뢰도 등급(정부통계 > 뉴스 > 블로그) 시각화",
          "생성된 수치와 실제 출처 수치 간 불일치 자동 감지 알림",
        ],
      },
    ],
  },
  {
    id: "tier2",
    label: "Tier 2",
    title: "국내시장 / 핵심기능 — 신규 개발 필요",
    subtitle: "국내 경쟁사가 보유한 킬러 기능 또는 한국 시장 진입에 필수적인 기능",
    color: "#f77f00",
    accent: "rgba(247,127,0,0.10)",
    border: "rgba(247,127,0,0.25)",
    items: [
      {
        icon: "🏛️",
        name: "정부지원사업 양식 네이티브 매핑",
        status: "신규 개발",
        why: "DocShunt·펄스웨이브의 핵심 경쟁력. 한국 창업자 대다수가 예비창업패키지·초기창업패키지 등 정부지원사업 선정을 목표로 사업계획서 작성. 이 양식 미지원 시 한국 시장의 핵심 타겟 이탈 위험.",
        competitors: "DocShunt: '원하는 양식으로 내보내기' 기능 (사용자 양식 업로드 → 자동 채움, 80건+ VOC 수집 후 고도화 중) / 펄스웨이브: 400+ 정부지원사업 양식 내장 / 퀀텀점프클럽: 512개+ 공고 수집 + Make.com 워크플로우로 양식 초안 10분 생성",
        todo: [
          "예비창업패키지·초기창업패키지·창업성장기술개발·TIPS 등 주요 5개 양식 우선 템플릿화",
          "My CSO 14개 섹션 → 정부양식 항목 자동 매핑 엔진 개발",
          "HWP/DOCX 양식으로 직접 내보내기 (한국 정부기관 HWP 필수)",
          "심사위원 평가 기준 반영 피드백 기능 (ZUZU 벤치마킹 — AI가 심사 기준으로 채점·개선 제안)",
          "정부지원사업 공고 실시간 수집 + 사용자 조건 매칭 알림 (퀀텀점프클럽 기능 흡수)",
        ],
      },
      {
        icon: "📊",
        name: "한국형 시장 데이터 특화 분석",
        status: "신규 개발",
        why: "비즈가이드(비즈니스캔버스)는 20만 건 실제 컨설팅 데이터 학습. 국내 경쟁사들이 한국 시장 데이터에 특화된 반면, My CSO의 4-way 소스는 글로벌 편향. 한국 TAM/SAM/SOM 산출 시 국내 데이터 필수.",
        competitors: "비즈가이드: 20만 건 컨설팅 데이터 + 전문가 검수 알고리즘 / DocShunt: 한국 창업 생태계 최적화 UX + 시장규모 도표 자동 생성 / 펄스웨이브: 정부지원사업 전략 연계 데이터",
        todo: [
          "통계청 KOSIS, 한국은행 ECOS API 연동 — 국내 산업별 시장 규모·성장률 자동 수집",
          "한국 VC 투자 트렌드 데이터(더벤처스, KVIC) 연동 — 투자자 관심 산업 분석",
          "네이버 쇼핑·카카오커머스 트렌드 데이터로 B2C 시장 검증",
          "한국 스타트업 성공/실패 사례 DB 구축 — 유사 업종 벤치마크 제공",
        ],
      },
      {
        icon: "📥",
        name: "기존 문서 Import 후 최신 데이터 리프레시",
        status: "신규 개발",
        why: "빈 화면에서 시작하는 대신 기존 기획안을 업로드하면, 에이전트 팀이 최신 웹 검색을 통해 과거의 낡은 시장 수치를 업데이트하고 논리적 공백을 채우는 기능. 매년 새롭게 지원사업에 재도전하는 국내 창업자들에게 매우 실용적이고 고부가가치를 지닌 무기. DocShunt도 기존 문서 업로드를 지원하나 AI Copilot 피드백 수준이며, 글로벌 경쟁사 중 ProAI·Venturekit은 Import 기능 자체가 없음.",
        competitors: "DocShunt: 기존 문서 업로드 → AI Copilot 피드백 (양식 내보내기 80건+ VOC 고도화 중) / Upmetrics: 기존 플랜 편집 가능 / PrometAI: Import 없음(처음부터 작성) / LivePlan: 기존 데이터 가져오기(재무 중심)",
        todo: [
          "업로드 문서 내 오래된 수치(예: 2023년) 자동 감지 → 최신 수치로 업데이트 제안",
          "문서 내 논리적 공백(빈 섹션, 부실한 분석) 자동 진단 → 해당 에이전트가 자동 보완",
          "HWP/한글 파일 파싱 지원 (한국 정부사업 문서 대부분 HWP)",
          "업로드 문서 vs AI 생성 결과 diff 뷰 제공 — 어디가 보완되었는지 한눈에 확인",
          "연도별 버전 관리 — 2025년 버전 → 2026년 리프레시 이력 추적 (재도전 창업자 핵심 니즈)",
        ],
      },
      {
        icon: "🎤",
        name: "프레젠테이션(발표자료) 자동 생성",
        status: "신규 개발",
        why: "DocShunt가 이미 '프레젠테이션 만들기' 기능 제공 (별도 메뉴). 정부지원사업·투자 유치 시 사업계획서 외에 발표자료가 필수. 기획서 → 발표자료 변환은 국내 시장에서 즉각적 수요.",
        competitors: "DocShunt: 프레젠테이션 자동 생성 (사업계획서·발표자료 별도 메뉴) / 뤼튼: 범용 문서에서 PPT 템플릿 제공",
        todo: [
          "사업기획서 14개 섹션 → 10~15슬라이드 발표자료 자동 변환",
          "발표 스크립트 자동 생성 (슬라이드별 멘트)",
          "정부지원사업 발표면접 예상 질문 + 모범답변 생성 (심사위원 관점)",
          "PPTX/PDF 내보내기 + 한국식 디자인 템플릿",
        ],
      },
    ],
  },
  {
    id: "tier3",
    label: "Tier 3",
    title: "국내시장 / 부가기능",
    subtitle: "경쟁사 보유 기능 또는 신규 기획으로, 국내 시장에서 차별화를 강화하는 부가 기능",
    color: "#2a9d8f",
    accent: "rgba(42,157,143,0.10)",
    border: "rgba(42,157,143,0.25)",
    items: [
      {
        icon: "🔄",
        name: "반복 심화(Iterative Deepening) 루프",
        status: "신규 개발 · 크레딧 과금 연계",
        why: "현재 My CSO는 전체 리포트 1회 생성 방식. 특정 섹션만 더 깊이 분석하고 싶을 때 전체 재생성은 비효율. 이 기능은 어떤 경쟁사도 없으나, 사용자 맞춤형 깊이 조절이 가능해 강력한 부가가치.",
        competitors: "전 경쟁사 미보유 — My CSO만의 신규 기능 기회",
        todo: [
          "풀 리포트 생성 후 각 섹션에 '더 깊게 분석' 버튼 추가",
          "해당 에이전트만 재실행하여 섹션별 심화 분석 생성",
          "심화 분석 시 추가 크레딧 차감 모델 설계",
          "심화 히스토리 관리 — 1차·2차·3차 분석 결과 비교 뷰",
        ],
      },
      {
        icon: "🔔",
        name: "지원사업 공고 매칭 및 알림",
        status: "신규 개발 · 실행 연결",
        why: "퀀텀점프클럽의 사례처럼 완성된 기획서의 성격(업종, 기술)을 바탕으로 현재 열려 있는 맞춤형 정부지원사업을 매칭해주는 기능. 독스헌트 역시 단순 문서 작성을 넘어 지원사업 '합격' 자체를 목표로 삼고 환급 이벤트를 진행하는 등 실행 영역으로 넘어가고 있으므로, '작성 → 실행(지원)'을 묶는 알림 훅(Hook)이 필요.",
        competitors: "퀀텀점프클럽: 512개+ 공고 실시간 수집 + AI 필터링 + Make.com 자동화로 양식 초안 10분 생성 / DocShunt: 합격 목표 마케팅 + 환급 이벤트 → 실행 영역 확장 중 / 펄스웨이브: 현재 모집 중인 지원사업 확인 기능",
        todo: [
          "K-Startup·중소벤처기업부·창업진흥원 공고 실시간 크롤링",
          "완성된 기획서의 업종·기술·규모 기반으로 적합 지원사업 자동 매칭",
          "매칭된 지원사업 알림 (이메일·카카오톡·앱 푸시)",
          "지원사업별 기획서 양식 차이점 자동 분석 → 기존 기획서 어댑팅 가이드 제공",
          "지원사업 마감일 캘린더 뷰 + 리마인더",
        ],
      },
      {
        icon: "💬",
        name: "AI Copilot 실시간 피드백",
        status: "신규 개발",
        why: "DocShunt가 'AI Copilot' 기능으로 사업계획서 각 섹션을 분석하고 개선 제안. 비즈가이드는 전문가 수준 검수 알고리즘 탑재. 생성 후 '컨설턴트처럼' 피드백하는 기능은 국내 시장에서 기대치 높음.",
        competitors: "DocShunt: AI Copilot (섹션별 분석 + 개선 제안, 신한카드 PoC 검증) / 비즈가이드: 자체 검수 알고리즘 / ZUZU: 정부지원사업 심사기준 기반 AI 피드백(10회 무료)",
        todo: [
          "생성된 기획서에 대한 AI 컨설턴트 모드 — 섹션별 '이 부분은 ○○이 약합니다' 피드백",
          "투자자 시점 피드백 모드 — '투자자라면 이 부분에서 질문할 것입니다'",
          "정부사업 심사위원 시점 피드백 — 평가 항목별 점수화 + 개선 방향 제안",
        ],
      },
      {
        icon: "📋",
        name: "실행 태스크 자동 변환 (Bridge to Execution)",
        status: "신규 개발",
        why: "Gemini 보고서가 강력히 제안한 기능. 사업계획서는 작성 순간부터 낡아지므로, 전략을 실행 가능한 할일 목록으로 변환해 Notion·Jira 등과 연동하면 사업계획서를 넘어선 '비즈니스 OS' 포지셔닝 가능.",
        competitors: "전 경쟁사 미보유 — Gemini 보고서에서 도출된 혁신 기능",
        todo: [
          "Devil's Advocate의 MVP 추천 → To-Do 리스트 자동 변환",
          "Notion API·Linear API 연동으로 태스크 직접 삽입",
          "마일스톤 타임라인 자동 생성 (PrometAI의 task checklist 벤치마킹)",
          "전략 모니터링 알림 — 기획서 작성 시 검색 쿼리 저장 → 새로운 위협/기회 발생 시 알림",
        ],
      },
      {
        icon: "🏫",
        name: "멘토·액셀러레이터 협업 워크플로우",
        status: "신규 개발 · B2B",
        why: "한국 창업 생태계에서 멘토 피드백은 필수 과정. 액셀러레이터·인큐베이터가 보육기업 기획서를 관리하는 니즈. Upmetrics는 실시간 팀 협업(Google Docs급)을 제공하나 한국어 미지원.",
        competitors: "Upmetrics: 실시간 팀 협업 (Google Docs급) / DocShunt: B2B 확장 중 (신한카드 PoC)",
        todo: [
          "멘토 초대 → 코멘트·수정 이력 추적 기능",
          "액셀러레이터용 대시보드 — 보육기업 기획서 일괄 관리·비교",
          "멘토 피드백 → AI가 반영 방안 자동 제안",
          "버전 관리 — 수정 전후 diff 뷰 + 롤백",
        ],
      },
      {
        icon: "🌐",
        name: "한국어 최적화 UX·온보딩",
        status: "신규 개발",
        why: "뤼튼은 650만 MAU의 한국어 최적화 UI/UX로 시장 선도. DocShunt·펄스웨이브도 한국 창업자 맞춤 용어·흐름 최적화. My CSO가 기술적으로 우수해도 UX가 한국 사용자에게 친숙하지 않으면 이탈 위험.",
        competitors: "뤼튼: MAU 650만, 카카오톡 연동, 한국어 최적화 / DocShunt: 한국 창업 생태계 최적화 UX / 펄스웨이브: '필수 요소 선택형' 직관적 UI",
        todo: [
          "한국어 비즈니스 용어 사전 내장 (TAM/SAM/SOM, BEP 등 자동 설명)",
          "한국 창업 단계별 가이드 온보딩 (예비창업 → 초기창업 → 성장 단계별 맞춤)",
          "카카오톡/네이버 간편 로그인 지원",
          "모바일 최적화 — 한국은 모바일 퍼스트 시장",
        ],
      },
      {
        icon: "📈",
        name: "시장 변화 실시간 모니터링 알림",
        status: "신규 개발 · 구독형",
        why: "Gemini 보고서의 '지속적 전략 모니터링' 제안. 기획서 작성 후 시장 변화 추적을 원하는 니즈. 어떤 경쟁사도 제공하지 않아 My CSO의 '살아있는 전략 문서' 포지셔닝 강화.",
        competitors: "전 경쟁사 미보유",
        todo: [
          "기획서 작성 시 사용된 검색 쿼리를 저장 → 정기적으로 재검색",
          "경쟁사 Product Hunt 출시, 뉴스, 트렌드 변화 감지 시 알림",
          "월간 전략 리프레시 리포트 자동 생성 (구독 과금 모델)",
          "시장 변화에 따른 피벗 제안 자동 생성",
        ],
      },
    ],
  },
  {
    id: "tier4",
    label: "Tier 4",
    title: "해외시장 / 핵심기능",
    subtitle: "글로벌 경쟁사가 보유한 주요 기능이나 아직 My CSO에 없는 기능 — 해외 진출 시 필수",
    color: "#6366f1",
    accent: "rgba(99,102,241,0.10)",
    border: "rgba(99,102,241,0.25)",
    items: [
      {
        icon: "🎯",
        name: "피치덱(Pitch Deck) 파이프라인 자동화",
        status: "신규 개발",
        why: "글로벌 벤치마크 대상인 Foundor.ai와 Upmetrics는 완성된 기획서 내용을 바탕으로 10~15장의 시각적인 투자자 발표 자료(피치덱)를 자동 생성. '문서 → 발표 슬라이드'로 이어지는 원클릭 변환 파이프라인을 구축하여 해외 VC 및 엔젤 투자자 대응력을 높여야 함. MIT Sloan 연구에 따르면 사업계획서+피치덱 병행 시 펀딩 속도 68% 향상.",
        competitors: "PrometAI: 피치덱 자동 생성 + 스토어프론트 목업 / Upmetrics: AI 피치덱 빌더 / Foundor.ai: 사업계획서 → 피치덱 원클릭 변환 / Venturekit: 피치덱 빌더 / DocShunt: 프레젠테이션 생성(국내)",
        todo: [
          "사업기획서 → 10~15슬라이드 피치덱 원클릭 변환 (Guy Kawasaki 10/20/30 원칙)",
          "투자자 맞춤형 슬라이드 구성 (Problem → Solution → Market → Traction → Team → Ask)",
          "PPTX/PDF 내보내기 + 프레젠테이션 모드",
          "발표 스크립트 + 예상 Q&A 자동 생성",
          "투자자별 맞춤 버전 관리 (VC/엔젤/은행별 강조점 차별화)",
        ],
      },
      {
        icon: "💹",
        name: "인터랙티브 동적 재무 모델링 (Bridge to Execution)",
        status: "신규 개발",
        why: "Upmetrics·PrometAI 등 글로벌 경쟁사들은 매출 가정을 조정하면 P&L과 현금흐름표가 실시간 변동하는 재무 예측 대시보드를 제공. 특히 Upmetrics는 QuickBooks·Xero 등 실제 회계 소프트웨어와 연동하여 실 데이터와 예측치를 비교하는 기능도 지원. 글로벌 런칭 시 기획서를 실제 사업 운영 지표로 연결하는 재무 모델링 고도화가 필수.",
        competitors: "Upmetrics: P&L/캐시플로우/손익분기 + QuickBooks/Xero 연동 + 10년 전망 / PrometAI: DCF + Multiples + CAPM + 감도분석 ($55~145/월) / LivePlan: 산업 벤치마크 + What-If 시나리오 + QuickBooks/Xero 실시간 싱크",
        todo: [
          "매출 가정 슬라이더 → P&L/캐시플로우 실시간 변동 인터랙티브 UI",
          "Best/Base/Worst 3가지 시나리오 자동 생성 + 비교 차트",
          "DCF 기반 기업가치 평가 모듈 (PrometAI 벤치마킹)",
          "산업별 벤치마크 데이터 비교 기능 (LivePlan 벤치마킹)",
          "회계 소프트웨어(QuickBooks/Xero, 한국은 더존/세무사랑) 연동 로드맵",
          "Red Flag Scoring — 기획서 재무 취약점 점수화 + 극복 KPI 제안",
        ],
      },
      {
        icon: "🧠",
        name: "전략 프레임워크 자동 분석",
        status: "신규 개발",
        why: "PrometAI의 최대 강점. SWOT·PESTEL·Porter's Five Forces·VRIO·Strategy Canvas를 AI가 자동 적용하여 분석. 해외 투자자·MBA 출신 창업자에게 친숙한 프레임워크 부재 시 전문성 인식 하락.",
        competitors: "PrometAI: SWOT + PESTEL + Porter's Five Forces + VRIO + Strategy Canvas 전부 자동 적용 / Upmetrics: 기본 SWOT 지원 / LivePlan: SWOT 템플릿",
        todo: [
          "SWOT 분석 자동 생성 (시장·경쟁 에이전트 데이터 기반)",
          "PESTEL 분석 자동 생성 (타겟 국가별 규제·경제·기술 환경)",
          "Porter's Five Forces 자동 분석 (경쟁 에이전트 데이터 활용)",
          "린 캔버스(Lean Canvas) / 비즈니스 모델 캔버스 자동 생성",
          "Strategy Canvas 시각화 — 경쟁사 대비 포지셔닝 맵",
        ],
      },
      {
        icon: "🌍",
        name: "다국어·글로벌 확장 인프라",
        status: "신규 개발",
        why: "현재 한국어 전용. 해외 시장 진출 시 영어는 최소 필수. PrometAI는 $55~145/월 고가 포지셔닝, Upmetrics $7~19/월 저가. My CSO의 멀티에이전트+실시간 데이터+Devil's Advocate 조합은 영어권에서도 유니크.",
        competitors: "Upmetrics: 다국어 지원 + 400+ 템플릿 / PrometAI: 영어 중심 / LivePlan: 영어 전용 / Foundor.ai: 다국어 지원 / MyMap.ai: 다국어 지원",
        todo: [
          "영문 생성 모드 추가 (한국어 우선, 영어 옵션)",
          "진출국 규제·인허가 자동 분석 (Tavily 검색 활용, Gemini 제안)",
          "Product Hunt 런치 전략 수립 (글로벌 초기 트랙션)",
          "영어권 투자자 표준 양식(YC Application, Sequoia 템플릿 등) 지원",
          "통화·세금 체계 자동 전환 (USD/EUR/KRW 등)",
        ],
      },
      {
        icon: "🤝",
        name: "팀 실시간 협업 & 버전 관리",
        status: "신규 개발",
        why: "Upmetrics의 핵심 강점 — Google Docs급 실시간 공동 편집. PrometAI는 협업 기능이 약한 것이 주요 약점으로 지적됨. 해외 스타트업은 원격 협업이 기본이므로 글로벌 진출 시 필수.",
        competitors: "Upmetrics: 실시간 팀 협업 (Google Docs급) + 공유·코멘트 / DocShunt: 팀 협업 기능 (라이브 공동 편집) / PrometAI: 협업 기능 매우 제한적(주요 약점) / LivePlan: 기본 공유 기능",
        todo: [
          "실시간 공동 편집 (Operational Transform 또는 CRDT 기반)",
          "섹션별 권한 관리 (편집/코멘트/뷰어)",
          "변경 이력 추적 + 롤백 기능",
          "투자자 전용 읽기 링크 (비밀번호 보호 + 열람 분석)",
        ],
      },
      {
        icon: "📄",
        name: "NDA·텀시트 등 법률 문서 템플릿",
        status: "신규 개발 · 낮은 우선순위",
        why: "PrometAI가 NDA 템플릿·Term Sheet 템플릿을 부가 기능으로 제공. 해외 투자 유치 과정에서 실무적으로 필요하나, My CSO 핵심 가치와는 다소 거리가 있어 낮은 우선순위.",
        competitors: "PrometAI: NDA 템플릿 + Term Sheet 템플릿 제공",
        todo: [
          "기본 NDA·Term Sheet 템플릿 제공 (법률 자문 면책 안내 포함)",
          "투자 유치 체크리스트 자동 생성",
        ],
      },
    ],
  },
];

// Competitor source mapping
const sourceMap = {
  "DocShunt": { docs: ["Claude", "ClaudeCode", "Gemini(간접)"], type: "국내" },
  "펄스웨이브": { docs: ["ClaudeCode"], type: "국내" },
  "뤼튼": { docs: ["Claude", "ClaudeCode", "Gemini"], type: "국내" },
  "비즈가이드": { docs: ["Gemini"], type: "국내" },
  "퀀텀점프클럽": { docs: ["Gemini"], type: "국내" },
  "MyMap.ai": { docs: ["Claude"], type: "국내/글로벌" },
  "Upmetrics": { docs: ["Claude", "ClaudeCode", "Gemini"], type: "글로벌" },
  "PrometAI": { docs: ["ClaudeCode", "Gemini"], type: "글로벌" },
  "LivePlan": { docs: ["ClaudeCode", "Gemini"], type: "글로벌" },
  "Foundor.ai": { docs: ["Claude"], type: "글로벌" },
  "Venturekit": { docs: ["ClaudeCode"], type: "글로벌" },
  "ProAI": { docs: ["Claude"], type: "글로벌" },
};

export default function MyCSOTierAnalysis() {
  const [activeTier, setActiveTier] = useState("tier1");
  const [expandedItems, setExpandedItems] = useState({});
  const [showSources, setShowSources] = useState(false);

  const toggleItem = (tierIdx, itemIdx) => {
    const key = `${tierIdx}-${itemIdx}`;
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const currentTier = tiers.find((t) => t.id === activeTier);

  return (
    <div style={{
      fontFamily: "'Pretendard', 'Noto Sans KR', -apple-system, sans-serif",
      background: "#0a0a0f",
      color: "#e4e4e7",
      minHeight: "100vh",
      padding: "0",
    }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "32px 28px 24px",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{
            display: "inline-block",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 2,
            color: "#6366f1",
            textTransform: "uppercase",
            marginBottom: 8,
            padding: "4px 10px",
            background: "rgba(99,102,241,0.1)",
            borderRadius: 4,
          }}>My CSO · Competitive Intelligence</div>
          <h1 style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#fff",
            margin: "8px 0 6px",
            fontFamily: "'Noto Sans KR', sans-serif",
            lineHeight: 1.3,
          }}>주요기능 & 할일 — 4-Tier 전략 로드맵</h1>
          <p style={{ fontSize: 13, color: "#71717a", lineHeight: 1.6, margin: 0 }}>
            3개 CI 리포트(Claude·Gemini·ClaudeCode) 종합 + 12개 경쟁사 추가 조사 기반
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <button onClick={() => setShowSources(!showSources)} style={{
              fontSize: 11, padding: "5px 12px", borderRadius: 6,
              background: showSources ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
              border: showSources ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(255,255,255,0.08)",
              color: showSources ? "#a5b4fc" : "#71717a",
              cursor: "pointer",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}>
              {showSources ? "▾ 경쟁사 출처 맵 닫기" : "▸ 경쟁사 출처 맵 보기"}
            </button>
          </div>
          {showSources && (
            <div style={{
              marginTop: 14, padding: 16,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 8,
            }}>
              {Object.entries(sourceMap).map(([name, info]) => (
                <div key={name} style={{
                  fontSize: 11, color: "#a1a1aa", display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{
                    fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 600,
                    background: info.type === "국내" ? "rgba(42,157,143,0.15)" : info.type === "글로벌" ? "rgba(99,102,241,0.15)" : "rgba(247,127,0,0.15)",
                    color: info.type === "국내" ? "#2a9d8f" : info.type === "글로벌" ? "#a5b4fc" : "#f77f00",
                  }}>{info.type}</span>
                  <span style={{ color: "#d4d4d8", fontWeight: 500 }}>{name}</span>
                  <span style={{ color: "#52525b" }}>← {info.docs.join(", ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tier Navigation */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(10,10,15,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 28px",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 0, overflowX: "auto" }}>
          {tiers.map((tier) => (
            <button key={tier.id} onClick={() => setActiveTier(tier.id)} style={{
              padding: "14px 18px",
              fontSize: 13,
              fontWeight: activeTier === tier.id ? 700 : 500,
              color: activeTier === tier.id ? tier.color : "#71717a",
              background: "none",
              border: "none",
              borderBottom: activeTier === tier.id ? `2px solid ${tier.color}` : "2px solid transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "'Noto Sans KR', sans-serif",
              transition: "all 0.2s",
            }}>
              <span style={{
                display: "inline-block",
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 3,
                marginRight: 6,
                background: activeTier === tier.id ? `${tier.color}20` : "rgba(255,255,255,0.04)",
                color: activeTier === tier.id ? tier.color : "#52525b",
              }}>{tier.label}</span>
              {tier.id === "tier1" ? "기존 강화" : tier.id === "tier2" ? "국내 신규" : tier.id === "tier3" ? "부가기능" : "해외 핵심"}
              <span style={{
                marginLeft: 6, fontSize: 11, color: "#52525b",
              }}>({tier.items.length})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 28px 60px" }}>
        {/* Tier Header */}
        <div style={{
          padding: "20px 24px",
          background: currentTier.accent,
          border: `1px solid ${currentTier.border}`,
          borderRadius: 12,
          marginBottom: 20,
        }}>
          <div style={{
            fontSize: 18, fontWeight: 800, color: currentTier.color,
            marginBottom: 6, fontFamily: "'Noto Sans KR', sans-serif",
          }}>{currentTier.title}</div>
          <div style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.6 }}>{currentTier.subtitle}</div>
          <div style={{
            marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap",
          }}>
            <span style={{
              fontSize: 11, color: currentTier.color, fontWeight: 600,
              padding: "4px 10px", borderRadius: 20,
              background: `${currentTier.color}15`,
            }}>
              {currentTier.items.length}개 항목
            </span>
            <span style={{
              fontSize: 11, color: "#71717a", fontWeight: 500,
              padding: "4px 10px", borderRadius: 20,
              background: "rgba(255,255,255,0.04)",
            }}>
              할일 총 {currentTier.items.reduce((sum, item) => sum + item.todo.length, 0)}건
            </span>
          </div>
        </div>

        {/* Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {currentTier.items.map((item, idx) => {
            const key = `${activeTier}-${idx}`;
            const isExpanded = expandedItems[key];
            return (
              <div key={idx} style={{
                background: "#111118",
                border: isExpanded ? `1px solid ${currentTier.border}` : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}>
                {/* Collapsed Header */}
                <div onClick={() => toggleItem(activeTier, idx)} style={{
                  padding: "16px 20px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}>
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{item.name}</span>
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
                        background: item.status.includes("기존") ? "rgba(34,197,94,0.12)" : item.status.includes("크레딧") ? "rgba(245,158,11,0.12)" : "rgba(99,102,241,0.12)",
                        color: item.status.includes("기존") ? "#86efac" : item.status.includes("크레딧") ? "#fcd34d" : "#a5b4fc",
                        whiteSpace: "nowrap",
                      }}>{item.status}</span>
                    </div>
                    <div style={{
                      fontSize: 12, color: "#71717a", marginTop: 4,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>할일 {item.todo.length}건 · {item.why.substring(0, 60)}…</div>
                  </div>
                  <div style={{
                    fontSize: 16, color: "#52525b",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                    transition: "transform 0.2s",
                    flexShrink: 0,
                  }}>▾</div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={{
                    padding: "0 20px 20px",
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    {/* Why */}
                    <div style={{
                      padding: "14px 16px", marginTop: 14,
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: 8, borderLeft: `3px solid ${currentTier.color}`,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: currentTier.color, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>왜 필요한가?</div>
                      <div style={{ fontSize: 12.5, color: "#d4d4d8", lineHeight: 1.7 }}>{item.why}</div>
                    </div>

                    {/* Competitors */}
                    <div style={{
                      padding: "14px 16px", marginTop: 10,
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: 8,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#71717a", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>경쟁사 현황</div>
                      <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.8 }}>
                        {item.competitors.split(" / ").map((comp, ci) => (
                          <div key={ci} style={{ marginBottom: 4 }}>
                            <span style={{ color: "#d4d4d8", fontWeight: 600 }}>{comp.split(":")[0]}:</span>
                            <span>{comp.split(":").slice(1).join(":")}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Todo List */}
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#71717a", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1, paddingLeft: 4 }}>
                        할일 목록 ({item.todo.length}건)
                      </div>
                      {item.todo.map((task, ti) => (
                        <div key={ti} style={{
                          display: "flex", alignItems: "flex-start", gap: 10,
                          padding: "10px 12px",
                          marginBottom: 4,
                          borderRadius: 8,
                          background: ti % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent",
                        }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: 5,
                            border: `1.5px solid ${currentTier.color}40`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, color: currentTier.color, fontWeight: 700,
                            flexShrink: 0, marginTop: 1,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>{ti + 1}</div>
                          <div style={{ fontSize: 13, color: "#d4d4d8", lineHeight: 1.6 }}>{task}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div style={{
          marginTop: 32, padding: 24,
          background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(42,157,143,0.04))",
          border: "1px solid rgba(99,102,241,0.12)",
          borderRadius: 14,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 16 }}>📐 전체 요약</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {tiers.map((tier) => (
              <div key={tier.id} style={{
                padding: "14px 16px",
                background: "rgba(0,0,0,0.3)",
                borderRadius: 10,
                border: `1px solid ${tier.border}`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: tier.color, marginBottom: 6, letterSpacing: 1 }}>{tier.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>
                  {tier.items.length}<span style={{ fontSize: 12, color: "#71717a", fontWeight: 400 }}>개 기능</span>
                </div>
                <div style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>
                  할일 {tier.items.reduce((sum, item) => sum + item.todo.length, 0)}건
                </div>
              </div>
            ))}
            <div style={{
              padding: "14px 16px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a1a1aa", marginBottom: 6, letterSpacing: 1 }}>TOTAL</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>
                {tiers.reduce((sum, t) => sum + t.items.length, 0)}<span style={{ fontSize: 12, color: "#71717a", fontWeight: 400 }}>개 기능</span>
              </div>
              <div style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>
                할일 {tiers.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.todo.length, 0), 0)}건
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 16, padding: "14px 16px",
            background: "rgba(0,0,0,0.2)",
            borderRadius: 8,
            fontSize: 12, color: "#a1a1aa", lineHeight: 1.8,
          }}>
            <span style={{ fontWeight: 700, color: "#d4d4d8" }}>참조 경쟁사 12개:</span>{" "}
            <span style={{ color: "#2a9d8f" }}>국내 6</span> (DocShunt, 펄스웨이브, 뤼튼, 비즈가이드, 퀀텀점프클럽, MyMap.ai) ·{" "}
            <span style={{ color: "#6366f1" }}>글로벌 6</span> (Upmetrics, PrometAI, LivePlan, Foundor.ai, Venturekit, ProAI)
            <br />
            <span style={{ fontWeight: 700, color: "#d4d4d8" }}>소스 문서:</span> CI_overview_Claude.jsx + CI_overview_Gemini.md + CI_overview_ClaudeCode.md + 추가 웹 리서치
          </div>
        </div>
      </div>
    </div>
  );
}
