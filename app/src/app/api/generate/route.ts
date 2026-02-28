import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createBusinessPlanPrompt, createIdeaGenerationPrompt, createPRDPrompt, createIdeaExtractionPrompt, createFullPlanMarketPrompt, createFullPlanCompetitionPrompt, createFullPlanStrategyPrompt, createFullPlanFinancePrompt, createFullPlanDevilPrompt, SearchResult } from '@/lib/prompts';
import { AIProvider, Idea, QualityPreset, MODULE_PRESETS } from '@/lib/types';

/** LLM 응답 결과: 텍스트 + 잘림 여부 */
type LLMResult = { text: string; truncated: boolean };

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

// YAML frontmatter(--- ... ---) 제거
function stripFrontmatter(content: string): string {
  return content.replace(/^---[\s\S]*?---\s*/, '');
}

// docs/bizplan-template.md 를 서버에서 읽어 사업기획서 프롬프트 생성
function buildBusinessPlanPrompt(idea: Idea, searchResults: SearchResult[]): string {
  let template: string | undefined;
  try {
    const templatePath = path.join(process.cwd(), '..', 'docs', 'bizplan-template.md');
    template = stripFrontmatter(fs.readFileSync(templatePath, 'utf-8'));
  } catch {
    console.warn('bizplan-template.md 읽기 실패, 기본 구조로 폴백');
  }
  return createBusinessPlanPrompt(idea, searchResults, template);
}

// docs/prd-template.md 를 서버에서 읽어 PRD 프롬프트 생성
function buildPRDPrompt(idea: Idea, businessPlanContent: string): string {
  let template: string | undefined;
  try {
    const templatePath = path.join(process.cwd(), '..', 'docs', 'prd-template.md');
    template = stripFrontmatter(fs.readFileSync(templatePath, 'utf-8'));
  } catch {
    console.warn('prd-template.md 읽기 실패, 기본 구조로 폴백');
  }
  return createPRDPrompt(idea, businessPlanContent, template);
}

// docs/agents_jd.md 에서 <!-- AGENT:xxx --> 블록을 추출하여 에이전트 지시문 반환
function extractAgentInstruction(content: string, agentType: string): string | undefined {
  const openTag = `<!-- AGENT:${agentType} -->`;
  const closeTag = `<!-- /AGENT:${agentType} -->`;
  const start = content.indexOf(openTag);
  const end = content.indexOf(closeTag);
  if (start === -1 || end === -1) return undefined;
  return content.slice(start + openTag.length, end).trim();
}

// docs/agents_jd.md 를 한 번 읽어 4개 에이전트 지시문을 모두 추출
function readAgentInstructions(): Record<string, string | undefined> {
  try {
    const filePath = path.join(process.cwd(), '..', 'docs', 'agents_jd.md');
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      'full-plan-market': extractAgentInstruction(content, 'full-plan-market'),
      'full-plan-competition': extractAgentInstruction(content, 'full-plan-competition'),
      'full-plan-strategy': extractAgentInstruction(content, 'full-plan-strategy'),
      'full-plan-finance': extractAgentInstruction(content, 'full-plan-finance'),
      'full-plan-devil': extractAgentInstruction(content, 'full-plan-devil'),
    };
  } catch {
    console.warn('agents_jd.md 읽기 실패, 기본 미션으로 폴백');
    return {};
  }
}

// docs/agents_jd.md 를 서버에서 읽어 풀버전 에이전트 프롬프트 생성
function buildFullPlanMarketPrompt(idea: Idea, searchResults: SearchResult[], existingPlanContent?: string): string {
  const instructions = readAgentInstructions();
  return createFullPlanMarketPrompt(idea, searchResults, existingPlanContent, instructions['full-plan-market']);
}

function buildFullPlanCompetitionPrompt(idea: Idea, marketContent: string, searchResults: SearchResult[], existingPlanContent?: string): string {
  const instructions = readAgentInstructions();
  return createFullPlanCompetitionPrompt(idea, marketContent, searchResults, existingPlanContent, instructions['full-plan-competition']);
}

function buildFullPlanStrategyPrompt(idea: Idea, marketContent: string, competitionContent: string, searchResults: SearchResult[], existingPlanContent?: string): string {
  const instructions = readAgentInstructions();
  return createFullPlanStrategyPrompt(idea, marketContent, competitionContent, searchResults, existingPlanContent, instructions['full-plan-strategy']);
}

function buildFullPlanFinancePrompt(idea: Idea, marketContent: string, competitionContent: string, strategyContent: string, searchResults: SearchResult[], existingPlanContent?: string): string {
  const instructions = readAgentInstructions();
  return createFullPlanFinancePrompt(idea, marketContent, competitionContent, strategyContent, searchResults, existingPlanContent, instructions['full-plan-finance']);
}

function buildFullPlanDevilPrompt(idea: Idea, fullPlanContent: string, searchResults: SearchResult[], existingPlanContent?: string): string {
  const instructions = readAgentInstructions();
  return createFullPlanDevilPrompt(idea, fullPlanContent, searchResults, existingPlanContent, instructions['full-plan-devil']);
}

// app/src/assets/criteria.md 를 서버에서 읽어 아이디어 생성 프롬프트 생성
function buildIdeaGenerationPrompt(keyword: string | undefined, searchResults: SearchResult[], redditResults: SearchResult[] = [], trendsResults: SearchResult[] = [], productHuntResults: SearchResult[] = []): string {
  let criteria: string | undefined;
  try {
    const criteriaPath = path.join(process.cwd(), 'src', 'assets', 'criteria.md');
    criteria = fs.readFileSync(criteriaPath, 'utf-8');
  } catch {
    console.warn('criteria.md 읽기 실패, 기본 기준으로 폴백');
  }
  return createIdeaGenerationPrompt(keyword, searchResults, criteria, redditResults, trendsResults, productHuntResults);
}

// --- 동적 검색 쿼리 생성 프롬프트 ---

function buildSearchQueryPrompt(keyword: string, context: 'idea-generation' | 'business-plan', queryCount: number, ideaName?: string, ideaTarget?: string, ideaCategory?: string): string {
  const subject = ideaName || keyword || 'SaaS AI 서비스';

  if (context === 'idea-generation') {
    return `당신은 SaaS 시장 조사 전문가입니다.
사용자가 "${keyword || 'SaaS AI 에이전트'}" 키워드로 SaaS 아이디어를 발굴하려 합니다.

아래 관점을 골고루 커버하는 인터넷 검색 쿼리 ${queryCount}개를 JSON 배열로 생성하세요:
- 시장 규모·성장률·트렌드 (예: TAM, CAGR)
- 기존 솔루션·경쟁 서비스 현황
- 고객 페인포인트·미충족 수요
- AI/자동화 기술 적용 사례
- 투자 동향·스타트업 생태계

규칙:
1. 한국어와 영문 기술 용어를 자연스럽게 혼용 (예: "AI 에이전트 SaaS market size 2025")
2. 각 쿼리는 구체적이고 검색 엔진에 최적화된 형태
3. 중복되지 않는 다양한 각도의 쿼리
4. 연도는 2025를 포함

JSON 배열만 출력하세요. 설명 없이.
예: ["쿼리1", "쿼리2", "쿼리3"]`;
  }

  // business-plan context
  return `당신은 SaaS 사업기획서 작성을 위한 시장 조사 전문가입니다.
"${subject}" 서비스의 사업기획서를 작성하기 위한 인터넷 검색 쿼리 ${queryCount}개를 JSON 배열로 생성하세요.

서비스 정보:
- 서비스명: ${ideaName || '미정'}
- 타깃 고객: ${ideaTarget || '미정'}
- 카테고리: ${ideaCategory || 'SaaS'}

아래 관점을 골고루 커버하세요:
- 경쟁사·대안 솔루션 비교 분석
- 타깃 고객의 페인포인트·미충족 수요
- 시장 규모 (TAM/SAM/SOM)·투자 트렌드
- 가격 책정·수익 모델 사례
- 규제·법률·리스크·진입 장벽

규칙:
1. 한국어와 영문 기술 용어를 자연스럽게 혼용
2. 각 쿼리는 구체적이고 검색 엔진에 최적화된 형태
3. 중복되지 않는 다양한 각도의 쿼리
4. 연도는 2025를 포함

JSON 배열만 출력하세요. 설명 없이.
예: ["쿼리1", "쿼리2", "쿼리3", "쿼리4", "쿼리5"]`;
}

// --- 프리셋 → 모델 해석 ---

function isProviderAvailable(provider: AIProvider): boolean {
  switch (provider) {
    case 'claude': return !!process.env.ANTHROPIC_API_KEY;
    case 'openai': return !!process.env.OPENAI_API_KEY;
    case 'gemini': return !!process.env.GEMINI_API_KEY;
    case 'ollama': return false; // 프리셋에서 제외
    default: return false;
  }
}

/** provider → 실제 LLM API 호출 */
async function callProvider(provider: AIProvider, model: string, prompt: string, maxTokens: number, jsonMode: boolean): Promise<LLMResult> {
  switch (provider) {
    case 'ollama':  return generateWithOllama(model, prompt, jsonMode);
    case 'claude':  return generateWithClaude(model, prompt, maxTokens);
    case 'gemini':  return generateWithGemini(model, prompt, maxTokens, jsonMode);
    case 'openai':  return generateWithOpenAI(model, prompt, maxTokens);
    default: throw new Error(`지원하지 않는 AI 공급자: ${provider}`);
  }
}

/** 프리셋 fallback chain: API 키 확인 → 실제 호출 시도 → 실패 시 다음 모델 */
async function callWithPreset(
  preset: QualityPreset, type: string, prompt: string, maxTokens: number, jsonMode: boolean,
): Promise<{ result: LLMResult; provider: AIProvider; model: string }> {
  const chain = MODULE_PRESETS[preset]?.[type];
  if (!chain) throw new Error(`알 수 없는 프리셋/타입 조합: ${preset}/${type}`);

  const available = chain.filter(c => isProviderAvailable(c.provider));
  if (available.length === 0) {
    throw new Error('사용 가능한 AI 공급자가 없습니다. .env.local에 API 키를 하나 이상 설정해주세요.');
  }

  let lastError: Error | null = null;
  for (const config of available) {
    try {
      console.log(`[프리셋] ${preset}/${type} → ${config.provider}/${config.model}`);
      const result = await callProvider(config.provider, config.model, prompt, maxTokens, jsonMode);
      return { result, provider: config.provider, model: config.model };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[프리셋] ${config.provider}/${config.model} 실패 → 다음 모델 시도:`, lastError.message);
    }
  }
  throw lastError ?? new Error('모든 AI 모델 호출에 실패했습니다.');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { preset, provider: directProvider, model: directModel, prompt: rawPrompt, type, idea, searchResults } = body;

    const jsonMode = type === 'json' || type === 'generate-ideas' || type === 'generate-queries';

    // 아이디어 생성 요청: 서버에서 criteria.md 읽어 프롬프트 생성
    // 사업기획서 요청: 서버에서 bizplan-template.md 읽어 프롬프트 생성
    // PRD 요청: 서버에서 prd-template.md 읽어 프롬프트 생성
    let prompt: string;
    if (type === 'generate-ideas') {
      const { keyword, searchResults: sr, redditResults: rr, trendsResults: tr, productHuntResults: ph } = body;
      prompt = buildIdeaGenerationPrompt(keyword, (sr as SearchResult[]) || [], (rr as SearchResult[]) || [], (tr as SearchResult[]) || [], (ph as SearchResult[]) || []);
    } else if (type === 'business-plan' && idea) {
      prompt = buildBusinessPlanPrompt(idea as Idea, (searchResults as SearchResult[]) || []);
    } else if (type === 'generate-prd' && idea) {
      prompt = buildPRDPrompt(idea as Idea, body.businessPlanContent as string || '');
    } else if (type === 'generate-queries') {
      const { keyword: kw, queryContext, queryCount, ideaName, ideaTarget, ideaCategory } = body;
      prompt = buildSearchQueryPrompt(
        kw as string || '',
        (queryContext as 'idea-generation' | 'business-plan') || 'idea-generation',
        (queryCount as number) || 5,
        ideaName as string | undefined,
        ideaTarget as string | undefined,
        ideaCategory as string | undefined,
      );
    } else if (type === 'extract-idea') {
      const rawPlanContent = body.planContent as string;
      if (!rawPlanContent || typeof rawPlanContent !== 'string') {
        return NextResponse.json({ error: 'planContent must be a non-empty string' }, { status: 400 });
      }
      // 핵심 정보 추출용이므로 앞부분 50K만 사용 (큰 docx 대응)
      const planContent = rawPlanContent.slice(0, 50000);
      prompt = createIdeaExtractionPrompt(planContent);
    } else if (type === 'full-plan-market' && idea) {
      const existingPlan = typeof body.existingPlanContent === 'string' ? body.existingPlanContent.slice(0, 50000) : undefined;
      prompt = buildFullPlanMarketPrompt(idea as Idea, (searchResults as SearchResult[]) || [], existingPlan);
    } else if (type === 'full-plan-competition' && idea) {
      const existingPlan = typeof body.existingPlanContent === 'string' ? body.existingPlanContent.slice(0, 50000) : undefined;
      prompt = buildFullPlanCompetitionPrompt(idea as Idea, body.marketContent as string || '', (searchResults as SearchResult[]) || [], existingPlan);
    } else if (type === 'full-plan-strategy' && idea) {
      const existingPlan = typeof body.existingPlanContent === 'string' ? body.existingPlanContent.slice(0, 50000) : undefined;
      prompt = buildFullPlanStrategyPrompt(idea as Idea, body.marketContent as string || '', body.competitionContent as string || '', (searchResults as SearchResult[]) || [], existingPlan);
    } else if (type === 'full-plan-finance' && idea) {
      const existingPlan = typeof body.existingPlanContent === 'string' ? body.existingPlanContent.slice(0, 50000) : undefined;
      prompt = buildFullPlanFinancePrompt(idea as Idea, body.marketContent as string || '', body.competitionContent as string || '', body.strategyContent as string || '', (searchResults as SearchResult[]) || [], existingPlan);
    } else if (type === 'full-plan-devil' && idea) {
      const existingPlan = typeof body.existingPlanContent === 'string' ? body.existingPlanContent.slice(0, 50000) : undefined;
      const fullPlanContent = typeof body.fullPlanContent === 'string' ? body.fullPlanContent.slice(0, 40000) : '';
      prompt = buildFullPlanDevilPrompt(idea as Idea, fullPlanContent, (searchResults as SearchResult[]) || [], existingPlan);
    } else {
      prompt = rawPrompt;
    }

    // ── 토큰 한도 정책 (개인 사용: 프로덕션 적정값 × 3) ────────────────────
    // 타입                  프로덕션  개인(×3)
    // generate-ideas          4,000   12,000
    // business-plan           8,000   24,000
    // full-plan-* (에이전트)   6,000   18,000
    // generate-prd            5,000   15,000
    // 기타                    3,000    9,000
    // ※ 프로덕션 전환 시 각 값을 1/3로 줄이고 최적화 검토
    const TOKEN_LIMITS: Record<string, number> = {
      'generate-ideas':        12000,
      'business-plan':         24000,
      'full-plan-market':      18000,
      'full-plan-competition': 18000,
      'full-plan-strategy':    18000,
      'full-plan-finance':     18000,
      'full-plan-devil':       18000,
      'generate-prd':          15000,
      'extract-idea':          4000,
      'generate-queries':      2000,
    };
    const maxTokens = TOKEN_LIMITS[type] ?? 9000;
    let result: LLMResult;
    let provider: AIProvider;
    let model: string;

    if (preset) {
      // 프리셋 모드: fallback chain으로 자동 시도
      const resolved = await callWithPreset(preset as QualityPreset, type as string, prompt, maxTokens, jsonMode);
      result = resolved.result;
      provider = resolved.provider;
      model = resolved.model;
    } else {
      // 직접 지정 모드 (하위 호환)
      provider = directProvider || 'ollama';
      model = directModel || '';
      const defaults: Record<string, string> = { ollama: 'gemma2:9b', claude: 'claude-sonnet-4-6', gemini: 'gemini-2.5-flash', openai: 'gpt-4o' };
      result = await callProvider(provider, model || defaults[provider] || '', prompt, maxTokens, jsonMode);
    }

    return NextResponse.json({
      response: result.text,
      meta: { truncated: result.truncated, provider, model },
    });
  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

async function generateWithOllama(model: string, prompt: string, jsonMode: boolean = false): Promise<LLMResult> {
  const body: Record<string, unknown> = {
    model,
    prompt,
    stream: false,
    options: { num_predict: 4096, num_ctx: 8192 },
  };
  if (jsonMode) {
    body.format = 'json';
  }
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Ollama 오류: ${response.statusText}`);
  const data = await response.json();
  // Ollama done_reason: 'stop' (정상) | 'length' (토큰 한도)
  const truncated = data.done_reason === 'length';
  return { text: data.response, truncated };
}

async function generateWithClaude(model: string, prompt: string, maxTokens: number = 8192, retries = 4): Promise<LLMResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local 파일에 추가해주세요.');

  // Opus 등 느린 모델은 응답에 수 분 소요 → 10분 타임아웃
  const timeoutMs = 600000;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: 'You are an expert SaaS business plan writer and market analyst. Always fulfill the user\'s request completely in Korean. Never refuse or say you cannot help. Write the requested sections with concrete details, data, and analysis.',
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timer);
      if (controller.signal.aborted) {
        throw new Error(`Claude API 응답 시간 초과 (${Math.round(timeoutMs / 60000)}분). 모델을 변경하거나 다시 시도해주세요.`);
      }
      // 네트워크 오류 시 재시도
      if (attempt < retries) {
        console.log(`[Claude] fetch 실패 — 15초 후 재시도 (${attempt + 1}/${retries}):`, fetchErr);
        await new Promise(resolve => setTimeout(resolve, 15000));
        continue;
      }
      throw new Error(`Claude API 연결 실패: ${fetchErr instanceof Error ? fetchErr.message : 'fetch failed'}`);
    } finally {
      clearTimeout(timer);
    }

    // Overloaded(529) 또는 Rate limit(429) → 대기 후 재시도
    if ((response.status === 529 || response.status === 429) && attempt < retries) {
      const retryAfterHeader = response.headers.get('retry-after');
      const waitSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 15 * (attempt + 1);
      console.log(`[Claude] ${response.status === 529 ? 'Overloaded' : 'Rate limit'} — ${waitSec}초 후 재시도 (${attempt + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, waitSec * 1000));
      continue;
    }

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Claude API 오류: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text: string = data.content[0].text;
    // stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence'
    const truncated = data.stop_reason === 'max_tokens';
    return { text, truncated };
  }

  throw new Error('Claude API: 서버 과부하로 재시도 한도 초과. 잠시 후 다시 시도하거나 다른 모델을 선택해주세요.');
}

async function generateWithGemini(model: string, prompt: string, maxTokens: number = 8192, jsonMode: boolean = false): Promise<LLMResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. .env.local 파일에 추가해주세요.');

  const generationConfig: Record<string, unknown> = { maxOutputTokens: maxTokens };
  if (jsonMode) generationConfig.responseMimeType = 'application/json';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Gemini API 오류: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error('Gemini API: 응답에 candidates가 없습니다.');

  const text: string = candidate.content?.parts?.[0]?.text ?? '';
  const finishReason: string = candidate.finishReason ?? 'STOP';
  const truncated = finishReason === 'MAX_TOKENS';
  return { text, truncated };
}

async function generateWithOpenAI(model: string, prompt: string, maxTokens: number = 8192, retries = 4): Promise<LLMResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY가 설정되지 않았습니다. .env.local 파일에 추가해주세요.');

  // 모델별 최대 출력 토큰 상한
  const MODEL_MAX_OUTPUT: Record<string, number> = {
    'gpt-4o':       16384,
    'gpt-4o-mini':  16384,
    'gpt-4.1':      32768,
    'gpt-4.1-mini': 32768,
    'gpt-4.1-nano': 32768,
    'gpt-5':       128000,
  };
  const modelCap = MODEL_MAX_OUTPUT[model] ?? 16384;
  const clampedTokens = Math.min(maxTokens, modelCap);

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are an expert SaaS business plan writer and market analyst. Always fulfill the user\'s request completely in Korean. Never refuse or say you cannot help. Write the requested sections with concrete details, data, and analysis.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: clampedTokens,
      }),
    });

    // Rate limit → 대기 후 재시도
    if (response.status === 429 && attempt < retries) {
      const retryAfterHeader = response.headers.get('retry-after');
      const errBody = await response.json().catch(() => ({}));
      // 에러 메시지에서 "try again in Xs" 파싱
      const msgMatch = (errBody?.error?.message as string || '').match(/try again in (\d+(?:\.\d+)?)s/);
      const waitSec = retryAfterHeader
        ? parseInt(retryAfterHeader, 10)
        : msgMatch ? Math.ceil(parseFloat(msgMatch[1])) : 15;
      const waitMs = (waitSec + 3) * 1000; // 3초 버퍼
      console.log(`[OpenAI] Rate limit — ${waitSec}초 후 재시도 (${attempt + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      continue;
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API 오류: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text: string = data.choices[0].message.content;
    // finish_reason: 'stop' (정상) | 'length' (토큰 한도)
    const truncated = data.choices[0].finish_reason === 'length';
    return { text, truncated };
  }

  throw new Error('OpenAI API: Rate limit 재시도 한도 초과. 잠시 후 다시 시도해주세요.');
}
