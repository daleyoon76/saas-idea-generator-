import { NextRequest, NextResponse } from 'next/server';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function POST(request: NextRequest) {
  try {
    const { query, count = 5 } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Use DuckDuckGo HTML search
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const html = await response.text();
    const results = parseSearchResults(html, count);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to perform search', results: [] },
      { status: 500 }
    );
  }
}

function parseSearchResults(html: string, count: number): SearchResult[] {
  const results: SearchResult[] = [];

  // Extract result blocks - DuckDuckGo HTML uses specific class names
  // Pattern: <a class="result__a" href="...">title</a> and <a class="result__snippet">snippet</a>

  // Extract links with titles
  const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/gi;

  const links: { url: string; title: string }[] = [];
  let linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const url = decodeURIComponent(linkMatch[1].replace(/\/l\/\?uddg=/, '').split('&')[0]);
    const title = linkMatch[2].replace(/<[^>]*>/g, '').trim();
    if (url.startsWith('http') && title) {
      links.push({ url, title });
    }
  }

  const snippets: string[] = [];
  let snippetMatch;
  while ((snippetMatch = snippetRegex.exec(html)) !== null) {
    const snippet = snippetMatch[1].replace(/<[^>]*>/g, '').trim();
    snippets.push(snippet);
  }

  // Combine links with snippets
  for (let i = 0; i < Math.min(links.length, count); i++) {
    results.push({
      title: links[i].title,
      url: links[i].url,
      snippet: snippets[i] || '',
    });
  }

  return results;
}
