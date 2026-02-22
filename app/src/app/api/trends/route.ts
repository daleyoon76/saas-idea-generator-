import { NextRequest, NextResponse } from 'next/server';
import { SearchResult } from '@/lib/prompts';

interface RisingQuery {
  query: string;
  value: string | number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const keyword = typeof body.keyword === 'string' && body.keyword.trim()
      ? body.keyword.trim()
      : 'SaaS';

    // CJS 모듈 동적 임포트 (Next.js ESM 환경 호환)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const googleTrends = require('google-trends-api');

    // 최근 90일 기준 관련 급등 쿼리 조회
    const raw: string = await googleTrends.relatedQueries({
      keyword,
      startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      hl: 'en',
      geo: '',  // 전 세계
    });

    const data = JSON.parse(raw);
    // rankedList[0]: topQueries (절대량 기준), rankedList[1]: risingQueries (성장률 기준)
    const risingQueries: RisingQuery[] = data?.default?.rankedList?.[1]?.rankedKeyword ?? [];

    // 노이즈 필터: 비영어 문자 포함 쿼리, "what is / что такое" 등 기초 정의 쿼리 제거
    const NOISE_PATTERNS = [
      /[^\u0000-\u007F\uAC00-\uD7A3]/, // 영어·한글 외 문자 (중국어·러시아어 등)
      /^what is\b/i,
      /\bist\b.*\bwas\b/i,    // 독일어 패턴
      /это$/i,                  // 러시아어 패턴
      /^\w+\s+\w{1,2}\s+\w+$/, // 3단어 중 가운데가 1-2글자 (번역어 패턴)
    ];

    const filtered = risingQueries.filter((item) =>
      !NOISE_PATTERNS.some((re) => re.test(item.query))
    );

    const results: SearchResult[] = filtered
      .slice(0, 8)
      .map((item) => ({
        title: `급등 트렌드: ${item.query}`,
        url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(item.query)}`,
        snippet: item.value === 'Breakout'
          ? 'Google Trends Breakout — 5000%↑ 급등 중 (아직 주류 아님)'
          : `Google Trends 성장률 +${item.value}% (최근 90일)`,
      }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[trends] Google Trends API error:', error);
    return NextResponse.json({ results: [] });
  }
}
