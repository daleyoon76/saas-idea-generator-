# Handoff — 2026-03-01 (세션 3)

## 이번 세션에서 완료한 작업

### 1. 풀버전 섹션 누락 버그 수정 (핵심)

**근본 원인 발견**: `combineFullPlanSections()`의 `getSection()` 경계 탐지 정규식 버그.

`\n#{2,3}\s`가 `###` 서브섹션 헤딩(예: `### 2.1 시장 트렌드`)을 **다음 섹션 시작으로 오인**하여, 서브섹션이 있는 섹션(2, 9, 10, 11, 12)의 본문이 잘려나감.

**수정**: `\n#{2,3}\s` → `\n##\s` (H2만 섹션 경계로 인식, `###` 서브섹션은 현재 섹션에 포함)

**검증**: 수정 후 14/14 섹션 모두 정상 크기로 추출됨.
```
수정 전: §1:1356 §2:17  §3:1015 §4:1825 §9:19  §10:39  §11:29  §12:32
수정 후: §1:1733 §2:1643 §3:1130 §4:2522 §9:3006 §10:4889 §11:1651 §12:1676
```

### 2. Mermaid 다이어그램 파싱 오류 수정

LLM이 Mermaid 노드/서브그래프 이름에 `()`를 넣으면 Mermaid가 노드 형태 구분자로 오해하여 파싱 실패.

**수정** (`sanitizeMermaidSyntax`):
- `[...]` 노드 라벨 내 `()` → 전각 `（）` 치환
- `{...}` 다이아몬드 노드 내 `()` → 전각 `（）` 치환
- `subgraph` 이름 내 `()` → 전각 `（）` 치환

### 3. 표 렌더링 수정

LLM이 불릿 리스트 안에 표를 생성하면 들여쓰기 때문에 마크다운 파서가 표로 인식 못하고 `| 구분 | 내용 |` 형태로 텍스트 렌더링됨.

**수정** (`sanitizeMarkdown`): 표 행(`|`로 시작하는 줄) 앞의 들여쓰기를 자동 제거.

### 4. Devil's Advocate (섹션 14) 분량 최적화

- TOKEN_LIMITS: `full-plan-devil` 10K → 6K
- 프롬프트 변경:
  - 14.1: "모든 섹션 검토" → "문제가 큰 3~5개 섹션만 선별"
  - 작성 원칙에 "간결하게 작성 (전체 800단어 이내)" 추가

### 5. 디버그 로깅 추가

`combineFullPlanSections()`에 진단 로그 추가:
- 에이전트별 콘텐츠 길이 (`market: 4111, competition: 4818, ...`)
- 섹션별 추출 길이 (`§1:1733 §2:1643 ...`)
- 누락 섹션 발견 시 해당 에이전트 콘텐츠의 모든 헤딩 출력
- `getSection()` loose 패턴 폴백 시 로그

### 6. 문서·테스트 현행화

- `to-do.md` — 이번 세션 완료 항목 체크 + 신규 미완료 항목 추가
- `docs/algorithm.md` — TOKEN_LIMITS 수치 업데이트 (14K/16K/6K)
- `MEMORY.md` — 토큰 한도 테이블 갱신
- `generate.test.ts` — 토큰 한도 기대값 수정 (14000)

**변경 파일 목록:**

| 파일 | 변경 |
|------|------|
| `app/src/app/workflow/page.tsx` | `getSection()` 경계 수정, Mermaid `()` 이스케이프, 표 들여쓰기 제거, 디버그 로깅 |
| `app/src/app/api/generate/route.ts` | `full-plan-devil` 토큰 10K → 6K |
| `app/src/lib/prompts.ts` | Devil's Advocate 프롬프트 간결성 지시 추가 |
| `docs/algorithm.md` | TOKEN_LIMITS 수치 업데이트 |
| `to-do.md` | 완료 항목 체크 + 신규 항목 추가 |
| `app/src/app/api/__tests__/generate.test.ts` | 토큰 한도 기대값 수정 |

---

## 현재 상태

- **`main`** 브랜치, 미커밋 변경 있음 (세션 2 + 세션 3 변경 모두 미커밋)
- dev 서버: `npm run dev` 실행 시 **`--webpack` 플래그 필요** (Turbopack CSS 오류, Next.js 16)
  - `npx next dev --port 4000 --webpack`
- 풀버전 생성 테스트 통과: 14/14 섹션 정상 추출, 표 렌더링 정상, Mermaid 다이어그램 정상

---

## 미해결 이슈

### 1. 출력 잘림 (truncation)

일부 에이전트 응답이 토큰 한도에 도달하여 끝부분이 잘리는 현상이 간헐적으로 발생.
현재 `appendTruncationWarning()`으로 경고 메시지를 붙이는 수준.

가능한 개선:
- 잘림 감지 시 해당 섹션만 재생성 (continuation 로직)
- 프롬프트에 "핵심 내용을 먼저 작성" 지시 추가
- 모델별 출력 한도가 다름 — Gemini Flash는 특히 잘림이 잦음

### 2. Mermaid 파싱 — 아직 못 잡은 엣지 케이스

`()` 이스케이프는 `[]`, `{}`, `subgraph` 세 곳에 적용했으나, LLM이 다른 mermaid 구문에 `()`를 넣는 경우가 있을 수 있음. 에러 발생 시 콘솔의 "Sanitized input:" 로그로 원인 파악 가능.

### 3. 테스트 러너 Babel 파싱 오류

`generate.test.ts`의 top-level `await import(...)` 구문이 Jest/Babel 환경에서 파싱 실패. Vitest로 전환하거나 Babel 설정 수정 필요. 기능에는 영향 없음.

---

## 다음 작업 후보

### Phase 1 잔여
- [ ] 차트 렌더링 품질 검증 (`chart` 코드블록 bar/pie/line/scatter)
- [ ] docx 차트/다이어그램 임베딩 품질 확인
- [ ] docx 서식 확장 — 이탤릭, 인라인 코드, 블록인용(>), 다단계 리스트
- [ ] 경쟁 분석 (Manus AI 등)

### Phase 2
- 사용자 인증 (NextAuth + Google OAuth)
- 데이터베이스 + 히스토리 (PostgreSQL/Supabase)
- 대시보드

### 기술 부채
- 테스트 러너 정상화 (Babel top-level await 이슈)
- 출력 잘림 대응 고도화 (continuation / retry)
