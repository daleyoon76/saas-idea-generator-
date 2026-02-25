---
summary: "아이디어 생성 및 사업기획서 생성의 단계별 데이터 흐름과 프롬프트 구조"
read_when:
  - You want to understand the idea generation algorithm step by step
  - You need to modify the prompt structure or data flow
  - You are debugging the business plan generation pipeline
title: "알고리즘"
---

# 알고리즘 문서

> 알고리즘이 변경될 때마다 이 문서를 업데이트한다.
> 마지막 업데이트: 2026-02-23

---

## 전체 흐름

```
[경로 A: 키워드 기반 — 기존]
키워드 입력
  → [검색: Tavily + Reddit + Google Trends + Product Hunt 4-way 병렬]
  → 아이디어 생성(LLM)
  → 아이디어 선택
  → [검색: Tavily 5개 쿼리]
  → 사업기획서 초안 생성(LLM, 단일 호출)
  → (선택) 풀버전 사업기획서 생성(에이전트 팀, 4개 LLM 순차 호출)
  → (선택) PRD 생성(LLM, 단일 호출)
  → 결과 출력 (.md / .docx 저장)

[경로 B: 기획서 Import — 신규]
기존 기획서 업로드 (.md/.txt) 또는 텍스트 붙여넣기
  → Idea 구조체 추출(LLM, extract-idea)
  → view-plan 합류 (기존 기획서를 초안으로 표시)
  → (선택) 풀버전 사업기획서 생성(에이전트 팀 + 기존 기획서 컨텍스트)
  → (선택) PRD 생성(LLM, 단일 호출)
  → 결과 출력 (.md / .docx 저장)
```

### 핵심 설계 원칙: 단일 소스 아키텍처

클라이언트(`workflow/page.tsx`)는 **데이터만 전송**하고, 프롬프트 구성은 **서버(`/api/generate`)에서 담당**한다.
서버는 마크다운 파일을 `fs.readFileSync`로 읽어 프롬프트를 조립한다.

| 마크다운 파일 | 역할 | 수정 시 영향 |
|---|---|---|
| `app/src/assets/criteria.md` | 아이디어 발굴 기준 (R10) | 아이디어 생성 프롬프트에 자동 반영 |
| `docs/bizplan-template.md` | 사업기획서 섹션 구조 | 초안 사업기획서 생성 프롬프트에 자동 반영 |

---

## `/api/generate` 요청 타입

`/api/generate`는 `type` 필드에 따라 동작한다.

| `type` | 서버 동작 | 클라이언트 전송 필드 |
|--------|-----------|-------------------|
| `generate-ideas` | `criteria.md` 읽기 → `createIdeaGenerationPrompt()` 호출 | `keyword`, `searchResults`, `redditResults`, `trendsResults`, `productHuntResults` |
| `business-plan` | `bizplan-template.md` 읽기 → `createBusinessPlanPrompt()` 호출 | `idea`, `searchResults` |
| `generate-prd` | `prd-template.md` 읽기 → `createPRDPrompt()` 호출 | `idea`, `businessPlanContent` |
| `full-plan-market` | `createFullPlanMarketPrompt()` 직접 호출 | `idea`, `searchResults`, `existingPlanContent?` |
| `full-plan-competition` | `createFullPlanCompetitionPrompt()` 직접 호출 | `idea`, `marketContent`, `searchResults`, `existingPlanContent?` |
| `full-plan-strategy` | `createFullPlanStrategyPrompt()` 직접 호출 | `idea`, `marketContent`, `competitionContent`, `searchResults`, `existingPlanContent?` |
| `full-plan-finance` | `createFullPlanFinancePrompt()` 직접 호출 | `idea`, `marketContent`, `competitionContent`, `strategyContent`, `searchResults`, `existingPlanContent?` |
| `extract-idea` | `createIdeaExtractionPrompt()` 직접 호출 | `planContent` |
| (기타) | `prompt` 필드를 그대로 LLM에 전달 | `prompt` |

- `business-plan`, `generate-prd`, `full-plan-*` → `maxTokens: 16000`
- 나머지 → `maxTokens: 8192`

---

## 단계 1: 아이디어 생성

### 1-0. 외부 트렌드 신호 수집 (보조 인풋 — 향후 구현 예정)

Tavily 검색(1-1)과 LLM 생성(1-2) 전에 **외부 트렌드 DB**에서 신호를 사전 수집하면 아이디어의 시장 적시성을 높일 수 있다.
현재는 미구현 상태이며, 아래는 공식 홈페이지에서 직접 확인한 내용을 바탕으로 한 참고 설계안이다.

---

#### A. Exploding Topics (explodingtopics.com)

**공식 소개**: "Discover trends before they take off. See new market opportunities, trending topics, emerging technology, and hot startups."

**공식 공개 데이터 소스** (explodingtopics.com 및 관련 페이지 확인):

- Google, Reddit, Amazon, 소셜미디어, 포럼, 뉴스 등 수십 개 플랫폼의 소비자 신호 분석
- DB 규모: 1.1M+ 트렌드, 매일 업데이트

**공식 공개 작동 방식**:

```
수십 개 플랫폼의 소비자 신호 수집
    ↓
급등 패턴 감지 알고리즘 적용 (일시적 바이럴 vs 지속 성장 구분)
    ↓
역사적 데이터 교차 검증 + 휴먼 큐레이션
    ↓
Future Forecast 생성 (Investor/Business 플랜 — 12개월 예측)
```

> ⚠️ 알고리즘 상세, 구체적 소스 목록은 공식 페이지에서 비공개.

**플랜 및 주요 기능** (공식 가격 페이지 기준):

| 플랜 | 가격 | 트렌드 추적 | 주요 기능 |
|------|------|--------------|---------|
| Entrepreneur | $39/월 | 100개 | 트렌드 DB, 트렌딩 상품, 메타 트렌드, 채널별 분석 |
| Investor | $99/월 | 500개 | + 신흥 스타트업 추적, Future Forecast, CSV 내보내기 |
| Business | $249/월 | 2,000개 | + 트렌드 리포트, API 접근 (엔드포인트 비공개) |

> ⚠️ API는 Business 플랜($249/월) 전용, 엔드포인트 비공개 → **현재 미구현**

**SaaS 기획 활용 포인트**:

- 주류화되기 전 급성장 키워드를 사전 발굴하는 용도
- Technology 카테고리 필터링으로 SaaS 관련 니치 신호 추출 가능

---

#### B. MicroSaaSIdea (microsaasidea.substack.com)

**공식 소개**: 2020년 창간, 36,000명 이상 구독자의 Substack 뉴스레터. "$1K~$10K MRR 마이크로 SaaS 제품 구축"을 목표로 하는 기술자·마케터 대상.

**공식 공개 아이디어 발굴 방식**:

- 특정 테마(AI 도구, 엔터프라이즈 소프트웨어 대체재, 니치 자동화 등)를 중심으로 이슈별 아이디어 발굴
- 구체적인 데이터 수집 방법론(Reddit 크롤링 여부 등)은 공식 페이지에 명시되지 않음

**공식 공개 제공 내용**:

- 주간 뉴스레터 (143호 이상 발행)
- 2026년 2월 기준 "검색 가능한 아이디어 DB"와 "키워드 DB" 추가 런칭
- 별도 플랫폼에서 코스(라이브 7개, 예정 19개) 제공

---

#### C. MicroSaaSIdea.com (microsaasidea.com) — 별개 서비스

**공식 소개**: "1,200+ Validated SaaS Ideas with Market Research"

**공식 공개 제공 내용**:

- 1,200개 이상 아이디어 DB (난이도·니치·수익 잠재력 필터)
- 7,500개 이상 키워드 추적 (검색량·CPC·경쟁 점수, 일일 업데이트)
- 120개 이상 심화 리포트 (TAM/SAM/SOM, 경쟁사 20~50개 매핑, 기술 스택 가이드)
- AI 빌드 프롬프트 (Cursor, Lovable, v0 등 연동용)
- 아이디어별 MRR 예측치 제시

> ⚠️ 아이디어를 어떻게 최초 발굴하는지(Reddit 수집 여부 등)는 공식 페이지에 명시되지 않음.

---

### 1-1. 검색 (Tavily + Reddit + Google Trends + Product Hunt 4-way 병렬)

네 가지 소스를 **동시에** 실행한다.

#### 1-1-A. Tavily 시장 조사 (`/api/search`)

병렬 3개 쿼리 동시 실행 후 URL 기준 중복 제거:

| # | 쿼리 | 목적 |
|---|------|------|
| 1 | `{키워드} SaaS 시장 규모 성장률 트렌드 2025` | 시장 규모·성장률 데이터 확보 |
| 2 | `{키워드} B2B B2C 솔루션 스타트업 투자 기회` | 스타트업 생태계·투자 동향 |
| 3 | `{키워드} AI 자동화 에이전트 적용 사례 2025` | AI 에이전트 적용 가능성 근거 |

- 키워드 없을 때 기본값: `SaaS AI 에이전트`
- 쿼리당 최대 4개, 중복 제거 후 최대 12개
- 검색 깊이: `basic`
- 실패해도 다음 단계 계속 진행

#### 1-1-B. Reddit 페인포인트 수집 (`/api/reddit`)

PullPush.io API(무료, 인증 불필요)를 사용해 4개 서브레딧에서 병렬 검색:

**검색 대상 서브레딧**: `entrepreneur`, `SaaS`, `startups`, `smallbusiness`

**PullPush API 파라미터**:

| 파라미터 | 값 | 의미 |
|----------|-----|------|
| `q` | 키워드 | 검색어 |
| `subreddit` | (서브레딧명) | 검색 범위 |
| `score` | `>10` | 업보트 10 이상 (검증된 공감대) |
| `size` | `3` | 서브레딧당 최대 3개 |
| `after` | `365d` | 최근 1년 이내 |

**데이터 흐름**:

```
4개 서브레딧 병렬 호출 (subreddit당 size: 3)
    ↓
SearchResult[] 매핑:
  title   → post.title
  url     → "https://reddit.com" + post.permalink
  snippet → post.selftext[:200] (없으면 title 반복)
    ↓
URL 중복 제거 → 최대 12개 결과 반환
```

- 한국어 키워드는 MyMemory API로 자동 영어 번역 후 검색
- 실패 시 `{ results: [] }` 반환 — 기존 흐름 유지
- 타임아웃: 8초 (`AbortSignal.timeout(8000)`)

#### 1-1-C. Google Trends 급등 신호 (`/api/trends`)

`google-trends-api` npm 패키지(비공식)로 최근 90일 급등 쿼리 수집:

**데이터 흐름**:

```
googleTrends.relatedQueries({ keyword, startTime: -90일, geo: '' })
    ↓
rankedList[1].rankedKeyword (risingQueries — 성장률 기준)
    ↓
노이즈 필터:
  - 비영어·비한글 문자 포함 쿼리 제거 (중국어·러시아어 등)
  - "what is X" 등 기초 정의 쿼리 제거
    ↓
최대 8개 → SearchResult[] 변환:
  title   → "급등 트렌드: {query}"
  url     → Google Trends 탐색 링크
  snippet → "Breakout — 5000%↑ 급등 중" 또는 "+{value}% (최근 90일)"
```

- `Breakout` = Google Trends 성장률 5000% 초과 (아직 주류 아님)
- 실패해도 빈 배열 반환 — 기존 흐름 유지 (비공식 패키지라 차단 가능성 있음)
- 패키지: `google-trends-api@4.9.2`

#### 1-1-D. Product Hunt 트렌딩 제품 (`/api/producthunt`)

Product Hunt GraphQL API v2로 최근 30일 트렌딩 제품 수집:

**데이터 흐름**:

```
POST https://api.producthunt.com/v2/api/graphql
  { order: VOTES, postedAfter: -30일, first: 50 }
    ↓
키워드 관련성 필터:
  - name·tagline·topics에 키워드 포함 여부 검사
  - 한국어 키워드는 MyMemory API로 영어 번역 후 검색
  - 매칭 없으면 상위 득표 제품으로 폴백 (최대 6개)
    ↓
SearchResult[] 변환:
  title   → "Product Hunt 트렌딩: {name}"
  url     → 제품 URL
  snippet → '"{tagline}" — 👍 {votesCount}표 (최근 30일 트렌딩)'
```

- 인증: `PRODUCT_HUNT_API_KEY` (Developer Token, 무료)
- 실패해도 빈 배열 반환 — 기존 흐름 유지

### 1-2. LLM 호출 (`/api/generate`, `type: 'generate-ideas'`)

**데이터 흐름:**

```
클라이언트: { type: 'generate-ideas', keyword, searchResults, redditResults,
              trendsResults, productHuntResults, provider, model }
    ↓
서버(api/generate): fs.readFileSync('app/src/assets/criteria.md')
    ↓
createIdeaGenerationPrompt(keyword, searchResults, criteria,
                           redditResults, trendsResults, productHuntResults)
    ↓
LLM 호출 (jsonMode: true — Ollama는 format: 'json' 활성화)
```

**프롬프트 구조** (`lib/prompts.ts` > `createIdeaGenerationPrompt`):

```
한국어로만 답변하세요.

## 아이디어 발굴 기준
[criteria.md 전체 내용 — R10 5대 기준]

## 참고할 시장 조사 자료
[Tavily 검색 결과 컨텍스트 - 제목/URL/내용]

## Reddit 커뮤니티 페인포인트
[Reddit 검색 결과 - 제목/URL/본문 발췌 (200자)]

## 급등 트렌드 신호 (Google Trends)
[Google Trends 급등 키워드 - 제목/성장률]

## Product Hunt 트렌딩 제품 (최근 30일)
[Product Hunt 트렌딩 제품 - 제목/URL/설명]

위 발굴 기준과 시장 환경을 참고하여, "{키워드}" 관련 SaaS/Agent 아이디어 3개를
아래 JSON 형식으로 출력하세요.
```

**아이디어 발굴 기준 요약** (출처: `app/src/assets/criteria.md`, R10):

| 기준 | 핵심 질문 |
|------|-----------|
| 1. 수요 형태 변화 | 사용자가 잠든 사이 에이전트가 어떤 업무를 끝내놓는가? |
| 2. 버티컬 니치 | 빅테크가 쉽게 침범 못 하는 마이크로 니치인가? |
| 3. 결과 기반 수익화 | 성과를 숫자로 증명하고 과금 근거로 삼을 수 있는가? |
| 4. 바이브 코딩 타당성 | 에러 발생 시 롤백 가능하고 보안 리스크가 낮은가? |
| 5. 에이전틱 UX | 관전/지원/자율 모드로 Shared Autonomy를 설계할 수 있는가? |

### 1-3. JSON 파싱 (응답 후처리)

LLM 응답에서 JSON을 추출하는 시도 순서:

1. ` ```json ... ``` ` 블록 추출
2. ` ``` ... ``` ` 블록 추출
3. `{ "ideas": [...] }` 패턴으로 raw JSON 추출
4. 응답 전체를 직접 `JSON.parse`
5. `[...]` 배열 패턴 추출

모두 실패하면 "아이디어 파싱 실패" 플레이스홀더를 표시한다.

---

## 단계 2: 사업기획서 초안 생성

### 2-1. 인터넷 검색 (`/api/search`)

병렬 5개 쿼리 동시 실행 후 URL 기준 중복 제거:

| # | 쿼리 | 목적 |
|---|------|------|
| 1 | `{아이디어명} 경쟁사 대안 솔루션 비교` | 경쟁 환경 파악 |
| 2 | `{타깃고객} 고객 페인포인트 문제점 수요` | 고객 니즈 근거 확보 |
| 3 | `{카테고리} 시장 규모 TAM SAM SOM 투자 트렌드 2025` | TAM/SAM/SOM 데이터 |
| 4 | `{아이디어명} SaaS 가격 책정 수익 모델 사례` | 재무 섹션 근거 확보 |
| 5 | `{아이디어명} 규제 법률 리스크 진입 장벽` | 리스크 섹션 근거 확보 |

- 쿼리당 최대 3개, 중복 제거 후 최대 15개
- 검색 깊이: `advanced` (더 풍부한 스니펫)
- 선택된 아이디어마다 각각 검색

### 2-2. LLM 호출 (`/api/generate`, `type: 'business-plan'`)

**데이터 흐름:**

```
클라이언트: { type: 'business-plan', idea, searchResults, provider, model }
    ↓
서버(api/generate): fs.readFileSync('docs/bizplan-template.md')
    ↓
createBusinessPlanPrompt(idea, searchResults, template)
    ↓
LLM 호출 (maxTokens: 16000)
```

**출력 섹션** (`docs/bizplan-template.md` 기준):

| 번호 | 섹션 |
|------|------|
| 1 | 핵심 요약 (Executive Summary) |
| 2 | 트렌드 - 시장/기술 트렌드 |
| 3 | 문제 정의 (Problems) |
| 4 | 솔루션 (Solution) |
| 5 | 경쟁 분석 (Competitive Analysis) |
| 6 | 차별화 (Differentiator) |
| 7 | 플랫폼 전략 (Platform Strategy) [선택] |
| 8 | 시장 정의·규모 (Market Definition & TAM) |
| 9 | 로드맵 (Roadmap) |
| 10 | 상세 프로젝트 계획 (Detail Project Plan) [선택] |
| 11 | 사업 모델 (Business Model) |
| 12 | 사업 전망 (Business Forecast) |
| 13 | 리스크 분석 (Risk Analysis) |
| - | 참고문헌 (References) |

---

## 단계 3: 풀버전 사업기획서 생성 (에이전트 팀)

초안과 독립적으로 실행되는 별도 생성 단계. 4개 에이전트가 순차적으로 담당 섹션을 작성하며, 각 에이전트는 이전 에이전트의 출력을 컨텍스트로 받는다.

### 3-1. 검색 (초안과 동일한 5개 쿼리)

초안 생성(2-1)과 동일한 5개 쿼리를 재수집한다. (검색 결과를 상태로 저장하지 않아 재수집)

### 3-2. 에이전트 팀 순차 호출

```
[검색 5개 쿼리]
    ↓
Agent 1 (full-plan-market)
  입력: idea + searchResults
  출력: 섹션 2(트렌드), 3(문제정의), 8(TAM/SAM/SOM)
  → marketContent
    ↓
Agent 2 (full-plan-competition)
  입력: idea + marketContent + searchResults
  출력: 섹션 5(경쟁분석), 6(차별화), 7(플랫폼전략)
  → competitionContent
    ↓
Agent 3 (full-plan-strategy)
  입력: idea + marketContent + competitionContent + searchResults
  출력: 섹션 1(핵심요약), 4(솔루션), 9(로드맵), 10(상세계획)
  → strategyContent
    ↓
Agent 4 (full-plan-finance)
  입력: idea + marketContent + competitionContent + strategyContent + searchResults
  출력: 섹션 11(사업모델), 12(사업전망), 13(리스크), 참고문헌
  → financeContent
    ↓
combineFullPlanSections()
  섹션 순서: 1→2→3→4→5→6→7→8→9→10→11→12→13→참고문헌
  → 최종 문서
```

### 3-3. 섹션 조합 (`combineFullPlanSections`)

각 에이전트 출력에서 정규식으로 섹션을 추출해 올바른 순서로 재조립한다.

```typescript
// 섹션 마커 탐색: "\n## N." (볼드·변형 헤딩 대응)
const pattern = new RegExp(`\n##\s+\**${sectionNum}[.．](?![0-9])`)
```

- 7개 미만 섹션 추출 시 raw 조합 fallback (strategyContent → marketContent → competitionContent → financeContent 순서로 단순 연결)

### 3-4. UX 플로우

- `view-plan`에서 "풀버전 사업기획서 생성하기 (에이전트 팀)" 버튼 클릭
- `generating-full-plan` 화면: 4단계 진행률 + 에이전트별 완료 체크
- `view-full-plan` 화면:
  - "Full Version" 뱃지
  - 탭: 생성된 풀버전 + 미생성 초안(점선 탭, 클릭 시 해당 초안 풀버전 생성)
  - "초안 보기" 버튼으로 `view-plan` 복귀
  - 마크다운/워드 저장, PRD 생성

---

## 단계 4: PRD 생성

### 4-1. LLM 호출 (`/api/generate`, `type: 'generate-prd'`)

```
클라이언트: { type: 'generate-prd', idea, businessPlanContent, provider, model }
  (businessPlanContent = 초안 또는 풀버전 — 호출 화면에 따라 결정)
    ↓
서버(api/generate): fs.readFileSync('docs/prd-template.md')
    ↓
createPRDPrompt(idea, businessPlanContent, template)
    ↓
LLM 호출 (maxTokens: 16000)
```

- `view-plan`에서 호출 → 초안 기반 PRD
- `view-full-plan`에서 호출 → 풀버전 기반 PRD

---

## AI 공급자

| Provider | 기본 모델 | 설정 |
|----------|-----------|------|
| Ollama | gemma2:9b | `ollama serve` 실행 필요 |
| Claude | claude-sonnet-4-6 | `ANTHROPIC_API_KEY` |
| Gemini | gemini-2.5-flash | `GEMINI_API_KEY` |
| OpenAI | gpt-4o | `OPENAI_API_KEY` |

- 모든 LLM 호출은 `/api/generate`로 단일화
- provider 가용 여부는 페이지 마운트 시 `/api/providers`로 확인
- Ollama만 `jsonMode`(`format: 'json'`) 지원 — 아이디어 생성 시 활성화
- OpenAI: rate limit(429) 시 자동 대기 후 재시도 (최대 4회, retry-after 헤더 파싱)

---

## 저장 기능

| 포맷 | 파일명 규칙 |
|------|-----------|
| 초안 `.md` | `사업기획서_{키워드}_{아이디어명}.md` |
| 초안 `.docx` | `사업기획서_{키워드}_{아이디어명}.docx` |
| 풀버전 `.md` | `사업기획서_Full_{키워드}_{아이디어명}.md` |
| 풀버전 `.docx` | `사업기획서_Full_{키워드}_{아이디어명}.docx` |
| PRD `.md` | `PRD_{키워드}_{아이디어명}.md` |
| PRD `.docx` | `PRD_{키워드}_{아이디어명}.docx` |

- `keyword` 없으면 생략
- File System Access API (`showDirectoryPicker`) 지원 시 폴더 선택 저장, 미지원 시 브라우저 다운로드

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `app/src/app/workflow/page.tsx` | 전체 워크플로우 상태머신 (클라이언트) |
| `app/src/app/api/generate/route.ts` | LLM 라우팅 + 프롬프트 조립 (서버) |
| `app/src/app/api/search/route.ts` | Tavily 검색 |
| `app/src/app/api/reddit/route.ts` | Reddit 페인포인트 검색 (PullPush.io) |
| `app/src/app/api/trends/route.ts` | Google Trends 급등 신호 수집 (google-trends-api) |
| `app/src/app/api/producthunt/route.ts` | Product Hunt 트렌딩 제품 수집 (GraphQL API v2) |
| `app/src/app/api/providers/route.ts` | provider 가용 여부 확인 |
| `app/src/lib/prompts.ts` | 프롬프트 생성 함수 (아이디어·초안·PRD·풀버전 에이전트 4종) |
| `app/src/lib/types.ts` | `Idea`, `BusinessPlan`, `WorkflowStep`, `PROVIDER_CONFIGS` 타입 |
| `app/src/assets/criteria.md` | 아이디어 발굴 기준 — **단일 소스** (R10, 수정 시 자동 반영) |
| `docs/bizplan-template.md` | 사업기획서 섹션 구조 — **단일 소스** (수정 시 자동 반영) |
