import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider = 'ollama', model, prompt, type } = body;
    const jsonMode = type === 'json';

    let response: string;

    switch (provider) {
      case 'ollama':
        response = await generateWithOllama(model || 'gemma2:9b', prompt, jsonMode);
        break;
      case 'claude':
        response = await generateWithClaude(model || 'claude-sonnet-4-6', prompt);
        break;
      case 'gemini':
        response = await generateWithGemini(model || 'gemini-2.0-flash', prompt);
        break;
      case 'openai':
        response = await generateWithOpenAI(model || 'gpt-4o', prompt);
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
  const body: Record<string, unknown> = { model, prompt, stream: false };
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

async function generateWithClaude(model: string, prompt: string): Promise<string> {
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
      max_tokens: 8192,
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

async function generateWithGemini(model: string, prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. .env.local 파일에 추가해주세요.');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8192 },
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

async function generateWithOpenAI(model: string, prompt: string): Promise<string> {
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
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`OpenAI API 오류: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
