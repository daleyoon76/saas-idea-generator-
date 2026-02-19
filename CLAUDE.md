# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

AI가 SaaS 사업기획서를 자동 도출해주는 Next.js 웹앱. 사용자가 키워드를 입력하면 아이디어 3개를 생성하고, 선택한 아이디어에 대한 상세 사업기획서를 마크다운으로 출력한다.

## 개발 명령어

앱 디렉토리는 `/app` 하위에 있으므로 모든 명령은 `app/` 안에서 실행한다.

```bash
cd app
npm run dev      # 개발 서버 (http://localhost:4000)
npm run build    # 프로덕션 빌드
npx tsc --noEmit # 타입 체크
npx eslint src/  # 린트
```

테스트 프레임워크는 현재 없음.

## 아키텍처

### 핵심 흐름

모든 사용자 인터랙션은 단일 페이지 `app/src/app/workflow/page.tsx`에서 상태머신으로 관리된다. `WorkflowStep` 타입이 단계를 정의하며, 렌더링은 `step` 상태값에 따른 조건부 JSX로 처리한다.

```
keyword → generating-ideas → select-ideas → generating-plan → view-plan
```

### AI 공급자 추상화

`/api/generate` 라우트가 모든 AI 호출을 담당한다. `provider` 파라미터(ollama/claude/gemini/openai)에 따라 각 API로 라우팅한다. 프론트엔드는 항상 `/api/generate`만 호출한다.

`/api/providers` (GET)는 Ollama 연결 상태와 환경변수로 API 키 설정 여부를 반환한다. 페이지 마운트 시 호출해 모델 선택 UI의 활성/비활성을 결정한다.

기존 `/api/ollama` 라우트는 하위호환용으로 남아있으나 워크플로우에서는 사용하지 않는다.

### 프롬프트 구조

`lib/prompts.ts`에 두 개의 프롬프트 생성 함수가 있다:
- `createIdeaGenerationPrompt()` — JSON 형식으로 아이디어 3개 요청. 응답 파싱 로직이 workflow 페이지에 내장됨(```json 블록 → ``` 블록 → raw JSON 순서로 시도)
- `createBusinessPlanPrompt()` — 마크다운 형식의 8개 섹션 기획서 요청

두 함수 모두 DuckDuckGo 검색 결과(`SearchResult[]`)를 받아 프롬프트에 컨텍스트로 삽입한다. 검색은 `/api/search`가 담당하며, 실패해도 AI 생성은 계속 진행된다.

### 기본 모델

| Provider | 기본 모델 |
|----------|-----------|
| Ollama | gemma2:9b |
| Claude | claude-sonnet-4-6 |
| Gemini | gemini-2.0-flash |
| OpenAI | gpt-4o |

`lib/types.ts`의 `PROVIDER_CONFIGS`에 정의되어 있다.

## 환경변수

`app/.env.local` 파일에 설정 (`.env.local.example` 참고):

```
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434  # 기본값, 생략 가능
```

Ollama는 별도 API 키 없이 `ollama serve` 실행만 필요. 기본 모델은 `gemma2:9b`.

## 남은 작업 (to-do.md 참고)

- Phase 3: Google OAuth + Sheets/Docs 연동
- Phase 4: 슬라이드 생성 + Google Slides 연동
- Phase 5: 에러 핸들링 강화, 마크다운 렌더링 개선
