import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model = 'gemma2:9b', prompt, system } = body;

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        system,
        stream: false,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Ollama API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ response: data.response });
  } catch (error) {
    console.error('Ollama API error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Ollama. Make sure Ollama is running.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);

    if (!response.ok) {
      return NextResponse.json({ connected: false, models: [] });
    }

    const data = await response.json();
    const models = data.models?.map((m: { name: string }) => m.name) || [];

    return NextResponse.json({ connected: true, models });
  } catch {
    return NextResponse.json({ connected: false, models: [] });
  }
}
