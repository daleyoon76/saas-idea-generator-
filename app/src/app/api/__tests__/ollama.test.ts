import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const { POST, GET } = await import('../ollama/route');

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:4000/api/ollama', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('POST /api/ollama', () => {
  it('forwards prompt to Ollama and returns response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'Hello from Ollama' }),
    });

    const res = await POST(makeRequest({ prompt: 'test', system: 'you are helpful' }) as never);
    const data = await res.json();

    expect(data.response).toBe('Hello from Ollama');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/generate'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('uses default model gemma2:9b when not specified', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'ok' }),
    });

    await POST(makeRequest({ prompt: 'test' }) as never);

    const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(fetchBody.model).toBe('gemma2:9b');
    expect(fetchBody.stream).toBe(false);
  });

  it('returns error when Ollama API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
    });

    const res = await POST(makeRequest({ prompt: 'test' }) as never);
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toContain('Ollama API error');
  });

  it('returns 500 when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

    const res = await POST(makeRequest({ prompt: 'test' }) as never);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain('Failed to connect to Ollama');
  });
});

describe('GET /api/ollama', () => {
  it('returns connected=true and model list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: [{ name: 'gemma2:9b' }, { name: 'llama3:8b' }] }),
    });

    const res = await GET();
    const data = await res.json();

    expect(data.connected).toBe(true);
    expect(data.models).toEqual(['gemma2:9b', 'llama3:8b']);
  });

  it('returns connected=false when Ollama is down', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const res = await GET();
    const data = await res.json();

    expect(data.connected).toBe(false);
    expect(data.models).toEqual([]);
  });

  it('returns connected=false when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const res = await GET();
    const data = await res.json();

    expect(data.connected).toBe(false);
    expect(data.models).toEqual([]);
  });
});
