import { NextRequest, NextResponse } from 'next/server';
import { SearchResult } from '@/lib/prompts';

const PH_GRAPHQL_URL = 'https://api.producthunt.com/v2/api/graphql';

// 최근 N일 트렌딩 제품 조회 (votesCount 순)
const QUERY = `
  query GetTrendingPosts($after: DateTime!, $first: Int!) {
    posts(order: VOTES, postedAfter: $after, first: $first) {
      edges {
        node {
          name
          tagline
          url
          votesCount
          topics {
            edges {
              node { name }
            }
          }
        }
      }
    }
  }
`;

interface PHPost {
  name: string;
  tagline: string;
  url: string;
  votesCount: number;
  topics: { edges: { node: { name: string } }[] };
}

/** 한국어 포함 여부 판별 */
function isKorean(text: string): boolean {
  return /[\uAC00-\uD7A3]/.test(text);
}

/** MyMemory 무료 번역 API로 한→영 번역 */
async function translateToEnglish(text: string): Promise<string> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ko|en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return text;
    const data = await res.json();
    const translated: string = data?.responseData?.translatedText;
    return translated?.length > 0 ? translated : text;
  } catch {
    return text;
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.PRODUCT_HUNT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ results: [] });
  }

  try {
    const body = await request.json();
    const rawKeyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';

    // 한국어 키워드는 영어로 번역
    const keyword = rawKeyword && isKorean(rawKeyword)
      ? await translateToEnglish(rawKeyword)
      : rawKeyword;

    if (keyword !== rawKeyword && rawKeyword) {
      console.log(`[producthunt] 키워드 번역: "${rawKeyword}" → "${keyword}"`);
    }

    // 최근 30일 트렌딩 제품 50개 조회
    const after = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const res = await fetch(PH_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({ query: QUERY, variables: { after, first: 50 } }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`[producthunt] API 오류: ${res.status}`);
      return NextResponse.json({ results: [] });
    }

    const data = await res.json();
    const posts: PHPost[] = (data?.data?.posts?.edges ?? []).map(
      (e: { node: PHPost }) => e.node
    );

    // 키워드가 있으면 name·tagline·topics에서 관련 제품 필터링
    const kw = keyword.toLowerCase();
    const relevant = kw
      ? posts.filter(
          (p) =>
            p.name.toLowerCase().includes(kw) ||
            p.tagline.toLowerCase().includes(kw) ||
            p.topics.edges.some((t) => t.node.name.toLowerCase().includes(kw))
        )
      : [];

    // 관련 제품이 없으면 상위 득표 제품으로 폴백
    const selected = (relevant.length > 0 ? relevant : posts).slice(0, 6);

    const results: SearchResult[] = selected.map((p) => ({
      title: `Product Hunt 트렌딩: ${p.name}`,
      url: p.url,
      snippet: `"${p.tagline}" — 👍 ${p.votesCount}표 (최근 30일 트렌딩)`,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[producthunt] 오류:', error);
    return NextResponse.json({ results: [] });
  }
}
