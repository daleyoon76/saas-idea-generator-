import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs/path before importing the route
vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(() => '# Mock template content'),
  },
}));
vi.mock('path', () => ({
  default: {
    join: vi.fn((...args: string[]) => args.join('/')),
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocks are set up
const { POST } = await import('../generate/route');

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:4000/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
  vi.stubEnv('OPENAI_API_KEY', 'test-key');
});

describe('POST /api/generate', () => {
  it('returns 500 for unsupported provider', async () => {
    const res = await POST(makeRequest({ provider: 'unknown', prompt: 'test' }) as never);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('지원하지 않는');
  });

  it('calls Claude API for claude provider', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ text: 'Claude 응답' }] }),
      headers: new Headers(),
    });

    const res = await POST(makeRequest({
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      type: 'business-plan',
      idea: { name: 'Test', oneLiner: 'desc', target: 'dev', features: ['a'], differentiation: 'd', revenueModel: 'sub', rationale: 'r' },
      searchResults: [],
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('Claude 응답');

    // Verify it called the Anthropic API
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('calls Gemini API for gemini provider', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Gemini 응답' }] }, finishReason: 'STOP' }],
        usageMetadata: { candidatesTokenCount: 100 },
      }),
    });

    const res = await POST(makeRequest({
      provider: 'gemini',
      prompt: '테스트',
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('Gemini 응답');
  });

  it('calls OpenAI API for openai provider', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'OpenAI 응답' } }],
      }),
      headers: new Headers(),
    });

    const res = await POST(makeRequest({
      provider: 'openai',
      prompt: '테스트',
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('OpenAI 응답');
  });

  it('validates extract-idea: missing planContent returns 400', async () => {
    const res = await POST(makeRequest({
      provider: 'claude',
      type: 'extract-idea',
    }) as never);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('planContent');
  });

  it('truncates too-long planContent to 50K for extract-idea', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ text: '{"name":"Test"}' }] }),
      headers: new Headers(),
    });

    const res = await POST(makeRequest({
      provider: 'claude',
      type: 'extract-idea',
      planContent: 'x'.repeat(100001),
    }) as never);

    expect(res.status).toBe(200);
  });

  it('throws when Claude API key is missing', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');

    const res = await POST(makeRequest({
      provider: 'claude',
      prompt: '테스트',
    }) as never);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('ANTHROPIC_API_KEY');
  });

  it('returns truncated flag for Gemini MAX_TOKENS', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '잘린 응답' }] }, finishReason: 'MAX_TOKENS' }],
        usageMetadata: { candidatesTokenCount: 8192 },
      }),
    });

    const res = await POST(makeRequest({
      provider: 'gemini',
      prompt: '테스트',
    }) as never);

    const data = await res.json();
    expect(data.response).toContain('잘린 응답');
    expect(data.meta.truncated).toBe(true);
  });

  it('handles generate-ideas type with keyword', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ text: '{"ideas":[]}' }] }),
      headers: new Headers(),
    });

    const res = await POST(makeRequest({
      provider: 'claude',
      type: 'generate-ideas',
      keyword: 'AI 에이전트',
      searchResults: [],
    }) as never);

    expect(res.status).toBe(200);
  });

  it('returns 500 on API errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const res = await POST(makeRequest({
      provider: 'ollama',
      prompt: '테스트',
    }) as never);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('Network error');
  });
});

// ── Shared test fixtures ────────────────────────────────────────────────────

const sampleIdea = {
  id: 1,
  name: 'TestSaaS',
  category: '버티컬 B2B 에이전트',
  oneLiner: 'AI로 비즈니스 자동화',
  target: '중소기업 대표',
  problem: '수동 반복 업무',
  features: ['자동 보고서', '데이터 분석'],
  differentiation: 'AI 에이전트 기반',
  revenueModel: '월 구독',
  mvpDifficulty: '중',
  rationale: 'B2B SaaS 시장 성장',
};

const sampleSearchResults = [
  { title: '검색 결과 1', url: 'https://example.com/1', content: '시장 동향' },
];

function mockClaudeSuccess(text = 'Claude 에이전트 응답') {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ content: [{ text }] }),
    headers: new Headers(),
  });
}

// ── Full-plan agent types ───────────────────────────────────────────────────

describe('POST /api/generate — full-plan agent types', () => {
  it('handles full-plan-market with idea and searchResults', async () => {
    mockClaudeSuccess('# 시장 분석 결과');

    const res = await POST(makeRequest({
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      type: 'full-plan-market',
      idea: sampleIdea,
      searchResults: sampleSearchResults,
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('# 시장 분석 결과');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('handles full-plan-market with existingPlanContent', async () => {
    mockClaudeSuccess('# 시장 분석 (기존 기획서 반영)');

    const res = await POST(makeRequest({
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      type: 'full-plan-market',
      idea: sampleIdea,
      searchResults: sampleSearchResults,
      existingPlanContent: '기존 초안 기획서 내용...',
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('# 시장 분석 (기존 기획서 반영)');
  });

  it('handles full-plan-competition with idea and marketContent', async () => {
    mockClaudeSuccess('# 경쟁 분석 결과');

    const res = await POST(makeRequest({
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      type: 'full-plan-competition',
      idea: sampleIdea,
      marketContent: '시장 규모 100억, 성장률 15%',
      searchResults: sampleSearchResults,
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('# 경쟁 분석 결과');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('handles full-plan-competition with existingPlanContent', async () => {
    mockClaudeSuccess('# 경쟁 분석 (기존 반영)');

    const res = await POST(makeRequest({
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      type: 'full-plan-competition',
      idea: sampleIdea,
      marketContent: '시장 규모 100억',
      searchResults: sampleSearchResults,
      existingPlanContent: '기존 기획서 내용',
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('# 경쟁 분석 (기존 반영)');
  });

  it('handles full-plan-strategy with idea, marketContent, and competitionContent', async () => {
    mockClaudeSuccess('# 전략 분석 결과');

    const res = await POST(makeRequest({
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      type: 'full-plan-strategy',
      idea: sampleIdea,
      marketContent: '시장 규모 100억, 성장률 15%',
      competitionContent: '경쟁사 A, B, C 분석',
      searchResults: sampleSearchResults,
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('# 전략 분석 결과');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('handles full-plan-finance with all preceding agent contents', async () => {
    mockClaudeSuccess('# 재무 모델 결과');

    const res = await POST(makeRequest({
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      type: 'full-plan-finance',
      idea: sampleIdea,
      marketContent: '시장 규모 100억',
      competitionContent: '경쟁사 A, B, C',
      strategyContent: '차별화 전략: AI 에이전트',
      searchResults: sampleSearchResults,
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('# 재무 모델 결과');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('handles full-plan-finance with existingPlanContent', async () => {
    mockClaudeSuccess('# 재무 모델 (기존 반영)');

    const res = await POST(makeRequest({
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      type: 'full-plan-finance',
      idea: sampleIdea,
      marketContent: '시장 규모 100억',
      competitionContent: '경쟁사 분석',
      strategyContent: '차별화 전략',
      searchResults: sampleSearchResults,
      existingPlanContent: '기존 재무 기획서',
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('# 재무 모델 (기존 반영)');
  });

  it('handles full-plan-devil with idea and fullPlanContent', async () => {
    mockClaudeSuccess('# 악마의 변호인 피드백');

    const res = await POST(makeRequest({
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      type: 'full-plan-devil',
      idea: sampleIdea,
      fullPlanContent: '전체 사업기획서 내용: 시장분석 + 경쟁분석 + 전략 + 재무',
      searchResults: sampleSearchResults,
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('# 악마의 변호인 피드백');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('handles full-plan-devil with existingPlanContent', async () => {
    mockClaudeSuccess('# 악마의 변호인 (기존 반영)');

    const res = await POST(makeRequest({
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      type: 'full-plan-devil',
      idea: sampleIdea,
      fullPlanContent: '전체 기획서',
      searchResults: sampleSearchResults,
      existingPlanContent: '기존 기획서 피드백',
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('# 악마의 변호인 (기존 반영)');
  });

  it('uses correct token limit (14000) for full-plan-market', async () => {
    mockClaudeSuccess('에이전트 응답');

    await POST(makeRequest({
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      type: 'full-plan-market',
      idea: sampleIdea,
      searchResults: [],
    }) as never);

    // Verify the request body sent to Claude API contains max_tokens: 14000
    const callArgs = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(callArgs[1].body);
    expect(requestBody.max_tokens).toBe(14000);
  });

  it('falls back to rawPrompt when full-plan type is used without idea', async () => {
    mockClaudeSuccess('raw prompt 응답');

    const res = await POST(makeRequest({
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      type: 'full-plan-market',
      // idea is intentionally omitted
      prompt: '직접 작성한 프롬프트',
      searchResults: [],
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('raw prompt 응답');
  });
});

// ── generate-prd type ───────────────────────────────────────────────────────

describe('POST /api/generate — generate-prd type', () => {
  it('handles generate-prd with idea and businessPlanContent', async () => {
    mockClaudeSuccess('# PRD 문서');

    const res = await POST(makeRequest({
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      type: 'generate-prd',
      idea: sampleIdea,
      businessPlanContent: '## 사업기획서 내용\n시장 규모: 100억\n경쟁사: A, B, C',
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('# PRD 문서');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('handles generate-prd with empty businessPlanContent', async () => {
    mockClaudeSuccess('# PRD 문서 (빈 기획서)');

    const res = await POST(makeRequest({
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      type: 'generate-prd',
      idea: sampleIdea,
      // businessPlanContent intentionally omitted
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('# PRD 문서 (빈 기획서)');
  });

  it('uses correct token limit (5000) for generate-prd', async () => {
    mockClaudeSuccess('PRD 응답');

    await POST(makeRequest({
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      type: 'generate-prd',
      idea: sampleIdea,
      businessPlanContent: '기획서 내용',
    }) as never);

    const callArgs = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(callArgs[1].body);
    expect(requestBody.max_tokens).toBe(5000);
  });

  it('falls back to rawPrompt when generate-prd is used without idea', async () => {
    mockClaudeSuccess('raw prompt 응답');

    const res = await POST(makeRequest({
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      type: 'generate-prd',
      // idea is intentionally omitted
      prompt: '직접 작성한 PRD 프롬프트',
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('raw prompt 응답');
  });
});

// ── Gemini MAX_TOKENS additional coverage ───────────────────────────────────

describe('POST /api/generate — Gemini MAX_TOKENS edge cases', () => {
  it('returns truncated flag for Gemini MAX_TOKENS with full-plan type', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: '# 시장 분석 중간까지...' }] },
          finishReason: 'MAX_TOKENS',
        }],
        usageMetadata: { candidatesTokenCount: 18000 },
      }),
    });

    const res = await POST(makeRequest({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      type: 'full-plan-market',
      idea: sampleIdea,
      searchResults: [],
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toContain('# 시장 분석 중간까지...');
    expect(data.meta.truncated).toBe(true);
  });

  it('does not append warning when Gemini finishReason is STOP', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: '정상 응답 완료' }] },
          finishReason: 'STOP',
        }],
        usageMetadata: { candidatesTokenCount: 5000 },
      }),
    });

    const res = await POST(makeRequest({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      type: 'full-plan-market',
      idea: sampleIdea,
      searchResults: [],
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('정상 응답 완료');
    expect(data.response).not.toContain('MAX_TOKENS');
  });

  it('returns model name in meta for MAX_TOKENS response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: '잘린 PRD' }] },
          finishReason: 'MAX_TOKENS',
        }],
        usageMetadata: { candidatesTokenCount: 15000 },
      }),
    });

    const res = await POST(makeRequest({
      provider: 'gemini',
      model: 'gemini-2.5-pro',
      type: 'generate-prd',
      idea: sampleIdea,
      businessPlanContent: '기획서',
    }) as never);

    const data = await res.json();
    expect(data.meta.truncated).toBe(true);
    expect(data.meta.model).toBe('gemini-2.5-pro');
  });
});

// ── Full-plan agents with Gemini provider ───────────────────────────────────

describe('POST /api/generate — full-plan agents with Gemini', () => {
  it('handles full-plan-strategy with Gemini provider', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: '# Gemini 전략 분석' }] },
          finishReason: 'STOP',
        }],
        usageMetadata: { candidatesTokenCount: 8000 },
      }),
    });

    const res = await POST(makeRequest({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      type: 'full-plan-strategy',
      idea: sampleIdea,
      marketContent: '시장 분석 결과',
      competitionContent: '경쟁 분석 결과',
      searchResults: sampleSearchResults,
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('# Gemini 전략 분석');
  });

  it('handles full-plan-devil with OpenAI provider', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '# OpenAI 악마의 변호인' } }],
      }),
      headers: new Headers(),
    });

    const res = await POST(makeRequest({
      provider: 'openai',
      model: 'gpt-4o',
      type: 'full-plan-devil',
      idea: sampleIdea,
      fullPlanContent: '전체 기획서 내용',
      searchResults: [],
    }) as never);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe('# OpenAI 악마의 변호인');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
