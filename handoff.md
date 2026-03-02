# Handoff — 2026-03-02 (세션 5)

## 이번 세션에서 완료한 작업

### Supabase PostgreSQL + Prisma v7 — 데이터베이스 + 자동저장

로그인한 사용자의 아이디어/기획서/PRD를 Supabase에 자동 저장하는 전체 파이프라인 구현 완료.

**신규 파일:**

| 파일 | 역할 |
|------|------|
| `app/prisma/schema.prisma` | DB 스키마 — Idea, BusinessPlan, PRD 3개 모델 + 관계 + 인덱스 |
| `app/prisma.config.ts` | Prisma v7 설정 — `.env.local` 로드, Supabase 연결 |
| `app/prisma/migrations/20260302033731_init/` | 초기 마이그레이션 SQL |
| `app/src/lib/prisma.ts` | Prisma Client 싱글톤 (PrismaPg 어댑터, hot-reload 안전) |
| `app/src/lib/db.ts` | 데이터 접근 레이어 — 모든 쿼리에 userId 스코핑 (Application-level RLS) |
| `app/src/app/api/ideas/route.ts` | POST (배치 저장) / GET (페이지네이션 목록) |
| `app/src/app/api/ideas/[id]/route.ts` | GET (상세+관계) / DELETE (cascade) |
| `app/src/app/api/plans/route.ts` | POST — 기획서 저장 (draft/full), 부모 Idea 자동 생성 |
| `app/src/app/api/prds/route.ts` | POST — PRD 저장, 부모 Idea 자동 생성 |

**수정 파일:**

| 파일 | 변경 |
|------|------|
| `app/package.json` | `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg` 추가 |
| `app/.env.local` | `DATABASE_URL` (pooler:6543), `DIRECT_URL` (session:5432) 추가 |
| `app/.env.local.example` | 위 변수 템플릿 + Supabase 안내 추가 |
| `app/src/lib/types.ts` | `SavedIdeaSummary`, `SavedIdeaDetail`, `SavedBusinessPlan`, `SavedPRD`, `HistoryResponse` 타입 추가 |
| `app/src/app/workflow/page.tsx` | `useSession` + `dbIdeaMap` 상태 + `autoSaveToDb` 헬퍼 + 4곳 자동저장 삽입 |
| `to-do.md` | DB+히스토리 완료 체크, 기술 부채 섹션 추가 |

**디버깅 이력 (재현 시 참고):**

1. Prisma v7 breaking change — `url`/`directUrl`을 schema가 아닌 `prisma.config.ts`에서 관리
2. Prisma v7 PrismaClient — `adapter` 필수 (`@prisma/adapter-pg`의 `PrismaPg` 사용)
3. `PrismaPg({ connectionString })` — 객체로 전달 필수 (문자열 직접 전달 시 `'in' operator` 에러)
4. Supabase 직접 연결 (`db.xxx.supabase.co:5432`) 차단 — Session mode pooler (`:5432` on pooler host) 사용으로 해결
5. `validIdeas` 스코프 문제 — `setIdeas()` 직후 autoSave에서 React 상태(`ideas`)가 아닌 로컬 변수(`validIdeas`) 참조해야 함

### Mermaid 고아 `end` 수정

LLM이 `subgraph` 없이 `end`만 생성하는 케이스 대응 — `sanitizeMermaidSyntax()`에 `subgraph` 수 대비 초과 `end` 자동 제거 로직 추가.

---

## 현재 상태

- **`main`** 브랜치, 아직 커밋 안 함 (테스트 완료 후 커밋 대기)
- dev 서버: `cd app && npm run dev` (포트 4000)
- Supabase 프로젝트: `MyCso` (ap-south-1, 인도 리전)
- DB 마이그레이션 적용 완료 (`ideas`, `business_plans`, `prds` 테이블)
- 아이디어/초안/풀버전/PRD 자동 저장 모두 테스트 통과

---

## 다음 작업 후보

### Phase 2 계속 (to-do.md 참고)

1. **사용자 인증 Phase B** — PrismaAdapter 연결, DB 세션 전환, middleware 확장
2. **대시보드** — 내 기획서 목록, 재열기·수정·재생성 (`/api/ideas` GET 활용)
3. **네이버/카카오 소셜 로그인** — auth.ts에 provider만 추가
4. **기획서 버전 관리** — diff 뷰, 롤백 (대시보드와 함께)

### 기술 부채

- Next.js 16 middleware → proxy 마이그레이션 (경고만, 기능 정상)
- 출력 잘림 대응 고도화 (continuation / retry)
- Supabase DB 비밀번호 변경 권장 (디버깅 중 콘솔에 노출됨)
