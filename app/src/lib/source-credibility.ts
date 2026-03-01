/**
 * 출처 신뢰도 분류 엔진 + URL 추출 유틸리티
 *
 * 도메인 패턴 매칭으로 URL을 5단계 신뢰도로 분류하고,
 * 마크다운에서 URL을 추출하는 유틸을 제공한다.
 */

// ── 타입 ────────────────────────────────────────────────────────────────

export type CredibilityTier = 1 | 2 | 3 | 4 | 5;

export interface CredibilityInfo {
  tier: CredibilityTier;
  label: string;       // 예: "정부·공공기관"
  labelShort: string;  // 예: "정부"
  color: string;       // dot 색상
  bgColor: string;     // 뱃지 배경
}

// ── 색상 (CANYON 팔레트 기반) ─────────────────────────────────────────

const TIER_STYLES: Record<CredibilityTier, Pick<CredibilityInfo, 'color' | 'bgColor'>> = {
  1: { color: '#3D8B37', bgColor: '#E8F5E9' }, // 초록 — 정부
  2: { color: '#2563EB', bgColor: '#EBF2FF' }, // 파랑 — 학술
  3: { color: '#C24B25', bgColor: '#FEF3EB' }, // 테라코타 — 언론
  4: { color: '#F5901E', bgColor: '#FFF8E1' }, // 앰버 — 전문
  5: { color: '#B08060', bgColor: '#FAF0E6' }, // 연갈색 — 일반
};

const TIER_LABELS: Record<CredibilityTier, { label: string; labelShort: string }> = {
  1: { label: '정부·공공기관', labelShort: '정부' },
  2: { label: '학술·연구기관', labelShort: '학술' },
  3: { label: '주요 언론사', labelShort: '언론' },
  4: { label: '전문 미디어·리서치', labelShort: '전문' },
  5: { label: '일반 웹사이트', labelShort: '일반' },
};

// ── 도메인 패턴 ─────────────────────────────────────────────────────────

/** 도메인이 suffix 목록에 매칭되는지 (`.go.kr` 같은 TLD 패턴도 지원) */
function matchesDomain(hostname: string, patterns: string[]): boolean {
  return patterns.some(p =>
    hostname === p || hostname.endsWith('.' + p) || hostname.endsWith(p)
  );
}

// Tier 1: 정부·공공기관
const GOV_PATTERNS = [
  '.go.kr', '.gov', '.gov.kr', '.mil',
  'kosis.kr', 'kostat.go.kr', 'data.go.kr',
  'worldbank.org', 'imf.org', 'oecd.org', 'un.org',
  'who.int', 'wto.org', 'wipo.int',
  'ec.europa.eu', 'europa.eu',
  'nist.gov', 'nih.gov', 'cdc.gov',
  'kdi.re.kr', 'bok.or.kr', 'fss.or.kr',
];

// Tier 2: 학술·연구기관
const ACADEMIC_PATTERNS = [
  '.ac.kr', '.edu', '.ac.jp', '.ac.uk',
  'arxiv.org', 'scholar.google.com', 'pubmed.ncbi.nlm.nih.gov',
  'doi.org', 'jstor.org', 'springer.com', 'nature.com',
  'sciencedirect.com', 'ieee.org', 'acm.org',
  'researchgate.net', 'semanticscholar.org',
  'dbpia.co.kr', 'riss.kr', 'kiss.kstudy.com',
];

// Tier 3: 주요 언론사
const NEWS_PATTERNS = [
  // 한국 주요 언론
  'chosun.com', 'donga.com', 'joongang.co.kr', 'hani.co.kr',
  'khan.co.kr', 'mk.co.kr', 'hankyung.com', 'sedaily.com',
  'etnews.com', 'zdnet.co.kr', 'mt.co.kr',
  'yonhapnews.co.kr', 'yna.co.kr', 'kbs.co.kr', 'sbs.co.kr',
  'mbc.co.kr', 'news.naver.com', 'news.daum.net',
  // 글로벌 주요 언론
  'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk',
  'nytimes.com', 'wsj.com', 'ft.com', 'economist.com',
  'bloomberg.com', 'cnbc.com', 'cnn.com', 'theguardian.com',
  'washingtonpost.com', 'forbes.com',
];

// Tier 4: 전문 미디어·리서치·컨설팅
const PROFESSIONAL_PATTERNS = [
  // 테크 미디어
  'techcrunch.com', 'theverge.com', 'wired.com', 'arstechnica.com',
  'venturebeat.com', 'zdnet.com', 'cnet.com', 'engadget.com',
  'thenextweb.com', 'producthunt.com', 'ycombinator.com',
  'news.hada.io', 'byline.network',
  // 리서치·컨설팅
  'statista.com', 'gartner.com', 'mckinsey.com', 'bcg.com',
  'bain.com', 'deloitte.com', 'pwc.com', 'ey.com', 'kpmg.com',
  'accenture.com', 'idc.com', 'forrester.com',
  'grandviewresearch.com', 'marketsandmarkets.com',
  'cb-insights.com', 'crunchbase.com', 'pitchbook.com',
  // 개발자·플랫폼
  'github.com', 'stackoverflow.com', 'developer.mozilla.org',
  'docs.google.com', 'cloud.google.com', 'aws.amazon.com',
  'azure.microsoft.com',
];

// Tier 5: 일반 (명시적 – 나머지는 기본값)
const GENERAL_PATTERNS = [
  'reddit.com', 'medium.com', 'tistory.com', 'naver.com',
  'brunch.co.kr', 'velog.io', 'blog.naver.com',
  'quora.com', 'wikipedia.org', 'namu.wiki',
  'youtube.com', 'twitter.com', 'x.com', 'facebook.com',
  'linkedin.com', 'instagram.com',
];

// ── 분류 함수 ───────────────────────────────────────────────────────────

export function classifyUrl(url: string): CredibilityInfo {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return { tier: 5, ...TIER_LABELS[5], ...TIER_STYLES[5] };
  }

  // 순서대로 매칭 (높은 신뢰도 먼저)
  if (matchesDomain(hostname, GOV_PATTERNS))
    return { tier: 1, ...TIER_LABELS[1], ...TIER_STYLES[1] };
  if (matchesDomain(hostname, ACADEMIC_PATTERNS))
    return { tier: 2, ...TIER_LABELS[2], ...TIER_STYLES[2] };
  if (matchesDomain(hostname, NEWS_PATTERNS))
    return { tier: 3, ...TIER_LABELS[3], ...TIER_STYLES[3] };
  if (matchesDomain(hostname, PROFESSIONAL_PATTERNS))
    return { tier: 4, ...TIER_LABELS[4], ...TIER_STYLES[4] };
  if (matchesDomain(hostname, GENERAL_PATTERNS))
    return { tier: 5, ...TIER_LABELS[5], ...TIER_STYLES[5] };

  // 기본: 일반
  return { tier: 5, ...TIER_LABELS[5], ...TIER_STYLES[5] };
}

// ── URL 추출 ────────────────────────────────────────────────────────────

/**
 * 마크다운 텍스트에서 HTTP(S) URL을 추출한다.
 * - `[text](url)` 형태의 마크다운 링크
 * - bare URL (http:// 또는 https://)
 * - `URL: https://...` 패턴
 */
export function extractUrlsFromMarkdown(md: string): string[] {
  const urls = new Set<string>();

  // 1) 마크다운 링크: [text](url)
  const mdLinkRe = /\[(?:[^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = mdLinkRe.exec(md))) urls.add(m[1]);

  // 2) bare URL — 마크다운 링크 구문을 제거한 뒤 남은 URL만 추출
  const stripped = md.replace(/\[(?:[^\]]*)\]\(https?:\/\/[^)\s]+\)/g, '');
  const bareRe = /https?:\/\/[^\s)<>"]+/g;
  while ((m = bareRe.exec(stripped))) urls.add(m[0].replace(/[.,;:!?)]+$/, ''));

  return Array.from(urls);
}

// ── 요약 통계 ───────────────────────────────────────────────────────────

export interface CredibilitySummary {
  total: number;
  byTier: Record<CredibilityTier, number>;
  alive: number;
  dead: number;
  unknown: number;
  checking: number;
}

export type LinkStatus = 'checking' | 'alive' | 'dead' | 'unknown';

export function buildSummary(
  urls: string[],
  statusMap: Map<string, LinkStatus>,
): CredibilitySummary {
  const summary: CredibilitySummary = {
    total: urls.length,
    byTier: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    alive: 0,
    dead: 0,
    unknown: 0,
    checking: 0,
  };

  for (const url of urls) {
    const { tier } = classifyUrl(url);
    summary.byTier[tier]++;

    const status = statusMap.get(url) ?? 'checking';
    summary[status]++;
  }

  return summary;
}
