// 아이디어 발굴 기준은 app/src/assets/criteria.md 에서 서버 사이드로 읽어옴 (api/generate/route.ts)

// 사업기획서 템플릿은 docs/bizplan-template.md 에서 서버 사이드로 읽어옴 (api/generate/route.ts)

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export function createIdeaGenerationPrompt(keyword?: string, searchResults?: SearchResult[], criteria?: string): string {
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

  const criteriaSection = criteria
    ? `## 아이디어 발굴 기준\n${criteria}`
    : `## 아이디어 발굴 기준\n- 명확한 문제 해결, 충분한 시장 규모, MVP 빠른 구현 가능 여부를 기준으로 선정`;

  return `한국어로만 답변하세요.

⚠️ 중요 규칙:
- 검색 자료에서 확인된 트렌드·수치만 활용하세요.
- 가상의 회사명, 수치, 사례를 만들어내지 마세요.
- 검색 자료가 없거나 근거가 없으면 해당 필드를 "시장 조사 필요"로 표기하세요.
- rationale 필드는 검색 자료 [번호]를 인용하여 근거를 제시하세요.

${criteriaSection}
${searchContext}
위 발굴 기준과 시장 환경을 참고하여, ${keywordPart} SaaS/Agent 아이디어 3개를 아래 JSON 형식으로 출력하세요.
각 아이디어는 발굴 기준의 5가지 기준(수요 형태 변화, 버티컬 니치, 결과 기반 수익화, 바이브 코딩 타당성, 에이전틱 UX)을 최대한 충족해야 합니다.

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

export function createPRDPrompt(idea: {
  name: string;
}, businessPlanContent: string, template?: string): string {
  const templateSection = template
    ? `위 사업기획서를 바탕으로 아래 PRD 템플릿을 작성하세요.
문서 제목은 "# ${idea.name} PRD"로 시작하세요.

${template}`
    : `위 사업기획서를 바탕으로 PRD를 작성하세요.
문서 제목은 "# ${idea.name} PRD"로 시작하고, 다음 섹션을 포함하세요:
배경 및 목적 / 대상 사용자 / 핵심 요구사항(사용자 스토리, 기능적·비기능적 요구사항) / 인수 조건 / 제외 범위 / 사용자 플로우 / 데이터 모델 / API 엔드포인트 / 우선순위 / 성공 지표 / 기술 스택 제안`;

  return `한국어로만 답변하세요.

⚠️ 작성 원칙:
- 가상의 수치나 기술 스택을 임의로 생성하지 마세요.
- 모든 내용은 아래 사업기획서에서 도출하세요.
- 각 섹션의 [대괄호] 안 지시문을 따라 작성하고, 지시문 자체는 출력에서 제거하세요.
- 인수 조건은 Given / When / Then 형식으로 작성하세요.

## 참고 사업기획서

${businessPlanContent}

---

${templateSection}`;
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

**작성 원칙:**
- 모든 수치·통계는 검색 자료 [번호] 형식으로 반드시 출처를 표기하세요.
- 출처 없는 수치는 "~로 추정" 또는 "업계 추정치"로 명시하세요.
- 가상의 기업명·수치를 생성하지 마세요. 실제 경쟁사가 없으면 "직접 경쟁사 미확인"으로 표기하세요.

**작성 규칙:**
- 전체적으로 Bullet point를 활용하고, 항목별 명사형으로 마무리
- 서술형 문장이 길게 이어지는 것을 지양
- 통계·가정·수치에는 [1], [2] 형태의 각주를 붙이고, 문서 말미 참고문헌 표와 연결
- 비교표, 차별화 도표 등 시각화 요소 적극 활용 (Markdown 표 형식)

**섹션별 필수 요건:**
- 경쟁 분석: 실제 경쟁사 최소 3개를 비교표로 제시
- 시장 정의·규모: TAM / SAM / SOM 3단계 구분 필수
- 사업 모델: 가격 티어 예시(Starter / Pro / Enterprise 등) 포함
- 리스크 분석: 규제·법률 리스크 1개 이상 반드시 포함
- 참고문헌: 검색 자료 URL 전체를 표 형식으로 나열

${templateSection}`;
}
