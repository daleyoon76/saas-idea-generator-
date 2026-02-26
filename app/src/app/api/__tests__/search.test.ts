import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const { POST } = await import('../search/route');

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:4000/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubEnv('TAVILY_API_KEY', 'test-tavily-key');
});

describe('POST /api/search', () => {
  it('returns 400 when query is missing', async () => {
    const res = await POST(makeRequest({}) as never);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Query is required');
  });

  it('returns search results on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { title: '기사', url: 'https://example.com', content: '내용' },
        ],
      }),
    });

    const res = await POST(makeRequest({ query: 'AI SaaS' }) as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results).toHaveLength(1);
    expect(data.results[0]).toEqual({
      title: '기사',
      url: 'https://example.com',
      snippet: '내용',
    });
  });

  it('sends correct params to Tavily API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await POST(makeRequest({ query: 'test', count: 3, depth: 'advanced' }) as never);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.query).toBe('test');
    expect(body.max_results).toBe(3);
    expect(body.search_depth).toBe('advanced');
    expect(body.api_key).toBe('test-tavily-key');
  });

  it('returns 500 on Tavily API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Invalid API key' }),
      statusText: 'Unauthorized',
    });

    const res = await POST(makeRequest({ query: 'test' }) as never);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.results).toEqual([]);
  });

  it('returns 500 when TAVILY_API_KEY is missing', async () => {
    vi.stubEnv('TAVILY_API_KEY', '');

    const res = await POST(makeRequest({ query: 'test' }) as never);
    expect(res.status).toBe(500);
  });
});
