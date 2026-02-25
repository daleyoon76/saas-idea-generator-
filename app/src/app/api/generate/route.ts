import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createBusinessPlanPrompt, createIdeaGenerationPrompt, createPRDPrompt, createIdeaExtractionPrompt, createFullPlanMarketPrompt, createFullPlanCompetitionPrompt, createFullPlanStrategyPrompt, createFullPlanFinancePrompt, SearchResult } from '@/lib/prompts';
import { Idea } from '@/lib/types';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider = 'ollama', model, prompt: rawPrompt, type, idea, searchResults } = body;
    const jsonMode = type === 'json' || type === 'generate-ideas';

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
    } else if (type === 'extract-idea') {
      const planContent = body.planContent as string;
      if (!planContent || typeof planContent !== 'string') {
        return NextResponse.json({ error: 'planContent must be a non-empty string' }, { status: 400 });
      }
      if (planContent.length > 100000) {
        return NextResponse.json({ error: 'planContent exceeds maximum length (100KB)' }, { status: 400 });
      }
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
      'generate-prd':          15000,
      'extract-idea':          4000,
    };
    const maxTokens = TOKEN_LIMITS[type] ?? 9000;
    let response: string;

    switch (provider) {
      case 'ollama':
        response = await generateWithOllama(model || 'gemma2:9b', prompt, jsonMode);
        break;
      case 'claude':
        response = await generateWithClaude(model || 'claude-sonnet-4-6', prompt, maxTokens);
        break;
      case 'gemini':
        response = await generateWithGemini(model || 'gemini-2.5-flash', prompt, maxTokens, jsonMode);
        break;
      case 'openai':
        response = await generateWithOpenAI(model || 'gpt-4o', prompt, maxTokens);
        break;
      default:
        return NextResponse.json({ error: '지원하지 않는 AI 공급자입니다.' }, { status: 400 });
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

async function generateWithOllama(model: string, prompt: string, jsonMode: boolean = false): Promise<string> {
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
  return data.response;
}

async function generateWithClaude(model: string, prompt: string, maxTokens: number = 8192, retries = 4): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local 파일에 추가해주세요.');

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
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
    });

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
    return data.content[0].text;
  }

  throw new Error('Claude API: 서버 과부하로 재시도 한도 초과. 잠시 후 다시 시도하거나 다른 모델을 선택해주세요.');
}

async function generateWithGemini(model: string, prompt: string, maxTokens: number = 8192, jsonMode: boolean = false): Promise<string> {
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
  const usedTokens: number = data.usageMetadata?.candidatesTokenCount ?? 0;

  // 토큰 한도 초과로 잘린 경우 — 본문 뒤에 경고 삽입
  if (finishReason === 'MAX_TOKENS') {
    return (
      text +
      `\n\n---\n` +
      `> ⚠️ **출력 잘림 (MAX_TOKENS)**: \`${model}\` 모델이 출력 토큰 한도에 도달해 내용이 중간에 잘렸습니다.\n` +
      `> 사용된 출력 토큰: **${usedTokens}** / 요청 한도: **${maxTokens}**\n` +
      `> **해결 방법**: Gemini Pro 모델 또는 Claude/OpenAI로 전환하면 전체 내용을 받을 수 있습니다.`
    );
  }

  return text;
}

async function generateWithOpenAI(model: string, prompt: string, maxTokens: number = 8192, retries = 4): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY가 설정되지 않았습니다. .env.local 파일에 추가해주세요.');

  // 모델별 최대 출력 토큰 상한
  const MODEL_MAX_OUTPUT: Record<string, number> = {
    'gpt-4o':      16384,
    'gpt-4o-mini': 16384,
    'gpt-4.1':     32768,
    'gpt-4.1-mini': 32768,
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
    return data.choices[0].message.content;
  }

  throw new Error('OpenAI API: Rate limit 재시도 한도 초과. 잠시 후 다시 시도해주세요.');
}
