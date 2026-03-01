/**
 * Dead Link 체크 API
 *
 * POST { urls: string[] } → { results: { url, alive, httpStatus }[] }
 *
 * - 최대 20개 URL 배치 처리
 * - HEAD 요청 → 405 시 GET 폴백
 * - 5초 타임아웃
 * - 1시간 메모리 캐시
 */

import { NextRequest, NextResponse } from 'next/server';

// ── 캐시 ────────────────────────────────────────────────────────────────

interface CacheEntry {
  alive: boolean;
  httpStatus: number;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1시간
const CACHE_MAX = 500;

function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > CACHE_TTL_MS) cache.delete(key);
  }
}

// ── URL 체크 ────────────────────────────────────────────────────────────

interface CheckResult {
  url: string;
  alive: boolean;
  httpStatus: number;
}

const USER_AGENT =
  'Mozilla/5.0 (compatible; SaaSIdeaBot/1.0; +https://saas-idea-generator.dev)';

async function checkUrl(url: string): Promise<CheckResult> {
  // 캐시 확인
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { url, alive: cached.alive, httpStatus: cached.httpStatus };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    // HEAD 먼저 시도
    let res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });

    // 405 Method Not Allowed → GET 폴백
    if (res.status === 405) {
      res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT },
        redirect: 'follow',
      });
    }

    const alive = res.status >= 200 && res.status < 400;
    const result: CheckResult = { url, alive, httpStatus: res.status };

    // 캐시 저장
    if (cache.size >= CACHE_MAX) cleanupCache();
    cache.set(url, { alive, httpStatus: res.status, timestamp: Date.now() });

    return result;
  } catch {
    const result: CheckResult = { url, alive: false, httpStatus: 0 };
    cache.set(url, { alive: false, httpStatus: 0, timestamp: Date.now() });
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

// ── 라우트 핸들러 ───────────────────────────────────────────────────────

const MAX_BATCH = 20;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const urls: unknown = body?.urls;

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'urls 배열이 필요합니다.' },
        { status: 400 },
      );
    }

    // URL 유효성 필터 + 최대 개수 제한
    const validUrls = urls
      .filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u))
      .slice(0, MAX_BATCH);

    const results = await Promise.all(validUrls.map(checkUrl));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[check-links] error:', error);
    return NextResponse.json(
      { error: '링크 체크 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
