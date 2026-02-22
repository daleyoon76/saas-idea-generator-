import { NextRequest, NextResponse } from 'next/server';
import { SearchResult } from '@/lib/prompts';

const SUBREDDITS = ['entrepreneur', 'SaaS', 'startups', 'smallbusiness'];

interface PullPushPost {
  title: string;
  permalink: string;
  selftext?: string;
  score?: number;
}

/** 한국어 포함 여부 판별 (AC00–D7A3: 완성형 한글) */
function isKorean(text: string): boolean {
  return /[\uAC00-\uD7A3]/.test(text);
}

/** MyMemory 무료 번역 API로 한→영 번역 (실패 시 원문 반환) */
async function translateToEnglish(text: string): Promise<string> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ko|en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return text;
    const data = await res.json();
    const translated: string = data?.responseData?.translatedText;
    return translated && translated.length > 0 ? translated : text;
  } catch {
    return text;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawKeyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';

    if (!rawKeyword) {
      return NextResponse.json({ results: [] });
    }

    // 한국어 키워드는 영어로 번역해서 Reddit 검색에 사용
    const keyword = isKorean(rawKeyword)
      ? await translateToEnglish(rawKeyword)
      : rawKeyword;

    if (keyword !== rawKeyword) {
      console.log(`[reddit] 키워드 번역: "${rawKeyword}" → "${keyword}"`);
    }

    // 1년 전 Unix 타임스탬프 계산
    const oneYearAgoTs = Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000).toString();

    // 4개 서브레딧 병렬 호출
    const perSubredditResults = await Promise.all(
      SUBREDDITS.map(async (subreddit) => {
        try {
          const params = new URLSearchParams({
            q: keyword,
            subreddit,
            size: '3',
            after: oneYearAgoTs,
          });
          const res = await fetch(
            `https://api.pullpush.io/reddit/search/submission/?${params.toString()}`,
            { signal: AbortSignal.timeout(8000) }
          );
          if (!res.ok) return [];
          const data = await res.json();
          const posts: PullPushPost[] = Array.isArray(data.data) ? data.data : [];
          return posts.map((post) => ({
            title: post.title,
            url: `https://reddit.com${post.permalink}`,
            snippet: post.selftext
              ? post.selftext.slice(0, 200)
              : post.title,
          }));
        } catch {
          return [];
        }
      })
    );

    // URL 중복 제거
    const seen = new Set<string>();
    const results: SearchResult[] = perSubredditResults.flat().filter((r) => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Reddit API error:', error);
    return NextResponse.json({ results: [] });
  }
}
