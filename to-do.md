# SaaS 사업기획안 도출 서비스 - To-Do 리스트

## 바로 다음 할 일

- [ ] **전체 UI 개선**
  - 메인 페이지 UI와 디자인을 참고할 수 있는 10개의 웹페이지를 찾아서 검토
  - 선정 페이지의 global CSS 추출해서 이 서비스 페이지 디자인에 반영

- [ ] **OpenAI API 연결**
  - OPENAI_API_KEY 설정 필요

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
- [x] 풀버전 파일명 구분 (`사업기획서_Full_...`)
- [x] 폴더 선택 저장 (File System Access API)

### AI 모델
- [x] Ollama (gemma2:9b) — 로컬
- [x] Claude (claude-sonnet-4-6) — Anthropic
- [x] Gemini (gemini-2.5-flash) — Google
- [x] OpenAI (gpt-4o) — UI 연동 완료, API 키 미설정
- [x] 모델 선택 UI (provider별 모델 드롭다운)
- [x] provider 사용 가능 여부 실시간 표시

### UX
- [x] 진행률 표시 (프로그레스 바 + 경과/예상 시간)
- [x] 단계별 완료 메시지 (체크 표시)
- [x] "초안 보기" / "풀버전 보기" 화면 전환
- [x] 마크다운 렌더링 (ReactMarkdown + remarkGfm)
- [x] 아이디어 선택 → 사업기획서 복수 탭

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

- [ ] **에러 핸들링 강화** — API 실패 시 재시도 로직
- [ ] **풀버전 에이전트 팀 개선** — 초안을 Agent 1 컨텍스트로 제공 여부 검토
