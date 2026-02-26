import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const { POST } = await import('../reddit/route');

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:4000/api/reddit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('POST /api/reddit', () => {
  it('returns empty results when keyword is empty', async () => {
    const res = await POST(makeRequest({ keyword: '' }) as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results).toEqual([]);
  });

  it('returns empty results when keyword is missing', async () => {
    const res = await POST(makeRequest({}) as never);
    const data = await res.json();
    expect(data.results).toEqual([]);
  });

  it('searches 4 subreddits with English keyword', async () => {
    // Mock 4 subreddit responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { title: 'Test Post', permalink: '/r/test/comments/123', selftext: 'Some pain point here' },
        ],
      }),
    });

    const res = await POST(makeRequest({ keyword: 'AI agent' }) as never);
    const data = await res.json();

    // Should have called fetch 4 times (one per subreddit)
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results[0].url).toContain('reddit.com');
  });

  it('translates Korean keyword before searching', async () => {
    // First call: translation API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ responseData: { translatedText: 'artificial intelligence' } }),
    });
    // Next 4 calls: Reddit subreddit searches
    for (let i = 0; i < 4; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });
    }

    const res = await POST(makeRequest({ keyword: '인공지능' }) as never);
    const data = await res.json();

    // First call should be translation
    expect(mockFetch.mock.calls[0][0]).toContain('mymemory.translated.net');
    expect(data.results).toEqual([]);
  });

  it('deduplicates results by URL', async () => {
    const samePost = { title: 'Dup', permalink: '/r/test/same', selftext: 'text' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [samePost] }),
    });

    const res = await POST(makeRequest({ keyword: 'test' }) as never);
    const data = await res.json();

    // 4 subreddits return same post, should be deduplicated to 1
    expect(data.results).toHaveLength(1);
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('network'));

    const res = await POST(makeRequest({ keyword: 'test' }) as never);
    const data = await res.json();
    expect(data.results).toEqual([]);
  });
});
