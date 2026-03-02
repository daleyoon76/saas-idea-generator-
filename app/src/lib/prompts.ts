// 아이디어 발굴 기준은 app/src/assets/criteria.md 에서 서버 사이드로 읽어옴 (api/generate/route.ts)

// 사업기획서 템플릿은 docs/bizplan-template.md 에서 서버 사이드로 읽어옴 (api/generate/route.ts)

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export function createIdeaGenerationPrompt(keyword?: string, searchResults?: SearchResult[], criteria?: string, redditResults?: SearchResult[], trendsResults?: SearchResult[], productHuntResults?: SearchResult[], naverResults?: SearchResult[], businessType?: string): string {
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

  let redditContext = '';
  if (redditResults && redditResults.length > 0) {
    redditContext = `
## Reddit 커뮤니티 페인포인트
다음은 Reddit에서 실제 창업자·사용자들이 불편함을 토로한 글입니다.
이 페인포인트를 해결하는 방향을 아이디어 발굴에 반영하세요:

${redditResults.map((r, i) => `${i + 1}. **${r.title}** (출처: ${r.url})
   - ${r.snippet}`).join('\n\n')}

`;
  }

  let trendsContext = '';
  if (trendsResults && trendsResults.length > 0) {
    trendsContext = `
## 급등 트렌드 신호 (Google Trends)
다음은 현재 급격히 성장하고 있지만 아직 주류가 되지 않은 키워드들입니다.
이 트렌드를 아이디어의 방향성과 타이밍 판단에 적극 활용하세요:

${trendsResults.map((r, i) => `${i + 1}. **${r.title.replace('급등 트렌드: ', '')}** — ${r.snippet}`).join('\n')}

`;
  }

  let productHuntContext = '';
  if (productHuntResults && productHuntResults.length > 0) {
    productHuntContext = `
## Product Hunt 트렌딩 제품 (최근 30일)
다음은 최근 Product Hunt에서 주목받고 있는 실제 출시 제품들입니다.
이 제품들이 해결하는 문제, 접근 방식, 시장 수요를 아이디어 발굴에 참고하세요:

${productHuntResults.map((r, i) => `${i + 1}. **${r.title.replace('Product Hunt 트렌딩: ', '')}** (${r.url})
   - ${r.snippet}`).join('\n\n')}

`;
  }

  let naverContext = '';
  if (naverResults && naverResults.length > 0) {
    naverContext = `
## 네이버 블로그·뉴스 (한국 시장 동향)
다음은 네이버에서 수집한 한국어 블로그·뉴스 기사입니다.
한국 시장의 실제 동향, 사용자 반응, 업계 분석을 아이디어 발굴에 반영하세요:

${naverResults.map((r, i) => `${i + 1}. **${r.title}** (${r.url})
   - ${r.snippet}`).join('\n\n')}

`;
  }

  const isNonSoftware = businessType === 'non-software';

  const criteriaSection = isNonSoftware
    ? '' // 비소프트웨어: criteria 미적용
    : criteria
      ? `## 아이디어 발굴 기준\n${criteria}`
      : `## 아이디어 발굴 기준\n- 명확한 문제 해결, 충분한 시장 규모, MVP 빠른 구현 가능 여부를 기준으로 선정`;

  const ideaTypeLabel = isNonSoftware ? '사업 아이디어' : 'SaaS/Agent 아이디어';

  const criteriaGuideLine = isNonSoftware
    ? ''
    : '\n각 아이디어는 발굴 기준의 5가지 기준(수요 형태 변화, 버티컬 니치, 결과 기반 수익화, 바이브 코딩 타당성, 에이전틱 UX)을 최대한 충족해야 합니다.';

  const nonSoftwareGuard = isNonSoftware
    ? `\n🚫 비소프트웨어 사업 모드:
- SaaS, 앱, 소프트웨어 플랫폼, AI 에이전트 등 소프트웨어 기반 아이디어를 절대 제안하지 마세요.
- 오프라인 서비스, 제조, 유통, 프랜차이즈, 컨설팅, 교육, 의료, F&B 등 비소프트웨어 사업 아이디어만 제안하세요.
- 디지털 도구는 운영 보조 수단으로만 언급하고, 소프트웨어 자체가 핵심 제품인 아이디어는 제외하세요.\n`
    : '';

  const contextIntro = isNonSoftware
    ? `시장 환경을 참고하여, ${keywordPart} ${ideaTypeLabel} 3개를 아래 JSON 형식으로 출력하세요.`
    : `위 발굴 기준과 시장 환경을 참고하여, ${keywordPart} ${ideaTypeLabel} 3개를 아래 JSON 형식으로 출력하세요.`;

  return `한국어로만 답변하세요.

⚠️ 중요 규칙:
- 검색 자료에서 확인된 트렌드·수치만 활용하세요.
- 가상의 회사명, 수치, 사례를 만들어내지 마세요.
- 검색 자료가 없거나 근거가 없으면 해당 필드를 "시장 조사 필요"로 표기하세요.
- rationale 필드는 검색 자료 [번호]를 인용하여 근거를 제시하세요.
${nonSoftwareGuard}
${criteriaSection}
${searchContext}${redditContext}${trendsContext}${productHuntContext}${naverContext}
${contextIntro}${criteriaGuideLine}

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

// ─── 기획서 Import: Idea 추출 프롬프트 ────────────────────────────────────────

export function createIdeaExtractionPrompt(planContent: string): string {
  return `한국어로만 답변하세요.

다음 사업기획서에서 핵심 정보를 추출하여 아래 JSON 형식으로 출력하세요.
기획서에 해당 정보가 명시되지 않은 경우 내용을 바탕으로 합리적으로 추론하세요.

## 사업기획서 내용
${planContent.slice(0, 8000)}

\`\`\`json
{
  "name": "서비스 이름",
  "category": "B2C 또는 B2B",
  "oneLiner": "서비스 한 줄 설명",
  "target": "대상 고객",
  "problem": "해결하려는 문제",
  "features": ["핵심 기능1", "핵심 기능2", "핵심 기능3"],
  "differentiation": "차별화 포인트",
  "revenueModel": "수익 모델",
  "mvpDifficulty": "상/중/하 중 하나",
  "rationale": "이 사업의 핵심 가치와 시장 기회"
}
\`\`\`

위 JSON 형식만 출력하세요.`;
}

// ─── 풀버전 에이전트 팀 프롬프트 ───────────────────────────────────────────

type FullPlanIdea = {
  name: string;
  oneLiner: string;
  target: string;
  features: string[];
  differentiation: string;
  revenueModel: string;
  rationale: string;
  category?: string;
  problem?: string;
  vibeCoding?: string;
};

function buildSearchCtx(searchResults?: SearchResult[]): string {
  if (!searchResults || searchResults.length === 0) return '';
  return `\n## 시장 조사 자료\n다음은 인터넷 검색을 통해 수집한 최신 시장 정보입니다:\n\n${searchResults.map((r, i) => `${i + 1}. **${r.title}**\n   - URL: ${r.url}\n   - 내용: ${r.snippet}`).join('\n\n')}\n`;
}

function buildExistingPlanCtx(existingPlanContent?: string): string {
  if (!existingPlanContent) return '';
  return `\n## 기존 사업기획서 (심화·보완 대상)
아래는 사용자가 제공한 기존 기획서입니다. 이 내용을 기반으로 검증·보완·심화하세요.
기존 내용과 모순되지 않으면서 더 구체적인 근거와 데이터를 추가하세요.

${existingPlanContent.slice(0, 6000)}
`;
}

function ideaBlock(idea: FullPlanIdea): string {
  const vibeLine = idea.vibeCoding ? `\n- AI 코딩 도구 활용: ${idea.vibeCoding}` : '';
  return `## 서비스 정보
- 서비스명: ${idea.name}
- 설명: ${idea.oneLiner}
- 대상 고객: ${idea.target}
- 해결하려는 문제: ${idea.problem || idea.rationale}
- 핵심 기능: ${idea.features.join(', ')}
- 차별화: ${idea.differentiation}
- 수익 모델: ${idea.revenueModel}${vibeLine}`;
}

/** Agent 1 — 시장·문제 에이전트: 섹션 2, 3, 8 */
export function createFullPlanMarketPrompt(idea: FullPlanIdea, searchResults?: SearchResult[], existingPlanContent?: string, agentInstruction?: string): string {
  const defaultInstruction = `당신은 시장·트렌드 분석 전문가입니다. 위 서비스에 대해 **아래 3개 섹션만** 작성하세요.
다른 섹션(1. 핵심요약, 4. 솔루션, 5. 경쟁분석 등)은 절대 포함하지 마세요.
섹션 제목은 정확히 아래 형식을 유지하세요.

## 2. 트렌드 (Trend)

### 2.1 시장 트렌드 (Market Trend)

- 이 서비스 관련 시장 규모·성장률·정책 변화 등 [번호]
- 관련 수치는 Markdown 표로 시각화 (가능한 경우)

### 2.2 기술 트렌드 (Tech Trend)

- 이 서비스 관련 기술 성숙도·도입 사례·대안 기술 등 [번호]

---

## 3. 문제 정의 (Problems)

- 기존에 어떤 문제가 있었는지 구체적으로
- 이 서비스를 사용하면 기존 해결책보다 어떻게 더 효과적으로 해결되는지 명시

---

## 8. 시장 정의·규모 (Market Definition & TAM)

- **시장 정의**: 타깃 세그먼트 정의
- **TAM** (전체 시장): [번호]
- **SAM** (획득 가능 시장): [번호]
- **SOM** (현실적 점유 목표): [번호]
- **성장 가능성**: 앞선 트렌드와 연결

---

작성 원칙:
- Bullet point 중심, 항목별 명사형 마무리
- 수치·통계에는 [1], [2] 형태 각주 필수
- 검색 자료 없으면 "~로 추정" 또는 "업계 추정치"로 명시
- 가상 기업명·수치 생성 금지
- 데이터 시각화(차트)가 필요하면 \`\`\`chart 코드 블록 안에 JSON을 작성하세요. 지원 타입:
  · bar/line: {"type":"bar","title":"제목","xLabel":"X축","yLabel":"Y축","data":[{"name":"카테고리","시리즈명":값}]}
  · pie: {"type":"pie","title":"제목","data":[{"name":"항목","value":값}]}
  · scatter: {"type":"scatter","title":"제목","xLabel":"X축","yLabel":"Y축","data":[{"name":"라벨","x":0.7,"y":0.3}]}
  · radar: {"type":"radar","title":"제목","data":[{"name":"평가항목","시리즈명":값}]}
- 프로세스 흐름도만 \`\`\`mermaid 코드 블록의 flowchart를 사용하세요. 화살표는 반드시 ASCII \`-->\`를 사용하세요.
- 표 데이터는 기존처럼 Markdown 표를 사용하세요.`;

  return `한국어로만 답변하세요.
${buildSearchCtx(searchResults)}
${ideaBlock(idea)}
${buildExistingPlanCtx(existingPlanContent)}

${agentInstruction || defaultInstruction}`;
}

/** Agent 2 — 경쟁·차별화 에이전트: 섹션 5, 6, 7 */
export function createFullPlanCompetitionPrompt(idea: FullPlanIdea, marketContent: string, searchResults?: SearchResult[], existingPlanContent?: string, agentInstruction?: string): string {
  const defaultInstruction = `당신은 경쟁 분석·포지셔닝 전문가입니다. 위 서비스에 대해 **아래 3개 섹션만** 작성하세요.
다른 섹션(1. 핵심요약, 2. 트렌드, 3. 문제정의 등)은 절대 포함하지 마세요.
섹션 제목은 정확히 아래 형식을 유지하세요.

## 5. 경쟁 분석 (Competitive Analysis)

- 기존 방법 또는 직접 경쟁 제품 나열
- 각 대안의 단점 분석 [번호]
- **주요 경쟁 제품 비교표 (Markdown 표 형식, 최소 3개 경쟁사 필수)**
- 직접 경쟁사 없으면 "직접 경쟁사 미확인"으로 표기

---

## 6. 차별화 (Differentiator)

- 기존 솔루션들과의 차별성
- 우리 서비스가 기존 대안들의 단점을 어떻게, 얼마나 극복하는지 구체적으로
- **차별화 포인트 도표 (Markdown 표 필수)**

---

## 7. 플랫폼 전략 (Platform Strategy)

- 솔루션이 성공해 사용자 규모가 커졌을 때 가능한 확장 전략
- 부가 서비스, API·파트너십 등

---

작성 원칙:
- Bullet point 중심, 항목별 명사형 마무리
- 비교표, 차별화 도표 등 Markdown 표 형식 적극 활용
- 가상 기업명 생성 금지
- 데이터 시각화(차트)가 필요하면 \`\`\`chart 코드 블록 안에 JSON을 작성하세요. 지원 타입:
  · bar/line: {"type":"bar","title":"제목","xLabel":"X축","yLabel":"Y축","data":[{"name":"카테고리","시리즈명":값}]}
  · pie: {"type":"pie","title":"제목","data":[{"name":"항목","value":값}]}
  · scatter: {"type":"scatter","title":"제목","xLabel":"X축","yLabel":"Y축","data":[{"name":"라벨","x":0.7,"y":0.3}]}
  · radar: {"type":"radar","title":"제목","data":[{"name":"평가항목","시리즈명":값}]}
- 프로세스 흐름도만 \`\`\`mermaid 코드 블록의 flowchart를 사용하세요. 화살표는 반드시 ASCII \`-->\`를 사용하세요.
- 표 데이터는 기존처럼 Markdown 표를 사용하세요.`;

  return `한국어로만 답변하세요.
${buildSearchCtx(searchResults)}
${ideaBlock(idea)}

## 이전 에이전트 분석 결과 (시장·문제·TAM)
${marketContent}
${buildExistingPlanCtx(existingPlanContent)}
${agentInstruction || defaultInstruction}`;
}

/** Agent 3 — 전략·솔루션 에이전트: 섹션 1, 4, 9, 10 */
export function createFullPlanStrategyPrompt(idea: FullPlanIdea, marketContent: string, competitionContent: string, searchResults?: SearchResult[], existingPlanContent?: string, agentInstruction?: string): string {
  const defaultInstruction = `당신은 제품 전략·개발 로드맵 전문가입니다. 위 서비스에 대해 **아래 4개 섹션만** 작성하세요.
다른 섹션(2. 트렌드, 5. 경쟁분석 등)은 절대 포함하지 마세요.
섹션 제목은 정확히 아래 형식을 유지하세요.

## 1. 핵심 요약 (Executive Summary)

- **서비스 한 줄 요약**
- **핵심 가치** (어떤 문제를 어떻게 해결하는지)
- **목표 시장·목표 사용자 수**

---

## 4. 솔루션 (Solution)

- **만들려는 것** (서비스·제품 개요)
- **핵심 기능 목록** (구체적으로)
- **UI/UX·제공 형태 요약**

---

## 9. 로드맵 (Roadmap)

- 향후 개발을 어떤 단계로 진행해 출시할지
- Phase 1 / Phase 2 / Phase 3 구분, 마일스톤별 목표·산출물·대략적 시기
- 서비스 정보에 "AI 코딩 도구 활용" 항목이 있으면 개발 기간 산정 시 반영하세요.

---

## 10. 상세 프로젝트 계획 (Detail Project Plan)

- 단계별 태스크, 담당, 기간, 의존 관계
- Markdown 표로 작성 (가능한 경우)
- 서비스 정보에 "AI 코딩 도구 활용: 적극 활용"이 있으면 개발 태스크 기간을 30~50% 단축하세요.

---

작성 원칙:
- Bullet point 중심, 항목별 명사형 마무리
- 로드맵은 단계별 구조로 명확하게
- 구체적이고 실행 가능한 수준으로 작성
- 데이터 시각화(차트)가 필요하면 \`\`\`chart 코드 블록 안에 JSON을 작성하세요. 지원 타입:
  · bar/line: {"type":"bar","title":"제목","xLabel":"X축","yLabel":"Y축","data":[{"name":"카테고리","시리즈명":값}]}
  · pie: {"type":"pie","title":"제목","data":[{"name":"항목","value":값}]}
  · scatter: {"type":"scatter","title":"제목","xLabel":"X축","yLabel":"Y축","data":[{"name":"라벨","x":0.7,"y":0.3}]}
  · radar: {"type":"radar","title":"제목","data":[{"name":"평가항목","시리즈명":값}]}
- 프로세스 흐름도만 \`\`\`mermaid 코드 블록의 flowchart를 사용하세요. 화살표는 반드시 ASCII \`-->\`를 사용하세요.
- 표 데이터는 기존처럼 Markdown 표를 사용하세요.`;

  return `한국어로만 답변하세요.
${buildSearchCtx(searchResults)}
${ideaBlock(idea)}

## 이전 에이전트 분석 결과 (시장·문제·경쟁·차별화)
${marketContent}

${competitionContent}
${buildExistingPlanCtx(existingPlanContent)}
${agentInstruction || defaultInstruction}`;
}

/** Agent 4 — 재무·리스크 에이전트: 섹션 11, 12, 13, 참고문헌 */
export function createFullPlanFinancePrompt(idea: FullPlanIdea, marketContent: string, competitionContent: string, strategyContent: string, searchResults?: SearchResult[], existingPlanContent?: string, agentInstruction?: string): string {
  const defaultInstruction = `당신은 재무 모델링·리스크 분석 전문가입니다. 위 서비스에 대해 **아래 4개 섹션만** 작성하세요.
다른 섹션(1~10)은 절대 포함하지 마세요.
섹션 제목은 정확히 아래 형식을 유지하세요.

## 11. 사업 모델 (Business Model)

### 11.1 판매 방식

- **수익화 방식**: 구독 / 직접 판매 / 라이센싱 등
- 채널·고객 유형 요약

### 11.2 가격 (Pricing)

- **가격 티어 예시** (Starter / Pro / Enterprise 등) [번호]
- **경쟁 제품 대비 가격 비교** (Markdown 표)
- **손익분기점 도달 조건** — 초기 개발비·운영비 대비 [번호]

---

## 12. 사업 전망 (Business Forecast)

### 12.1 리소스 계획

- **인력**: 역할·인원·투입 기간
- **비용**: 직접비(인건비, 외주, 인프라), 간접비(관리, 마케팅)
- **AI 코딩 도구 반영**: 서비스 정보의 "AI 코딩 도구 활용" 항목을 확인하여 개발 MM·기간·인건비를 조정하세요.
  · "적극 활용" → 개발 인력 MM을 기본 대비 50~70%로 축소, 개발 기간도 단축
  · "부분 활용" → 개발 인력 MM을 기본 대비 70~85%로 축소
  · "미사용" 또는 미기재 → 전통 개발 방식 기준 (조정 없음)

### 12.2 매출 전망 [번호]

- 보수/기본/낙관 시나리오 구분

### 12.3 손익분기 시점 (BEP)

- 전제 조건(가격, 고객 수, 비용 가정)
- 월/분기 기준

---

## 13. 리스크 분석 (Risk Analysis)

- 기술·시장·인력·규제 리스크 분석
- **규제·법률 리스크 최소 1개 필수**
- 각 리스크별 대응 방안·완화 전략

---

## 참고문헌 (References)

검색 자료 URL 전체를 아래 형식으로 나열:

- [1] (내용 요약)
  - 출처: (출처명)
  - URL: (URL)

---

작성 원칙:
- Bullet point 중심, 항목별 명사형 마무리
- 수치·통계에는 [번호] 각주 필수
- 출처 없는 수치는 "~로 추정" 또는 "업계 추정치"로 명시
- 가상 기업명·수치 생성 금지
- 데이터 시각화(차트)가 필요하면 \`\`\`chart 코드 블록 안에 JSON을 작성하세요. 지원 타입:
  · bar/line: {"type":"bar","title":"제목","xLabel":"X축","yLabel":"Y축","data":[{"name":"카테고리","시리즈명":값}]}
  · pie: {"type":"pie","title":"제목","data":[{"name":"항목","value":값}]}
  · scatter: {"type":"scatter","title":"제목","xLabel":"X축","yLabel":"Y축","data":[{"name":"라벨","x":0.7,"y":0.3}]}
  · radar: {"type":"radar","title":"제목","data":[{"name":"평가항목","시리즈명":값}]}
- 프로세스 흐름도만 \`\`\`mermaid 코드 블록의 flowchart를 사용하세요. 화살표는 반드시 ASCII \`-->\`를 사용하세요.
- 표 데이터는 기존처럼 Markdown 표를 사용하세요.`;

  return `한국어로만 답변하세요.
${buildSearchCtx(searchResults)}
${ideaBlock(idea)}

## 이전 에이전트 분석 결과 (시장·경쟁·전략)
${marketContent}

${competitionContent}

${strategyContent}
${buildExistingPlanCtx(existingPlanContent)}
${agentInstruction || defaultInstruction}`;
}

/** Agent 5 — Devil's Advocate 에이전트: 섹션 14(검토 의견) 생성 */
export function createFullPlanDevilPrompt(idea: FullPlanIdea, fullPlanContent: string, searchResults?: SearchResult[], existingPlanContent?: string, agentInstruction?: string): string {
  const defaultInstruction = `당신은 냉정한 현실 검증 전문가(Devil's Advocate)입니다. 완성된 사업기획서 전문을 읽고 아래 두 블록을 순서대로 출력하세요.
기존 섹션(1~13)은 절대 출력하지 마세요.
섹션 14 이외의 번호(15, 16, ...)를 절대 생성하지 마세요.

**출력 구조 (반드시 이 순서로):**

### 블록 1: 핵심 리스크 요약 (HTML 주석 마커 필수)

아래 형식 그대로 출력하세요. 마커를 빠뜨리지 마세요.

<!-- RISK_SUMMARY -->
- (이 기획서에서 가장 경계해야 할 핵심 리스크 1)
- (핵심 리스크 2)
- (핵심 리스크 3)
- (필요 시 4~5개까지)
<!-- /RISK_SUMMARY -->

### 블록 2: 섹션 14 (기존과 동일)

## 14. Devil's Advocate — 현실 검증 및 첫단계 추천

### 14.1 기획서 검토 의견
- 가장 문제가 큰 섹션 **3~5개만 선별**하여 핵심 지적
- "## N. 제목 → 지적 사항" 형식, 각 섹션당 bullet 1~3개
- 사소한 문제나 정상 섹션은 완전히 생략

### 14.2 MVP 첫단계 추천
- 가장 적은 리소스로 가장 빠르게 시장 검증할 수 있는 구체적 첫단계
  - 구현 범위 (핵심 1~2개 기능)
  - 예상 기간·인원
  - 성공/실패 판단 기준 (구체적 수치 KPI)

### 14.3 주의할점
- 이 사업을 시작할 때 반드시 주의해야 할 현실적 리스크·함정
  - 기술적 함정 (과소평가하기 쉬운 난이도)
  - 시장 함정 (실제 수요 vs 추정 수요 괴리)
  - 재무 함정 (숨겨진 비용, 캐시플로우 리스크)

### 14.4 한국형 규제 리스크 점검
- 이 사업에 해당하는 한국 규제·인허가를 체크리스트로 점검
  - 개인정보보호법 (PIPA) — 개인정보 수집·처리·제3자 제공 이슈
  - 정보통신망법 — 서비스 운영 시 보안 조치·침해사고 신고 의무
  - 전자상거래법 — 구독·결제·환불·약관 관련 의무
  - 인허가·라이선스 — 업종별 필수 인허가 여부
  - 공정거래법/표시광고법 — 과장 마케팅·비교광고 리스크
- 해당 없는 항목은 "해당 없음"으로 간단히 처리, 해당 항목만 구체적 지적

### 14.5 스트레스 테스트
- 아래 5가지 충격 시나리오 중 이 사업에 가장 치명적인 **3개를 선택**, 각각 영향·대응방안을 1~2줄로 기술
  - 경쟁사 가격 30% 인하
  - 핵심 인력(CTO 등) 이탈
  - 고객 획득 비용(CAC) 2배 증가
  - 시장 성장률 절반 축소
  - 보안 사고 / 대규모 장애 발생

---

작성 원칙:
- **간결하게 작성 (전체 1200단어 이내)**. 장황한 설명 없이 핵심만 bullet로
- 낙관적 편향을 제거하고 냉정하게 검증
- "~할 수 있다"보다 "~하려면 최소 X가 필요하다" 식의 구체적 조건 제시
- Bullet point 중심, 항목별 명사형 마무리
- 핵심 리스크 요약(RISK_SUMMARY)은 3~5개 bullet, 각 1줄로 간결하게
- 데이터 시각화(차트)가 필요하면 \`\`\`chart 코드 블록 안에 JSON을 작성하세요. 지원 타입:
  · bar/line: {"type":"bar","title":"제목","xLabel":"X축","yLabel":"Y축","data":[{"name":"카테고리","시리즈명":값}]}
  · pie: {"type":"pie","title":"제목","data":[{"name":"항목","value":값}]}
  · scatter: {"type":"scatter","title":"제목","xLabel":"X축","yLabel":"Y축","data":[{"name":"라벨","x":0.7,"y":0.3}]}
  · radar: {"type":"radar","title":"제목","data":[{"name":"평가항목","시리즈명":값}]}
- 프로세스 흐름도만 \`\`\`mermaid 코드 블록의 flowchart를 사용하세요. 화살표는 반드시 ASCII \`-->\`를 사용하세요.
- 표 데이터는 기존처럼 Markdown 표를 사용하세요.`;

  return `한국어로만 답변하세요.
${buildSearchCtx(searchResults)}
${ideaBlock(idea)}
${buildExistingPlanCtx(existingPlanContent)}

## 완성된 사업기획서 전문
${fullPlanContent}

${agentInstruction || defaultInstruction}`;
}

// ─────────────────────────────────────────────────────────────────────────────

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
  vibeCoding?: string;
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

## 1. 핵심 요약 / 2. 트렌드 / 3. 문제 정의 / 4. 솔루션 / 5. 경쟁 분석 / 6. 차별화 / 7. 시장 규모 / 8. 사업 모델 / 9. 사업 전망 / 10. 리스크 분석 / 참고문헌

위 10개 섹션을 구체적이고 실용적인 내용으로 채워주세요.

**문서 마지막(참고문헌 뒤)에 다음 안내를 추가하세요:**
> 💡 이 문서는 초안(Draft)입니다. 플랫폼 전략, 로드맵, 상세 프로젝트 계획, 현실 검증(Devil's Advocate) 섹션은 **풀버전 사업기획서**에서 제공됩니다.`;

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
- 수익 모델: ${idea.revenueModel}${idea.vibeCoding ? `\n- AI 코딩 도구 활용: ${idea.vibeCoding}` : ''}

**작성 원칙:**
- 모든 수치·통계는 검색 자료 [번호] 형식으로 반드시 출처를 표기하세요.
- 출처 없는 수치는 "~로 추정" 또는 "업계 추정치"로 명시하세요.
- 가상의 기업명·수치를 생성하지 마세요. 실제 경쟁사가 없으면 "직접 경쟁사 미확인"으로 표기하세요.

**작성 규칙:**
- 전체적으로 Bullet point를 활용하고, 항목별 명사형으로 마무리
- 서술형 문장이 길게 이어지는 것을 지양
- 통계·가정·수치에는 [1], [2] 형태의 각주를 붙이고, 문서 말미 참고문헌 표와 연결
- 비교표, 차별화 도표 등 시각화 요소 적극 활용 (Markdown 표 형식)
- 데이터 시각화(차트)가 필요하면 \`\`\`chart 코드 블록 안에 JSON을 작성하세요. 지원 타입:
  · bar/line: {"type":"bar","title":"제목","xLabel":"X축","yLabel":"Y축","data":[{"name":"카테고리","시리즈명":값}]}
  · pie: {"type":"pie","title":"제목","data":[{"name":"항목","value":값}]}
  · scatter: {"type":"scatter","title":"제목","xLabel":"X축","yLabel":"Y축","data":[{"name":"라벨","x":0.7,"y":0.3}]}
  · radar: {"type":"radar","title":"제목","data":[{"name":"평가항목","시리즈명":값}]}
- 프로세스 흐름도만 \`\`\`mermaid 코드 블록의 flowchart를 사용하세요. 화살표는 반드시 ASCII \`-->\`를 사용하세요.
- 표 데이터는 기존처럼 Markdown 표를 사용하세요.

**섹션별 필수 요건:**
- 경쟁 분석: 실제 경쟁사 최소 3개를 비교표로 제시
- 시장 정의·규모: TAM / SAM / SOM 3단계 구분 필수
- 사업 모델: 가격 티어 예시(Starter / Pro / Enterprise 등) 포함
- 리스크 분석: 규제·법률 리스크 1개 이상 반드시 포함
- 참고문헌: 검색 자료 URL 전체를 불릿포인트로 나열 (형식: "- [번호] 내용 요약\n  - 출처: 출처명\n  - URL: URL")

${templateSection}`;
}
