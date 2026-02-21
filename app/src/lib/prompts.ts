// 출처: 바이브코딩 SaaS_Agent 아이템 발굴 기준.docx (app/src/assets/criteria.md)
export const IDEA_DISCOVERY_CRITERIA = `
# 2026년 바이브 코딩 기반 SaaS/Agent 아이템 발굴 기준

## 시장 환경
- 글로벌 SaaS 시장 약 3,150억 달러 규모, 기업당 평균 100개 이상 파편화된 도구 사용 → 통합·자동화 수요 급증
- 에이전틱 AI(Agentic AI)에 대한 폭발적 수요
- 한국: 네이버·카카오 등 강력한 플랫폼 존재 → 버티컬 영역·초개인화 니치 마켓 공략 유효
- Z세대/알파 세대의 높은 AI 서비스 수용도

## 유망 아이디어 유형

### 유형 1: 초개인화 웰니스 에이전트 (B2C)
- 타겟: Gen Z, 1인 가구, 디지털 동반자를 필요로 하는 사용자
- 핵심 기능: 멀티모달 감정 인식(텍스트·음성·표정), 실시간 UI 모핑, 장기 기억 기반 능동적 대화
- 성공 지표: 리텐션(재방문율), 대화 세션 시간

### 유형 2: 버티컬 B2B 에이전트
- 타겟: 중소기업(SMB), 특정 전문직군, 현장 중심 업종
- 핵심 기능: 비정형 데이터 처리(메신저·사진·수기 문서 → 정형 데이터), 메신저 기반 업무 처리, 자동 문서 생성(견적서·발주서·일지)
- 성공 지표: 비용 절감액, 작업 처리 건수

### 유형 3: AI 품질 보증(QA) 및 디버깅 도구
- 타겟: 바이브 코더, 인디 해커, 비개발자 창업자
- 핵심 기능: 자연어 디버깅(에러를 쉬운 말로 설명·해결), 보안/성능 건강검진, 자동 롤백 및 복구
- 성공 지표: 버그 해결률, 배포 성공률

## 아이템 선정 원칙
1. 명확한 문제 해결 — 타겟 고객의 구체적 페인포인트를 해소하는가
2. 충분한 시장 규모 — 유의미한 TAM이 존재하는가
3. MVP 빠른 구현 가능 — 바이브 코딩으로 핵심 기능을 단기간에 구현할 수 있는가
`;

// 사업기획서 템플릿은 docs/bizplan-template.md 에서 서버 사이드로 읽어옴 (api/generate/route.ts)

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export function createIdeaGenerationPrompt(keyword?: string, searchResults?: SearchResult[]): string {
  const keywordPart = keyword ? `"${keyword}" 관련` : '';

  let searchContext = '';
  if (searchResults && searchResults.length > 0) {
    searchContext = `
## 참고할 시장 조사 자료
다음은 인터넷 검색을 통해 수집한 최신 시장 정보입니다:

${searchResults.map((r, i) => `${i + 1}. **${r.title}**
   - URL: ${r.url}
   - 내용: ${r.snippet}`).join('\n\n')}

위 자료를 참고하여 실제 시장 트렌드와 수요에 기반한 아이디어를 제안해주세요.

`;
  }

  return `한국어로만 답변하세요.

## 아이디어 발굴 기준
${IDEA_DISCOVERY_CRITERIA}
${searchContext}
위 발굴 기준과 시장 환경을 참고하여, ${keywordPart} SaaS/Agent 아이디어 3개를 아래 JSON 형식으로 출력하세요.
각 아이디어는 발굴 기준의 3가지 유형 중 하나에 해당하거나, 기준의 선정 원칙(명확한 문제 해결·충분한 시장 규모·MVP 빠른 구현)을 충족해야 합니다.

\`\`\`json
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
\`\`\`

위 형식을 정확히 따라서 창의적인 아이디어 3개를 JSON으로 출력하세요.`;
}

export function createBusinessPlanPrompt(idea: {
  name: string;
  oneLiner: string;
  target: string;
  features: string[];
  differentiation: string;
  revenueModel: string;
  rationale: string;
  category?: string;
  problem?: string;
}, searchResults?: SearchResult[], template?: string): string {
  let searchContext = '';
  if (searchResults && searchResults.length > 0) {
    searchContext = `
## 시장 조사 및 참고 자료
다음은 이 서비스와 관련된 인터넷 검색 결과입니다. 사업기획서 작성 시 이 자료들을 근거로 활용하고, 관련 URL을 인용해주세요:

${searchResults.map((r, i) => `${i + 1}. **${r.title}**
   - URL: ${r.url}
   - 내용: ${r.snippet}`).join('\n\n')}

`;
  }

  const templateSection = template
    ? `**아래 템플릿 형식에 맞춰 작성하세요. 문서 제목은 "# ${idea.name} 사업기획서"로 시작하세요:**

${template}

위 구조에 맞게 각 섹션을 구체적이고 실용적인 내용으로 채워주세요. 검색 자료의 URL은 참고문헌 표에 반드시 인용해주세요.`
    : `**다음 형식으로 마크다운 문서를 작성하세요:**

# ${idea.name} 사업기획서

## 1. 핵심 요약 / 2. 트렌드 / 3. 문제 정의 / 4. 솔루션 / 5. 경쟁 분석 / 6. 차별화 / 7. 플랫폼 전략 / 8. 시장 규모 / 9. 로드맵 / 11. 사업 모델 / 12. 사업 전망 / 13. 리스크 분석 / 참고문헌

위 섹션을 구체적이고 실용적인 내용으로 채워주세요.`;

  return `한국어로만 답변하세요.
${searchContext}

다음 서비스에 대한 상세 사업기획서를 작성해주세요.

**서비스 정보:**
- 서비스명: ${idea.name}
- 설명: ${idea.oneLiner}
- 대상 고객: ${idea.target}
- 해결하려는 문제: ${idea.problem || idea.rationale}
- 핵심 기능: ${idea.features.join(', ')}
- 차별화 포인트: ${idea.differentiation}
- 수익 모델: ${idea.revenueModel}

**작성 규칙:**
- 전체적으로 Bullet point를 활용하고, 항목별 명사형으로 마무리
- 서술형 문장이 길게 이어지는 것을 지양
- 통계·가정·수치에는 [1], [2] 형태의 각주를 붙이고, 문서 말미 참고문헌 표와 연결
- 비교표, 차별화 도표 등 시각화 요소 적극 활용 (Markdown 표 형식)

${templateSection}`;
}
