# SaaS 사업기획안 도출 서비스 - To-Do 리스트

## 완료된 작업

### 아이디어 생성
- [x] 키워드 입력 UI
- [x] 아이디어 3개 도출 (Ollama / Claude / Gemini / OpenAI)
- [x] 검색 엔진 Tavily 연동 (DuckDuckGo → Tavily)
- [x] Reddit 커뮤니티 페인포인트 수집 (PullPush.io)
- [x] Google Trends 급등 트렌드 수집
- [x] Product Hunt 트렌딩 제품 수집
- [x] 4-way 병렬 수집 (Tavily + Reddit + Google Trends + Product Hunt)

### 기획서 Import
- [x] 기존 기획서 Import 기능 — 탭 전환 UI, 파일 업로드/드래그앤드롭/텍스트 붙여넣기
- [x] LLM Idea 추출 (`extract-idea` API) → view-plan 합류
- [x] 에이전트 팀 심화 모드 (기존 기획서를 컨텍스트로 보강)
- [x] .docx Import 지원 (`/api/parse-docx`, mammoth)

### 사업기획서 생성
- [x] 단일 LLM 사업기획서 생성 (초안, 13개 섹션)
- [x] **풀버전 에이전트 팀 구현** — 4개 전문 에이전트 순차 실행
  - Agent 1: 시장·트렌드·TAM (섹션 2, 3, 8)
  - Agent 2: 경쟁·차별화·플랫폼전략 (섹션 5, 6, 7)
  - Agent 3: 전략·솔루션·로드맵 (섹션 1, 4, 9, 10)
  - Agent 4: 재무·리스크·참고문헌 (섹션 11, 12, 13)
- [x] 섹션 순서대로 클라이언트 조합 (1→2→3→...→13→참고문헌)
- [x] 사업기획서 템플릿 서버 사이드 로딩 (docs/bizplan-template.md)
- [x] 아이디어 발굴 기준 서버 사이드 로딩 (assets/criteria.md)

### PRD 생성
- [x] PRD 자동 생성 (초안 또는 풀버전 참조 가능)
- [x] PRD 마크다운/AI용 서식 토글
- [x] 클립보드 복사

### 저장 기능
- [x] 마크다운 저장 (.md)
- [x] 워드 저장 (.docx) — 헤딩/표/불릿 스타일 포함
- [x] 폴더 선택 저장 (File System Access API)
- [x] 파일명 규칙 통일: `사업기획서_(키워드)_(Draft/Full)_(서비스명)`, PRD는 `PRD_(키워드)_(서비스명)`, 키워드 없으면 `없음`
- [x] `generated plans/` 폴더 git 추적 (여러 컴퓨터 간 공유용)

### AI 모델
- [x] Ollama (gemma2:9b) — 로컬
- [x] Claude (claude-sonnet-4-6) — Anthropic
- [x] Gemini (gemini-2.5-flash) — Google
- [x] OpenAI (gpt-4o) — 연동 완료 (API 키 설정, 429 rate limit 자동 재시도 최대 4회)
- [x] 모델 선택 UI (provider별 모델 드롭다운)
- [x] provider 사용 가능 여부 실시간 표시

### UX
- [x] 진행률 표시 (프로그레스 바 + 경과/예상 시간)
- [x] 단계별 완료 메시지 (체크 표시)
- [x] "초안 보기" / "풀버전 보기" 화면 전환
- [x] 마크다운 렌더링 (ReactMarkdown + remarkGfm)
- [x] 아이디어 선택 → 사업기획서 복수 탭
- [x] 색상 팔레트 중앙화 (`lib/colors.ts`) — CANYON/CANYON_DOCX 상수로 통합
- [x] 랜딩 페이지 메시지 리포지셔닝 — "아이디어 발굴" → "기획서 작성" 중심으로 Hero·Steps·Features·CTA 카피 전면 변경

### 사업기획서 생성 (추가)
- [x] Agent 5: Devil's Advocate — 섹션 14(현실 검증 + MVP 추천 + 주의점) 생성
- [x] 에이전트 JD 단일 소스 (`docs/agents_jd.md`) — 런타임 프롬프트 주입
- [x] 가이드 질문 → 사업기획서 초안 경로 (`/start` → `/guided` 8단계 위자드)

### 저장 기능 (추가)
- [x] 네이티브 Save As 다이얼로그 (`showSaveFilePicker`) — 폴더+파일명 한번에 선택

### 문서화
- [x] Mintlify Docs 스킬 적용 — frontmatter 표준화(summary+read_when+title), docs.json 정비, markdownlint 설정

---

## B2C 출시 로드맵

> 개인용 버전은 `personal` 브랜치에 고정. `main`에서 B2C 출시를 향해 진행한다.
> Phase 1에 해당하는 개발은 양쪽 브랜치에 같이 푸쉬, Phase 2부터는 `main`에만 푸쉬한다. 

### Phase 1: 알고리즘 강화 및 품질 개선

- [ ] 경쟁 분석
  - [ ] Manus ai의 기능과 가격 분석해서 현재 서비스 계획과 비교하고 보완점 도출
  - [ ] 그외 경쟁 서비스 찾아서 리스트업
- [ ] **에이전트 파이프라인 안정화**
  - [x] Devil's Advocate(Agent 5) 검토 결과를 본문에 반영하는 로직 재설계 ✅
    - RISK_SUMMARY 마커로 핵심 경고 추출 → Section 1 말미에 자동 삽입
  - [x] 초안을 모든 풀버전 에이전트 컨텍스트로 제공 → 풀버전 품질 향상 ✅
  - [ ] 섹션 추출 강화 (누락/순서 뒤바뀜 감지 개선)
  - [ ] 에이전트 실패 복구 (개별 에이전트 재시도 / 부분 결과 보존)
  - [ ] **Claude Opus 모델 풀버전 생성 테스트** — Opus는 응답 시간이 길어 타임아웃·페이로드 이슈 발생 가능. Sonnet뿐 아니라 Opus로도 풀버전 5개 에이전트가 에러 없이 완료되는지 검증 필요
- [ ] **검색 품질 강화**
  - Tavily 쿼리 최적화 (하드코딩 5개 → 동적 생성)
  - 검색 결과 캐싱 (동일 키워드 재검색 방지)
- [ ] **출력물 품질 관리**
  - [ ] Mermaid 실패 시 피드백 없음 — 다이어그램이 그냥 사라짐. "다이어그램을 표시할 수 없습니다" 안내 필요
  - [ ] docx 이탤릭/코드 서식 누락 — `**굵게**`만 지원, `*이탤릭*`이나 `` `코드` ``는 무시됨
  - [ ] docx 블록인용(>) 미지원 — LLM이 blockquote 쓰면 docx에서 사라짐
  - [x] **서버 출력 검증** ✅ — LLM 잘림 감지(Claude/Gemini/OpenAI/Ollama) + 섹션 누락 경고 + blockquote 경고 UI
    - [ ] **수동 테스트 필요**: mock UI 확인 → http://localhost:4000/test-validation (4개 시나리오)
    - [ ] **수동 테스트 필요**: Gemini Flash로 풀버전 생성 → 잘림 경고 표시 확인
    - [ ] **수동 테스트 필요**: Claude Sonnet으로 초안 생성 → 정상 시 경고 없음 확인
  - [ ] docx 다단계 리스트 미지원 — 들여쓰기 리스트가 1단계로 평탄화됨
- [x] **테스트 프레임워크 도입** ✅
  - Vitest + React Testing Library (단위/통합) — 22개 테스트 파일, 204개 테스트
  - 커버리지 64.26% (Statements), 62.89% (Branches), 67.47% (Lines)
  - Playwright 설정 완료 (E2E는 추후 필요 시 추가)
  - API route, 유틸리티, 컴포넌트 렌더링, 사용자 인터랙션 플로우 커버

### Phase 2: 추가 기능 구현
  - 에이전트 간 토큰 예산 최적화 (현재 개인용 3x → 프로덕션 기준 조정)
- [ ] **사용자 인증**
  - NextAuth.js + Google OAuth 2.0 (+ 네이버/카카오 고려)
  - 사용자 프로필, 세션 관리
- [ ] **데이터베이스 + 히스토리**
  - PostgreSQL (Supabase 또는 Neon)
  - 사용자별 아이디어/기획서/PRD 저장·조회
  - 기획서 버전 관리 (초안 vs 풀버전 vs 수정본)
- [ ] **대시보드**
  - 내 기획서 목록 (생성일, 상태, 모델)
  - 기획서 재열기·수정·재생성
- [ ] **Google API 연동**
  - Google Docs/Sheets 저장
  - Google Slides 생성
- [ ] **공유 기능**
  - 기획서 공유 링크 생성 (읽기 전용)
  - PDF 내보내기

### Phase 3: 클라우드 세팅

- [ ] **배포 환경 구성**
  - Vercel 배포 또는 Docker + AWS/GCP
  - 환경 분리: dev / staging / prod
  - CI/CD: GitHub Actions (lint → type-check → test → deploy)
- [ ] **보안 강화**
  - middleware.ts: 보안 헤더 (CSP, X-Frame-Options, HSTS)
  - API 입력 검증 (zod 스키마)
  - Rate Limiting (Redis 기반, 사용자·IP별)
  - API 키 환경변수 관리 (Vercel 환경변수 / AWS Secrets Manager)
- [ ] **모니터링**
  - 에러 추적: Sentry
  - 성능 모니터링: Vercel Analytics
  - 서버 로깅: Pino 또는 Winston (구조화 로그)
- [ ] **CDN / 캐싱**
  - 정적 자산 CDN
  - 검색 결과 캐싱 (Redis, TTL 24h)

### Phase 4: 결제 모듈

- [ ] **가격 모델 설계**
  - Free: 월 3건 초안 기획서
  - Pro (₩29,000/월): 무제한 초안 + 월 10건 풀버전 + PRD
  - Business (₩79,000/월): 무제한 전체 + 팀 공유 + Google 연동
  - (또는 건당 크레딧 방식)
- [ ] **결제 연동**
  - Stripe (글로벌) 또는 토스페이먼츠/포트원 (한국 특화)
  - 구독 관리 (생성·갱신·취소·업그레이드)
  - 사용량 추적 (월 생성 건수, 토큰 소비량)
- [ ] **과금 정책**
  - 무료→유료 전환 트리거 (한도 초과 시 업그레이드 유도 UI)
  - 영수증/인보이스 자동 발행
  - 연간 결제 할인 (20%)

### Phase 5: GTM (Go-to-Market) 전략

- [ ] **타겟 세그먼트 정의**
  - 1차: 예비 창업자, 1인 기업가
  - 2차: 스타트업 팀 (빠른 아이디어 검증)
  - 3차: 액셀러레이터/창업지원기관
- [ ] **런칭 채널**
  - Product Hunt / 디스콰이엇
  - 창업 관련 네이버 카페/블로그
  - LinkedIn 콘텐츠 마케팅
- [ ] **SEO / 콘텐츠**
  - OG 태그, 구조화 데이터, sitemap.xml
  - 블로그: "AI로 사업기획서 쓰는 법" 등 콘텐츠 마케팅
  - 샘플 기획서 공개 (리드 마그넷)
- [ ] **얼리 액세스**
  - 대기 리스트 랜딩 페이지 (이메일 수집)
  - 베타 50명 → 피드백 → 정식 출시
  - 베타 사용자 평생 할인
- [ ] **분석 도구**
  - GA4 또는 Plausible
  - 퍼널 분석: 랜딩→가입→첫 생성→유료 전환

### Phase 6: CS / 운영 / 법적 준비

- [ ] **이용약관 / 개인정보처리방침**
  - 개인정보보호법 준수
  - AI 생성물 저작권/면책 조항
  - 데이터 보관 및 삭제 정책
- [ ] **환불 정책**
  - 구독: 결제일로부터 7일 이내 전액 환불
  - 크레딧: 미사용분 환불 (사용분 차감)
  - 자동 환불 프로세스 (Stripe webhook)
- [ ] **고객 지원**
  - 헬프센터 / FAQ
  - 이메일 CS (초기): support@도메인
  - 인앱 채팅 (채널톡 또는 Crisp)
- [ ] **운영 대시보드**
  - 관리자 페이지: 사용자 수, 일일 생성량, 매출, 에러율
  - API 비용 추적 (Claude/Gemini/OpenAI 비용 모니터링)
  - 알림: 에러 급증, API 비용 이상치, 무료 티어 남용

---

### 타임라인 (예상)

```
[1~2주]    Phase 1: 품질 개선 (에이전트 안정화, 테스트)
[3~5주]    Phase 2: 인증 + DB + 히스토리 (핵심 인프라)
[6~7주]    Phase 3: 클라우드 배포 + 보안 + 모니터링
[8~9주]    Phase 4: 결제 모듈 (Stripe/토스)
[10주]     Phase 5: 베타 런칭 (50명)
[11~12주]  Phase 5+6: 피드백 반영 + 정식 출시
```
