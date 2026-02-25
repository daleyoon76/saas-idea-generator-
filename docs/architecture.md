---
summary: "전체 시스템 구조, 워크플로우 상태머신, AI 공급자 추상화 레이어 설계"
read_when:
  - You want to understand the overall system architecture
  - You need to know how the workflow state machine works
  - You are investigating the AI provider abstraction layer
title: "아키텍처"
---

# 아키텍처 문서

## 1. 전체 구조 개요

이 서비스는 **"어떤 SaaS를 만들면 좋을지 알려주는 서비스"**다. 사용자가 키워드를 입력하면 AI가 아이디어를 발굴하고, 사용자가 선택한 아이디어에 대한 상세 사업기획서를 자동 작성한다.

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                      │
│                                                           │
│  /              →  랜딩 페이지 (page.tsx)                 │
│  /workflow      →  전체 워크플로우 (workflow/page.tsx)    │
└────────────────────────┬────────────────────────────────┘
                         │ fetch()
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Next.js API Routes                       │
│                                                           │
│  POST /api/generate   →  AI 생성 통합 라우트              │
│  GET  /api/providers  →  AI 공급자 상태 확인              │
│  POST /api/search     →  Tavily 웹 검색                  │
│  GET  /api/ollama     →  Ollama 연결 확인 (레거시)        │
│  POST /api/ollama     →  Ollama 직접 호출 (레거시)        │
└──────┬──────────────────────┬──────────────────────────┘
       │                      │
       ▼                      ▼
┌─────────────┐      ┌────────────────────────┐
│  Ollama     │      │  외부 AI API            │
│  (로컬)     │      │                        │
│  :11434     │      │  - Anthropic (Claude)  │
│  gemma2:9b  │      │  - Google (Gemini)     │
└─────────────┘      │  - OpenAI (GPT-4o)    │
                     └────────────────────────┘
```

---

## 2. 워크플로우 상태머신

워크플로우 전체는 `app/src/app/workflow/page.tsx` 단일 파일에서 `WorkflowStep` 타입으로 관리된다. 별도의 라우팅 없이 `step` 상태값에 따라 JSX를 조건부 렌더링한다.

```
                    ┌─────────┐
               ┌───►│ keyword │◄──────── reset()
               │    └────┬────┘
               │         │ generateIdeas()
               │         ▼
               │  ┌──────────────────┐
               │  │ generating-ideas │  (로딩 상태)
               │  └────────┬─────────┘
               │           │ 성공
               │           ▼
               │  ┌──────────────────┐
               │  │  select-ideas    │  아이디어 3개 표시
               │  └────────┬─────────┘
               │           │ generateBusinessPlan()
               │           ▼
               │  ┌──────────────────┐
               │  │ generating-plan  │  (로딩 상태)
               │  └────────┬─────────┘
               │           │ 성공
               │           ▼
               │  ┌──────────────────┐
               └──┤    view-plan     │  기획서 열람 + 다운로드
                  └──────────────────┘
```

각 상태에서 오류 발생 시 이전 단계로 rollback되고, `error` state에 메시지가 세팅된다.

---

## 3. AI 추상화 레이어

`/api/generate` 라우트가 모든 AI 공급자를 단일 인터페이스로 추상화한다.

```
workflow/page.tsx
       │
       │  POST /api/generate
       │  { provider, model, prompt }
       │
       ▼
api/generate/route.ts
       │
       ├─ provider === 'ollama'  → generateWithOllama()  → localhost:11434
       ├─ provider === 'claude'  → generateWithClaude()  → api.anthropic.com
       ├─ provider === 'gemini'  → generateWithGemini()  → googleapis.com
       └─ provider === 'openai'  → generateWithOpenAI()  → api.openai.com

모든 함수의 반환값: Promise<string>  (raw text)
```

**공급자 가용성 확인 흐름:**

```
페이지 마운트
     │
     │  GET /api/providers
     ▼
providers/route.ts
     │
     ├─ ollama: fetch(localhost:11434/api/tags) → 연결 여부
     ├─ claude: !!process.env.ANTHROPIC_API_KEY
     ├─ gemini: !!process.env.GEMINI_API_KEY
     └─ openai: !!process.env.OPENAI_API_KEY
     │
     ▼
{ ollama: true/false, claude: true/false, ... }
     │
     ▼
모델 선택 UI의 "사용 가능" / "미설정" 배지 표시
```

---

## 4. 프롬프트 파이프라인

두 단계 각각에서 **검색 → 프롬프트 구성 → AI 호출** 순서로 실행된다.

### 4-1. 아이디어 발굴 단계

```
키워드 입력 (선택)
     │
     ▼
POST /api/search  ← "최신 {keyword} SaaS 트렌드"
     │              Tavily API 호출
     │              결과 5개 (title, url, snippet)
     ▼
createIdeaGenerationPrompt(keyword, searchResults)
     │
     │  "한국어로만 답변. 검색 결과를 참고해 아이디어 3개를 JSON으로 출력"
     │
     ▼
POST /api/generate → AI 응답 (JSON 포함 텍스트)
     │
     ▼
JSON 파싱 (3단계 시도)
     ├─ 1순위: ```json ... ``` 블록 추출
     ├─ 2순위: ``` ... ``` 블록 추출
     └─ 3순위: {"ideas": [...]} raw JSON 매칭
```

### 4-2. 사업기획서 작성 단계

```
선택된 아이디어 (Idea 객체)
     │
     ▼
POST /api/search  ← "{idea.name} {idea.target} 시장 경쟁사 트렌드"
     │              결과 5개
     ▼
createBusinessPlanPrompt(idea, searchResults)
     │
     │  "한국어로. 검색 결과 URL 인용. 8개 섹션 마크다운 작성"
     │
     ▼
POST /api/generate → AI 응답 (마크다운 텍스트)
     │
     └─ BusinessPlan 객체 { ideaId, ideaName, content, createdAt }
```

검색 실패(`/api/search` 오류)는 catch로 무시하고 AI 생성은 계속 진행된다.

---

## 5. 데이터 모델

```typescript
// 아이디어 발굴 결과
interface Idea {
  id: number;
  name: string;
  category: string;        // "B2C" | "B2B"
  oneLiner: string;        // 한 줄 설명
  target: string;          // 타깃 고객
  problem: string;         // 해결 문제
  features: string[];      // 핵심 기능 목록
  differentiation: string; // 차별화 포인트
  revenueModel: string;    // 수익 모델
  mvpDifficulty: string;   // "상" | "중" | "하"
  rationale: string;       // 선정 이유
}

// 사업기획서 결과
interface BusinessPlan {
  ideaId: number;
  ideaName: string;
  content: string;         // 마크다운 전문
  createdAt: string;       // ISO 8601
}

// AI 공급자
type AIProvider = 'ollama' | 'claude' | 'gemini' | 'openai';
```

---

## 6. 검색 엔진 구조

`/api/search`는 `TAVILY_API_KEY`를 사용해 Tavily REST API를 호출한다.

```
POST /api/search { query, count=5 }
     │
     ▼
fetch("https://api.tavily.com/search")
     │  { api_key, query, max_results, search_depth: "basic" }
     ▼
data.results[] 매핑
     └─ { title, url, content } → SearchResult { title, url, snippet }
     │
     ▼
SearchResult[] { title, url, snippet }
```

**주의:** `TAVILY_API_KEY`가 없으면 500 오류를 반환한다. 결과가 0개일 경우 AI 프롬프트에 검색 컨텍스트가 포함되지 않을 뿐이며 전체 흐름에는 영향 없다.

---

## 7. 자산(Assets) 구조

`app/src/assets/` 에 두 개의 핵심 지식 문서가 있다.

| 파일 | 원본 | 역할 |
|------|------|------|
| `criteria.md` | `바이브코딩 SaaS_Agent 아이템 발굴 기준.docx` | 아이디어 발굴 3가지 기준 정의 |
| `template.md` | `사업기획안 템플릿.docx` | 사업기획서 11개 섹션 구조 정의 |

현재 이 파일들은 프롬프트에 직접 임포트되지 않고, `lib/prompts.ts`의 프롬프트 구조 설계의 **참조 문서** 역할을 한다. 향후 프롬프트에 직접 주입하면 품질을 높일 수 있다.

---

## 8. 미구현 단계 (원본 plan.md 기준)

원래 설계(`plan.md`)에서 현재 미구현된 단계:

| 단계 | 원본 설계 | 현재 구현 |
|------|-----------|-----------|
| 아이디어 저장 | Google Sheets에 append | 화면 표시만 |
| 기획서 저장 | Google Docs 자동 생성 | 마크다운 파일 다운로드 |
| 의사결정 2 | 슬라이드 진행 여부 선택 | 미구현 |
| 슬라이드 생성 | Google Slides 자동 생성 | 미구현 |
| Google 인증 | OAuth 2.0 | 미구현 |
