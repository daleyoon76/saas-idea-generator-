# 알고리즘 문서

> 알고리즘이 변경될 때마다 이 문서를 업데이트한다.

## 전체 흐름

```
키워드 입력 → [검색] → 아이디어 생성(LLM) → 아이디어 선택 → [검색] → 사업기획서 생성(LLM) → 결과 출력
```

---

## 단계 1: 아이디어 생성

### 1-1. 인터넷 검색 (`/api/search`)

- 쿼리: `{키워드} SaaS 트렌드 시장 2024`
- 결과: 최대 5개 (title, url, snippet)
- 실패해도 다음 단계 계속 진행

### 1-2. LLM 호출 (`/api/generate`)

**프롬프트 구조** (`lib/prompts.ts` > `createIdeaGenerationPrompt`):

```
한국어로만 답변하세요.

[검색 결과 컨텍스트 - 제목/URL/내용 최대 5개]

"{키워드}" 관련 SaaS 아이디어 3개를 아래 JSON 형식으로 출력하세요.

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

- 쿼리: `{아이디어명} {타깃고객} 시장 경쟁사 트렌드`
- 결과: 최대 5개
- 선택된 아이디어마다 각각 검색

### 2-2. LLM 호출 (`/api/generate`)

**프롬프트 구조** (`lib/prompts.ts` > `createBusinessPlanPrompt`):

입력: 아이디어 상세 정보(name, oneLiner, target, problem, features, differentiation, revenueModel) + 검색 결과

작성 규칙:
- Bullet point 활용, 항목별 명사형 마무리
- 통계·수치에 `[1]`, `[2]` 형태 각주 표기
- 마크다운 표 형식으로 비교표·도표 활용

**출력 섹션 (13개):**

| 번호 | 섹션 |
|------|------|
| 1 | 핵심 요약 (Executive Summary) |
| 2 | 트렌드 - 시장/기술 트렌드 |
| 3 | 문제 정의 (Problems) |
| 4 | 솔루션 (Solution) |
| 5 | 경쟁 분석 (Competitive Analysis) |
| 6 | 차별화 (Differentiator) |
| 7 | 플랫폼 전략 (Platform Strategy) |
| 8 | 시장 정의·규모 (Market Definition & TAM) |
| 9 | 로드맵 (Roadmap) |
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

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `app/src/app/workflow/page.tsx` | 전체 워크플로우 상태머신, 검색/LLM 호출 로직 |
| `app/src/lib/prompts.ts` | 프롬프트 생성 함수 |
| `app/src/lib/types.ts` | `PROVIDER_CONFIGS`, `WorkflowStep` 타입 |
| `app/src/app/api/generate/route.ts` | LLM 라우팅 |
| `app/src/app/api/search/route.ts` | DuckDuckGo 검색 |
| `app/src/app/api/providers/route.ts` | provider 가용 여부 확인 |
