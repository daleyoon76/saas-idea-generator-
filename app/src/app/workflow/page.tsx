'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// 단계별 기본 예상 소요 시간 (ms) — localStorage에 실측값이 쌓이면 자동으로 갱신됨
const DEFAULT_STEP_MS = {
  ideaSearch: 7000,   // Tavily 병렬 2회
  ideaLLM: 20000,     // Claude Sonnet 아이디어 생성
  planSearch: 9000,   // Tavily 병렬 3회
  planLLM: 75000,     // Claude Sonnet 사업기획서
};
const TIMING_KEY = 'saas-generator-step-timings';

function getStoredTimings(): typeof DEFAULT_STEP_MS {
  if (typeof window === 'undefined') return { ...DEFAULT_STEP_MS };
  try {
    const raw = localStorage.getItem(TIMING_KEY);
    if (raw) return { ...DEFAULT_STEP_MS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_STEP_MS };
}

function updateStoredTiming(key: keyof typeof DEFAULT_STEP_MS, durationMs: number) {
  try {
    const current = getStoredTimings();
    // 가중 이동평균: 과거 70% + 실측 30%
    current[key] = Math.round(current[key] * 0.7 + durationMs * 0.3);
    localStorage.setItem(TIMING_KEY, JSON.stringify(current));
  } catch {}
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}분 ${s.toString().padStart(2, '0')}초` : `${s}초`;
}
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, ImageRun, AlignmentType } from 'docx';
import { Idea, BusinessPlan, PRD, WorkflowStep, AIProvider, PROVIDER_CONFIGS, QualityPreset, MODULE_PRESETS, PRESET_INFO, GuidedResult, GUIDED_RESULT_KEY } from '@/lib/types';
import { SearchResult } from '@/lib/prompts';
import { CANYON, CANYON_DOCX } from '@/lib/colors';
import { parseChartJson } from '@/lib/chart-schema';
import ChartRenderer from '@/components/ChartRenderer';

/** Normalize common LLM Mermaid syntax variants so the parser can handle them. */
function sanitizeMermaidSyntax(src: string): string {
  let result = src
    // BOM 제거
    .replace(/^\uFEFF/, '')
    // box-drawing lines (─ ━ ═) + em/en dashes → standard --
    .replace(/[─━═\u2500\u2501\u2550—–\u2014\u2013]{1,4}>/g, '-->')
    // Unicode arrows → -->
    .replace(/[→⟶⟹➜➝➞⟵⟷]/g, '-->')
    // fullwidth >
    .replace(/＞/g, '>')
    // curly/smart quotes → straight quotes
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    // diagram type 선언 뒤 불필요한 세미콜론 제거 (flowchart TD; → flowchart TD)
    .replace(/^(\s*(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt)\b[^;\n]*);/gm, '$1')
    // trailing 빈 줄 정리
    .replace(/\n{3,}/g, '\n\n');

  // 리터럴 \n → <br/> (Mermaid 줄바꿈). 실제 개행(\n 문자)과 구별됨.
  result = result.replace(/\\n/g, '<br/>');

  // 긴 노드 라벨에 자동 줄바꿈 삽입 (각 줄이 13자 초과 시, 재귀)
  const MAX_LINE = 13;
  function breakLongSegment(seg: string): string {
    seg = seg.trim();
    if (seg.length <= MAX_LINE) return seg;
    const mid = Math.floor(seg.length / 2);
    let breakIdx = -1;
    for (let d = 0; d <= mid; d++) {
      if (mid + d < seg.length && /[\s,·:;→+]/.test(seg[mid + d])) { breakIdx = mid + d; break; }
      if (mid - d >= 0 && /[\s,·:;→+]/.test(seg[mid - d])) { breakIdx = mid - d; break; }
    }
    if (breakIdx <= 0) return seg;
    const left = seg.slice(0, breakIdx + 1).trimEnd();
    const right = breakLongSegment(seg.slice(breakIdx + 1));
    return left + '<br/>' + right;
  }
  result = result.replace(/(["[\]({])([^"|\]\)}\n]{10,}?)(["|\]\)}])/g, (_, open, body, close) => {
    const segments = body.split('<br/>');
    const broken = segments.map((s: string) => breakLongSegment(s.trim()));
    return `${open}${broken.join('<br/>')}${close}`;
  });

  return result;
}

/** SVG 문자열 → PNG (Uint8Array) 변환. docx 임베딩용 공용 함수. */
async function svgToPng(svgString: string): Promise<{ data: Uint8Array; width: number; height: number } | null> {
  try {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgEl = svgDoc.querySelector('svg');
    if (!svgEl) return null;

    let w = parseFloat(svgEl.getAttribute('width') || '0');
    let h = parseFloat(svgEl.getAttribute('height') || '0');
    const vb = svgEl.getAttribute('viewBox');
    if ((!w || !h) && vb) {
      const parts = vb.split(/[\s,]+/);
      if (parts.length === 4) { w = parseFloat(parts[2]) || 600; h = parseFloat(parts[3]) || 400; }
    }
    if (!w) w = 600;
    if (!h) h = 400;
    svgEl.setAttribute('width', String(w));
    svgEl.setAttribute('height', String(h));
    const fixedSvg = new XMLSerializer().serializeToString(svgEl);

    const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(fixedSvg)))}`;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = w * scale;
        canvas.height = h * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) { resolve(null); return; }
          pngBlob.arrayBuffer().then(buf => resolve({ data: new Uint8Array(buf), width: w, height: h }));
        }, 'image/png');
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  } catch {
    return null;
  }
}

/** Render a mermaid chart to PNG for docx embedding. Returns null on failure. */
async function renderMermaidToPng(chart: string): Promise<{ data: Uint8Array; width: number; height: number } | null> {
  try {
    const sanitized = sanitizeMermaidSyntax(chart);
    const m = await import('mermaid');
    m.default.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'base',
      themeVariables: {
        primaryColor: '#F5EDE6', primaryBorderColor: '#D4A574',
        lineColor: '#8B3520', textColor: '#3D1E10',
    }});
    const id = `mermaid-docx-${Math.random().toString(36).slice(2, 9)}`;
    const offscreen = document.createElement('div');
    offscreen.style.position = 'absolute';
    offscreen.style.left = '-99999px';
    document.body.appendChild(offscreen);
    let svg: string;
    try {
      ({ svg } = await m.default.render(id, sanitized, offscreen));
    } finally {
      offscreen.remove();
    }
    return svgToPng(svg);
  } catch {
    return null;
  }
}

/** docx 전용 정적 SVG 생성 (Recharts 없이 순수 문자열 조립) */
function renderChartSvg(chart: import('@/lib/chart-schema').ChartData): string {
  const W = 600, H = 400;
  const PAD = { top: 50, right: 30, bottom: 60, left: 70 };
  const colors = [CANYON.accent, CANYON.amber, CANYON.textMid, CANYON.amberLight, CANYON.deepRed, CANYON.success];
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  let body = '';
  const title = chart.title ? `<text x="${W / 2}" y="30" text-anchor="middle" font-size="14" font-weight="bold" fill="${CANYON.textDark}">${esc(chart.title)}</text>` : '';

  if (chart.type === 'bar' || chart.type === 'line') {
    const skip = new Set(['name', 'value', 'x', 'y']);
    const seriesKeys: string[] = [];
    for (const d of chart.data) {
      for (const k of Object.keys(d)) {
        if (!skip.has(k) && typeof d[k] === 'number' && !seriesKeys.includes(k)) seriesKeys.push(k);
      }
    }
    if (seriesKeys.length === 0 && chart.data.some(d => d.value !== undefined)) seriesKeys.push('value');

    let maxVal = 0;
    for (const d of chart.data) for (const k of seriesKeys) { const v = Number(d[k] ?? 0); if (v > maxVal) maxVal = v; }
    if (maxVal === 0) maxVal = 1;
    const niceMax = Math.ceil(maxVal / Math.pow(10, Math.floor(Math.log10(maxVal)))) * Math.pow(10, Math.floor(Math.log10(maxVal)));

    // y-axis grid + labels
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const y = PAD.top + plotH - (i / ticks) * plotH;
      const val = Math.round((i / ticks) * niceMax);
      body += `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + plotW}" y2="${y}" stroke="${CANYON.border}" stroke-dasharray="3 3"/>`;
      body += `<text x="${PAD.left - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="${CANYON.textMid}">${val}</text>`;
    }

    const n = chart.data.length;
    const groupW = plotW / n;

    if (chart.type === 'bar') {
      const barW = Math.max(8, (groupW * 0.7) / seriesKeys.length);
      chart.data.forEach((d, i) => {
        const cx = PAD.left + i * groupW + groupW / 2;
        seriesKeys.forEach((k, si) => {
          const v = Number(d[k] ?? 0);
          const barH = (v / niceMax) * plotH;
          const bx = cx - (seriesKeys.length * barW) / 2 + si * barW;
          body += `<rect x="${bx}" y="${PAD.top + plotH - barH}" width="${barW}" height="${barH}" fill="${colors[si % colors.length]}" rx="2"/>`;
        });
        body += `<text x="${cx}" y="${PAD.top + plotH + 16}" text-anchor="middle" font-size="10" fill="${CANYON.textMid}">${esc(d.name)}</text>`;
      });
    } else {
      // line
      seriesKeys.forEach((k, si) => {
        const pts = chart.data.map((d, i) => {
          const x = PAD.left + i * groupW + groupW / 2;
          const y = PAD.top + plotH - (Number(d[k] ?? 0) / niceMax) * plotH;
          return `${x},${y}`;
        });
        body += `<polyline points="${pts.join(' ')}" fill="none" stroke="${colors[si % colors.length]}" stroke-width="2"/>`;
        chart.data.forEach((d, i) => {
          const x = PAD.left + i * groupW + groupW / 2;
          const y = PAD.top + plotH - (Number(d[k] ?? 0) / niceMax) * plotH;
          body += `<circle cx="${x}" cy="${y}" r="3" fill="${colors[si % colors.length]}"/>`;
        });
      });
      chart.data.forEach((d, i) => {
        const cx = PAD.left + i * groupW + groupW / 2;
        body += `<text x="${cx}" y="${PAD.top + plotH + 16}" text-anchor="middle" font-size="10" fill="${CANYON.textMid}">${esc(d.name)}</text>`;
      });
    }

    if (chart.yLabel) body += `<text x="15" y="${PAD.top + plotH / 2}" text-anchor="middle" font-size="11" fill="${CANYON.textMid}" transform="rotate(-90 15 ${PAD.top + plotH / 2})">${esc(chart.yLabel)}</text>`;

  } else if (chart.type === 'pie') {
    const total = chart.data.reduce((s, d) => s + (d.value ?? 0), 0) || 1;
    const cx = W / 2, cy = H / 2 + 10, r = 120;
    let startAngle = -Math.PI / 2;
    chart.data.forEach((d, i) => {
      const slice = ((d.value ?? 0) / total) * 2 * Math.PI;
      const endAngle = startAngle + slice;
      const large = slice > Math.PI ? 1 : 0;
      const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
      body += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z" fill="${colors[i % colors.length]}"/>`;
      const mid = startAngle + slice / 2;
      const lx = cx + (r + 20) * Math.cos(mid), ly = cy + (r + 20) * Math.sin(mid);
      const pct = Math.round(((d.value ?? 0) / total) * 100);
      body += `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="10" fill="${CANYON.textDark}">${esc(d.name)} ${pct}%</text>`;
      startAngle = endAngle;
    });

  } else if (chart.type === 'scatter') {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const d of chart.data) {
      if (d.x !== undefined) { minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x); }
      if (d.y !== undefined) { minY = Math.min(minY, d.y); maxY = Math.max(maxY, d.y); }
    }
    if (!isFinite(minX)) { minX = 0; maxX = 1; }
    if (!isFinite(minY)) { minY = 0; maxY = 1; }
    const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;

    chart.data.forEach((d, i) => {
      const px = PAD.left + ((d.x ?? 0) - minX) / rangeX * plotW;
      const py = PAD.top + plotH - ((d.y ?? 0) - minY) / rangeY * plotH;
      body += `<circle cx="${px}" cy="${py}" r="6" fill="${colors[i % colors.length]}" opacity="0.8"/>`;
      body += `<text x="${px}" y="${py - 10}" text-anchor="middle" font-size="10" fill="${CANYON.textDark}">${esc(d.name)}</text>`;
    });

    if (chart.xLabel) body += `<text x="${PAD.left + plotW / 2}" y="${H - 10}" text-anchor="middle" font-size="11" fill="${CANYON.textMid}">${esc(chart.xLabel)}</text>`;
    if (chart.yLabel) body += `<text x="15" y="${PAD.top + plotH / 2}" text-anchor="middle" font-size="11" fill="${CANYON.textMid}" transform="rotate(-90 15 ${PAD.top + plotH / 2})">${esc(chart.yLabel)}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="white"/>${title}${body}</svg>`;
}

function MermaidDiagram({ chart }: { chart: string }) {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState(false);
  const [fit, setFit] = useState(false);
  const sanitized = sanitizeMermaidSyntax(chart);

  useEffect(() => {
    let cancelled = false;
    const cleaned = sanitizeMermaidSyntax(chart);
    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
    const offscreen = document.createElement('div');
    offscreen.style.position = 'absolute';
    offscreen.style.left = '-99999px';
    offscreen.style.top = '-99999px';
    document.body.appendChild(offscreen);

    import('mermaid').then((m) => {
      m.default.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'base',
        themeVariables: {
          primaryColor: '#F5EDE6', primaryBorderColor: '#D4A574',
          lineColor: '#8B3520', textColor: '#3D1E10',
      }});
      m.default.render(id, cleaned, offscreen)
        .then(({ svg: renderedSvg }) => { if (!cancelled) setSvg(renderedSvg); })
        .catch((err) => { if (!cancelled) { console.warn('[Mermaid] render failed:', err, '\nSanitized input:', cleaned); setError(true); } })
        .finally(() => { offscreen.remove(); });
    });
    return () => { cancelled = true; offscreen.remove(); };
  }, [chart]);

  // SVG 렌더 후: 자연 폭 < 컨테이너 폭이면 확대(fit), 아니면 스크롤
  useEffect(() => {
    if (!svg || !mermaidRef.current) return;
    const svgEl = mermaidRef.current.querySelector('svg');
    if (!svgEl) return;
    const svgWidth = svgEl.viewBox?.baseVal?.width || svgEl.getBoundingClientRect().width || 0;
    const containerWidth = mermaidRef.current.clientWidth;
    setFit(svgWidth <= containerWidth);
  }, [svg]);

  if (error) return (
    <div className="my-4 px-4 py-3 rounded-lg border-l-4 text-sm"
      style={{ backgroundColor: CANYON.cream, borderColor: CANYON.amber, color: CANYON.textMid }}>
      <p className="mb-0">다이어그램을 표시할 수 없습니다.</p>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs" style={{ color: CANYON.textLight }}>
          원본 다이어그램 코드 보기
        </summary>
        <pre className="mt-2 p-3 rounded-xl text-xs overflow-auto max-h-48 whitespace-pre-wrap"
          style={{ backgroundColor: CANYON.bg, color: CANYON.textDark, fontFamily: 'var(--font-mono), monospace' }}>
          {chart}
        </pre>
      </details>
    </div>
  );
  return <div className={`my-4 overflow-x-auto mermaid-wrap${fit ? ' fit' : ''}`}
    style={{ width: '100%' }}
    ref={mermaidRef}
    dangerouslySetInnerHTML={{ __html: svg }} />;
}


function WorkflowPageInner() {
  const searchParams = useSearchParams();
  const routerNav = useRouter();
  const [step, setStep] = useState<WorkflowStep>('keyword');
  const [keyword, setKeyword] = useState('');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedIdeas, setSelectedIdeas] = useState<number[]>([]);
  const [businessPlans, setBusinessPlans] = useState<BusinessPlan[]>([]);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);
  const [fullBusinessPlans, setFullBusinessPlans] = useState<BusinessPlan[]>([]);
  const [currentFullPlanIndex, setCurrentFullPlanIndex] = useState(0);
  const [prds, setPRDs] = useState<PRD[]>([]);
  const [currentPRDIndex, setCurrentPRDIndex] = useState(0);
  const [prdFormat, setPrdFormat] = useState<'markdown' | 'plain'>('markdown');
  const [prdCopied, setPrdCopied] = useState(false);
  const [, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<QualityPreset>('premium');
  const [availableProviders, setAvailableProviders] = useState<Record<AIProvider, boolean | null>>({
    claude: null,
    gemini: null,
    openai: null,
    ollama: null,
  });
  const [rawResponse, setRawResponse] = useState('');
  const [, setSearchResults] = useState<SearchResult[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(2);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const processStartRef = useRef<number | null>(null);
  const expectedEndRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const saveCountRef = useRef<Record<string, number>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastSaveHandleRef = useRef<any>(null);
  // 실측 생성 시간 (아이디어 생성 / 사업기획서 생성 완료 후 표시)
  const [lastGenTime, setLastGenTime] = useState<{ seconds: number; label: string } | null>(null);
  // 기획서 Import 컨텍스트 (guided 페이지에서 import 시 전달됨)
  const [importedPlanContent, setImportedPlanContent] = useState<string | null>(null);
  const [batchCount, setBatchCount] = useState(0);

  useEffect(() => {
    checkProviders();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // 가이드 질문 결과 수신
  useEffect(() => {
    if (searchParams.get('from') === 'guided') {
      const raw = sessionStorage.getItem(GUIDED_RESULT_KEY);
      if (raw) {
        try {
          const result: GuidedResult = JSON.parse(raw);
          setIdeas([result.idea]);
          setSelectedIdeas([result.idea.id]);
          setBusinessPlans([result.businessPlan]);
          setCurrentPlanIndex(0);
          if (result.preset) setSelectedPreset(result.preset);
          if (result.importedPlanContent) setImportedPlanContent(result.importedPlanContent);
          setStep('view-plan');
          sessionStorage.removeItem(GUIDED_RESULT_KEY);
        } catch (e) {
          console.error('Failed to parse guided result:', e);
        }
      }
      routerNav.replace('/workflow', { scroll: false });
    }
  }, [searchParams, routerNav]);

  function startTimer(initialEtaMs: number) {
    const now = Date.now();
    processStartRef.current = now;
    expectedEndRef.current = now + initialEtaMs;
    setElapsedSeconds(0);
    setEtaSeconds(Math.ceil(initialEtaMs / 1000));
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const t = Date.now();
      setElapsedSeconds(Math.floor((t - (processStartRef.current ?? t)) / 1000));
      const remaining = (expectedEndRef.current ?? t) - t;
      setEtaSeconds(remaining > 0 ? Math.ceil(remaining / 1000) : 0);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function updateEta(remainingMs: number) {
    expectedEndRef.current = Date.now() + remainingMs;
    setEtaSeconds(Math.ceil(remainingMs / 1000));
  }

  function handleAbortGeneration() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }

  async function checkProviders() {
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      setAvailableProviders({
        ollama: data.ollama ?? false,
        claude: data.claude ?? false,
        gemini: data.gemini ?? false,
        openai: data.openai ?? false,
      });
    } catch {
      setAvailableProviders({ ollama: false, claude: false, gemini: false, openai: false });
    }
  }

  function isProviderReady(): boolean {
    // 프리셋의 모든 모듈에 대해 최소 1개 provider가 사용 가능하면 OK
    const types = Object.keys(MODULE_PRESETS[selectedPreset]);
    return types.every(type => {
      const chain = MODULE_PRESETS[selectedPreset][type];
      return chain.some(c => availableProviders[c.provider] === true);
    });
  }

  async function searchMultiple(queries: string[], countEach: number = 4, depth: 'basic' | 'advanced' = 'basic'): Promise<SearchResult[]> {
    const allResults = await Promise.all(
      queries.map(async (q) => {
        try {
          const res = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: q, count: countEach, depth }),
          });
          if (!res.ok) return [];
          const data = await res.json();
          return (data.results || []) as SearchResult[];
        } catch {
          return [];
        }
      })
    );
    const seen = new Set<string>();
    return allResults.flat().filter((r) => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
  }

  async function searchReddit(kw: string): Promise<SearchResult[]> {
    try {
      const res = await fetch('/api/reddit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw || 'SaaS startup' }),
      });
      if (!res.ok) return [];
      return ((await res.json()).results || []) as SearchResult[];
    } catch {
      return [];
    }
  }

  async function searchTrends(kw: string): Promise<SearchResult[]> {
    try {
      const res = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw || 'SaaS' }),
      });
      if (!res.ok) return [];
      return ((await res.json()).results || []) as SearchResult[];
    } catch {
      return [];
    }
  }

  async function searchProductHunt(kw: string): Promise<SearchResult[]> {
    try {
      const res = await fetch('/api/producthunt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw || '' }),
      });
      if (!res.ok) return [];
      return ((await res.json()).results || []) as SearchResult[];
    } catch {
      return [];
    }
  }

  /** LLM으로 동적 검색 쿼리 생성 (실패 시 fallbackQueries로 폴백) */
  async function generateSearchQueries(
    kw: string,
    context: 'idea-generation' | 'business-plan',
    fallbackQueries: string[],
    queryCount?: number,
    idea?: Idea,
  ): Promise<string[]> {
    const count = queryCount || fallbackQueries.length;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: selectedPreset,
          type: 'generate-queries',
          keyword: kw,
          queryContext: context,
          queryCount: count,
          ideaName: idea?.name,
          ideaTarget: idea?.target,
          ideaCategory: idea?.category,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('generate-queries API 실패');
      const data = await res.json();
      const text: string = data.response || '';
      // JSON 배열 파싱 (```json 블록 또는 raw JSON)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('JSON 배열 미발견');
      const queries = JSON.parse(jsonMatch[0]) as string[];
      if (!Array.isArray(queries) || queries.length === 0) throw new Error('빈 배열');
      console.log(`[generate-queries] ${context}: ${queries.length}개 동적 쿼리 생성`);
      return queries.slice(0, count + 2); // 약간의 여유 허용
    } catch (err) {
      console.warn('[generate-queries] 폴백 사용:', err instanceof Error ? err.message : err);
      return fallbackQueries;
    }
  }

  async function generateIdeas() {
    setIsLoading(true);
    setError(null);
    setStep('generating-ideas');
    setSearchResults([]);
    setProgressCurrent(0);
    setProgressTotal(2);
    setCompletedSteps([]);

    const timings = getStoredTimings();
    startTimer(timings.ideaSearch + timings.ideaLLM);

    try {
      // Step 1: 시장 조사(Tavily) + Reddit + Google Trends + Product Hunt 병렬 수집
      let searchData: SearchResult[] = [];
      let redditData: SearchResult[] = [];
      let trendsData: SearchResult[] = [];
      let productHuntData: SearchResult[] = [];
      setLoadingMessage('시장 조사 + Reddit + Google Trends + Product Hunt 수집 중...');
      const searchStart = Date.now();
      try {
        const base = keyword || 'SaaS AI 에이전트';
        const fallbackQueries = [
          `${base} SaaS 시장 규모 성장률 트렌드 2025`,
          `${base} B2B B2C 솔루션 스타트업 투자 기회`,
          `${base} AI 자동화 에이전트 적용 사례 2025`,
        ];
        // LLM 쿼리 생성을 Reddit/Trends/PH와 병렬 실행 → 레이턴시 최소화
        const [dynamicQueries, rd, tr, ph] = await Promise.all([
          generateSearchQueries(base, 'idea-generation', fallbackQueries, 3),
          searchReddit(keyword || 'SaaS startup'),
          searchTrends(keyword || 'SaaS'),
          searchProductHunt(keyword || ''),
        ]);
        redditData = rd;
        trendsData = tr;
        productHuntData = ph;
        searchData = await searchMultiple(dynamicQueries);
        setSearchResults(searchData);
      } catch (searchErr) {
        console.log('Search failed, continuing without search results:', searchErr);
      }
      updateStoredTiming('ideaSearch', Date.now() - searchStart);
      setProgressCurrent(1);
      setCompletedSteps([
        `시장 자료 ${searchData.length}건 + Reddit ${redditData.length}건 + 급등 트렌드 ${trendsData.length}건 + Product Hunt ${productHuntData.length}건 수집 완료`,
      ]);
      updateEta(timings.ideaLLM);

      // Step 2: Generate ideas with search context
      // 프롬프트 구성은 서버(api/generate)에서 app/src/assets/criteria.md를 읽어 처리
      setLoadingMessage('AI가 아이디어 3개를 생성하는 중...');
      const llmStart = Date.now();

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: selectedPreset,
          type: 'generate-ideas',
          keyword: keyword || undefined,
          searchResults: searchData,
          redditResults: redditData,
          trendsResults: trendsData,
          productHuntResults: productHuntData,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate ideas');
      }

      const data = await res.json();
      setRawResponse(appendTruncationWarning(data.response, data.meta));

      // Parse JSON from response
      let parsed = null;
      const response = data.response;

      // trailing comma 제거 + BOM 제거 후 JSON.parse
      const cleanAndParse = (text: string): unknown | null => {
        try {
          const cleaned = text
            .replace(/^\uFEFF/, '')
            .replace(/,\s*([\]}])/g, '$1')
            .trim();
          return JSON.parse(cleaned);
        } catch {
          return null;
        }
      };

      // 균형 잡힌 중괄호로 JSON 객체 추출
      const extractBalancedJson = (text: string): string | null => {
        const start = text.indexOf('{');
        if (start === -1) return null;
        let depth = 0;
        for (let i = start; i < text.length; i++) {
          if (text[i] === '{') depth++;
          else if (text[i] === '}') depth--;
          if (depth === 0) return text.slice(start, i + 1);
        }
        return null;
      };

      // Try 1: Extract from ```json ... ``` block
      const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        parsed = cleanAndParse(jsonBlockMatch[1]);
        if (!parsed) console.log('JSON block parse failed');
      }

      // Try 2: Extract from ``` ... ``` block
      if (!parsed) {
        const codeBlockMatch = response.match(/```\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          parsed = cleanAndParse(codeBlockMatch[1]);
          if (!parsed) console.log('Code block parse failed');
        }
      }

      // Try 3: Find raw JSON object with "ideas" (non-greedy)
      if (!parsed) {
        const rawJsonMatch = response.match(/\{\s*"ideas"\s*:\s*\[[\s\S]*?\]\s*\}/);
        if (rawJsonMatch) {
          parsed = cleanAndParse(rawJsonMatch[0]);
          if (!parsed) console.log('Raw JSON regex parse failed');
        }
      }

      // Try 4: Balanced brace extraction (가장 견고한 방법)
      if (!parsed) {
        const balancedJson = extractBalancedJson(response);
        if (balancedJson) {
          parsed = cleanAndParse(balancedJson);
          if (!parsed) console.log('Balanced brace parse failed');
        }
      }

      // Try 5: Direct JSON parse (for Ollama json mode)
      if (!parsed) {
        const directParsed = cleanAndParse(response);
        if (directParsed && typeof directParsed === 'object') {
          const obj = directParsed as Record<string, unknown>;
          if (obj.ideas && Array.isArray(obj.ideas)) {
            parsed = directParsed;
          } else if (Array.isArray(directParsed)) {
            parsed = { ideas: directParsed };
          }
        }
      }

      // Try 6: Find any JSON array in the response
      if (!parsed) {
        const arrayMatch = response.match(/\[[\s\S]*?\]/);
        if (arrayMatch) {
          const arr = cleanAndParse(arrayMatch[0]);
          if (Array.isArray(arr) && arr.length > 0) {
            parsed = { ideas: arr };
          }
        }
      }

      if (!parsed) {
        console.error('All JSON parsing attempts failed. Raw response:', response.slice(0, 500));
      }

      const parsedObj = parsed as Record<string, unknown> | null;
      if (parsedObj && parsedObj.ideas && Array.isArray(parsedObj.ideas)) {
        // Ensure all required fields exist
        const validIdeas = (parsedObj.ideas as Partial<Idea>[]).map((idea: Partial<Idea>, idx: number) => ({
          id: idea.id || idx + 1,
          name: idea.name || `아이디어 ${idx + 1}`,
          category: idea.category || 'B2C',
          oneLiner: idea.oneLiner || '-',
          target: idea.target || '-',
          problem: idea.problem || '-',
          features: Array.isArray(idea.features) ? idea.features : [],
          differentiation: idea.differentiation || '-',
          revenueModel: idea.revenueModel || '-',
          mvpDifficulty: idea.mvpDifficulty || '-',
          rationale: idea.rationale || '-',
        }));
        setIdeas(validIdeas);
      } else {
        // Fallback: create placeholder ideas if parsing fails
        setIdeas([
          {
            id: 1,
            name: '아이디어 파싱 실패',
            category: '-',
            oneLiner: 'JSON 형식을 파싱할 수 없습니다. 아래 원본 응답을 확인하세요.',
            target: '-',
            problem: '-',
            features: [],
            differentiation: '-',
            revenueModel: '-',
            mvpDifficulty: '-',
            rationale: '원본 응답 확인 필요',
          },
        ]);
      }

      updateStoredTiming('ideaLLM', Date.now() - llmStart);
      setProgressCurrent(2);
      if (processStartRef.current) {
        const secs = Math.round((Date.now() - processStartRef.current) / 1000);
        const usedModel = data.meta?.model ?? '';
        const usedProvider = data.meta?.provider ?? '';
        setLastGenTime({ seconds: secs, label: `${usedProvider} ${usedModel}` });
      }
      setStep('select-ideas');
    } catch (err) {
      { console.error('[오류]', err); setError(err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err) || '알 수 없는 오류'); }
      setStep('keyword');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      stopTimer();
    }
  }

  async function generateBusinessPlan() {
    if (selectedIdeas.length === 0) return;

    setIsLoading(true);
    setError(null);
    setStep('generating-plan');
    setBusinessPlans([]);
    setProgressCurrent(0);
    setProgressTotal(selectedIdeas.length * 2);
    setCompletedSteps([]);

    const timings = getStoredTimings();
    startTimer(selectedIdeas.length * (timings.planSearch + timings.planLLM));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const plans: BusinessPlan[] = [];
      let completedIdeas = 0;

      for (const ideaId of selectedIdeas) {
        if (controller.signal.aborted) break;
        const idea = ideas.find((i) => i.id === ideaId);
        if (!idea) continue;

        const remainingIdeas = selectedIdeas.length - completedIdeas;

        // Step 1: Search for relevant market data (parallel multi-query)
        setLoadingMessage(`"${idea.name}" 관련 시장 조사 중...`);
        const planSearchStart = Date.now();
        let planSearchResults: SearchResult[] = [];
        try {
          const bpFallback = [
            `${idea.name} 경쟁사 대안 솔루션 비교`,
            `${idea.target} 고객 페인포인트 문제점 수요`,
            `${idea.category || 'SaaS'} 시장 규모 TAM SAM SOM 투자 트렌드 2025`,
            `${idea.name} SaaS 가격 책정 수익 모델 사례`,
            `${idea.name} 규제 법률 리스크 진입 장벽`,
          ];
          const bpQueries = await generateSearchQueries(idea.name, 'business-plan', bpFallback, 5, idea);
          planSearchResults = await searchMultiple(bpQueries, 3, 'advanced');
        } catch (searchErr) {
          console.log('Search failed for business plan:', searchErr);
        }
        if (controller.signal.aborted) break;
        updateStoredTiming('planSearch', Date.now() - planSearchStart);
        setProgressCurrent(prev => prev + 1);
        setCompletedSteps(prev => [...prev, `"${idea.name}" 시장 자료 ${planSearchResults.length}건 수집 완료`]);
        updateEta(timings.planLLM + (remainingIdeas - 1) * (timings.planSearch + timings.planLLM));

        // Step 2: Generate business plan with search context
        // 프롬프트 구성은 서버(api/generate)에서 docs/bizplan-template.md를 읽어 처리
        setLoadingMessage(`"${idea.name}" 사업기획서 작성 중...`);
        const planLLMStart = Date.now();

        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preset: selectedPreset,
            type: 'business-plan',
            idea,
            searchResults: planSearchResults,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Failed to generate plan for ${idea.name}`);
        }

        const data = await res.json();
        // 잘림 경고 + 섹션 완성도 검증
        let planContent = appendTruncationWarning(data.response, data.meta);
        planContent = validateDraftSections(planContent);

        updateStoredTiming('planLLM', Date.now() - planLLMStart);
        plans.push({
          ideaId: idea.id,
          ideaName: idea.name,
          content: planContent,
          createdAt: new Date().toISOString(),
        });
        completedIdeas += 1;
        setProgressCurrent(prev => prev + 1);
        setCompletedSteps(prev => [...prev, `"${idea.name}" 사업기획서 작성 완료`]);
        updateEta((selectedIdeas.length - completedIdeas) * (timings.planSearch + timings.planLLM));
      }

      if (controller.signal.aborted) {
        setStep('select-ideas');
        return;
      }
      setBusinessPlans(plans);
      setCurrentPlanIndex(0);
      if (processStartRef.current) {
        const secs = Math.round((Date.now() - processStartRef.current) / 1000);
        setLastGenTime({ seconds: secs, label: `${PRESET_INFO[selectedPreset].label} 모드` });
      }
      setStep('view-plan');
    } catch (err) {
      if (controller.signal.aborted) {
        setStep('select-ideas');
        return;
      }
      { console.error('[오류]', err); setError(err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err) || '알 수 없는 오류'); }
      setStep('select-ideas');
    } finally {
      abortRef.current = null;
      setIsLoading(false);
      setLoadingMessage('');
      stopTimer();
    }
  }

  function toggleIdeaSelection(id: number) {
    setSelectedIdeas((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function parseInlineText(text: string): TextRun[] {
    const F = { name: 'Calibri', eastAsia: '맑은 고딕', cs: '맑은 고딕' } as const;
    return text.split(/(\*\*[^*]+\*\*)/).map((part) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return new TextRun({ text: part.slice(2, -2), bold: true, font: F });
      }
      return new TextRun({ text: part, font: F });
    });
  }

  async function buildDocxBlob(plan: BusinessPlan): Promise<Blob> {
    const DC = { ...CANYON_DOCX, white: 'FFFFFF' };

    const lines = plan.content.split('\n');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = [];

    // ── 문서 상단 메타 정보 ─────────────────────────────────────────
    const presetLabel = PRESET_INFO[selectedPreset].label;
    const createdAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `생성 모드: ${presetLabel}`, size: 18, color: DC.textLight }),
        new TextRun({ text: `    |    생성 일시: ${createdAt}`, size: 18, color: DC.textLight }),
      ],
      spacing: { after: 40 },
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: '', size: 4 })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: DC.border } },
      spacing: { after: 240 },
    }));

    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // H1: # 제목 → 다크 브라운 대제목
      if (/^# /.test(line) && !/^##/.test(line)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(2), bold: true, size: 40, color: DC.textDark, font: { name: 'Calibri', eastAsia: '맑은 고딕', cs: '맑은 고딕' } })],
          spacing: { before: 400, after: 240 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: DC.accent, space: 6 } },
        }));
        i++;

      // H2: ## → 테라코타 배경 + 흰 글자
      } else if (/^## /.test(line) && !/^###/.test(line)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(3), color: DC.white, bold: true, size: 28, font: { name: 'Calibri', eastAsia: '맑은 고딕', cs: '맑은 고딕' } })],
          shading: { type: ShadingType.CLEAR, fill: DC.accent, color: 'auto' },
          spacing: { before: 480, after: 160 },
          indent: { left: 200, right: 200 },
        }));
        i++;

      // H3: ### → 앰버 좌측 보더 + 다크 브라운 글자
      } else if (/^### /.test(line) && !/^####/.test(line)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(4), color: DC.textDark, bold: true, size: 24, font: { name: 'Calibri', eastAsia: '맑은 고딕', cs: '맑은 고딕' } })],
          border: { left: { style: BorderStyle.SINGLE, size: 24, color: DC.amber, space: 8 } },
          indent: { left: 200 },
          spacing: { before: 280, after: 80 },
        }));
        i++;

      // H4: #### → 크림 좌측 보더 + 미드 브라운 글자
      } else if (/^#### /.test(line)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.slice(5), color: DC.textMid, bold: true, size: 22, font: { name: 'Calibri', eastAsia: '맑은 고딕', cs: '맑은 고딕' } })],
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: DC.border, space: 8 } },
          indent: { left: 160 },
          spacing: { before: 200, after: 60 },
        }));
        i++;

      // 표: | 가 있고 다음 줄이 구분선(|---|---|)인 경우
      } else if (line.includes('|') && /^\s*\|[\s\-:|]+\|\s*$/.test(lines[i + 1] || '')) {
        const headerCells = line.split('|').slice(1, -1).map(c => c.trim());
        const colCount = headerCells.length;
        i += 2;
        const bodyRows: string[][] = [];
        while (i < lines.length && lines[i].includes('|')) {
          bodyRows.push(lines[i].split('|').slice(1, -1).map(c => c.trim()));
          i++;
        }
        const table = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: headerCells.map(text => new TableCell({
                // CLEAR = 배경색만 채움 (SOLID는 전경 패턴으로 덮어 버림)
                shading: { type: ShadingType.CLEAR, fill: DC.cream, color: 'auto' },
                children: [new Paragraph({
                  children: [new TextRun({ text, bold: true, size: 20, color: DC.textDark, font: { name: 'Calibri', eastAsia: '맑은 고딕', cs: '맑은 고딕' } })],
                  spacing: { after: 60 },
                })],
              })),
            }),
            ...bodyRows.map((row, rowIdx) => {
              const cells = [...row];
              while (cells.length < colCount) cells.push('');
              return new TableRow({
                children: cells.slice(0, colCount).map(text => new TableCell({
                  shading: rowIdx % 2 === 1
                    ? { type: ShadingType.CLEAR, fill: 'FDF5EE', color: 'auto' }
                    : { type: ShadingType.CLEAR, fill: 'FFFFFF', color: 'auto' },
                  children: [new Paragraph({ children: parseInlineText(text), spacing: { after: 60 } })],
                })),
              });
            }),
          ],
        });
        children.push(table);
        children.push(new Paragraph({ text: '', spacing: { after: 120 } }));

      // 코드 블록 (```mermaid → 이미지 삽입, 그 외 → 코드 스타일 텍스트)
      } else if (/^```/.test(line)) {
        const lang = line.replace(/^```/, '').trim().toLowerCase();
        const blockLines: string[] = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) {
          blockLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) i++; // skip closing ```

        if (lang === 'chart') {
          // chart JSON → 정적 SVG → PNG 임베딩
          const chartData = parseChartJson(blockLines.join('\n'));
          if (chartData) {
            const svgStr = renderChartSvg(chartData);
            const img = await svgToPng(svgStr);
            if (img) {
              const maxW = 560;
              const scale = Math.min(1, maxW / img.width);
              const finalW = Math.round(img.width * scale);
              const finalH = Math.round(img.height * scale);
              children.push(new Paragraph({
                children: [new ImageRun({ data: img.data, transformation: { width: finalW, height: finalH }, type: 'png' })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 200 },
              }));
            }
          }
        } else if (lang === 'mermaid') {
          const chart = blockLines.join('\n');
          const img = await renderMermaidToPng(chart);
          if (img) {
            const maxW = 560;
            const scale = Math.min(1, maxW / img.width);
            const finalW = Math.round(img.width * scale);
            const finalH = Math.round(img.height * scale);
            children.push(new Paragraph({
              children: [new ImageRun({ data: img.data, transformation: { width: finalW, height: finalH }, type: 'png' })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 },
            }));
          } else {
            for (const codeLine of blockLines) {
              children.push(new Paragraph({
                children: [new TextRun({ text: codeLine, size: 18, color: DC.textMid, font: { name: 'Consolas', eastAsia: '맑은 고딕', cs: '맑은 고딕' } })],
                shading: { type: ShadingType.CLEAR, fill: 'F5EDE6', color: 'auto' },
                spacing: { after: 20 },
              }));
            }
          }
        } else {
          // 일반 코드 블록
          for (const codeLine of blockLines) {
            children.push(new Paragraph({
              children: [new TextRun({ text: codeLine, size: 18, color: DC.textMid, font: { name: 'Consolas', eastAsia: '맑은 고딕', cs: '맑은 고딕' } })],
              shading: { type: ShadingType.CLEAR, fill: 'F5EDE6', color: 'auto' },
              spacing: { after: 20 },
            }));
          }
        }

      // 불릿 리스트
      } else if (/^[-*] /.test(line)) {
        children.push(new Paragraph({
          children: parseInlineText(line.slice(2)),
          bullet: { level: 0 },
          spacing: { after: 60 },
        }));
        i++;

      // 번호 리스트
      } else if (/^\d+\. /.test(line)) {
        children.push(new Paragraph({
          children: parseInlineText(line.replace(/^\d+\. /, '')),
          numbering: { reference: 'default-numbering', level: 0 },
          spacing: { after: 60 },
        }));
        i++;

      // 수평선
      } else if (line.trim() === '---') {
        children.push(new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: DC.border, space: 1 } },
          spacing: { before: 240, after: 240 },
        }));
        i++;

      // 빈 줄
      } else if (line.trim() === '') {
        children.push(new Paragraph({ text: '', spacing: { after: 80 } }));
        i++;

      // 일반 텍스트
      } else {
        children.push(new Paragraph({
          children: parseInlineText(line),
          spacing: { after: 100 },
        }));
        i++;
      }
    }

    const doc = new Document({
      // 문서 기본 폰트: 영문 Calibri + 한글 맑은 고딕 (웹 UI Outfit + Noto Sans KR에 대응)
      styles: {
        default: {
          document: {
            run: {
              font: { name: 'Calibri', eastAsia: '맑은 고딕', cs: '맑은 고딕' },
              size: 22,
              color: DC.textDark,
            },
            paragraph: {
              spacing: { line: 288, lineRule: 'auto' },
            },
          },
        },
      },
      numbering: {
        config: [{ reference: 'default-numbering', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: 'left' }] }],
      },
      sections: [{ children }],
    });

    return await Packer.toBlob(doc);
  }

  function triggerBrowserDownload(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getSaveBaseName(plan: BusinessPlan, type: 'bizplan' | 'prd') {
    const kw = keyword || '없음';
    if (type === 'prd') return `PRD_${kw}_${plan.ideaName}`;
    const ver = plan.version === 'full' ? 'Full' : 'Draft';
    return `사업기획서_${kw}_${ver}_${plan.ideaName}`;
  }

  function getSaveCount(countKey: string): number {
    // localStorage 우선, 없으면 세션 ref
    try {
      const stored = localStorage.getItem('save-counts');
      if (stored) {
        const map = JSON.parse(stored);
        if (typeof map[countKey] === 'number') return map[countKey];
      }
    } catch { /* ignore */ }
    return saveCountRef.current[countKey] || 0;
  }

  function incrementSaveCount(countKey: string) {
    const next = getSaveCount(countKey) + 1;
    saveCountRef.current[countKey] = next;
    try {
      const stored = localStorage.getItem('save-counts');
      const map = stored ? JSON.parse(stored) : {};
      map[countKey] = next;
      localStorage.setItem('save-counts', JSON.stringify(map));
    } catch { /* ignore */ }
  }

  async function saveFile(plan: BusinessPlan, type: 'bizplan' | 'prd' = 'bizplan', format: 'docx' | 'md' = 'docx') {
    const base = getSaveBaseName(plan, type);
    const ext = format === 'md' ? '.md' : '.docx';
    const countKey = `${base}${ext}`;
    const count = getSaveCount(countKey);
    const suggestedName = count === 0 ? `${base}${ext}` : `${base}_${String(count).padStart(2, '0')}${ext}`;

    let blob: Blob;
    try {
      if (format === 'md') {
        blob = new Blob([plan.content], { type: 'text/markdown;charset=utf-8' });
      } else {
        blob = await buildDocxBlob(plan);
      }
    } catch (err) {
      console.error('[문서 생성 실패]', err);
      alert('문서 생성 중 오류가 발생했습니다.');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (window as any).showSaveFilePicker === 'function') {
      try {
        const mimeType = format === 'md' ? 'text/markdown' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pickerOpts: any = {
          suggestedName,
          types: [{ description: format === 'md' ? 'Markdown' : 'Word Document', accept: { [mimeType]: [ext] } }],
        };
        if (lastSaveHandleRef.current) {
          pickerOpts.startIn = lastSaveHandleRef.current;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fileHandle = await (window as any).showSaveFilePicker(pickerOpts);
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        lastSaveHandleRef.current = fileHandle;
        incrementSaveCount(countKey);
        return;
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }

    triggerBrowserDownload(blob, suggestedName);
    incrementSaveCount(countKey);
  }

  async function generatePRD(sourcePlan?: BusinessPlan, returnStep: WorkflowStep = 'view-plan') {
    const currentPlan = sourcePlan ?? businessPlans[currentPlanIndex];
    if (!currentPlan) return;
    const idea = ideas.find((i) => i.id === currentPlan.ideaId);
    if (!idea) return;

    setIsLoading(true);
    setError(null);
    setStep('generating-prd');
    setLoadingMessage(`"${idea.name}" PRD 작성 중...`);
    setProgressCurrent(0);
    setProgressTotal(1);
    setCompletedSteps([]);
    startTimer(75000);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: selectedPreset,
          type: 'generate-prd',
          idea,
          businessPlanContent: currentPlan.content,
        }),
      });

      if (!res.ok) {
        throw new Error(`PRD 생성 실패: ${idea.name}`);
      }

      const data = await res.json();
      const newPRD: PRD = {
        ideaId: idea.id,
        ideaName: idea.name,
        content: appendTruncationWarning(data.response, data.meta),
        createdAt: new Date().toISOString(),
      };

      setPRDs((prev) => {
        const filtered = prev.filter((p) => p.ideaId !== idea.id);
        return [...filtered, newPRD];
      });
      setCurrentPRDIndex(0);
      setProgressCurrent(1);
      setCompletedSteps([`"${idea.name}" PRD 작성 완료`]);
      setStep('view-prd');
    } catch (err) {
      { console.error('[오류]', err); setError(err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err) || '알 수 없는 오류'); }
      setStep(returnStep);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      stopTimer();
    }
  }

  // ── Devil's Advocate RISK_SUMMARY 헬퍼 ────────────────────────────────
  function extractRiskSummary(devilContent: string): string | null {
    const match = devilContent.match(/<!-- RISK_SUMMARY -->\s*([\s\S]*?)\s*<!-- \/RISK_SUMMARY -->/);
    return match ? match[1].trim() : null;
  }

  function stripRiskSummary(devilContent: string): string {
    return devilContent
      .replace(/<!-- RISK_SUMMARY -->[\s\S]*?<!-- \/RISK_SUMMARY -->\s*/, '')
      .replace(/#{2,3}\s*(?:블록|[Bb][Ll][Oo][Cc][Kk])\s*\d[^:\n]*:[^\n]*\n*/g, '')
      .trim();
  }

  function injectRiskIntoExecSummary(combined: string, riskSummary: string): string {
    // Section 2 시작 직전에 리스크 요약 삽입 (Section 1 끝)
    const sec2Pattern = /\n(#{2,3} \**2(?:[.．:：)\]]|\s+(?=[가-힣A-Z])))/;
    const sec2Match = combined.match(sec2Pattern);
    if (!sec2Match || sec2Match.index === undefined) return combined;
    const insertPos = sec2Match.index;
    const riskBlock = `\n\n### 주요 리스크 (Devil's Advocate)\n\n${riskSummary}\n`;
    return combined.slice(0, insertPos) + riskBlock + combined.slice(insertPos);
  }

  // ── 출력 검증 헬퍼 ───────────────────────────────────────────────────────

  /** 잘림 경고 마크다운 */
  const TRUNCATION_WARNING = '\n\n---\n\n> ⚠️ **출력 잘림**: AI 모델이 토큰 한도에 도달해 내용이 중간에 잘렸습니다. 다른 모델로 전환하거나 다시 시도해 주세요.\n';

  /** 응답에 잘림이 감지되면 경고를 본문 끝에 추가 */
  function appendTruncationWarning(content: string, meta?: { truncated?: boolean }): string {
    if (meta?.truncated) return content + TRUNCATION_WARNING;
    return content;
  }

  /** 초안 기획서(business-plan) 섹션 완성도 검증: ## 1. ~ ## 10. 최소 7개 */
  function validateDraftSections(content: string): string {
    const found: number[] = [];
    for (let i = 1; i <= 10; i++) {
      const pattern = new RegExp(`#{2,3}\\s+\\**${i}(?:[.．:：)\\)]|\\s+(?=[가-힣A-Z]))(?![0-9])`);
      if (pattern.test(content)) found.push(i);
    }
    if (found.length < 7) {
      const missing = Array.from({ length: 10 }, (_, i) => i + 1).filter(n => !found.includes(n));
      const warning = `> ⚠️ **섹션 누락 경고**: 다음 섹션이 생성되지 않았습니다: ${missing.map(n => `섹션 ${n}`).join(', ')}. AI 모델의 출력 한도로 인해 내용이 잘렸을 수 있습니다.\n\n`;
      return warning + content;
    }
    return content;
  }

  /** 풀버전 기획서 섹션 완성도 검증: 섹션 1~13 + 참고문헌 */
  function validateFullPlanSections(content: string): string {
    const missing: string[] = [];
    for (let i = 1; i <= 13; i++) {
      const pattern = new RegExp(`#{2,3}\\s+\\**${i}(?:[.．:：)\\)]|\\s+(?=[가-힣A-Z]))(?![0-9])`);
      if (!pattern.test(content)) missing.push(`섹션 ${i}`);
    }
    if (!/#{2,3}\s+\**참고문헌/.test(content)) missing.push('참고문헌');
    if (missing.length > 0) {
      const warning = `> ⚠️ **섹션 누락 경고**: 다음 섹션이 생성되지 않았습니다: ${missing.join(', ')}. AI 모델의 출력 한도로 인해 내용이 잘렸을 수 있습니다.\n\n`;
      return warning + content;
    }
    return content;
  }

  // ── 풀버전 생성 파이프라인 (검색 → Agent 1~4 → 조합) ──────────────────

  // 타임아웃 래퍼: 에이전트 호출이 5분 넘으면 중단. externalSignal이 있으면 외부 중지도 반영.
  async function fetchWithTimeout(url: string, opts: RequestInit, timeoutMs = 600000, externalSignal?: AbortSignal): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // 외부 signal이 abort되면 내부 controller도 abort
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) { clearTimeout(timer); throw new DOMException('Aborted', 'AbortError'); }
      externalSignal.addEventListener('abort', onExternalAbort);
    }
    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      return res;
    } catch (err: unknown) {
      if (externalSignal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      if (controller.signal.aborted) {
        throw new Error(`AI 응답 시간 초과 (${Math.round(timeoutMs / 60000)}분). 네트워크 상태를 확인하거나 다시 시도해주세요.`);
      }
      throw err instanceof Error ? err : new Error(typeof err === 'string' ? err : 'fetch 실패');
    } finally {
      clearTimeout(timer);
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }

  async function runFullPlanPipeline(
    idea: Idea,
    onAgentComplete: (agentNum: number, agentLabel: string) => void,
    draftContent?: string,
  ): Promise<BusinessPlan> {
    // 기존 기획서 컨텍스트: 프롬프트에서 8K로 재절삭되므로 클라이언트에서도 8K로 캡
    const existingCtx = (importedPlanContent || draftContent || '').slice(0, 8000) || undefined;

    // 시장 조사 (동적 쿼리 생성 → Tavily 검색)
    let planSearchResults: SearchResult[] = [];
    try {
      const fpFallback = [
        `${idea.name} 경쟁사 대안 솔루션 비교`,
        `${idea.target} 고객 페인포인트 문제점 수요`,
        `${idea.category || 'SaaS'} 시장 규모 TAM SAM SOM 투자 트렌드 2025`,
        `${idea.name} SaaS 가격 책정 수익 모델 사례`,
        `${idea.name} 규제 법률 리스크 진입 장벽`,
      ];
      const fpQueries = await generateSearchQueries(idea.name, 'business-plan', fpFallback, 5, idea);
      planSearchResults = await searchMultiple(fpQueries, 3, 'advanced');
    } catch { /* 검색 실패 시 빈 배열로 계속 진행 */ }

    const agentEtaMs = 90000;
    const headers = { 'Content-Type': 'application/json' };
    // 이전 에이전트 출력 캡 (request body 과대 방지, 서버 프롬프트에서 재절삭됨)
    const cap = (s: string, max = 12000) => s.length > max ? s.slice(0, max) : s;
    // 검색결과도 캡 (snippet만 추려서 크기 줄임)
    const cappedSearch = planSearchResults.slice(0, 5).map(r => ({ title: r.title, url: r.url, snippet: (r.snippet || '').slice(0, 300) }));

    // 안전한 fetch: body 크기 로깅 + 에이전트별 에러 메시지 + 잘림 감지
    async function agentFetch(agentNum: number, agentLabel: string, payload: Record<string, unknown>): Promise<string> {
      const bodyStr = JSON.stringify(payload);
      console.log(`[에이전트 ${agentNum}] request body: ${Math.round(bodyStr.length / 1024)}KB`);
      const r = await fetchWithTimeout('/api/generate', { method: 'POST', headers, body: bodyStr }, 600000, abortRef.current?.signal ?? undefined);
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(`[에이전트 ${agentNum}] ${agentLabel} 실패: ${e?.error || r.statusText}`); }
      const data = await r.json();
      const content = appendTruncationWarning(data.response as string, data.meta);
      onAgentComplete(agentNum, `"${idea.name}" ${agentLabel} 완료${data.meta?.truncated ? ' (잘림 감지)' : ''}`);
      return content;
    }

    // 재시도 + 부분 실패 허용 래퍼: 사용자 중지는 즉시 re-throw, 그 외 1회 재시도 후 빈 문자열 반환
    async function safeAgentFetch(
      agentNum: number, agentLabel: string,
      payload: Record<string, unknown>, retries = 1,
    ): Promise<string> {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          return await agentFetch(agentNum, agentLabel, payload);
        } catch (err) {
          // 사용자 중지(AbortError)는 즉시 re-throw
          if (err instanceof DOMException && err.name === 'AbortError') throw err;
          if (attempt < retries) {
            console.warn(`[에이전트 ${agentNum}] 재시도 (${attempt + 1}/${retries})`);
            onAgentComplete(agentNum, `"${idea.name}" ${agentLabel} 재시도 중...`);
            continue;
          }
          console.error(`[에이전트 ${agentNum}] 최종 실패:`, err);
          onAgentComplete(agentNum, `"${idea.name}" ${agentLabel} 실패 ⚠️`);
          return ''; // 빈 문자열 → 해당 섹션 생략
        }
      }
      return '';
    }

    const base = { preset: selectedPreset };

    // Agent 1: 시장·문제
    setLoadingMessage(`[에이전트 1/5] "${idea.name}" 시장·트렌드·TAM 분석 중...`);
    const marketContent = await safeAgentFetch(1, '시장·트렌드·TAM 분석', { ...base, type: 'full-plan-market', idea, searchResults: cappedSearch, existingPlanContent: existingCtx });
    updateEta(4 * agentEtaMs);

    // Agent 2: 경쟁·차별화
    setLoadingMessage(`[에이전트 2/5] "${idea.name}" 경쟁·차별화 분석 중...`);
    const competitionContent = await safeAgentFetch(2, '경쟁·차별화 분석', { ...base, type: 'full-plan-competition', idea, marketContent: cap(marketContent), searchResults: cappedSearch, existingPlanContent: existingCtx });
    updateEta(3 * agentEtaMs);

    // Agent 3: 전략·솔루션
    setLoadingMessage(`[에이전트 3/5] "${idea.name}" 전략·로드맵 수립 중...`);
    const strategyContent = await safeAgentFetch(3, '전략·로드맵 수립', { ...base, type: 'full-plan-strategy', idea, marketContent: cap(marketContent), competitionContent: cap(competitionContent), searchResults: cappedSearch, existingPlanContent: existingCtx });
    updateEta(2 * agentEtaMs);

    // Agent 4: 재무·리스크
    setLoadingMessage(`[에이전트 4/5] "${idea.name}" 재무·리스크 분석 중...`);
    const financeContent = await safeAgentFetch(4, '재무·리스크 분석', { ...base, type: 'full-plan-finance', idea, marketContent: cap(marketContent, 8000), competitionContent: cap(competitionContent, 8000), strategyContent: cap(strategyContent, 8000), searchResults: cappedSearch, existingPlanContent: existingCtx });
    updateEta(1 * agentEtaMs);

    // 전체 실패 감지: 4개 모두 실패 시에만 throw
    const failedAgents = [
      !marketContent && 1,
      !competitionContent && 2,
      !strategyContent && 3,
      !financeContent && 4,
    ].filter(Boolean) as number[];
    if (failedAgents.length === 4) {
      throw new Error('모든 에이전트가 실패했습니다.');
    }

    // 부분 실패 경고 메시지
    const AGENT_LABELS: Record<number, string> = { 1: '시장·트렌드·TAM', 2: '경쟁·차별화', 3: '전략·로드맵', 4: '재무·리스크' };
    const partialWarning = failedAgents.length > 0
      ? `> ⚠️ **부분 생성 경고**: 에이전트 ${failedAgents.map(n => `${n}(${AGENT_LABELS[n]})`).join(', ')}이(가) 실패하여 해당 섹션이 누락되었습니다.\n\n`
      : '';

    // 섹션 순서대로 조합
    const combined = partialWarning + combineFullPlanSections(idea.name, marketContent, competitionContent, strategyContent, financeContent);

    // Agent 5: Devil's Advocate (실패 시 combined 그대로 사용)
    let finalContent = combined;
    setLoadingMessage(`[에이전트 5/5] "${idea.name}" Devil's Advocate 검토 중...`);
    try {
      // 프롬프트 크기 제한: combined가 너무 크면 앞부분만 전달
      const cappedPlan = combined.length > 40000 ? combined.slice(0, 40000) + '\n\n...(이하 생략)' : combined;
      const r5 = await fetchWithTimeout('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: selectedPreset, type: 'full-plan-devil', idea, fullPlanContent: cappedPlan, searchResults: planSearchResults, existingPlanContent: existingCtx }),
      }, 600000, abortRef.current?.signal ?? undefined);
      if (!r5.ok) {
        const errBody = await r5.json().catch(() => ({}));
        console.warn(`[Agent 5] Devil's Advocate 실패 (${r5.status}):`, errBody?.error || r5.statusText);
        onAgentComplete(5, `"${idea.name}" Devil's Advocate 검토 생략 (${r5.status})`);
      } else {
        const r5Data = await r5.json();
        const devilContent = appendTruncationWarning(r5Data.response as string, r5Data.meta);
        // RISK_SUMMARY 블록 추출 → Section 1에 삽입, Section 14 추가
        const riskSummary = extractRiskSummary(devilContent);
        const section14 = stripRiskSummary(devilContent);
        let mergedCombined = combined;
        if (riskSummary) {
          mergedCombined = injectRiskIntoExecSummary(combined, riskSummary);
        }
        // 참고문헌 앞에 섹션 14 삽입
        const refPattern = /\n(#{2,3}\s+\**참고문헌)/;
        const refMatch = mergedCombined.match(refPattern);
        if (refMatch && refMatch.index !== undefined) {
          finalContent = mergedCombined.slice(0, refMatch.index).trimEnd() + '\n\n---\n\n' + section14 + '\n\n---\n' + mergedCombined.slice(refMatch.index);
        } else {
          finalContent = mergedCombined.trimEnd() + '\n\n---\n\n' + section14;
        }
        onAgentComplete(5, `"${idea.name}" Devil's Advocate 검토 완료${r5Data.meta?.truncated ? ' (잘림 감지)' : ''}`);
      }
    } catch (e) {
      console.warn('[Agent 5] Devil\'s Advocate 예외:', e);
      onAgentComplete(5, `"${idea.name}" Devil's Advocate 검토 생략`);
    }

    // 풀버전 섹션 완성도 검증
    const validatedContent = validateFullPlanSections(finalContent);

    return {
      ideaId: idea.id,
      ideaName: idea.name,
      content: validatedContent,
      createdAt: new Date().toISOString(),
      version: 'full',
    };
  }

  async function generateFullPlan(sourcePlan?: BusinessPlan) {
    const currentPlan = sourcePlan ?? businessPlans[currentPlanIndex];
    if (!currentPlan) return;
    const idea = ideas.find((i) => i.id === currentPlan.ideaId);
    if (!idea) return;

    setIsLoading(true);
    setError(null);
    setBatchCount(0);
    setStep('generating-full-plan');
    setProgressCurrent(0);
    setProgressTotal(5);
    setCompletedSteps([]);

    const agentEtaMs = 90000;
    startTimer(5 * agentEtaMs);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const newFullPlan = await runFullPlanPipeline(idea, (agentNum, label) => {
        setProgressCurrent(agentNum);
        setCompletedSteps(prev => [...prev, `[${agentNum}/5] ${label}`]);
      }, currentPlan.content);

      const prevFiltered = fullBusinessPlans.filter(p => p.ideaId !== idea.id);
      const newPlans = [...prevFiltered, newFullPlan];
      setFullBusinessPlans(newPlans);
      setCurrentFullPlanIndex(newPlans.length - 1);
      setStep('view-full-plan');
    } catch (err) {
      if (controller.signal.aborted) {
        setStep('view-plan');
        return;
      }
      console.error('[풀버전 생성 오류]', err);
      const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
      setError(msg || '알 수 없는 오류가 발생했습니다.');
      setStep('view-plan');
    } finally {
      abortRef.current = null;
      setIsLoading(false);
      setLoadingMessage('');
      stopTimer();
    }
  }

  async function generateFullPlanBatch() {
    const targets = businessPlans.filter(
      draft => !fullBusinessPlans.some(fp => fp.ideaId === draft.ideaId)
    );
    if (targets.length === 0) return;

    setIsLoading(true);
    setError(null);
    setBatchCount(targets.length);
    setStep('generating-full-plan');

    const totalAgents = targets.length * 5;
    setProgressTotal(totalAgents);
    setProgressCurrent(0);
    setCompletedSteps([]);
    setLoadingMessage('일괄 생성 준비 중...');

    const agentEtaMs = 90000;
    startTimer(totalAgents * agentEtaMs);

    const controller = new AbortController();
    abortRef.current = controller;

    let globalProgress = 0;
    const allNewPlans: BusinessPlan[] = [];
    const failedNames: string[] = [];

    for (const draft of targets) {
      if (controller.signal.aborted) break;
      const idea = ideas.find((i) => i.id === draft.ideaId);
      if (!idea) continue;

      try {
        setLoadingMessage(`[${allNewPlans.length + 1}/${targets.length}] "${idea.name}" 시장 조사 중...`);

        const newFullPlan = await runFullPlanPipeline(idea, (_, label) => {
          globalProgress++;
          setProgressCurrent(globalProgress);
          setCompletedSteps(prev => [...prev, `[${globalProgress}/${totalAgents}] ${label}`]);
        }, draft.content);

        allNewPlans.push(newFullPlan);
      } catch (err) {
        if (controller.signal.aborted) break;
        // 개별 실패: 건너뛰고 다음으로 진행
        globalProgress = (allNewPlans.length + failedNames.length + 1) * 5;
        setProgressCurrent(globalProgress);
        failedNames.push(idea.name);
        setCompletedSteps(prev => [...prev, `"${idea.name}" 생성 실패 — ${err instanceof Error ? err.message : '알 수 없는 오류'}`]);
      }
    }

    if (controller.signal.aborted) {
      abortRef.current = null;
      setIsLoading(false);
      setLoadingMessage('');
      stopTimer();
      setStep('view-plan');
      return;
    }

    if (allNewPlans.length > 0) {
      const prevFiltered = fullBusinessPlans.filter(p => !allNewPlans.some(np => np.ideaId === p.ideaId));
      const newPlans = [...prevFiltered, ...allNewPlans];
      setFullBusinessPlans(newPlans);
      setCurrentFullPlanIndex(prevFiltered.length); // 첫 번째 새 플랜으로
      setStep('view-full-plan');
    } else {
      setError(`모든 기획서 생성에 실패했습니다: ${failedNames.join(', ')}`);
      setStep('view-plan');
    }

    abortRef.current = null;
    setIsLoading(false);
    setLoadingMessage('');
    stopTimer();
  }

  /** 4개 에이전트 출력물에서 섹션을 추출해 1→2→3→...→참고문헌 순서로 합친다 */
  function combineFullPlanSections(
    ideaName: string,
    marketContent: string,      // 섹션 2, 3, 8
    competitionContent: string, // 섹션 5, 6, 7
    strategyContent: string,    // 섹션 1, 4, 9, 10
    financeContent: string      // 섹션 11, 12, 13, 참고문헌
  ): string {
    /**
     * content 내에서 sectionNum 번호의 섹션을 추출한다.
     * "## 2." / "## **2.**" / "## 2. 제목" 등 다양한 형태를 처리.
     */
    function getSection(content: string, sectionNum: number | '참고문헌'): string {
      const normalized = '\n' + content; // 첫 섹션도 \n## 로 찾을 수 있게

      let startIdx: number;
      if (sectionNum === '참고문헌') {
        const m = normalized.match(/\n#{2,3}\s+\**참고문헌/);
        if (!m || m.index === undefined) return '';
        startIdx = m.index + 1;
      } else {
        // H2/H3 + 마침표·콜론·괄호·공백 등 다양한 LLM 헤딩 변형 대응
        // 예: "## 2. 트렌드" / "### **2:** 트렌드" / "## 2) 트렌드" / "## 2 트렌드"
        const pattern = new RegExp(
          `\n#{2,3}\\s+\\**${sectionNum}(?:[.．:：)\\)]|\\s+(?=[가-힣A-Z]))(?![0-9])`
        );
        const m = normalized.match(pattern);
        if (!m || m.index === undefined) return '';
        startIdx = m.index + 1;
      }

      // 다음 ##/### 섹션이 시작되는 위치 찾기
      const rest = normalized.slice(startIdx + 1);
      const nextMatch = rest.match(/\n#{2,3}\s/);
      const endIdx = nextMatch?.index !== undefined
        ? startIdx + 1 + nextMatch.index
        : normalized.length;

      return normalized.slice(startIdx, endIdx).trim();
    }

    // 에이전트별 섹션 추출 + 누락 로깅
    const agentSections: Record<string, { nums: (number | '참고문헌')[]; content: string }> = {
      market:      { nums: [2, 3, 8],                   content: marketContent },
      competition: { nums: [5, 6, 7],                   content: competitionContent },
      strategy:    { nums: [1, 4, 9, 10],               content: strategyContent },
      finance:     { nums: [11, 12, 13, '참고문헌'],    content: financeContent },
    };
    const missingByAgent: Record<string, (number | '참고문헌')[]> = {};
    for (const [agent, { nums, content }] of Object.entries(agentSections)) {
      const missing = nums.filter(n => !getSection(content, n));
      if (missing.length > 0) missingByAgent[agent] = missing;
    }
    if (Object.keys(missingByAgent).length > 0) {
      const parts = Object.entries(missingByAgent).map(([a, nums]) => `${a}: 섹션 ${nums.join(', ')}`);
      console.warn(`[combineFullPlanSections] 누락: ${parts.join(' | ')}`);
    }

    const ordered = [
      getSection(strategyContent, 1),
      getSection(marketContent, 2),
      getSection(marketContent, 3),
      getSection(strategyContent, 4),
      getSection(competitionContent, 5),
      getSection(competitionContent, 6),
      getSection(competitionContent, 7),
      getSection(marketContent, 8),
      getSection(strategyContent, 9),
      getSection(strategyContent, 10),
      getSection(financeContent, 11),
      getSection(financeContent, 12),
      getSection(financeContent, 13),
      getSection(financeContent, '참고문헌'),
    ].filter(Boolean);

    // 섹션 추출이 절반 이하로 실패하면 raw 조합으로 fallback
    if (ordered.length < 7) {
      console.warn(`[combineFullPlanSections] 섹션 ${ordered.length}개만 추출됨 → raw 조합으로 대체`);
      const raw = [strategyContent, marketContent, competitionContent, financeContent]
        .filter(Boolean)
        .join('\n\n---\n\n');
      return sanitizeMarkdown(`# ${ideaName} 사업기획서 (풀버전)\n\n${raw}`);
    }

    const combined = `# ${ideaName} 사업기획서 (풀버전)\n\n${ordered.join('\n\n---\n\n')}`;
    return sanitizeMarkdown(combined);
  }

  /** 줄이 ASCII art 다이어그램의 일부인지 판별 */
  function isDiagramLine(line: string): boolean {
    // Box drawing characters (강한 신호)
    if (/[│─┌┐└┘├┤┬┴┼╔╗╚╝║═┃━┏┓┗┛╭╮╯╰]/.test(line)) return true;
    // 화살표 + 넓은 공백 조합 (포지셔닝 다이어그램)
    if (/[→←↑↓▲▼●○◆]/.test(line) && /\s{3,}/.test(line)) return true;
    return false;
  }

  /** ASCII art 다이어그램을 코드 펜스로 감싸서 모노스페이스 렌더링 */
  function wrapDiagramBlocks(md: string): string {
    // 이미 코드 펜스 안에 있는 부분은 건드리지 않음
    const parts = md.split(/(```[\s\S]*?```)/);

    return parts.map((part, idx) => {
      if (idx % 2 === 1) return part; // 코드 블록 내용은 그대로

      const lines = part.split('\n');
      const output: string[] = [];
      let i = 0;

      while (i < lines.length) {
        if (isDiagramLine(lines[i])) {
          const block: string[] = [];
          let lastDiagramIdx = 0;

          // 다이어그램 블록 수집 (다이어그램 줄 + 사이의 라벨/빈줄)
          while (i < lines.length) {
            if (isDiagramLine(lines[i])) {
              lastDiagramIdx = block.length;
              block.push(lines[i]);
              i++;
            } else if (
              (lines[i].trim() === '' || (lines[i].trim().length < 50 && !lines[i].startsWith('#') && !/^\|.+\|$/.test(lines[i].trim()))) &&
              block.length - lastDiagramIdx < 3
            ) {
              block.push(lines[i]);
              i++;
            } else {
              break;
            }
          }

          // 끝부분의 빈 줄 제거
          while (block.length > 0 && block[block.length - 1].trim() === '') {
            block.pop();
            i--;
          }

          // 다이어그램 줄이 2개 이상이면 코드 펜스로 감싸기
          const diagramCount = block.filter(l => isDiagramLine(l)).length;
          if (diagramCount >= 2) {
            output.push('', '```', ...block, '```', '');
          } else {
            output.push(...block);
          }
        } else {
          output.push(lines[i]);
          i++;
        }
      }

      return output.join('\n');
    }).join('');
  }

  /** 줄바꿈 없이 한 줄에 이어붙여진 마크다운 표를 복원 */
  function fixBrokenTables(content: string): string {
    return content.split('\n').map(line => {
      // 200자 미만이거나 |---| 패턴이 없으면 정상 행
      if (line.length < 200 || !line.includes('|---')) return line;

      // 구분선에서 컬럼 수 추출: |---|---|---| → 3컬럼
      const sepMatch = line.match(/\|(-{3,}\|)+/);
      if (!sepMatch) return line;
      const colCount = (sepMatch[0].match(/-{3,}/g) || []).length;
      if (colCount < 2) return line;

      // 파이프 위치를 수집해 (colCount+1)개씩 끊어 행 분리
      const pipesPerRow = colCount + 1;
      const pipePositions: number[] = [];
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '|') pipePositions.push(i);
      }
      if (pipePositions.length < pipesPerRow) return line;

      const rows: string[] = [];
      for (let i = 0; i + pipesPerRow - 1 < pipePositions.length; i += pipesPerRow) {
        rows.push(line.slice(pipePositions[i], pipePositions[i + pipesPerRow - 1] + 1).trim());
      }
      return rows.length > 1 ? rows.join('\n') : line;
    }).join('\n');
  }

  /** 마크다운 표·코드블록 앞뒤에 빈 줄 보장 + 다이어그램 코드펜스 래핑 */
  function sanitizeMarkdown(md: string): string {
    // 0. 근본 정규화: CRLF→LF, 공백전용 줄→빈 줄, 테이블 행 trailing whitespace 제거
    let result = md
      .replace(/\r\n/g, '\n')
      .replace(/^[ \t]+$/gm, '')
      .replace(/^(\|.*\|)[ \t]+$/gm, '$1');
    // 0.5. 깨진 테이블 복원: 줄바꿈 없이 한 줄에 이어붙여진 표 행을 분리
    result = fixBrokenTables(result);
    // 1. 표 행 사이의 빈 줄 제거: |로 시작하는 연속 행들 사이의 공백 줄을 제거
    while (/(\|[^\n]+\|)\n\n+(\|)/.test(result)) {
      result = result.replace(/(\|[^\n]+\|)\n\n+(\|)/g, '$1\n$2');
    }
    // 2. ASCII art 다이어그램을 코드 펜스로 감싸기
    result = wrapDiagramBlocks(result);

    return result
      // 3. 표 블록 앞에 빈 줄 보장 (이전 줄이 | 로 끝나지 않는 경우만 — 테이블 행 사이는 건드리지 않음)
      .replace(/([^\n|])\n(\|[^\n]+\|)/g, '$1\n\n$2')
      // 4. 표 블록 뒤에 빈 줄 보장 (다음 줄이 | 로 시작하지 않는 경우만)
      .replace(/(\|[^\n]+\|)\n([^\n|])/g, '$1\n\n$2')
      // 코드블록 앞뒤에 빈 줄 보장
      .replace(/([^\n])\n(```)/g, '$1\n\n$2')
      .replace(/(```)\n([^\n])/g, '$1\n\n$2')
      // 헤딩 앞에 빈 줄 보장
      .replace(/([^\n])\n(#{2,4}\s)/g, '$1\n\n$2')
      // 연속 빈 줄 3개 이상을 2개로 정리
      .replace(/\n{4,}/g, '\n\n\n');
  }

  function stripMarkdownForAI(content: string): string {
    return content
      .replace(/^#{1,6}\s+/gm, '')               // 헤딩 기호 제거
      .replace(/\*\*(.*?)\*\*/g, '$1')            // 볼드 제거
      .replace(/\*(.*?)\*/g, '$1')               // 이탤릭 제거
      .replace(/`([^`]+)`/g, '$1')               // 인라인 코드 제거
      .replace(/^\s*[-]\s+/gm, '• ')             // 불릿 통일
      .replace(/^(\s*)\|\s*[-:]+\s*\|.*/gm, '')  // 표 구분선 제거
      .replace(/---+/gm, '')                     // 수평선 제거
      .replace(/>\s?(.*)/gm, '$1')               // 인용 기호 제거
      .replace(/\n{3,}/g, '\n\n')                // 연속 빈 줄 압축
      .trim();
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setPrdCopied(true);
    setTimeout(() => setPrdCopied(false), 2000);
  }

  function reset() {
    stopTimer();
    setStep('keyword');
    setKeyword('');
    setIdeas([]);
    setSelectedIdeas([]);
    setBusinessPlans([]);
    setCurrentPlanIndex(0);
    setFullBusinessPlans([]);
    setCurrentFullPlanIndex(0);
    setPRDs([]);
    setCurrentPRDIndex(0);
    setError(null);
    setRawResponse('');
    setImportedPlanContent(null);
  }

  const C = CANYON;

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg }}>

      {/* ── 상단 네비게이션 ────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-20"
        style={{ backgroundColor: C.cardBg, borderBottom: `1px solid ${C.border}` }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm transition hover:opacity-70"
            style={{ color: C.textMid }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            홈으로
          </Link>
          <Link href="/" className="flex items-center gap-2 transition hover:opacity-70">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${C.amber}, ${C.amberLight})` }}
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="font-semibold text-sm" style={{ color: C.textDark }}>My CSO</span>
          </Link>
          {/* 프리셋 상태 */}
          <div className="text-xs">
            {availableProviders.claude === null ? (
              <span style={{ color: C.textLight }}>확인 중...</span>
            ) : isProviderReady() ? (
              <span className="flex items-center gap-1" style={{ color: C.success }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                {PRESET_INFO[selectedPreset].label} 모드
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-500">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                API 키 미설정
              </span>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-10 px-4">

        {/* ── 진행 단계 표시 (Phase Indicator) ──────────────────── */}
        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-1">
            {(['키워드 입력', '아이디어 선택', '기획서 초안 작성', '기획서 상세 작성', '개발문서 생성', '완료'] as const).map((label, idx) => {
              const stepOrder: WorkflowStep[] = ['keyword', 'select-ideas', 'view-plan', 'view-full-plan', 'view-prd', 'complete'];
              // 로딩 중인 스텝은 도달 예정 단계로 매핑
              const effectiveStep =
                step === 'generating-ideas' ? 'select-ideas' :
                step === 'generating-plan' ? 'view-plan' :
                step === 'generating-full-plan' ? 'view-full-plan' :
                step === 'generating-prd' ? 'view-prd' : step;
              const currentIdx = stepOrder.indexOf(effectiveStep);
              const isActive = idx <= currentIdx;
              const isLoading = step.startsWith('generating');
              // 클릭 가능 조건: 이미 지나온 단계 + 로딩 중이 아님 + 데이터 존재
              const canNavigate = !isLoading && idx <= currentIdx && (
                idx === 0 ||
                (idx === 1 && ideas.length > 0) ||
                (idx === 2 && businessPlans.length > 0) ||
                (idx === 3 && fullBusinessPlans.length > 0) ||
                (idx === 4 && prds.length > 0) ||
                idx === 5
              );
              return (
                <div key={label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
                      style={{
                        ...(isActive
                          ? { background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff' }
                          : { backgroundColor: '#F0D5C0', color: C.textLight }),
                        cursor: canNavigate && stepOrder[idx] !== step ? 'pointer' : 'default',
                      }}
                      onClick={() => { if (canNavigate) setStep(stepOrder[idx]); }}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className="mt-1 text-xs whitespace-nowrap"
                      style={{
                        color: isActive ? C.textDark : C.textLight,
                        cursor: canNavigate && stepOrder[idx] !== step ? 'pointer' : 'default',
                      }}
                      onClick={() => { if (canNavigate) setStep(stepOrder[idx]); }}
                    >
                      {label}
                    </span>
                  </div>
                  {idx < 5 && (
                    <div
                      className="w-6 h-px mx-1 mb-4"
                      style={{ backgroundColor: idx < currentIdx ? C.accent : '#F0D5C0' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 rounded-xl text-sm" style={{ backgroundColor: C.error, border: `1px solid ${C.errorBorder}`, color: C.errorText }}>
            {error}
          </div>
        )}

        {/* Step: Keyword Input */}
        {step === 'keyword' && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            {/* AI 품질 프리셋 선택 */}
            <div className="mb-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: C.textLight }}>
                AI 품질 모드 선택
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(PRESET_INFO) as QualityPreset[]).map((preset) => {
                  const info = PRESET_INFO[preset];
                  const isSelected = selectedPreset === preset;
                  const ready = (() => {
                    const types = Object.keys(MODULE_PRESETS[preset]);
                    return types.every(type => {
                      const chain = MODULE_PRESETS[preset][type];
                      return chain.some(c => availableProviders[c.provider] === true);
                    });
                  })();
                  const checking = Object.values(availableProviders).some(v => v === null);
                  return (
                    <div
                      key={preset}
                      onClick={() => setSelectedPreset(preset)}
                      className="relative p-4 rounded-xl text-left transition cursor-pointer"
                      style={isSelected
                        ? { border: `2px solid ${C.accent}`, backgroundColor: C.selectedBg }
                        : { border: `2px solid ${C.border}`, backgroundColor: '#fff' }
                      }
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-base" style={{ color: C.textDark }}>
                          {preset === 'standard' ? '⚡ ' : '✦ '}{info.label}
                        </div>
                        {checking ? (
                          <span className="text-xs" style={{ color: C.textLight }}>…</span>
                        ) : ready ? (
                          <span className="text-xs text-emerald-600">●</span>
                        ) : (
                          <span className="text-xs text-red-400">●</span>
                        )}
                      </div>
                      <div className="text-sm font-medium mb-1" style={{ color: C.accent }}>{info.description}</div>
                      <div className="text-xs" style={{ color: C.textLight }}>{info.detail}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <h2 className="text-xl font-semibold mb-2" style={{ color: C.textDark }}>
              서비스 아이템을 브레인스토밍해보려고 합니다
            </h2>
            <p className="mb-6 text-sm" style={{ color: C.textMid }}>
              특별히 원하는 키워드가 있으면 넣어주세요. (옵션 — 비워두면 AI가 자동 선정)
            </p>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && isProviderReady()) generateIdeas(); }}
              placeholder="예: AI, 헬스케어, 교육, 생산성..."
              className="w-full px-4 py-3 rounded-xl outline-none transition"
              style={{
                border: `1.5px solid ${C.border}`,
                backgroundColor: '#fff',
                color: C.textDark,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
              onBlur={e => (e.currentTarget.style.borderColor = C.border)}
            />
            <div className="mt-6 flex justify-end">
              <button
                onClick={generateIdeas}
                disabled={!isProviderReady()}
                className="px-7 py-3 rounded-xl font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`,
                  color: '#fff',
                  boxShadow: `0 4px 16px rgba(194,75,37,0.3)`,
                }}
              >
                아이디어 발굴 시작 →
              </button>
            </div>
          </div>
        )}

        {/* Step: Generating Ideas */}
        {step === 'generating-ideas' && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            <h2 className="text-xl font-semibold mb-5" style={{ color: C.textDark }}>아이디어 발굴 중</h2>
            <div className="flex gap-8 mb-5">
              <div>
                <div className="text-xs mb-0.5" style={{ color: C.textLight }}>경과 시간</div>
                <div className="font-mono text-base font-semibold" style={{ color: C.textDark }}>{formatTime(elapsedSeconds)}</div>
              </div>
              {etaSeconds !== null && (
                <div>
                  <div className="text-xs mb-0.5" style={{ color: C.textLight }}>예상 완료</div>
                  <div className="font-mono text-base font-semibold" style={{ color: C.amber }}>
                    {etaSeconds > 0 ? `약 ${formatTime(etaSeconds)} 후` : '거의 완료...'}
                  </div>
                </div>
              )}
            </div>
            <div className="mb-1 flex justify-between items-center text-sm">
              <span style={{ color: C.textMid }}>{progressCurrent} / {progressTotal}단계 완료</span>
              <span className="font-semibold" style={{ color: C.amber }}>{Math.round((progressCurrent / progressTotal) * 100)}%</span>
            </div>
            <div className="w-full rounded-full h-2 mb-6" style={{ backgroundColor: '#F0D5C0' }}>
              <div className="h-2 rounded-full transition-all duration-700 ease-in-out" style={{ width: `${Math.round((progressCurrent / progressTotal) * 100)}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.amber})` }} />
            </div>
            <div className="space-y-2 mb-4">
              {completedSteps.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 text-sm" style={{ color: C.textMid }}>
                  <svg className="w-4 h-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {msg}
                </div>
              ))}
            </div>
            {progressCurrent < progressTotal && (
              <div className="flex items-center gap-2 text-sm" style={{ color: C.accent }}>
                <div className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full flex-shrink-0" style={{ borderColor: C.accent, borderTopColor: 'transparent' }} />
                {loadingMessage}
              </div>
            )}
          </div>
        )}

        {/* Step: Select Ideas */}
        {step === 'select-ideas' && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold" style={{ color: C.textDark }}>
                진행할 아이디어를 선택해주세요
              </h2>
              {lastGenTime && (
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: C.cream, color: C.textMid }}>
                  ⚡ {lastGenTime.label}으로 {formatTime(lastGenTime.seconds)} 만에 생성
                </span>
              )}
            </div>
            <p className="text-sm mb-6" style={{ color: C.textMid }}>
              상세 사업기획서를 작성할 아이디어를 선택하세요. (복수 선택 가능)
            </p>

            <div className="space-y-4 mb-6">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  onClick={() => toggleIdeaSelection(idea.id)}
                  className="p-5 rounded-xl cursor-pointer transition-all"
                  style={selectedIdeas.includes(idea.id)
                    ? { border: `2px solid ${C.accent}`, backgroundColor: C.selectedBg }
                    : { border: `2px solid ${C.border}`, backgroundColor: '#fff' }
                  }
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center mt-0.5 flex-shrink-0 transition-all"
                      style={selectedIdeas.includes(idea.id)
                        ? { background: `linear-gradient(135deg, ${C.accent}, ${C.amber})` }
                        : { border: `2px solid ${C.border}`, backgroundColor: '#fff' }
                      }
                    >
                      {selectedIdeas.includes(idea.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="font-semibold text-base" style={{ color: C.textDark }}>{idea.name}</h3>
                        {idea.category && (
                          <span className="px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: C.selectedBg, color: C.accent, border: `1px solid ${C.border}` }}>
                            {idea.category}
                          </span>
                        )}
                        {idea.mvpDifficulty && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            idea.mvpDifficulty === '하' ? 'bg-emerald-50 text-emerald-700' :
                            idea.mvpDifficulty === '중' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-red-50 text-red-600'
                          }`}>
                            난이도 {idea.mvpDifficulty}
                          </span>
                        )}
                      </div>
                      <p className="text-sm mb-2" style={{ color: C.textDark }}>{idea.oneLiner}</p>
                      {idea.problem && (
                        <p className="text-xs mb-2" style={{ color: C.textMid }}>
                          <span className="font-medium">해결 문제:</span> {idea.problem}
                        </p>
                      )}
                      <div className="text-xs flex flex-wrap gap-x-4 gap-y-1 mb-2" style={{ color: C.textMid }}>
                        <span>타깃: {idea.target}</span>
                        <span>수익모델: {idea.revenueModel}</span>
                      </div>
                      {idea.features && idea.features.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {idea.features.map((feature, idx) => (
                            <span key={idx} className="px-2 py-0.5 text-xs rounded-md" style={{ backgroundColor: '#F0D5C0', color: C.textMid }}>
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Raw Response Toggle */}
            <details className="mb-6">
              <summary className="cursor-pointer text-xs" style={{ color: C.textLight }}>AI 원본 응답 보기</summary>
              <pre className="mt-2 p-4 rounded-xl text-xs overflow-auto max-h-64 whitespace-pre-wrap" style={{ backgroundColor: '#F0D5C0', color: C.textDark }}>
                {rawResponse}
              </pre>
            </details>

            <div className="flex justify-between items-center gap-3 flex-wrap">
              <button onClick={reset} className="px-5 py-2.5 rounded-xl text-sm transition" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>처음으로</button>
              <button onClick={() => window.location.href = '/'} className="px-5 py-2.5 rounded-xl text-sm text-red-600 transition" style={{ border: `1px solid ${C.errorBorder}`, backgroundColor: C.error }}>진행 중단</button>
              <button
                onClick={generateBusinessPlan}
                disabled={selectedIdeas.length === 0}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff', boxShadow: `0 4px 12px rgba(194,75,37,0.25)` }}
              >
                사업기획서 작성 ({selectedIdeas.length}개 선택)
              </button>
            </div>
          </div>
        )}

        {/* Step: Generating Plan */}
        {step === 'generating-plan' && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            <h2 className="text-xl font-semibold mb-5" style={{ color: C.textDark }}>사업기획서 작성 중</h2>
            <div className="flex gap-8 mb-5">
              <div>
                <div className="text-xs mb-0.5" style={{ color: C.textLight }}>경과 시간</div>
                <div className="font-mono text-base font-semibold" style={{ color: C.textDark }}>{formatTime(elapsedSeconds)}</div>
              </div>
              {etaSeconds !== null && (
                <div>
                  <div className="text-xs mb-0.5" style={{ color: C.textLight }}>예상 완료</div>
                  <div className="font-mono text-base font-semibold" style={{ color: C.amber }}>
                    {etaSeconds > 0 ? `약 ${formatTime(etaSeconds)} 후` : '거의 완료...'}
                  </div>
                </div>
              )}
            </div>
            <div className="mb-1 flex justify-between items-center text-sm">
              <span style={{ color: C.textMid }}>{progressCurrent} / {progressTotal}단계 완료</span>
              <span className="font-semibold" style={{ color: C.amber }}>{Math.round((progressCurrent / progressTotal) * 100)}%</span>
            </div>
            <div className="w-full rounded-full h-2 mb-6" style={{ backgroundColor: '#F0D5C0' }}>
              <div className="h-2 rounded-full transition-all duration-700 ease-in-out" style={{ width: `${Math.round((progressCurrent / progressTotal) * 100)}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.amber})` }} />
            </div>
            <div className="space-y-2 mb-4">
              {completedSteps.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 text-sm" style={{ color: C.textMid }}>
                  <svg className="w-4 h-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {msg}
                </div>
              ))}
            </div>
            {progressCurrent < progressTotal && (
              <div className="flex items-center gap-2 text-sm" style={{ color: C.accent }}>
                <div className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full flex-shrink-0" style={{ borderColor: C.accent, borderTopColor: 'transparent' }} />
                {loadingMessage}
              </div>
            )}
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleAbortGeneration}
                className="px-5 py-2 rounded-xl text-sm font-medium transition hover:opacity-80"
                style={{ backgroundColor: C.cream, color: C.accent, border: `1px solid ${C.accent}` }}
              >
                작성중지
              </button>
            </div>
          </div>
        )}

        {/* Step: View Plan */}
        {step === 'view-plan' && businessPlans.length > 0 && (
          <div className="rounded-2xl p-8 overflow-hidden" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            {/* Plan Tabs */}
            {businessPlans.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {businessPlans.map((plan, idx) => (
                  <button
                    key={plan.ideaId}
                    onClick={() => setCurrentPlanIndex(idx)}
                    className="px-4 py-2 rounded-xl text-sm whitespace-nowrap font-medium transition"
                    style={currentPlanIndex === idx
                      ? { background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff' }
                      : { backgroundColor: '#F0D5C0', color: C.textMid }
                    }
                  >
                    {plan.ideaName}
                  </button>
                ))}
              </div>
            )}

            {/* Current Plan */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: C.textDark }}>
                    {businessPlans[currentPlanIndex].ideaName}
                  </h2>
                  {importedPlanContent ? (
                    <span className="text-xs mt-1 inline-block px-2 py-0.5 rounded-full" style={{ backgroundColor: C.selectedBg, color: C.accent, border: `1px solid ${C.border}` }}>
                      가져온 기획서
                    </span>
                  ) : lastGenTime ? (
                    <span className="text-xs mt-1 inline-block" style={{ color: C.textLight }}>
                      ⚡ {lastGenTime.label}으로 {formatTime(lastGenTime.seconds)} 만에 생성
                    </span>
                  ) : null}
                </div>
                <button
                  onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition"
                  style={{ border: `1px solid ${C.border}`, color: C.textMid }}
                >
                  아래로 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
              <div className="mb-6" style={{ overflowWrap: 'break-word', wordBreak: 'break-word', overflow: 'hidden' }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({ children }) => (
                      <div className="px-4 py-2 rounded-lg font-bold text-base mt-8 mb-3" style={{ backgroundColor: C.textDark, color: C.cream }}>
                        {children}
                      </div>
                    ),
                    h3: ({ children }) => (
                      <div className="px-4 py-2 font-semibold text-sm mt-5 mb-2 border-l-4" style={{ backgroundColor: C.selectedBg, color: C.accent, borderColor: C.accent }}>
                        {children}
                      </div>
                    ),
                    h4: ({ children }) => (
                      <div className="pl-3 font-semibold text-sm mt-4 mb-1 border-l-4" style={{ borderColor: C.border, color: C.textMid }}>
                        {children}
                      </div>
                    ),
                    p: ({ children }) => <p className="text-sm leading-7 my-2" style={{ color: C.textDark }}>{children}</p>,
                    ul: ({ children }) => <ul className="ml-5 my-2 space-y-1 list-disc">{children}</ul>,
                    ol: ({ children }) => <ol className="ml-5 my-2 space-y-1 list-decimal">{children}</ol>,
                    li: ({ children }) => <li className="text-sm leading-7" style={{ color: C.textDark }}>{children}</li>,
                    strong: ({ children }) => <strong className="font-bold" style={{ color: C.textDark }}>{children}</strong>,
                    table: ({ children }) => <div className="overflow-x-auto my-4"><table className="w-full border-collapse text-sm">{children}</table></div>,
                    thead: ({ children }) => <thead style={{ backgroundColor: '#F0D5C0' }}>{children}</thead>,
                    tbody: ({ children }) => <tbody className="divide-y" style={{ borderColor: C.border }}>{children}</tbody>,
                    tr: ({ children }) => <tr style={{ ['&:hover' as string]: { backgroundColor: C.selectedBg } }}>{children}</tr>,
                    th: ({ children }) => <th className="px-3 py-2 text-left text-sm font-semibold" style={{ border: `1px solid ${C.border}`, color: C.textDark }}>{children}</th>,
                    td: ({ children }) => <td className="px-3 py-2 text-sm leading-6" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>{children}</td>,
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-sm" style={{ color: C.accent }}>{children}</a>,
                    img: ({ src, alt }) => src ? <img src={src} alt={alt || ''} className="max-w-full h-auto my-2 rounded" /> : null,
                    hr: () => <hr className="my-6" style={{ borderColor: C.border }} />,
                    blockquote: ({ children }) => <blockquote className="my-4 px-4 py-3 rounded-lg border-l-4 text-sm" style={{ backgroundColor: '#FEF9E7', borderColor: '#F5901E', color: C.textDark }}>{children}</blockquote>,
                    pre: ({ children }) => <pre className="whitespace-pre overflow-x-auto my-4 p-4 rounded-xl text-xs leading-5" style={{ backgroundColor: '#F5EDE6', color: C.textDark, fontFamily: 'var(--font-mono), monospace' }}>{children}</pre>,
                    code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
                      const raw = String(children).replace(/\n$/, '');
                      if (/language-chart/.test(className || ''))
                        return <ChartRenderer json={raw} />;
                      if (/language-mermaid/.test(className || ''))
                        return <MermaidDiagram chart={raw} />;
                      return <code style={{ fontFamily: 'var(--font-mono), monospace' }}>{children}</code>;
                    },
                  }}
                >
                  {sanitizeMarkdown(businessPlans[currentPlanIndex].content)}
                </ReactMarkdown>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-3 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <button onClick={reset} className="px-5 py-2.5 rounded-xl text-sm transition" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>새로 시작</button>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs transition" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  위로
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => saveFile(businessPlans[currentPlanIndex], 'bizplan', 'md')} className="px-4 py-2.5 rounded-xl text-sm font-medium transition" style={{ border: `1px solid ${C.border}`, color: C.textMid, backgroundColor: '#fff' }}>.md 저장</button>
                  <button type="button" onClick={() => saveFile(businessPlans[currentPlanIndex], 'bizplan', 'docx')} className="px-4 py-2.5 rounded-xl text-sm font-medium transition" style={{ backgroundColor: C.docxSave, color: '#fff' }}>.docx 저장</button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <button onClick={() => generatePRD()} className="px-7 py-2.5 rounded-xl text-sm font-semibold transition" style={{ backgroundColor: C.textDark, color: C.cream }}>
                  개발문서(PRD) 생성하기
                </button>
                <button onClick={() => generateFullPlan()} className="px-7 py-2.5 rounded-xl text-sm font-semibold transition" style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff', boxShadow: `0 4px 12px rgba(194,75,37,0.25)` }}>
                  풀버전 사업기획서 생성 (에이전트 팀)
                </button>
                {(() => {
                  const remaining = businessPlans.filter(d => !fullBusinessPlans.some(f => f.ideaId === d.ideaId));
                  return remaining.length >= 2 ? (
                    <button onClick={generateFullPlanBatch} className="px-7 py-2.5 rounded-xl text-sm font-semibold transition" style={{ border: `2px solid ${C.accent}`, color: C.accent, backgroundColor: 'transparent' }}>
                      전체 풀버전 일괄 생성 ({remaining.length}개)
                    </button>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Step: Generating PRD */}
        {step === 'generating-prd' && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            <h2 className="text-xl font-semibold mb-5" style={{ color: C.textDark }}>개발문서(PRD) 작성 중</h2>
            <div className="flex gap-8 mb-5">
              <div>
                <div className="text-xs mb-0.5" style={{ color: C.textLight }}>경과 시간</div>
                <div className="font-mono text-base font-semibold" style={{ color: C.textDark }}>{formatTime(elapsedSeconds)}</div>
              </div>
              {etaSeconds !== null && (
                <div>
                  <div className="text-xs mb-0.5" style={{ color: C.textLight }}>예상 완료</div>
                  <div className="font-mono text-base font-semibold" style={{ color: C.amber }}>
                    {etaSeconds > 0 ? `약 ${formatTime(etaSeconds)} 후` : '거의 완료...'}
                  </div>
                </div>
              )}
            </div>
            <div className="mb-1 flex justify-between items-center text-sm">
              <span style={{ color: C.textMid }}>{progressCurrent} / {progressTotal}단계 완료</span>
              <span className="font-semibold" style={{ color: C.amber }}>{Math.round((progressCurrent / progressTotal) * 100)}%</span>
            </div>
            <div className="w-full rounded-full h-2 mb-6" style={{ backgroundColor: '#F0D5C0' }}>
              <div className="h-2 rounded-full transition-all duration-700 ease-in-out" style={{ width: `${Math.round((progressCurrent / progressTotal) * 100)}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.amber})` }} />
            </div>
            <div className="space-y-2 mb-4">
              {completedSteps.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 text-sm" style={{ color: C.textMid }}>
                  <svg className="w-4 h-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {msg}
                </div>
              ))}
            </div>
            {progressCurrent < progressTotal && (
              <div className="flex items-center gap-2 text-sm" style={{ color: C.accent }}>
                <div className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full flex-shrink-0" style={{ borderColor: C.accent, borderTopColor: 'transparent' }} />
                {loadingMessage || 'PRD 초안을 작성하는 중입니다...'}
              </div>
            )}
          </div>
        )}

        {/* Step: Generating Full Plan */}
        {step === 'generating-full-plan' && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold" style={{ color: C.textDark }}>풀버전 사업기획서 작성 중</h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full" style={{ backgroundColor: C.selectedBg, color: C.accent, border: `1px solid ${C.border}` }}>에이전트 팀</span>
              {batchCount >= 2 && (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full" style={{ backgroundColor: C.amber, color: '#fff' }}>{batchCount}개 일괄 생성</span>
              )}
            </div>
            <p className="text-sm mb-5" style={{ color: C.textMid }}>
              {batchCount >= 2
                ? `${batchCount}개 기획서를 순차적으로 생성합니다. 각 기획서마다 4개 에이전트가 심층 분석합니다.`
                : '4개 전문 에이전트가 순차적으로 각 섹션을 심층 분석합니다.'}
            </p>
            <div className="flex gap-8 mb-5">
              <div>
                <div className="text-xs mb-0.5" style={{ color: C.textLight }}>경과 시간</div>
                <div className="font-mono text-base font-semibold" style={{ color: C.textDark }}>{formatTime(elapsedSeconds)}</div>
              </div>
              {etaSeconds !== null && (
                <div>
                  <div className="text-xs mb-0.5" style={{ color: C.textLight }}>예상 완료</div>
                  <div className="font-mono text-base font-semibold" style={{ color: C.amber }}>
                    {etaSeconds > 0 ? `약 ${formatTime(etaSeconds)} 후` : '거의 완료...'}
                  </div>
                </div>
              )}
            </div>
            <div className="mb-1 flex justify-between items-center text-sm">
              <span style={{ color: C.textMid }}>{progressCurrent} / {progressTotal}단계 완료</span>
              <span className="font-semibold" style={{ color: C.amber }}>{Math.round((progressCurrent / progressTotal) * 100)}%</span>
            </div>
            <div className="w-full rounded-full h-2 mb-6" style={{ backgroundColor: '#F0D5C0' }}>
              <div className="h-2 rounded-full transition-all duration-700 ease-in-out" style={{ width: `${Math.round((progressCurrent / progressTotal) * 100)}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.amber})` }} />
            </div>
            <div className="space-y-2 mb-4">
              {completedSteps.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 text-sm" style={{ color: C.textMid }}>
                  <svg className="w-4 h-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {msg}
                </div>
              ))}
            </div>
            {progressCurrent < progressTotal && (
              <div className="flex items-center gap-2 text-sm" style={{ color: C.accent }}>
                <div className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full flex-shrink-0" style={{ borderColor: C.accent, borderTopColor: 'transparent' }} />
                {loadingMessage}
              </div>
            )}
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleAbortGeneration}
                className="px-5 py-2 rounded-xl text-sm font-medium transition hover:opacity-80"
                style={{ backgroundColor: C.cream, color: C.accent, border: `1px solid ${C.accent}` }}
              >
                작성중지
              </button>
            </div>
          </div>
        )}

        {/* Step: View Full Plan */}
        {step === 'view-full-plan' && fullBusinessPlans.length > 0 && (
          <div className="rounded-2xl p-8 overflow-hidden" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            {(() => {
              const draftsWithoutFull = businessPlans.filter(draft => !fullBusinessPlans.some(fp => fp.ideaId === draft.ideaId));
              const showTabs = fullBusinessPlans.length > 1 || draftsWithoutFull.length > 0;
              return showTabs ? (
                <div className="flex flex-wrap gap-2 mb-6">
                  {fullBusinessPlans.map((plan, idx) => (
                    <button key={plan.ideaId} onClick={() => setCurrentFullPlanIndex(idx)}
                      className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition"
                      style={currentFullPlanIndex === idx
                        ? { background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff' }
                        : { backgroundColor: '#F0D5C0', color: C.textMid }
                      }
                    >{plan.ideaName}</button>
                  ))}
                  {draftsWithoutFull.map(draft => (
                    <button key={draft.ideaId} onClick={() => generateFullPlan(draft)}
                      className="px-4 py-2 rounded-xl text-sm whitespace-nowrap transition"
                      style={{ border: `2px dashed ${C.border}`, color: C.textMid, backgroundColor: 'transparent' }}
                    >{draft.ideaName} — 풀버전 생성</button>
                  ))}
                </div>
              ) : null;
            })()}

            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold" style={{ color: C.textDark }}>{fullBusinessPlans[currentFullPlanIndex].ideaName}</h2>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full" style={{ backgroundColor: C.selectedBg, color: C.accent, border: `1px solid ${C.border}` }}>Full Version</span>
                </div>
                <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition"
                  style={{ border: `1px solid ${C.border}`, color: C.textMid }}
                >아래로 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
              </div>

              <div className="mb-6" style={{ overflowWrap: 'break-word', wordBreak: 'break-word', overflow: 'hidden' }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({ children }) => <div className="px-4 py-2 rounded-lg font-bold text-base mt-8 mb-3" style={{ backgroundColor: C.textDark, color: C.cream }}>{children}</div>,
                    h3: ({ children }) => <div className="px-4 py-2 font-semibold text-sm mt-5 mb-2 border-l-4" style={{ backgroundColor: C.selectedBg, color: C.accent, borderColor: C.accent }}>{children}</div>,
                    h4: ({ children }) => <div className="pl-3 font-semibold text-sm mt-4 mb-1 border-l-4" style={{ borderColor: C.border, color: C.textMid }}>{children}</div>,
                    p: ({ children }) => <p className="text-sm leading-7 my-2" style={{ color: C.textDark }}>{children}</p>,
                    ul: ({ children }) => <ul className="ml-5 my-2 space-y-1 list-disc">{children}</ul>,
                    ol: ({ children }) => <ol className="ml-5 my-2 space-y-1 list-decimal">{children}</ol>,
                    li: ({ children }) => <li className="text-sm leading-7" style={{ color: C.textDark }}>{children}</li>,
                    strong: ({ children }) => <strong className="font-bold" style={{ color: C.textDark }}>{children}</strong>,
                    table: ({ children }) => <div className="overflow-x-auto my-4"><table className="w-full border-collapse text-sm">{children}</table></div>,
                    thead: ({ children }) => <thead style={{ backgroundColor: '#F0D5C0' }}>{children}</thead>,
                    tbody: ({ children }) => <tbody className="divide-y" style={{ borderColor: C.border }}>{children}</tbody>,
                    tr: ({ children }) => <tr>{children}</tr>,
                    th: ({ children }) => <th className="px-3 py-2 text-left text-sm font-semibold" style={{ border: `1px solid ${C.border}`, color: C.textDark }}>{children}</th>,
                    td: ({ children }) => <td className="px-3 py-2 text-sm leading-6" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>{children}</td>,
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-sm" style={{ color: C.accent }}>{children}</a>,
                    img: ({ src, alt }) => src ? <img src={src} alt={alt || ''} className="max-w-full h-auto my-2 rounded" /> : null,
                    hr: () => <hr className="my-6" style={{ borderColor: C.border }} />,
                    blockquote: ({ children }) => <blockquote className="my-4 px-4 py-3 rounded-lg border-l-4 text-sm" style={{ backgroundColor: '#FEF9E7', borderColor: '#F5901E', color: C.textDark }}>{children}</blockquote>,
                    pre: ({ children }) => <pre className="whitespace-pre overflow-x-auto my-4 p-4 rounded-xl text-xs leading-5" style={{ backgroundColor: '#F5EDE6', color: C.textDark, fontFamily: 'var(--font-mono), monospace' }}>{children}</pre>,
                    code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
                      const raw = String(children).replace(/\n$/, '');
                      if (/language-chart/.test(className || ''))
                        return <ChartRenderer json={raw} />;
                      if (/language-mermaid/.test(className || ''))
                        return <MermaidDiagram chart={raw} />;
                      return <code style={{ fontFamily: 'var(--font-mono), monospace' }}>{children}</code>;
                    },
                  }}
                >
                  {sanitizeMarkdown(fullBusinessPlans[currentFullPlanIndex].content)}
                </ReactMarkdown>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-3 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => setStep('view-plan')} className="px-5 py-2.5 rounded-xl text-sm transition" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>초안 보기</button>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs transition" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>위로
                </button>
                <button onClick={reset} className="px-5 py-2.5 rounded-xl text-sm transition" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>새로 시작</button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => saveFile(fullBusinessPlans[currentFullPlanIndex], 'bizplan', 'md')} className="px-4 py-2.5 rounded-xl text-sm font-medium" style={{ border: `1px solid ${C.border}`, color: C.textMid, backgroundColor: '#fff' }}>.md 저장</button>
                  <button type="button" onClick={() => saveFile(fullBusinessPlans[currentFullPlanIndex], 'bizplan', 'docx')} className="px-4 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: C.docxSave, color: '#fff' }}>.docx 저장</button>
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                <button onClick={() => generatePRD(fullBusinessPlans[currentFullPlanIndex], 'view-full-plan')} className="px-7 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: C.textDark, color: C.cream }}>
                  개발문서(PRD) 생성하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: View PRD */}
        {step === 'view-prd' && prds.length > 0 && (
          <div className="rounded-2xl p-8 overflow-hidden" style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}>
            {prds.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {prds.map((prd, idx) => (
                  <button key={prd.ideaId} onClick={() => setCurrentPRDIndex(idx)}
                    className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition"
                    style={currentPRDIndex === idx
                      ? { background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff' }
                      : { backgroundColor: '#F0D5C0', color: C.textMid }
                    }
                  >{prd.ideaName}</button>
                ))}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold" style={{ color: C.textDark }}>{prds[currentPRDIndex].ideaName} PRD</h2>
                <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition"
                  style={{ border: `1px solid ${C.border}`, color: C.textMid }}
                >아래로 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
              </div>

              {/* 포맷 토글 */}
              <div className="flex items-center gap-2 mb-5">
                {(['markdown', 'plain'] as const).map(fmt => (
                  <button key={fmt} onClick={() => setPrdFormat(fmt)}
                    className="px-4 py-1.5 rounded-xl text-sm font-medium transition"
                    style={prdFormat === fmt
                      ? { background: `linear-gradient(135deg, ${C.accent}, ${C.amber})`, color: '#fff' }
                      : { backgroundColor: '#F0D5C0', color: C.textMid }
                    }
                  >{fmt === 'markdown' ? '마크다운 (개발자용)' : 'AI용 서식'}</button>
                ))}
                {prdFormat === 'plain' && (
                  <button onClick={() => copyToClipboard(stripMarkdownForAI(prds[currentPRDIndex].content))}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl transition"
                    style={{ border: `1px solid ${C.border}`, color: prdCopied ? C.docxSave : C.textMid }}
                  >
                    {prdCopied
                      ? <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>복사됨</>
                      : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>클립보드 복사</>
                    }
                  </button>
                )}
              </div>

              <div className="mb-6">
                {prdFormat === 'plain' ? (
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-6 rounded-xl p-4" style={{ backgroundColor: '#F0D5C0', color: C.textDark }}>
                    {stripMarkdownForAI(prds[currentPRDIndex].content)}
                  </pre>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    h2: ({ children }) => <div className="px-4 py-2 rounded-lg font-bold text-base mt-8 mb-3" style={{ backgroundColor: C.textDark, color: C.cream }}>{children}</div>,
                    h3: ({ children }) => <div className="px-4 py-2 font-semibold text-sm mt-5 mb-2 border-l-4" style={{ backgroundColor: C.selectedBg, color: C.accent, borderColor: C.accent }}>{children}</div>,
                    h4: ({ children }) => <div className="pl-3 font-semibold text-sm mt-4 mb-1 border-l-4" style={{ borderColor: C.border, color: C.textMid }}>{children}</div>,
                    p: ({ children }) => <p className="text-sm leading-7 my-2" style={{ color: C.textDark }}>{children}</p>,
                    ul: ({ children }) => <ul className="ml-5 my-2 space-y-1 list-disc">{children}</ul>,
                    ol: ({ children }) => <ol className="ml-5 my-2 space-y-1 list-decimal">{children}</ol>,
                    li: ({ children }) => <li className="text-sm leading-7" style={{ color: C.textDark }}>{children}</li>,
                    strong: ({ children }) => <strong className="font-bold" style={{ color: C.textDark }}>{children}</strong>,
                    table: ({ children }) => <div className="overflow-x-auto my-4"><table className="w-full border-collapse text-sm">{children}</table></div>,
                    thead: ({ children }) => <thead style={{ backgroundColor: '#F0D5C0' }}>{children}</thead>,
                    tbody: ({ children }) => <tbody className="divide-y" style={{ borderColor: C.border }}>{children}</tbody>,
                    tr: ({ children }) => <tr>{children}</tr>,
                    th: ({ children }) => <th className="px-3 py-2 text-left text-sm font-semibold" style={{ border: `1px solid ${C.border}`, color: C.textDark }}>{children}</th>,
                    td: ({ children }) => <td className="px-3 py-2 text-sm leading-6" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>{children}</td>,
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-sm" style={{ color: C.accent }}>{children}</a>,
                    img: ({ src, alt }) => src ? <img src={src} alt={alt || ''} className="max-w-full h-auto my-2 rounded" /> : null,
                    hr: () => <hr className="my-6" style={{ borderColor: C.border }} />,
                    blockquote: ({ children }) => <blockquote className="my-4 px-4 py-3 rounded-lg border-l-4 text-sm" style={{ backgroundColor: '#FEF9E7', borderColor: '#F5901E', color: C.textDark }}>{children}</blockquote>,
                    pre: ({ children }) => <pre className="whitespace-pre overflow-x-auto my-4 p-4 rounded-xl text-xs leading-5" style={{ backgroundColor: '#F5EDE6', color: C.textDark, fontFamily: 'var(--font-mono), monospace' }}>{children}</pre>,
                    code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
                      const raw = String(children).replace(/\n$/, '');
                      if (/language-chart/.test(className || ''))
                        return <ChartRenderer json={raw} />;
                      if (/language-mermaid/.test(className || ''))
                        return <MermaidDiagram chart={raw} />;
                      return <code style={{ fontFamily: 'var(--font-mono), monospace' }}>{children}</code>;
                    },
                  }}>{sanitizeMarkdown(prds[currentPRDIndex].content)}</ReactMarkdown>
                )}
              </div>

              <div className="flex flex-wrap justify-between items-center gap-3 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => setStep('view-plan')} className="px-5 py-2.5 rounded-xl text-sm transition" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>사업기획서로 돌아가기</button>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>위로
                </button>
                <button onClick={reset} className="px-5 py-2.5 rounded-xl text-sm" style={{ border: `1px solid ${C.border}`, color: C.textMid }}>새로 시작</button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => saveFile(prds[currentPRDIndex], 'prd', 'md')} className="px-4 py-2.5 rounded-xl text-sm font-medium" style={{ border: `1px solid ${C.border}`, color: C.textMid, backgroundColor: '#fff' }}>.md 저장</button>
                  <button type="button" onClick={() => saveFile(prds[currentPRDIndex], 'prd', 'docx')} className="px-4 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: C.docxSave, color: '#fff' }}>.docx 저장</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkflowPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#FDF5EE' }} />}>
      <WorkflowPageInner />
    </Suspense>
  );
}
