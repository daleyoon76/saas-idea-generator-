---
summary: "개발 환경 설정, 코드 위치, 새 AI 공급자 추가 방법, 자주 발생하는 문제 해결"
read_when:
  - You want to set up the development environment
  - You need to add a new AI provider to the system
  - You are troubleshooting common development issues
title: "개발 가이드"
---

# 개발 가이드

## 1. 개발 환경 설정

### 사전 준비

```bash
# Node.js 20+
node -v

# Ollama 설치 (로컬 AI 사용 시)
brew install ollama
ollama pull gemma2:9b
ollama serve   # 별도 터미널에서 실행
```

### 초기 설치 및 실행

```bash
cd app
npm install

# 환경변수 설정 (외부 AI 사용 시)
cp .env.local.example .env.local
# .env.local 파일 열어서 API 키 입력

npm run dev    # http://localhost:4000
```

### 환경변수 (.env.local)

| 변수 | 필수 여부 | 설명 |
|------|-----------|------|
| `ANTHROPIC_API_KEY` | 선택 | Claude 사용 시 |
| `GEMINI_API_KEY` | 선택 | Gemini 사용 시 |
| `OPENAI_API_KEY` | 선택 | GPT-4o 사용 시 |
| `OLLAMA_BASE_URL` | 선택 | 기본값 `http://localhost:11434` |

Ollama는 API 키 불필요. 위 4개 중 최소 1개 이상 사용 가능 상태여야 앱이 작동한다.

---

## 2. 코드 위치 빠른 참조

| 작업 목적 | 파일 경로 |
|-----------|-----------|
| 화면 UI 수정 | `app/src/app/workflow/page.tsx` |
| 프롬프트 수정 | `app/src/lib/prompts.ts` |
| AI 공급자 추가/수정 | `app/src/app/api/generate/route.ts` |
| 타입 정의 | `app/src/lib/types.ts` |
| 검색 로직 수정 | `app/src/app/api/search/route.ts` |
| 공급자 상태 확인 | `app/src/app/api/providers/route.ts` |
| 아이디어 발굴 기준 | `app/src/assets/criteria.md` |
| 사업기획서 템플릿 | `app/src/assets/template.md` |

---

## 3. 새 AI 공급자 추가하기

예시: Mistral API 추가

### Step 1. `lib/types.ts` — 타입 추가

```typescript
// AIProvider에 추가
export type AIProvider = 'ollama' | 'claude' | 'gemini' | 'openai' | 'mistral';

// PROVIDER_CONFIGS에 추가
export const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  // ... 기존 항목들 ...
  mistral: { label: 'Mistral', model: 'mistral-large-latest', description: 'Mistral AI 모델' },
};
```

### Step 2. `api/generate/route.ts` — 호출 함수 추가

```typescript
// switch문에 case 추가
case 'mistral':
  response = await generateWithMistral(model || 'mistral-large-latest', prompt);
  break;

// 함수 구현 추가
async function generateWithMistral(model: string, prompt: string): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error('MISTRAL_API_KEY가 설정되지 않았습니다.');

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Mistral API 오류: ${err.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

### Step 3. `api/providers/route.ts` — 상태 확인 추가

```typescript
return NextResponse.json({
  ollama: ollamaConnected,
  claude: !!process.env.ANTHROPIC_API_KEY,
  gemini: !!process.env.GEMINI_API_KEY,
  openai: !!process.env.OPENAI_API_KEY,
  mistral: !!process.env.MISTRAL_API_KEY,   // 추가
});
```

### Step 4. `.env.local.example`에 키 추가

```bash
MISTRAL_API_KEY=...
```

---

## 4. 프롬프트 수정하기

프롬프트는 모두 `app/src/lib/prompts.ts`에 있다. 두 함수를 수정한다.

### 아이디어 발굴 프롬프트 (`createIdeaGenerationPrompt`)

AI에게 요청하는 JSON 스키마를 바꾸려면:

1. 프롬프트 내 JSON 예시 구조 수정
2. `lib/types.ts`의 `Idea` 인터페이스 수정
3. `workflow/page.tsx`의 파싱 로직(validIdeas 매핑) 수정

아이디어 수를 3개에서 5개로 늘리려면 프롬프트 텍스트에서 "3개"를 변경하면 된다. 단 UI 카드 렌더링은 동적이라 별도 수정 불필요.

### 사업기획서 프롬프트 (`createBusinessPlanPrompt`)

기획서 섹션을 추가하려면 프롬프트 내 마크다운 헤딩(`## 9. ...`)을 추가한다. 섹션 구조 참고: `app/src/assets/template.md`.

현재 기획서는 8개 섹션:

```
1. 시장 트렌드
2. 문제 정의
3. 솔루션
4. 경쟁 분석
5. 차별화 요소
6. 로드맵
7. 비즈니스 모델
8. 리스크 분석
```

원본 템플릿(`template.md`)은 11개 섹션. 3개 추가 가능: 플랫폼 전략, 리소스 계획, 매출 예측.

### 검색 컨텍스트 개선

현재 검색 쿼리는 하드코딩:

- 아이디어 발굴: `"${keyword} SaaS 트렌드 시장 2024"` — `workflow/page.tsx:65`
- 기획서 작성: `"${idea.name} ${idea.target} 시장 경쟁사 트렌드"` — `workflow/page.tsx:203`

검색 결과 수(기본 5개)는 `count` 파라미터로 조정 가능.

---

## 5. 새 워크플로우 단계 추가하기

예시: 슬라이드 생성 단계(Phase 4) 추가

### Step 1. `lib/types.ts`에 단계 타입 추가

```typescript
export type WorkflowStep =
  | 'keyword'
  | 'generating-ideas'
  | 'select-ideas'
  | 'generating-plan'
  | 'view-plan'
  | 'select-slides'        // 추가: 의사결정 2
  | 'generating-slides'    // 추가: 슬라이드 생성 중
  | 'view-slides'          // 추가: 슬라이드 완료
  | 'complete';
```

### Step 2. `workflow/page.tsx`에 상태 및 핸들러 추가

```typescript
// 상태 추가
const [slides, setSlides] = useState<...[]>([]);

// 핸들러 추가
async function generateSlides() {
  setStep('generating-slides');
  // /api/generate 호출
  setStep('view-slides');
}
```

### Step 3. Progress Steps UI 업데이트

`workflow/page.tsx:316`의 `['키워드 입력', '아이디어 선택', '기획서 작성', '완료']` 배열과 `stepOrder` 배열에 새 단계 레이블과 step key를 추가한다.

### Step 4. 단계별 JSX 추가

`{step === 'view-plan' && ...}` 블록 아래에 `{step === 'select-slides' && ...}` 등을 추가한다.

---

## 6. 사업기획서 출력 형식 변경

현재 기획서는 `<pre>` 태그로 raw 마크다운을 표시한다(`workflow/page.tsx:612`). 마크다운 렌더링으로 개선하려면:

```bash
npm install react-markdown
```

```tsx
// workflow/page.tsx에서 변경
import ReactMarkdown from 'react-markdown';

// 기존
<pre className="whitespace-pre-wrap ...">
  {businessPlans[currentPlanIndex].content}
</pre>

// 변경 후
<div className="prose max-w-none">
  <ReactMarkdown>{businessPlans[currentPlanIndex].content}</ReactMarkdown>
</div>
```

---

## 7. Google API 연동 가이드 (Phase 3)

### OAuth 설정

1. Google Cloud Console에서 프로젝트 생성
2. OAuth 2.0 클라이언트 ID 발급 (Web Application 타입)
3. 승인된 리디렉션 URI: `http://localhost:4000/api/auth/callback`
4. Sheets/Docs/Slides API 활성화

### 환경변수 추가

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### 구현 순서

1. `/api/auth/google` — OAuth 인증 시작 라우트
2. `/api/auth/callback` — 토큰 수신 및 세션 저장
3. `/api/sheets` — 아이디어 3개 Google Sheets에 append
4. `/api/docs` — 사업기획서 Google Docs 파일 생성

Google API 호출 시 `googleapis` 패키지 사용:

```bash
npm install googleapis
```

---

## 8. 자주 발생하는 문제

### JSON 파싱 실패 ("아이디어 파싱 실패" 카드 표시)

AI 응답이 프롬프트에서 요구한 JSON 형식을 따르지 않을 때 발생. 원인과 해결:

- **Ollama 모델 교체**: gemma2:9b가 JSON을 잘 못 뱉으면 `ollama pull llama3.1:8b`로 교체 후 `PROVIDER_CONFIGS`의 기본 모델 변경
- **프롬프트 강화**: `createIdeaGenerationPrompt()` 에서 JSON 형식 명시를 더 강하게 요청
- **디버깅**: `select-ideas` 단계의 "AI 원본 응답 보기" 토글로 raw 응답 확인

### Ollama 연결 안됨

```bash
ollama serve        # 서버 시작
ollama list         # 설치된 모델 확인
ollama pull gemma2:9b  # 모델 없으면 다운로드
```

### 검색 결과 0개

Tavily API 호출이 실패해도 AI 생성은 계속 진행된다. 검색 없이 AI만으로 생성하는 상태. 브라우저 Network 탭에서 `/api/search` 응답을 확인해 오류 여부 진단.

### 포트 충돌

기본 포트는 4000. 충돌 시 `package.json`의 `-p 4000`을 원하는 포트로 변경.

---

## 9. 타입 체크 및 린트

```bash
cd app

# 타입 체크 (에러 없으면 아무 출력 없음)
npx tsc --noEmit

# 린트
npx eslint src/

# 린트 자동 수정
npx eslint src/ --fix
```

CI/CD나 pre-commit hook은 현재 없으므로 수동으로 실행한다.
