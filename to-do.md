# SaaS 사업기획안 도출 서비스 - To-Do 리스트

## 바로 다음 할 일

- [x] **전체 UI 개선**
  - 메인 페이지 UI와 디자인을 참고할 수 있는 10개의 웹페이지를 찾아서 검토
  - 선정 페이지의 global CSS 추출해서 이 서비스 페이지 디자인에 반영

- [x] **기존 기획서 Import → 워크플로우 중간 진입 기능**
  - 키워드 단계에서 탭 전환으로 "기존 기획서 가져오기" 진입
  - 파일 업로드(.md/.txt/.docx) + 드래그앤드롭 + 텍스트 붙여넣기
  - LLM으로 기획서에서 Idea 구조체 자동 추출 (`extract-idea` API)
  - Import 후 view-plan 합류 → 기존 PRD 생성 / 풀버전 에이전트 팀 재사용
  - 에이전트 팀 심화 모드: 기존 기획서를 컨텍스트로 전달하여 보강·검증
  - .docx 파싱용 `/api/parse-docx` (mammoth 라이브러리)

- [ ] **Phase 3: Google API 연동**
  - Google OAuth 2.0 인증, Sheets/Docs 저장

---

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

### 문서화
- [x] Mintlify Docs 스킬 적용 — frontmatter 표준화(summary+read_when+title), docs.json 정비, markdownlint 설정

---

## 남은 작업

### Phase 3: Google API 연동

- [ ] **Google OAuth 2.0 인증 구현**
- [ ] **Google Sheets API 연동** — 아이디어 후보 저장
- [ ] **Google Docs API 연동** — 사업기획서 저장

### Phase 4: 슬라이드 생성

- [ ] **슬라이드 생성 기능 구현** — 사업기획서 기반 프레젠테이션
- [ ] **Google Slides API 연동**

### Phase 5: 품질 개선

- [x] **에러 핸들링 강화** — OpenAI rate limit 429 자동 재시도 (최대 4회, retry-after 헤더 파싱)
- [ ] **풀버전 에이전트 팀 개선** — 초안을 Agent 1 컨텍스트로 제공 여부 검토
- [ ] **풀버전 멀티탭 UX 개선** — 다른 아이디어 탭에서 직접 풀버전 생성 가능하도록
