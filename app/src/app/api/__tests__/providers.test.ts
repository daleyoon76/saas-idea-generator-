import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const { GET } = await import('../providers/route');

beforeEach(() => {
  mockFetch.mockReset();
});

describe('GET /api/providers', () => {
  it('returns all providers with correct status', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'key1');
    vi.stubEnv('GEMINI_API_KEY', 'key2');
    vi.stubEnv('OPENAI_API_KEY', '');

    // Ollama reachable
    mockFetch.mockResolvedValueOnce({ ok: true });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.ollama).toBe(true);
    expect(data.claude).toBe(true);
    expect(data.gemini).toBe(true);
    expect(data.openai).toBe(false);
  });

  it('returns ollama false when unreachable', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('OPENAI_API_KEY', '');

    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const res = await GET();
    const data = await res.json();

    expect(data.ollama).toBe(false);
    expect(data.claude).toBe(false);
    expect(data.gemini).toBe(false);
    expect(data.openai).toBe(false);
  });
});
