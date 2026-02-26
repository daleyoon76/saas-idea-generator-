import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const { POST } = await import('../producthunt/route');

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:4000/api/producthunt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubEnv('PRODUCT_HUNT_API_KEY', 'test-ph-key');
});

describe('POST /api/producthunt', () => {
  it('returns empty results when API key is missing', async () => {
    vi.stubEnv('PRODUCT_HUNT_API_KEY', '');
    const res = await POST(makeRequest({ keyword: 'AI' }) as never);
    const data = await res.json();
    expect(data.results).toEqual([]);
  });

  it('returns trending products', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          posts: {
            edges: [
              {
                node: {
                  name: 'CoolSaaS',
                  tagline: 'Best tool ever',
                  url: 'https://producthunt.com/p/coolsaas',
                  votesCount: 500,
                  topics: { edges: [{ node: { name: 'SaaS' } }] },
                },
              },
            ],
          },
        },
      }),
    });

    const res = await POST(makeRequest({ keyword: '' }) as never);
    const data = await res.json();

    expect(data.results.length).toBe(1);
    expect(data.results[0].title).toContain('CoolSaaS');
    expect(data.results[0].snippet).toContain('500표');
  });

  it('filters products by keyword', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          posts: {
            edges: [
              { node: { name: 'AI Tool', tagline: 'Smart AI', url: 'https://ph.com/ai', votesCount: 100, topics: { edges: [] } } },
              { node: { name: 'Recipe App', tagline: 'Cook better', url: 'https://ph.com/recipe', votesCount: 200, topics: { edges: [] } } },
            ],
          },
        },
      }),
    });

    const res = await POST(makeRequest({ keyword: 'AI' }) as never);
    const data = await res.json();

    expect(data.results).toHaveLength(1);
    expect(data.results[0].title).toContain('AI Tool');
  });

  it('translates Korean keyword', async () => {
    // Translation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ responseData: { translatedText: 'artificial intelligence' } }),
    });
    // GraphQL response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { posts: { edges: [] } } }),
    });

    await POST(makeRequest({ keyword: '인공지능' }) as never);

    expect(mockFetch.mock.calls[0][0]).toContain('mymemory');
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const res = await POST(makeRequest({ keyword: 'test' }) as never);
    const data = await res.json();
    expect(data.results).toEqual([]);
  });
});
