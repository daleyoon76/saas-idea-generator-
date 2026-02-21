---
title: "소개"
description: "AI가 SaaS 사업기획서를 자동 도출하는 Next.js 웹앱"
---

## SaaS Idea Generator

키워드를 입력하면 AI가 에이전틱 SaaS 아이디어 3개를 발굴하고, 선택한 아이디어에 대한 상세 사업기획서를 마크다운으로 자동 작성합니다.

## 전체 흐름

```
키워드 입력 → [검색] → 아이디어 생성 → 아이디어 선택 → [검색] → 사업기획서 생성 → 결과 출력
```

## 지원 AI 공급자

| 공급자 | 기본 모델 | 설정 방법 |
|--------|-----------|-----------|
| Ollama (로컬) | gemma2:9b | `ollama serve` 실행 |
| Claude | claude-sonnet-4-6 | `ANTHROPIC_API_KEY` |
| Gemini | gemini-2.0-flash | `GEMINI_API_KEY` |
| OpenAI | gpt-4o | `OPENAI_API_KEY` |

## 빠른 시작

```bash
cd app
npm install
cp .env.local.example .env.local
# .env.local에 API 키 입력
npm run dev
```

개발 서버가 [http://localhost:4000](http://localhost:4000)에서 실행됩니다.

<Card title="개발 가이드" icon="code" href="/docs/dev-guide">
  환경 설정, 코드 위치, 자주 발생하는 문제 해결법
</Card>

<Card title="아키텍처" icon="sitemap" href="/docs/architecture">
  전체 구조, 워크플로우 상태머신, AI 추상화 레이어
</Card>
