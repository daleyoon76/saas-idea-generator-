---
summary: "프리셋(기본/고품질)별 모듈별 AI 모델 1·2·3순위 배정표와 폴백 체인"
read_when:
  - You want to know which AI model is used for each module and preset
  - You need to change or add model assignments in MODULE_PRESETS
  - You are debugging model fallback behavior or provider errors
title: "모델 프리셋 배정표"
---

# AI 모델 프리셋 배정표

> **자동 생성 기준**: `app/src/lib/types.ts` → `MODULE_PRESETS`
> 변경 시 이 문서도 반드시 업데이트할 것.

서버(`/api/generate`)가 프리셋과 모듈 타입을 받으면, 아래 표의 1순위 모델부터 시도한다.
API 키가 없거나 런타임 오류 발생 시 자동으로 다음 순위로 폴백한다.

---

## 기본 (Standard) — 비용 효율 최적화

GPT 중심, Gemini Flash 보조. 빠르고 저렴한 모델 우선.

| 모듈 | 역할 | 1순위 | 2순위 | 3순위 |
|------|------|-------|-------|-------|
| generate-ideas | 아이디어 발굴 | OpenAI `gpt-4.1-mini` | Gemini `gemini-2.5-flash` | Claude `claude-haiku-4-5` |
| business-plan | 초안 사업기획서 | OpenAI `gpt-5` | Gemini `gemini-2.5-pro` | Claude `claude-sonnet-4-6` |
| full-plan-market | 시장 분석 | OpenAI `gpt-4.1-mini` | Gemini `gemini-2.5-flash` | Claude `claude-haiku-4-5` |
| full-plan-competition | 경쟁 분석 | OpenAI `gpt-4.1-mini` | Gemini `gemini-2.5-flash` | Claude `claude-haiku-4-5` |
| full-plan-strategy | 전략·로드맵 | OpenAI `gpt-5` | Gemini `gemini-2.5-pro` | Claude `claude-sonnet-4-6` |
| full-plan-finance | 재무 모델링 | OpenAI `gpt-4.1` | Gemini `gemini-2.5-flash` | Claude `claude-sonnet-4-6` |
| full-plan-devil | Devil's Advocate | OpenAI `gpt-5` | Gemini `gemini-2.5-pro` | Claude `claude-sonnet-4-6` |
| generate-prd | PRD 생성 | OpenAI `gpt-4.1` | Gemini `gemini-2.5-flash` | Claude `claude-sonnet-4-6` |
| extract-idea | 아이디어 추출 | OpenAI `gpt-4.1-nano` | Gemini `gemini-2.5-flash-lite` | Claude `claude-haiku-4-5` |
| generate-queries | 검색 쿼리 생성 | OpenAI `gpt-4.1-nano` | Gemini `gemini-2.5-flash-lite` | Claude `claude-haiku-4-5` |

---

## 고품질 (Premium) — 최고 품질 3자 혼합

Claude(한국어 서술) + Gemini Pro(데이터 분석) + GPT(추론) 역할 분담.

| 모듈 | 역할 | 1순위 | 2순위 | 3순위 |
|------|------|-------|-------|-------|
| generate-ideas | 아이디어 발굴 | OpenAI `gpt-5` | Gemini `gemini-2.5-pro` | Claude `claude-sonnet-4-6` |
| business-plan | 초안 사업기획서 | Claude `claude-sonnet-4-6` | OpenAI `gpt-5` | Gemini `gemini-2.5-pro` |
| full-plan-market | 시장 분석 | Gemini `gemini-2.5-pro` | OpenAI `gpt-5` | Claude `claude-sonnet-4-6` |
| full-plan-competition | 경쟁 분석 | Gemini `gemini-2.5-pro` | OpenAI `gpt-5` | Claude `claude-sonnet-4-6` |
| full-plan-strategy | 전략·로드맵 | Claude `claude-sonnet-4-6` | OpenAI `gpt-5` | Gemini `gemini-2.5-pro` |
| full-plan-finance | 재무 모델링 | Gemini `gemini-2.5-pro` | OpenAI `gpt-5` | Claude `claude-sonnet-4-6` |
| full-plan-devil | Devil's Advocate | Claude `claude-sonnet-4-6` | OpenAI `gpt-5` | Gemini `gemini-2.5-pro` |
| generate-prd | PRD 생성 | OpenAI `gpt-4.1` | OpenAI `gpt-5` | Claude `claude-sonnet-4-6` |
| extract-idea | 아이디어 추출 | OpenAI `gpt-4.1-nano` | Gemini `gemini-2.5-flash` | Claude `claude-haiku-4-5` |
| generate-queries | 검색 쿼리 생성 | OpenAI `gpt-4.1-mini` | Gemini `gemini-2.5-flash` | Claude `claude-haiku-4-5` |

---

## 모델 선택 근거

| 1순위 Provider | 배정 모듈 (Premium) | 근거 |
|----------------|---------------------|------|
| **Claude Sonnet** | 초안, 전략, Devil's Advocate | 한국어 서술 품질 최우선 |
| **Gemini Pro** | 시장분석, 경쟁분석, 재무 | 대량 데이터 처리 + 1M 컨텍스트 |
| **GPT-5** | 아이디어 발굴 | 창의성 + 다중 소스 통합 추론 |
| **GPT-4.1** | PRD | 기술 스펙 (영어 혼용 OK) |
| **GPT-4.1 Nano** | 아이디어 추출, 검색 쿼리 생성(Standard) | 단순 구조화 태스크, 비용 최소화 |
| **GPT-4.1 Mini** | 검색 쿼리 생성(Premium) | 약간 더 나은 쿼리 다양성, 여전히 빠름 |

## 폴백 동작

1. API 키 확인 → 키가 없는 provider는 체인에서 제외
2. 1순위 모델로 API 호출 시도
3. 런타임 오류 발생 시 → 2순위로 자동 폴백
4. 2순위도 실패 시 → 3순위로 자동 폴백
5. 전부 실패 시 → 에러 반환
