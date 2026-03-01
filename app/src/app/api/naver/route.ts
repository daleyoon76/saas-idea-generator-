import { NextRequest, NextResponse } from 'next/server';
import { SearchResult } from '@/lib/prompts';

interface NaverItem {
  title: string;
  link: string;
  description: string;
  bloggername?: string;
  originallink?: string;
  pubDate?: string;
}

interface NaverResponse {
  items: NaverItem[];
  total: number;
  start: number;
  display: number;
}

/** Naver 검색 결과에 포함된 HTML 태그 및 엔티티 제거 */
function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ results: [] });
    }

    const body = await request.json();
    const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';

    if (!keyword) {
      return NextResponse.json({ results: [] });
    }

    const headers = {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    };

    // 블로그 + 뉴스 병렬 호출
    const [blogRes, newsRes] = await Promise.all([
      fetch(
        `https://openapi.naver.com/v1/search/blog.json?${new URLSearchParams({
          query: keyword,
          display: '5',
          sort: 'sim',
        })}`,
        { headers, signal: AbortSignal.timeout(8000) },
      ).catch(() => null),
      fetch(
        `https://openapi.naver.com/v1/search/news.json?${new URLSearchParams({
          query: keyword,
          display: '5',
          sort: 'date',
        })}`,
        { headers, signal: AbortSignal.timeout(8000) },
      ).catch(() => null),
    ]);

    const blogItems: NaverItem[] = [];
    const newsItems: NaverItem[] = [];

    if (blogRes && blogRes.ok) {
      const data: NaverResponse = await blogRes.json();
      blogItems.push(...(data.items || []));
    }

    if (newsRes && newsRes.ok) {
      const data: NaverResponse = await newsRes.json();
      newsItems.push(...(data.items || []));
    }

    // URL 중복 제거 + SearchResult 변환
    const seen = new Set<string>();
    const results: SearchResult[] = [];

    for (const item of blogItems) {
      const url = item.link;
      if (seen.has(url)) continue;
      seen.add(url);
      results.push({
        title: `네이버 블로그: ${stripHtml(item.title)}`,
        url,
        snippet: stripHtml(item.description),
      });
    }

    for (const item of newsItems) {
      const url = item.originallink || item.link;
      if (seen.has(url)) continue;
      seen.add(url);
      results.push({
        title: `네이버 뉴스: ${stripHtml(item.title)}`,
        url,
        snippet: stripHtml(item.description),
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Naver Search API error:', error);
    return NextResponse.json({ results: [] });
  }
}
