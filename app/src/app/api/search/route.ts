import { NextRequest, NextResponse } from 'next/server';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

// --- Tavily 검색 결과 캐싱 (서버 프로세스 수명 동안 유지) ---

interface CacheEntry {
  results: SearchResult[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간
const CACHE_MAX_SIZE = 500;
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1시간

function getCacheKey(query: string, count: number, depth: string): string {
  return `${query.toLowerCase().trim()}|${count}|${depth}`;
}

function cleanupCache() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of cache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}

function evictOldest() {
  if (cache.size < CACHE_MAX_SIZE) return;
  // 가장 오래된 엔트리 삭제
  let oldestKey: string | null = null;
  let oldestTime = Infinity;
  for (const [key, entry] of cache) {
    if (entry.timestamp < oldestTime) {
      oldestTime = entry.timestamp;
      oldestKey = key;
    }
  }
  if (oldestKey) cache.delete(oldestKey);
}

export async function POST(request: NextRequest) {
  try {
    const { query, count = 5, depth = 'basic' } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error('TAVILY_API_KEY가 설정되지 않았습니다. .env.local 파일에 추가해주세요.');
    }

    // 캐시 조회
    cleanupCache();
    const cacheKey = getCacheKey(query, count, depth);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`[search-cache] HIT: "${query}" (${cached.results.length}건)`);
      return NextResponse.json({ results: cached.results, cached: true });
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: count,
        search_depth: depth === 'advanced' ? 'advanced' : 'basic',
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Tavily 오류: ${err.message || response.statusText}`);
    }

    const data = await response.json();
    const results: SearchResult[] = (data.results || []).map((r: { title: string; url: string; content: string }) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
    }));

    // 성공 응답만 캐싱
    evictOldest();
    cache.set(cacheKey, { results, timestamp: Date.now() });
    console.log(`[search-cache] MISS: "${query}" → ${results.length}건 캐싱 (총 ${cache.size}건)`);

    return NextResponse.json({ results, cached: false });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to perform search', results: [] },
      { status: 500 }
    );
  }
}
