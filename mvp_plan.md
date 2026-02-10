# MVP 구현 플랜 (Ollama + 로컬 저장)

## 기술 스택

| 구분 | 기술 |
|------|------|
| **프론트엔드** | Next.js 14 + TypeScript |
| **AI 모델** | Ollama (Llama 3.2 또는 Mistral) |
| **스타일링** | Tailwind CSS |
| **결과 저장** | 로컬 마크다운 파일 |

---

## MVP 범위

```
1. 키워드 입력 단계
   └─ 웹 UI에서 키워드 입력 (옵션)

2. 기획팀장 단계
   └─ Ollama로 아이디어 3개 생성
   └─ 결과를 화면에 표시 (Google Sheets 대신)

3. 의사결정 단계 1
   └─ 3개 중 진행할 아이디어 선택

4. 사업전략기획자 단계
   └─ 선택된 아이디어로 기획서 작성
   └─ 결과를 화면에 표시 + 마크다운 파일로 저장 (Google Docs 대신)
```

---

## 구현 태스크

### Phase 1: 프로젝트 설정
- [x] Next.js + TypeScript + Tailwind 프로젝트 생성
- [x] Ollama 연동 유틸리티 작성
- [x] 프롬프트 템플릿 파일 구성

### Phase 2: 워크플로우 구현
- [x] Step 1 - 키워드 입력 페이지
- [x] Step 2 - 기획팀장: 아이디어 3개 생성
- [x] Step 3 - 의사결정: 아이디어 선택 UI
- [x] Step 4 - 사업전략기획자: 기획서 작성
- [x] 결과물 마크다운 파일로 저장

### Phase 3: Asset 통합
- [x] 아이템 발굴 기준 문서 (docx) 프롬프트에 반영
- [x] 사업기획안 템플릿 문서 (docx) 프롬프트에 반영

---

## 폴더 구조

```
/app
  /src
    /app
      /api/ollama       # Ollama API 라우트
      /workflow         # 워크플로우 페이지
      page.tsx          # 시작 페이지
    /lib
      ollama.ts         # Ollama 헬퍼
      prompts.ts        # 프롬프트 템플릿
      types.ts          # 타입 정의
    /assets
      criteria.md       # 아이템 발굴 기준 (docx에서 변환)
      template.md       # 사업기획안 템플릿 (docx에서 변환)
/output                 # 생성된 기획서 저장
```

---

## 사전 준비

**Ollama 설치 및 실행:**
```bash
# macOS
brew install ollama

# 모델 다운로드
ollama pull llama3.2

# 서버 실행
ollama serve
```

---

## Hold 항목 (Phase 2 이후)

- Google Sheets API 연동
- Google Docs API 연동
- Google Slides API 연동
- Google OAuth 인증
- AI 모델 선택 기능 (Gemini, OpenAI 등)
- 슬라이드 자동 생성 단계
