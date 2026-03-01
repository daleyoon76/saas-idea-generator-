import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  createIdeaGenerationPrompt,
  createBusinessPlanPrompt,
  createPRDPrompt,
  createIdeaExtractionPrompt,
  createFullPlanMarketPrompt,
  createFullPlanCompetitionPrompt,
  createFullPlanStrategyPrompt,
  createFullPlanFinancePrompt,
  createFullPlanDevilPrompt,
  type SearchResult,
} from '../prompts';

const mockIdea = {
  name: 'TestSaaS',
  oneLiner: '테스트 서비스',
  target: '개발자',
  features: ['기능A', '기능B'],
  differentiation: '차별화',
  revenueModel: '구독',
  rationale: '좋은 아이디어',
  category: 'B2B',
  problem: '문제 설명',
};

const mockSearchResults: SearchResult[] = [
  { title: '기사1', url: 'https://example.com/1', snippet: '내용1' },
  { title: '기사2', url: 'https://example.com/2', snippet: '내용2' },
];

// ── createIdeaGenerationPrompt ──────────────────────────────────────────

describe('createIdeaGenerationPrompt', () => {
  it('returns Korean prompt with JSON format', () => {
    const result = createIdeaGenerationPrompt();
    expect(result).toContain('한국어로만 답변하세요');
    expect(result).toContain('"ideas"');
  });

  it('includes keyword when provided', () => {
    const result = createIdeaGenerationPrompt('AI 에이전트');
    expect(result).toContain('"AI 에이전트" 관련');
  });

  it('includes search results context', () => {
    const result = createIdeaGenerationPrompt('test', mockSearchResults);
    expect(result).toContain('시장 조사 자료');
    expect(result).toContain('기사1');
    expect(result).toContain('https://example.com/1');
  });

  it('includes criteria when provided', () => {
    const criteria = '커스텀 기준 내용';
    const result = createIdeaGenerationPrompt('test', [], criteria);
    expect(result).toContain(criteria);
  });

  it('uses default criteria when none provided', () => {
    const result = createIdeaGenerationPrompt('test');
    expect(result).toContain('명확한 문제 해결');
  });

  it('includes reddit results when provided', () => {
    const reddit: SearchResult[] = [{ title: 'Reddit 고충', url: 'https://reddit.com/r/test', snippet: 'pain' }];
    const result = createIdeaGenerationPrompt('test', [], undefined, reddit);
    expect(result).toContain('Reddit 커뮤니티 페인포인트');
    expect(result).toContain('Reddit 고충');
  });

  it('includes trends results when provided', () => {
    const trends: SearchResult[] = [{ title: '급등 트렌드: AI', url: '', snippet: '급등 중' }];
    const result = createIdeaGenerationPrompt('test', [], undefined, undefined, trends);
    expect(result).toContain('급등 트렌드 신호');
  });

  it('includes Product Hunt results when provided', () => {
    const ph: SearchResult[] = [{ title: 'Product Hunt 트렌딩: Foo', url: 'https://ph.com', snippet: '인기' }];
    const result = createIdeaGenerationPrompt('test', [], undefined, undefined, undefined, ph);
    expect(result).toContain('Product Hunt 트렌딩 제품');
  });
});

// ── createBusinessPlanPrompt ────────────────────────────────────────────

describe('createBusinessPlanPrompt', () => {
  it('includes idea info in prompt', () => {
    const result = createBusinessPlanPrompt(mockIdea);
    expect(result).toContain('TestSaaS');
    expect(result).toContain('테스트 서비스');
    expect(result).toContain('개발자');
    expect(result).toContain('기능A, 기능B');
  });

  it('includes search results when provided', () => {
    const result = createBusinessPlanPrompt(mockIdea, mockSearchResults);
    expect(result).toContain('시장 조사 및 참고 자료');
    expect(result).toContain('기사1');
  });

  it('uses template when provided', () => {
    const template = '## 커스텀 템플릿 섹션';
    const result = createBusinessPlanPrompt(mockIdea, [], template);
    expect(result).toContain(template);
  });

  it('uses default template when none provided', () => {
    const result = createBusinessPlanPrompt(mockIdea);
    expect(result).toContain('핵심 요약');
    expect(result).toContain('리스크 분석');
  });

  it('falls back to rationale when problem is missing', () => {
    const ideaNoProb = { ...mockIdea, problem: undefined };
    const result = createBusinessPlanPrompt(ideaNoProb);
    expect(result).toContain('좋은 아이디어');
  });
});

// ── createPRDPrompt ─────────────────────────────────────────────────────

describe('createPRDPrompt', () => {
  it('includes idea name in document title', () => {
    const result = createPRDPrompt({ name: 'MySaaS' }, '기획서 내용');
    expect(result).toContain('# MySaaS PRD');
  });

  it('includes business plan content', () => {
    const result = createPRDPrompt({ name: 'X' }, '사업기획서 전체');
    expect(result).toContain('사업기획서 전체');
  });

  it('uses custom template when provided', () => {
    const result = createPRDPrompt({ name: 'X' }, 'content', '## Custom PRD');
    expect(result).toContain('## Custom PRD');
  });

  it('uses default sections when no template', () => {
    const result = createPRDPrompt({ name: 'X' }, 'content');
    expect(result).toContain('사용자 스토리');
    expect(result).toContain('API 엔드포인트');
  });
});

// ── createIdeaExtractionPrompt ──────────────────────────────────────────

describe('createIdeaExtractionPrompt', () => {
  it('includes plan content', () => {
    const result = createIdeaExtractionPrompt('기존 기획서 내용');
    expect(result).toContain('기존 기획서 내용');
  });

  it('truncates long content to 15000 chars', () => {
    const longContent = 'A'.repeat(20000);
    const result = createIdeaExtractionPrompt(longContent);
    // The content in the prompt should be sliced
    expect(result.length).toBeLessThan(20000);
  });

  it('requests JSON output format', () => {
    const result = createIdeaExtractionPrompt('content');
    expect(result).toContain('"name"');
    expect(result).toContain('"features"');
    expect(result).toContain('JSON 형식만 출력');
  });
});

// ── Full Plan Agent Prompts ─────────────────────────────────────────────

describe('createFullPlanMarketPrompt (Agent 1)', () => {
  it('includes idea info and market sections', () => {
    const result = createFullPlanMarketPrompt(mockIdea);
    expect(result).toContain('TestSaaS');
    expect(result).toContain('2. 트렌드');
    expect(result).toContain('3. 문제 정의');
    expect(result).toContain('8. 시장 정의');
  });

  it('includes search results when provided', () => {
    const result = createFullPlanMarketPrompt(mockIdea, mockSearchResults);
    expect(result).toContain('시장 조사 자료');
  });

  it('includes existing plan content when provided', () => {
    const result = createFullPlanMarketPrompt(mockIdea, [], '기존 기획서');
    expect(result).toContain('기존 사업기획서');
    expect(result).toContain('기존 기획서');
  });

  it('uses custom agent instruction when provided', () => {
    const result = createFullPlanMarketPrompt(mockIdea, [], undefined, '커스텀 지시');
    expect(result).toContain('커스텀 지시');
    expect(result).not.toContain('시장·트렌드 분석 전문가');
  });
});

describe('createFullPlanCompetitionPrompt (Agent 2)', () => {
  it('includes market content from Agent 1', () => {
    const result = createFullPlanCompetitionPrompt(mockIdea, '시장 분석 결과');
    expect(result).toContain('시장 분석 결과');
    expect(result).toContain('5. 경쟁 분석');
    expect(result).toContain('6. 차별화');
    expect(result).toContain('7. 플랫폼 전략');
  });
});

describe('createFullPlanStrategyPrompt (Agent 3)', () => {
  it('includes previous agent results', () => {
    const result = createFullPlanStrategyPrompt(mockIdea, '시장결과', '경쟁결과');
    expect(result).toContain('시장결과');
    expect(result).toContain('경쟁결과');
    expect(result).toContain('1. 핵심 요약');
    expect(result).toContain('4. 솔루션');
    expect(result).toContain('9. 로드맵');
    expect(result).toContain('10. 상세 프로젝트 계획');
  });
});

describe('createFullPlanFinancePrompt (Agent 4)', () => {
  it('includes all previous agent results', () => {
    const result = createFullPlanFinancePrompt(mockIdea, '시장', '경쟁', '전략');
    expect(result).toContain('시장');
    expect(result).toContain('경쟁');
    expect(result).toContain('전략');
    expect(result).toContain('11. 사업 모델');
    expect(result).toContain('12. 사업 전망');
    expect(result).toContain('13. 리스크 분석');
    expect(result).toContain('참고문헌');
  });
});

describe('createFullPlanDevilPrompt (Agent 5)', () => {
  it('includes full plan content', () => {
    const result = createFullPlanDevilPrompt(mockIdea, '전체 기획서');
    expect(result).toContain('전체 기획서');
    expect(result).toContain("14. Devil's Advocate");
    expect(result).toContain('현실 검증');
  });

  it('includes 14.4 한국형 규제 리스크 점검 in defaultInstruction', () => {
    const result = createFullPlanDevilPrompt(mockIdea, '전체 기획서');
    expect(result).toContain('14.4 한국형 규제 리스크 점검');
    expect(result).toContain('개인정보보호법 (PIPA)');
    expect(result).toContain('정보통신망법');
    expect(result).toContain('전자상거래법');
    expect(result).toContain('인허가·라이선스');
    expect(result).toContain('공정거래법/표시광고법');
  });

  it('includes 14.5 스트레스 테스트 in defaultInstruction', () => {
    const result = createFullPlanDevilPrompt(mockIdea, '전체 기획서');
    expect(result).toContain('14.5 스트레스 테스트');
    expect(result).toContain('경쟁사 가격 30% 인하');
    expect(result).toContain('핵심 인력(CTO 등) 이탈');
    expect(result).toContain('고객 획득 비용(CAC) 2배 증가');
    expect(result).toContain('시장 성장률 절반 축소');
    expect(result).toContain('보안 사고 / 대규모 장애 발생');
  });

  it('sets word limit to 1200 in defaultInstruction', () => {
    const result = createFullPlanDevilPrompt(mockIdea, '전체 기획서');
    expect(result).toContain('1200단어 이내');
    expect(result).not.toContain('800단어 이내');
  });

  it('uses agentInstruction over defaultInstruction when provided', () => {
    const result = createFullPlanDevilPrompt(mockIdea, '전체 기획서', [], undefined, '커스텀 DA 지시');
    expect(result).toContain('커스텀 DA 지시');
    expect(result).not.toContain('14.4 한국형 규제 리스크 점검');
  });

  it('preserves existing 14.1~14.3 sections', () => {
    const result = createFullPlanDevilPrompt(mockIdea, '전체 기획서');
    expect(result).toContain('14.1 기획서 검토 의견');
    expect(result).toContain('14.2 MVP 첫단계 추천');
    expect(result).toContain('14.3 주의할점');
  });

  it('includes RISK_SUMMARY markers', () => {
    const result = createFullPlanDevilPrompt(mockIdea, '전체 기획서');
    expect(result).toContain('<!-- RISK_SUMMARY -->');
    expect(result).toContain('<!-- /RISK_SUMMARY -->');
  });
});

// ── agents_jd.md 단일 소스 검증 ───────────────────────────────────────────

describe('agents_jd.md AGENT:full-plan-devil block (단일 소스)', () => {
  function extractAgentBlock(content: string, agentType: string): string | undefined {
    const openTag = `<!-- AGENT:${agentType} -->`;
    const closeTag = `<!-- /AGENT:${agentType} -->`;
    const start = content.indexOf(openTag);
    const end = content.indexOf(closeTag);
    if (start === -1 || end === -1) return undefined;
    return content.slice(start + openTag.length, end).trim();
  }

  const agentsJdPath = path.join(__dirname, '..', '..', '..', '..', 'docs', 'agents_jd.md');
  let devilBlock: string | undefined;

  try {
    const content = fs.readFileSync(agentsJdPath, 'utf-8');
    devilBlock = extractAgentBlock(content, 'full-plan-devil');
  } catch {
    // CI 등에서 파일 없으면 스킵
  }

  it('extracts the devil block from agents_jd.md', () => {
    expect(devilBlock).toBeDefined();
    expect(devilBlock!.length).toBeGreaterThan(100);
  });

  it('contains 14.4 한국형 규제 리스크 점검', () => {
    expect(devilBlock).toContain('14.4 한국형 규제 리스크 점검');
    expect(devilBlock).toContain('개인정보보호법 (PIPA)');
    expect(devilBlock).toContain('전자상거래법');
  });

  it('contains 14.5 스트레스 테스트', () => {
    expect(devilBlock).toContain('14.5 스트레스 테스트');
    expect(devilBlock).toContain('경쟁사 가격 30% 인하');
    expect(devilBlock).toContain('보안 사고 / 대규모 장애 발생');
  });

  it('preserves 14.1~14.3 sections', () => {
    expect(devilBlock).toContain('14.1 기획서 검토 의견');
    expect(devilBlock).toContain('14.2 MVP 첫단계 추천');
    expect(devilBlock).toContain('14.3 주의할점');
  });

  it('contains RISK_SUMMARY markers', () => {
    expect(devilBlock).toContain('<!-- RISK_SUMMARY -->');
    expect(devilBlock).toContain('<!-- /RISK_SUMMARY -->');
  });
});
