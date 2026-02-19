export const IDEA_DISCOVERY_CRITERIA = `
# SaaS/Agent 아이템 발굴 기준
1. 명확한 문제 해결
2. 충분한 시장 규모
3. MVP 빠른 구현 가능
`;

export const BUSINESS_PLAN_TEMPLATE = `
# 사업기획안 템플릿
1. 핵심 요약 (Executive Summary)
2. 트렌드 - 시장 트렌드 / 기술 트렌드
3. 문제 정의 (Problems)
4. 솔루션 (Solution)
5. 경쟁 분석 (Competitive Analysis)
6. 차별화 (Differentiator)
7. 플랫폼 전략 (Platform Strategy) [선택]
8. 시장 정의·규모 (Market Definition & TAM)
9. 로드맵 (Roadmap)
10. 상세 프로젝트 계획 (Detail Project Plan) [선택]
11. 사업 모델 (Business Model) - 판매 방식 / 가격
12. 사업 전망 (Business Forecast) - 리소스 계획 / 매출 전망 / BEP
13. 리스크 분석 (Risk Analysis)
`;

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
${searchContext}
${keywordPart} SaaS 아이디어 3개를 아래 JSON 형식으로 출력하세요.

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
}, searchResults?: SearchResult[]): string {
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

**다음 형식으로 마크다운 문서를 작성하세요:**

# ${idea.name} 사업기획서

## 1. 핵심 요약 (Executive Summary)

- **서비스 한 줄 요약**
- **핵심 가치** (어떤 문제를 어떻게 해결하는지)
- **목표 시장·목표 사용자 수**

---

## 2. 트렌드 (Trend)

### 2.1 시장 트렌드 (Market Trend)

(관련 시장의 규모, 성장률, 정책·규제 변화 등 — 수치에 각주 [1] 표기)

### 2.2 기술 트렌드 (Tech Trend)

(관련 기술 성숙도, 도입 사례, 대안 기술 등 — 수치에 각주 [2] 표기)

---

## 3. 문제 정의 (Problems)

(타겟 고객이 겪는 구체적인 문제, 기존 해결책의 한계)

---

## 4. 솔루션 (Solution)

(서비스 개요, 핵심 기능 목록, UI/UX·제공 형태 요약)

---

## 5. 경쟁 분석 (Competitive Analysis)

(기존 방법·직접 경쟁 제품 나열, 각 대안의 단점 분석 [3], 주요 경쟁 제품 비교표)

---

## 6. 차별화 (Differentiator)

(기존 솔루션과의 차별성, 단점 극복 방법, 차별화 포인트 도표)

---

## 7. 플랫폼 전략 (Platform Strategy)

(규모 확장 시 가능한 확장 전략 — 부가 서비스, API·파트너십 등)

---

## 8. 시장 정의·규모 (Market Definition & TAM)

(타깃 세그먼트 정의, 시장 규모 TAM [4], 성장 가능성)

---

## 9. 로드맵 (Roadmap)

(개발 단계별 마일스톤, 목표·산출물·대략적 시기)

---

## 11. 사업 모델 (Business Model)

### 11.1 판매 방식

(수익화 방식, 채널·고객 유형)

### 11.2 가격 (Pricing)

(적정 가격 제안 [5], 경쟁 제품 대비 비교, 손익분기점 요약 [6])

---

## 12. 사업 전망 (Business Forecast)

### 12.1 리소스 계획 (Resource Plan)

(인력·역할·투입 기간, 직접비·간접비)

### 12.2 매출 전망 (Sales Forecast)

(보수/기본/낙관 시나리오 [7])

### 12.3 손익분기 시점 (BEP)

(손익분기 시점, 전제 조건)

---

## 13. 리스크 분석 (Risk Analysis)

(기술·시장·인력·규제 리스크, 각 리스크 대응 방안)

---

## 참고문헌 (References)

| 번호 | 가정 내용 | 출처 | URL |
|------|-----------|------|-----|
| [1] | (시장 트렌드 관련 가정) | (출처명) | (URL) |
| [2] | (기술 트렌드 관련 가정) | (출처명) | (URL) |
| [3] | (경쟁 제품·시장 관련 가정) | (출처명) | (URL) |
| [4] | (시장 규모·TAM 관련 가정) | (출처명) | (URL) |
| [5] | (가격 벤치마크 관련 가정) | (출처명) | (URL) |
| [6] | (손익분기 가정) | (출처명) | (URL) |
| [7] | (매출 시나리오 관련 가정) | (출처명) | (URL) |

위 구조에 맞게 각 섹션을 구체적이고 실용적인 내용으로 채워주세요. 검색 자료의 URL은 참고문헌 표에 반드시 인용해주세요.`;
}
