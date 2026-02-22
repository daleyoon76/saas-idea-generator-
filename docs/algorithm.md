---
title: "알고리즘"
description: "아이디어 생성 및 사업기획서 생성의 단계별 데이터 흐름과 프롬프트 구조"
---

# 알고리즘 문서

> 알고리즘이 변경될 때마다 이 문서를 업데이트한다.
> 마지막 업데이트: 2026-02-22

---

## 전체 흐름

```
키워드 입력 → [검색] → 아이디어 생성(LLM) → 아이디어 선택 → [검색] → 사업기획서 생성(LLM) → 결과 출력
```

### 핵심 설계 원칙: 단일 소스 아키텍처

클라이언트(`workflow/page.tsx`)는 **데이터만 전송**하고, 프롬프트 구성은 **서버(`/api/generate`)에서 담당**한다.
서버는 마크다운 파일을 `fs.readFileSync`로 읽어 프롬프트를 조립한다.

| 마크다운 파일 | 역할 | 수정 시 영향 |
|---|---|---|
| `app/src/assets/criteria.md` | 아이디어 발굴 기준 (R10) | 아이디어 생성 프롬프트에 자동 반영 |
| `docs/bizplan-template.md` | 사업기획서 섹션 구조 | 사업기획서 생성 프롬프트에 자동 반영 |

---

## `/api/generate` 요청 타입

`/api/generate`는 `type` 필드에 따라 세 가지 방식으로 동작한다.

| `type` | 서버 동작 | 클라이언트 전송 필드 |
|--------|-----------|-------------------|
| `generate-ideas` | `criteria.md` 읽기 → `createIdeaGenerationPrompt()` 호출 | `keyword`, `searchResults` |
| `business-plan` | `bizplan-template.md` 읽기 → `createBusinessPlanPrompt()` 호출 | `idea`, `searchResults` |
| (기타) | `prompt` 필드를 그대로 LLM에 전달 | `prompt` |

---

## 단계 1: 아이디어 생성

### 1-1. 인터넷 검색 (`/api/search`)

병렬 2개 쿼리 동시 실행 후 URL 기준 중복 제거:

| # | 쿼리 | 목적 |
|---|------|------|
| 1 | `{키워드} SaaS 시장 규모 성장률 트렌드 2025` | 시장 규모·성장률 데이터 확보 |
| 2 | `{키워드} B2B B2C 솔루션 스타트업 투자 기회` | 스타트업 생태계·투자 동향 |

- 키워드 없을 때 기본값: `SaaS AI 에이전트`
- 쿼리당 최대 4개, 중복 제거 후 최대 8개
- 실패해도 다음 단계 계속 진행

### 1-2. LLM 호출 (`/api/generate`, `type: 'generate-ideas'`)

**데이터 흐름:**

```
클라이언트: { type: 'generate-ideas', keyword, searchResults, provider, model }
    ↓
서버(api/generate): fs.readFileSync('app/src/assets/criteria.md')
    ↓
createIdeaGenerationPrompt(keyword, searchResults, criteria)
    ↓
LLM 호출 (jsonMode: true — Ollama는 format: 'json' 활성화)
```

**프롬프트 구조** (`lib/prompts.ts` > `createIdeaGenerationPrompt`):

~~~~
한국어로만 답변하세요.

## 아이디어 발굴 기준
[criteria.md 전체 내용 — R10 5대 기준]

## 참고할 시장 조사 자료
[검색 결과 컨텍스트 - 제목/URL/내용 최대 5개]

위 발굴 기준과 시장 환경을 참고하여, "{키워드}" 관련 SaaS/Agent 아이디어 3개를
아래 JSON 형식으로 출력하세요.
각 아이디어는 5가지 기준(수요 형태 변화, 버티컬 니치, 결과 기반 수익화,
바이브 코딩 타당성, 에이전틱 UX)을 최대한 충족해야 합니다.

```json
{
  "ideas": [
    {
      "id": 1,
      "name": "서비스 이름",
      "category": "B2C 또는 B2B",
      "oneLiner": "서비스 한 줄 설명",
      "target": "대상 고객",
      "problem": "해결하려는 문제",
      "features": ["핵심 기능1", "핵심 기능2", "핵심 기능3"],
      "differentiation": "차별화 포인트",
      "revenueModel": "수익 모델",
      "mvpDifficulty": "상/중/하 중 하나",
      "rationale": "이 아이디어를 선정한 이유"
    }
  ]
}
```
~~~~

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

## 단계 2: 사업기획서 생성

### 2-1. 인터넷 검색 (`/api/search`)

병렬 3개 쿼리 동시 실행 후 URL 기준 중복 제거:

| # | 쿼리 | 목적 |
|---|------|------|
| 1 | `{아이디어명} 경쟁사 대안 솔루션 비교` | 경쟁 환경 파악 |
| 2 | `{타깃고객} 고객 페인포인트 문제점 수요` | 고객 니즈 근거 확보 |
| 3 | `{카테고리} 시장 규모 TAM 투자 트렌드 2025` | TAM/시장 규모 데이터 |

- 쿼리당 최대 3개, 중복 제거 후 최대 9개
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
LLM 호출
```

**프롬프트 구조** (`lib/prompts.ts` > `createBusinessPlanPrompt`):

```
한국어로만 답변하세요.

## 시장 조사 및 참고 자료
[검색 결과 컨텍스트 - 제목/URL/내용 최대 5개]

다음 서비스에 대한 상세 사업기획서를 작성해주세요.

**서비스 정보:**
- 서비스명 / 설명 / 대상 고객 / 해결하려는 문제 / 핵심 기능 / 차별화 포인트 / 수익 모델

**작성 규칙:**
- Bullet point 활용, 항목별 명사형 마무리
- 통계·수치에 [1], [2] 형태 각주 표기
- 마크다운 표 형식으로 비교표·도표 활용

**아래 템플릿 형식에 맞춰 작성하세요:**
[docs/bizplan-template.md 전체 내용]
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

## AI 공급자

| Provider | 기본 모델 | 설정 |
|----------|-----------|------|
| Ollama | gemma2:9b | `ollama serve` 실행 필요 |
| Claude | claude-sonnet-4-6 | `ANTHROPIC_API_KEY` |
| Gemini | gemini-2.0-flash | `GEMINI_API_KEY` |
| OpenAI | gpt-4o | `OPENAI_API_KEY` |

- 모든 LLM 호출은 `/api/generate`로 단일화
- provider 가용 여부는 페이지 마운트 시 `/api/providers`로 확인
- Ollama만 `jsonMode`(`format: 'json'`) 지원 — 아이디어 생성 시 활성화

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `app/src/app/workflow/page.tsx` | 전체 워크플로우 상태머신 (클라이언트) |
| `app/src/app/api/generate/route.ts` | LLM 라우팅 + 프롬프트 조립 (서버) |
| `app/src/app/api/search/route.ts` | Tavily 검색 |
| `app/src/app/api/providers/route.ts` | provider 가용 여부 확인 |
| `app/src/lib/prompts.ts` | 프롬프트 생성 함수 (`createIdeaGenerationPrompt`, `createBusinessPlanPrompt`) |
| `app/src/lib/types.ts` | `Idea`, `BusinessPlan`, `WorkflowStep`, `PROVIDER_CONFIGS` 타입 |
| `app/src/assets/criteria.md` | 아이디어 발굴 기준 — **단일 소스** (R10, 수정 시 자동 반영) |
| `docs/bizplan-template.md` | 사업기획서 섹션 구조 — **단일 소스** (수정 시 자동 반영) |
