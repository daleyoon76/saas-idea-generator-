import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createBusinessPlanPrompt, createIdeaGenerationPrompt, createPRDPrompt, SearchResult } from '@/lib/prompts';
import { Idea } from '@/lib/types';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

// docs/bizplan-template.md 를 서버에서 읽어 사업기획서 프롬프트 생성
function buildBusinessPlanPrompt(idea: Idea, searchResults: SearchResult[]): string {
  let template: string | undefined;
  try {
    const templatePath = path.join(process.cwd(), '..', 'docs', 'bizplan-template.md');
    template = fs.readFileSync(templatePath, 'utf-8');
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
    template = fs.readFileSync(templatePath, 'utf-8');
  } catch {
    console.warn('prd-template.md 읽기 실패, 기본 구조로 폴백');
  }
  return createPRDPrompt(idea, businessPlanContent, template);
}

// app/src/assets/criteria.md 를 서버에서 읽어 아이디어 생성 프롬프트 생성
function buildIdeaGenerationPrompt(keyword: string | undefined, searchResults: SearchResult[], redditResults: SearchResult[] = [], trendsResults: SearchResult[] = []): string {
  let criteria: string | undefined;
  try {
    const criteriaPath = path.join(process.cwd(), 'src', 'assets', 'criteria.md');
    criteria = fs.readFileSync(criteriaPath, 'utf-8');
  } catch {
    console.warn('criteria.md 읽기 실패, 기본 기준으로 폴백');
  }
  return createIdeaGenerationPrompt(keyword, searchResults, criteria, redditResults, trendsResults);
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
      const { keyword, searchResults: sr, redditResults: rr, trendsResults: tr } = body;
      prompt = buildIdeaGenerationPrompt(keyword, (sr as SearchResult[]) || [], (rr as SearchResult[]) || [], (tr as SearchResult[]) || []);
    } else if (type === 'business-plan' && idea) {
      prompt = buildBusinessPlanPrompt(idea as Idea, (searchResults as SearchResult[]) || []);
    } else if (type === 'generate-prd' && idea) {
      prompt = buildPRDPrompt(idea as Idea, body.businessPlanContent as string || '');
    } else {
      prompt = rawPrompt;
    }

    const maxTokens = (type === 'business-plan' || type === 'generate-prd') ? 16000 : 8192;
    let response: string;

    switch (provider) {
      case 'ollama':
        response = await generateWithOllama(model || 'gemma2:9b', prompt, jsonMode);
        break;
      case 'claude':
        response = await generateWithClaude(model || 'claude-sonnet-4-6', prompt, maxTokens);
        break;
      case 'gemini':
        response = await generateWithGemini(model || 'gemini-2.0-flash', prompt, maxTokens);
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

async function generateWithClaude(model: string, prompt: string, maxTokens: number = 8192): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local 파일에 추가해주세요.');

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
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Claude API 오류: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function generateWithGemini(model: string, prompt: string, maxTokens: number = 8192): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. .env.local 파일에 추가해주세요.');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Gemini API 오류: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function generateWithOpenAI(model: string, prompt: string, maxTokens: number = 8192): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY가 설정되지 않았습니다. .env.local 파일에 추가해주세요.');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`OpenAI API 오류: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
